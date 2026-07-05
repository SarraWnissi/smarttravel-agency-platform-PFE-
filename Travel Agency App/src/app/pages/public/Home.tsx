import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Calendar, Users, Star, MessageSquare, X, Tag, Sparkles } from "lucide-react";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";
import { avisAPI, aiAPI, servicesAPI, offresAPI } from "../../../services/api";
import { useNavigate } from "react-router";
import { useLanguage } from "../../contexts/LanguageContext";

const DEST_IMAGES: Record<string, string> = {
  paris:      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop",
  istanbul:   "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&auto=format&fit=crop",
  dubai:      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&fit=crop",
  barcelone:  "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&auto=format&fit=crop",
  rome:       "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop",
  marrakech:  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&auto=format&fit=crop",
  londres:    "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop",
  london:     "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop",
  "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop",
  maldives:   "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&auto=format&fit=crop",
  bali:       "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&auto=format&fit=crop",
  tunis:      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&auto=format&fit=crop",
  hammamet:   "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop",
  djerba:     "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800&auto=format&fit=crop",
  tozeur:     "https://images.unsplash.com/photo-1559626641-6cb30e3becc5?w=800&auto=format&fit=crop",
  sousse:     "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&auto=format&fit=crop",
  douz:       "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&auto=format&fit=crop",
  tabarka:    "https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&auto=format&fit=crop",
  carthage:   "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&auto=format&fit=crop",
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&auto=format&fit=crop",
];

export function getImageForLocation(localisation: string, index = 0): string {
  if (!localisation) return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  const loc = localisation.toLowerCase();
  for (const [key, url] of Object.entries(DEST_IMAGES)) {
    if (loc.includes(key)) return url;
  }
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-green-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
];

function getInitials(firstname: string, lastname: string) {
  return ((firstname?.[0] ?? "") + (lastname?.[0] ?? "")).toUpperCase() || "?";
}

function getAvatarColor(name: string) {
  const code = (name ?? "").charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

const OFFER_GRADIENTS = [
  "from-blue-600 to-cyan-500",
  "from-purple-600 to-pink-500",
  "from-orange-500 to-red-500",
  "from-green-500 to-teal-500",
  "from-indigo-600 to-blue-400",
  "from-rose-500 to-orange-400",
];

function HomeChatbot() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: t("chatbot_greeting") },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const history = messages.slice(-8);
      const res = await aiAPI.chat(msg, history);
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: t("chatbot_unavailable") }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all"
        title="Assistant SmartTravel"
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: "420px" }}>
          <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Assistant SmartTravel</p>
              <p className="text-blue-200 text-xs">{t("chatbot_always")}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0, maxHeight: "280px" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-xl rounded-bl-none">
                  <span className="inline-flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder={t("chatbot_placeholder")}
              disabled={loading}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 text-sm font-medium"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [avis, setAvis] = useState<any[]>([]);
  const [loadingAvis, setLoadingAvis] = useState(true);
  const [popularDests, setPopularDests] = useState<any[]>([]);
  const [loadingDests, setLoadingDests] = useState(true);
  const [offres, setOffres] = useState<any[]>([]);
  const [loadingOffres, setLoadingOffres] = useState(true);
  const [searchDestination, setSearchDestination] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchPersonnes, setSearchPersonnes] = useState("1");

  useEffect(() => {
    avisAPI.getAll()
      .then(data => setAvis(data))
      .catch(() => setAvis([]))
      .finally(() => setLoadingAvis(false));

    servicesAPI.getAll()
      .then((data: any[]) => setPopularDests(data.filter(s => s.typeService === "DESTINATION").slice(0, 6)))
      .catch(() => setPopularDests([]))
      .finally(() => setLoadingDests(false));

    offresAPI.getAll()
      .then((data: any[]) => setOffres(data.filter((o: any) => o.disponible !== false).slice(0, 6)))
      .catch(() => setOffres([]))
      .finally(() => setLoadingOffres(false));
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchDestination.trim()) params.set("destination", searchDestination.trim());
    if (searchDate) params.set("dateDepart", searchDate);
    if (searchPersonnes && searchPersonnes !== "1") params.set("personnes", searchPersonnes);
    navigate(`/offers?${params.toString()}`);
  };

  const displayedAvis = avis.slice(0, 6);

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative h-[700px] flex items-center justify-center">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920"
          alt="Luxury Travel"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
