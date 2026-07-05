const express = require('express');
const router = express.Router();
const Service = require('../models/service');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// GET - Tous les services
router.get('/', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - Un service par ID
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service non trouvé" });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - Créer un service (admin)
router.post('/', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE - Modifier un service (admin)
router.put('/:id', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!service) {
      return res.status(404).json({ message: "Service non trouvé" });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE - Supprimer un service (admin)
router.delete('/:id', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service non trouvé" });
    }
    res.json({ message: "Service supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;