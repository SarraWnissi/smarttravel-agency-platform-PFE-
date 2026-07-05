const express = require('express');
const router = express.Router();
const Offre = require('../models/offre');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');
const mongoose = require("mongoose");
// GET
router.get('/', async (req, res) => {
  const data = await Offre.find().populate("serviceID");
  res.json(data);
});

// POST
/*
router.post('/', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  const o = new Offre(req.body);
  await o.save();
  res.json(o);
});
*/
router.post("/", async (req, res) => {
  try {
    let data = req.body;

    // Si l'utilisateur envoie un "message" en langage naturel
    if (data?.message && typeof data.message === "string") {
      data = extractOffreFromMessage(data.message);
    }

    // Normalisation: accepter aussi "prix" si jamais ça arrive
    if (data.prixAPartirDe === undefined && data.prix !== undefined) {
      data.prixAPartirDe = Number(data.prix);
      delete data.prix;
    }

    // Cast du prix (si string)
    if (data.prixAPartirDe !== undefined) {
      data.prixAPartirDe = Number(data.prixAPartirDe);
    }

    // Si serviceID est "" => null
    if (data.serviceID === "") data.serviceID = null;

    // Validation minimale
    if (!data.titre || Number.isNaN(data.prixAPartirDe)) {
      return res.status(400).json({
        message: "Données insuffisantes. Le titre et prixAPartirDe sont obligatoires.",
      });
    }

    // Validation ObjectId (si fourni)
    if (data.serviceID != null && !mongoose.isValidObjectId(data.serviceID)) {
      return res.status(400).json({
        message: "serviceID invalide (doit être un ObjectId MongoDB).",
      });
    }

    const o = new Offre({
      titre: data.titre,
      descriptionCourte: data.descriptionCourte ?? "",
      prixAPartirDe: data.prixAPartirDe,
      serviceID: data.serviceID ?? null,
      typeOffre: data.typeOffre ?? "DESTINATION",
      images: Array.isArray(data.images) ? data.images : [],
      localisation: data.localisation ?? "",
    });

    const savedOffre = await o.save();
    return res.status(201).json(savedOffre);
  } catch (err) {
    console.error("Erreur création offre :", err);
    return res.status(400).json({ message: err.message });
  }
});

// ==================== Fonction d'extraction du message ====================
function extractOffreFromMessage(message) {
  const offre = {
    titre: "Offre sans titre",
    descriptionCourte: "",
    prixAPartirDe: 0,
    serviceID: null,
  };

  // Exemple message:
  // "titre Pack Weekend et descriptionCourte 2 nuits + petit-déjeuner et prix 199 et serviceID 69de..."
  // ou "titre ... descriptionCourte ... prix 199"

  // titre
  let match = message.match(
    /titre\s+(.+?)(?=\s+et\s+descriptionCourte|\s+et\s+prix|\s+et\s+serviceID|\s+descriptionCourte|\s+prix|\s+serviceID|$)/i
  );
  if (match?.[1]) offre.titre = match[1].trim();

  // descriptionCourte
  match = message.match(
    /descriptionCourte\s+(.+?)(?=\s+et\s+prix|\s+et\s+serviceID|\s+prix|\s+serviceID|$)/i
  );
  if (match?.[1]) offre.descriptionCourte = match[1].trim();

  // prix (accepte entier ou décimal)
  match = message.match(/prix\s*[:=]?\s*(\d+(\.\d+)?)/i);
  if (match?.[1]) offre.prixAPartirDe = parseFloat(match[1]);

  // serviceID (optionnel)
  match = message.match(/serviceID\s*[:=]?\s*([a-f0-9]{24})/i);
  if (match?.[1]) offre.serviceID = match[1];

  return offre;
}
// UPDATE
router.put('/:id', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const updated = await Offre.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("serviceID");

    if (!updated) {
      return res.status(404).json({ message: "Offre not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// DELETE
router.delete('/:id', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  await Offre.findByIdAndDelete(req.params.id);
  res.json({ message: "deleted" });
});

module.exports = router;