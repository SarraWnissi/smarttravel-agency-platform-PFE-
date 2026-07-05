// Tarification par personne et par nuit.
// Règle : adulte = plein tarif, enfant 13-17 ans = plein tarif,
// enfant 5-12 ans = demi-tarif, enfant de moins de 5 ans = gratuit.

export const AGE_GRATUIT = 5;   // < 5 ans : gratuit
export const AGE_DEMI_TARIF = 13; // 5..12 ans : demi-tarif ; >= 13 ans : plein tarif

/** Coefficient de prix appliqué à un enfant selon son âge. */
export function coefEnfant(age: number): number {
  if (age < AGE_GRATUIT) return 0;
  if (age < AGE_DEMI_TARIF) return 0.5;
  return 1;
}

export interface TarifDetail {
  parNuit: number;        // prix d'une nuit pour tous les voyageurs
  total: number;          // prix total (parNuit × nuits)
  nbAdultes: number;
  nbEnfantsPayants: number;
  nbEnfantsGratuits: number;
}

/**
 * Calcule le tarif par personne.
 * @param prixParNuit Tarif plein d'un adulte pour une nuit.
 * @param nbAdultes   Nombre d'adultes (plein tarif).
 * @param agesEnfants Âges des enfants.
 * @param nbNuits     Nombre de nuits.
 */
export function calculerTarif(
  prixParNuit: number,
  nbAdultes: number,
  agesEnfants: number[],
  nbNuits: number,
): TarifDetail {
  const coefEnfants = agesEnfants.reduce((sum, age) => sum + coefEnfant(age), 0);
  const parNuit = prixParNuit * (nbAdultes + coefEnfants);
  return {
    parNuit,
    total: parNuit * Math.max(0, nbNuits),
    nbAdultes,
    nbEnfantsPayants: agesEnfants.filter(a => coefEnfant(a) > 0).length,
    nbEnfantsGratuits: agesEnfants.filter(a => a < AGE_GRATUIT).length,
  };
}

// ── Réservation multi-chambres ───────────────────────────────────────────────

export interface ChambreLite {
  _id: string;
  prixParNuit: number;
  capacite: number;
  typeChambre?: string;
  numeroChambre?: string;
  formule?: string;
}

export interface AffectationChambre {
  chambre: ChambreLite;
  nbAdultes: number;     // adultes affectés à cette chambre
  agesEnfants: number[]; // âges des enfants affectés à cette chambre
  parNuit: number;       // prix d'une nuit pour cette chambre
  total: number;         // parNuit × nuits
}

export interface RepartitionMulti {
  affectations: AffectationChambre[];
  total: number;            // prix total toutes chambres × nuits
  capaciteTotale: number;   // somme des capacités des chambres sélectionnées
  occupantsAffectes: number; // nombre de personnes effectivement placées
  chambresSansAdulte: number; // nb de chambres occupées sans adulte (invalide)
}

type Voyageur = { adulte: boolean; age: number };

/**
 * Répartit les voyageurs (adultes + enfants) sur les chambres sélectionnées,
 * puis calcule le tarif par personne de chaque chambre.
 *
 * Règle : on place d'abord un adulte par chambre (une chambre ne peut pas être
 * occupée par des enfants seuls), puis on remplit le reste par capacité, les
 * adultes et les enfants les plus âgés d'abord.
 */
export function repartirSurChambres(
  chambres: ChambreLite[],
  nbAdultes: number,
  agesEnfants: number[],
  nbNuits: number,
): RepartitionMulti {
  const adultes: Voyageur[] = Array.from({ length: Math.max(0, nbAdultes) }, () => ({ adulte: true, age: 99 }));
  const enfants: Voyageur[] = [...agesEnfants].sort((a, b) => b - a).map(age => ({ adulte: false, age }));

  const lots: Voyageur[][] = chambres.map(() => []);

  // 1) un adulte par chambre (si disponible et capacité > 0)
  chambres.forEach((c, i) => {
    if (adultes.length && (c.capacite || 0) > 0) lots[i].push(adultes.shift()!);
  });

  // 2) remplir le reste (adultes restants puis enfants) par capacité, dans l'ordre
  const reste = [...adultes, ...enfants];
  let ri = 0;
  for (const v of reste) {
    while (ri < chambres.length && lots[ri].length >= (chambres[ri].capacite || 0)) ri++;
    if (ri >= chambres.length) break; // débordement (capacité insuffisante)
    lots[ri].push(v);
  }

  let occupantsAffectes = 0;
  let chambresSansAdulte = 0;
  const affectations: AffectationChambre[] = chambres.map((chambre, i) => {
    const lot = lots[i];
    occupantsAffectes += lot.length;
    const nbAd = lot.filter(v => v.adulte).length;
    const ages = lot.filter(v => !v.adulte).map(v => v.age);
    if (lot.length > 0 && nbAd === 0) chambresSansAdulte += 1;
    const coef = nbAd + ages.reduce((s, a) => s + coefEnfant(a), 0);
    const parNuit = Number(chambre.prixParNuit) * coef;
    return { chambre, nbAdultes: nbAd, agesEnfants: ages, parNuit, total: parNuit * Math.max(0, nbNuits) };
  });

  return {
    affectations,
    total: affectations.reduce((s, a) => s + a.total, 0),
    capaciteTotale: chambres.reduce((s, c) => s + (c.capacite || 0), 0),
    occupantsAffectes,
    chambresSansAdulte,
  };
}
