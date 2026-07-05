const mongoose = require('mongoose');
const { Schema } = mongoose;

const avisSchema = new Schema({
  clientID: {
    type: Schema.Types.ObjectId,
    ref: "utilisateur",
    required: true
  },

  reservationID: {
    type: Schema.Types.ObjectId,
    ref: "reservation",
    required: true
  },

  // note 1..5 obligatoire
  note: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  commentaire: {
    type: String,
    default: ""
  },

  dateAvis: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

// Empêche un même client de poster plusieurs avis pour la même réservation
avisSchema.index({ clientID: 1, reservationID: 1 }, { unique: true });

module.exports = mongoose.model('avis', avisSchema);