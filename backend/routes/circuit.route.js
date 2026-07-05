const express = require('express');
const router = express.Router();
const Circuit = require('../models/circuit');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// GET ALL (public)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.disponible !== 'false') filter.disponible = true;
    if (req.query.search) filter.$text = { $search: req.query.search };
    if (req.query.difficulte) filter.niveauDifficulte = req.query.difficulte;
    const circuits = await Circuit.find(filter).populate('serviceID').sort({ createdAt: -1 });
    res.json(circuits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET ONE (public)
router.get('/:id', async (req, res) => {
  try {
    const circuit = await Circuit.findById(req.params.id).populate('serviceID');
    if (!circuit) return res.status(404).json({ message: 'Circuit introuvable' });
    res.json(circuit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST (ADMIN)
router.post('/', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const circuit = new Circuit(req.body);
    await circuit.save();
    res.status(201).json(circuit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT (ADMIN)
router.put('/:id', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const circuit = await Circuit.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!circuit) return res.status(404).json({ message: 'Circuit introuvable' });
    res.json(circuit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE (ADMIN)
router.delete('/:id', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const circuit = await Circuit.findByIdAndDelete(req.params.id);
    if (!circuit) return res.status(404).json({ message: 'Circuit introuvable' });
    res.json({ message: 'deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
