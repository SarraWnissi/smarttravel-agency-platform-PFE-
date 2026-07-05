import React, { useState, useRef, useEffect } from "react";
import { Search, Sparkles, MapPin, Star, ChevronRight, X, MessageSquare, Send, Bot, Filter } from "lucide-react";
import { useNavigate } from "react-router";
import { hebergementsAPI, aiAPI } from "../../../services/api";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";

const HOTEL_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800",
  "https://images.unsplash.com/photo-1549294413-26f195200c16?w=800",
];

const TYPE_LABELS: Record<string, string> = {
  HOTEL: "Hôtel", RESORT: "Resort", VILLA: "Villa",
  APPARTEMENT: "Appartement", AUBERGE: "Auberge",
  CAMPING: "Camping", BUNGALOW: "Bungalow",
};

const EXAMPLE_CHIPS = [
  "piscine", "Wi-Fi", "appartement", "all inclusive",
  "vue mer", "très bons commentaires", "spa", "famille",
  "parking", "villa luxe", "demi-pension", "plage",
];

const EXAMPLES = [
  "Je veux un hébergement avec annulation gratuite et de très bons commentaires",
  "Appartement avec piscine pour 4 personnes",
  "Hôtel 4 étoiles avec spa, budget 300 TND",
  "Villa vue mer en bord de plage",
  "Resort all inclusive pour famille",
];

interface ParsedFilters {
  q: string;
  type?: string;
  formule?: string;
  etoilesMin?: string;
  budgetMax?: string;
  nbPersonnes?: string;
}

