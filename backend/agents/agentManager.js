const reservationAgent = require('./reservationAgent');
const conflictAgent = require('./conflictAgent');
const optimizationAgent = require('./optimizationAgent');

class AgentManager {
  constructor() {
    this.name = 'AgentManager';
    this.agents = { reservation: reservationAgent, conflict: conflictAgent, optimization: optimizationAgent };
  }

  getAgent(name) {
    const agent = this.agents[name];
    if (!agent) throw new Error(`Agent "${name}" introuvable`);
    return agent;
  }

  async superviserReservation(reservationData) {
    console.log(`[${this.name}] Supervision réservation en cours...`);

    const validation = await this.agents.reservation.valider(reservationData);
    if (!validation.valide) {
      return { success: false, errors: validation.errors, agent: 'ReservationAgent' };
    }

    if (
      reservationData.typeReservation === 'HOTEL' &&
      reservationData.chambreID &&
      reservationData.dateDebutSejour &&
      reservationData.dateFinSejour
    ) {
      const conflit = await this.agents.conflict.detecterConflit(
        reservationData.chambreID,
        new Date(reservationData.dateDebutSejour),
        new Date(reservationData.dateFinSejour)
      );
      if (conflit.conflitDetecte) {
        return { success: false, errors: ['Chambre déjà réservée sur cette période'], agent: 'ConflictAgent' };
      }
    }

    console.log(`[${this.name}] Réservation validée par tous les agents`);
    return { success: true };
  }

  async status() {
    const Reservation = require('../models/reservation');
    const Offre = require('../models/offre');

    const [total, confirmees, enAttente, annulees, hotelActives, topOffreRaw] = await Promise.all([
      Reservation.countDocuments(),
      Reservation.countDocuments({ statut: 'CONFIRMEE' }),
      Reservation.countDocuments({ statut: 'EN_ATTENTE_PAIEMENT' }),
      Reservation.countDocuments({ statut: 'ANNULEE' }),
      Reservation.countDocuments({ typeReservation: 'HOTEL', statut: { $in: ['EN_ATTENTE_PAIEMENT', 'CONFIRMEE'] } }),
      Reservation.aggregate([
        { $match: { statut: { $in: ['CONFIRMEE', 'EN_ATTENTE_PAIEMENT'] }, offreID: { $ne: null } } },
        { $group: { _id: '$offreID', count: { $sum: 1 }, totalRevenu: { $sum: '$montantTotal' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const offreIds = topOffreRaw.map(o => o._id).filter(Boolean);
    const offres = await Offre.find({ _id: { $in: offreIds } }).select('titre').lean();
    const offresMap = Object.fromEntries(offres.map(o => [String(o._id), o.titre]));
    const topOffres = topOffreRaw.map(o => ({
      titre: offresMap[String(o._id)] ?? 'Offre inconnue',
      count: o.count,
      totalRevenu: o.totalRevenu,
    }));

    return [
      {
        name: this.agents.reservation.name,
        role: this.agents.reservation.role,
        status: 'ACTIF',
        stats: this.agents.reservation.stats,
        dbStats: { total, confirmees, enAttente, annulees },
      },
      {
        name: this.agents.conflict.name,
        role: this.agents.conflict.role,
        status: 'ACTIF',
        stats: this.agents.conflict.stats,
        dbStats: { hotelActives },
      },
      {
        name: this.agents.optimization.name,
        role: this.agents.optimization.role,
        status: 'ACTIF',
        stats: this.agents.optimization.stats,
        dbStats: { totalReservations: total },
        topOffres,
      },
    ];
  }
}

module.exports = new AgentManager();
