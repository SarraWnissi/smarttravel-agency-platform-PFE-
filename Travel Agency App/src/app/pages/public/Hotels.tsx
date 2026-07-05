import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Search, Star, MapPin, Wifi, Coffee, Car, Waves, Dumbbell,
  Utensils, ChevronDown, ChevronUp, SlidersHorizontal, Heart,
  X, Users, Calendar, CheckCircle, Sparkles, Shield,
  Gift, Trophy, Lock, CreditCard, ArrowRight, Percent, Zap,
} from "lucide-react";
import { hebergementsAPI } from "../../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { calculerTarif } from "../../../utils/pricing";
import { matchSearchTokens } from "../../../utils/search";

// ── Constants ──────────────────────────────────────────────────────────────

const HOTEL_IMGS = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1549294413-26f195200c16?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&auto=format&fit=crop",
];

const DESTINATIONS_POPULAIRES = [
  { nom: "Djerba",    q: "Djerba"    },
  { nom: "Hammamet", q: "Hammamet"  },
  { nom: "Sousse",   q: "Sousse"    },
  { nom: "Tunis",    q: "Tunis"     },
  { nom: "Monastir", q: "Monastir"  },
  { nom: "Tabarka",  q: "Tabarka"   },
  { nom: "Tozeur",   q: "Tozeur"    },
];

const GOUVERNORATS: { value: string; label: string; region: string }[] = [
  { value: "Ariana",      label: "Ariana",       region: "Nord-Est" },
  { value: "Béja",        label: "Béja",         region: "Nord-Ouest" },
  { value: "Ben Arous",   label: "Ben Arous",    region: "Nord-Est" },
  { value: "Bizerte",     label: "Bizerte",      region: "Nord" },
  { value: "Gabès",       label: "Gabès",        region: "Sud-Est" },
  { value: "Gafsa",       label: "Gafsa",        region: "Centre-Ouest" },
  { value: "Jendouba",    label: "Jendouba",     region: "Nord-Ouest" },
  { value: "Kairouan",    label: "Kairouan",     region: "Centre" },
  { value: "Kasserine",   label: "Kasserine",    region: "Centre-Ouest" },
  { value: "Kébili",      label: "Kébili",       region: "Sud" },
  { value: "Le Kef",      label: "Le Kef",       region: "Nord-Ouest" },
  { value: "Mahdia",      label: "Mahdia",       region: "Centre-Est" },
  { value: "La Manouba",  label: "La Manouba",   region: "Nord-Est" },
  { value: "Médenine",    label: "Médenine",     region: "Sud-Est" },
  { value: "Monastir",    label: "Monastir",     region: "Centre-Est" },
  { value: "Nabeul",      label: "Nabeul",       region: "Nord-Est" },
  { value: "Sfax",        label: "Sfax",         region: "Centre-Est" },
  { value: "Sidi Bouzid", label: "Sidi Bouzid",  region: "Centre" },
  { value: "Siliana",     label: "Siliana",      region: "Nord-Ouest" },
  { value: "Sousse",      label: "Sousse",       region: "Centre-Est" },
  { value: "Tataouine",   label: "Tataouine",    region: "Sud" },
  { value: "Tozeur",      label: "Tozeur",       region: "Sud-Ouest" },
  { value: "Tunis",       label: "Tunis",        region: "Nord-Est" },
  { value: "Zaghouan",    label: "Zaghouan",     region: "Nord-Est" },
];

// group by region for optgroup
const GOUVERNORATS_BY_REGION = GOUVERNORATS.reduce<Record<string, typeof GOUVERNORATS>>((acc, g) => {
  if (!acc[g.region]) acc[g.region] = [];
  acc[g.region].push(g);
  return acc;
}, {});

const TYPE_LABELS: Record<string, string> = {
  HOTEL:       "Hôtel",
  RESORT:      "Resort",
  VILLA:       "Villa",
  APPARTEMENT: "Appartement",
  AUBERGE:     "Auberge",
  BUNGALOW:    "Bungalow",
  CAMPING:     "Camping",
};

const FORMULE_CONFIG: Record<string, { label: string; color: string }> = {
  ALL_INCLUSIVE: { label: "All Inclusive",  color: "bg-emerald-600" },
  DEMI_PENSION:  { label: "Demi-pension",   color: "bg-blue-600"    },
  PRIX_SPECIAL:  { label: "Prix spécial",   color: "bg-orange-500"  },
  LOGEMENT_SEUL: { label: "Logement seul",  color: "bg-gray-500"    },
};

const AMENITES: { key: string; icon: React.ElementType; label: string }[] = [
  { key: "wifi",      icon: Wifi,      label: "Wi-Fi gratuit" },
  { key: "piscine",   icon: Waves,     label: "Piscine"       },
  { key: "parking",   icon: Car,       label: "Parking"       },
  { key: "restaurant",icon: Utensils,  label: "Restaurant"    },
  { key: "fitness",   icon: Dumbbell,  label: "Fitness"       },
  { key: "petitdej",  icon: Coffee,    label: "Petit-déjeuner"},
];