function parseNaturalQuery(text: string): ParsedFilters {
  const lower = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  let type: string | undefined;
  let formule: string | undefined;
  let etoilesMin: string | undefined;
  let budgetMax: string | undefined;
  let nbPersonnes: string | undefined;

  // ── Type ──
  const typeMap: [RegExp, string][] = [
    [/\bappartement\b/, "APPARTEMENT"],
    [/\bvilla\b/, "VILLA"],
    [/\bresort\b/, "RESORT"],
    [/\bauberge\b/, "AUBERGE"],
    [/\bcamping\b/, "CAMPING"],
    [/\bbungalow\b/, "BUNGALOW"],
    [/\bhotel\b/, "HOTEL"],
  ];
  for (const [re, val] of typeMap) {
    if (re.test(lower)) { type = val; break; }
  }

  // ── Formule ──
  if (/all\s*inclusive|tout\s*inclus/.test(lower)) formule = "ALL_INCLUSIVE";
  else if (/demi.pension/.test(lower)) formule = "DEMI_PENSION";
  else if (/prix\s*special/.test(lower)) formule = "PRIX_SPECIAL";
  else if (/logement\s*seul|sans\s*pension/.test(lower)) formule = "LOGEMENT_SEUL";

  // ── Qualité → étoiles ──
  if (/tres\s*bons?|excellents?|top\s*avis|meilleurs?\s*comment|tres\s*bien\s*not/.test(lower)) {
    etoilesMin = "4";
  } else if (/bons?\s*comment|bien\s*not|bonne\s*note/.test(lower)) {
    etoilesMin = "3";
  }

  // ── Budget ──
  const bm =
    lower.match(/moins\s*de\s*(\d+)/) ||
    lower.match(/budget\s*[:\s]*(\d+)/) ||
    lower.match(/(\d+)\s*(?:tnd|dt|dinar)/);
  if (bm) budgetMax = bm[1];

  // ── Personnes ──
  const pm =
    lower.match(/(\d+)\s*(?:personnes?|adultes?|voyageurs?)/) ||
    lower.match(/pour\s*(\d+)/);
  if (pm) nbPersonnes = pm[1];
  else if (/famille/.test(lower)) nbPersonnes = "4";

  // ── Q : retirer les mots structurés et garder les amenities ──
  let q = text
    .replace(/\b(appartement|villa|resort|auberge|camping|bungalow|hôtel|hotel)\b/gi, "")
    .replace(/all\s*inclusive|tout\s*inclus|demi.pension|prix\s*spécial|logement\s*seul|sans\s*pension/gi, "")
    .replace(/très\s*bons?\s*commentaires?|excellents?\s*avis|bonne\s*note|bien\s*noté/gi, "")
    .replace(/moins\s*de\s*\d+|budget\s*[\d]+|pour\s*\d+\s*personnes?|famille/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Si q est vide mais il y avait du texte, utiliser le texte d'origine
  if (!q && text.trim()) q = text.trim();

  return { q, type, formule, etoilesMin, budgetMax, nbPersonnes };
}

function getHotelImage(h: any, idx: number) {
  if (h.images && h.images.length > 0) return h.images[0];
  return HOTEL_IMAGES[idx % HOTEL_IMAGES.length];
}

type ChatMsg = { role: "user" | "assistant"; content: string; hotels?: any[] };

// Rendu du texte avec liens cliquables (Google Maps, images...)
function renderWithLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all hover:text-blue-800">
        {part.includes("maps") ? "📍 Voir sur la carte" : part.includes("http") && /\.(jpg|jpeg|png|webp|avif)/i.test(part) ? "🖼️ Voir la photo" : part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function SmartSearch() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"filtres" | "assistant">("assistant");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [parsedFilters, setParsedFilters] = useState<ParsedFilters | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [fallbackUsed, setFallbackUsed] = useState(false);

  // ── Assistant IA conversationnel ──
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "Bonjour ! 👋 Je suis l'assistant SmartTravel. Posez-moi vos questions : prix, hôtels par destination, disponibilités, offres... Je réponds en me basant sur notre catalogue réel." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const sendChat = async (text?: string) => {
    const question = (text ?? chatInput).trim();
    if (!question || chatLoading) return;
    setChatInput("");
    const newMsgs: ChatMsg[] = [...chatMessages, { role: "user", content: question }];
    setChatMessages(newMsgs);
    setChatLoading(true);
    try {
      const hist = newMsgs.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await aiAPI.assistant(question, hist);
      setChatMessages(prev => [...prev, { role: "assistant", content: res.reply, hotels: res.hotels }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Désolé, le service est temporairement indisponible. Réessayez." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const SUGGESTIONS_IA = [
    "Quels hôtels avez-vous à Djerba ?",
    "Quel est le prix de l'hôtel Palm Djerba ?",
    "Avez-vous des offres promotionnelles ?",
    "Hôtels avec piscine et spa ?",
  ];

  const handleSearch = async () => {
    const text = query.trim();
    if (!text) return;

    setLoading(true);
    setSearched(true);
    setFallbackUsed(false);

    const filters = parseNaturalQuery(text);
    setParsedFilters(filters);

    try {
      // ── Tentative 1 : recherche complète avec tous les filtres ──
      const params = new URLSearchParams();
      if (filters.q)         params.set("q",          filters.q);
      if (filters.type)      params.set("type",        filters.type);
      if (filters.formule)   params.set("formule",     filters.formule);
      if (filters.etoilesMin) params.set("etoilesMin", filters.etoilesMin);
      if (filters.budgetMax) params.set("budgetMax",   filters.budgetMax);
      if (filters.nbPersonnes) params.set("nbPersonnes", filters.nbPersonnes);

      let data: any[] = await hebergementsAPI.search(params.toString());

      // ── Tentative 2 : si aucun résultat et il y avait un q, retirer le q ──
      if (data.length === 0 && filters.q) {
        const params2 = new URLSearchParams();
        if (filters.type)      params2.set("type",        filters.type);
        if (filters.formule)   params2.set("formule",     filters.formule);
        if (filters.etoilesMin) params2.set("etoilesMin", filters.etoilesMin);
        if (filters.budgetMax) params2.set("budgetMax",   filters.budgetMax);
        if (filters.nbPersonnes) params2.set("nbPersonnes", filters.nbPersonnes);

        if (params2.toString()) {
          data = await hebergementsAPI.search(params2.toString());
        }
      }

      // ── Tentative 3 : fallback vers tous les hébergements ──
      if (data.length === 0) {
        data = await hebergementsAPI.getAll();
        if (data.length > 0) setFallbackUsed(true);
      }

      setResults(data);
    } catch (err) {
      // En cas d'erreur réseau, tenter getAll()
      try {
        const all = await hebergementsAPI.getAll();
        setFallbackUsed(true);
        setResults(all);
      } catch {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const addChip = (chip: string) => {
    setQuery(prev => prev ? `${prev}, ${chip}` : chip);
  };

  const useExample = () => {
    setQuery(EXAMPLES[exampleIndex % EXAMPLES.length]);
    setExampleIndex(i => i + 1);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setParsedFilters(null);
    setFallbackUsed(false);
  };

  const activeFiltersCount = parsedFilters
    ? [parsedFilters.type, parsedFilters.formule, parsedFilters.etoilesMin, parsedFilters.budgetMax, parsedFilters.nbPersonnes]
        .filter(Boolean).length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#0a1628] via-[#0d2044] to-[#0a1628] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 px-4 py-1.5 rounded-full text-sm mb-6">
            <Sparkles className="h-4 w-4" />
            Filtres intelligents
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Que recherchez-vous ?
          </h1>
          <p className="text-blue-200/80 text-lg mb-6">
            Posez vos questions à notre assistant IA ou recherchez par filtres intelligents.
          </p>

          {/* ── Toggle de mode ── */}
          <div className="inline-flex items-center gap-1 bg-white/10 rounded-xl p-1 mb-8">
            <button
              onClick={() => setMode("assistant")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "assistant" ? "bg-blue-600 text-white shadow" : "text-blue-200 hover:text-white"
              }`}
            >
              <Bot className="h-4 w-4" /> Assistant IA
            </button>
            <button
              onClick={() => setMode("filtres")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "filtres" ? "bg-blue-600 text-white shadow" : "text-blue-200 hover:text-white"
              }`}
            >
              <Filter className="h-4 w-4" /> Recherche par filtres
            </button>
          </div>

          {/* ══ MODE ASSISTANT IA ══ */}
          {mode === "assistant" && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden text-left">
              {/* Fil de discussion */}
              <div className="h-[380px] overflow-y-auto p-5 space-y-4 bg-gray-50/50">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] ${m.role === "user" ? "order-2" : ""}`}>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                        m.role === "user"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white border border-gray-100 text-gray-700 rounded-bl-sm shadow-sm"
                      }`}>
                        {m.role === "assistant" && (
                          <div className="flex items-center gap-1.5 mb-1 text-blue-600 font-semibold text-xs">
                            <Bot className="h-3.5 w-3.5" /> Assistant SmartTravel
                          </div>
                        )}
                        {m.role === "assistant" ? renderWithLinks(m.content) : m.content}
                      </div>
                      {/* Hôtels suggérés */}
                      {m.hotels && m.hotels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.hotels.map((h: any) => (
                            <button
                              key={h._id}
                              onClick={() => navigate(`/hotels/${h._id}`)}
                              className="flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-400 rounded-lg px-2.5 py-1.5 transition-colors text-left group"
                            >
                              {h.images?.[0] && (
                                <img src={h.images[0]} alt="" className="w-7 h-7 rounded object-cover" />
                              )}
                              <div>
                                <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 line-clamp-1 max-w-[140px]">{h.titre}</p>
                                <p className="text-[10px] text-gray-400">{h.localisation}{h.prixMin ? ` · ${h.prixMin} TND` : ""}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggestions rapides */}
              <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-gray-100 bg-white">
                {SUGGESTIONS_IA.map(s => (
                  <button
                    key={s}
                    onClick={() => sendChat(s)}
                    className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Saisie */}
              <div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
                  placeholder="Posez votre question…"
                  className="flex-1 px-4 py-2.5 text-gray-800 text-sm focus:outline-none"
                />
                <button
                  onClick={() => sendChat()}
                  disabled={!chatInput.trim() || chatLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2.5 rounded-xl transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ══ MODE FILTRES ══ */}
          {mode === "filtres" && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="relative">
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleSearch(); }}
                rows={3}
                placeholder={`Exemple : ${EXAMPLES[0]}`}
                className="w-full px-5 py-5 text-gray-800 text-base resize-none focus:outline-none placeholder-gray-400 leading-relaxed"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Chips d'exemple */}
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {EXAMPLE_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => addChip(chip)}
                  className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  + {chip}
                </button>
              ))}
            </div>

            {/* Footer de la zone de saisie */}
            <div className="px-4 pb-4 pt-1 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                onClick={useExample}
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors underline underline-offset-2"
              >
                Voir un exemple
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 hidden sm:inline">Ctrl+Entrée pour lancer</span>
                <button
                  onClick={handleSearch}
                  disabled={!query.trim() || loading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-md disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Trouver des hébergements
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Astuce (mode filtres uniquement) */}
          {mode === "filtres" && (
            <p className="mt-4 text-blue-300/60 text-xs">
              Saisissez des termes tels que «&nbsp;piscine&nbsp;», «&nbsp;Wi-Fi&nbsp;» ou encore «&nbsp;appartement&nbsp;».
            </p>
          )}
        </div>
      </section>

      {/* ── Résultats (mode filtres uniquement) ── */}
      {mode === "filtres" && (
      <section className="max-w-7xl mx-auto px-4 py-10">

        {/* Filtres détectés */}
        {parsedFilters && activeFiltersCount > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Filtres détectés :</span>
            {parsedFilters.type && (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                {TYPE_LABELS[parsedFilters.type] ?? parsedFilters.type}
              </span>
            )}
            {parsedFilters.formule && (
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-medium">
                {parsedFilters.formule.replace(/_/g, " ")}
              </span>
            )}
            {parsedFilters.etoilesMin && (
              <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full font-medium">
                <Star className="h-3 w-3 fill-yellow-500" />
                {parsedFilters.etoilesMin}+ étoiles
              </span>
            )}
            {parsedFilters.budgetMax && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">
                ≤ {parsedFilters.budgetMax} TND
              </span>
            )}
            {parsedFilters.nbPersonnes && (
              <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-medium">
                {parsedFilters.nbPersonnes} pers.
              </span>
            )}
            {parsedFilters.q && parsedFilters.q !== query && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">
                mots-clés : «&nbsp;{parsedFilters.q.slice(0, 30)}{parsedFilters.q.length > 30 ? "…" : ""}&nbsp;»
              </span>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Analyse de votre recherche…</p>
          </div>
        )}

        {/* Aucun résultat */}
        {!loading && searched && results.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-7 w-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucun hébergement trouvé</h3>
            <p className="text-gray-500 mb-6">
              Essayez d'autres termes ou élargissez vos critères.
            </p>
            <button
              onClick={clearSearch}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Nouvelle recherche
            </button>
          </div>
        )}

        {/* Résultats */}
        {!loading && results.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {results.length} hébergement{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""}
                </h2>
                {fallbackUsed && (
                  <p className="text-sm text-amber-600 mt-0.5">
                    Aucun résultat exact — voici tous nos hébergements disponibles.
                  </p>
                )}
              </div>
              <button
                onClick={clearSearch}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
              >
                <X className="h-4 w-4" /> Réinitialiser
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((h: any, idx: number) => {
                const img = getHotelImage(h, idx);
                const stars = h.etoiles ?? 3;
                const priceMin = h.prixMin ?? null;
                return (
                  <div
                    key={h._id}
                    className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-1"
                  >
                    <div className="relative h-52 overflow-hidden">
                      <ImageWithFallback
                        src={img}
                        alt={h.titre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                        {TYPE_LABELS[h.type] ?? h.type ?? "Hôtel"}
                      </div>
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {stars}
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">{h.titre}</h3>
                      {h.localisation && (
                        <p className="text-gray-400 text-sm flex items-center gap-1 mb-3">
                          <MapPin className="h-3.5 w-3.5" />
                          {h.localisation}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                        <div>
                          {(h.prixMin ?? priceMin) && isFinite(h.prixMin ?? priceMin) ? (
                            <>
                              <p className="text-xs text-gray-400">À partir de</p>
                              <p className="text-lg font-bold text-blue-600">
                                {(h.prixMin ?? priceMin).toLocaleString("fr-FR")} TND
                                <span className="text-xs font-normal text-gray-400"> /nuit</span>
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Prix sur demande</p>
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`/hotels/${h._id}`)}
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                        >
                          Voir
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* État initial (pas encore cherché) */}
        {!loading && !searched && (
          <div className="text-center py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {[
                { icon: "🏊", label: "Piscine", q: "piscine" },
                { icon: "📶", label: "Wi-Fi gratuit", q: "wifi" },
                { icon: "🏖️", label: "Vue mer", q: "vue mer" },
                { icon: "👨‍👩‍👧", label: "Familial", q: "famille" },
                { icon: "🧘", label: "Spa & bien-être", q: "spa" },
                { icon: "🌿", label: "All Inclusive", q: "all inclusive" },
                { icon: "🅿️", label: "Parking", q: "parking" },
                { icon: "⭐", label: "Très bien noté", q: "très bons commentaires" },
              ].map(item => (
                <button
                  key={item.q}
                  onClick={() => { setQuery(item.q); }}
                  className="group flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <span className="text-2xl mb-2">{item.icon}</span>
                  <span className="text-sm text-gray-700 font-medium group-hover:text-blue-600">{item.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-8 text-gray-400 text-sm">
              Cliquez sur une catégorie ou saisissez votre propre description
            </p>
          </div>
        )}
      </section>
      )}
    </div>
  );
}
