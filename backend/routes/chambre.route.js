const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Chambre = require('../models/chambre');
 const Reservation = require('../models/reservation');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// GET - Toutes les chambres (admin seulement)
router.get('/', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const chambres = await Chambre.find();
    res.json(chambres);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - Chambres disponibles
router.get('/disponibles', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const chambresDisponibles = await Chambre.find({ disponible: true });
    res.json(chambresDisponibles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - Créer une chambre (admin)
router.post('/', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const chambre = new Chambre(req.body);
    await chambre.save();
    res.status(201).json(chambre);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT - Modifier une chambre (admin)
router.put('/:id', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const chambre = await Chambre.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!chambre) {
      return res.status(404).json({ message: "Chambre non trouvée" });
    }
    res.json(chambre);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// PATCH - activer / désactiver une chambre (ADMIN)
router.patch('/:id/availability', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { disponible } = req.body; // attendu: true ou false

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const chambre = await Chambre.findById(id);
    if (!chambre) {
      return res.status(404).json({ message: 'Chambre non trouvée' });
    }

    // Met à jour uniquement le champ disponible
    chambre.disponible = !!disponible;

    // Optionnel : si tu veux tracer la date d'archivage, ajoute archivedAt au modèle
    // if (disponible) chambre.archivedAt = null;
    // else chambre.archivedAt = new Date();

    await chambre.save();
    res.json({ message: 'Mise à jour effectuée', chambre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/* DELETE - Supprimer une chambre (admin)
router.delete('/:id', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const chambre = await Chambre.findByIdAndDelete(req.params.id);
    if (!chambre) {
      return res.status(404).json({ message: "Chambre non trouvée" });
    }
    res.json({ message: "Chambre supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}); */
// DELETE - Désactiver (soft-delete) une chambre (admin) — refuse si réservée (chambre.route.js)
router.delete('/:id', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const chambre = await Chambre.findById(id);
    if (!chambre) {
      return res.status(404).json({ message: "Chambre non trouvée" });
    }

    const now = new Date();

    const reservationsActives = await Reservation.find({
      chambreID: id,
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

    // Soft-delete : rendre non disponible
    chambre.disponible = false;
    // chambre.archivedAt = new Date(); // décommente si présent dans le modèle
    await chambre.save();

    return res.json({ message: "Chambre désactivée avec succès", chambre });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;