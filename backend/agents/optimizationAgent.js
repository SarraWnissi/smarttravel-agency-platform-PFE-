const Offre      = require('../models/offre');
const Reservation = require('../models/reservation');
const Preference  = require('../models/preference');
const Chambre     = require('../models/chambre');

// ── Scoring constants ──────────────────────────────────────────────────────
const SCORE_BUDGET       = 30;  // budget match
const SCORE_DESTINATIONS = 25;  // destinations favorites
const SCORE_TYPE_MATCH   = 20;  // type de séjour selon historique
const SCORE_FORMULE      = 15;  // formule favorite (All Inclusive, etc.)
const SCORE_POPULARITE   = 10;  // popularité de l'offre

class OptimizationAgent {
  constructor() {
    this.name  = 'OptimizationAgent';
    this.role  = 'Recommandation personnalisée basée sur l\'historique et les préférences';
    this.stats = { recommandations: 0, optimisations: 0, derniereAction: null };
  }

  // ── 1. Score budget (0-30) ────────────────────────────────────────────────
  _scoreBudget(offre, preference) {
    if (!preference?.budget_max) return { pts: 15, label: 'Budget non défini' };
    const prix = offre.prixAPartirDe ?? 0;
    if (prix === 0) return { pts: 10, label: 'Prix non renseigné' };
    if (prix <= preference.budget_max * 0.6) return { pts: SCORE_BUDGET, label: 'Excellent rapport qualité/prix' };
    if (prix <= preference.budget_max * 0.8) return { pts: Math.round(SCORE_BUDGET * 0.85), label: 'Dans votre budget' };
    if (prix <= preference.budget_max)        return { pts: Math.round(SCORE_BUDGET * 0.65), label: 'Limite de budget' };
    if (prix <= preference.budget_max * 1.15) return { pts: Math.round(SCORE_BUDGET * 0.3), label: 'Légèrement au-dessus' };
    return { pts: 0, label: 'Hors budget' };
  }

  // ── 2. Score destinations (0-25) ─────────────────────────────────────────
  _scoreDestinations(offre, preference) {
    if (!preference?.destinations_favorites?.length) return { pts: 5, label: 'Destinations non configurées' };
    const haystack = [
      offre.titre,
      offre.descriptionCourte,
      offre.serviceID?.titre,
      offre.serviceID?.localisation,
    ].filter(Boolean).join(' ').toLowerCase();

    const matched = preference.destinations_favorites.filter(dest =>
      dest && haystack.includes(dest.toLowerCase())
    );

    if (matched.length >= 2) return { pts: SCORE_DESTINATIONS, label: `Correspond à ${matched.slice(0,2).join(', ')}` };
    if (matched.length === 1) return { pts: Math.round(SCORE_DESTINATIONS * 0.7), label: `Destination : ${matched[0]}` };
    return { pts: 2, label: 'Nouvelle destination' };
  }

  // ── 3. Score type de séjour (0-20) ───────────────────────────────────────
  _scoreTypeMatch(offre, historique) {
    if (!historique.length) return { pts: 8, label: 'Aucun historique' };

    const typeService = offre.serviceID?.typeService ?? '';
    const toType = t => t === 'HOTEL' ? 'HEBERGEMENT' : t === 'EXCURSION' ? 'ACTIVITE' : 'DESTINATION';

    const counts = {};
    historique.forEach(r => {
      const mapped = toType(r.typeReservation);
      counts[mapped] = (counts[mapped] || 0) + 1;
    });
    const total = historique.length;
    const ratio = (counts[typeService] ?? 0) / total;

    if (ratio >= 0.7) return { pts: SCORE_TYPE_MATCH, label: 'Votre type de séjour favori' };
    if (ratio >= 0.4) return { pts: Math.round(SCORE_TYPE_MATCH * 0.7), label: 'Type souvent réservé' };
    if (ratio > 0)    return { pts: Math.round(SCORE_TYPE_MATCH * 0.4), label: 'Type parfois réservé' };
    return { pts: 5, label: 'Nouvelle expérience' };
  }

