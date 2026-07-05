import React from "react";
import { Search, MapPin, Clock, Calendar, Star, Package, ShieldCheck } from "lucide-react";
import { ClientPagination, SVC_PAGE_SIZE, prixOffreLeMoinsCher } from "../shared";
import { ImageWithFallback } from "../../../components/common/ImageWithFallback";
import { matchSearch } from "../../../../utils/search";

interface ServicesPageProps {
  searchServices: string;
  setSearchServices: (v: string) => void;
  services: any[];
  offres: any[];
  hebergements: any[];
  pageHebSvc: number;
  setPageHebSvc: (p: number) => void;
  pageDestSvc: number;
  setPageDestSvc: (p: number) => void;
  pageActSvc: number;
  setPageActSvc: (p: number) => void;
  openResModal: (offre: any, svc?: any) => void;
}

export function ServicesPage({
  searchServices, setSearchServices, services, offres, hebergements,
  pageHebSvc, setPageHebSvc, pageDestSvc, setPageDestSvc, pageActSvc, setPageActSvc,
  openResModal,
}: ServicesPageProps) {
  const q = searchServices.trim();
  const filteredServices = q
    ? services.filter((s: any) =>
        matchSearch(s.titre, q) ||
        matchSearch(s.description, q) ||
        matchSearch(s.localisation, q)
      )
    : services;
  const hebServices  = filteredServices.filter((s: any) => s.typeService === "HEBERGEMENT");
  const destServices = filteredServices.filter((s: any) => s.typeService === "DESTINATION");
  const actServices  = filteredServices.filter((s: any) => s.typeService === "ACTIVITE");

  const totalHeb  = Math.max(1, Math.ceil(hebServices.length  / SVC_PAGE_SIZE));
  const totalDest = Math.max(1, Math.ceil(destServices.length / SVC_PAGE_SIZE));
  const totalAct  = Math.max(1, Math.ceil(actServices.length  / SVC_PAGE_SIZE));
  const pagedHeb  = hebServices.slice ((pageHebSvc  - 1) * SVC_PAGE_SIZE, pageHebSvc  * SVC_PAGE_SIZE);
  const pagedDest = destServices.slice((pageDestSvc - 1) * SVC_PAGE_SIZE, pageDestSvc * SVC_PAGE_SIZE);
  const pagedAct  = actServices.slice ((pageActSvc  - 1) * SVC_PAGE_SIZE, pageActSvc  * SVC_PAGE_SIZE);

  const SvcCard = ({ s }: { s: any }) => {
    const svcOffres = offres.filter((o: any) => String(o.serviceID?._id ?? o.serviceID ?? "") === String(s._id));
    const hasPromo = svcOffres.length > 0;
    const linkedHeb = s.typeService === "HEBERGEMENT"
      ? hebergements.find((h: any) => String(h.serviceID?._id ?? h.serviceID) === String(s._id))
      : null;
    // Image de la carte : hôtel lié (HEBERGEMENT) sinon images propres du service
    // (DESTINATION/ACTIVITE) — sans cela, les destinations n'affichaient aucune image.
    const hotelImage = linkedHeb?.images?.[0] ?? s.images?.[0] ?? null;
    const mapAddress = encodeURIComponent(s.adresse || s.localisation || s.titre || "");
    return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col ${hasPromo ? "border-orange-200" : "border-gray-100"}`}>

      {/* Photo de l'hôtel / service */}
      <div className="h-48 overflow-hidden flex-shrink-0 relative bg-gradient-to-br from-blue-50 to-gray-100">
        {hotelImage ? (
          <ImageWithFallback
            src={hotelImage}
            alt={s.titre}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {s.typeService === "HEBERGEMENT" && <span className="text-6xl opacity-30">🏨</span>}
            {s.typeService === "DESTINATION" && <span className="text-6xl opacity-30">✈️</span>}
            {s.typeService === "ACTIVITE"    && <span className="text-6xl opacity-30">🧭</span>}
          </div>
        )}
        {/* Lien carte en icône — coin supérieur droit */}
        {mapAddress && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Voir sur Google Maps"
            className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center transition-colors"
          >
            <MapPin className="h-4 w-4 text-blue-600" />
          </a>
        )}
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
      {/* Badge type + promo + price */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          {s.typeService === "HEBERGEMENT" && <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium self-start">🏨 Hébergement</span>}
          {s.typeService === "DESTINATION" && <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-medium self-start">✈️ Destination</span>}
          {s.typeService === "ACTIVITE"    && <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium self-start">🧭 Activité</span>}
          {hasPromo && (
            <span className="bg-orange-100 text-orange-600 text-xs px-2.5 py-1 rounded-full font-medium self-start flex items-center gap-1">
              🏷️ Offres promo disponibles
            </span>
          )}
        </div>
        {s.prixBase > 0 && <span className="text-blue-600 font-bold text-sm flex-shrink-0">{Number(s.prixBase).toLocaleString("fr-FR")} <span className="text-xs font-normal">{s.devise ?? "TND"}</span></span>}
      </div>

      <div>
        <h4 className="text-[#0a1628] font-bold text-base">{s.titre}</h4>
        {s.description && <p className="text-gray-500 text-xs mt-1 line-clamp-2">{s.description}</p>}
      </div>

      {s.localisation && (
        <p className="text-gray-400 text-xs flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-blue-400" /> {s.localisation}
        </p>
      )}

      {/* Attributs spécifiques HEBERGEMENT */}
      {s.typeService === "HEBERGEMENT" && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
          {s.nbChambres != null && <span className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-lg"><Package className="h-3 w-3" />{s.nbChambres} chambres</span>}
          {s.adresse && <span className="flex items-center gap-1 bg-gray-50 text-gray-500 text-xs px-2 py-1 rounded-lg"><MapPin className="h-3 w-3" />{s.adresse}</span>}
          {s.categorie && <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-lg">{s.categorie}</span>}
        </div>
      )}

      {/* Attributs spécifiques DESTINATION */}
      {s.typeService === "DESTINATION" && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
          {s.typeDestination && <span className="bg-purple-50 text-purple-600 text-xs px-2 py-1 rounded-lg">{s.typeDestination}</span>}
          {s.avis != null && <span className="flex items-center gap-1 bg-yellow-50 text-yellow-600 text-xs px-2 py-1 rounded-lg"><Star className="h-3 w-3 fill-yellow-400" />{s.avis} / 5</span>}
          {s.categorie && <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-lg">{s.categorie}</span>}
        </div>
      )}

      {/* Attributs spécifiques ACTIVITE */}
      {s.typeService === "ACTIVITE" && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
          {s.typeActivite && <span className="bg-green-50 text-green-600 text-xs px-2 py-1 rounded-lg">{s.typeActivite}</span>}
          {s.duree && <span className="flex items-center gap-1 bg-gray-50 text-gray-500 text-xs px-2 py-1 rounded-lg"><Clock className="h-3 w-3" />{s.duree}</span>}
          {s.categorie && <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-lg">{s.categorie}</span>}
        </div>
      )}

      {/* Footer : offres liées au service ou réservation directe */}
      <div className="pt-2 border-t border-gray-100 mt-auto space-y-2">
        {svcOffres.length > 0 ? (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">🏷️ Offres disponibles ({svcOffres.length})</p>
            {svcOffres.map((o: any) => (
              <div key={o._id} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{o.titre}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {o.prixAPartirDe != null && (
                      <span className="text-xs text-orange-600 font-bold">À partir de {prixOffreLeMoinsCher({ ...o, service: s }).toLocaleString("fr-FR")} TND</span>
                    )}
                    {o.dateDebut && o.dateFin && (
                      <span className="text-xs text-gray-400">
                        {new Date(o.dateDebut).toLocaleDateString("fr-FR")} – {new Date(o.dateFin).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                  {o.descriptionCourte && <p className="text-xs text-gray-400 truncate mt-0.5">{o.descriptionCourte}</p>}
                </div>
                <button
                  onClick={() => openResModal(o, s)}
                  className="flex-shrink-0 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  style={{ fontWeight: 600 }}
                >
                  <Calendar className="h-3 w-3" /> Réserver
                </button>
              </div>
            ))}
          </>
        ) : (
          <button
            onClick={() => openResModal(null, s)}
            className="w-full bg-[#0a1628] text-white py-2 rounded-xl text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            style={{ fontWeight: 600 }}
          >
            <Calendar className="h-4 w-4" /> Réserver
          </button>
        )}
      </div>
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header + Recherche */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[#0a1628] font-bold text-lg">Nos services</h3>
          <p className="text-gray-400 text-xs mt-0.5">
            {filteredServices.length} service(s){q ? " trouvé(s)" : " disponible(s)"}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un service…"
            value={searchServices}
            onChange={(e) => {
              setSearchServices(e.target.value);
              setPageHebSvc(1); setPageDestSvc(1); setPageActSvc(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {filteredServices.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <ShieldCheck className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400">{q ? `Aucun service trouvé pour « ${q} ».` : "Aucun service disponible pour le moment."}</p>
        </div>
      )}

      {/* HÉBERGEMENTS */}
      {hebServices.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-5 bg-blue-600 rounded-full" />
            <h4 className="text-[#0a1628] font-semibold text-sm">🏨 Hébergements</h4>
            <span className="text-gray-400 text-xs">({hebServices.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedHeb.map((s: any) => <div key={s._id}><SvcCard s={s} /></div>)}
          </div>
          <ClientPagination page={pageHebSvc} total={totalHeb} onChange={setPageHebSvc} />
        </div>
      )}

      {/* DESTINATIONS */}
      {destServices.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-5 bg-purple-600 rounded-full" />
            <h4 className="text-[#0a1628] font-semibold text-sm">✈️ Destinations</h4>
            <span className="text-gray-400 text-xs">({destServices.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedDest.map((s: any) => <div key={s._id}><SvcCard s={s} /></div>)}
          </div>
          <ClientPagination page={pageDestSvc} total={totalDest} onChange={setPageDestSvc} />
        </div>
      )}

      {/* ACTIVITÉS */}
      {actServices.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-5 bg-green-600 rounded-full" />
            <h4 className="text-[#0a1628] font-semibold text-sm">🧭 Activités</h4>
            <span className="text-gray-400 text-xs">({actServices.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedAct.map((s: any) => <div key={s._id}><SvcCard s={s} /></div>)}
          </div>
          <ClientPagination page={pageActSvc} total={totalAct} onChange={setPageActSvc} />
        </div>
      )}
    </div>
  );
}
