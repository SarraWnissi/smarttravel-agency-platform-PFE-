const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const hebergementSchema = mongoose.Schema({

  titre: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  localisation: {
    type: String,
    default: ""
  },
  adresse: {
    type: String,
    default: ""
  },

  coordonnees: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },

  telephone: {
    type: String,
    default: ""
  },

  siteWeb: {
    type: String,
    default: ""
  },

  type: {
    type: String,
    enum: ["HOTEL", "APPARTEMENT", "VILLA", "AUBERGE", "CAMPING", "RESORT", "BUNGALOW"],
    required: true
  },

  serviceID: {
    type: Schema.Types.ObjectId,
    ref: 'service',
    default: null
  },

  etoiles: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },

  notesMoyenne: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },

  nombreChambres: {
    type: Number,
    default: 0
  },

  images: [{
    type: String
  }],

  disponible: {
    type: Boolean,
    default: true
  },

  actif: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

hebergementSchema.index({ titre: "text", description: "text", localisation: "text", adresse: "text" });

module.exports = mongoose.model('hebergement', hebergementSchema);
