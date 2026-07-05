const mongoose = require('mongoose');
const { Schema } = mongoose;

const ChambreSchema = new Schema({

  hebergementID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hebergement",
    required: true
  },
  numeroChambre: {
    type: String,
    required: true,
    trim: true
  },

  typeChambre: {
    type: String,
    enum: ['SINGLE', 'DOUBLE', 'TWIN', 'SUITE', 'DELUXE', 'FAMILIALE'],
    required: true
  },

  formule: {
    type: String,
    enum: ['DEMI_PENSION', 'ALL_INCLUSIVE', 'PRIX_SPECIAL', 'LOGEMENT_SEUL'],
    default: 'LOGEMENT_SEUL'
  },

  vue: {
    type: String,
    enum: ['MER', 'JARDIN', 'PISCINE', 'VILLE', 'MONTAGNE', 'AUCUNE'],
    default: 'AUCUNE'
  },

  etage: {
    type: Number,
    min: 0
  },

  capacite: {
    type: Number,
    required: true,
    min: 1
  },

  superficie: {
    type: Number,
    min: 0
  },

  prixParNuit: {
    type: Number,
    required: true,
    min: 0
  },

  description: {
    type: String,
    default: ""
  },

  images: [{
    type: String
  }],

  disponible: {
    type: Boolean,
    required: true,
    default: true
  },

}, {
  timestamps: true,
  collection: 'chambres'
});

ChambreSchema.index({ hebergementID: 1, numeroChambre: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('chambre', ChambreSchema);
