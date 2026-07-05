import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import {
  Star, MapPin, Phone, Globe, Users, Bed, Eye,
  ChevronLeft, ChevronRight, Calendar, Wifi, Coffee, X
} from "lucide-react";
import { hebergementsAPI, avisAPI } from "../../../services/api";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";
import { useLanguage } from "../../contexts/LanguageContext";
import { calculerTarif, repartirSurChambres, AGE_GRATUIT } from "../../../utils/pricing";

const FORMULE_LABELS: Record<string, string> = {
  ALL_INCLUSIVE: "All Inclusive",
  DEMI_PENSION: "Demi-pension",
  PRIX_SPECIAL: "Prix spécial",
  LOGEMENT_SEUL: "Logement seul",
};

const FORMULE_COLORS: Record<string, string> = {
  ALL_INCLUSIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DEMI_PENSION: "bg-blue-100 text-blue-700 border-blue-200",
  PRIX_SPECIAL: "bg-orange-100 text-orange-700 border-orange-200",
  LOGEMENT_SEUL: "bg-gray-100 text-gray-600 border-gray-200",
};

const VUE_LABELS: Record<string, string> = {
  MER: "Vue mer",
  JARDIN: "Vue jardin",
  PISCINE: "Vue piscine",
  VILLE: "Vue ville",
  MONTAGNE: "Vue montagne",
  AUCUNE: "",
};

const HOTEL_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200",
];

