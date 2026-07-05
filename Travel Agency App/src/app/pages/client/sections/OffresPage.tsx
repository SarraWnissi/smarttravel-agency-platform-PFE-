import React from "react";
import { Search, Plane, MapPin, Clock, Calendar } from "lucide-react";
import { ImageWithFallback } from "../../../components/common/ImageWithFallback";
import { ClientPagination, CLIENT_PAGE_SIZE, prixOffreLeMoinsCher } from "../shared";
import { matchSearch } from "../../../../utils/search";

interface OffresPageProps {
  searchOffres: string;
  setSearchOffres: (v: string) => void;
  enrichedOffres: any[];
  pageOffres: number;
  setPageOffres: (p: number) => void;
  openResModal: (offre: any, svc?: any) => void;
}

export function OffresPage({ searchOffres, setSearchOffres, enrichedOffres, pageOffres, setPageOffres, openResModal }: OffresPageProps) {
  const q = searchOffres.trim();
  const filteredOffres = q
    ? enrichedOffres.filter((o) =>
        matchSearch(o.titre, q) ||
        matchSearch(o.service?.titre, q) ||
        matchSearch(o.service?.localisation, q) ||
        matchSearch(o.descriptionCourte, q) ||
        matchSearch(o.typeBadge?.label, q)
      )
    : enrichedOffres;
  const totalPagesOffres = Math.max(1, Math.ceil(filteredOffres.length / CLIENT_PAGE_SIZE));
  const pagedOffres = filteredOffres.slice((pageOffres - 1) * CLIENT_PAGE_SIZE, pageOffres * CLIENT_PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[#0a1628]" style={{ fontWeight: 700, fontSize: "1.1rem" }}>Offres promotionnelles</h3>
          <p className="text-gray-400 text-xs mt-0.5">
            {filteredOffres.length} offre(s){q ? " trouvée(s)" : ""} — Prix réduits sur nos services partenaires
          </p>
        </div>
        {/* Search */}
        <div className="relative w-full sm:w-64 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher une offre…"
            value={searchOffres}
            onChange={(e) => { setSearchOffres(e.target.value); setPageOffres(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {filteredOffres.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <Plane className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400">{q ? `Aucun résultat pour « ${q} »` : "Aucune offre promotionnelle disponible pour le moment."}</p>
          {q && <button onClick={() => setSearchOffres("")} className="mt-3 text-blue-600 text-xs hover:underline">Effacer la recherche</button>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pagedOffres.map((o) => (
          <div key={o._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all flex flex-col">
            {/* Image */}
            <div className="relative h-44 overflow-hidden flex-shrink-0">
              <ImageWithFallback src={o.image} alt={o.titre} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${o.typeBadge.css} backdrop-blur-sm`}>
                  {o.typeBadge.icon} {o.typeBadge.label}
                </span>
                  {/* Promotion badge */}
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white backdrop-blur-sm flex items-center gap-1">
                  🏷️ Promotion
                </span>
              </div>
              {/* Urgency ribbon */}
              {o.daysLeft <= 14 && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                  🔥 Expire bientôt
                </div>
              )}
            </div>

            <div className="p-4 flex flex-col flex-1">
              <h4 className="text-[#0a1628] mb-1" style={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.3 }}>{o.titre ?? "Offre"}</h4>

              {/* Service linked indicator */}
              {o.service?.titre && (
                <p className="text-orange-500 text-xs mb-1.5 flex items-center gap-1 font-medium">
                  <span className="bg-orange-100 px-2 py-0.5 rounded-full">🔗 {o.service.titre}</span>
                </p>
              )}

              {o.service?.localisation && (
                <p className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3" /> {o.service.localisation}
                </p>
              )}

              {o.descriptionCourte && (
                <p className="text-gray-500 text-xs mb-3 line-clamp-2">{o.descriptionCourte}</p>
              )}

              {/* Service details */}
              <div className="flex flex-wrap gap-2 mb-3">
                {o.service?.duree && (
                  <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-lg">
                    <Clock className="h-3 w-3" /> {o.service.duree}
                  </span>
                )}
                {o.service?.categorie && (
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-lg">{o.service.categorie}</span>
                )}
              </div>

              {/* Validity countdown */}
              <div className="bg-gray-50 rounded-xl p-2.5 mb-4 flex items-center justify-between border border-gray-100">
                <div>
                  <p className="text-gray-400 text-xs">Valable jusqu'au</p>
                  <p className="text-gray-700 text-xs" style={{ fontWeight: 600 }}>
                    {o.validUntil.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
                <span className={`text-sm font-bold ${o.urgency}`}>
                  {o.daysLeft}j
                </span>
              </div>

              {/* Price + CTA */}
              <div className="flex items-center justify-between mt-auto">
                <div>
                  <p className="text-gray-400 text-xs">À partir de</p>
                  <p className="text-blue-600 text-xl" style={{ fontWeight: 800 }}>{prixOffreLeMoinsCher(o).toLocaleString("fr-FR")} <span className="text-sm">TND</span></p>
                </div>
                <button
                  onClick={() => openResModal(o)}
                  className="bg-[#0a1628] text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                  style={{ fontWeight: 600 }}
                >
                  <Calendar className="h-4 w-4" /> Réserver
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ClientPagination page={pageOffres} total={totalPagesOffres} onChange={setPageOffres} />
    </div>
  );
}
