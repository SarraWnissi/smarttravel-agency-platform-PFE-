const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['AVION', 'BUS', 'TRAIN', 'FERRY', 'VOITURE', 'MINIBUS'],
    required: true,
  },
  compagnie: { type: String, required: true },
  origine: { type: String, required: true },
  destination: { type: String, required: true },
  dateDepart: { type: Date, required: true },
  dateArrivee: { type: Date, required: true },
  capacite: { type: Number, required: true, min: 1 },
  placesDisponibles: { type: Number, required: true, min: 0 },
  prix: { type: Number, required: true, min: 0 },
  devise: { type: String, default: 'TND' },
  classeService: {
    type: String,
    enum: ['ECONOMIQUE', 'AFFAIRES', 'PREMIERE'],
    default: 'ECONOMIQUE',
  },
  bagageInclus: { type: Boolean, default: false },
  climatise: { type: Boolean, default: false },
  disponible: { type: Boolean, default: true },
  numeroVol: { type: String, default: '' },
  images: { type: [String], default: [] },
}, { timestamps: true });

transportSchema.index({ origine: 1, destination: 1, dateDepart: 1 });

module.exports = mongoose.model('Transport', transportSchema);
