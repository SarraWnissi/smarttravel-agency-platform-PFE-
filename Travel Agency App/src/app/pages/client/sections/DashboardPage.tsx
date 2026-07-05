import React from "react";
import {
  Plane, Calendar, CreditCard, MapPin, Clock,
  User, ChevronRight, CheckCircle, AlertCircle, TrendingUp,
} from "lucide-react";
import { ImageWithFallback } from "../../../components/common/ImageWithFallback";
import { StatutBadge } from "../shared";

type Page = "dashboard" | "reservations" | "offres" | "hotels" | "services" | "factures" | "avis" | "preferences" | "ia" | "profil" | "parametres";

interface DashboardPageProps {
  prenom: string;
  nom: string;
  reservations: any[];
  loadingRes: boolean;
  totalDepense: number;
  firstRes: any;
  setActivePage: (p: Page) => void;
  notifications: { id: number; text: string; time: string; type: string }[];
}

export function DashboardPage({ prenom, nom, reservations, loadingRes, totalDepense, firstRes, setActivePage, notifications }: DashboardPageProps) {
  return (
    <div className="space-y-6">

      {/* Bannière */}
      <div className="bg-[#0a1628] rounded-2xl p-6 flex items-center justify-between overflow-hidden relative">
        <div className="absolute right-0 top-0 bottom-0 w-64 opacity-10">
          <div className="w-full h-full bg-gradient-to-l from-blue-400 rounded-2xl" />
        </div>
        <div className="relative z-10">
          <p className="text-blue-400 text-sm mb-1">Bienvenue 👋</p>
          <h2 className="text-white mb-2" style={{ fontSize: "1.4rem", fontWeight: 700 }}>
            {prenom} {nom}
          </h2>
          <p className="text-blue-200/70 text-sm">
            Vous avez <span className="text-white">{reservations.filter(r => r.statut === "Confirmée" || r.statut === "En attente").length} voyage(s)</span> en cours.
          </p>
        </div>
        <Plane className="h-16 w-16 text-blue-400/20 absolute right-6 top-1/2 -translate-y-1/2" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Réservations", value: String(reservations.length), icon: Calendar, color: "bg-blue-600", sub: "total" },
          { label: "Total dépensé", value: `${totalDepense.toLocaleString("fr-FR")} TND`, icon: CreditCard, color: "bg-[#0a1628]", sub: "tous voyages" },
          { label: "Destinations", value: String(new Set(reservations.map(r => r.destination)).size), icon: MapPin, color: "bg-indigo-600", sub: "visitées" },
          { label: "Points fidélité", value: String(reservations.length * 120), icon: TrendingUp, color: "bg-green-600", sub: "cumulés" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-[#0a1628] mb-0.5" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {loadingRes ? "..." : s.value}
            </p>
            <p className="text-gray-500 text-xs">{s.label}</p>
            <p className="text-gray-400 text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Prochain voyage + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[#0a1628]" style={{ fontWeight: 600 }}>Prochain voyage</h3>
            <button onClick={() => setActivePage("reservations")} className="text-blue-600 text-xs hover:underline flex items-center gap-1">
              Voir tout <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          {firstRes ? (
            <div className="flex gap-0">
              <div className="relative w-40 flex-shrink-0">
                <ImageWithFallback src={firstRes.image} alt={firstRes.destination} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-[#0a1628] mb-1" style={{ fontWeight: 600, fontSize: "1.05rem" }}>{firstRes.destination}</h4>
                    <p className="text-gray-500 text-xs">{firstRes.type}</p>
                  </div>
                  <StatutBadge statut={firstRes.statut} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs">{firstRes.dateDepart}</span>
                  </div>
                  {firstRes.nbNuits && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs">{firstRes.nbNuits} nuits</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs">{firstRes.nbPersonnes} pers.</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs">{firstRes.montant.toLocaleString("fr-FR")} TND</span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-3">Réf. {firstRes.id}</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              <Plane className="h-10 w-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Aucune réservation</p>
              <button onClick={() => setActivePage("offres")} className="mt-3 text-blue-600 text-xs hover:underline">
                Explorer les offres →
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-[#0a1628]" style={{ fontWeight: 600 }}>Notifications</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  {n.type === "success"
                    ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-gray-700 text-xs leading-relaxed">{n.text}</p>
                    <p className="text-gray-400 text-xs mt-1">{n.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
