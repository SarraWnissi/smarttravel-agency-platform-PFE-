const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Reservation = require('../models/reservation');
const Hebergement = require('../models/hebergement');
const Chambre = require('../models/chambre');
const Service = require('../models/service');
const Blocage = require('../models/blocage');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// ── Tolérance de saisie pour la recherche ───────────────────────────────────
// Construit un fragment de regex insensible à l'orthographe « djerba » / « jerba »
// (le « d » devant un « j » est rendu optionnel), à partir d'un terme déjà saisi.
function termeRegexTolerant(terme) {
  const esc = terme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // échappe les métacaractères
  // 1) normalise « dj » → « j »   2) rend le « d » optionnel devant chaque « j »
  // Résultat : « djerba » et « jerba » produisent tous deux « d?jerba ».
  return esc.replace(/dj/gi, 'j').replace(/j/gi, 'd?j');
}

// Assemble une regex OR à partir d'une requête multi-mots (mots de >1 lettre).
function construireRegexRecherche(q) {
  const terms = q.trim().split(/\s+/).filter((t) => t.length > 1);
  return terms.map(termeRegexTolerant).join('|');
}

// GET - recherche avancée des hébergements (C-02 / C-03)
// ?q=&dateDebut=&dateFin=&nbPersonnes=&budgetMax=&formule=&type=&etoilesMin=
router.get('/search', async (req, res) => {
  try {
    const { q, dateDebut, dateFin, nbPersonnes, budgetMax, formule, type, etoilesMin } = req.query;

    const filter = { actif: { $ne: false } };

    // Recherche textuelle par regex (sans index requis), tolérante djerba/jerba
    if (q && q.trim()) {
      const regexStr = construireRegexRecherche(q);
      filter.$or = [
        { titre:        { $regex: regexStr, $options: 'i' } },
        { localisation: { $regex: regexStr, $options: 'i' } },
        { description:  { $regex: regexStr, $options: 'i' } },
        { type:         { $regex: regexStr, $options: 'i' } },
      ];
    }

    if (type)      filter.type    = type.toUpperCase();
    if (etoilesMin) filter.etoiles = { $gte: Number(etoilesMin) };

    // Filtre formule sans dates : garder seulement les hébergements ayant ≥1 chambre avec cette formule
    let hebergements = await Hebergement.find(filter).lean();

    if (formule && !dateDebut) {
      const chambresFmt = await Chambre.find({
        formule: formule.toUpperCase(),
        disponible: true,
      }).distinct('hebergementID');
      const ids = chambresFmt.map(id => String(id));
      hebergements = hebergements.filter(h => ids.includes(String(h._id)));
    }

    // nbPersonnes sans dates : garder les hébergements dont la capacité TOTALE
    // (toutes chambres combinées) suffit — on peut réserver plusieurs chambres.
    if (nbPersonnes && !dateDebut) {
      const nb = Number(nbPersonnes);
      const agg = await Chambre.aggregate([
        { $match: { disponible: true } },
        { $group: { _id: '$hebergementID', capaciteTotale: { $sum: '$capacite' } } },
        { $match: { capaciteTotale: { $gte: nb } } },
      ]);
      const ids = agg.map(a => String(a._id));
      hebergements = hebergements.filter(h => ids.includes(String(h._id)));
    }

    // Si des dates sont fournies, filtrer par disponibilité réelle
    if (dateDebut && dateFin) {
      const dDebut = new Date(dateDebut);
      const dFin   = new Date(dateFin);

      const results = [];
      for (const h of hebergements) {
        const chambreQuery = { hebergementID: h._id, disponible: true };
        if (formule)    chambreQuery.formule  = formule.toUpperCase();
        // Pas de filtre de capacité par chambre : on combine les chambres libres.

        const chambres = await Chambre.find(chambreQuery).lean();
        const chambresDispos = [];
        for (const c of chambres) {
          const conflit = await Reservation.findOne({
            chambreID: c._id,
            statut: { $in: ['EN_ATTENTE_PAIEMENT', 'CONFIRMEE'] },
            dateDebutSejour: { $lte: dFin },
            dateFinSejour:   { $gte: dDebut },
          });
          if (!conflit) chambresDispos.push(c);
        }
        // L'hôtel convient si la capacité combinée des chambres libres suffit
        const capaciteTotale = chambresDispos.reduce((s, c) => s + (c.capacite || 0), 0);
        const capaciteOk = !nbPersonnes || capaciteTotale >= Number(nbPersonnes);
        if (chambresDispos.length > 0 && capaciteOk) {
          const prixMin = Math.min(...chambresDispos.map(c => c.prixParNuit));
          const formules = [...new Set(chambresDispos.map(c => c.formule).filter(Boolean))];
          results.push({ ...h, chambresDisponibles: chambresDispos.length, prixMin, formules });
        }
      }
      return res.json(results);
    }

    // Enrichir avec le prix minimum et les formules des chambres
    let enriched = await Promise.all(hebergements.map(async h => {
      const chambres = await Chambre.find({ hebergementID: h._id, disponible: true }).select('prixParNuit formule').lean();
      const prixMin = chambres.length > 0 ? Math.min(...chambres.map(c => c.prixParNuit ?? Infinity)) : null;
      const formules = [...new Set(chambres.map(c => c.formule).filter(Boolean))];
      return { ...h, prixMin: isFinite(prixMin) ? prixMin : null, formules };
    }));

    // Filtre budget : basé sur le prixMin des chambres (pas sur prixBase supprimé)
    if (budgetMax) {
      const budget = Number(budgetMax);
      enriched = enriched.filter(h => h.prixMin !== null && h.prixMin <= budget);
    }

    res.json(enriched);
  } catch (err) {
    console.error('[search]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET - tous les hébergements (public) — enrichis avec prixMin des chambres
router.get('/', async (req, res) => {
  try {
    const hebergements = await Hebergement.find({ actif: { $ne: false } }).lean();

    const enriched = await Promise.all(hebergements.map(async (h) => {
      const chambres = await Chambre.find({ hebergementID: h._id, disponible: true })
        .select('prixParNuit formule typeChambre')
        .lean();
      const prix = chambres.map(c => c.prixParNuit ?? Infinity);
      const prixMin = prix.length > 0 && isFinite(Math.min(...prix)) ? Math.min(...prix) : null;
      const formules = [...new Set(chambres.map(c => c.formule).filter(Boolean))];
      return { ...h, prixMin, formules, chambresCount: chambres.length };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('[getAll]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET - un hébergement par id (avec ses chambres)
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID invalide' });

    const h = await Hebergement.findById(id);
    if (!h) return res.status(404).json({ message: 'Hebergement non trouvé' });

    const chambres = await Chambre.find({ hebergementID: h._id });
    res.json({ hebergement: h, chambres });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - créer un hébergement (ADMIN)
router.post('/', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const body = { ...req.body };

    // Si un serviceID est fourni, valider son format et que c'est bien un service de type HEBERGEMENT
    if (body.serviceID) {
      if (!mongoose.isValidObjectId(body.serviceID)) {
        return res.status(400).json({ message: 'serviceID invalide' });
      }

      const svc = await Service.findById(body.serviceID);
      if (!svc) {
        return res.status(400).json({ message: `Service introuvable pour ce serviceID: ${body.serviceID}` });
      }

      // Ici la règle métier : accepter seulement les services de type HEBERGEMENT
      if (svc.typeService !== 'HEBERGEMENT') {
        return res.status(400).json({
          message: `Impossible de créer l'hébergement : le service ${body.serviceID} n'est pas de type HEBERGEMENT (typeService=${svc.typeService})`
        });
      }
    }

    // (suite : ton code existant pour créer l'hébergement)
    const h = new Hebergement(body);
    const saved = await h.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT - modifier hébergement (ADMIN)
router.put('/:id', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID invalide' });

    const updated = await Hebergement.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Hebergement non trouvé' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// PATCH - activer / désactiver une chambre (ADMIN) pour un hébergement
router.patch('/:hid/chambres/:cid/availability', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const { hid, cid } = req.params;
    const { disponible } = req.body; // attendu: true ou false

    if (!mongoose.isValidObjectId(hid) || !mongoose.isValidObjectId(cid)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const chambre = await Chambre.findById(cid);
    if (!chambre) return res.status(404).json({ message: 'Chambre non trouvée' });
    if (String(chambre.hebergementID) !== String(hid)) {
      return res.status(400).json({ message: "La chambre n'appartient pas à cet hébergement" });
    }

    chambre.disponible = !!disponible;

    // Optionnel : si tu veux tracer la date d'archivage, ajoute archivedAt au modèle Chambre
    if (disponible) {
      chambre.archivedAt = null;
    } else {
      chambre.archivedAt = new Date();
    }

    await chambre.save();
    res.json({ message: 'Mise à jour effectuée', chambre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
// DELETE - supprimer hébergement (ADMIN)
// Optionnel : empêcher suppression si des chambres sont liées
router.delete('/:id', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID invalide' });

    const chambresCount = await Chambre.countDocuments({ hebergementID: id });
    if (chambresCount > 0) {
      return res.status(400).json({ message: "Impossible de supprimer: chambres liées existantes" });
    }

    await Hebergement.findByIdAndDelete(id);
    res.json({ message: "deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   Endpoints pour les chambres rattachées
   ========================= */

// GET - disponibilité d'un hébergement pour des dates (C-05)
// ?dateDebut=&dateFin=&nbPersonnes=&formule=
router.get('/:id/disponibilite', async (req, res) => {
  try {
    const { id } = req.params;
    const { dateDebut, dateFin, nbPersonnes, formule } = req.query;

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID invalide' });

    if (!dateDebut || !dateFin) {
      return res.status(400).json({ message: 'dateDebut et dateFin requis' });
    }

    const dDebut = new Date(dateDebut);
    const dFin = new Date(dateFin);

    const chambreQuery = { hebergementID: id, disponible: true };
    if (formule) chambreQuery.formule = formule.toUpperCase();
    if (nbPersonnes) chambreQuery.capacite = { $gte: Number(nbPersonnes) };

    const chambres = await Chambre.find(chambreQuery).lean();

    const results = [];
    for (const c of chambres) {
      // Conflit avec une réservation en cours/confirmée qui chevauche la période
      const conflitReservation = await Reservation.findOne({
        chambreID: c._id,
        statut: { $in: ["EN_ATTENTE_PAIEMENT", "CONFIRMEE"] },
        dateDebutSejour: { $lte: dFin },
        dateFinSejour: { $gte: dDebut }
      });

      // Conflit avec un blocage admin (maintenance, etc.) qui chevauche la période
      const conflitBlocage = await Blocage.findOne({
        chambreID: c._id,
        dateDebut: { $lte: dFin },
        dateFin: { $gte: dDebut }
      });

      results.push({
        ...c,
        disponiblePeriode: !conflitReservation && !conflitBlocage,
        motifIndisponibilite: conflitReservation ? "RESERVEE" : conflitBlocage ? "BLOQUEE" : null,
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - lister les chambres d'un hébergement
router.get('/:id/chambres', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID invalide' });

    const chambres = await Chambre.find({ hebergementID: id });
    res.json(chambres);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - créer une chambre pour cet hébergement (ADMIN)
router.post('/:id/chambres', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const hebergementID = req.params.id;
    if (!mongoose.isValidObjectId(hebergementID)) return res.status(400).json({ message: 'ID hebergement invalide' });

    const body = { ...req.body, hebergementID };
    const chambre = new Chambre(body);
    const saved = await chambre.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'numeroChambre déjà utilisé pour cet hébergement' });
    }
    res.status(400).json({ message: err.message });
  }
});

// PUT - modifier une chambre (ADMIN) : s'assure que la chambre appartient à l'hébergement dans l'URL
router.put('/:hid/chambres/:cid', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const { hid, cid } = req.params;
    if (!mongoose.isValidObjectId(hid) || !mongoose.isValidObjectId(cid)) return res.status(400).json({ message: 'ID invalide' });

    const chambre = await Chambre.findById(cid);
    if (!chambre) return res.status(404).json({ message: "Chambre non trouvée" });
    if (String(chambre.hebergementID) !== String(hid)) return res.status(400).json({ message: "La chambre n'appartient pas à cet hébergement" });

    const updated = await Chambre.findByIdAndUpdate(cid, req.body, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// DELETE - Désactiver (soft-delete) une chambre (admin) : refuse si réservée (hebergement.route.js)
router.delete('/:hid/chambres/:cid', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const { hid, cid } = req.params;
    if (!mongoose.isValidObjectId(hid) || !mongoose.isValidObjectId(cid)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const chambre = await Chambre.findById(cid);
    if (!chambre) return res.status(404).json({ message: "Chambre non trouvée" });
    if (String(chambre.hebergementID) !== String(hid)) return res.status(400).json({ message: "La chambre n'appartient pas à cet hébergement" });

    const now = new Date();

    // Réservations en cours ou futures (non annulées) bloquantes
    const reservationsActives = await Reservation.find({
      chambreID: cid,
      statut: { $ne: "ANNULEE" },
      dateFinSejour: { $gte: now }
    }).select('_id clientID dateDebutSejour dateFinSejour statut');

    if (reservationsActives.length > 0) {
      return res.status(400).json({
        message: "Impossible de désactiver : la chambre est réservée",
        count: reservationsActives.length,
        reservations: reservationsActives
      });
    }

    // Soft-delete : marquer non disponible
    chambre.disponible = false;
    // chambre.archivedAt = new Date(); // décommente si tu as archivedAt dans le modèle
    await chambre.save();

    res.json({ message: "Chambre désactivée avec succès", chambre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
/*DELETE - supprimer une chambre (ADMIN) : vérifie qu'aucune réservation active n'existe (optionnel)
router.delete('/:hid/chambres/:cid', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const { hid, cid } = req.params;
    if (!mongoose.isValidObjectId(hid) || !mongoose.isValidObjectId(cid)) return res.status(400).json({ message: 'ID invalide' });

    const chambre = await Chambre.findById(cid);
    if (!chambre) return res.status(404).json({ message: "Chambre non trouvée" });
    if (String(chambre.hebergementID) !== String(hid)) return res.status(400).json({ message: "La chambre n'appartient pas à cet hébergement" });

    // Optionnel: vérif réservations existantes (tu peux implémenter selon ton modèle Reservation)
    await Chambre.findByIdAndDelete(cid);
    res.json({ message: "deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }*/


module.exports = router;