const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const Reservation = require('../models/reservation');
const Service = require('../models/service');
const Offre = require('../models/offre');
const Preference = require('../models/preference');
const Hebergement = require('../models/hebergement');
const Chambre = require('../models/chambre');
const optimizationAgent = require('../agents/optimizationAgent');

// ════════════════════════════════════════════════════════════════════════════
// POST /api/ai/assistant — Assistant IA PUBLIC (visiteurs + clients)
// Répond aux questions en se basant sur la base de données réelle.
// Fonctionne hors-ligne (retrieval) + enrichi par LLM si OpenAI/Ollama dispo.
// ════════════════════════════════════════════════════════════════════════════
function normalize(str) {
  // minuscule + sans accents + tolérance « djerba » ≡ « jerba » (dj → j)
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/dj/g, 'j');
}

function parseFrDate(str) {
  const m = str.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (!m) return null;
  const d = new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

router.post('/assistant', async (req, res) => {
  try {
    const { message, historique_chat } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ reply: 'Posez-moi une question 😊' });

    const msg = normalize(message);

    // ── 1. Charger les hébergements avec prix min ──
    const hebergements = await Hebergement.find({ actif: { $ne: false } }).lean();
    const hebIds = hebergements.map(h => h._id);
    const chambres = await Chambre.find({ hebergementID: { $in: hebIds } }).lean();
    const prixParHeb = {};
    for (const c of chambres) {
      const k = String(c.hebergementID);
      if (!prixParHeb[k] || c.prixParNuit < prixParHeb[k]) prixParHeb[k] = c.prixParNuit;
    }
    const hotelsEnrichis = hebergements.map(h => ({
      ...h, prixMin: prixParHeb[String(h._id)] ?? null,
    }));

    // ── 2. Charger les offres (tout le catalogue : le filtrage par destination
    //        se fait ensuite — sinon les offres au-delà des 20 premières seraient
    //        invisibles, ex. les offres Djerba). ──
    const offres = await Offre.find().populate('serviceID').lean();

    // ── 3. Détecter les hôtels pertinents selon les mots-clés ──
    const stop = new Set(['avez','vous','quels','quel','quelle','est','les','des','une','pour','dans',
      'avec','hotel','hotels','hebergement','prix','combien','cest','quoi','sur','par','votre','nos',
      'avez-vous','propose','proposez','disponible','disponibles','tunisie','voyage','sejour',
      // mots de requête parasites (verbes/déterminants) à ne pas traiter comme destination
      'donne','donnez','donner','moi','offre','offres','promo','promos','promotion','promotions',
      'recommande','recommandez','cherche','veux','voudrais','liste','montre','montrez','toutes','tous']);
    const motsCles = msg.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));

    let hotelsPertinents = hotelsEnrichis.filter(h => {
      const blob = normalize(`${h.titre} ${h.localisation} ${h.description} ${h.type}`);
      return motsCles.some(kw => blob.includes(kw));
    });
    if (hotelsPertinents.length === 0) hotelsPertinents = hotelsEnrichis.slice(0, 6);

    // ── Offres pertinentes : filtrées par destination si une est précisée ──
    // (sinon, liste générique). Évite de proposer Paris quand on demande Djerba.
    let offresPertinentes = offres;
    if (motsCles.length > 0) {
      offresPertinentes = offres.filter(o => {
        const blob = normalize(`${o.titre} ${o.descriptionCourte || ''} ${o.serviceID?.titre || ''} ${o.serviceID?.localisation || ''}`);
        return motsCles.some(kw => blob.includes(kw));
      });
      // pas de repli sur toutes les offres : si rien ne matche la destination, on l'assume
    }

    // ── 4. Vérifier disponibilité si dates fournies ──
    const dates = [...message.matchAll(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/g)]
      .map(m => parseFrDate(m[0])).filter(Boolean).sort((a, b) => a - b);
    let dispoSection = '';
    if (dates.length >= 1) {
      const d1 = dates[0], d2 = dates[1] ?? null;
      const cibles = hotelsPertinents.slice(0, 4);
      const lignes = [];
      for (const h of cibles) {
        const chs = chambres.filter(c => String(c.hebergementID) === String(h._id));
        let libres = chs;
        if (d1 && d2) {
          const conflits = await Reservation.find({
            chambreID: { $in: chs.map(c => c._id) },
            statut: { $in: ['EN_ATTENTE_PAIEMENT', 'CONFIRMEE'] },
            dateDebutSejour: { $lte: d2 }, dateFinSejour: { $gte: d1 },
          }).distinct('chambreID');
          const cs = new Set(conflits.map(String));
          libres = chs.filter(c => !cs.has(String(c._id)));
        }
        lignes.push(`${h.titre} (${h.localisation}) : ${libres.length}/${chs.length} chambre(s) libre(s)`);
      }
      dispoSection = `\n=== DISPONIBILITÉ ===\n${lignes.join('\n')}`;
    }

    // ── 5. Construire le contexte pour le LLM (enrichi : GPS, contact, images) ──
    const mapsLink = (h) => {
      if (h.coordonnees?.lat && h.coordonnees?.lng)
        return `https://www.google.com/maps?q=${h.coordonnees.lat},${h.coordonnees.lng}`;
      return `https://www.google.com/maps/search/${encodeURIComponent(h.titre + ' ' + (h.localisation || ''))}`;
    };
    const hotelsText = hotelsPertinents.slice(0, 8).map(h =>
      `• ${h.titre} — ${h.localisation} — ${h.etoiles || 3}★ — ${h.prixMin ? h.prixMin + ' TND/nuit' : 'prix sur demande'}` +
      `${h.telephone ? ' — Tél: ' + h.telephone : ''}` +
      ` — Carte: ${mapsLink(h)}` +
      `${(h.images && h.images.length) ? ' — Photo: ' + h.images[0] : ''}` +
      `${h.description ? ' — ' + h.description.slice(0, 70) : ''}`
    ).join('\n');
    const offresText = offresPertinentes.slice(0, 8).map(o =>
      `• ${o.titre} — ${o.prixAPartirDe ?? o.serviceID?.prixBase ?? '?'} TND${o.reduction ? ` (-${o.reduction}%)` : ''}`
    ).join('\n');

    const systemPrompt = `Tu es l'assistant virtuel de SmartTravel Agency, agence de voyage tunisienne.
Réponds en français, de façon concise (max 150 mots), professionnelle et amicale.
Utilise UNIQUEMENT les données ci-dessous. N'invente jamais d'hôtel, prix, ou lien.
Si l'info n'existe pas, dis-le et invite à contacter contact@smarttravel.tn.

CAPACITÉS :
- Si on demande la CARTE/GPS/localisation : donne le lien "Carte:" exact de l'hôtel.
- Si on demande des IMAGES/photos : donne le lien "Photo:" exact de l'hôtel.
- Si on demande le CONTACT/téléphone : donne le "Tél:" de l'hôtel.
- Si on demande le PRIX : donne le tarif TND/nuit.
Copie les liens (URL) tels quels, ne les modifie jamais.

=== HÔTELS / HÉBERGEMENTS ===
${hotelsText || 'Aucun hôtel correspondant.'}

=== OFFRES PROMOTIONNELLES ===
${offresText || 'Aucune offre.'}${dispoSection}`;

    // ── 6. Tenter LLM (OpenAI puis Ollama), sinon réponse retrieval ──
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...(historique_chat || []).slice(-6),
            { role: 'user', content: message },
          ],
          temperature: 0.7, max_tokens: 300,
        });
        return res.json({ reply: completion.choices[0].message.content, hotels: hotelsPertinents.slice(0, 4), source: 'openai' });
      } catch { /* fallback */ }
    }
    // Ollama (timeout généreux : modèle CPU peut être lent au démarrage)
    if (process.env.OLLAMA_URL) {
      try {
        const axios = require('axios');
        const r = await axios.post(`${process.env.OLLAMA_URL}/api/chat`, {
          model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
          messages: [
            { role: 'system', content: systemPrompt },
            ...(historique_chat || []).slice(-4),
            { role: 'user', content: message },
          ],
          stream: false,
          options: { temperature: 0.7, num_predict: 350 },
        }, { timeout: 120000 });
        return res.json({ reply: r.data.message.content, hotels: hotelsPertinents.slice(0, 4), source: 'ollama' });
      } catch (e) { console.error('[AI assistant] Ollama:', e.message); }
    }

    // ── 7. Fallback retrieval intelligent (hors-ligne, sans LLM) ──
    let reply;
    const nbH = hotelsPertinents.length;

    if (/carte|gps|map|localisation|situ[eé]|adresse|o[uù]\s+(se\s+)?trouve|comment\s+y\s+aller/.test(msg)) {
      // Intention : localisation / carte Google Maps
      const liste = hotelsPertinents.slice(0, 4).map(h =>
        `📍 ${h.titre} (${h.localisation})\n   ${mapsLink(h)}`).join('\n\n');
      reply = `Voici la localisation sur Google Maps :\n\n${liste}`;
    } else if (/image|photo|voir.*hotel|apparence|ressemble/.test(msg)) {
      // Intention : images
      const avecImg = hotelsPertinents.filter(h => h.images && h.images.length);
      if (avecImg.length) {
        const liste = avecImg.slice(0, 4).map(h => `🖼️ ${h.titre} : ${h.images[0]}`).join('\n');
        reply = `Voici les photos de nos hébergements :\n${liste}\n\nCliquez sur une carte ci-dessous pour voir plus de photos.`;
      } else {
        reply = `Cliquez sur les hôtels ci-dessous pour voir leurs photos sur leur page détaillée.`;
      }
    } else if (/prix|tarif|combien|cout|coute/.test(msg)) {
      const liste = hotelsPertinents.slice(0, 4).map(h =>
        `• ${h.titre} : ${h.prixMin ? h.prixMin + ' TND/nuit' : 'prix sur demande'}`).join('\n');
      reply = `Voici les tarifs :\n${liste}`;
    } else if (/disponib|libre|dispo/.test(msg) && dispoSection) {
      reply = `Voici la disponibilité :${dispoSection.replace('\n=== DISPONIBILITÉ ===\n', '\n')}`;
    } else if (/offre|promo|reduction|reduc/.test(msg)) {
      const dest = motsCles.length > 0 ? ` pour « ${motsCles.join(' ')} »` : '';
      reply = offresPertinentes.length
        ? `Nos offres actuelles${dest} :\n${offresText}`
        : `Aucune offre promotionnelle${dest} pour le moment.${nbH > 0 ? `\n\nEn revanche, voici des hébergements correspondants :\n` + hotelsPertinents.slice(0, 4).map(h => `• ${h.titre} (${h.localisation})${h.prixMin ? ' — dès ' + h.prixMin + ' TND/nuit' : ''}`).join('\n') : ' Contactez-nous à contact@smarttravel.tn !'}`;
    } else if (/t[eé]l[eé]phone|contact|appeler|num[eé]ro/.test(msg)) {
      const liste = hotelsPertinents.slice(0, 4).map(h =>
        `📞 ${h.titre} : ${h.telephone || 'contact@smarttravel.tn'}`).join('\n');
      reply = `Voici les contacts :\n${liste}`;
    } else if (nbH > 0) {
      const liste = hotelsPertinents.slice(0, 5).map(h =>
        `• ${h.titre} (${h.localisation}) — ${h.etoiles || 3}★${h.prixMin ? ' — dès ' + h.prixMin + ' TND/nuit' : ''}`).join('\n');
      reply = `J'ai trouvé ${nbH} hébergement(s) correspondant :\n${liste}\n\nCliquez sur une carte ci-dessous pour réserver !`;
    } else {
      reply = `Je n'ai pas trouvé d'hébergement correspondant. Reformulez votre demande ou contactez-nous à contact@smarttravel.tn 😊`;
    }

    res.json({ reply, hotels: hotelsPertinents.slice(0, 4), source: 'retrieval' });
  } catch (err) {
    console.error('[AI assistant]', err.message);
    res.status(500).json({ reply: 'Service temporairement indisponible. Réessayez.', source: 'error' });
  }
});

