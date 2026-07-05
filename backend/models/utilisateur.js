const mongoose = require("mongoose");
const bcrypt = require('bcrypt');

const utilisateurSchema = mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  firstname: { type: String, required: true },
  lastname: { type: String, required: true },

  role: {
    type: String,
    enum: ["CLIENT", "ADMIN"],
    default: "CLIENT"
  },

  telephone: String,
  adresseFacturation: String,

  etatCompte: {
    type: String,
    enum: ["ACTIF", "SUSPENDU", "SUPPRIME"],
    default: "ACTIF"
  },

  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String, sparse: true },
  verificationTokenExpiry: { type: Date }

}, { timestamps: true })

// HASH PASSWORD
utilisateurSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
module.exports = mongoose.model('utilisateur', utilisateurSchema)