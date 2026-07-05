import React, { useState, useEffect } from "react";
import {
  Search, MapPin, Map, Star, Heart, Calendar, Users, X,
  CreditCard, Lock, Filter, Images, ChevronLeft, ChevronRight,
  Bed, Check, BedDouble, Gift, Sparkles, Phone, Mail,
  User as UserIcon, ArrowRight, Trophy, Percent, PartyPopper,
} from "lucide-react";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";
import { offresAPI, hebergementsAPI, chambresAPI, proxyImage } from "../../../services/api";
import { matchSearchTokens } from "../../../utils/search";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router";
import { getImageForLocation } from "./Home";
import { calculerTarif, AGE_GRATUIT } from "../../../utils/pricing";

import { validatePassport } from "../../../utils/format";
// ── Types ──────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: string; css: string }> = {
  HEBERGEMENT: { label: "Hôtel",       icon: "🏨", css: "bg-blue-100 text-blue-700" },
  ACTIVITE:    { label: "Excursion",   icon: "🧭", css: "bg-green-100 text-green-700" },
  DESTINATION: { label: "International", icon: "✈️", css: "bg-purple-100 text-purple-700" },
};

const ROOM_TYPE_IMAGES: Record<string, string> = {
  SINGLE:    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop",
  DOUBLE:    "https://images.unsplash.com/photo-1631049421450-348ccd8ee171?w=800&auto=format&fit=crop",
  TWIN:      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&auto=format&fit=crop",
  SUITE:     "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop",
  FAMILIALE: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&auto=format&fit=crop",
  DELUXE:    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop",
};

const FORMULE_LABELS: Record<string, string> = {
  ALL_INCLUSIVE: "All Inclusive",
  DEMI_PENSION:  "Demi-pension",
  PRIX_SPECIAL:  "Prix spécial",
  LOGEMENT_SEUL: "Logement seul",
};

const HOTEL_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1549294413-26f195200c16?w=800&auto=format&fit=crop",
];

function getTypeConfig(t?: string) {
  return TYPE_CONFIG[t ?? ""] ?? TYPE_CONFIG.DESTINATION;
}

function getRoomImage(chambre: any): string {
  if (chambre.images && chambre.images.length > 0) return chambre.images[0];
  return ROOM_TYPE_IMAGES[chambre.typeChambre] ?? ROOM_TYPE_IMAGES.DOUBLE;
}

function getHotelImage(heb: any, index = 0): string {
  if (heb?.images && heb.images.length > 0) return heb.images[0];
  return HOTEL_FALLBACK_IMAGES[index % HOTEL_FALLBACK_IMAGES.length];
}

// ── Favoris ───────────────────────────────────────────────────────────────
function loadFavorites(): Set<string> {
  try { return new Set<string>(JSON.parse(localStorage.getItem("st_favorites") ?? "[]")); }
  catch { return new Set(); }
}
function saveFavorites(s: Set<string>) {
  localStorage.setItem("st_favorites", JSON.stringify([...s]));
  window.dispatchEvent(new Event("st_favorites_changed"));
}

