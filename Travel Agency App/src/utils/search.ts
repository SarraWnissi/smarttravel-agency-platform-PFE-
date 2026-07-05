// Utilitaires de recherche tolérante (filtres côté client).
//
// Tolérance orthographique tunisienne : « djerba » ≡ « jerba ». On normalise les
// deux côtés (texte + requête) en minuscules et en collapsant « dj » → « j », de
// sorte que les deux graphies correspondent quel que soit le sens de la saisie.

export function normalizeSearch(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // enlève les accents (é → e)
    .replace(/dj/g, "j");
}

// true si `needle` est contenu dans `haystack` (tolérant djerba/jerba).
// Une requête vide correspond toujours.
export function matchSearch(haystack: string | null | undefined, needle: string | null | undefined): boolean {
  const n = normalizeSearch(needle).trim();
  if (!n) return true;
  return normalizeSearch(haystack).includes(n);
}

// Mots de liaison ignorés lors de la recherche par mots (ex. « dar el kef »).
const MOTS_LIAISON = new Set([
  "el", "le", "la", "les", "de", "du", "des", "da", "di", "the", "of", "et", "and", "a",
]);

// Correspondance tolérante PAR MOTS : insensible à l'ordre des mots, aux accents
// et aux mots de liaison. « dar el kef citadelle » correspond à « Dar Kef Citadelle ».
// Règle : chaque mot significatif (≥ 2 lettres, hors liaison) de la requête doit
// se retrouver dans le texte.
export function matchSearchTokens(haystack: string | null | undefined, needle: string | null | undefined): boolean {
  const n = normalizeSearch(needle).trim();
  if (!n) return true;
  const hay = normalizeSearch(haystack);
  if (hay.includes(n)) return true; // correspondance directe (rapide)
  const tokens = n.split(/\s+/).filter(t => t.length >= 2 && !MOTS_LIAISON.has(t));
  if (tokens.length === 0) return hay.includes(n);
  return tokens.every(t => hay.includes(t));
}
