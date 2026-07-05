/** Format a number as "1 234 TND" — jsPDF-safe (no narrow no-break space) */
export function fmtTND(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " TND";
}

/** Format a date string as DD/MM/YYYY */
export function fmtDate(d: string | undefined | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Format a date string as "12 janvier 2025" */
export function fmtDateLong(d: string | undefined | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Validate a passport number — returns error message or empty string.
 *  Format exact attendu : 1 lettre suivie de 7 chiffres (ex : A1234567). */
export function validatePassport(value: string): string {
  const v = value.trim().toUpperCase();
  if (!v) return "Le numéro de passeport est obligatoire.";
  if (!/^[A-Z0-9]+$/.test(v))
    return "Uniquement des lettres et des chiffres sont autorisés (sans espace ni caractère spécial).";
  if (!/^[A-Z][0-9]{7}$/.test(v))
    return "Format invalide : 1 lettre suivie de 7 chiffres (ex : A1234567).";
  return "";
}