// ── Gallery modal ─────────────────────────────────────────────────────────
function GalleryModal({ images, title, onClose }: { images: string[]; title: string; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const total = images.length;
  const prev = () => setIdx(i => (i - 1 + total) % total);
  const next = () => setIdx(i => (i + 1) % total);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-white font-semibold truncate">{title}</p>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">{idx + 1} / {total}</span>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* Image principale */}
        <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
          <img src={proxyImage(images[idx])} alt={`photo ${idx + 1}`} className="w-full h-full object-contain" />
          {total > 1 && (
            <>
              <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
        {/* Thumbnails */}
        {total > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  i === idx ? "border-blue-400" : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                <img src={proxyImage(img)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────
export function Offers() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Données
  const [offers, setOffers] = useState<any[]>([]);
  const [rawOffres, setRawOffres] = useState<any[]>([]);
  const [hebergementMap, setHebergementMap] = useState<Record<string, any>>({}); // offreId → hebergement
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [typeFilter, setTypeFilter] = useState("all");
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Modals
  const [mapOffer, setMapOffer] = useState<any | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[] | null>(null);
  const [galleryTitle, setGalleryTitle] = useState("");

  // Booking multi-étapes
  const [bookingOffer, setBookingOffer] = useState<any | null>(null);
  const [bookingStep, setBookingStep] = useState<"rooms" | "form">("form");
  const [currentHeb, setCurrentHeb] = useState<any | null>(null);
  const [chambres, setChambres] = useState<any[]>([]);
  const [loadingChambres, setLoadingChambres] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [bookForm, setBookForm] = useState({ dateDebut: "", dateFin: "", nbPersonnes: "1", numPassport: "", agesEnfants: [] as number[] });
  const [bookError, setBookError] = useState("");
  const [passportTouched, setPassportTouched] = useState(false);
  const [showAuthChoice, setShowAuthChoice] = useState(false);

  // Guest checkout + discount
  const [checkoutStage, setCheckoutStage] = useState<"form" | "discount-choice" | "guest-form" | "success">("form");
  const [guestForm, setGuestForm] = useState({ prenom: "", nom: "", email: "", telephone: "" });
  const [guestError, setGuestError] = useState("");
  const [submittingGuest, setSubmittingGuest] = useState(false);
  const [guestReservation, setGuestReservation] = useState<any>(null);

  // URL params
  const [prefilledDate, setPrefilledDate] = useState("");
  const [prefilledPersonnes, setPrefilledPersonnes] = useState("1");

  // ── Chargement ──
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [offresData, hebs] = await Promise.all([
          offresAPI.getAll(),
          hebergementsAPI.getAll(),
        ]);

        setRawOffres(offresData);

        // Construire la map offreId → hebergement
        const map: Record<string, any> = {};
        for (const o of offresData) {
          if (o.serviceID?.typeService === "HEBERGEMENT") {
            const heb = hebs.find((h: any) => String(h.serviceID) === String(o.serviceID?._id));
            if (heb) map[o._id] = heb;
          }
        }
        setHebergementMap(map);

        // Construire les cartes avec les vraies images
        setOffers(offresData.map((o: any, idx: number) => {
          const heb = map[o._id];
          const typeService: string = o.serviceID?.typeService ?? "DESTINATION";
          const localisation: string = o.serviceID?.localisation ?? o.serviceID?.titre ?? "";
          const svcImages: string[] = o.serviceID?.images ?? [];
          const image = heb
            ? getHotelImage(heb, idx)
            : (svcImages[0] ?? getImageForLocation(localisation, idx));
          return {
            id: o._id,
            image,
            images: heb?.images ?? svcImages,
            title: o.titre ?? "Offre sans titre",
            destination: o.serviceID?.localisation ?? o.serviceID?.titre ?? "Destination",
            price: `${o.prixAPartirDe?.toLocaleString("fr-FR") ?? "—"} TND`,
            priceNum: o.prixAPartirDe ?? 0,
            description: o.descriptionCourte ?? "",
            rating: 4.8,
            reviews: Math.floor(Math.random() * 400) + 100,
            typeService,
            hebergementId: heb?._id ?? null,
            includes: o.descriptionCourte
              ? o.descriptionCourte.split(/[,+·]/).slice(0, 3).map((s: string) => s.trim()).filter(Boolean)
              : ["Hébergement", "Transferts"],
          };
        }));
      } catch {
        setError("Impossible de charger les offres.");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  useEffect(() => {
    const dest   = searchParams.get("destination");
    const date   = searchParams.get("dateDepart");
    const pers   = searchParams.get("personnes");
    const favOnly = searchParams.get("favorites");
    if (dest)  setSearchTerm(dest);
    if (date)  setPrefilledDate(date);
    if (pers)  setPrefilledPersonnes(pers);
    if (favOnly === "true") setFavoritesOnly(true);
  }, [searchParams]);

  // ── Favoris ──
  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set<string>(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveFavorites(next);
      return next;
    });
  };

  // ── Galerie ──
  const openGallery = (images: string[], title: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!images || images.length === 0) return;
    setGalleryImages(images);
    setGalleryTitle(title);
  };

  // ── Ouvrir modal de réservation ──
  // ── Calcul prix avec réduction 10% membres ──
  const calcPrix = () => {
    const nbNuits = bookForm.dateDebut && bookForm.dateFin
      ? Math.max(1, Math.ceil((new Date(bookForm.dateFin).getTime() - new Date(bookForm.dateDebut).getTime()) / 86400000))
      : 1;
    const nbAdultes = parseInt(bookForm.nbPersonnes) || 1;
    // Tarif hôtel = PAR PERSONNE et par nuit (cohérent avec le backend) :
    // adultes plein tarif, enfants 5-12 demi-tarif, < 5 ans gratuits.
    // Forfait offre (international / excursion) = par personne : on facture les
    // adultes + les enfants de 5 ans et plus ; les moins de 5 ans sont gratuits.
    const enfantsPayants = bookForm.agesEnfants.filter(a => a >= AGE_GRATUIT).length;
    const base = selectedRoom
      ? calculerTarif(selectedRoom.prixParNuit ?? 0, nbAdultes, bookForm.agesEnfants, nbNuits).total
      : (bookingOffer?.priceNum ?? 0) * (nbAdultes + enfantsPayants);
    const remise = Math.round(base * 0.1);
    return { nbNuits, base, remise, final: isAuthenticated ? base - remise : base };
  };

  // ── Guest checkout (sans compte) ──
  const handleGuestCheckout = async () => {
    if (!guestForm.prenom.trim() || !guestForm.nom.trim() || !guestForm.email.trim()) {
      setGuestError("Prénom, nom et adresse e-mail sont obligatoires.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestForm.email.trim())) {
      setGuestError("L'adresse e-mail saisie n'est pas valide.");
      return;
    }
    // Téléphone tunisien : 8 chiffres (préfixe +216 / 216 optionnel).
    const telDigits = guestForm.telephone.trim().replace(/[\s\-().+]/g, "");
    if (guestForm.telephone.trim() && !/^(216)?[0-9]{8}$/.test(telDigits)) {
      setGuestError("Le numéro de téléphone doit contenir 8 chiffres (ex : 12 345 678).");
      return;
    }
    // Valider le passeport pour les offres INTERNATIONALE/EXCURSION sans chambre
    if (!selectedRoom) {
      const passportErr = validatePassport(bookForm.numPassport);
      if (passportErr) { setGuestError(passportErr); return; }
    }
    setSubmittingGuest(true);
    setGuestError("");
    try {
      const isHotel = !!selectedRoom;
      const type = bookingOffer?.typeService === "ACTIVITE" ? "EXCURSION" : "INTERNATIONALE";

      const body: any = {
        guestNom:       guestForm.nom.trim(),
        guestPrenom:    guestForm.prenom.trim(),
        guestEmail:     guestForm.email.trim(),
        guestTelephone: guestForm.telephone.trim(),
        nbPersonnes:    parseInt(bookForm.nbPersonnes) || 1,
      };

      if (isHotel) {
        // Réservation chambre d'hôtel
        body.chambreID        = selectedRoom._id;
        body.hebergementID    = currentHeb?._id;
        body.offreId          = bookingOffer?.id;
        body.dateDebutSejour  = bookForm.dateDebut;
        body.dateFinSejour    = bookForm.dateFin;
        body.formule          = selectedRoom?.formule ?? "LOGEMENT_SEUL";
        body.agesEnfants      = bookForm.agesEnfants;
      } else {
        // Réservation offre (excursion / internationale) — sans chambre.
        // Forfait par personne : enfants de moins de 5 ans gratuits → on facture
        // les adultes + enfants payants, et on conserve la liste des âges.
        const enfantsPayants = bookForm.agesEnfants.filter(a => a >= AGE_GRATUIT).length;
        body.offreId          = bookingOffer?.id;
        body.typeReservation  = type;
        body.dateDebutSejour  = bookForm.dateDebut;
        body.dateFinSejour    = bookForm.dateFin || undefined;
        body.nbPersonnes      = (parseInt(bookForm.nbPersonnes) || 1) + enfantsPayants;
        body.agesEnfants      = bookForm.agesEnfants;
        if (bookForm.numPassport?.trim())     body.numPassport     = bookForm.numPassport.trim();
      }

      const res = await fetch("http://localhost:3001/api/guest/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Erreur serveur");

      // Rediriger vers la page de paiement
      const reservation = data.reservation;
      const montant = reservation.montantTotal ?? 0;
      navigate(
        `/payment?reservationID=${reservation._id}&montant=${montant}` +
        `&guestEmail=${encodeURIComponent(guestForm.email.trim())}`
      );
    } catch (e: any) {
      setGuestError(e.message);
    } finally {
      setSubmittingGuest(false);
    }
  };

  const openBookingModal = async (offer: any) => {
    setBookingOffer(offer);
    setBookError("");
    setShowAuthChoice(false);
    setCheckoutStage("form");
    setGuestForm({ prenom: "", nom: "", email: "", telephone: "" });
    setGuestError("");
    setGuestReservation(null);
    setSelectedRoom(null);
    setPassportTouched(false);
    setBookError("");
    setBookForm({
      dateDebut: prefilledDate, dateFin: "",
      nbPersonnes: prefilledPersonnes, numPassport: "", agesEnfants: [],
    });

    if (offer.typeService === "HEBERGEMENT" && offer.hebergementId) {
      setBookingStep("rooms");
      setLoadingChambres(true);
      try {
        const [hebData, chambresData] = await Promise.all([
          hebergementsAPI.getById(offer.hebergementId),
          hebergementsAPI.getChambres(offer.hebergementId),
        ]);
        setCurrentHeb(hebData);
        setChambres(chambresData.filter((c: any) => c.disponible !== false));
      } catch {
        setChambres([]);
        setCurrentHeb(null);
      } finally {
        setLoadingChambres(false);
      }
    } else {
      setBookingStep("form");
      setCurrentHeb(null);
      setChambres([]);
    }
  };

  const selectRoom = (room: any) => {
    setSelectedRoom(room);
    // Respecter la capacité de la chambre : on borne adultes + enfants ≤ capacité
    // (SINGLE = 1, DOUBLE = 2, FAMILIALE = 4…). On repart d'1 adulte, sans enfant.
    const cap = Math.max(1, Number(room?.capacite) || 1);
    setBookForm((f) => ({ ...f, nbPersonnes: String(Math.min(Math.max(1, parseInt(f.nbPersonnes) || 1), cap)), agesEnfants: [] }));
    setBookingStep("form");
  };

  // ── Confirmer la réservation ──
  const savePendingAndGo = (path: string, remise = 0) => {
    const pending = selectedRoom
      ? {
          typeReservation: "HOTEL",
          chambreID: selectedRoom._id,
          hebergementID: currentHeb?._id,
          chambreInfo: selectedRoom,
          hebInfo: currentHeb,
          offreId: bookingOffer.id,
          offreTitre: bookingOffer.title,
          dateDebutSejour: bookForm.dateDebut,
          dateFinSejour: bookForm.dateFin,
          nbPersonnes: parseInt(bookForm.nbPersonnes) || 1,
          agesEnfants: bookForm.agesEnfants,
          remiseMembre: remise,
        }
      : {
          typeReservation: "INTERNATIONALE",
          offreId: bookingOffer.id,
          offreTitre: bookingOffer.title,
          dateDebut: bookForm.dateDebut,
          dateFin: bookForm.dateFin,
          // Forfait par personne : enfants de moins de 5 ans gratuits → on facture les payants.
          nbPersonnes: (parseInt(bookForm.nbPersonnes) || 1) + bookForm.agesEnfants.filter(a => a >= AGE_GRATUIT).length,
          agesEnfants: bookForm.agesEnfants,
          numPassport: bookForm.numPassport.trim(),
          remiseMembre: remise,
        };
    localStorage.setItem("st_pending_reservation", JSON.stringify(pending));
    navigate(path);
  };

  const handleConfirmBooking = () => {
    setBookError("");
    setPassportTouched(true);
    if (!bookForm.dateDebut || !bookForm.dateFin) { setBookError("Les dates sont obligatoires."); return; }
    if (new Date(bookForm.dateFin) <= new Date(bookForm.dateDebut)) { setBookError("La date de retour doit être après la date de départ."); return; }
    if (!selectedRoom) {
      const passportErr = validatePassport(bookForm.numPassport);
      if (passportErr) { setBookError(passportErr); return; }
    }
    if (isAuthenticated) {
      const { remise } = calcPrix();
      savePendingAndGo("/client", remise);
    } else {
      setCheckoutStage("discount-choice");
    }
  };

  // ── Filtres ──
  const filtered = offers.filter(o => {
    const ms = !searchTerm || matchSearchTokens(`${o.title ?? ""} ${o.destination ?? ""}`, searchTerm);
    const mp = priceRange === "all" || (priceRange === "budget" && o.priceNum < 1000) || (priceRange === "mid" && o.priceNum >= 1000 && o.priceNum < 2000) || (priceRange === "luxury" && o.priceNum >= 2000);
    const mt = typeFilter === "all" || o.typeService === typeFilter || (typeFilter === "DESTINATION" && !["HEBERGEMENT","ACTIVITE"].includes(o.typeService));
    const mf = !favoritesOnly || favorites.has(o.id);
    return ms && mp && mt && mf;
  });
  const sorted = [...filtered].sort((a, b) =>
    sortBy === "price-low" ? a.priceNum - b.priceNum :
    sortBy === "price-high" ? b.priceNum - a.priceNum :
    sortBy === "rating" ? b.rating - a.rating : 0
  );

  const today = new Date().toISOString().split("T")[0];

  // ── Render ──
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl mb-4">Nos Offres de Voyage</h1>
          <p className="text-xl text-white/90">Découvrez nos meilleures offres de voyages et d'hébergements</p>
        </div>
      </section>

      {/* Filtres */}
      <section className="bg-white shadow-md sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="Rechercher une destination ou offre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={priceRange} onChange={e => setPriceRange(e.target.value)} className="px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Tous les prix</option>
              <option value="budget">Moins de 1 000 TND</option>
              <option value="mid">1 000 – 2 000 TND</option>
              <option value="luxury">Plus de 2 000 TND</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="popular">Plus populaires</option>
              <option value="price-low">Prix croissant</option>
              <option value="price-high">Prix décroissant</option>
              <option value="rating">Mieux notés</option>
            </select>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-gray-500 text-sm"><Filter className="h-4 w-4" /><span>Type :</span></div>
            {[{ value:"all", label:"Tous", icon:"🌍" },{ value:"DESTINATION", label:"International", icon:"✈️" },{ value:"HEBERGEMENT", label:"Hôtels", icon:"🏨" },{ value:"ACTIVITE", label:"Excursions", icon:"🧭" }].map(btn => (
              <button key={btn.value} onClick={() => setTypeFilter(btn.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${typeFilter === btn.value ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {btn.icon} {btn.label}
              </button>
            ))}
            <div className="ml-auto">
              <button onClick={() => setFavoritesOnly(f => !f)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${favoritesOnly ? "bg-red-500 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                <Heart className={`h-4 w-4 ${favoritesOnly ? "fill-white" : ""}`} />
                Mes favoris {favorites.size > 0 && `(${favorites.size})`}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Grille des offres */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <p className="text-gray-600 mb-8">{loading ? "Chargement..." : `${sorted.length} offre${sorted.length !== 1 ? "s" : ""} trouvée${sorted.length !== 1 ? "s" : ""}`}</p>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse">
                <div className="h-56 bg-gray-200" />
                <div className="p-6 space-y-3"><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-4 bg-gray-200 rounded w-1/2" /><div className="h-8 bg-gray-200 rounded" /></div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="text-center py-20 text-red-500">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sorted.map((offer) => {
              const typeCfg = getTypeConfig(offer.typeService);
              const isFav = favorites.has(offer.id);
              const hasImages = offer.images && offer.images.length > 0;
              return (
                <div key={offer.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group">
                  {/* Image */}
                  <div className="relative h-56 overflow-hidden">
                    <ImageWithFallback src={offer.image} alt={offer.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className={`absolute top-4 left-4 px-2.5 py-1 rounded-full text-xs font-semibold ${typeCfg.css}`}>
                      {typeCfg.icon} {typeCfg.label}
                    </div>
                    <button onClick={e => toggleFavorite(offer.id, e)}
                      className={`absolute top-4 right-4 p-2 rounded-full shadow-md transition-all ${isFav ? "bg-red-500 text-white" : "bg-white text-gray-600 hover:bg-red-50 hover:text-red-500"}`}>
                      <Heart className={`h-5 w-5 ${isFav ? "fill-white" : ""}`} />
                    </button>
                    {/* Bouton Voir images */}
                    {hasImages && (
                      <button
                        onClick={e => openGallery(offer.images, offer.title, e)}
                        className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
                      >
                        <Images className="h-3.5 w-3.5" />
                        Voir images ({offer.images.length})
                      </button>
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{offer.destination}</span>
                        <button onClick={e => { e.stopPropagation(); setMapOffer(offer); }}
                          className="p-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all" title="Voir sur la carte">
                          <Map className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{offer.rating}</span>
                        <span className="text-xs text-gray-400">({offer.reviews})</span>
                      </div>
                    </div>
                    <h3 className="text-xl mb-2">{offer.title}</h3>
                    {offer.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{offer.description}</p>}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {offer.includes.map((item: string, i: number) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{item}</span>
                      ))}
                    </div>
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">À partir de</p>
                        <p className="text-3xl text-blue-600">{offer.price}</p>
                        <p className="text-sm text-gray-600">par personne</p>
                      </div>
                    </div>
                    <button onClick={() => openBookingModal(offer)}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all shadow-md font-medium">
                      {offer.typeService === "HEBERGEMENT" ? "Voir les chambres" : "Réserver"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="text-center py-20">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucune offre trouvée</p>
            <p className="text-gray-400 text-sm mt-1">Essayez de modifier vos filtres</p>
          </div>
        )}
      </section>

      {/* ── Galerie ── */}
      {galleryImages && <GalleryModal images={galleryImages} title={galleryTitle} onClose={() => setGalleryImages(null)} />}

      {/* ── Map Modal ── */}
      {mapOffer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white"><Map className="h-5 w-5" /><span className="font-semibold">{mapOffer.destination}</span></div>
              <button onClick={() => setMapOffer(null)} className="text-white/80 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <iframe title={mapOffer.destination}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(mapOffer.destination)}&output=embed&hl=fr&z=12`}
              width="100%" height="420" style={{ border: 0 }} loading="lazy" />
            <div className="px-5 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500 line-clamp-1">{mapOffer.title}</p>
              <a href={`https://www.google.com/maps/search/${encodeURIComponent(mapOffer.destination)}`}
                target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1 flex-shrink-0 ml-4">
                <MapPin className="h-3.5 w-3.5" /> Ouvrir dans Google Maps
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ══ BOOKING MODAL — Design Premium ══ */}
      {bookingOffer && (() => {
        const { nbNuits, base, remise, final: montantFinal } = calcPrix();
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[95vh] flex flex-col overflow-hidden">

            {/* ── Header sombre premium ── */}
            <div className="relative overflow-hidden rounded-t-3xl flex-shrink-0">
              {/* Background image overlay */}
              <div className="absolute inset-0">
                <img src={proxyImage(bookingOffer.image)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900/90" />
              </div>
              <div className="relative px-6 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getTypeConfig(bookingOffer.typeService).css}`}>
                        {getTypeConfig(bookingOffer.typeService).icon} {getTypeConfig(bookingOffer.typeService).label}
                      </span>
                      {isAuthenticated && (
                        <span className="bg-amber-400 text-amber-900 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> -10% Membre
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-bold text-lg leading-tight truncate">{bookingOffer.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-blue-300 flex-shrink-0" />
                      <span className="text-blue-200 text-sm truncate">{bookingOffer.destination}</span>
                      <div className="flex gap-0.5 ml-1">
                        {Array.from({length:5}).map((_,i) => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setBookingOffer(null)}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Step indicator */}
                {bookingOffer.typeService === "HEBERGEMENT" && (
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${bookingStep === "rooms" ? "bg-blue-500 text-white ring-2 ring-blue-300" : "bg-emerald-500 text-white"}`}>
                        {bookingStep === "rooms" ? "1" : <Check className="h-3.5 w-3.5" />}
                      </div>
                      <span className={`text-xs font-medium ${bookingStep === "rooms" ? "text-white" : "text-emerald-300"}`}>Chambre</span>
                    </div>
                    <div className="flex-1 h-px bg-white/30 max-w-12" />
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${bookingStep === "form" ? "bg-blue-500 text-white ring-2 ring-blue-300" : "bg-white/20 text-white/50"}`}>2</div>
                      <span className={`text-xs font-medium ${bookingStep === "form" ? "text-white" : "text-white/50"}`}>Finaliser</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Body ── */}
            <div className="overflow-y-auto flex-1">

              {/* ════ STEP 1 : CHAMBRES ════ */}
              {bookingStep === "rooms" && (
                <div className="p-5 space-y-4">
                  {currentHeb && (
                    <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <div className="w-16 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={proxyImage(getHotelImage(currentHeb))} alt={currentHeb.titre} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{currentHeb.titre}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />{currentHeb.localisation}
                        </p>
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({length: currentHeb.etoiles ?? 3}).map((_,i) => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                        </div>
                      </div>
                      {currentHeb.images?.length > 0 && (
                        <button onClick={() => openGallery(currentHeb.images, currentHeb.titre)}
                          className="flex items-center gap-1 text-blue-600 text-xs px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 flex-shrink-0">
                          <Images className="h-3 w-3" /> {currentHeb.images.length}
                        </button>
                      )}
                    </div>
                  )}

                  {loadingChambres ? (
                    <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                  ) : chambres.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <BedDouble className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Aucune chambre disponible.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{chambres.length} chambre{chambres.length > 1 ? "s" : ""} disponible{chambres.length > 1 ? "s" : ""}</p>
                      {chambres.map((c: any) => {
                        const roomImg = getRoomImage(c);
                        const chambreImages = c.images?.length > 0 ? c.images : [roomImg];
                        const prixMembre = Math.round((c.prixParNuit ?? 0) * 0.9);
                        return (
                          <div key={c._id} className="border border-gray-100 rounded-2xl overflow-hidden hover:border-blue-200 hover:shadow-lg transition-all group">
                            <div className="flex">
                              <div className="relative w-32 flex-shrink-0">
                                <img src={proxyImage(roomImg)} alt={c.typeChambre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" style={{minHeight:"110px"}} />
                                {chambreImages.length > 1 && (
                                  <button onClick={() => openGallery(chambreImages, `${c.typeChambre} n°${c.numeroChambre}`)}
                                    className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    <Images className="h-2.5 w-2.5" /> {chambreImages.length}
                                  </button>
                                )}
                              </div>
                              <div className="flex-1 p-3.5 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-start justify-between gap-1 mb-1">
                                    <div>
                                      <span className="font-bold text-gray-900 text-sm">{c.typeChambre}</span>
                                      <span className="text-gray-400 text-xs ml-1.5">n°{c.numeroChambre}</span>
                                    </div>
                                    {c.formule && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                                        c.formule === "ALL_INCLUSIVE" ? "bg-emerald-100 text-emerald-700" :
                                        c.formule === "DEMI_PENSION" ? "bg-blue-100 text-blue-700" :
                                        c.formule === "PRIX_SPECIAL" ? "bg-orange-100 text-orange-700" :
                                        "bg-gray-100 text-gray-600"}`}>
                                        {FORMULE_LABELS[c.formule] ?? c.formule}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
                                    <span><Users className="h-3 w-3 inline mr-0.5" />{c.capacite} pers.</span>
                                    {c.vue && c.vue !== "AUCUNE" && <span><Bed className="h-3 w-3 inline mr-0.5" />Vue {c.vue?.toLowerCase()}</span>}
                                    {c.superficie && <span>{c.superficie} m²</span>}
                                  </div>
                                </div>
                                <div className="flex items-end justify-between mt-2">
                                  <div>
                                    <p className="text-lg font-extrabold text-slate-900 leading-none">{c.prixParNuit?.toLocaleString("fr-FR")} <span className="text-xs font-normal text-gray-400">TND/nuit</span></p>
                                    {!isAuthenticated && (
                                      <p className="text-[10px] text-amber-600 font-medium mt-0.5">👑 Membre : {prixMembre} TND/nuit</p>
                                    )}
                                    {isAuthenticated && (
                                      <p className="text-[10px] text-emerald-600 font-bold mt-0.5">✓ Votre prix : {prixMembre} TND/nuit</p>
                                    )}
                                  </div>
                                  <button onClick={() => selectRoom(c)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-sm">
                                    Choisir →
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ════ STEP 2 : FORMULAIRE + PAIEMENT ════ */}
              {bookingStep === "form" && (
                <div className="p-5 space-y-4">

                  {/* Chambre sélectionnée */}
                  {selectedRoom && (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                      <div className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={proxyImage(getRoomImage(selectedRoom))} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-emerald-800 text-sm">{selectedRoom.typeChambre} <span className="font-normal text-emerald-600">— n°{selectedRoom.numeroChambre}</span></p>
                        <p className="text-emerald-600 text-xs">{selectedRoom.prixParNuit?.toLocaleString("fr-FR")} TND / nuit · {selectedRoom.capacite} pers.</p>
                      </div>
                      <button onClick={() => { setBookingStep("rooms"); setCheckoutStage("form"); }} className="text-xs text-blue-600 hover:text-blue-800 flex-shrink-0 underline">Changer</button>
                    </div>
                  )}

                  {/* ── Cas SUCCÈS guest ── */}
                  {checkoutStage === "success" && guestReservation && (
                    <div className="text-center py-4 space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                        <PartyPopper className="h-8 w-8 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">Réservation confirmée !</h4>
                        <p className="text-sm text-gray-500 mt-1">Référence : <span className="font-mono font-bold text-gray-800">#{String(guestReservation._id).slice(-8).toUpperCase()}</span></p>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4 text-sm text-left space-y-2">
                        <div className="flex justify-between"><span className="text-gray-500">Arrivée</span><span className="font-medium">{new Date(guestReservation.dateDebutSejour).toLocaleDateString("fr-FR")}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Départ</span><span className="font-medium">{new Date(guestReservation.dateFinSejour).toLocaleDateString("fr-FR")}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Nuits</span><span className="font-medium">{guestReservation.nbNuits}</span></div>
                        <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                          <span className="font-bold text-gray-900">Total</span>
                          <span className="font-extrabold text-blue-600 text-lg">{guestReservation.montantTotal?.toLocaleString("fr-FR")} TND</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">Un email de confirmation sera envoyé à <span className="font-medium text-gray-600">{guestReservation.guestEmail}</span></p>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                        <Gift className="h-4 w-4 inline mr-1" />
                        <strong>Créez un compte</strong> pour accéder à votre historique et bénéficier de <strong>-10%</strong> sur vos prochaines réservations !
                        <button onClick={() => { setBookingOffer(null); navigate("/register"); }}
                          className="block w-full mt-2 bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold py-1.5 rounded-lg transition-colors">
                          S'inscrire maintenant →
                        </button>
                      </div>
                      <button onClick={() => setBookingOffer(null)} className="w-full text-gray-500 hover:text-gray-700 text-sm py-1">Fermer</button>
                    </div>
                  )}

                  {/* ── Formulaire principal (dates + personnes) ── */}
                  {checkoutStage !== "success" && (
                    <>
                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {selectedRoom ? "Arrivée" : "Départ"} *
                          </label>
                          <input type="date" value={bookForm.dateDebut} min={today}
                            onChange={e => { setBookForm(f => ({ ...f, dateDebut: e.target.value })); setCheckoutStage("form"); }}
                            className="w-full border-2 border-gray-100 focus:border-blue-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {selectedRoom ? "Départ" : "Retour"} *
                          </label>
                          <input type="date" value={bookForm.dateFin} min={bookForm.dateDebut || today}
                            onChange={e => { setBookForm(f => ({ ...f, dateFin: e.target.value })); setCheckoutStage("form"); }}
                            className="w-full border-2 border-gray-100 focus:border-blue-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors bg-gray-50" />
                        </div>
                      </div>

                      {/* Personnes (adultes + enfants), bornées par la capacité de la chambre */}
                      {(() => {
                        const cap = selectedRoom ? Math.max(1, Number(selectedRoom.capacite) || 1) : 20;
                        const adultes = parseInt(bookForm.nbPersonnes) || 1;
                        const totalOccupants = adultes + bookForm.agesEnfants.length;
                        const placeRestante = cap - totalOccupants;
                        return (
                          <div className="space-y-3">
                            {/* Adultes */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                                <Users className="h-3 w-3 inline mr-1" /> Adultes *
                                {selectedRoom && <span className="ml-1 text-gray-400 normal-case">· capacité {cap} pers.</span>}
                              </label>
                              <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2">
                                <button type="button" disabled={adultes <= 1}
                                  onClick={() => setBookForm(f => ({ ...f, nbPersonnes: String(Math.max(1, (parseInt(f.nbPersonnes) || 1) - 1)) }))}
                                  className="w-8 h-8 rounded-full border-2 border-blue-200 text-blue-600 font-bold hover:bg-blue-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">−</button>
                                <span className="flex-1 text-center font-bold text-gray-900">{adultes} adulte{adultes > 1 ? "s" : ""}</span>
                                <button type="button" disabled={placeRestante <= 0}
                                  onClick={() => setBookForm(f => ({ ...f, nbPersonnes: String((parseInt(f.nbPersonnes) || 1) + 1) }))}
                                  className="w-8 h-8 rounded-full border-2 border-blue-200 text-blue-600 font-bold hover:bg-blue-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                              </div>
                            </div>

                            {/* Enfants — moins de 5 ans gratuits (hôtel + offres) */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                                  Enfants <span className="normal-case text-gray-400">· moins de {AGE_GRATUIT} ans gratuits</span>
                                </label>
                                <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2">
                                  <button type="button" disabled={bookForm.agesEnfants.length === 0}
                                    onClick={() => setBookForm(f => ({ ...f, agesEnfants: f.agesEnfants.slice(0, -1) }))}
                                    className="w-8 h-8 rounded-full border-2 border-blue-200 text-blue-600 font-bold hover:bg-blue-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">−</button>
                                  <span className="flex-1 text-center font-bold text-gray-900">{bookForm.agesEnfants.length} enfant{bookForm.agesEnfants.length > 1 ? "s" : ""}</span>
                                  <button type="button" disabled={placeRestante <= 0}
                                    onClick={() => setBookForm(f => ({ ...f, agesEnfants: [...f.agesEnfants, 5] }))}
                                    className="w-8 h-8 rounded-full border-2 border-blue-200 text-blue-600 font-bold hover:bg-blue-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                </div>
                                {selectedRoom && placeRestante <= 0 && (
                                  <p className="text-[11px] text-amber-600 mt-1">Capacité maximale atteinte ({cap} pers.). Choisissez une chambre plus grande pour ajouter des voyageurs.</p>
                                )}
                                {bookForm.agesEnfants.length > 0 && (
                                  <div className="mt-2 space-y-1.5">
                                    {bookForm.agesEnfants.map((age, i) => (
                                      <div key={i} className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-gray-600">Enfant {i + 1}</span>
                                        <div className="flex items-center gap-2">
                                          <select value={age}
                                            onChange={(e) => setBookForm(f => ({ ...f, agesEnfants: f.agesEnfants.map((a, j) => j === i ? Number(e.target.value) : a) }))}
                                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            {Array.from({ length: 18 }).map((_, a) => (
                                              <option key={a} value={a}>{a} an{a > 1 ? "s" : ""}</option>
                                            ))}
                                          </select>
                                          {age < AGE_GRATUIT && (
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Gratuit</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Champs INTERNATIONALE */}
                      {!selectedRoom && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                              Numéro de passeport *
                            </label>
                            {(() => {
                              const err = passportTouched ? validatePassport(bookForm.numPassport) : "";
                              const isValid = passportTouched && !err && bookForm.numPassport.trim().length > 0;
                              return (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Ex : A1234567"
                                    value={bookForm.numPassport}
                                    maxLength={8}
                                    onBlur={() => setPassportTouched(true)}
                                    onChange={e => {
                                      // Auto-majuscules + supprimer caractères non alphanumériques
                                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                                      setBookForm(f => ({ ...f, numPassport: val }));
                                    }}
                                    className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none transition-colors bg-gray-50
                                      ${err ? "border-red-400 focus:border-red-500 bg-red-50"
                                            : isValid ? "border-green-400 focus:border-green-500 bg-green-50"
                                            : "border-gray-100 focus:border-blue-400"}`}
                                  />
                                  {err && (
                                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                                      <span>⚠</span> {err}
                                    </p>
                                  )}
                                  {isValid && (
                                    <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                                      <span>✓</span> Numéro de passeport valide
                                    </p>
                                  )}
                                  {!err && !isValid && (
                                    <p className="text-gray-400 text-xs mt-1">
                                      Format : 1 lettre suivie de 7 chiffres (ex : A1234567)
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* ── Récapitulatif prix ── */}
                      {selectedRoom && bookForm.dateDebut && bookForm.dateFin && base > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-sm">
                          <p className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-2">Récapitulatif</p>
                          <div className="flex justify-between text-gray-600">
                            <span>{selectedRoom.prixParNuit} TND × {nbNuits} nuit{nbNuits > 1 ? "s" : ""}</span>
                            <span className="font-semibold">{base.toLocaleString("fr-FR")} TND</span>
                          </div>
                          {isAuthenticated ? (
                            <>
                              <div className="flex justify-between text-emerald-600 font-semibold">
                                <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /> Remise membre -10%</span>
                                <span>−{remise.toLocaleString("fr-FR")} TND</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-300 pt-2 mt-1">
                                <span className="font-extrabold text-slate-900">Total à payer</span>
                                <span className="font-extrabold text-xl text-blue-600">{montantFinal.toLocaleString("fr-FR")} TND</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between border-t border-slate-300 pt-2 mt-1">
                                <span className="font-extrabold text-slate-900">Total</span>
                                <span className="font-extrabold text-xl text-slate-900">{base.toLocaleString("fr-FR")} TND</span>
                              </div>
                              <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                                <Gift className="h-3.5 w-3.5" /> En vous connectant, vous économisez <strong>{remise.toLocaleString("fr-FR")} TND</strong> (-10%)
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {/* ── Récapitulatif prix (offre internationale / excursion) ── */}
                      {!selectedRoom && base > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-sm">
                          <p className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-2">Récapitulatif</p>
                          <div className="flex justify-between text-gray-600">
                            <span>Forfait par personne</span>
                            <span className="font-semibold">{(bookingOffer?.priceNum ?? 0).toLocaleString("fr-FR")} TND</span>
                          </div>
                          {bookForm.agesEnfants.some(a => a < AGE_GRATUIT) && (
                            <p className="text-[11px] text-emerald-600 font-medium">
                              ✓ {bookForm.agesEnfants.filter(a => a < AGE_GRATUIT).length} enfant(s) de moins de {AGE_GRATUIT} ans gratuit(s)
                            </p>
                          )}
                          {isAuthenticated ? (
                            <>
                              <div className="flex justify-between text-emerald-600 font-semibold">
                                <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /> Remise membre -10%</span>
                                <span>−{remise.toLocaleString("fr-FR")} TND</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-300 pt-2 mt-1">
                                <span className="font-extrabold text-slate-900">Total à payer</span>
                                <span className="font-extrabold text-xl text-blue-600">{montantFinal.toLocaleString("fr-FR")} TND</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between border-t border-slate-300 pt-2 mt-1">
                                <span className="font-extrabold text-slate-900">Total</span>
                                <span className="font-extrabold text-xl text-slate-900">{base.toLocaleString("fr-FR")} TND</span>
                              </div>
                              <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                                <Gift className="h-3.5 w-3.5" /> En vous connectant, vous économisez <strong>{remise.toLocaleString("fr-FR")} TND</strong> (-10%)
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {bookError && (
                        <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-xl flex items-center gap-2">
                          <X className="h-4 w-4 flex-shrink-0" />{bookError}
                        </p>
                      )}

                      {/* ── CTA selon checkoutStage ── */}

                      {/* Stage: formulaire (bouton principal) */}
                      {checkoutStage === "form" && (
                        isAuthenticated ? (
                          <button onClick={handleConfirmBooking}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3.5 rounded-2xl hover:from-blue-700 hover:to-blue-900 transition-all shadow-lg flex items-center justify-center gap-2 font-bold text-base">
                            <CreditCard className="h-5 w-5" />
                            Confirmer et payer · {montantFinal > 0 ? `${montantFinal.toLocaleString("fr-FR")} TND` : ""}
                          </button>
                        ) : (
                          <button onClick={handleConfirmBooking}
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3.5 rounded-2xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg flex items-center justify-center gap-2 font-bold text-base">
                            <ArrowRight className="h-5 w-5" />
                            Continuer vers le paiement
                          </button>
                        )
                      )}

                      {/* Stage: choix discount */}
                      {checkoutStage === "discount-choice" && (
                        <div className="space-y-3">
                          {/* Bannière réduction */}
                          <div className="relative overflow-hidden bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 text-center">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
                            <Gift className="h-8 w-8 text-white mx-auto mb-2" />
                            <p className="text-white font-extrabold text-lg leading-tight">Connectez-vous et économisez</p>
                            <p className="text-white/90 text-sm mt-0.5">
                              {remise > 0 ? (
                                <>−<strong>{remise.toLocaleString("fr-FR")} TND</strong> sur cette réservation !</>
                              ) : (
                                <><strong>-10%</strong> sur votre réservation !</>
                              )}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <button onClick={() => savePendingAndGo("/login", remise)}
                              className="flex flex-col items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-3 rounded-2xl transition-colors font-semibold text-sm shadow-md">
                              <span className="text-base font-extrabold">Se connecter</span>
                              <span className="text-blue-200 text-[11px] font-normal flex items-center gap-0.5">
                                <Percent className="h-3 w-3" /> −10% appliqué
                              </span>
                            </button>
                            <button onClick={() => savePendingAndGo("/register", remise)}
                              className="flex flex-col items-center gap-1 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-3 px-3 rounded-2xl transition-colors font-semibold text-sm">
                              <span className="text-base font-extrabold">S'inscrire</span>
                              <span className="text-blue-400 text-[11px] font-normal flex items-center gap-0.5">
                                <Percent className="h-3 w-3" /> −10% appliqué
                              </span>
                            </button>
                          </div>

                          {/* Séparateur */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs text-gray-400 font-medium">ou</span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>

                          {/* Continuer en invité — disponible pour tous les types d'offres */}
                          <button
                            onClick={() => { setCheckoutStage("guest-form"); setGuestError(""); }}
                            className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-3 px-4 rounded-2xl transition-colors text-sm font-medium"
                          >
                            <span className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-400" />
                              Continuer en tant que visiteur
                            </span>
                            <span className="text-gray-400 text-xs">Sans réduction →</span>
                          </button>
                          <button onClick={() => setCheckoutStage("form")} className="w-full text-center text-gray-400 hover:text-gray-600 text-xs py-1">← Retour</button>
                        </div>
                      )}

                      {/* Stage: formulaire invité */}
                      {checkoutStage === "guest-form" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-1">
                            <UserIcon className="h-4 w-4 text-blue-500" /> Vos informations personnelles
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Prénom *</label>
                              <input value={guestForm.prenom} onChange={e => setGuestForm(f => ({...f, prenom: e.target.value}))}
                                placeholder="Marie" className="w-full border-2 border-gray-100 focus:border-blue-400 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Nom de famille *</label>
                              <input value={guestForm.nom} onChange={e => setGuestForm(f => ({...f, nom: e.target.value}))}
                                placeholder="Dupont" className="w-full border-2 border-gray-100 focus:border-blue-400 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Adresse e-mail *</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input type="email" value={guestForm.email} onChange={e => setGuestForm(f => ({...f, email: e.target.value}))}
                                placeholder="marie@exemple.com" className="w-full pl-9 border-2 border-gray-100 focus:border-blue-400 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Numéro de téléphone</label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input type="tel" value={guestForm.telephone} onChange={e => setGuestForm(f => ({...f, telephone: e.target.value}))}
                                placeholder="8 chiffres (ex : 12 345 678)" className="w-full pl-9 border-2 border-gray-100 focus:border-blue-400 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none" />
                            </div>
                          </div>
                          {guestError && (
                            <p className="text-red-600 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{guestError}</p>
                          )}
                          <button onClick={handleGuestCheckout} disabled={submittingGuest}
                            className="w-full bg-gradient-to-r from-slate-700 to-slate-900 text-white py-3.5 rounded-2xl hover:from-slate-800 hover:to-black transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg">
                            {submittingGuest ? (
                              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Confirmation…</>
                            ) : (
                              <><CreditCard className="h-5 w-5" /> Confirmer la réservation</>
                            )}
                          </button>
                          <button onClick={() => setCheckoutStage("discount-choice")} className="w-full text-center text-gray-400 hover:text-gray-600 text-xs py-1">← Retour</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
