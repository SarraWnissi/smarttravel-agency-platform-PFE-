const mongoose = require("mongoose");

const reservationSchema = mongoose.Schema(
{
  // Pour les clients enregistrés
  clientID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "utilisateur",
    required: false,
    default: null
  },

  // Pour les visiteurs guest (C-01)
  guestNom: { type: String, default: "" },
  guestPrenom: { type: String, default: "" },
  guestEmail: { type: String, default: "" },
  guestTelephone: { type: String, default: "" },

  offreID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "offre",
    required: false,
  },
  serviceID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "service",
    required: false,
  },
  chambreID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "chambre",
    required: function () {
      return this.typeReservation === "HOTEL";
    }
  },
  typeReservation: {
    type: String,
    enum: ["HOTEL", "EXCURSION", "INTERNATIONALE"],
    required: true
  },
  dateDebutSejour: Date,
  dateFinSejour: Date,
  nbPersonnes: {
    type: Number,
    required: true,
    min: 1
  },
  // Âges des enfants (tarif par personne : < 5 ans gratuit, 5-12 demi-tarif)
  agesEnfants: {
    type: [Number],
    default: []
  },
  statut: {
    type: String,
    enum: ["EN_ATTENTE_PAIEMENT", "CONFIRMEE", "ANNULEE", "EXPIREE"],
    default: "EN_ATTENTE_PAIEMENT"
  },
  montantTotal: Number,
  formule: {
    type: String,
    enum: ["DEMI_PENSION", "ALL_INCLUSIVE", "PRIX_SPECIAL", "LOGEMENT_SEUL"],
    default: "LOGEMENT_SEUL"
  },
  pension: String,
  nbNuits: Number,
  dateExcursion: Date,
  dureeHeures: Number,
  numPassport: String,
  visa: String,
  paysDestination: String
},
{ timestamps: true }
);

reservationSchema.pre("save", function() {
  const hasClient = this.clientID != null;
  const hasGuest = this.guestEmail && this.guestNom;

  if (!hasClient && !hasGuest) {
    throw new Error("clientID ou informations guest (guestNom + guestEmail) requis");
  }

  if (this.dateDebutSejour && this.dateFinSejour) {
    if (this.dateFinSejour < this.dateDebutSejour) {
      throw new Error("dateFinSejour doit être >= dateDebutSejour");
    }
  }

  if (this.typeReservation === "HOTEL") {
    if (!this.dateDebutSejour || !this.dateFinSejour) {
      throw new Error("HOTEL: dates de séjour obligatoires");
    }
    if (!this.chambreID) {
      throw new Error("HOTEL: chambreID obligatoire");
    }
  }

  if (this.typeReservation === "EXCURSION") {
    if (!this.dateExcursion) {
      throw new Error("EXCURSION: dateExcursion obligatoire");
    }
  }

  if (this.typeReservation === "INTERNATIONALE") {
    if (!this.numPassport) {
      throw new Error("INTERNATIONALE: numPassport obligatoire");
    }
    this.numPassport = String(this.numPassport).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z][0-9]{7}$/.test(this.numPassport)) {
      throw new Error("INTERNATIONALE: numPassport invalide (format attendu : 1 lettre suivie de 7 chiffres, ex : A1234567)");
    }
  }
});

reservationSchema.index({ clientID: 1 });
reservationSchema.index({ chambreID: 1 });
reservationSchema.index({ offreID: 1 });
reservationSchema.index({ guestEmail: 1 });
reservationSchema.index({ dateDebutSejour: 1, dateFinSejour: 1 });
reservationSchema.index({
  chambreID: 1,
  dateDebutSejour: 1,
  dateFinSejour: 1,
  statut: 1
});

module.exports = mongoose.model("reservation", reservationSchema);