// ── Pays étrangers avec exemples d'hôtels ─────────────────────────────────
const PAYS_ETRANGERS = [
  {
    pays: "France", flag: "🇫🇷", ville: "Paris",
    hotel: "Hôtel de Crillon",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop&q=80",
    desc: "La Ville Lumière"
  },
  {
    pays: "Espagne", flag: "🇪🇸", ville: "Barcelone",
    hotel: "W Barcelona",
    img: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&auto=format&fit=crop&q=80",
    desc: "Architecture & plages"
  },
  {
    pays: "Italie", flag: "🇮🇹", ville: "Rome",
    hotel: "Hotel Eden",
    img: "https://images.unsplash.com/photo-1515542622106-078bda21e0cc?w=600&auto=format&fit=crop&q=80",
    desc: "La Ville Éternelle"
  },
  {
    pays: "Turquie", flag: "🇹🇷", ville: "Istanbul",
    hotel: "Four Seasons Bosphore",
    img: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&auto=format&fit=crop&q=80",
    desc: "Orient & modernité"
  },
  {
    pays: "Maroc", flag: "🇲🇦", ville: "Marrakech",
    hotel: "La Mamounia",
    img: "https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=600&auto=format&fit=crop&q=80",
    desc: "Médina & désert"
  },
  {
    pays: "Dubaï", flag: "🇦🇪", ville: "Dubaï",
    hotel: "Burj Al Arab",
    img: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&auto=format&fit=crop&q=80",
    desc: "Luxe & modernité"
  },
  {
    pays: "Grèce", flag: "🇬🇷", ville: "Santorin",
    hotel: "Canaves Oia Suites",
    img: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&auto=format&fit=crop&q=80",
    desc: "Crépuscule & mer Égée"
  },
  {
    pays: "Thaïlande", flag: "🇹🇭", ville: "Phuket",
    hotel: "Amanpuri Resort",
    img: "https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=600&auto=format&fit=crop&q=80",
    desc: "Temples & plages"
  },
  {
    pays: "Portugal", flag: "🇵🇹", ville: "Lisbonne",
    hotel: "Bairro Alto Hotel",
    img: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&auto=format&fit=crop&q=80",
    desc: "Fado & pastéis"
  },
  {
    pays: "Maldives", flag: "🇲🇻", ville: "Malé",
    hotel: "Velaa Private Island",
    img: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600&auto=format&fit=crop&q=80",
    desc: "Bungalows sur pilotis"
  },
  {
    pays: "Jordanie", flag: "🇯🇴", ville: "Petra",
    hotel: "Mövenpick Resort Petra",
    img: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=600&auto=format&fit=crop&q=80",
    desc: "Cité rose & désert"
  },
  {
    pays: "Egypte", flag: "🇪🇬", ville: "Hurghada",
    hotel: "Steigenberger Aldau Beach",
    img: "https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=600&auto=format&fit=crop&q=80",
    desc: "Pyramides & plongée"
  },
];

function getRatingLabel(note: number) {
  if (note >= 9)   return { label: "Exceptionnel",  bg: "bg-blue-800"  };
  if (note >= 8)   return { label: "Superbe",        bg: "bg-blue-700"  };
  if (note >= 7)   return { label: "Très bien",      bg: "bg-blue-600"  };
  if (note >= 6)   return { label: "Bien",            bg: "bg-blue-500"  };
  return              { label: "Passable",           bg: "bg-gray-500"  };
}

function getHotelImg(h: any, idx: number) {
  if (h.images?.length > 0) return h.images[0];
  return HOTEL_IMGS[idx % HOTEL_IMGS.length];
}

function fakeAmenites(idx: number) {
  return AMENITES.filter((_, i) => ((idx + i) % 3) !== 2);
}