  // ── 4. Score formule (0-15) ───────────────────────────────────────────────
  _scoreFormule(offre, formuleFavorite, preference) {
    // Formule depuis préférences utilisateur
    const prefTypes = preference?.types_sejour ?? [];
    const desc = (offre.descriptionCourte || '').toLowerCase() + ' ' + (offre.titre || '').toLowerCase();

    const keywords = {
      ALL_INCLUSIVE: ['all inclusive', 'tout compris', 'all-inclusive'],
      DEMI_PENSION:  ['demi-pension', 'demi pension', 'half board'],
      PRIX_SPECIAL:  ['prix spécial', 'promo', 'promotion', 'réduction'],
      LOGEMENT_SEUL: ['logement', 'chambre seule', 'room only'],
    };

    // Score from historical formule
    if (formuleFavorite) {
      const kws = keywords[formuleFavorite] ?? [];
      const matchDesc = kws.some(k => desc.includes(k));
      if (matchDesc) return { pts: SCORE_FORMULE, label: `Formule ${formuleFavorite.replace('_',' ').toLowerCase()} préférée` };
      return { pts: Math.round(SCORE_FORMULE * 0.5), label: 'Formule adaptable' };
    }

    // Score from preferences types_sejour
    if (prefTypes.length > 0 && prefTypes.some(t => ['HOTEL','HEBERGEMENT'].includes(t))) {
      return { pts: Math.round(SCORE_FORMULE * 0.8), label: 'Hébergement dans vos préférences' };
    }

    return { pts: 5, label: 'Formule standard' };
  }

  // ── 5. Score popularité (0-10) ────────────────────────────────────────────
  _scorePopularite(offre, historique) {
    const nb = historique.filter(r => String(r.offreID) === String(offre._id)).length;
    if (nb >= 3) return { pts: SCORE_POPULARITE, label: 'Très populaire' };
    if (nb >= 1) return { pts: 7, label: 'Déjà réservée' };
    // Base score for new offers
    return { pts: 3, label: 'Découvrez cette offre' };
  }

  // ── Génération de raison lisible ──────────────────────────────────────────
  _genererRaison(details) {
    const highlights = [];
    if (details.budget.pts   >= 25) highlights.push('dans votre budget');
    if (details.dest.pts     >= 18) highlights.push('destination favorite');
    if (details.type.pts     >= 14) highlights.push('votre type de séjour');
    if (details.formule.pts  >= 12) highlights.push('formule habituelle');
    if (details.popular.pts  >= 8)  highlights.push('très populaire');

    if (highlights.length === 0) return 'Offre de qualité adaptée à vos voyages';
    if (highlights.length === 1) return `Recommandé : ${highlights[0]}`;
    return `Recommandé car ${highlights.slice(0,-1).join(', ')} et ${highlights[highlights.length-1]}`;
  }

  // ── Niveau de confiance ───────────────────────────────────────────────────
  _niveauConfiance(score) {
    if (score >= 75) return { label: 'Élevé',  color: 'emerald', icon: '🟢' };
    if (score >= 50) return { label: 'Moyen',  color: 'amber',   icon: '🟡' };
    return              { label: 'Faible', color: 'red',     icon: '🔴' };
  }

  // ── Tags explicatifs ──────────────────────────────────────────────────────
  _genererTags(details) {
    const tags = [];
    if (details.budget.pts  >= 20) tags.push({ label: '💰 Budget OK',         color: 'green' });
    if (details.dest.pts    >= 18) tags.push({ label: '📍 Destination fav',   color: 'blue'  });
    if (details.type.pts    >= 15) tags.push({ label: '🏨 Type habituel',     color: 'purple'});
    if (details.formule.pts >= 12) tags.push({ label: '🍽️ Formule préférée', color: 'orange'});
    if (details.popular.pts >= 8)  tags.push({ label: '⭐ Populaire',          color: 'amber' });
    return tags;
  }

