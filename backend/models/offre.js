const mongoose = require("mongoose");

const offreSchema = mongoose.Schema({
  titre: String,
  descriptionCourte: String,
  prixAPartirDe: Number,

  serviceID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "service"
  },

  typeOffre: {
    type: String,
    enum: ["HEBERGEMENT", "ACTIVITE", "DESTINATION"],
    default: "DESTINATION"
  },

  images: [{ type: String }],

  localisation: { type: String, default: "" }
});

module.exports = mongoose.model('offre', offreSchema);