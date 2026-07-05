import React, { useState, useEffect } from "react";
import { Bot, X } from "lucide-react";
import { aiAPI, reservationsAPI } from "../../../../services/api";
import { prixOffreLeMoinsCher } from "../shared";
import { matchSearch } from "../../../../utils/search";
// ══════════ CHATBOT FLOTTANT ══════════
const RESERVATION_RE      = /r[eé]serv|voyag|partir|excursion|h[oô]tel|s[eé]jour|aller\s+[àa]|je\s+veux|je\s+voudrais/i;
const MES_RESERVATIONS_RE = /mes?\s+r[eé]servations?|mes?\s+voyages?|mes?\s+s[eé]jours?|mes?\s+bookings?|historique|qu.est.ce\s+que\s+j.ai\s+r[eé]serv/i;
const RECOMMANDATIONS_RE  = /recommandations?|recommande[sz]?-?moi|que.me.conseillez|suggestions?\s+pour\s+moi|quoi\s+visiter|que\s+faire|meilleure?s?\s+offres?/i;
const MES_OFFRES_RE       = /offres?\s+(?:de\b|d'|[àa]\b|pour\b|sur\b|en\b|disponibles?|promo)|(?:liste|voir|montre[sz]?|donne[sz]?|affiche[sz]?|propose[sz]?|quelles?|toutes?|vos|les)\b[^.?!]*\boffres?\b/i;

const TYPE_CHAMBRE_LABELS: Record<string, string> = {
  SINGLE: "Single", DOUBLE: "Double", TWIN: "Twin", SUITE: "Suite", FAMILIALE: "Familiale", DELUXE: "Deluxe",
};

const STATUT_COLORS: Record<string, string> = {
  "En attente":  "bg-orange-100 text-orange-700",
  "Confirmée":   "bg-green-100 text-green-700",
  "Annulée":     "bg-red-100 text-red-600",
  "Terminée":    "bg-gray-100 text-gray-500",
};

type ChatMsg =
  | { type: "text"; role: "user" | "assistant"; content: string }
  | { type: "reservations-list"; reservations: any[] }
  | { type: "offres-list"; offers: any[] }
  | { type: "recommandations-list"; offers: any[] }
  | { type: "suggestions"; offers: any[]; extractedData: any }
  | { type: "hotel-list"; hotels: any[]; extractedData: any }
  | { type: "hotel-booking-form"; chambre: any; hotel: any; extractedData: any }
  | { type: "booking-form"; offer: any; extractedData: any }
  | { type: "booking-result"; success: boolean; content: string };

// Formulaire pour réservations EXCURSION / INTERNATIONALE
function BookingFormMsg({ offer, extractedData, onConfirm, onCancel }: {
  offer: any; extractedData: any;
  onConfirm: (data: any) => void; onCancel: () => void;
}) {
  const isExcursion = offer.typeService === "ACTIVITE";
  const [dateDebut, setDateDebut] = useState("");
  const [dateExcursion, setDateExcursion] = useState("");
  const [nbPersonnes, setNbPersonnes] = useState(String(extractedData?.nbPersonnes ?? 1));
  const [numPassport, setNumPassport] = useState("");
  const [paysDestination, setPaysDestination] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const handleConfirm = () => {
    if (isExcursion) {
      if (!dateExcursion) return;
      onConfirm({ typeReservation: "EXCURSION", offreID: offer._id, serviceID: offer.serviceID, dateExcursion, nbPersonnes: parseInt(nbPersonnes) || 1 });
    } else {
      if (!dateDebut) return;
      onConfirm({ typeReservation: "INTERNATIONALE", offreID: offer._id, serviceID: offer.serviceID, dateDepart: dateDebut, nbPersonnes: parseInt(nbPersonnes) || 1, numPassport, paysDestination: offer.localisation || offer.paysDestination || "" });
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm space-y-2 w-full">
      <p className="font-semibold text-blue-800 text-xs uppercase tracking-wide">Réservation — {offer.titre}</p>
      {isExcursion ? (
        <div><label className="text-xs text-gray-500">Date excursion</label><input type="date" min={today} value={dateExcursion} onChange={e => setDateExcursion(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs mt-0.5" /></div>
      ) : (
        <>
          <div><label className="text-xs text-gray-500">Date départ</label><input type="date" min={today} value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs mt-0.5" /></div>
          <div>
            <label className="text-xs text-gray-500">N° Passeport (1 lettre + 7 chiffres)</label>
            <input
              type="text"
              value={numPassport}
              onChange={e => setNumPassport(e.target.value.toUpperCase().slice(0, 8))}
              maxLength={8}
              placeholder="A1234567"
              className={`w-full border rounded px-2 py-1 text-xs mt-0.5 ${numPassport.length > 0 && numPassport.length < 8 ? 'border-red-400' : 'border-gray-200'}`}
            />
            {numPassport.length > 0 && numPassport.length < 8 && (
              <p className="text-red-500 text-[10px] mt-0.5">{8 - numPassport.length} caractère(s) manquant(s)</p>
            )}
          </div>
        </>
      )}
      <div><label className="text-xs text-gray-500">Personnes</label><input type="number" min="1" max="20" value={nbPersonnes} onChange={e => setNbPersonnes(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs mt-0.5" /></div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleConfirm} className="flex-1 bg-blue-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-blue-700 transition-colors">Confirmer</button>
        <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-1.5 text-xs font-semibold hover:bg-gray-200 transition-colors">Annuler</button>
      </div>
    </div>
  );
}

// Formulaire spécifique HÔTEL (chambre déjà sélectionnée, on saisit uniquement les dates)
function HotelBookingFormMsg({ chambre, hotel, extractedData, onConfirm, onCancel }: {
  chambre: any; hotel: any; extractedData: any;
  onConfirm: (data: any) => void; onCancel: () => void;
}) {
  const [dateDebut, setDateDebut] = useState(extractedData?.dateDebut ?? "");
  const [dateFin, setDateFin] = useState(extractedData?.dateFin ?? "");
  const [nbPersonnes, setNbPersonnes] = useState(String(extractedData?.nbPersonnes ?? 1));
  const today = new Date().toISOString().split("T")[0];

  const nbNuits = dateDebut && dateFin
    ? Math.max(1, Math.ceil((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000))
    : 0;
  const montantEstime = nbNuits > 0 ? nbNuits * chambre.prixParNuit : null;

  const handleConfirm = () => {
    if (!dateDebut || !dateFin || new Date(dateFin) <= new Date(dateDebut)) return;
    onConfirm({
      typeReservation: "HOTEL",
      chambreID: chambre._id,
      serviceID: hotel.serviceID,
      dateDebutSejour: dateDebut,
      dateFinSejour: dateFin,
      nbPersonnes: parseInt(nbPersonnes) || 1,
    });
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm space-y-2 w-full">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-blue-800 text-xs uppercase tracking-wide">{hotel.titre}</p>
          <p className="text-xs text-gray-500">{hotel.localisation} {hotel.etoiles ? "⭐".repeat(hotel.etoiles) : ""}</p>
        </div>
        <span className="flex-shrink-0 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
          {TYPE_CHAMBRE_LABELS[chambre.typeChambre] ?? chambre.typeChambre} · ch. {chambre.numeroChambre}
        </span>
      </div>
      <p className="text-xs text-gray-600">{chambre.prixParNuit} TND / nuit · capacité {chambre.capacite} pers.</p>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500">Arrivée</label>
          <input type="date" min={today} value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs mt-0.5" />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500">Départ</label>
          <input type="date" min={dateDebut || today} value={dateFin} onChange={e => setDateFin(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs mt-0.5" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">Personnes</label>
        <input type="number" min="1" max={chambre.capacite ?? 10} value={nbPersonnes} onChange={e => setNbPersonnes(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs mt-0.5" />
      </div>
      {montantEstime !== null && (
        <p className="text-xs font-bold text-blue-700">{nbNuits} nuit(s) · Total estimé : {montantEstime} TND</p>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={handleConfirm} disabled={!dateDebut || !dateFin || new Date(dateFin) <= new Date(dateDebut)} className="flex-1 bg-blue-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40">Confirmer</button>
        <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-1.5 text-xs font-semibold hover:bg-gray-200 transition-colors">Annuler</button>
      </div>
    </div>
  );
}

export function ChatbotWidget({ onReservationCreated, reservations, offres, paidIds }: {
  onReservationCreated?: () => void;
  reservations: any[];
  offres: any[];
  paidIds: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { type: "text", role: "assistant", content: "Bonjour ! Je suis votre assistant SmartTravel. Posez-moi n'importe quelle question : mes réservations, recommandations, offres disponibles, ou dites-moi ce que vous voulez réserver !" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const addMsg = (msg: ChatMsg) => setMessages(prev => [...prev, msg]);
  const textHistory = () => messages.filter((m): m is Extract<ChatMsg, { type: "text" }> => m.type === "text").slice(-8).map(m => ({ role: m.role, content: m.content }));

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    addMsg({ type: "text", role: "user", content: msg });
    setLoading(true);
    try {
      // ── Mes réservations ──
      if (MES_RESERVATIONS_RE.test(msg)) {
        // Detect optional status filter in the question
        let filtered = reservations;
        let statutLabel = "";
        if (/en\s+attente|attente\s+de\s+paiement|non\s+pay[eé]|impay[eé]/i.test(msg)) {
          filtered = reservations.filter(r => !paidIds.has(r.rawId) && r.statut === "En attente");
          statutLabel = " en attente de paiement";
        } else if (/confirm[eé]e?s?|pay[eé]e?s?/i.test(msg)) {
          filtered = reservations.filter(r => paidIds.has(r.rawId) || r.statut === "Confirmée");
          statutLabel = " confirmées";
        } else if (/annul[eé]e?s?/i.test(msg)) {
          filtered = reservations.filter(r => r.statut === "Annulée");
          statutLabel = " annulées";
        } else if (/termin[eé]e?s?|expir[eé]e?s?|pass[eé]e?s?/i.test(msg)) {
          filtered = reservations.filter(r => r.statut === "Terminée");
          statutLabel = " terminées";
        }

        if (filtered.length === 0) {
          addMsg({ type: "text", role: "assistant", content: `Vous n'avez aucune réservation${statutLabel} pour le moment. Souhaitez-vous réserver un hôtel ou une excursion ?` });
        } else {
          addMsg({ type: "text", role: "assistant", content: `Vous avez ${filtered.length} réservation(s)${statutLabel} :` });
          addMsg({ type: "reservations-list", reservations: filtered });
        }
      }
      // ── Recommandations personnalisées ──
      else if (RECOMMANDATIONS_RE.test(msg)) {
        addMsg({ type: "text", role: "assistant", content: "Je calcule vos recommandations personnalisées…" });
        try {
          const rec = await aiAPI.getRecommandations();
          if (rec.recommandations?.length > 0) {
            setMessages(prev => prev.filter(m => !(m.type === "text" && m.role === "assistant" && m.content.includes("calcule"))));
            addMsg({ type: "text", role: "assistant", content: `Voici ${rec.recommandations.length} offre(s) sélectionnée(s) spécialement pour vous :` });
            addMsg({ type: "recommandations-list", offers: rec.recommandations });
          } else {
            setMessages(prev => prev.filter(m => !(m.type === "text" && m.role === "assistant" && m.content.includes("calcule"))));
            addMsg({ type: "text", role: "assistant", content: "Je n'ai pas encore assez d'historique pour vous faire des recommandations personnalisées. Explorez nos offres ci-dessous !" });
            addMsg({ type: "offres-list", offers: offres.slice(0, 6) });
          }
        } catch {
          addMsg({ type: "text", role: "assistant", content: "Service de recommandations indisponible. Voici nos meilleures offres :" });
          addMsg({ type: "offres-list", offers: offres.slice(0, 6) });
        }
      }
      // ── Liste des offres (filtrée par destination si précisée) ──
      else if (MES_OFFRES_RE.test(msg)) {
        // Extrait la destination après "offres de/à/pour/sur/en …"
        const m2 = msg.match(/offres?\s+(?:promotionnelles?\s+)?(?:de\s+|d'|[àa]\s+|pour\s+|sur\s+|en\s+)([\p{L}\s-]+)/iu);
        const dest = m2 ? m2[1].replace(/[?.!]+$/g, "").trim() : "";
        let list = offres;
        if (dest) {
          list = offres.filter((o: any) =>
            matchSearch(`${o.titre ?? ""} ${o.descriptionCourte ?? ""} ${o.serviceID?.titre ?? o.service?.titre ?? ""} ${o.serviceID?.localisation ?? o.service?.localisation ?? ""}`, dest)
          );
        }
        if (list.length === 0) {
          addMsg({ type: "text", role: "assistant", content: dest ? `Aucune offre pour « ${dest} » pour le moment. Souhaitez-vous voir nos hôtels à ${dest} ?` : "Aucune offre disponible pour le moment." });
        } else {
          addMsg({ type: "text", role: "assistant", content: dest ? `Voici les offres pour ${dest} :` : `Voici les ${Math.min(list.length, 8)} offres disponibles :` });
          addMsg({ type: "offres-list", offers: list.slice(0, 8) });
        }
      }
      // ── Intention de réservation ──
      else if (RESERVATION_RE.test(msg)) {
        const res = await aiAPI.reservationIntent(msg);
        if (res.intent === "HOTEL" && res.hotels && res.hotels.length > 0) {
          addMsg({ type: "text", role: "assistant", content: res.reply });
          addMsg({ type: "hotel-list", hotels: res.hotels, extractedData: res.extractedData });
        } else if (res.intent === "RESERVATION" && res.suggestions && res.suggestions.length > 0) {
          addMsg({ type: "text", role: "assistant", content: res.reply });
          addMsg({ type: "suggestions", offers: res.suggestions, extractedData: res.extractedData });
        } else if (res.reply) {
          // NOT_FOUND or empty result — show the backend message directly, no fallback
          addMsg({ type: "text", role: "assistant", content: res.reply });
        } else {
          const chatRes = await aiAPI.chat(msg, textHistory());
          addMsg({ type: "text", role: "assistant", content: chatRes.reply });
        }
      }
      // ── Question générale → GPT avec contexte complet ──
      else {
        const res = await aiAPI.chat(msg, textHistory());
        addMsg({ type: "text", role: "assistant", content: res.reply });
      }
    } catch {
      addMsg({ type: "text", role: "assistant", content: "Désolé, une erreur est survenue. Réessayez plus tard." });
    } finally {
      setLoading(false);
    }
  };

  const chooseOffer = (offer: any, extractedData: any) => {
    setMessages(prev => prev.filter(m => m.type !== "suggestions"));
    addMsg({ type: "booking-form", offer, extractedData });
  };

  const chooseChambre = (chambre: any, hotel: any, extractedData: any) => {
    setMessages(prev => prev.filter(m => m.type !== "hotel-list"));
    addMsg({ type: "hotel-booking-form", chambre, hotel, extractedData });
  };

  const confirmBooking = async (label: string, data: any) => {
    setMessages(prev => prev.filter(m => m.type !== "booking-form" && m.type !== "hotel-booking-form"));
    addMsg({ type: "text", role: "assistant", content: "Traitement de votre réservation…" });
    try {
      await reservationsAPI.create(data);
      addMsg({ type: "booking-result", success: true, content: `Réservation confirmée pour « ${label} » ! Retrouvez-la dans votre espace Réservations.` });
      onReservationCreated?.();
    } catch (err: any) {
      addMsg({ type: "booking-result", success: false, content: `Échec de la réservation : ${err.message || "erreur inconnue"}` });
    }
  };

  const cancelBooking = () => {
    setMessages(prev => prev.filter(m => m.type !== "booking-form" && m.type !== "hotel-booking-form"));
    addMsg({ type: "text", role: "assistant", content: "Réservation annulée. Y a-t-il autre chose que je puisse faire pour vous ?" });
  };

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all"
        title="Assistant SmartTravel">
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: "520px" }}>
          <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Assistant SmartTravel</p>
              <p className="text-blue-200 text-xs">Réservez ou posez vos questions</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0, maxHeight: "380px" }}>
            {messages.map((m, i) => {
              if (m.type === "text") {
                return (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none"}`}>
                      {m.content}
                    </div>
                  </div>
                );
              }
              if (m.type === "reservations-list") {
                return (
                  <div key={i} className="space-y-2">
                    {m.reservations.map((r: any) => {
                      const statut = paidIds.has(r.rawId) ? "Confirmée" : r.statut;
                      const color = STATUT_COLORS[statut] ?? "bg-gray-100 text-gray-500";
                      return (
                        <div key={r.rawId} className="border border-gray-100 rounded-xl p-3 bg-white shadow-sm">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs font-bold text-gray-800 truncate">{r.destination}</p>
                            <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{statut}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                            <span>📅 {r.dateDepart} → {r.dateRetour}</span>
                            <span>👤 {r.nbPersonnes} pers.</span>
                            <span className="text-blue-600 font-semibold">{r.montant.toLocaleString("fr-FR")} TND</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{r.type} · Réf. {r.id}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              if (m.type === "offres-list" || m.type === "recommandations-list") {
                return (
                  <div key={i} className="space-y-2">
                    {m.offers.map((o: any) => (
                      <div key={o._id} className={`border rounded-xl p-3 flex items-center justify-between gap-2 ${m.type === "recommandations-list" ? "bg-purple-50 border-purple-100" : "bg-blue-50 border-blue-100"}`}>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{o.titre}</p>
                          {o.descriptionCourte && <p className="text-xs text-gray-500 truncate">{o.descriptionCourte}</p>}
                          {o.raison && <p className="text-xs text-purple-600 italic truncate">✨ {o.raison}</p>}
                          {o.prixAPartirDe != null && <p className="text-xs font-bold text-blue-700 mt-0.5">À partir de {prixOffreLeMoinsCher(o).toLocaleString("fr-FR")} TND</p>}
                        </div>
                        <button
                          onClick={() => {
                            addMsg({ type: "text", role: "user", content: `Je veux réserver : ${o.titre}` });
                            setMessages(prev => [...prev]);
                            aiAPI.reservationIntent(`je veux réserver ${o.titre}`).then(res => {
                              if (res.intent === "HOTEL" && res.hotels?.length) {
                                addMsg({ type: "text", role: "assistant", content: res.reply });
                                addMsg({ type: "hotel-list", hotels: res.hotels, extractedData: res.extractedData });
                              } else {
                                addMsg({ type: "booking-form", offer: { _id: o._id, titre: o.titre, typeService: o.typeService ?? "DESTINATION", serviceID: o.serviceID }, extractedData: {} });
                              }
                            }).catch(() => {
                              addMsg({ type: "booking-form", offer: { _id: o._id, titre: o.titre, typeService: o.typeService ?? "DESTINATION", serviceID: o.serviceID }, extractedData: {} });
                            });
                          }}
                          className="flex-shrink-0 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                          Réserver
                        </button>
                      </div>
                    ))}
                  </div>
                );
              }
              if (m.type === "hotel-list") {
                return (
                  <div key={i} className="space-y-3">
                    {m.hotels.map((hotel: any) => (
                      <div key={hotel._id} className="border border-blue-100 rounded-xl overflow-hidden bg-white">
                        <div className="bg-blue-50 px-3 py-2 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-gray-800">{hotel.titre}</p>
                            <p className="text-xs text-gray-500">{hotel.localisation}{hotel.etoiles ? ` · ${"★".repeat(hotel.etoiles)}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{hotel.type}</span>
                            {hotel.dateDebutFilter && hotel.dateFinFilter && (
                              <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                {hotel.chambres.filter((c: any) => !c.reservee).length} libre(s)
                              </span>
                            )}
                          </div>
                        </div>
                        {hotel.chambres.length === 0 ? (
                          <p className="text-xs text-gray-400 px-3 py-2 italic">
                            {hotel._noChambres
                              ? "Cet hébergement est disponible mais ses chambres ne sont pas encore configurées. Contactez l'agence pour réserver."
                              : "Aucune chambre enregistrée"}
                          </p>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {hotel.chambres.map((chambre: any) => (
                              <div key={chambre._id} className={`px-3 py-2 flex items-center justify-between gap-2 ${chambre.reservee ? "opacity-50 bg-gray-50" : ""}`}>
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-semibold text-gray-700">{TYPE_CHAMBRE_LABELS[chambre.typeChambre] ?? chambre.typeChambre}</span>
                                    <span className="text-xs text-gray-400">· ch. {chambre.numeroChambre}</span>
                                    {chambre.reservee && <span className="text-xs text-red-600 bg-red-100 px-1.5 rounded-full">Occupée</span>}
                                  </div>
                                  <p className="text-xs text-blue-700 font-bold mt-0.5">{chambre.prixParNuit} TND/nuit · {chambre.capacite} pers.</p>
                                </div>
                                {chambre.reservee ? (
                                  <span className="flex-shrink-0 text-xs text-gray-400 px-3 py-1.5">Indispo.</span>
                                ) : (
                                  <button onClick={() => chooseChambre(chambre, hotel, m.extractedData)}
                                    className="flex-shrink-0 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                                    Choisir
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }
              if (m.type === "suggestions") {
                return (
                  <div key={i} className="space-y-2">
                    {m.offers.map((offer: any) => (
                      <div key={offer._id} className="border border-blue-100 rounded-xl p-3 bg-blue-50 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{offer.titre}</p>
                          <p className="text-xs text-gray-500 truncate">{offer.descriptionCourte}</p>
                          {offer.prixAPartirDe && <p className="text-xs font-bold text-blue-700 mt-0.5">À partir de {prixOffreLeMoinsCher(offer).toLocaleString("fr-FR")} TND</p>}
                        </div>
                        <button onClick={() => chooseOffer(offer, m.extractedData)}
                          className="flex-shrink-0 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                          Choisir
                        </button>
                      </div>
                    ))}
                  </div>
                );
              }
              if (m.type === "hotel-booking-form") {
                return (
                  <div key={i} className="flex justify-start w-full">
                    <div className="w-full max-w-[98%]">
                      <HotelBookingFormMsg
                        chambre={m.chambre}
                        hotel={m.hotel}
                        extractedData={m.extractedData}
                        onConfirm={(data) => confirmBooking(`${m.hotel.titre} — ${TYPE_CHAMBRE_LABELS[m.chambre.typeChambre] ?? m.chambre.typeChambre}`, data)}
                        onCancel={cancelBooking}
                      />
                    </div>
                  </div>
                );
              }
              if (m.type === "booking-form") {
                return (
                  <div key={i} className="flex justify-start w-full">
                    <div className="w-full max-w-[98%]">
                      <BookingFormMsg
                        offer={m.offer}
                        extractedData={m.extractedData}
                        onConfirm={(data) => confirmBooking(m.offer.titre, data)}
                        onCancel={cancelBooking}
                      />
                    </div>
                  </div>
                );
              }
              if (m.type === "booking-result") {
                return (
                  <div key={i} className="flex justify-start">
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed rounded-bl-none ${m.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {m.content}
                    </div>
                  </div>
                );
              }
              return null;
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-xl rounded-bl-none text-sm">
                  <span className="inline-flex gap-1">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ex: hôtel double à Hammamet pour 2 personnes…" disabled={loading}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" />
            <button onClick={send} disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 text-sm font-medium">
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
