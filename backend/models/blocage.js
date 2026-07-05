const mongoose = require('mongoose');

const blocageSchema = new mongoose.Schema({
  chambreID:      { type: mongoose.Schema.Types.ObjectId, ref: 'chambre',      required: true },
  hebergementID:  { type: mongoose.Schema.Types.ObjectId, ref: 'hebergement',  required: true },
  dateDebut:      { type: Date, required: true },
  dateFin:        { type: Date, required: true },
  motif:          { type: String, default: 'Maintenance' },
}, { timestamps: true });

module.exports = mongoose.model('blocage', blocageSchema);
