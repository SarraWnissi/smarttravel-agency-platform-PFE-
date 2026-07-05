import React from "react";
import { ChevronRight } from "lucide-react";

export const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400",
  "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?w=400",
  "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400",
  "https://images.unsplash.com/photo-1714412192114-61dca8f15f68?w=400",
];

export const CLIENT_NOTIFICATIONS = [
  { id: 1, text: "Bienvenue sur votre espace SmartTravel.", time: "Maintenant", type: "info" },
  { id: 2, text: "Découvrez nos nouvelles offres disponibles.", time: "Il y a 1j", type: "info" },
];

export const CLIENT_PAGE_SIZE = 5;
export const SVC_PAGE_SIZE = 6;

// Prix « le moins cher » d'une offre : minimum entre le prix d'appel de l'offre
// (prixAPartirDe) et le prix réel du service lié (prixBase/prix — celui réellement
// facturé). Gère le service lié sous forme `service` (offres enrichies) ou
// `serviceID` peuplé (réponses API). Renvoie 0 si aucun prix exploitable.
export function prixOffreLeMoinsCher(offre: any): number {
  const svc =
    offre?.service && typeof offre.service === "object" ? offre.service
    : offre?.serviceID && typeof offre.serviceID === "object" ? offre.serviceID
    : null;
  const candidats = [
    offre?.prixAPartirDe,
    svc?.prixBase,
    svc?.prix,
    offre?.prixBase,
  ].filter((p) => typeof p === "number" && p > 0);
  return candidats.length ? Math.min(...candidats) : 0;
}

export function StatutBadge({ statut }: { statut: string }) {
  const cfg = ({
    Confirmée: "bg-green-100 text-green-700 border-green-200",
    "En attente": "bg-yellow-100 text-yellow-700 border-yellow-200",
    Terminée: "bg-gray-100 text-gray-600 border-gray-200",
    Annulée: "bg-red-100 text-red-700 border-red-200",
  } as Record<string, string>)[statut] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs border ${cfg}`}>{statut}</span>
  );
}

export function ClientPagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <ChevronRight className="h-4 w-4 rotate-180" />
      </button>
      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)} className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{p}</button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === total} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
