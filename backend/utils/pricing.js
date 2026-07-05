// Tarification par personne et par nuit (miroir du front : src/utils/pricing.ts).
// Règle : adulte = plein tarif, enfant 13-17 ans = plein tarif,
// enfant 5-12 ans = demi-tarif, enfant de moins de 5 ans = gratuit.

const AGE_GRATUIT = 5;     // < 5 ans : gratuit
const AGE_DEMI_TARIF = 13; // 5..12 ans : demi-tarif ; >= 13 ans : plein tarif

/** Coefficient de prix appliqué à un enfant selon son âge. */
function coefEnfant(age) {
  const a = Number(age);
  if (isNaN(a) || a < AGE_GRATUIT) return 0;
  if (a < AGE_DEMI_TARIF) return 0.5;
  return 1;
}

/**
 * Montant total d'un séjour hôtel facturé par personne.
 * @param {number} prixParNuit  Tarif plein d'un adulte pour une nuit.
 * @param {number} nbAdultes    Nombre d'adultes (plein tarif).
 * @param {number[]} agesEnfants Âges des enfants.
 * @param {number} nbNuits      Nombre de nuits.
 * @returns {number}
 */
function calculerMontantHotel(prixParNuit, nbAdultes, agesEnfants, nbNuits) {
  const ages = Array.isArray(agesEnfants) ? agesEnfants : [];
  const coefEnfants = ages.reduce((sum, age) => sum + coefEnfant(age), 0);
  const parNuit = Number(prixParNuit) * (Number(nbAdultes) + coefEnfants);
  return parNuit * Math.max(0, Number(nbNuits) || 0);
}

module.exports = { AGE_GRATUIT, AGE_DEMI_TARIF, coefEnfant, calculerMontantHotel };
