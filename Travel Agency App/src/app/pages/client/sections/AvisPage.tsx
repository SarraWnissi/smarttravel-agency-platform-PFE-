import React from "react";
import { Star, MessageSquare, Trash2, Clock } from "lucide-react";
import { ClientPagination, CLIENT_PAGE_SIZE } from "../shared";

type Page = "dashboard" | "reservations" | "offres" | "hotels" | "services" | "factures" | "avis" | "preferences" | "ia" | "profil" | "parametres";

interface AvisPageProps {
  reservations: any[];
  pageAvis: number;
  setPageAvis: (p: number) => void;
  getAvisForReservation: (id: string) => any;
  isTripEnded: (r: any) => boolean;
  openAvisModal: (r: any) => void;
  handleDeleteAvis: (id: string) => void;
  setActivePage: (p: Page) => void;
}

export function AvisPage({ reservations, pageAvis, setPageAvis, getAvisForReservation, isTripEnded, openAvisModal, handleDeleteAvis, setActivePage }: AvisPageProps) {
  const eligibleRes = reservations.filter(
    (r) => r.rawStatut === "CONFIRMEE" || r.rawStatut === "EXPIREE"
  );
  const totalPagesAvis = Math.max(1, Math.ceil(eligibleRes.length / CLIENT_PAGE_SIZE));
  const pagedAvis = eligibleRes.slice((pageAvis - 1) * CLIENT_PAGE_SIZE, pageAvis * CLIENT_PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[#0a1628]" style={{ fontWeight: 700, fontSize: "1.1rem" }}>Mes avis</h3>
        <p className="text-gray-400 text-xs mt-0.5">Partagez votre expérience pour chaque voyage confirmé</p>
      </div>

      {eligibleRes.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <Star className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400">Aucun voyage confirmé pour le moment.</p>
          <button onClick={() => setActivePage("offres")} className="mt-4 text-blue-600 text-sm hover:underline">
            Explorer les offres →
          </button>
        </div>
      )}

      {pagedAvis.map((res) => {
        const existingAvis = getAvisForReservation(res.rawId);
        const ended = isTripEnded(res);
        return (
          <div key={res.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex">
              <div className="w-28 flex-shrink-0">
                <img src={res.image} alt={res.destination} className="w-full h-full object-cover" style={{ minHeight: "110px" }} />
              </div>
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <h4 className="text-[#0a1628] text-sm" style={{ fontWeight: 600 }}>{res.destination}</h4>
                    <p className="text-gray-400 text-xs">{res.type} · {res.dateDepart} → {res.dateRetour}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${res.rawStatut === "CONFIRMEE" ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {res.rawStatut === "CONFIRMEE" ? "Confirmée" : "Terminée"}
                  </span>
                </div>

                {existingAvis ? (
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} className={`h-4 w-4 ${i <= existingAvis.note ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                        ))}
                      </div>
                      <button
                        onClick={() => handleDeleteAvis(existingAvis._id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Supprimer l'avis"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-gray-600 text-sm italic">"{existingAvis.commentaire || "—"}"</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Publié le {existingAvis.dateAvis ? new Date(existingAvis.dateAvis).toLocaleDateString("fr-FR") : "—"}
                    </p>
                  </div>
                ) : ended ? (
                  <button
                    onClick={() => openAvisModal(res)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" /> Laisser un avis
                  </button>
                ) : (
                  <p className="text-gray-400 text-xs flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Disponible après votre retour le {res.dateRetour}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <ClientPagination page={pageAvis} total={totalPagesAvis} onChange={setPageAvis} />
    </div>
  );
}
