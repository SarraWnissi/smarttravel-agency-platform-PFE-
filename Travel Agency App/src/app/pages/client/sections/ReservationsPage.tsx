import React from "react";
import { Calendar, CreditCard, Plane, User, Trash2 } from "lucide-react";
import { ImageWithFallback } from "../../../components/common/ImageWithFallback";
import { StatutBadge, ClientPagination, CLIENT_PAGE_SIZE } from "../shared";

type Page = "dashboard" | "reservations" | "offres" | "hotels" | "services" | "factures" | "avis" | "preferences" | "ia" | "profil" | "parametres";

interface ReservationsPageProps {
  reservations: any[];
  loadingRes: boolean;
  paidIds: Set<string>;
  pageResAttente: number;
  setPageResAttente: (p: number) => void;
  pageResConfirmees: number;
  setPageResConfirmees: (p: number) => void;
  pageResAutres: number;
  setPageResAutres: (p: number) => void;
  openPayModal: (r: any) => void;
  handleCancelReservation: (id: string) => void;
  handleDeleteReservation: (id: string) => void;
  setActivePage: (p: Page) => void;
}

export function ReservationsPage({
  reservations, loadingRes, paidIds,
  pageResAttente, setPageResAttente,
  pageResConfirmees, setPageResConfirmees,
  pageResAutres, setPageResAutres,
  openPayModal, handleCancelReservation, handleDeleteReservation, setActivePage,
}: ReservationsPageProps) {
  const resAttente    = reservations.filter(r => !paidIds.has(r.rawId) && r.statut === "En attente");
  const resConfirmees = reservations.filter(r => paidIds.has(r.rawId)  || r.statut === "Confirmée");
  const resAutres     = reservations.filter(r => !paidIds.has(r.rawId) && r.statut !== "En attente" && r.statut !== "Confirmée");

  const totalAttente    = Math.max(1, Math.ceil(resAttente.length    / CLIENT_PAGE_SIZE));
  const totalConfirmees = Math.max(1, Math.ceil(resConfirmees.length / CLIENT_PAGE_SIZE));
  const totalAutres     = Math.max(1, Math.ceil(resAutres.length     / CLIENT_PAGE_SIZE));
  const pagedAttente    = resAttente.slice   ((pageResAttente    - 1) * CLIENT_PAGE_SIZE, pageResAttente    * CLIENT_PAGE_SIZE);
  const pagedConfirmees = resConfirmees.slice((pageResConfirmees - 1) * CLIENT_PAGE_SIZE, pageResConfirmees * CLIENT_PAGE_SIZE);
  const pagedAutres     = resAutres.slice    ((pageResAutres     - 1) * CLIENT_PAGE_SIZE, pageResAutres     * CLIENT_PAGE_SIZE);

  const ResCard = ({ res, showActions }: { res: any; showActions: boolean }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        <div className="w-32 md:w-44 flex-shrink-0">
          <ImageWithFallback src={res.image} alt={res.destination} className="w-full h-full object-cover" style={{ minHeight: "120px" }} />
        </div>
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-[#0a1628] mb-0.5" style={{ fontWeight: 600, fontSize: "1rem" }}>{res.destination}</h3>
              <p className="text-gray-500 text-xs">{res.type} · Réf. {res.id}</p>
            </div>
            <StatutBadge statut={paidIds.has(res.rawId) ? "Confirmée" : res.statut} />
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-blue-500" />{res.dateDepart} → {res.dateRetour}</span>
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-blue-500" />{res.nbPersonnes} pers.</span>
            <span className="flex items-center gap-1 text-blue-600"><CreditCard className="h-3.5 w-3.5" />{res.montant.toLocaleString("fr-FR")} TND</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 pr-5 justify-center">
          {showActions && (
            <>
              <button
                onClick={() => openPayModal(res)}
                className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium shadow-sm"
              >
                <CreditCard className="h-3 w-3" /> Payer
              </button>
              <button onClick={() => handleCancelReservation(res.rawId)} className="text-xs text-orange-500 hover:text-orange-600 border border-orange-200 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors">
                Annuler
              </button>
            </>
          )}
          <button onClick={() => handleDeleteReservation(res.rawId)} className="text-xs text-red-500 hover:text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <Trash2 className="h-3 w-3" /> Supprimer
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[#0a1628] font-bold text-lg">Mes réservations</h3>
          <p className="text-gray-400 text-xs mt-0.5">{reservations.length} réservation(s) au total</p>
        </div>
        <button onClick={() => setActivePage("offres")} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plane className="h-4 w-4" /> Explorer les offres
        </button>
      </div>

      {loadingRes && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loadingRes && reservations.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <Calendar className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">Vous n'avez pas encore de réservation.</p>
          <button onClick={() => setActivePage("offres")} className="mt-4 text-blue-600 text-sm hover:underline">Découvrir nos offres →</button>
        </div>
      )}

      {/* ── RÉSERVATIONS EFFECTUÉES ── */}
      {resAttente.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-100">
            <span className="w-1 h-5 bg-blue-500 rounded-full" />
            <h4 className="text-blue-700 font-semibold text-sm">🗓️ Réservations effectuées</h4>
            <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2.5 py-0.5 rounded-full">{resAttente.length}</span>
          </div>
          <div className="space-y-3">
            {pagedAttente.map(res => <div key={res.id}><ResCard res={res} showActions={true} /></div>)}
          </div>
          <ClientPagination page={pageResAttente} total={totalAttente} onChange={setPageResAttente} />
        </div>
      )}

      {/* ── CONFIRMÉES ── */}
      {resConfirmees.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-green-100">
            <span className="w-1 h-5 bg-green-500 rounded-full" />
            <h4 className="text-green-700 font-semibold text-sm">✅ Confirmées</h4>
            <span className="bg-green-100 text-green-600 text-xs font-bold px-2.5 py-0.5 rounded-full">{resConfirmees.length}</span>
          </div>
          <div className="space-y-3">
            {pagedConfirmees.map(res => <div key={res.id}><ResCard res={res} showActions={false} /></div>)}
          </div>
          <ClientPagination page={pageResConfirmees} total={totalConfirmees} onChange={setPageResConfirmees} />
        </div>
      )}

      {/* ── ANNULÉES / TERMINÉES ── */}
      {resAutres.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <span className="w-1 h-5 bg-gray-300 rounded-full" />
            <h4 className="text-gray-500 font-semibold text-sm">📁 Annulées / Terminées</h4>
            <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-0.5 rounded-full">{resAutres.length}</span>
          </div>
          <div className="space-y-3">
            {pagedAutres.map(res => <div key={res.id}><ResCard res={res} showActions={false} /></div>)}
          </div>
          <ClientPagination page={pageResAutres} total={totalAutres} onChange={setPageResAutres} />
        </div>
      )}
    </div>
  );
}