// ── Skeleton card ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse flex h-52">
      <div className="w-64 bg-gray-200 flex-shrink-0" />
      <div className="flex-1 p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-10 bg-gray-200 rounded w-36 mt-auto ml-auto" />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function Hotels() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();

  // Search state
  const [query,      setQuery]      = useState(searchParams.get("q") || "");
  const [appliedQuery, setAppliedQuery] = useState(searchParams.get("q") || ""); // requête « Destination » validée (pas la frappe en cours)
  const [gouvernorat,setGouvernorat]= useState("");
  const [paysIntl,   setPaysIntl]   = useState("");
  const [dateDebut,  setDateDebut]  = useState(searchParams.get("dateDebut") || "");
  const [dateFin,    setDateFin]    = useState(searchParams.get("dateFin") || "");
  const [nbPersonnes,setNbPersonnes]= useState(searchParams.get("nbPersonnes") || "2"); // adultes
  const [agesEnfants,setAgesEnfants]= useState<number[]>(() => {
    const raw = searchParams.get("agesEnfants");
    return raw ? raw.split(",").map(Number).filter(n => !isNaN(n)) : [];
  });

  // Âge en dessous duquel l'enfant est gratuit
  const AGE_GRATUIT = 5;
  const nbEnfants = agesEnfants.length;
  // Met à jour le nombre d'enfants en conservant/ajustant le tableau des âges
  const setNbEnfants = (n: number) =>
    setAgesEnfants(prev => {
      const next = [...prev];
      while (next.length < n) next.push(5);   // âge par défaut
      next.length = Math.max(0, n);
      return next;
    });
  const setAgeEnfant = (idx: number, age: number) =>
    setAgesEnfants(prev => prev.map((a, i) => (i === idx ? age : a)));

  // Filter state
  const [budgetMax,  setBudgetMax]  = useState("");
  const [formule,    setFormule]    = useState("");
  const [etoilesMin, setEtoilesMin] = useState("");
  const [noteMin,    setNoteMin]    = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  // UI state
  const [sortBy,     setSortBy]     = useState("default");
  const [nomHotel,   setNomHotel]   = useState(""); // recherche instantanée par nom d'hôtel
  const [hotels,     setHotels]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [favorites,  setFavorites]  = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("st_fav_hotels") ?? "[]")); }
    catch { return new Set(); }
  });
  const [filtersOpen,setFiltersOpen]= useState(false);

  // Guest picker popup
  const [guestOpen,  setGuestOpen]  = useState(false);
  const guestRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (guestRef.current && !guestRef.current.contains(e.target as Node)) setGuestOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const saveFav = (s: Set<string>) => {
    setFavorites(s);
    localStorage.setItem("st_fav_hotels", JSON.stringify([...s]));
  };
  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const n = new Set(favorites);
    n.has(id) ? n.delete(id) : n.add(id);
    saveFav(n as Set<string>);
  };

  const load = useCallback(async (overrideQuery?: string) => {
    setLoading(true); setError("");
    try {
      const q = overrideQuery ?? query;
      setAppliedQuery(q);
      const params = new URLSearchParams();
      if (q)          params.set("q",          q);
      if (dateDebut)  params.set("dateDebut",  dateDebut);
      if (dateFin)    params.set("dateFin",    dateFin);
      const totalOccupants = (Number(nbPersonnes) || 0) + nbEnfants;
      if (totalOccupants && totalOccupants !== 2) params.set("nbPersonnes", String(totalOccupants));
      if (budgetMax)  params.set("budgetMax",  budgetMax);
      if (formule)    params.set("formule",    formule);
      if (etoilesMin) params.set("etoilesMin", etoilesMin);

      const hasSearch = q || dateDebut || formule || etoilesMin || budgetMax;
      const data = hasSearch
        ? await hebergementsAPI.search(params.toString())
        : await hebergementsAPI.getAll();
      setHotels(data);
    } catch { setError("Impossible de charger les hébergements."); }
    finally { setLoading(false); }
  }, [query, dateDebut, dateFin, nbPersonnes, agesEnfants, budgetMax, formule, etoilesMin]);

  useEffect(() => { load(); }, []);

  // Apply client-side filters
  let results = [...hotels];
  // Recherche par mots sur la « Destination » (nom, localisation, description) :
  // affine les résultats du backend de façon tolérante (ordre/accents/liaisons).
  if (appliedQuery.trim())
    results = results.filter(h =>
      matchSearchTokens([h.titre, h.localisation, h.adresse, h.description].filter(Boolean).join(" "), appliedQuery)
    );
  if (nomHotel.trim())
    results = results.filter(h => matchSearchTokens(h.titre, nomHotel));
  if (typeFilter.length > 0)
    results = results.filter(h => typeFilter.includes(h.type));
  if (noteMin)
    results = results.filter(h => (h.notesMoyenne || 4.2) >= Number(noteMin));
  if (budgetMax)
    results = results.filter(h => !h.prixMin || Number(h.prixMin) <= Number(budgetMax));
  if (formule)
    results = results.filter(h =>
      (Array.isArray(h.formules) && h.formules.includes(formule)) ||
      h.formule === formule
    );
  results.sort((a, b) => {
    const pa = a.prixMin ?? 0, pb = b.prixMin ?? 0;
    if (sortBy === "prix_asc")  return pa - pb;
    if (sortBy === "prix_desc") return pb - pa;
    if (sortBy === "etoiles")   return (b.etoiles || 0) - (a.etoiles || 0);
    if (sortBy === "note")      return (b.notesMoyenne || 0) - (a.notesMoyenne || 0);
    return 0;
  });

  const toggleType = (t: string) =>
    setTypeFilter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  // Construit l'URL de détail d'un hôtel en propageant les dates/voyageurs choisis
  const hotelDetailUrl = useCallback((hotelId: string) => {
    const p = new URLSearchParams();
    if (dateDebut)        p.set("dateDebut",   dateDebut);
    if (dateFin)          p.set("dateFin",     dateFin);
    if (nbPersonnes)      p.set("nbPersonnes", nbPersonnes);
    if (agesEnfants.length) p.set("agesEnfants", agesEnfants.join(","));
    const qs = p.toString();
    return `/hotels/${hotelId}${qs ? `?${qs}` : ""}`;
  }, [dateDebut, dateFin, nbPersonnes, agesEnfants]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-[#f2f6fa]">

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <div className="bg-[#003580]" style={{ background: "linear-gradient(135deg,#003580 0%,#0057b8 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">
            Trouvez votre hébergement idéal
          </h1>
          <p className="text-blue-200 text-sm mb-8">Des hôtels, villas, resorts et appartements partout dans le monde</p>

          {/* Search bar */}
          <form
            onSubmit={e => { e.preventDefault(); load(); }}
            className="bg-[#feba02] p-1.5 rounded-xl flex flex-wrap gap-1 shadow-2xl"
          >
            {/* Destination */}
            <div className="flex-1 min-w-48 bg-white rounded-lg flex items-center px-3 gap-2">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-bold text-gray-500 leading-none mt-1">Destination</label>
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); if (gouvernorat) setGouvernorat(""); }}
                  placeholder="Où allez-vous ?"
                  className="w-full text-sm text-gray-800 focus:outline-none pb-1"
                />
              </div>
            </div>

            {/* Check-in */}
            <div className="min-w-36 bg-white rounded-lg flex items-center px-3 gap-2">
              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-500 leading-none mt-1">Arrivée</label>
                <input type="date" min={today} value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                  className="w-full text-sm text-gray-800 focus:outline-none pb-1 bg-transparent" />
              </div>
            </div>

            {/* Check-out */}
            <div className="min-w-36 bg-white rounded-lg flex items-center px-3 gap-2">
              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-500 leading-none mt-1">Départ</label>
                <input type="date" min={dateDebut || today} value={dateFin} onChange={e => setDateFin(e.target.value)}
                  className="w-full text-sm text-gray-800 focus:outline-none pb-1 bg-transparent" />
              </div>
            </div>

            {/* Guests */}
            <div ref={guestRef} className="relative min-w-36 bg-white rounded-lg flex items-center px-3 gap-2 cursor-pointer" onClick={() => setGuestOpen(o => !o)}>
              <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-500 leading-none mt-1 cursor-pointer">Voyageurs</label>
                <p className="text-sm text-gray-800 pb-1">
                  {nbPersonnes} adulte{Number(nbPersonnes) > 1 ? "s" : ""}
                  {nbEnfants > 0 && ` · ${nbEnfants} enfant${nbEnfants > 1 ? "s" : ""}`}
                </p>
              </div>
              {guestOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 w-64" onClick={e => e.stopPropagation()}>
                  {/* Adultes */}
                  <p className="text-xs font-bold text-gray-500 mb-2">Adultes</p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setNbPersonnes(p => String(Math.max(1, +p - 1)))}
                      className="w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50">−</button>
                    <span className="text-lg font-bold w-6 text-center">{nbPersonnes}</span>
                    <button type="button" onClick={() => setNbPersonnes(p => String(Math.min(20, +p + 1)))}
                      className="w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50">+</button>
                  </div>

                  {/* Enfants */}
                  <p className="text-xs font-bold text-gray-500 mb-2 mt-4">Enfants</p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setNbEnfants(Math.max(0, nbEnfants - 1))}
                      className="w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50">−</button>
                    <span className="text-lg font-bold w-6 text-center">{nbEnfants}</span>
                    <button type="button" onClick={() => setNbEnfants(Math.min(10, nbEnfants + 1))}
                      className="w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50">+</button>
                  </div>

                  {/* Âge de chaque enfant */}
                  {nbEnfants > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] text-gray-500">Âge de chaque enfant (au moment du séjour)</p>
                      {agesEnfants.map((age, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-600">Enfant {i + 1}</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={age}
                              onChange={e => setAgeEnfant(i, Number(e.target.value))}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {Array.from({ length: 18 }).map((_, a) => (
                                <option key={a} value={a}>{a} an{a > 1 ? "s" : ""}</option>
                              ))}
                            </select>
                            {age < AGE_GRATUIT && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                Gratuit
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400 mt-3 leading-snug">
                    👶 Les enfants de moins de {AGE_GRATUIT} ans séjournent gratuitement.
                  </p>

                  <button type="button" onClick={() => setGuestOpen(false)}
                    className="mt-3 w-full bg-blue-600 text-white py-1.5 rounded-lg text-sm font-semibold">OK</button>
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap">
              <Search className="h-4 w-4" /> Rechercher
            </button>
          </form>

          {/* Gouvernorat selector */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20 flex-1 min-w-64 max-w-sm">
              <MapPin className="h-4 w-4 text-yellow-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-bold text-blue-200 leading-none mb-0.5">
                  Gouvernorat / Région
                </label>
                <select
                  value={gouvernorat}
                  onChange={e => {
                    const val = e.target.value;
                    setGouvernorat(val);
                    setQuery(val);
                    if (val) load(val);
                    else load("");
                  }}
                  className="w-full bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer appearance-none"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="" className="bg-[#003580] text-white">— Tous les gouvernorats —</option>
                  {Object.entries(GOUVERNORATS_BY_REGION)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([region, govs]) => (
                      <optgroup key={region} label={`── ${region}`} className="bg-[#003580] text-white font-bold">
                        {govs.map(g => (
                          <option key={g.value} value={g.value} className="bg-[#003580] text-white font-normal">
                            {g.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                </select>
              </div>
              {gouvernorat && (
                <button
                  type="button"
                  onClick={() => { setGouvernorat(""); setQuery(""); load(""); }}
                  className="text-white/60 hover:text-white flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Destination internationale selector */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20 flex-1 min-w-64 max-w-sm">
              <span className="text-lg flex-shrink-0">🌍</span>
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-bold text-blue-200 leading-none mb-0.5">
                  Destination internationale
                </label>
                <select
                  value={paysIntl}
                  onChange={e => {
                    const val = e.target.value;
                    setPaysIntl(val);
                    setGouvernorat("");
                    setQuery(val);
                    if (val) {
                      const pays = PAYS_ETRANGERS.find(p => p.pays === val);
                      // Cherche par ville (Paris) OU pays (France)
                      const terme = pays?.ville || val;
                      load(terme);
                    } else {
                      load("");
                    }
                  }}
                  className="w-full bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer appearance-none"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="" className="bg-[#003580] text-white">— Pays étranger —</option>
                  {PAYS_ETRANGERS.map(p => (
                    <option key={p.pays} value={p.pays} className="bg-[#003580] text-white">
                      {p.flag} {p.pays}
                    </option>
                  ))}
                </select>
              </div>
              {paysIntl && (
                <button
                  type="button"
                  onClick={() => { setPaysIntl(""); setQuery(""); load(""); }}
                  className="text-white/60 hover:text-white flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* ── Panel hôtels du gouvernorat sélectionné ── */}
          {gouvernorat && hotels.length > 0 && !loading && (
            <div className="mt-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-semibold text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-yellow-300" />
                  {hotels.length} hôtel{hotels.length > 1 ? "s" : ""} à <span className="text-yellow-300">{gouvernorat}</span>
                </p>
                <span className="text-white/50 text-xs">Cliquez pour voir les détails</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {hotels.slice(0, 8).map((h, i) => (
                  <button
                    key={h._id}
                    type="button"
                    onClick={() => navigate(hotelDetailUrl(h._id))}
                    className="flex items-center gap-2 bg-white/15 hover:bg-white/30 border border-white/25 hover:border-yellow-400/60 rounded-xl px-3 py-2 transition-all group"
                  >
                    {h.images?.length > 0 ? (
                      <img src={h.images[0]} alt={h.titre}
                        className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-white/30"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-blue-600/50 flex items-center justify-center flex-shrink-0 text-[10px]">🏨</div>
                    )}
                    <div className="text-left">
                      <p className="text-white text-xs font-semibold leading-tight group-hover:text-yellow-300 transition-colors line-clamp-1 max-w-[120px]">
                        {h.titre}
                      </p>
                      <p className="text-white/60 text-[10px] leading-none mt-0.5">
                        {"⭐".repeat(Math.min(h.etoiles ?? 3, 5))}
                        {(h.prixMin ?? 0) > 0 && ` · ${h.prixMin} TND/nuit`}
                      </p>
                    </div>
                  </button>
                ))}
                {hotels.length > 8 && (
                  <button
                    type="button"
                    onClick={() => { /* scroll to results */ }}
                    className="flex items-center gap-1 text-white/70 hover:text-white text-xs px-3 py-2 border border-white/20 rounded-xl hover:border-white/40"
                  >
                    +{hotels.length - 8} autres ↓
                  </button>
                )}
              </div>
            </div>
          )}
          {gouvernorat && hotels.length === 0 && !loading && (
            <div className="mt-3 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white/70 text-sm">
              Aucun hôtel enregistré pour <span className="text-yellow-300 font-medium">{gouvernorat}</span> pour l'instant.
            </div>
          )}

          {/* ── Panel hôtels du pays international sélectionné ── */}
          {paysIntl && hotels.length > 0 && !loading && (
            <div className="mt-3 bg-white/10 backdrop-blur-md border border-yellow-400/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-semibold text-sm flex items-center gap-2">
                  <span className="text-lg">{PAYS_ETRANGERS.find(p => p.pays === paysIntl)?.flag}</span>
                  {hotels.length} hôtel{hotels.length > 1 ? "s" : ""} en <span className="text-yellow-300">{paysIntl}</span>
                </p>
                <span className="text-white/50 text-xs">Cliquez pour réserver</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {hotels.slice(0, 8).map((h) => (
                  <button
                    key={h._id}
                    type="button"
                    onClick={() => navigate(hotelDetailUrl(h._id))}
                    className="flex items-center gap-2 bg-white/15 hover:bg-white/30 border border-white/25 hover:border-yellow-400/60 rounded-xl px-3 py-2 transition-all group"
                  >
                    {h.images?.length > 0 ? (
                      <img src={h.images[0]} alt={h.titre}
                        className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-white/30"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-yellow-500/50 flex items-center justify-center flex-shrink-0 text-[10px]">🌍</div>
                    )}
                    <div className="text-left">
                      <p className="text-white text-xs font-semibold leading-tight group-hover:text-yellow-300 transition-colors line-clamp-1 max-w-[120px]">
                        {h.titre}
                      </p>
                      <p className="text-white/60 text-[10px] leading-none mt-0.5">
                        {"⭐".repeat(Math.min(h.etoiles ?? 3, 5))}
                        {(h.prixMin ?? 0) > 0 && ` · ${h.prixMin} TND/nuit`}
                      </p>
                    </div>
                  </button>
                ))}
                {hotels.length > 8 && (
                  <span className="flex items-center text-white/70 text-xs px-3 py-2 border border-white/20 rounded-xl">
                    +{hotels.length - 8} autres ↓
                  </span>
                )}
              </div>
            </div>
          )}
          {paysIntl && hotels.length === 0 && !loading && (
            <div className="mt-3 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white/70 text-sm">
              Aucun hôtel enregistré en <span className="text-yellow-300 font-medium">{paysIntl}</span> pour l'instant.
            </div>
          )}

          {/* Popular destinations chips */}
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="text-blue-300 text-xs font-medium">Destinations phares :</span>
            {DESTINATIONS_POPULAIRES.map(d => (
              <button key={d.q} type="button"
                onClick={() => { setQuery(d.q); setGouvernorat(""); load(d.q); }}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-full border border-white/20 transition-colors">
                {d.nom}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BANNIÈRE AVANTAGES CLIENTS ════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        {isAuthenticated ? (
          /* Membre connecté → confirmation avantage */
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-tight">
                  Bonjour {user?.prenom} ! Votre remise membre est active 🎉
                </p>
                <p className="text-emerald-100 text-sm mt-0.5">
                  Profitez de <strong>−10% sur toutes vos réservations</strong> — remise appliquée automatiquement à la caisse.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 bg-white/20 rounded-xl px-4 py-2 text-white text-center">
              <p className="text-2xl font-extrabold">−10%</p>
              <p className="text-xs text-emerald-100">sur chaque réservation</p>
            </div>
          </div>
        ) : (
          /* Visiteur non connecté → double carte */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Carte 1 — Invité sans compte */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 flex items-start gap-4">
              <div className="w-11 h-11 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-base">Payez sans créer de compte</p>
                <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                  Réservez et réglez votre séjour en ligne en toute sécurité.
                  <strong className="text-gray-700"> Aucune inscription requise.</strong>
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { icon: "💳", label: "Carte bancaire" },
                    { icon: "🔒", label: "Paiement sécurisé" },
                    { icon: "✅", label: "Confirmation immédiate" },
                  ].map(b => (
                    <span key={b.label} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                      {b.icon} {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Carte 2 — Réduction membre */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-xl p-5 flex items-start gap-4">
              {/* Décoration */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
              <div className="absolute -bottom-4 -right-8 w-32 h-32 bg-white/10 rounded-full" />

              <div className="w-11 h-11 bg-white/25 rounded-2xl flex items-center justify-center flex-shrink-0 relative">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 relative">
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-white text-base">−10% pour les membres</p>
                  <span className="bg-white/30 text-white text-xs px-2 py-0.5 rounded-full font-bold">EXCLUSIF</span>
                </div>
                <p className="text-amber-100 text-sm mt-1 leading-relaxed">
                  Créez un compte <strong className="text-white">gratuitement</strong> et économisez
                  <strong className="text-white"> 10%</strong> sur chaque réservation — remise appliquée à la caisse.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => navigate("/register")}
                    className="flex items-center gap-1.5 bg-white text-amber-700 font-bold px-4 py-1.5 rounded-xl text-sm hover:bg-amber-50 transition-colors shadow-sm"
                  >
                    <Zap className="h-3.5 w-3.5" /> S'inscrire gratuitement
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="text-white/90 hover:text-white text-sm font-medium underline underline-offset-2"
                  >
                    Se connecter
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>


      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 items-start">

          {/* ── SIDEBAR FILTERS ── */}
          <aside className="hidden lg:block w-72 flex-shrink-0 space-y-4">

            {/* Budget */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Votre budget par nuit</h3>
              <div className="space-y-2">
                {[
                  { label: "Moins de 200 TND",    value: "200" },
                  { label: "Moins de 500 TND",    value: "500" },
                  { label: "Moins de 1 000 TND",  value: "1000" },
                  { label: "Moins de 2 000 TND",  value: "2000" },
                  { label: "Tous les budgets",    value: "" },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="budget" checked={budgetMax === opt.value}
                      onChange={() => setBudgetMax(opt.value)}
                      className="accent-blue-600 w-4 h-4" />
                    <span className="text-sm text-gray-700 group-hover:text-blue-600">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Type de logement */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Type de logement</h3>
              <div className="space-y-2">
                {Object.entries(TYPE_LABELS).map(([k, v]) => {
                  const count = hotels.filter(h => h.type === k).length;
                  if (count === 0) return null;
                  return (
                    <label key={k} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={typeFilter.includes(k)}
                        onChange={() => toggleType(k)}
                        className="accent-blue-600 w-4 h-4 rounded" />
                      <span className="text-sm text-gray-700 group-hover:text-blue-600 flex-1">{v}</span>
                      <span className="text-xs text-gray-400">{count}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Formule */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Formule</h3>
              <div className="space-y-2">
                {Object.entries(FORMULE_CONFIG).filter(([k]) => k !== "PRIX_SPECIAL").map(([k, v]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="formule" checked={formule === k}
                      onChange={() => setFormule(formule === k ? "" : k)}
                      className="accent-blue-600 w-4 h-4" />
                    <span className="text-sm text-gray-700 group-hover:text-blue-600">{v.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reset */}
            {(budgetMax || formule || etoilesMin || noteMin || typeFilter.length > 0) && (
              <button
                onClick={() => { setBudgetMax(""); setFormule(""); setEtoilesMin(""); setNoteMin(""); setTypeFilter([]); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" /> Réinitialiser les filtres
              </button>
            )}
          </aside>

          {/* ── RESULTS ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Sort + count bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">
                  {loading ? "Chargement..." : `${results.length} hébergement${results.length !== 1 ? "s" : ""} trouvé${results.length !== 1 ? "s" : ""}`}
                </span>
                {query && !loading && (
                  <span className="text-sm text-gray-500">pour « {query} »</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Recherche par nom d'hôtel (filtrage instantané) */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={nomHotel}
                    onChange={e => setNomHotel(e.target.value)}
                    placeholder="Nom de l'hôtel…"
                    className="w-44 sm:w-56 text-sm border border-gray-200 rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {nomHotel && (
                    <button type="button" onClick={() => setNomHotel("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {/* Mobile filter toggle */}
                <button onClick={() => setFiltersOpen(o => !o)}
                  className="lg:hidden flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtres
                  {(budgetMax || formule || etoilesMin || noteMin || typeFilter.length > 0) && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </button>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="default">Trier : Recommandés</option>
                  <option value="prix_asc">Prix croissant</option>
                  <option value="prix_desc">Prix décroissant</option>
                  <option value="etoiles">Classe (étoiles)</option>
                  <option value="note">Meilleures notes</option>
                </select>
              </div>
            </div>

            {/* Formule quick filter chips */}
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-gray-500 font-medium">Formule :</span>
              {[
                { value: "",              label: "Toutes" },
                { value: "ALL_INCLUSIVE", label: "🌴 All Inclusive"  },
                { value: "DEMI_PENSION",  label: "🍽️ Demi-pension"   },
                { value: "LOGEMENT_SEUL", label: "🛏️ Logement seul"  },
              ].map(f => (
                <button key={f.value} type="button"
                  onClick={() => setFormule(f.value)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    formule === f.value
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Active filters warning banner */}
            {(formule || etoilesMin || budgetMax || noteMin || typeFilter.length > 0) && !loading && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap text-sm text-amber-800">
                  <span className="font-semibold">⚠️ Filtres actifs :</span>
                  {formule && (
                    <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-xs font-bold">
                      Formule : {formule === "ALL_INCLUSIVE" ? "All Inclusive" : formule === "DEMI_PENSION" ? "Demi-pension" : formule === "PRIX_SPECIAL" ? "Prix spécial" : "Logement seul"}
                    </span>
                  )}
                  {etoilesMin && <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-xs font-bold">{"★".repeat(+etoilesMin)}+ étoiles</span>}
                  {budgetMax && <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-xs font-bold">Budget ≤ {budgetMax} TND</span>}
                  {noteMin && <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-xs font-bold">Note {noteMin}+</span>}
                  {typeFilter.map(t => <span key={t} className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-xs font-bold">{t}</span>)}
                  <span className="text-amber-600 text-xs">· Des hébergements peuvent être exclus</span>
                </div>
                <button
                  onClick={() => { setBudgetMax(""); setFormule(""); setEtoilesMin(""); setNoteMin(""); setTypeFilter([]); load(); }}
                  className="flex-shrink-0 text-xs text-amber-700 underline hover:text-amber-900 font-medium whitespace-nowrap"
                >
                  Tout effacer
                </button>
              </div>
            )}

            {/* Loading skeletons */}
            {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
                {error}
              </div>
            )}

            {/* Hotel cards — Booking.com horizontal style */}
            {!loading && !error && results.map((h, idx) => {
              const prix  = h.prixMin ?? 0;
              const note  = Number((h.notesMoyenne || 4.2 + (idx % 3) * 0.3).toFixed(1));
              const rating = getRatingLabel(note);
              const img   = getHotelImg(h, idx);
              const amens = fakeAmenites(idx);
              // formule affichée : celle du filtre actif si l'hôtel la propose, sinon la première
              const mainFormule = (formule && h.formules?.includes(formule))
                ? formule
                : (h.formules?.[0] ?? h.formule ?? null);
              const fmtCfg = mainFormule ? FORMULE_CONFIG[mainFormule] : null;
              const isFav = favorites.has(h._id);
              const nbNuits = dateDebut && dateFin
                ? Math.max(1, Math.ceil((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000))
                : 1;
              const totalEstime = calculerTarif(prix, Number(nbPersonnes) || 1, agesEnfants, nbNuits).total;

              return (
                <div key={h._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer group"
                  onClick={() => navigate(hotelDetailUrl(h._id))}>
                  <div className="flex">
                    {/* Image */}
                    <div className="relative w-60 sm:w-72 flex-shrink-0 overflow-hidden">
                      <img src={img} alt={h.titre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        style={{ minHeight: "220px" }}
                        onError={e => { (e.target as HTMLImageElement).src = HOTEL_IMGS[idx % HOTEL_IMGS.length]; }}
                      />
                      {/* Favorite button */}
                      <button onClick={e => toggleFav(h._id, e)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-white transition-colors">
                        <Heart className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                      </button>
                      {/* Formule badge */}
                      {fmtCfg && (
                        <div className={`absolute bottom-3 left-3 px-2.5 py-1 ${fmtCfg.color} text-white text-xs font-bold rounded-lg shadow`}>
                          {fmtCfg.label}
                        </div>
                      )}
                      {h.chambresDisponibles !== undefined && (
                        <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow">
                          {h.chambresDisponibles} disponible{h.chambresDisponibles > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5 flex flex-col min-w-0">
                      {/* Header: name + stars */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-blue-700 hover:underline truncate group-hover:text-blue-800">
                              {h.titre}
                            </h3>
                            <span className="flex gap-0.5 flex-shrink-0">
                              {Array.from({ length: h.etoiles || 3 }).map((_, i) => (
                                <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              ))}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{h.localisation || h.adresse || "Tunisie"}</span>
                            <span className="text-blue-600 hover:underline cursor-pointer ml-1 flex-shrink-0">Voir sur la carte</span>
                          </div>
                        </div>

                        {/* Rating block */}
                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-xs text-gray-500">{rating.label}</span>
                            <span className={`${rating.bg} text-white text-sm font-bold px-2 py-1 rounded-lg`}>
                              {note.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {Math.floor(note * 15 + idx * 7)} commentaires
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      {h.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{h.description}</p>
                      )}

                      {/* Amenités */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {amens.map(a => {
                          const Icon = a.icon;
                          return (
                            <span key={a.key} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                              <Icon className="h-3 w-3 text-blue-500" /> {a.label}
                            </span>
                          );
                        })}
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {idx % 3 === 0 && (
                          <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                            <CheckCircle className="h-3.5 w-3.5" /> Annulation gratuite
                          </span>
                        )}
                        {idx % 4 === 1 && (
                          <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                            <Shield className="h-3.5 w-3.5" /> Réservation sans risque
                          </span>
                        )}
                        {(h.type === "RESORT" || h.etoiles >= 4) && (
                          <span className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                            <Sparkles className="h-3.5 w-3.5" /> Établissement premium
                          </span>
                        )}
                      </div>

                      {/* Spacer + Price + CTA */}
                      <div className="mt-auto pt-3 flex items-end justify-between">
                        <div className="text-xs text-gray-400 space-y-0.5">
                          <p>{TYPE_LABELS[h.type] || h.type}</p>
                          {(h.chambresCount ?? 0) > 0 && (
                            <p className="text-emerald-600 font-medium">
                              ✓ {h.chambresCount} chambre{h.chambresCount > 1 ? "s" : ""} disponible{h.chambresCount > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {prix > 0 ? (
                            <>
                              <p className="text-[10px] text-gray-400 mb-0.5">À partir de</p>
                              <p className="text-xl font-extrabold text-gray-900">
                                {prix.toLocaleString("fr-FR")} <span className="text-sm font-normal text-gray-500">TND</span>
                              </p>
                              <p className="text-xs text-gray-400">
                                par adulte/nuit · {totalEstime.toLocaleString("fr-FR")} TND total ({nbNuits} nuit{nbNuits > 1 ? "s" : ""}{nbEnfants > 0 ? `, ${nbPersonnes} ad. + ${nbEnfants} enf.` : ""})
                              </p>
                            </>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-500 font-medium">Prix sur demande</p>
                              <p className="text-xs text-gray-400">Contactez-nous</p>
                            </div>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); navigate(hotelDetailUrl(h._id)); }}
                            className="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                          >
                            Voir les disponibilités
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {!loading && !error && results.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 text-center">
                <Search className="h-14 w-14 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-700 font-semibold text-lg">Aucun hébergement trouvé</p>
                <p className="text-gray-400 text-sm mt-1">Essayez une autre destination ou modifiez vos filtres.</p>
                <button onClick={() => { setQuery(""); setGouvernorat(""); setBudgetMax(""); setFormule(""); setEtoilesMin(""); setNoteMin(""); setTypeFilter([]); load(""); }}
                  className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                  Voir tous les hébergements
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
