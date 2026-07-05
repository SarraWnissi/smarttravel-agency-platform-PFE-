const mongoose = require('mongoose');

const circuitSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  description: { type: String, default: '' },
  dureeJours: { type: Number, required: true, min: 1 },
  prix: { type: Number, required: true, min: 0 },
  devise: { type: String, default: 'TND' },
  destinations: { type: [String], default: [] },
  activitesIncluses: { type: [String], default: [] },
  repasInclus: { type: Boolean, default: false },
  transportInclus: { type: Boolean, default: false },
  hebergementInclus: { type: Boolean, default: false },
  placesDisponibles: { type: Number, required: true, min: 0 },
  placesTotal: { type: Number, required: true, min: 1 },
  dateDepart: { type: Date },
  dateRetour: { type: Date },
  images: { type: [String], default: [] },
  niveauDifficulte: {
    type: String,
    enum: ['FACILE', 'MODERE', 'DIFFICILE'],
    default: 'FACILE',
  },
  disponible: { type: Boolean, default: true },
  serviceID: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
}, { timestamps: true });

circuitSchema.index({ titre: 'text', description: 'text' });

module.exports = mongoose.model('Circuit', circuitSchema);
