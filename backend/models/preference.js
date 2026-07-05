const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  clientID: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true, unique: true },
  destinations_favorites: { type: [String], default: [] },
  types_sejour: {
    type: [String],
    enum: ['HOTEL', 'EXCURSION', 'INTERNATIONALE', 'CIRCUIT', 'TRANSPORT'],
    default: [],
  },
  budget_min: { type: Number, default: 0, min: 0 },
  budget_max: { type: Number, default: 0, min: 0 },
  activites_preferees: { type: [String], default: [] },
  langue_preferee: { type: String, default: 'fr' },
  nombre_personnes_habituel: { type: Number, default: 1, min: 1 },
  periode_preferee: {
    type: String,
    enum: ['ETE', 'HIVER', 'PRINTEMPS', 'AUTOMNE', 'PEU_IMPORTE'],
    default: 'PEU_IMPORTE',
  },
  notifications_email: { type: Boolean, default: true },
  notifications_sms: { type: Boolean, default: false },
  telephone: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Preference', preferenceSchema);