  // ── Calcul complet d'un score ─────────────────────────────────────────────
  async calculerScore(offre, preference, historique, formuleFavorite) {
    const details = {
      budget:  this._scoreBudget(offre, preference),
      dest:    this._scoreDestinations(offre, preference),
      type:    this._scoreTypeMatch(offre, historique),
      formule: this._scoreFormule(offre, formuleFavorite, preference),
      popular: this._scorePopularite(offre, historique),
    };

    const total = Math.min(
      details.budget.pts + details.dest.pts + details.type.pts +
      details.formule.pts + details.popular.pts,
      100
    );

    return { total, details };
  }

  // ── Analyse formule favorite depuis l'historique ──────────────────────────
  async _getFormuleFavorite(clientID) {
    const resHotel = await Reservation.find({ clientID, typeReservation: 'HOTEL' })
      .select('chambreID').lean();
    if (!resHotel.length) return null;

    const chambreIds = resHotel.map(r => r.chambreID).filter(Boolean);
    const chambres   = await Chambre.find({ _id: { $in: chambreIds } }).select('formule').lean();

    const counts = {};
    chambres.forEach(c => { if (c.formule) counts[c.formule] = (counts[c.formule] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? null;
  }

  // ── Point d'entrée principal ──────────────────────────────────────────────
  async recommanderOffres(clientID, limit = 6) {
    const [offres, preference, historique, formuleFavorite] = await Promise.all([
      Offre.find({ disponible: { $ne: false } }).populate('serviceID').lean(),
      Preference.findOne({ clientID }).lean(),
      Reservation.find({ clientID }).lean(),
      this._getFormuleFavorite(clientID),
    ]);

    // Exclure les offres déjà réservées récemment (moins de 30 jours)
    const recentOffreIds = new Set(
      historique
        .filter(r => new Date(r.createdAt) > new Date(Date.now() - 30 * 86400000))
        .map(r => String(r.offreID))
    );

    const scored = await Promise.all(
      offres
        .filter(o => !recentOffreIds.has(String(o._id)))
        .map(async o => {
          const { total, details } = await this.calculerScore(o, preference, historique, formuleFavorite);
          return { offre: o, total, details };
        })
    );

    const top = scored
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    const recommandations = top.map(({ offre, total, details }) => {
      const niveau = this._niveauConfiance(total);
      const raison = this._genererRaison(details);
      const tags   = this._genererTags(details);

      return {
        ...offre,
        score: total,
        scoreDetails: {
          budget:    { pts: details.budget.pts,  max: SCORE_BUDGET,       label: details.budget.label  },
          dest:      { pts: details.dest.pts,    max: SCORE_DESTINATIONS, label: details.dest.label    },
          type:      { pts: details.type.pts,    max: SCORE_TYPE_MATCH,   label: details.type.label    },
          formule:   { pts: details.formule.pts, max: SCORE_FORMULE,      label: details.formule.label },
          popularite:{ pts: details.popular.pts, max: SCORE_POPULARITE,   label: details.popular.label },
        },
        niveau,
        raison,
        tags,
        formuleFavorite,
      };
    });

    this.stats.recommandations++;
    this.stats.derniereAction = new Date();
    this.log('RECOMMANDATIONS', { clientID, count: recommandations.length, topScore: recommandations[0]?.score ?? 0 });

    return recommandations;
  }

  // ── Analyse pour l'admin ──────────────────────────────────────────────────
  async optimiserOffres() {
    const topOffres = await Reservation.aggregate([
      { $match: { statut: { $in: ['CONFIRMEE', 'EN_ATTENTE_PAIEMENT'] } } },
      { $group: { _id: '$offreID', count: { $sum: 1 }, totalRevenu: { $sum: '$montantTotal' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    this.stats.optimisations++;
    this.stats.derniereAction = new Date();
    return topOffres;
  }

  getStats() {
    return {
      name: this.name,
      status: 'ACTIF',
      stats: this.stats,
    };
  }

  log(action, data) {
    console.log(`[${this.name}] ${action}:`, JSON.stringify(data));
  }
}

module.exports = new OptimizationAgent();
