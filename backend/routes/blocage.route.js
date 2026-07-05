const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Blocage = require('../models/blocage');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// GET - list blocages, optional filter ?hebergementID=&chambreID=
router.get('/', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.hebergementID) filter.hebergementID = req.query.hebergementID;
    if (req.query.chambreID)     filter.chambreID     = req.query.chambreID;
    res.json(await Blocage.find(filter).lean());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - create blocage
router.post('/', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { chambreID, hebergementID, dateDebut, dateFin, motif } = req.body;
    if (!chambreID || !hebergementID || !dateDebut || !dateFin) {
      return res.status(400).json({ message: 'chambreID, hebergementID, dateDebut et dateFin sont requis' });
    }
    const b = new Blocage({ chambreID, hebergementID, dateDebut, dateFin, motif: motif || 'Maintenance' });
    res.status(201).json(await b.save());
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE - remove blocage
router.delete('/:id', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID invalide' });
    await Blocage.findByIdAndDelete(req.params.id);
    res.json({ message: 'deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
