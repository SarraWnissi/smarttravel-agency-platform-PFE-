const mongoose = require("mongoose");

const factureSchema = new mongoose.Schema(
  {
    paiementID: { type: mongoose.Schema.Types.ObjectId, ref: "paiement", required: true, unique: true },
    numeroFacture: { type: String, required: true , unique: true},
    dateEmission: { type: Date, required: true, default: Date.now },
    montantHT: { type: Number, required: true, min: 0 },
    montantTTC: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);
module.exports = mongoose.model("facture", factureSchema);