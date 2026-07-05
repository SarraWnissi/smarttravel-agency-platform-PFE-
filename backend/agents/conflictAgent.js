const Reservation = require('../models/reservation');

class ConflictAgent {
  constructor() {
    this.name = 'ConflictAgent';
    this.role = 'Détecte les conflits de disponibilité entre réservations';
    this.stats = { verifications: 0, conflitsDetectes: 0, derniereAction: null };
  }

  async detecterConflit(chambreID, dateDebut, dateFin, excludeId = null) {
    const query = {
      chambreID,
      statut: { $in: ['EN_ATTENTE_PAIEMENT', 'CONFIRMEE'] },
      dateDebutSejour: { $lte: dateFin },
      dateFinSejour: { $gte: dateDebut },
    };
    if (excludeId) query._id = { $ne: excludeId };

    const conflit = await Reservation.findOne(query).lean();

    this.stats.verifications++;
    if (conflit) {
      this.stats.conflitsDetectes++;
      this.log('CONFLIT_DETECTE', { chambreID, dateDebut, dateFin, conflitID: conflit._id });
    } else {
      this.log('PAS_DE_CONFLIT', { chambreID, dateDebut, dateFin });
    }
    this.stats.derniereAction = new Date();

    return conflit ? { conflitDetecte: true, reservation: conflit } : { conflitDetecte: false };
  }

  async analyserDisponibiliteHebergement(hebergementID, dateDebut, dateFin) {
    const reservationsActives = await Reservation.find({
      statut: { $in: ['EN_ATTENTE_PAIEMENT', 'CONFIRMEE'] },
      dateDebutSejour: { $lte: dateFin },
      dateFinSejour: { $gte: dateDebut },
    }).populate('chambreID').lean();

    const chambresOccupees = reservationsActives
      .filter(r => r.chambreID && String(r.chambreID.hebergementID) === String(hebergementID))
      .map(r => r.chambreID._id);

    this.log('ANALYSE_HEBERGEMENT', { hebergementID, chambresOccupees: chambresOccupees.length });

    return { hebergementID, periode: `${dateDebut} → ${dateFin}`, chambresOccupees };
  }

  log(action, data) {
    console.log(`[${this.name}] ${action}:`, JSON.stringify(data));
  }
}

module.exports = new ConflictAgent();
