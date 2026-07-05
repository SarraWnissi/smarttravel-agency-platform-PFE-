const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Avis = require('../models/avis');
const Reservation = require('../models/reservation');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');


// GET all (public) - populate client and reservation sommairement
router.get('/', async (req, res) => {
  try {
    const data = await Avis.find()
      .populate('clientID', '-password')
      .populate('reservationID');
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET by reservation
router.get('/reservation/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID invalide' });

    const data = await Avis.find({ reservationID: id })
      .populate('clientID', '-password');
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET one
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID invalide' });

    const a = await Avis.findById(id).populate('clientID', '-password').populate('reservationID');
    if (!a) return res.status(404).json({ message: 'Avis non trouvé' });
    res.json(a);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// POST - créer un avis (auth requise)
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Authentification requise' });

    const { reservationID, note, commentaire, dateAvis } = req.body;
    const providedClientID = req.body.clientID;

    // Champs requis
    if (!reservationID || typeof note === 'undefined') {
      return res.status(400).json({ message: 'reservationID et note sont requis' });
    }

    if (!mongoose.isValidObjectId(reservationID)) {
      return res.status(400).json({ message: 'reservationID invalide' });
    }

    // Anti‑spoofing : si appelant n'est pas ADMIN, interdire la fourniture d'un clientID différent
    let finalClientId;
    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin) {
      if (providedClientID && String(providedClientID) !== String(userId)) {
        return res.status(403).json({ message: "Interdit: vous ne pouvez pas créer un avis au nom d'un autre client." });
      }
      finalClientId = String(userId);
    } else {
      // ADMIN : si clientID fourni, valider son format ; sinon on prendra le clientID depuis la réservation plus bas
      if (providedClientID) {
        if (!mongoose.isValidObjectId(providedClientID)) {
          return res.status(400).json({ message: 'clientID invalide' });
        }
        finalClientId = providedClientID;
      }
    }

    // Vérifier existence de la réservation
    const reservation = await Reservation.findById(reservationID);
    if (!reservation) {
      return res.status(404).json({ message: "Réservation introuvable" });
    }

    // Si ADMIN n'a pas fourni clientID, on utilise le client de la réservation
    if (!finalClientId) {
      finalClientId = String(reservation.clientID);
    }

    // Sécurité supplémentaire : si non-admin, s'assurer que la réservation appartient bien à l'utilisateur
    if (!isAdmin && String(reservation.clientID) !== String(userId)) {
      return res.status(403).json({ message: "Vous ne pouvez pas laisser d'avis pour cette réservation" });
    }

    // OPTIONNEL : n'accepter l'avis que si le séjour est terminé
     const now = new Date();
    if (new Date(reservation.dateFinSejour) > now && !isAdmin) {
       return res.status(400).json({ message: "Vous pouvez laisser un avis seulement après la fin du séjour" });
     }

    // Valider la note
    const n = Number(note);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return res.status(400).json({ message: 'La note doit être un entier entre 1 et 5' });
    }

    // Vérifier qu'il n'existe pas déjà un avis du même client pour cette réservation
    const exist = await Avis.findOne({ clientID: finalClientId, reservationID });
    if (exist) {
      return res.status(400).json({ message: "Vous avez déjà laissé un avis pour cette réservation" });
    }

    const parsedDateAvis = dateAvis ? new Date(dateAvis) : new Date();

    const avis = new Avis({
      clientID: finalClientId,
      reservationID,
      note: n,
      commentaire: commentaire ?? '',
      dateAvis: parsedDateAvis
    });

    const saved = await avis.save();

    // Retourner l'avis peuplé
    const populated = await Avis.findById(saved._id)
      .populate('clientID', 'firstname lastname email')
      .populate('reservationID', 'chambreID dateDebutSejour dateFinSejour');

    res.status(201).json(populated);
  } catch (err) {
    // gestion des erreurs d'index unique
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Un avis existe déjà pour cette réservation par ce client' });
    }
    console.error('POST /api/avis error:', err);
    res.status(500).json({ message: err.message });
  }
});
// PUT - modifier son avis (seul auteur ou admin)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID invalide' });

    const avis = await Avis.findById(id);
    if (!avis) return res.status(404).json({ message: 'Avis non trouvé' });

    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = String(avis.clientID) === String(req.user.id);
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Accès refusé' });

    // Autoriser modification du commentaire et de la note
    const updates = {};
    if (typeof req.body.note !== 'undefined') updates.note = req.body.note;
    if (typeof req.body.commentaire !== 'undefined') updates.commentaire = req.body.commentaire;

    const updated = await Avis.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE - supprimer avis (auteur ou admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID invalide' });

    const avis = await Avis.findById(id);
    if (!avis) return res.status(404).json({ message: 'Avis non trouvé' });

    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = String(avis.clientID) === String(req.user.id);
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Accès refusé' });

    await Avis.findByIdAndDelete(id);
    res.json({ message: 'deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;