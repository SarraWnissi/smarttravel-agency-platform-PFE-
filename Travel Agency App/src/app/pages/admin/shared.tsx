import React from "react";
import {
  ChevronRight, CheckCircle, Clock, XCircle,
  LayoutDashboard, Users, Plane, Package, Calendar,
  BedDouble, Building2, Route, Bus, Bot, History, BarChart2, Settings,
} from "lucide-react";

export type Page = "dashboard" | "clients" | "offres" | "services" | "reservations" | "chambres" | "hebergements" | "circuits" | "transports" | "agents" | "historique" | "rapports" | "settings";

export const menuItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Users },
  { id: "offres", label: "Offres", icon: Plane },
  { id: "services", label: "Services", icon: Package },
  { id: "reservations", label: "Réservations", icon: Calendar },
  { id: "chambres", label: "Chambres", icon: BedDouble },
  { id: "hebergements", label: "Hébergements", icon: Building2 },
  { id: "circuits", label: "Circuits", icon: Route },
  { id: "transports", label: "Transports", icon: Bus },
  { id: "agents", label: "Agents IA", icon: Bot },
  { id: "historique", label: "Historique", icon: History },
  { id: "rapports", label: "Rapports", icon: BarChart2 },
  { id: "settings", label: "Paramètres", icon: Settings },
];

export function StatutBadge({ statut }: { statut: string }) {
  const cfg: Record<string, string> = {
    Confirmée: "bg-green-100 text-green-700",
    "En attente": "bg-yellow-100 text-yellow-700",
    Annulée: "bg-red-100 text-red-700",
    Terminée: "bg-gray-100 text-gray-500",
    Active: "bg-green-100 text-green-700",
    Inactive: "bg-gray-100 text-gray-600",
    Actif: "bg-green-100 text-green-700",
    Suspendu: "bg-red-100 text-red-700",
    Inactif: "bg-gray-100 text-gray-600",
  };
  const icons: Record<string, React.ElementType> = {
    Confirmée: CheckCircle,
    "En attente": Clock,
    Annulée: XCircle,
  };
  const Icon = icons[statut];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs ${cfg[statut] ?? "bg-gray-100 text-gray-600"}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {statut}
    </span>
  );
}

export function buildChartData(reservations: any[]) {
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const map: Record<number, { reservations: number; revenus: number; chambres: number }> = {};
  const bucket = (m: number) => (map[m] ??= { reservations: 0, revenus: 0, chambres: 0 });
  reservations.forEach((r) => {
    // Réservations + revenus : regroupés par mois de création
    const m = new Date(r.createdAt).getMonth();
    bucket(m).reservations += 1;
    bucket(m).revenus += r.montantTotal ?? 0;

    // Chambres réservées : réservations HOTEL, regroupées par mois du séjour
    const isHotel = r.typeReservation === "HOTEL" || r.chambreID;
    if (isHotel) {
      const stay = r.dateDebutSejour ? new Date(r.dateDebutSejour) : new Date(r.createdAt);
      bucket(stay.getMonth()).chambres += 1;
    }
  });
  return Object.entries(map)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([idx, v]) => ({ month: months[Number(idx)], ...v }));
}

export function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  const visible = pages.filter(p => p === 1 || p === total || Math.abs(p - page) <= 1);
  const withEllipsis: (number | "…")[] = [];
  visible.forEach((p, i) => {
    if (i > 0 && p - (visible[i - 1] as number) > 1) withEllipsis.push("…");
    withEllipsis.push(p);
  });
  return (
    <div className="flex items-center justify-center gap-1 px-5 py-3 border-t border-gray-100">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
      </button>
      {withEllipsis.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-2 text-gray-400 text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={`w-8 h-8 rounded-lg text-sm transition-colors ${
              p === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === total}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
