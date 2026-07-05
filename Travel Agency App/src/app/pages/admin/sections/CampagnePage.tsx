import React, { useState, useEffect } from "react";
import {
  Send, CheckSquare, Square, Percent, Calendar, FileText,
  CheckCircle, AlertCircle, Loader2, History, ChevronDown, ChevronUp,
  Mail, Hotel, Zap,
} from "lucide-react";
import { hebergementsAPI } from "../../../../services/api";
import { matchSearch } from "../../../../utils/search";

const BASE_URL = "http://localhost:3001";
function authHeader() {
  const t = localStorage.getItem("st_token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function lancerCampagne(payload: object) {
  const r = await fetch(`${BASE_URL}/api/campagnes/lancer`, {
    method: "POST", headers: authHeader(), body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message ?? "Erreur serveur");
  return j;
}

async function getHistorique() {
  const r = await fetch(`${BASE_URL}/api/campagnes/historique`, { headers: authHeader() });
  return r.json();
}

type Hotel = { _id: string; titre: string; localisation: string; etoiles: number; type: string };
type LogEntry = { id: string; date: string; hotels: number; reduction: number; dateDebut: string; dateFin: string; n8nStatus: string; admin: string };

export function CampagnePage() {
  const [hotels,   setHotels]   = useState<Hotel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reduction, setReduction] = useState("20");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin,   setDateFin]   = useState("");
  const [details,   setDetails]   = useState("");
  const [sending,   setSending]   = useState(false);
  const [result,    setResult]    = useState<{ ok: boolean; msg: string; n8n?: string } | null>(null);
  const [historique, setHistorique] = useState<LogEntry[]>([]);
  const [showHisto,  setShowHisto]  = useState(false);
  const [searchHotel, setSearchHotel] = useState("");

  useEffect(() => {
    hebergementsAPI.getAll().then(setHotels).catch(() => {});
    getHistorique().then(setHistorique).catch(() => {});
  }, []);

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelected(new Set(filteredHotels.map(h => h._id)));
  const clearAll  = () => setSelected(new Set());

  const filteredHotels = hotels.filter(h =>
    !searchHotel || matchSearch(h.titre, searchHotel) || matchSearch(h.localisation, searchHotel)
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (selected.size === 0) { setResult({ ok: false, msg: "Sélectionnez au moins un hôtel." }); return; }
    if (!reduction || +reduction <= 0 || +reduction > 100) { setResult({ ok: false, msg: "Le pourcentage doit être entre 1 et 100." }); return; }
    if (!dateDebut || !dateFin) { setResult({ ok: false, msg: "Veuillez saisir les deux dates." }); return; }
    if (new Date(dateFin) < new Date(dateDebut)) { setResult({ ok: false, msg: "La date de fin doit être après la date de début." }); return; }

    setSending(true);
    try {
      const selectedHotels = hotels
        .filter(h => selected.has(h._id))
        .map(h => ({ id: h._id, nom: h.titre, localisation: h.localisation }));

      const data = await lancerCampagne({
        hotels:    selectedHotels,
        reduction: +reduction,
        dateDebut, dateFin, details,
      });

      setResult({ ok: true, msg: data.message, n8n: data.n8nStatus });
      const hist = await getHistorique();
      setHistorique(hist);
    } catch (e: any) {
      setResult({ ok: false, msg: e.message });
    } finally {
      setSending(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 max-w-5xl pb-0">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0a1628] flex items-center gap-2">
          <Zap className="h-6 w-6 text-amber-500" /> Campagnes promotionnelles
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Configurez une promotion multi-hôtels et déclenchez l'envoi email automatique via n8n.
        </p>
      </div>

      {/* Pipeline visual */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { n: "N-01", label: "Formulaire admin",     icon: FileText,     color: "blue"   },
          { n: "N-02", label: "Webhook → n8n",        icon: Zap,          color: "purple" },
          { n: "N-03", label: "Liste clients opt-in", icon: Mail,         color: "teal"   },
          { n: "N-04", label: "Emails personnalisés", icon: Send,         color: "green"  },
        ].map((s, i) => (
          <div key={s.n} className={`relative bg-white border border-gray-100 rounded-xl p-3 shadow-sm`}>
            {i < 3 && (
              <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 text-gray-300 text-lg">›</div>
            )}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
              s.color === "blue"   ? "bg-blue-100"   :
              s.color === "purple" ? "bg-purple-100" :
              s.color === "teal"   ? "bg-teal-100"   : "bg-emerald-100"
            }`}>
              <s.icon className={`h-4 w-4 ${
                s.color === "blue"   ? "text-blue-600"   :
                s.color === "purple" ? "text-purple-600" :
                s.color === "teal"   ? "text-teal-600"   : "text-emerald-600"
              }`} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">{s.n}</p>
            <p className="text-xs font-semibold text-gray-700 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Sélection hôtels (N-01) ── */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Hotel className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Sélection des hôtels</h3>
              {selected.size > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium">Tout sélectionner</button>
              <span className="text-gray-300">|</span>
              <button type="button" onClick={clearAll}
                className="text-xs text-gray-500 hover:text-gray-700">Effacer</button>
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
            {filteredHotels.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">Aucun hôtel trouvé.</p>
            ) : (
              filteredHotels.map(h => {
                const checked = selected.has(h._id);
                return (
                  <label
                    key={h._id}
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${
                      checked ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex-shrink-0 text-blue-600">
                      {checked
                        ? <CheckSquare className="h-5 w-5 fill-blue-600" />
                        : <Square className="h-5 w-5 text-gray-300" />}
                    </div>
                    <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(h._id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{h.titre}</p>
                      <p className="text-xs text-gray-400">{h.localisation} · {h.type} · {"⭐".repeat(Math.min(h.etoiles ?? 3, 5))}</p>
                    </div>
                    {checked && <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* ── Paramètres campagne ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Réduction */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Percent className="h-4 w-4 text-orange-500" /> Paramètres
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Réduction (%) *
              </label>
              <div className="relative">
                <input
                  type="number" min="1" max="100"
                  value={reduction}
                  onChange={e => setReduction(e.target.value)}
                  className="w-full border-2 border-gray-100 focus:border-orange-400 rounded-xl px-4 py-2.5 text-2xl font-extrabold text-orange-600 focus:outline-none"
                  placeholder="20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 text-2xl font-bold">%</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {[10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map(p => (
                  <button key={p} type="button" onClick={() => setReduction(String(p))}
                    className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                      reduction === String(p)
                        ? "bg-orange-500 text-white border-orange-500 font-bold"
                        : "border-gray-200 text-gray-500 hover:border-orange-300"
                    }`}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                <Calendar className="h-3.5 w-3.5 inline mr-1" /> Période de promotion *
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400">Du</label>
                  <input type="date" min={today} value={dateDebut}
                    onChange={e => setDateDebut(e.target.value)}
                    className="w-full border-2 border-gray-100 focus:border-blue-400 rounded-xl px-3 py-2 text-sm focus:outline-none bg-gray-50" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400">Au</label>
                  <input type="date" min={dateDebut || today} value={dateFin}
                    onChange={e => setDateFin(e.target.value)}
                    className="w-full border-2 border-gray-100 focus:border-blue-400 rounded-xl px-3 py-2 text-sm focus:outline-none bg-gray-50" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                <FileText className="h-3.5 w-3.5 inline mr-1" /> Détails & conditions
              </label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                placeholder="Ex : Offre valable pour tout séjour de 3 nuits minimum. Non cumulable avec d'autres promotions."
                className="w-full border-2 border-gray-100 focus:border-blue-400 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none bg-gray-50"
              />
            </div>
          </div>

          {/* Résultat */}
          {result && (
            <div className={`rounded-2xl p-4 flex items-start gap-3 ${
              result.ok ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
            }`}>
              {result.ok
                ? <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm font-semibold ${result.ok ? "text-emerald-800" : "text-red-700"}`}>
                  {result.msg}
                </p>
                {result.n8n && (
                  <p className="text-xs mt-1 text-gray-500">
                    Statut n8n : <span className={`font-medium ${result.n8n === "envoyé" ? "text-emerald-600" : "text-amber-600"}`}>
                      {result.n8n}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bouton lancement */}
          <button
            type="submit"
            disabled={sending || selected.size === 0}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-2xl font-bold text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Envoi en cours…</>
            ) : (
              <><Send className="h-5 w-5" /> Envoyer la campagne</>
            )}
          </button>

          {selected.size > 0 && (
            <p className="text-center text-xs text-gray-400">
              {selected.size} hôtel{selected.size > 1 ? "s" : ""} · {reduction || "?"}% de réduction
              {dateDebut && dateFin && ` · du ${new Date(dateDebut).toLocaleDateString("fr-FR")} au ${new Date(dateFin).toLocaleDateString("fr-FR")}`}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
