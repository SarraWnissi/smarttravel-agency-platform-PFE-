const mongoose = require("mongoose");

const serviceSchema = mongoose.Schema({

  titre: {
    type: String,
    required: true
  },
  description: String,
  prixBase: Number,
  devise: {
    type: String,
    default: "TND"
  },
  localisation: String,

  typeService: {
    type: String,
    enum: ["HEBERGEMENT", "DESTINATION", "ACTIVITE"],
    required: true
  },


  categorie: String,
  adresse: String,
  nbChambres: Number,

  typeDestination: String,
  avis: Number,

  typeActivite: String,
  duree: String,

  images: [{
    type: String
  }]

});

module.exports = mongoose.model('service', serviceSchema);