// --- Carousel simple ---
function Carousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  const total = images.length;
  if (total === 0) return null;

  return (
    <div className="relative h-80 md:h-[450px] overflow-hidden rounded-2xl shadow-lg">
      <ImageWithFallback
        src={images[idx]}
        alt={`photo ${idx + 1}`}
        className="w-full h-full object-cover transition-all duration-500"
      />
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      {total > 1 && (
        <>
          <button
            onClick={() => setIdx((idx - 1 + total) % total)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={() => setIdx((idx + 1) % total)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>
          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white w-5" : "bg-white/50"}`}
              />
            ))}
          </div>
          {/* Compteur */}
          <span className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {idx + 1} / {total}
          </span>
        </>
      )}

      {/* Thumbnails */}
      {total > 1 && (
        <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-3 overflow-x-auto">
          {images.slice(0, 6).map((img, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`shrink-0 h-14 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                i === idx ? "border-white shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Carte OpenStreetMap (iframe, aucune dépendance) ---
function HotelMap({ lat, lng, titre }: { lat: number; lng: number; titre: string }) {
  const delta = 0.015;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <iframe
      title={titre}
      src={src}
      width="100%"
      height="256"
      style={{ border: 0, borderRadius: "0.75rem" }}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

export function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const [hotel, setHotel] = useState<any>(null);
  const [chambres, setChambres] = useState<any[]>([]);
  const [avis, setAvis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateDebut, setDateDebut] = useState(searchParams.get("dateDebut") || "");
  const [dateFin, setDateFin] = useState(searchParams.get("dateFin") || "");
  const [nbPersonnes, setNbPersonnes] = useState(Number(searchParams.get("nbPersonnes")) || 2); // adultes
  const [agesEnfants, setAgesEnfants] = useState<number[]>(() => {
    const raw = searchParams.get("agesEnfants");
    return raw ? raw.split(",").map(Number).filter(n => !isNaN(n)) : [];
  });
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  // Visionneuse d'images de chambre (lightbox)
  const [roomViewer, setRoomViewer] = useState<{ images: string[]; index: number; titre: string } | null>(null);

  const nbEnfants = agesEnfants.length;
  const setNbEnfants = (n: number) =>
    setAgesEnfants(prev => {
      const next = [...prev];
      while (next.length < n) next.push(5);
      next.length = Math.max(0, n);
      setAvailabilityChecked(false);
      return next;
    });
  const setAgeEnfant = (idx: number, age: number) =>
    setAgesEnfants(prev => prev.map((a, i) => (i === idx ? age : a)));

  useEffect(() => {
    if (!id) return;

    Promise.all([
      hebergementsAPI.getById(id),
      hebergementsAPI.getChambres(id),
    ])
      .then(([h, ch]) => {
        setHotel(h.hebergement || h);
        setChambres(ch);
      })
      .catch(() => setError(t("hotel_not_found")))
      .finally(() => setLoading(false));
  }, [id]);

  // Vérifie automatiquement la disponibilité si des dates sont fournies via l'URL (depuis la recherche)
  useEffect(() => {
    if (!loading && hotel && dateDebut && dateFin && !availabilityChecked && !checkingAvail) {
      handleCheckAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hotel]);

  const handleCheckAvailability = async () => {
    if (!dateDebut || !dateFin || !id) return;
    setCheckingAvail(true);
    setAvailabilityChecked(false);
    try {
      // On ne filtre PAS par capacité ici : on veut toutes les chambres libres
      // sur la période, afin de pouvoir en combiner plusieurs pour un groupe.
      const params = new URLSearchParams({ dateDebut, dateFin });
      const data = await hebergementsAPI.getDisponibilite(id, params.toString());
      setChambres(data);
      setSelectedRoomIds([]);
      setAvailabilityChecked(true);
    } catch {
      // garder les chambres existantes
    } finally {
      setCheckingAvail(false);
    }
  };

  const totalOccupants = nbPersonnes + nbEnfants;

  const toggleRoom = (roomId: string) =>
    setSelectedRoomIds(prev =>
      prev.includes(roomId) ? prev.filter(x => x !== roomId) : [...prev, roomId]
    );

  // Réserve l'ensemble des chambres sélectionnées : répartit les voyageurs
  // puis encode chaque chambre (id:adultes:agesCSV) pour la page de réservation.
  const handleReserverSelection = (rooms: any[], repartition: ReturnType<typeof repartirSurChambres>) => {
    const roomsParam = repartition.affectations
      .map(a => `${a.chambre._id}:${a.nbAdultes}:${a.agesEnfants.join(".")}`)
      .join(",");
    const params = new URLSearchParams({
      rooms: roomsParam,
      hebergementID: id || "",
      dateDebut,
      dateFin,
      formule: rooms[0]?.formule || "LOGEMENT_SEUL",
    });
    navigate(`/booking?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-80 bg-gray-200 rounded-2xl mb-8" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-lg">{error || t("hotel_not_found")}</p>
        <button onClick={() => navigate("/hotels")} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl">
          {t("hotel_back")}
        </button>
      </div>
    );
  }

  const images = hotel.images?.length > 0 ? hotel.images : HOTEL_FALLBACK_IMAGES;
  const hasCoords = hotel.coordonnees?.lat && hotel.coordonnees?.lng;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate("/hotels")}
        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> {t("hotel_back")}
      </button>

      {/* Carousel */}
      <Carousel images={images} />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info principale */}
        <div className="lg:col-span-2">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{hotel.titre}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: hotel.etoiles || 3 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                {hotel.notesMoyenne > 0 && (
                  <span className="text-sm font-medium text-gray-600">{hotel.notesMoyenne.toFixed(1)} / 5</span>
                )}
              </div>
            </div>
            {(hotel.prixMin ?? 0) > 0 && (
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600">
                  {hotel.prixMin.toLocaleString("fr-FR")} TND
                </span>
                <p className="text-xs text-gray-400">{t("hotel_from_night")}</p>
              </div>
            )}
          </div>

          {/* Localisation */}
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <MapPin className="h-4 w-4 text-blue-500" />
            <span>{hotel.adresse || hotel.localisation}</span>
          </div>

          {/* Contacts */}
          <div className="flex flex-wrap gap-4 mb-6">
            {hotel.telephone && (
              <a href={`tel:${hotel.telephone}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600">
                <Phone className="h-4 w-4" /> {hotel.telephone}
              </a>
            )}
            {hotel.siteWeb && (
              <a href={hotel.siteWeb} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600">
                <Globe className="h-4 w-4" /> {t("hotel_official_site")}
              </a>
            )}
          </div>

          {/* Description */}
          {hotel.description && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("hotel_about")}</h2>
              <p className="text-gray-600 leading-relaxed">{hotel.description}</p>
            </div>
          )}

          {/* Carte */}
          {hasCoords && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("hotel_location_label")}</h2>
              <HotelMap lat={hotel.coordonnees.lat} lng={hotel.coordonnees.lng} titre={hotel.titre} />
            </div>
          )}

          {/* Chambres (C-05) */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t("hotel_rooms_title")}</h2>

            {/* Sélection dates */}
            <div className="bg-blue-50 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t("hotel_checkin")}</label>
                <input
                  type="date"
                  value={dateDebut}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={e => {
                    setDateDebut(e.target.value);
                    setAvailabilityChecked(false);
                    // Réinitialiser dateFin si elle devient invalide
                    if (dateFin && e.target.value >= dateFin) setDateFin("");
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t("hotel_checkout")}</label>
                <input
                  type="date"
                  value={dateFin}
                  min={dateDebut ? (() => { const d = new Date(dateDebut); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })() : new Date().toISOString().split("T")[0]}
                  onChange={e => { setDateFin(e.target.value); setAvailabilityChecked(false); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Adultes</label>
                <input
                  type="number"
                  min={1}
                  value={nbPersonnes}
                  onChange={e => { setNbPersonnes(Number(e.target.value)); setAvailabilityChecked(false); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white w-20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Enfants</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={nbEnfants}
                  onChange={e => setNbEnfants(Math.max(0, Math.min(10, Number(e.target.value))))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white w-20"
                />
              </div>
              <button
                onClick={handleCheckAvailability}
                disabled={!dateDebut || !dateFin || checkingAvail}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  availabilityChecked
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                }`}
              >
                {checkingAvail ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {t("hotel_checking")}</>
                ) : availabilityChecked ? (
                  <><span>✓</span> {t("hotel_availability_checked")}</>
                ) : (
                  <><Calendar className="h-4 w-4" /> {t("hotel_check_avail")}</>
                )}
              </button>

              {/* Âge de chaque enfant */}
              {nbEnfants > 0 && (
                <div className="w-full mt-1">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Âge de chaque enfant</p>
                  <div className="flex flex-wrap gap-3">
                    {agesEnfants.map((age, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Enfant {i + 1}</span>
                        <select
                          value={age}
                          onChange={e => { setAgeEnfant(i, Number(e.target.value)); setAvailabilityChecked(false); }}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Array.from({ length: 18 }).map((_, a) => (
                            <option key={a} value={a}>{a} an{a > 1 ? "s" : ""}</option>
                          ))}
                        </select>
                        {age < AGE_GRATUIT && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Gratuit</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    👶 Les enfants de moins de {AGE_GRATUIT} ans séjournent gratuitement.
                  </p>
                </div>
              )}
            </div>

            {/* Liste chambres — sélection multiple pour les groupes */}
            {(() => {
              const nbNuits = dateDebut && dateFin
                ? Math.max(1, Math.ceil((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000))
                : null;
              const selectedRooms = chambres.filter((c: any) => selectedRoomIds.includes(c._id));
              const repartition = nbNuits && selectedRooms.length
                ? repartirSurChambres(selectedRooms, nbPersonnes, agesEnfants, nbNuits)
                : null;
              const capaciteSelectionnee = selectedRooms.reduce((s: number, c: any) => s + (c.capacite || 0), 0);
              const capaciteOk = capaciteSelectionnee >= totalOccupants;
              // Chaque chambre doit comporter au moins un adulte
              const adulteParChambreOk = !repartition || repartition.chambresSansAdulte === 0;
              const reservationOk = capaciteOk && adulteParChambreOk && selectedRooms.length > 0;

              return (
                <>
                  <div className="space-y-4">
                    {chambres.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-8">{t("hotel_no_rooms")}</p>
                    )}
                    {chambres.map((chambre: any) => {
                      const dispo = chambre.disponiblePeriode !== false;
                      const selected = selectedRoomIds.includes(chambre._id);
                      const selectable = !!dateDebut && !!dateFin && availabilityChecked && dispo;
                      const tarifSeul = nbNuits
                        ? calculerTarif(chambre.prixParNuit, nbPersonnes, agesEnfants, nbNuits)
                        : null;

                      return (
                        <div
                          key={chambre._id}
                          className={`border rounded-xl p-4 transition-all ${
                            selected ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50/40"
                            : dispo ? "border-gray-200 hover:border-blue-300 hover:shadow-md"
                            : "border-gray-100 bg-gray-50 opacity-60"
                          }`}
                        >
                          <div className="flex flex-wrap gap-4 items-start justify-between">
                            {/* Photo de la chambre (cliquable pour agrandir) */}
                            {(() => {
                              const roomImgs = (chambre.images || []).filter((u: any) => typeof u === "string" && u.startsWith("http") && !u.includes("localhost"));
                              return roomImgs.length > 0 ? (
                                <div className="relative flex-shrink-0">
                                  <img
                                    src={roomImgs[0]}
                                    alt={`${chambre.typeChambre} ${chambre.numeroChambre}`}
                                    onClick={() => setRoomViewer({ images: roomImgs, index: 0, titre: `${chambre.typeChambre} — Chambre ${chambre.numeroChambre}` })}
                                    title={`Voir les ${roomImgs.length} photo(s)`}
                                    className="w-32 h-24 rounded-lg object-cover border border-gray-100 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                  />
                                  {roomImgs.length > 1 && (
                                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                      📷 {roomImgs.length}
                                    </span>
                                  )}
                                </div>
                              ) : null;
                            })()}
                            {/* Infos chambre */}
                            <div className="flex-1 min-w-[200px]">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900">
                                  {chambre.typeChambre} — Chambre {chambre.numeroChambre}
                                </h3>
                                {chambre.formule && chambre.formule !== "LOGEMENT_SEUL" && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${FORMULE_COLORS[chambre.formule]}`}>
                                    {FORMULE_LABELS[chambre.formule]}
                                  </span>
                                )}
                                {!dispo && (
                                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">{t("unavailable")}</span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" /> {chambre.capacite} {t("hotel_guests_max")}
                                </span>
                                {chambre.vue && chambre.vue !== "AUCUNE" && (
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3.5 w-3.5" /> {VUE_LABELS[chambre.vue]}
                                  </span>
                                )}
                                {chambre.superficie && (
                                  <span className="flex items-center gap-1">
                                    <Bed className="h-3.5 w-3.5" /> {chambre.superficie} m²
                                  </span>
                                )}
                              </div>

                              {chambre.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{chambre.description}</p>
                              )}
                            </div>

                            {/* Prix + sélection */}
                            <div className="text-right shrink-0 min-w-[150px]">
                              <p className="text-xl font-bold text-blue-600">{chambre.prixParNuit.toLocaleString("fr-FR")} TND</p>
                              <p className="text-xs text-gray-400">/ adulte / {t("night")}</p>
                              {tarifSeul && selectable && (
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  ex. {tarifSeul.parNuit.toLocaleString("fr-FR")} TND/nuit pour ce groupe
                                </p>
                              )}

                              {/* Bouton de sélection avec états */}
                              {!dateDebut || !dateFin ? (
                                <div className="mt-3 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-xs text-center cursor-not-allowed border border-dashed border-gray-300">
                                  {t("hotel_choose_dates")}
                                </div>
                              ) : !availabilityChecked ? (
                                <div className="mt-3 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs text-center cursor-not-allowed border border-amber-200 font-medium">
                                  {t("hotel_check_first")}
                                </div>
                              ) : !dispo ? (
                                <div className="mt-3 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs text-center border border-red-200 font-medium">
                                  {t("hotel_unavail_dates")}
                                </div>
                              ) : (
                                <button
                                  onClick={() => toggleRoom(chambre._id)}
                                  className={`mt-3 w-full px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm ${
                                    selected
                                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                      : "bg-blue-600 text-white hover:bg-blue-700"
                                  }`}
                                >
                                  {selected ? "✓ Sélectionnée" : "Sélectionner"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Barre récapitulative de sélection (groupe) */}
                  {availabilityChecked && chambres.some((c: any) => c.disponiblePeriode !== false) && (
                    <div className="mt-5 bg-white border border-blue-200 rounded-2xl p-4 shadow-sm sticky bottom-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm">
                          <p className="font-semibold text-gray-800">
                            Voyageurs : {totalOccupants} ({nbPersonnes} adulte{nbPersonnes > 1 ? "s" : ""}
                            {nbEnfants > 0 ? ` + ${nbEnfants} enfant${nbEnfants > 1 ? "s" : ""}` : ""})
                          </p>
                          <p className={`text-xs mt-0.5 ${capaciteOk ? "text-emerald-600" : "text-amber-600"}`}>
                            Capacité sélectionnée : {capaciteSelectionnee} / {totalOccupants} personnes
                            {selectedRooms.length > 0 && ` · ${selectedRooms.length} chambre${selectedRooms.length > 1 ? "s" : ""}`}
                            {!capaciteOk && selectedRooms.length > 0 && " — ajoutez une autre chambre"}
                          </p>
                          {capaciteOk && !adulteParChambreOk && (
                            <p className="text-xs mt-0.5 text-amber-600">
                              ⚠️ Chaque chambre doit comporter au moins un adulte (ajoutez un adulte ou réduisez le nombre de chambres).
                            </p>
                          )}
                          {repartition && reservationOk && (
                            <p className="text-sm font-bold text-gray-900 mt-1">
                              Total : {repartition.total.toLocaleString("fr-FR")} TND
                              <span className="text-xs font-normal text-gray-400"> ({nbNuits} {nbNuits! > 1 ? t("nights") : t("night")})</span>
                            </p>
                          )}
                        </div>
                        <button
                          disabled={!reservationOk}
                          onClick={() => handleReserverSelection(selectedRooms, repartition!)}
                          className="px-6 py-2.5 rounded-xl text-sm font-bold transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                          Réserver {selectedRooms.length > 1 ? `${selectedRooms.length} chambres` : "→"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Récapitulatif rapide */}
          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-3">Informations</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium text-gray-800">{hotel.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Étoiles</dt>
                <dd className="font-medium text-gray-800">{"⭐".repeat(hotel.etoiles || 3)}</dd>
              </div>
              {hotel.nombreChambres > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Chambres</dt>
                  <dd className="font-medium text-gray-800">{hotel.nombreChambres}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Aménités simulées */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Équipements</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                { icon: Wifi, label: "Wi-Fi gratuit" },
                { icon: Coffee, label: "Petit-déjeuner" },
                { icon: Users, label: "Salle de conférence" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-blue-500" /> {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Visionneuse photos de chambre (lightbox) ── */}
      {roomViewer && (
        <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setRoomViewer(null)}>
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <span className="text-white/70 text-sm">{roomViewer.index + 1} / {roomViewer.images.length}</span>
            <button onClick={() => setRoomViewer(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-white font-semibold mb-3">{roomViewer.titre}</p>
          <div className="relative max-w-4xl w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {roomViewer.images.length > 1 && (
              <button onClick={() => setRoomViewer(v => v && { ...v, index: (v.index - 1 + v.images.length) % v.images.length })}
                className="absolute left-2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2">
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <img src={roomViewer.images[roomViewer.index]} alt={roomViewer.titre} className="max-h-[78vh] max-w-full rounded-xl object-contain" />
            {roomViewer.images.length > 1 && (
              <button onClick={() => setRoomViewer(v => v && { ...v, index: (v.index + 1) % v.images.length })}
                className="absolute right-2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2">
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>
          {roomViewer.images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto max-w-full pb-1" onClick={e => e.stopPropagation()}>
              {roomViewer.images.map((src, i) => (
                <img key={i} src={src} onClick={() => setRoomViewer(v => v && { ...v, index: i })}
                  className={`w-16 h-12 rounded-md object-cover cursor-pointer flex-shrink-0 border-2 transition-all ${i === roomViewer.index ? "border-blue-400" : "border-transparent opacity-50 hover:opacity-100"}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

