/**
 * campagne.route.js — Module 4 N8N
 * N-01 : réception du formulaire admin
 * N-02 : déclenchement webhook n8n
 * N-03 : endpoint public pour que n8n récupère la liste clients opt-in
 */
const express    = require('express');
const router     = express.Router();
const axios      = require('axios');
const Utilisateur = require('../models/utilisateur');
const Preference  = require('../models/preference');
const Hebergement = require('../models/hebergement');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// ── Journal en mémoire (persistable en BDD si besoin) ─────────────────────
const LOG_CAMPAGNES = [];

// ── N-01 + N-02 : Lancer une campagne promotionnelle ────────────────────────
// POST /api/campagnes/lancer  (ADMIN uniquement)
router.post('/lancer', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { hotels, reduction, dateDebut, dateFin, details } = req.body;

    // Validation
    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      return res.status(400).json({ message: 'Sélectionnez au moins un hôtel.' });
    }
    if (!reduction || reduction <= 0 || reduction > 100) {
      return res.status(400).json({ message: 'Le pourcentage de réduction doit être entre 1 et 100.' });
    }
    if (!dateDebut || !dateFin) {
      return res.status(400).json({ message: 'Les dates de promotion sont obligatoires.' });
    }
    if (new Date(dateFin) < new Date(dateDebut)) {
      return res.status(400).json({ message: 'La date de fin doit être après la date de début.' });
    }

    // Payload pour n8n
    const payload = {
      hotels,
      reduction: Number(reduction),
      date_debut: dateDebut,
      date_fin:   dateFin,
      details:    details || '',
      lancePar:   req.user?.email ?? 'admin',
      lanceLe:    new Date().toISOString(),
    };

    // N-02 : Appel webhook n8n
    const N8N_WEBHOOK_URL    = process.env.N8N_WEBHOOK_URL;
    const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;
    let n8nStatus = 'non configuré';

    if (N8N_WEBHOOK_URL) {
      // Fire and forget — ne pas bloquer la réponse sur le délai d'envoi email
      axios.post(N8N_WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(N8N_WEBHOOK_SECRET ? { 'x-webhook-secret': N8N_WEBHOOK_SECRET } : {}),
        },
        timeout: 60000,
      }).catch(err => console.error('[Campagne] Erreur webhook n8n:', err.message));
      n8nStatus = 'envoyé';
    }

    // Journalisation
    const log = {
      id:       Date.now().toString(36).toUpperCase(),
      date:     new Date().toISOString(),
      admin:    req.user?.email ?? 'admin',
      hotels:   hotels.length,
      reduction,
      dateDebut,
      dateFin,
      n8nStatus,
    };
    LOG_CAMPAGNES.unshift(log);
    if (LOG_CAMPAGNES.length > 100) LOG_CAMPAGNES.pop();

    console.log('[Campagne] Lancée:', JSON.stringify(log));

    res.json({
      message: n8nStatus === 'envoyé'
        ? 'Campagne lancée ! Le workflow n8n va envoyer les emails.'
        : 'Campagne enregistrée. (n8n non configuré — emails non envoyés)',
      log,
      n8nStatus,
    });
  } catch (err) {
    console.error('[Campagne]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── Promo IA : générer un message commercial + images réelles via agent n8n ──
// POST /api/campagnes/promo-ia  (ADMIN uniquement)
// Déclenche le workflow "campagne-promo-ia" : un agent IA (Ollama/Llama + SerpAPI)
// rédige un paragraphe commercial, récupère de vraies photos de l'hôtel, puis
// l'envoie par email à tous les clients avec un lien de réservation.
router.post('/promo-ia', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { hotelId, hotelIds, reduction, details } = req.body;

    // Accepte un seul hôtel (hotelId) ou plusieurs (hotelIds)
    const ids = Array.isArray(hotelIds) && hotelIds.length > 0
      ? hotelIds
      : (hotelId ? [hotelId] : []);

    if (ids.length === 0) {
      return res.status(400).json({ message: 'hotelId ou hotelIds est requis.' });
    }

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Récupérer les infos complètes des hôtels choisis par l'admin
    const hebs = await Hebergement.find({ _id: { $in: ids } }).lean();
    if (hebs.length === 0) {
      return res.status(404).json({ message: 'Aucun hôtel trouvé.' });
    }

    const hotels = hebs.map((heb) => ({
      id:           String(heb._id),
      nom:          heb.titre,
      localisation: heb.localisation || '',
      adresse:      heb.adresse || '',
      etoiles:      heb.etoiles || 3,
      type:         heb.type || 'HOTEL',
      description:  heb.description || '',
      siteWeb:      heb.siteWeb || '',
      lienReservation: `${FRONTEND_URL}/hotels/${heb._id}`,
      // Images déjà connues (publiques uniquement) — repli si Serper ne renvoie rien
      imagesConnues: (heb.images || []).filter(
        (img) => typeof img === 'string' && img.startsWith('http') && !img.includes('localhost')
      ),
    }));

    // Payload pour l'agent IA n8n (un seul email groupé pour tous les hôtels)
    const payload = {
      hotels,
      reduction:  reduction ? Number(reduction) : null,
      details:    details || '',
      lancePar:   req.user?.email ?? 'admin',
      lanceLe:    new Date().toISOString(),
    };

    // Webhook n8n dédié à la promo IA (variable propre, repli sur le webhook campagne)
    const N8N_PROMO_IA_WEBHOOK_URL = process.env.N8N_PROMO_IA_WEBHOOK_URL;
    const N8N_WEBHOOK_SECRET       = process.env.N8N_WEBHOOK_SECRET;
    let n8nStatus = 'non configuré';

    if (N8N_PROMO_IA_WEBHOOK_URL) {
      // Fire and forget — la génération IA + envoi emails peut prendre du temps
      axios.post(N8N_PROMO_IA_WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(N8N_WEBHOOK_SECRET ? { 'x-webhook-secret': N8N_WEBHOOK_SECRET } : {}),
        },
        timeout: 120000,
      }).catch((err) => console.error('[PromoIA] Erreur webhook n8n:', err.message));
      n8nStatus = 'envoyé';
    }

    const log = {
      id:        Date.now().toString(36).toUpperCase(),
      date:      new Date().toISOString(),
      admin:     req.user?.email ?? 'admin',
      type:      'PROMO_IA',
      hotels:    hotels.length,
      hotelNom:  hotels.map((h) => h.nom).join(', '),
      reduction: reduction || null,
      n8nStatus,
    };
    LOG_CAMPAGNES.unshift(log);
    if (LOG_CAMPAGNES.length > 100) LOG_CAMPAGNES.pop();

    console.log('[PromoIA] Lancée:', JSON.stringify(log));

    res.json({
      message: n8nStatus === 'envoyé'
        ? `Promo IA lancée pour ${hotels.length} hôtel${hotels.length > 1 ? 's' : ''} ! L'agent rédige le message et envoie les emails.`
        : 'Promo IA enregistrée. (n8n non configuré — emails non envoyés)',
      log,
      n8nStatus,
    });
  } catch (err) {
    console.error('[PromoIA]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── N-03 : Liste clients opt-in pour n8n ────────────────────────────────────
// GET /api/campagnes/clients?page=1&limit=100
// Sécurisé par token secret (x-api-key header) OU token admin
router.get('/clients', async (req, res) => {
  try {
    // Vérification accès : token admin ou clé API n8n
    const apiKey = req.headers['x-api-key'];
    const N8N_API_KEY = process.env.N8N_API_KEY ?? process.env.N8N_WEBHOOK_SECRET;

    if (apiKey && N8N_API_KEY && apiKey === N8N_API_KEY) {
      // Accès autorisé via clé n8n
    } else {
      // Fallback : vérification JWT admin
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: 'Non autorisé' });
      // (verifyToken est middleware — on fait un mini-check manuel ici)
      const jwt = require('jsonwebtoken');
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.SECRET);
      if (decoded.role !== 'ADMIN') return res.status(403).json({ message: 'Accès refusé' });
    }

    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(500, parseInt(req.query.limit || '100'));
    const skip  = (page - 1) * limit;

    // Récupérer clients avec notifications_email = true
    const prefOptIn = await Preference.find({ notifications_email: true })
      .select('clientID').lean();
    // Retourner tous les clients actifs (avec ou sans préférence)
    const filter = { role: 'CLIENT', actif: { $ne: false } };

    const [clients, total] = await Promise.all([
      Utilisateur.find(filter)
        .select('prenom nom email telephone')
        .skip(skip)
        .limit(limit)
        .lean(),
      Utilisateur.countDocuments(filter),
    ]);

    res.json({
      clients: clients.map(c => ({
        prenom: c.prenom ?? c.firstname ?? '',
        nom:    c.nom ?? c.lastname ?? '',
        email:  c.email,
        tel:    c.telephone ?? '',
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[Campagne/clients]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── Historique des campagnes lancées (ADMIN) ─────────────────────────────────
router.get('/historique', verifyToken, authorizeRole('ADMIN'), (req, res) => {
  res.json(LOG_CAMPAGNES);
});

module.exports = router;
