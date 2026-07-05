const express = require('express');
const router = express.Router();
const Preference = require('../models/preference');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

router.use(verifyToken);

// GET préférences du client connecté (ou d'un client via ?clientID= pour l'admin)
router.get('/', async (req, res) => {
  try {
    const clientID = req.user.role === 'ADMIN' && req.query.clientID
      ? req.query.clientID
      : req.user.id;
    const pref = await Preference.findOne({ clientID }).populate('clientID', '-password');
    if (!pref) return res.json(null);
    res.json(pref);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET toutes les préférences (ADMIN seulement)
router.get('/all', authorizeRole('ADMIN'), async (req, res) => {
  try {
    const prefs = await Preference.find().populate('clientID', '-password');
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST créer ou mettre à jour ses préférences (upsert)
router.post('/', async (req, res) => {
  try {
    const clientID = req.user.id;
    const updated = await Preference.findOneAndUpdate(
      { clientID },
      { $set: { ...req.body, clientID } },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT mettre à jour ses préférences
router.put('/', async (req, res) => {
  try {
    const clientID = req.user.id;
    const updated = await Preference.findOneAndUpdate(
      { clientID },
      { $set: { ...req.body, clientID } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
