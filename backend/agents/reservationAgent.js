class ReservationAgent {
  constructor() {
    this.name = 'ReservationAgent';
    this.role = 'Supervise la création et le suivi des réservations';
    this.stats = { validations: 0, validees: 0, refusees: 0, derniereAction: null };
  }

  async valider(data) {
    const errors = [];

    if (!data.clientID) errors.push('clientID manquant');
    if (!data.typeReservation) errors.push('typeReservation manquant');
    if (!data.nbPersonnes || data.nbPersonnes < 1) errors.push('nbPersonnes invalide');

    if (data.typeReservation === 'HOTEL') {
      if (!data.dateDebutSejour) errors.push('dateDebutSejour requis pour HOTEL');
      if (!data.dateFinSejour) errors.push('dateFinSejour requis pour HOTEL');
      if (!data.chambreID) errors.push('chambreID requis pour HOTEL');
    }

    if (data.typeReservation === 'INTERNATIONALE') {
      if (!data.numPassport) errors.push('numPassport requis pour INTERNATIONALE');
      if (!data.paysDestination) errors.push('paysDestination requis pour INTERNATIONALE');
    }

    this.stats.validations++;
    if (errors.length === 0) this.stats.validees++; else this.stats.refusees++;
    this.stats.derniereAction = new Date();
    this.log('VALIDATION', { type: data.typeReservation, valide: errors.length === 0, errors });
    return { valide: errors.length === 0, errors };
  }

  async calculerMontant(reservation, chambre, service) {
    if (reservation.typeReservation === 'HOTEL' && chambre) {
      const debut = new Date(reservation.dateDebutSejour);
      const fin = new Date(reservation.dateFinSejour);
      const nuits = Math.max(1, Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)));
      const montant = nuits * Number(chambre.prixParNuit);
      this.log('CALCUL_MONTANT', { nuits, prixParNuit: chambre.prixParNuit, montant });
      return montant;
    }
    if (['EXCURSION', 'INTERNATIONALE'].includes(reservation.typeReservation) && service) {
      const montant = (Number(service.prixBase) || 0) * Number(reservation.nbPersonnes);
      this.log('CALCUL_MONTANT', { prixBase: service.prixBase, nbPersonnes: reservation.nbPersonnes, montant });
      return montant;
    }
    return 0;
  }

  log(action, data) {
    console.log(`[${this.name}] ${action}:`, JSON.stringify(data));
  }
}

module.exports = new ReservationAgent();
