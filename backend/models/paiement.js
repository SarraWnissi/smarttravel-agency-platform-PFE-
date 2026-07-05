const mongoose = require('mongoose');

const paiementSchema = new mongoose.Schema(
  {
    reservationID: { type: mongoose.Schema.Types.ObjectId, ref: 'reservation', required: true },
    methodePaiement: {
      type: String,
      required: true,
      enum: ['CARTE', 'ESPECES', 'PAYPAL', 'STRIPE', 'VIREMENT'],
    },
    transactionId: { type: String },
    montant: { type: Number, required: true, min: 0 },
    statut: { type: String, enum: ['EN_COURS', 'ACCEPTE', 'REFUSE'], default: 'EN_COURS' },
    datePaiement: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 1 réservation => max 1 paiement "ACCEPTE"
paiementSchema.index(
  { reservationID: 1, statut: 1 },
  { unique: true, partialFilterExpression: { statut: 'ACCEPTE' } }
);

// perf
paiementSchema.index({ reservationID: 1 });

module.exports = mongoose.model('paiement', paiementSchema);