// GET /api/ai/recommandations — recommandations personnalisées (algorithme interne + LLM si dispo)
router.get('/recommandations', verifyToken, async (req, res) => {
  try {
    const recommandations = await optimizationAgent.recommanderOffres(req.user.id, 5);

    // Tenter d'enrichir via LLM si OPENAI_API_KEY est configurée
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const preference = await Preference.findOne({ clientID: req.user.id }).lean();
        const historique = await Reservation.find({ clientID: req.user.id })
          .populate('serviceID').populate('offreID').limit(10).lean();

        const histText = historique.map(r =>
          `${r.typeReservation} - ${r.serviceID?.titre ?? r.offreID?.titre ?? 'N/A'} - ${r.montantTotal} TND`
        ).join('; ') || 'Aucune réservation';

        const prefText = preference
          ? `Budget: ${preference.budget_min}-${preference.budget_max} TND, Destinations: ${preference.destinations_favorites.join(', ')}`
          : 'Pas de préférences définies';

        const offresText = recommandations.map(o =>
          `ID:${o._id} | ${o.titre} | ${o.prixAPartirDe ?? 0} TND`
        ).join('\n');

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `Tu es un agent de recommandation pour SmartTravel Agency.
Historique: ${histText}
Préférences: ${prefText}
Offres présélectionnées:
${offresText}
Pour chaque offre, génère une courte raison de recommandation personnalisée (max 15 mots).
Réponds en JSON: {"raisons": {"ID": "raison", ...}}`
          }],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 300,
        });

        const result = JSON.parse(completion.choices[0].message.content);
        const raisons = result.raisons || {};

        const enriched = recommandations.map(o => ({
          ...o,
          raison: raisons[String(o._id)] || 'Offre recommandée pour vous',
        }));

        return res.json({ recommandations: enriched, source: 'llm' });
      } catch {
        // LLM indisponible — on continue avec l'agent d'optimisation
      }
    }

    res.json({ recommandations, source: 'optimization-agent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/ai/chat — chatbot d'assistance client (LLM ou fallback Ollama/agent.js)
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message, historique_chat } = req.body;
    if (!message) return res.status(400).json({ message: 'Message requis' });

    // ── Helper : parse date DD/MM/YYYY ──
    function parseFrDate(str) {
      const m = str.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
      if (!m) return null;
      const d = new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T00:00:00.000Z`);
      return isNaN(d.getTime()) ? null : d;
    }

    // Charger contexte réel en parallèle
    const [offres, mesReservations, preference] = await Promise.all([
      Offre.find().populate('serviceID').limit(12).lean(),
      Reservation.find({ clientID: req.user.id })
        .populate('serviceID').populate('offreID')
        .sort({ createdAt: -1 }).limit(5).lean(),
      Preference.findOne({ clientID: req.user.id }).lean(),
    ]);

    const offresText = offres.map(o => {
      const type = o.serviceID?.typeService ?? 'DESTINATION';
      return `• ${o.titre} (${type}) — ${o.prixAPartirDe ?? o.serviceID?.prixBase ?? '?'} TND — ${o.descriptionCourte ?? ''}`;
    }).join('\n') || 'Aucune offre disponible.';

    const resText = mesReservations.length > 0
      ? mesReservations.map(r => {
          const titre = r.offreID?.titre ?? r.serviceID?.titre ?? 'N/A';
          const dates = r.dateDebutSejour
            ? `du ${new Date(r.dateDebutSejour).toLocaleDateString('fr-FR')} au ${new Date(r.dateFinSejour).toLocaleDateString('fr-FR')}`
            : r.dateExcursion
              ? `le ${new Date(r.dateExcursion).toLocaleDateString('fr-FR')}`
              : '';
          return `• ${titre} — ${r.statut} — ${r.montantTotal ?? '?'} TND ${dates}`;
        }).join('\n')
      : 'Aucune réservation.';

    const prefText = preference
      ? `Budget: ${preference.budget_min ?? '?'}-${preference.budget_max ?? '?'} TND, Destinations favorites: ${(preference.destinations_favorites ?? []).join(', ') || 'non définies'}`
      : 'Préférences non définies.';

    // ── Section disponibilité : injectée si le message contient des dates + mot "disponible" ──
    let availabilitySection = '';
    const AVAIL_RE = /disponible?|libre|dispo\b|peut.on.r[eé]server|est.ce.qu/i;
    const allDateMatches = [...message.matchAll(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g)];
    const parsedDates = allDateMatches.map(m => parseFrDate(m[0])).filter(Boolean).sort((a, b) => a - b);

    if (parsedDates.length >= 2 || (parsedDates.length >= 1 && AVAIL_RE.test(message))) {
      try {
        const Hebergement = require('../models/hebergement');
        const Chambre = require('../models/chambre');
        const d1 = parsedDates[0];
        const d2 = parsedDates[1] ?? null;

        // Extraire mots-clés hôtel depuis le message (en retirant les dates)
        const stopW = new Set(['est','il','ce','que','les','des','une','pour','dans','avec',
          'disponible','libre','dispo','reserver','hotel','chambre','nuit','dates','periode',
          'du','au','vers','entre','de','partir','aller','sejour']);
        const kwClean = message.replace(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g, '')
          .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, '');
        const kw = kwClean.split(/\s+/).filter(w => w.length > 2 && !stopW.has(w));

        let hebergements = [];
        if (kw.length > 0) {
          const regex = kw.join('|');
          hebergements = await Hebergement.find({
            $or: [{ titre: { $regex: regex, $options: 'i' } }, { localisation: { $regex: regex, $options: 'i' } }],
          }).limit(5).lean();
        }
        if (hebergements.length === 0) hebergements = await Hebergement.find().limit(5).lean();

        const lines = await Promise.all(hebergements.map(async heb => {
          const chambres = await Chambre.find({ hebergementID: heb._id }).lean();
          if (chambres.length === 0) return `${heb.titre} (${heb.localisation}): aucune chambre enregistrée`;

          let disponibles = chambres;
          if (d1 && d2) {
            const conflits = await Reservation.find({
              chambreID: { $in: chambres.map(c => c._id) },
              statut: { $in: ['EN_ATTENTE_PAIEMENT', 'CONFIRMEE'] },
              dateDebutSejour: { $lte: d2 },
              dateFinSejour:   { $gte: d1 },
            }).distinct('chambreID');
            const conflitSet = new Set(conflits.map(id => String(id)));
            disponibles = chambres.filter(c => !conflitSet.has(String(c._id)));
          }

          const periode = d2
            ? `du ${d1.toLocaleDateString('fr-FR')} au ${d2.toLocaleDateString('fr-FR')}`
            : `le ${d1.toLocaleDateString('fr-FR')}`;
          const detail = disponibles.length > 0
            ? disponibles.map(c => `${c.typeChambre} ch.${c.numeroChambre} ${c.prixParNuit} TND/nuit`).join(', ')
            : 'COMPLET';
          return `${heb.titre} (${heb.localisation}) ${periode}: ${disponibles.length}/${chambres.length} chambre(s) libre(s) — ${detail}`;
        }));

        availabilitySection = `\n=== DISPONIBILITÉ VÉRIFIÉE EN TEMPS RÉEL ===\n${lines.join('\n')}`;
      } catch { /* silencieux */ }
    }

    const systemPrompt = `Tu es l'assistant virtuel de SmartTravel Agency, une agence de voyages tunisienne.
Tu aides les clients avec leurs réservations, offres, et questions sur les voyages.
Réponds TOUJOURS en français, de façon professionnelle et amicale. Maximum 200 mots.
Utilise uniquement les informations ci-dessous pour répondre — ne les invente pas.

=== OFFRES DISPONIBLES ===
${offresText}

=== RÉSERVATIONS DU CLIENT ===
${resText}

=== PRÉFÉRENCES DU CLIENT ===
${prefText}${availabilitySection}

Si le client demande à réserver, dis-lui qu'il peut écrire "je veux réserver [nom de l'offre]" et tu lui proposeras les offres correspondantes.
Si une information est absente des données ci-dessus, dis-le honnêtement.`;

    // Tenter OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const messages = [
          { role: 'system', content: systemPrompt },
          ...(historique_chat || []).slice(-10),
          { role: 'user', content: message },
        ];

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.8,
          max_tokens: 400,
        });

        return res.json({ reply: completion.choices[0].message.content, source: 'openai' });
      } catch {
        // Continuer avec Ollama
      }
    }

    // Fallback Ollama (comme agent.js)
    if (process.env.OLLAMA_URL) {
      try {
        const axios = require('axios');
        const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
        const response = await axios.post(`${process.env.OLLAMA_URL}/api/chat`, {
          model: ollamaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          stream: false,
        }, { timeout: 30000 });

        return res.json({ reply: response.data.message.content, source: 'ollama' });
      } catch {
        // Continuer
      }
    }

    // Fallback réponse statique
    res.json({
      reply: 'Bonjour ! Je suis votre assistant SmartTravel. Pour réserver, modifiez ou annuler un voyage, rendez-vous dans votre espace client ou contactez-nous à contact@smarttravel.tn.',
      source: 'fallback',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message, reply: 'Service temporairement indisponible.' });
  }
});

// POST /api/ai/reservation-intent — détecte l'intention et retourne hôtels+chambres ou offres
router.post('/reservation-intent', verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ intent: 'NONE' });

    const RESERVATION_RE = /r[eé]serv|voyag|partir|excursion|h[oô]tel|s[eé]jour|aller\s+[àa]|je\s+veux|je\s+voudrais/i;
    if (!RESERVATION_RE.test(message)) return res.json({ intent: 'NONE' });

    // Extraire nbPersonnes
    const nbMatch = message.match(/(\d+)\s*(?:personne|adulte|voyageur|pax|pers)/i);
    const nbPersonnes = nbMatch ? parseInt(nbMatch[1]) : 1;

    // Détecter type de chambre
    let typeChambreHint = null;
    if (/\bsingle\b/i.test(message)) typeChambreHint = 'SINGLE';
    else if (/\bdouble\b/i.test(message)) typeChambreHint = 'DOUBLE';
    else if (/\btwin\b/i.test(message)) typeChambreHint = 'TWIN';
    else if (/\bsuite\b/i.test(message)) typeChambreHint = 'SUITE';
    else if (/\bfamiliale?\b|\bfamille\b/i.test(message)) typeChambreHint = 'FAMILIALE';
    else if (/\bdeluxe\b|\bluxe\b/i.test(message)) typeChambreHint = 'DELUXE';

    const isHotel = /h[oô]tel|chambre|h[eé]bergement|nuit|s[eé]jours?/i.test(message);
    const isExcursion = /excursion|activit[eé]/i.test(message);
    const isInternational = /international|[eé]tranger|visa|passeport/i.test(message);

    // ── EXTRACT DATES from message (DD/MM/YYYY or DD-MM-YYYY) ──
    function parseFrDate(str) {
      const m = str.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
      if (!m) return null;
      const d = new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T00:00:00.000Z`);
      return isNaN(d.getTime()) ? null : d;
    }
    const allDateMatches = [...message.matchAll(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g)];
    const parsedDates = allDateMatches.map(m => parseFrDate(m[0])).filter(Boolean).sort((a,b) => a-b);
    const dateDebutFilter = parsedDates[0] ?? null;
    const dateFinFilter   = parsedDates[1] ?? null;

    // ── FLUX HÔTEL : chercher hébergements + chambres disponibles sur la période ──
    if (isHotel) {
      const Hebergement = require('../models/hebergement');
      const Chambre = require('../models/chambre');

      // Mapping pays → villes (pour "tunisie" → trouver "Tozeur", "Sousse", etc.)
      const PAYS_VILLES = {
        'tunisie': ['tunis','tozeur','sousse','djerba','hammamet','nabeul','sfax',
                    'monastir','bizerte','gabes','kairouan','mahdia','tabarka',
                    'kelibia','ain draham','beja','gafsa','tataouine','medenine'],
        'france':  ['paris','lyon','marseille','nice','bordeaux','toulouse','nantes',
                    'strasbourg','montpellier','rennes'],
        'italie':  ['rome','milan','florence','venise','naples','turin','bologne'],
        'espagne': ['madrid','barcelone','seville','valence','grenade','malaga'],
        'maroc':   ['marrakech','casablanca','rabat','fes','agadir','tanger'],
        'egypte':  ['caire','alexandrie','louxor','assouan','hurghada','charm'],
        'turquie': ['istanbul','ankara','antalya','izmir','bodrum'],
        'emirats': ['dubai','abu dhabi','sharjah'],
      };

      // Normaliser le message : retirer les dates, puis extraire mots-clés
      const norm = message
        .replace(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g, '')
        .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

      const stopWords = new Set([
        'veux','pour','dans','avec','une','des','les','que','qui','pas','sur',
        'hotel','hotels','chambre','chambres','nuit','nuits','sejour','sejours',
        'reserver','reservation','reservations','voudrais','aller','prendre',
        'trouver','cherche','cherchez','vouloir','faire','est','disponible',
        'disponibles','libre','libres','dispo','partir','entre','vers','jusque',
        'jusqu','arr','dep','dates','donne','donnez','liste','voir','moi','mois',
        'tout','tous','toute','toutes','quels','quelles','sont','leur','leurs',
        'mon','mes','nos','votre','vos','avez','vous',
      ]);
      const baseKeywords = norm.replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

      // Étendre les mots-clés pays → villes
      const keywords = [];
      for (const kw of baseKeywords) {
        if (PAYS_VILLES[kw]) {
          keywords.push(...PAYS_VILLES[kw]); // remplace le pays par ses villes
        } else {
          keywords.push(kw);
        }
      }

      let hebergements = [];
      const buildHotelQuery = (regexStr) => ({
        $or: [
          { localisation: { $regex: regexStr, $options: 'i' } },
          { titre:        { $regex: regexStr, $options: 'i' } },
          { description:  { $regex: regexStr, $options: 'i' } },
        ],
      });

      if (keywords.length > 0) {
        const regex = keywords.join('|');

        // Chercher dans Hebergement ET dans Service(HEBERGEMENT) en parallèle
        const [hebDirect, svcMatches] = await Promise.all([
          Hebergement.find({ disponible: true, ...buildHotelQuery(regex) }).limit(8).lean(),
          Service.find({ typeService: 'HEBERGEMENT', ...buildHotelQuery(regex) }).limit(8).lean(),
        ]);

        const seenIds = new Set(hebDirect.map(h => String(h._id)));
        hebergements = [...hebDirect];

        if (svcMatches.length > 0) {
          // Pour chaque service, chercher son Hebergement lié
          const svcIds = svcMatches.map(s => s._id);
          const hebFromSvc = await Hebergement.find({
            disponible: true,
            serviceID: { $in: svcIds },
          }).limit(8).lean();

          for (const h of hebFromSvc) {
            if (!seenIds.has(String(h._id))) {
              hebergements.push(h);
              seenIds.add(String(h._id));
            }
          }

          // Services sans Hebergement lié → synthétiser (visible mais sans chambres)
          const linkedSvcIds = new Set(hebFromSvc.map(h => String(h.serviceID)));
          for (const svc of svcMatches) {
            if (!linkedSvcIds.has(String(svc._id)) && !seenIds.has(String(svc._id))) {
              hebergements.push({
                _id: svc._id,
                titre: svc.titre,
                localisation: svc.localisation ?? '',
                type: 'HOTEL',
                etoiles: svc.etoiles ?? 3,
                serviceID: svc._id,
                _syntheticFromService: true,
              });
              seenIds.add(String(svc._id));
            }
          }
        }
      } else {
        // Aucun mot-clé de localisation → retourner tous les hébergements disponibles
        const [hebAll, svcAll] = await Promise.all([
          Hebergement.find({ disponible: true }).limit(5).lean(),
          Service.find({ typeService: 'HEBERGEMENT' }).limit(5).lean(),
        ]);
        const seenIds = new Set(hebAll.map(h => String(h._id)));
        hebergements = [...hebAll];
        const svcIds = svcAll.map(s => s._id);
        const hebFromSvc = await Hebergement.find({ disponible: true, serviceID: { $in: svcIds } }).limit(5).lean();
        for (const h of hebFromSvc) {
          if (!seenIds.has(String(h._id))) { hebergements.push(h); seenIds.add(String(h._id)); }
        }
        const linkedSvcIds = new Set(hebFromSvc.map(h => String(h.serviceID)));
        for (const svc of svcAll) {
          if (!linkedSvcIds.has(String(svc._id)) && !seenIds.has(String(svc._id))) {
            hebergements.push({ _id: svc._id, titre: svc.titre, localisation: svc.localisation ?? '', type: 'HOTEL', etoiles: svc.etoiles ?? 3, serviceID: svc._id, _syntheticFromService: true });
          }
        }
      }

      if (hebergements.length === 0) {
        const hint = baseKeywords.length > 0 ? ` pour « ${baseKeywords.join(', ')} »` : '';
        return res.json({
          intent: 'HOTEL',
          reply: `Désolé, aucun hôtel disponible${hint} n'a été trouvé dans notre catalogue. Essayez une autre ville ou destination.`,
          hotels: [],
          extractedData: { nbPersonnes, typeChambreHint, dateDebut: dateDebutFilter?.toISOString().split('T')[0] ?? null, dateFin: dateFinFilter?.toISOString().split('T')[0] ?? null },
        });
      }

      const hotels = await Promise.all(hebergements.map(async heb => {
        // Hôtels synthétiques (service sans document Hebergement lié) : pas de chambres
        if (heb._syntheticFromService) {
          return {
            _id: heb._id,
            titre: heb.titre,
            localisation: heb.localisation,
            type: heb.type,
            etoiles: heb.etoiles,
            serviceID: heb.serviceID,
            dateDebutFilter: dateDebutFilter?.toISOString().split('T')[0] ?? null,
            dateFinFilter:   dateFinFilter?.toISOString().split('T')[0] ?? null,
            chambres: [],
            _noChambres: true,
          };
        }

        // 1. Toutes les chambres (actives + type voulu)
        const chambreQuery = { hebergementID: heb._id, disponible: true };
        if (typeChambreHint) chambreQuery.typeChambre = typeChambreHint;
        const toutes = await Chambre.find(chambreQuery).lean();

        // 2. Si dates fournies, exclure les chambres avec conflit de réservation
        let chambres = toutes;
        if (dateDebutFilter && dateFinFilter) {
          const conflits = await Reservation.find({
            chambreID: { $in: toutes.map(c => c._id) },
            statut: { $in: ['EN_ATTENTE_PAIEMENT', 'CONFIRMEE'] },
            dateDebutSejour: { $lte: dateFinFilter },
            dateFinSejour:   { $gte: dateDebutFilter },
          }).distinct('chambreID');
          const conflitSet = new Set(conflits.map(id => String(id)));
          chambres = toutes.map(c => ({
            ...c,
            reservee: conflitSet.has(String(c._id)),
          }));
        }

        return {
          _id: heb._id,
          titre: heb.titre,
          localisation: heb.localisation,
          type: heb.type,
          etoiles: heb.etoiles,
          serviceID: heb.serviceID,
          dateDebutFilter: dateDebutFilter?.toISOString().split('T')[0] ?? null,
          dateFinFilter:   dateFinFilter?.toISOString().split('T')[0] ?? null,
          chambres: chambres.map(c => ({
            _id: c._id,
            numeroChambre: c.numeroChambre,
            typeChambre: c.typeChambre,
            prixParNuit: c.prixParNuit,
            capacite: c.capacite,
            reservee: c.reservee ?? false,
          })),
        };
      }));

      // Considérer hôtels qui ont au moins 1 chambre libre
      const available = hotels.filter(h => h.chambres.some(c => !c.reservee));
      const shown = available.length > 0 ? available : hotels.slice(0, 3);

      let replyMsg;
      if (dateDebutFilter && dateFinFilter) {
        const d1 = dateDebutFilter.toLocaleDateString('fr-FR');
        const d2 = dateFinFilter.toLocaleDateString('fr-FR');
        replyMsg = available.length > 0
          ? `Du ${d1} au ${d2} : ${available.length} hôtel(s) avec chambres libres${typeChambreHint ? ` (${typeChambreHint})` : ''}. Choisissez :`
          : `Aucune chambre disponible du ${d1} au ${d2}${typeChambreHint ? ` en ${typeChambreHint}` : ''}. Voici l'état actuel :`;
      } else {
        replyMsg = available.length > 0
          ? `J'ai trouvé ${available.length} hôtel(s) disponible(s)${typeChambreHint ? ` avec chambres ${typeChambreHint}` : ''}. Choisissez votre chambre :`
          : 'Voici nos hôtels. Choisissez une chambre pour réserver :';
      }

      return res.json({
        intent: 'HOTEL',
        reply: replyMsg,
        hotels: shown,
        extractedData: { nbPersonnes, typeChambreHint, dateDebut: dateDebutFilter?.toISOString().split('T')[0] ?? null, dateFin: dateFinFilter?.toISOString().split('T')[0] ?? null },
      });
    }

    // ── FLUX EXCURSION / INTERNATIONALE : chercher offres par mots-clés ──
    const typeHint = isExcursion ? 'EXCURSION' : isInternational ? 'INTERNATIONALE' : null;

    // Expanded stopwords to avoid noisy keywords like "disponible", "reservation", "quels"
    const offreStopWords = new Set([
      'veux','pour','dans','avec','une','des','les','que','qui','pas','sur',
      'quels','quelles','sont','quoi','tout','tous','avez','vous','moi','mon',
      'mes','nos','votre','leur','leurs',
      'reservation','reservations','offre','offres','voyage','voyages',
      'disponible','disponibles','libre','libres','dispo',
      'cherche','trouver','liste','voir','montrer','montrez','afficher',
      'hotel','chambre','nuit','sejour','sejours','hebergement',
      'faire','aller','partir','prendre','vouloir','voudrais',
    ]);

    const words = message
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !offreStopWords.has(w));

    let offres = [];
    if (words.length > 0) {
      const regex = words.join('|');
      offres = await Offre.find({
        $or: [
          { titre: { $regex: regex, $options: 'i' } },
          { descriptionCourte: { $regex: regex, $options: 'i' } },
        ],
      }).populate('serviceID').lean().limit(5);
    }

    // No fallback — return explicit "not found" if nothing matched the keywords
    if (offres.length === 0) {
      const hint = words.length > 0 ? ` pour « ${words.join(', ')} »` : '';
      return res.json({
        intent: 'NOT_FOUND',
        reply: `Désolé, aucune offre${hint} n'est disponible dans notre catalogue. Essayez d'autres mots-clés ou consultez toutes nos offres.`,
        suggestions: [],
        extractedData: { nbPersonnes, typeHint },
      });
    }

    const Hebergement = require('../models/hebergement');
    const suggestions = await Promise.all(offres.map(async o => {
      const svc = o.serviceID;
      let hebergementID = null;
      if (svc?.typeService === 'HEBERGEMENT') {
        const heb = await Hebergement.findOne({ serviceID: svc._id }).select('_id').lean();
        hebergementID = heb?._id ?? null;
      }
      return {
        _id: o._id,
        titre: o.titre,
        descriptionCourte: o.descriptionCourte,
        prixAPartirDe: o.prixAPartirDe,
        // prix du service lié → permet d'afficher le prix le moins cher côté client
        prixBase: svc?.prixBase ?? svc?.prix ?? null,
        typeService: svc?.typeService ?? 'DESTINATION',
        serviceID: svc?._id ?? o.serviceID,
        hebergementID,
      };
    }));

    res.json({
      intent: 'RESERVATION',
      reply: `J'ai trouvé ${suggestions.length} offre(s) pour vous. Cliquez sur celle qui vous intéresse :`,
      suggestions,
      extractedData: { nbPersonnes, typeHint },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ intent: 'NONE', message: err.message });
  }
});