<div className="relative z-10 text-center text-white max-w-5xl mx-auto px-4">
          <h1 className="text-6xl md:text-7xl mb-6">{t("hero_title")}</h1>
          <p className="text-2xl md:text-3xl mb-8 text-white/90">{t("hero_subtitle")}</p>

          {/* Lien Recherche IA */}
          <div className="mb-6">
            <button
              onClick={() => navigate("/smart-search")}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4 text-blue-400" />
              {t("smart_search_try")}
            </button>
          </div>

          {/* Barre de recherche */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("search_placeholder")}
                  value={searchDestination}
                  onChange={e => setSearchDestination(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={searchDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={e => setSearchDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  max="20"
                  placeholder={t("search_persons")}
                  value={searchPersonnes}
                  onChange={e => setSearchPersonnes(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <button
                onClick={handleSearch}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Search className="h-5 w-5" />
                {t("search_btn")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Offres Spéciales ── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-5xl mb-4">{t("special_offers")}</h2>
            <p className="text-xl text-gray-600">{t("special_offers_desc")}</p>
          </div>

          {loadingOffres ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-6 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-10 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : offres.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Tag className="h-8 w-8 text-blue-400" />
              </div>
              <p className="text-gray-500 text-lg">{t("no_offers")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {offres.map((offre: any, index: number) => {
                const gradient = OFFER_GRADIENTS[index % OFFER_GRADIENTS.length];
                const hasDiscount = offre.reduction && offre.reduction > 0;
                return (
                  <div
                    key={offre._id}
                    className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    {/* Bandeau coloré */}
                    <div className={`h-44 bg-gradient-to-br ${gradient} relative flex items-center justify-center`}>
                      {hasDiscount && (
                        <div className="absolute top-4 right-4 bg-white text-red-600 font-bold text-sm px-3 py-1 rounded-full shadow-md">
                          -{offre.reduction}% {t("reduction")}
                        </div>
                      )}
                      <div className="text-center text-white px-6">
                        <Tag className="h-10 w-10 mx-auto mb-2 opacity-80" />
                        {offre.localisation && (
                          <p className="text-white/90 text-sm flex items-center justify-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {offre.localisation}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{offre.titre}</h3>
                      {offre.description && (
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{offre.description}</p>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs text-gray-400">{t("from")}</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-blue-600">
                              {offre.prix?.toLocaleString("fr-FR") ?? offre.prixAPartirDe?.toLocaleString("fr-FR") ?? "—"} TND
                            </span>
                            {hasDiscount && offre.prixOriginal && (
                              <span className="text-sm text-gray-400 line-through">
                                {offre.prixOriginal.toLocaleString("fr-FR")} TND
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-gray-500 text-sm">{t("per_person")}</span>
                      </div>

                      <button
                        onClick={() => navigate(`/booking?offreId=${offre._id}`)}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
                      >
                        {t("book_now")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Témoignages ── */}
      <section className="bg-gradient-to-br from-blue-50 to-cyan-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-5xl mb-4">{t("testimonials")}</h2>
            <p className="text-xl text-gray-600">{t("testimonials_desc")}</p>
          </div>

          {loadingAvis && (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loadingAvis && displayedAvis.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-blue-400" />
              </div>
              <p className="text-gray-500 text-lg">{t("no_reviews")}</p>
              <p className="text-gray-400 text-sm mt-1">{t("book_share")}</p>
            </div>
          )}

          {!loadingAvis && displayedAvis.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedAvis.map((av) => {
                const firstname = av.clientID?.firstname ?? "";
                const lastname = av.clientID?.lastname ?? "";
                const fullName = `${firstname} ${lastname}`.trim() || "Client";
                const initials = getInitials(firstname, lastname);
                const avatarColor = getAvatarColor(firstname);
                const note = av.note ?? 5;
                return (
                  <div key={av._id} className="bg-white p-8 rounded-2xl shadow-lg">
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${i <= note ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-6 text-lg line-clamp-4">
                      "{av.commentaire || "Très bonne expérience !"}"
                    </p>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                        {initials}
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">{fullName}</p>
                        <p className="text-sm text-gray-400">
                          {av.dateAvis
                            ? new Date(av.dateAvis).toLocaleDateString("fr-FR", { year: "numeric", month: "long" })
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <HomeChatbot />
    </div>
  );
}
