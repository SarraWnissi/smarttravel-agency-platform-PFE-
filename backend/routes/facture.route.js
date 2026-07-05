const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Facture = require('../models/facture');
const Paiement = require('../models/paiement');
const Reservation = require('../models/reservation');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

router.use(verifyToken);

// GET factures — ADMIN voit tout, CLIENT voit uniquement les siennes
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'ADMIN') {
      const data = await Facture.find()
        .populate({
          path: "paiementID",
          populate: {
            path: "reservationID",
            populate: [
              { path: "clientID",  select: "firstname lastname email telephone" },
              { path: "offreID",   select: "titre" },
              { path: "serviceID", select: "titre" },
              { path: "chambreID", select: "typeChambre numeroChambre prixParNuit",
                populate: { path: "hebergementID", select: "titre localisation" } },
            ],
          },
        })
        .lean();
      return res.json(data);
    }

    // CLIENT: factures liées à ses réservations (par clientID ou par email guest)
    const user = await require('../models/utilisateur').findById(req.user.id).select('email').lean();
    const clientReservations = await Reservation.find({
      $or: [
        { clientID: req.user.id },
        { guestEmail: user?.email },
      ]
    }).select('_id').lean();
    const reservationIds = clientReservations.map(r => r._id);
    // Tous les paiements (EN_COURS, ACCEPTE, REFUSE) pour afficher l'historique complet
    const paiements = await Paiement.find({ reservationID: { $in: reservationIds } }).select('_id statut').lean();
    const paiementIds = paiements.map(p => p._id);
    const data = await Facture.find({ paiementID: { $in: paiementIds } })
      .populate({
        path: "paiementID",
        populate: {
          path: "reservationID",
          populate: [
            { path: "clientID",  select: "firstname lastname email telephone" },
            { path: "offreID",   select: "titre" },
            { path: "serviceID", select: "titre" },
            { path: "chambreID", select: "typeChambre numeroChambre prixParNuit",
              populate: { path: "hebergementID", select: "titre localisation" } },
          ],
        },
      })
      .lean();
    return res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET ONE
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "id invalide" });
    }
    const f = await Facture.findById(req.params.id)
      .populate({ path: "paiementID", populate: { path: "reservationID" } });

    if (!f) return res.status(404).json({ message: "Facture introuvable" });
    res.json(f);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/*DELETE (optionnel, en prod on évite)
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "id invalide" });
    }
    const deleted = await Facture.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Facture introuvable" });
    res.json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});*/

module.exports = router;