// GET /api/ai/agents/status — état des agents IA
router.get('/agents/status', verifyToken, async (req, res) => {
  try {
    const agentManager = require('../agents/agentManager');
    const status = await agentManager.status();
    res.json({ agents: status, timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/ai/admin-assistant — Co-pilote Admin IA (ADMIN uniquement)
// NLU (détection d'intention) → exécution via les OUTILS MCP (mcp-server.js).
// => couche d'accès aux données UNIQUE, partagée avec Claude Desktop.
// ════════════════════════════════════════════════════════════════════════════
const authorizeRoleAI = require('../middleware/authorizeRole');
const jwtAI = require('jsonwebtoken');

// Instance MCP unique (lazy) — réutilise createHotelMCPInstance() de mcp-server.js
let _mcp = null;
async function getMcp() {
  if (_mcp) return _mcp;
  _mcp = await require('../mcp-server.js').createHotelMCPInstance();
  return _mcp;
}
// Appelle un outil MCP avec la session admin ; renvoie { data } (JSON parsé) ou { error }
async function mcpCall(name, args, jwtToken) {
  const mcp = await getMcp();
  try {
    mcp.SESSION = { token: jwtToken, user: jwtAI.verify(jwtToken, process.env.SECRET) };
  } catch {
    return { error: 'Token invalide' };
  }
  const result = await mcp.handleToolCall({ params: { name, arguments: args || {} } });
  const text = result?.content?.[0]?.text ?? '';
  if (result?.isError) return { error: text };
  try { return { data: JSON.parse(text) }; } catch { return { data: text }; }
}

router.post('/admin-assistant', verifyToken, authorizeRoleAI('ADMIN'), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.json({ reply: 'Que puis-je faire pour vous ? (ex: "réservations en attente", "hôtels à Sousse", "chiffre d\'affaires")' });

    const jwtToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const m = message.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let reply = '';
    let action = 'info';

    const wantAll = /\btous\b|\btoutes\b|\btout\b|complet|complete|integral|liste compl/.test(m);
    const LIMIT = wantAll ? 200 : 10;
    const isCreate = /\b(cree|creer|cr[ée]e|ajoute|ajouter|nouvel|nouvelle|nouveau|enregistre|inscris|faire|fais)\b/.test(m);
    const isCapabilityQ = /peux.?tu|tu peux|tu sais|sais.tu|est.ce que tu|comment (je |on |faire|cr|ajout)|est.il possible|capable de/.test(m);

    const clientNom = (r) => r.clientID ? `${r.clientID.firstname} ${r.clientID.lastname}` : (r.guestPrenom ? `${r.guestPrenom} ${r.guestNom}` : 'Client');

    // ── INTENT: AJOUTER UNE CHAMBRE → MCP create_chambre ───────────────────
    if (isCreate && /chambre|room/.test(m)) {
      const typeMatch = m.match(/\b(single|double|twin|suite|deluxe|familiale?)\b/);
      const prixMatch = message.match(/(\d+)\s*(?:tnd|dt|dinar)/i);
      const capMatch = m.match(/(\d+)\s*(?:personne|pax|place)/);
      // Nom d'hôtel : tout ce qui suit "hôtel/hébergement", nettoyé (guillemets, "avec...", ponctuation)
      const hotelMatch = message.match(/(?:h[oô]tel|h[ée]bergement)\s+(.+)/i);
      let hotelName = hotelMatch ? hotelMatch[1] : '';
      hotelName = hotelName.split(/\s+(?:avec|pour|,)/i)[0].replace(/["'`.!?]+$/g, '').trim();

      if (!hotelName) {
        reply = `Pour ajouter une chambre, précisez l'hôtel. Exemple :\n"Ajoute une chambre DOUBLE à 80 TND à l'hôtel Marina Sousse"`;
      } else {
        const { data: hebs, error } = await mcpCall('get_hebergements', {}, jwtToken);
        if (error) { reply = `Erreur MCP : ${error}`; }
        else {
          const heb = (hebs || []).find(h => (h.titre || '').toLowerCase().includes(hotelName.toLowerCase()));
          if (!heb) { reply = `Hôtel "${hotelName}" introuvable.`; }
          else {
            const type = (typeMatch?.[1] || 'double').toUpperCase();
            const prix = prixMatch ? parseInt(prixMatch[1]) : 100;
            const capacite = capMatch ? parseInt(capMatch[1]) : (type === 'SINGLE' ? 1 : (type === 'SUITE' || type === 'FAMILIALE') ? 4 : 2);
            const numeroChambre = String(Date.now()).slice(-3);
            const r = await mcpCall('create_chambre', {
              hebergementID: heb._id,
              numeroChambre,
              typeChambre: ['SINGLE','DOUBLE','TWIN','SUITE','DELUXE','FAMILIALE'].includes(type) ? type : 'DOUBLE',
              formule: 'LOGEMENT_SEUL', vue: 'AUCUNE', capacite, prixParNuit: prix, disponible: true,
            }, jwtToken);
            action = 'write';
            const numFinal = r.data?.numeroChambre || numeroChambre;
            reply = r.error ? `Erreur : ${r.error}` : `✅ Chambre ajoutée à ${heb.titre} :\n• N°${numFinal} — ${type}\n• ${prix} TND/nuit — ${capacite} pers.`;
          }
        }
      }
    }

    // ── INTENT: CRÉER/FAIRE UNE RÉSERVATION (ou question capacité) ──────────
    else if ((isCreate || isCapabilityQ) && /reservation|r[ée]server/.test(m)) {
      reply = `Oui ! Une réservation se crée via la page **Hôtels/Réservations** (client, chambre, dates requis).\n\n` +
        `Via ce co-pilote je peux :\n• Lister/filtrer les réservations\n• Confirmer une réservation (ex: "confirme #DA845051")\n• Voir les statistiques`;
    }

    // ── INTENT: STATISTIQUES / CA → MCP get_reservations + get_paiements ───
    else if (/statistiq|combien|chiffre|revenu|\bca\b|resume|tableau de bord|kpi|bilan/.test(m) && !/reservation.*(attente|confirm|annul)/.test(m)) {
      const [{ data: resas }, { data: hebs }, { data: users }, paie] = await Promise.all([
        mcpCall('get_reservations', {}, jwtToken),
        mcpCall('get_hebergements', {}, jwtToken),
        mcpCall('get_users', {}, jwtToken),
        mcpCall('get_paiements', {}, jwtToken),
      ]);
      const R = Array.isArray(resas) ? resas : [];
      const ca = (Array.isArray(paie.data) ? paie.data : []).filter(p => p.statut === 'ACCEPTE').reduce((s, p) => s + (p.montant || 0), 0);
      reply = `📊 **Tableau de bord SmartTravel**\n\n` +
        `• Réservations totales : ${R.length}\n` +
        `• En attente de paiement : ${R.filter(r => r.statut === 'EN_ATTENTE_PAIEMENT').length}\n` +
        `• Confirmées : ${R.filter(r => r.statut === 'CONFIRMEE').length}\n` +
        `• Annulées : ${R.filter(r => r.statut === 'ANNULEE').length}\n` +
        `• Hôtels : ${Array.isArray(hebs) ? hebs.length : 0}\n` +
        `• Clients : ${Array.isArray(users) ? users.filter(u => u.role === 'CLIENT').length : 0}\n` +
        `• 💰 Chiffre d'affaires : ${ca.toLocaleString('fr-FR')} TND`;
    }

    // ── INTENT: CONFIRMER UNE RÉSERVATION → MCP update_reservation_status ──
    else if (/confirm/.test(m) && /reservation|resa|#/.test(m)) {
      const refMatch = message.match(/#?\s*([A-Za-z0-9]{6,24})/);
      if (!refMatch) { reply = 'Indiquez la référence : ex. "confirme la réservation #4C4560".'; }
      else {
        const ref = refMatch[1].toUpperCase();
        const { data: resas } = await mcpCall('get_reservations', {}, jwtToken);
        const found = (Array.isArray(resas) ? resas : []).find(r => String(r._id).toUpperCase().endsWith(ref));
        if (!found) { reply = `Réservation #${ref} introuvable.`; }
        else {
          const r = await mcpCall('update_reservation_status', { reservationID: found._id, statut: 'CONFIRMEE' }, jwtToken);
          action = 'write';
          reply = r.error ? `Erreur : ${r.error}` : `✅ Réservation #${ref} confirmée avec succès.`;
        }
      }
    }

    // ── INTENT: CRÉER UN HÔTEL → MCP create_hebergement ────────────────────
    else if (/(cree|creer|ajoute|ajouter|nouvel|nouveau).*(hotel|hebergement)/.test(m)) {
      const villeMatch = message.match(/\b[àa]\s+([A-ZÉÈa-zéèà][\w\s-]*?)(?:\s+(?:avec|,|\d|\bde\b|$))/);
      const nomMatch = message.match(/(?:hotel|hôtel|hebergement|h[ée]bergement)\s+([A-ZÉÈ][\w\s-]*?)(?:\s+(?:[àa]\s|,|\d|avec|$))/i);
      const etoilesMatch = message.match(/(\d)\s*[ée]toile/);
      const nom = (nomMatch?.[1] || '').trim() || 'Nouvel Hôtel';
      const ville = (villeMatch?.[1] || '').trim() || 'Tunisie';
      const etoiles = etoilesMatch ? parseInt(etoilesMatch[1]) : 3;
      const titre = (nom.startsWith('Hôtel') || nom.startsWith('Hotel')) ? nom : `Hôtel ${nom}`;

      const r = await mcpCall('create_hebergement', {
        titre, type: 'HOTEL', etoiles, localisation: ville,
        description: `Hôtel ${etoiles}★ situé à ${ville}.`,
      }, jwtToken);
      action = 'write';
      reply = r.error ? `Erreur : ${r.error}` : `✅ Hôtel créé : ${titre} — ${ville} — ${etoiles}★`;
    }

    // ── INTENT: LISTER RÉSERVATIONS → MCP get_reservations ─────────────────
    else if (/reservation|resa\b/.test(m)) {
      let statut = null, label = 'toutes';
      if (/attente|impay|non pay/.test(m)) { statut = 'EN_ATTENTE_PAIEMENT'; label = 'en attente'; }
      else if (/confirm/.test(m)) { statut = 'CONFIRMEE'; label = 'confirmées'; }
      else if (/annul/.test(m)) { statut = 'ANNULEE'; label = 'annulées'; }
      const { data: resas, error } = await mcpCall('get_reservations', {}, jwtToken);
      if (error) reply = `Erreur MCP : ${error}`;
      else {
        let R = (Array.isArray(resas) ? resas : []).filter(r => !statut || r.statut === statut);
        R = R.slice(0, LIMIT);
        reply = R.length === 0 ? `Aucune réservation ${label}.`
          : `📋 Réservations ${label} (${R.length}) :\n` + R.map(r => `• #${String(r._id).slice(-8).toUpperCase()} — ${clientNom(r)} — ${r.montantTotal ?? '?'} TND — ${r.statut}`).join('\n');
      }
    }

    // ── INTENT: LISTER OFFRES → MCP get_offres ─────────────────────────────
    else if (/offre|promo/.test(m)) {
      const { data: offres, error } = await mcpCall('get_offres', {}, jwtToken);
      if (error) reply = `Erreur MCP : ${error}`;
      else {
        const O = Array.isArray(offres) ? offres : [];
        reply = O.length ? `🎁 Offres (${O.length}) :\n` + O.slice(0, LIMIT).map(o => `• ${o.titre} — ${o.prixAPartirDe ?? '?'} TND${o.reduction ? ` (-${o.reduction}%)` : ''}`).join('\n') : 'Aucune offre.';
      }
    }

    // ── INTENT: LISTER CLIENTS → MCP get_users ─────────────────────────────
    else if (/client|utilisateur|membre/.test(m)) {
      const { data: users, error } = await mcpCall('get_users', {}, jwtToken);
      if (error) reply = `Erreur MCP : ${error}`;
      else {
        const clients = (Array.isArray(users) ? users : []).filter(u => u.role === 'CLIENT');
        const shown = clients.slice(0, LIMIT);
        const titre = wantAll ? `👥 Tous les clients (${clients.length})` : `👥 Clients (${shown.length}/${clients.length})`;
        reply = shown.length ? `${titre} :\n` + shown.map(c => `• ${c.firstname} ${c.lastname} — ${c.email}`).join('\n') +
          (!wantAll && clients.length > shown.length ? `\n\n💡 Dites "tous les clients" pour la liste complète.` : '') : 'Aucun client.';
      }
    }

    // ── INTENT: LISTER LES CHAMBRES D'UN HÔTEL → MCP get_hebergement_chambres ──
    else if (/chambre|room/.test(m)) {
      const afterHotel = message.match(/(?:h[oô]tel|h[ée]bergement)\s+(.+)/i);
      let q = (afterHotel ? afterHotel[1] : message).split(/\s+(?:avec|pour|,|\?)/i)[0].replace(/["'`.!?]+$/g, '').trim();
      const qn = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const { data: hebs, error } = await mcpCall('get_hebergements', {}, jwtToken);
      if (error) { reply = `Erreur MCP : ${error}`; }
      else {
        const list = Array.isArray(hebs) ? hebs : [];
        const blob = h => `${h.titre} ${h.localisation}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        // 1) correspondance directe sur la requête nettoyée
        let heb = list.find(h => blob(h).includes(qn) && qn.length > 2);
        // 2) sinon, correspondance par mots-clés
        if (!heb) {
          const stop = new Set(['chambre','chambres','room','quels','quelles','sont','les','des','de','du','la','le','hotel','hotels','hebergement','montre','liste','voir','moi','dans','avez','vous','a']);
          const kws = qn.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
          heb = list.find(h => kws.some(k => blob(h).includes(k)));
        }
        if (!heb) {
          reply = `Précisez l'hôtel. Exemple : "Quelles sont les chambres de l'hôtel Marina Sousse ?"`;
        } else {
          const { data: chs } = await mcpCall('get_hebergement_chambres', { hebergementID: heb._id }, jwtToken);
          const C = Array.isArray(chs) ? chs : [];
          reply = C.length
            ? `🛏️ Chambres de ${heb.titre} (${C.length}) :\n` + C.map(c => `• N°${c.numeroChambre} — ${c.typeChambre} — ${c.prixParNuit} TND/nuit — ${c.capacite} pers.${c.disponible === false ? ' (indisponible)' : ''}`).join('\n')
            : `Aucune chambre enregistrée pour ${heb.titre}.`;
        }
      }
    }

    // ── INTENT: LISTER / CHERCHER HÔTELS → MCP get_hebergements ────────────
    else if (/hotel|hebergement|h[ée]bergement/.test(m)) {
      const stop = new Set(['hotel','hotels','hebergement','quels','sont','les','des','dans','avez','vous','quel','liste','montre','moi','a','la','le']);
      const kws = m.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
      const { data: hebs, error } = await mcpCall('get_hebergements', {}, jwtToken);
      if (error) reply = `Erreur MCP : ${error}`;
      else {
        let H = Array.isArray(hebs) ? hebs : [];
        if (kws.length) {
          const filtered = H.filter(h => { const b = `${h.titre} ${h.localisation}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); return kws.some(k => b.includes(k)); });
          if (filtered.length) H = filtered;
        }
        H = H.slice(0, 12);
        reply = `🏨 Hôtels (${H.length}) :\n` + H.map(h => `• ${h.titre} — ${h.localisation} — ${h.etoiles || 3}★`).join('\n');
      }
    }

    // ── FALLBACK ───────────────────────────────────────────────────────────
    else {
      reply = `Je peux gérer l'agence pour vous (via les outils MCP). Essayez :\n` +
        `📊 "Statistiques" / "Chiffre d'affaires"\n` +
        `📋 "Réservations en attente" / "Toutes les réservations"\n` +
        `🏨 "Hôtels à Sousse"\n` +
        `🎁 "Liste des offres"\n` +
        `👥 "Tous les clients"\n` +
        `➕ "Crée un hôtel Royal à Tabarka 5 étoiles"\n` +
        `🛏️ "Ajoute une chambre DOUBLE à 80 TND à l'hôtel Marina Sousse"\n` +
        `✅ "Confirme la réservation #DA845051"`;
    }

    res.json({ reply, action });
  } catch (err) {
    console.error('[AI admin-assistant]', err.message);
    res.status(500).json({ reply: 'Erreur : ' + err.message, action: 'error' });
  }
});

module.exports = router;
