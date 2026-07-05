const express = require('express');
const router = express.Router();
const Transport = require('../models/transport');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// GET ALL (public)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.disponible !== 'false') filter.disponible = true;
    if (req.query.origine) filter.origine = new RegExp(req.query.origine, 'i');
    if (req.query.destination) filter.destination = new RegExp(req.query.destination, 'i');
    if (req.query.type) filter.type = req.query.type;
    const transports = await Transport.find(filter).sort({ dateDepart: 1 });
    res.json(transports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET ONE (public)
router.get('/:id', async (req, res) => {
  try {
    const transport = await Transport.findById(req.params.id);
    if (!transport) return res.status(404).json({ message: 'Transport introuvable' });
    res.json(transport);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST (ADMIN)
router.post('/', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const transport = new Transport(req.body);
    await transport.save();
    res.status(201).json(transport);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT (ADMIN)
router.put('/:id', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const transport = await Transport.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!transport) return res.status(404).json({ message: 'Transport introuvable' });
    res.json(transport);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE (ADMIN)
router.delete('/:id', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const transport = await Transport.findByIdAndDelete(req.params.id);
    if (!transport) return res.status(404).json({ message: 'Transport introuvable' });
    res.json({ message: 'deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
