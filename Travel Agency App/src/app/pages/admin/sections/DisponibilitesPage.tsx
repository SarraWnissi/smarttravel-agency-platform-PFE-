import React, { useState, useEffect, useRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { X, Lock, Trash2, Building2, Info, Search, CalendarDays, CheckCircle2, Ban } from "lucide-react";
import { hebergementsAPI, reservationsAPI } from "../../../../services/api";

// ── Blocage API helpers ────────────────────────────────────────────────────
const API_URL = "http://localhost:3001";
function authHeader(): Record<string, string> {
  const t = localStorage.getItem("st_token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}
const blocagesAPI = {
  list: (hebergementID: string) =>
    fetch(`${API_URL}/api/blocages?hebergementID=${hebergementID}`, { headers: authHeader() }).then(r => r.json()),
  create: (data: object) =>
    fetch(`${API_URL}/api/blocages`, { method: "POST", headers: authHeader(), body: JSON.stringify(data) }).then(async r => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.message ?? "Erreur");
      return j;
    }),
  delete: (id: string) =>
    fetch(`${API_URL}/api/blocages/${id}`, { method: "DELETE", headers: authHeader() }).then(async r => {
      if (!r.ok) throw new Error("Erreur suppression");
    }),
};

// ── Constants ──────────────────────────────────────────────────────────────
const STATUT_BG: Record<string, string> = {
  CONFIRMEE:            "#1e293b",
  EN_ATTENTE_PAIEMENT:  "#7c2d12",
  ANNULEE:              "#dc2626",
  EXPIREE:              "#6b7280",
};
const ROOM_PALETTE = ["#2563eb","#7c3aed","#0891b2","#059669","#ea580c","#db2777","#65a30d","#9333ea","#0d9488","#c2410c"];

const MOTIFS = ["Maintenance","Fermeture","Nettoyage","Réservation interne","Travaux","Événement","Autre"];

type Chambre   = { _id: string; numeroChambre: string; typeChambre: string; prixParNuit: number };
type Blocage   = { _id: string; chambreID: string; hebergementID: string; dateDebut: string; dateFin: string; motif: string };
type Hebergement = { _id: string; titre: string; localisation: string };

// ── Component ──────────────────────────────────────────────────────────────
export function DisponibilitesPage() {
  const calRef = useRef<FullCalendar>(null);

  const [hebergements, setHebergements] = useState<Hebergement[]>([]);
  const [selectedHeb,  setSelectedHeb]  = useState("");
  const [chambres,     setChambres]     = useState<Chambre[]>([]);
  const [selectedChambre, setSelectedChambre] = useState("all");
  const [reservations, setReservations] = useState<any[]>([]);
  const [blocages,     setBlocages]     = useState<Blocage[]>([]);
  const [loading,      setLoading]      = useState(false);

  // recherche de disponibilité par période
  const today = new Date().toISOString().split("T")[0];
  const [dispoDebut,    setDispoDebut]    = useState("");
  const [dispoFin,      setDispoFin]      = useState("");
  const [dispoPers,     setDispoPers]     = useState("");
  const [dispoResults,  setDispoResults]  = useState<any[] | null>(null);
  const [dispoLoading,  setDispoLoading]  = useState(false);
  const [dispoError,    setDispoError]    = useState("");

  // modal state
  const [blocModal,   setBlocModal]   = useState<{ start: string; end: string } | null>(null);
  const [blocChambre, setBlocChambre] = useState("");
  const [blocMotif,   setBlocMotif]   = useState("Maintenance");
  const [blocSaving,  setBlocSaving]  = useState(false);
  const [detailEvt,   setDetailEvt]   = useState<any>(null);

  // Load hotels once
  useEffect(() => { hebergementsAPI.getAll().then(setHebergements).catch(() => {}); }, []);

  // Reload rooms + reservations + blocages when hotel changes
  useEffect(() => {
    setDispoResults(null); setDispoError("");
    if (!selectedHeb) { setChambres([]); setReservations([]); setBlocages([]); return; }
    setLoading(true);
    Promise.all([
      hebergementsAPI.getChambres(selectedHeb),
      reservationsAPI.getAll(),
      blocagesAPI.list(selectedHeb),
    ]).then(([c, r, b]) => {
      setChambres(c);
      setSelectedChambre("all");
      const ids = new Set(c.map((ch: Chambre) => String(ch._id)));
      setReservations(r.filter((res: any) => ids.has(String(res.chambreID?._id ?? res.chambreID))));
      setBlocages(b);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedHeb]);

  // Build colour map per chambre
  const roomColor = useMemo(() => {
    const m: Record<string, string> = {};
    chambres.forEach((c, i) => { m[String(c._id)] = ROOM_PALETTE[i % ROOM_PALETTE.length]; });
    return m;
  }, [chambres]);

  // Build calendar events
  const events = useMemo(() => {
    const evts: any[] = [];
    const filterChambre = (id: string) => selectedChambre === "all" || id === selectedChambre;

    reservations.forEach(r => {
      const cid = String(r.chambreID?._id ?? r.chambreID);
      if (!filterChambre(cid)) return;
      if (!r.dateDebutSejour || !r.dateFinSejour) return;
      const ch = chambres.find(c => String(c._id) === cid);
      const client = r.clientID
        ? `${r.clientID.prenom ?? r.clientID.firstname ?? ""} ${r.clientID.nom ?? r.clientID.lastname ?? ""}`.trim()
        : r.guestPrenom ? `${r.guestPrenom} ${r.guestNom}`.trim() : "Client";
      evts.push({
        id: `res-${r._id}`,
        title: `🛏 Ch.${ch?.numeroChambre ?? "?"} — ${client}`,
        start: r.dateDebutSejour,
        end:   r.dateFinSejour,
        backgroundColor: STATUT_BG[r.statut] ?? "#6b7280",
        borderColor:     STATUT_BG[r.statut] ?? "#6b7280",
        extendedProps: { type: "reservation", reservation: r, chambre: ch },
      });
    });

    blocages.forEach(b => {
      const cid = String(b.chambreID);
      if (!filterChambre(cid)) return;
      const ch = chambres.find(c => String(c._id) === cid);
      evts.push({
        id: `bloc-${b._id}`,
        title: `🔒 Ch.${ch?.numeroChambre ?? "?"} — ${b.motif}`,
        start: b.dateDebut,
        end:   b.dateFin,
        backgroundColor: "#374151",
        borderColor:     "#1f2937",
        textColor:       "#f9fafb",
        extendedProps: { type: "blocage", blocage: b, chambre: ch },
      });
    });

    // ── Trame VERTE : jours où la sélection est disponible ──
    if (chambres.length > 0) {
      // Date locale (évite le décalage UTC qui faisait reculer les jours d'un cran)
      const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const targetIds = selectedChambre === "all"
        ? chambres.map(c => String(c._id))
        : [selectedChambre];

      // Jours occupés : une réservation active ou un blocage sur une chambre cible
      const occupied = new Set<string>();
      const addRange = (start: any, end: any) => {
        const s = new Date(start), e = new Date(end);
        if (isNaN(+s) || isNaN(+e)) return;
        for (let d = new Date(s.getFullYear(), s.getMonth(), s.getDate()); d <= e; d.setDate(d.getDate() + 1)) {
          occupied.add(ymd(d));
        }
      };
      reservations.forEach(r => {
        if (!["EN_ATTENTE_PAIEMENT", "CONFIRMEE"].includes(r.statut)) return;
        const cid = String(r.chambreID?._id ?? r.chambreID);
        if (!targetIds.includes(cid) || !r.dateDebutSejour || !r.dateFinSejour) return;
        addRange(r.dateDebutSejour, r.dateFinSejour);
      });
      blocages.forEach(b => {
        if (!targetIds.includes(String(b.chambreID))) return;
        addRange(b.dateDebut, b.dateFin);
      });

      // Fenêtre : aujourd'hui → +12 mois, regroupée en plages vertes continues
      const today0 = new Date(); today0.setHours(0, 0, 0, 0);
      const wEnd = new Date(today0); wEnd.setFullYear(wEnd.getFullYear() + 1);
      let runStart: string | null = null;
      for (let d = new Date(today0); d <= wEnd; d.setDate(d.getDate() + 1)) {
        const k = ymd(d);
        const free = !occupied.has(k);
        if (free && !runStart) runStart = k;
        else if (!free && runStart) { evts.push({ start: runStart, end: k, display: "background", backgroundColor: "#bbf7d0" }); runStart = null; }
      }
      if (runStart) evts.push({ start: runStart, end: ymd(new Date(wEnd.getTime() + 86400000)), display: "background", backgroundColor: "#bbf7d0" });
    }

    return evts;
  }, [reservations, blocages, chambres, selectedChambre]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelect = (info: any) => {
    if (!selectedHeb) return;
    setBlocChambre(selectedChambre !== "all" ? selectedChambre : (chambres[0]?._id ?? ""));
    setBlocMotif("Maintenance");
    setBlocModal({ start: info.startStr, end: info.endStr });
  };

  const saveBlocage = async () => {
    if (!blocModal || !blocChambre) return;
    setBlocSaving(true);
    try {
      await blocagesAPI.create({ chambreID: blocChambre, hebergementID: selectedHeb, dateDebut: blocModal.start, dateFin: blocModal.end, motif: blocMotif });
      setBlocages(await blocagesAPI.list(selectedHeb));
      setBlocModal(null);
    } catch (e: any) { alert(e.message); }
    finally { setBlocSaving(false); }
  };

  const deleteBlocage = async (id: string) => {
    try {
      await blocagesAPI.delete(id);
      setBlocages(prev => prev.filter(b => b._id !== id));
      setDetailEvt(null);
    } catch (e: any) { alert(e.message); }
  };

  // ── Recherche des chambres disponibles sur une période ─────────────────────
  const checkDisponibilite = async () => {
    setDispoError("");
    if (!selectedHeb) { setDispoError("Choisissez d'abord un hébergement."); return; }
    if (!dispoDebut || !dispoFin) { setDispoError("Indiquez la date d'arrivée et de départ."); return; }
    if (new Date(dispoFin) <= new Date(dispoDebut)) { setDispoError("La date de départ doit être après l'arrivée."); return; }
    setDispoLoading(true);
    setDispoResults(null);
    try {
      const params = new URLSearchParams({ dateDebut: dispoDebut, dateFin: dispoFin });
      if (dispoPers) params.set("nbPersonnes", dispoPers);
      const data = await hebergementsAPI.getDisponibilite(selectedHeb, params.toString());
      setDispoResults(data);
    } catch {
      setDispoError("Impossible de vérifier la disponibilité.");
    } finally {
      setDispoLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header + legend */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0a1628]">Gestion des disponibilités</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Sélectionnez un créneau sur le calendrier pour bloquer une chambre · Cliquez sur un événement pour les détails
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          {[
            { color: "#bbf7d0", label: "Disponible" },
            { color: "#1e293b", label: "Confirmée (indisponible)" },
            { color: "#7c2d12", label: "En attente" },
            { color: "#dc2626", label: "Annulée" },
            { color: "#374151", label: "Bloqué" },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Filters row */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Hébergement *</label>
          <select
            value={selectedHeb}
            onChange={e => setSelectedHeb(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Choisir un hébergement —</option>
            {hebergements.map(h => (
              <option key={h._id} value={h._id}>{h.titre}  ({h.localisation})</option>
            ))}
          </select>
        </div>

        {chambres.length > 0 && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Chambre</label>
            <select
              value={selectedChambre}
              onChange={e => setSelectedChambre(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes les chambres</option>
              {chambres.map(c => (
                <option key={c._id} value={String(c._id)}>
                  Ch. {c.numeroChambre} — {c.typeChambre} ({c.prixParNuit} TND/nuit)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Recherche de disponibilité par période ── */}
      {selectedHeb && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-[#0a1628] text-sm">Chambres disponibles sur une période</h3>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Arrivée *</label>
              <input type="date" value={dispoDebut} min={today}
                onChange={e => setDispoDebut(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Départ *</label>
              <input type="date" value={dispoFin} min={dispoDebut || today}
                onChange={e => setDispoFin(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-500 mb-1">Personnes</label>
              <input type="number" min={1} value={dispoPers} placeholder="Toutes"
                onChange={e => setDispoPers(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={checkDisponibilite} disabled={dispoLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
              <Search className="h-4 w-4" /> {dispoLoading ? "Recherche..." : "Vérifier"}
            </button>
          </div>

          {dispoError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{dispoError}</p>}

          {dispoResults && (() => {
            const libres  = dispoResults.filter(c => c.disponiblePeriode);
            const occupes = dispoResults.filter(c => !c.disponiblePeriode);
            return (
              <div className="space-y-3 pt-1">
                {/* Disponibles */}
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 mb-1.5">
                    <CheckCircle2 className="h-4 w-4" /> {libres.length} chambre{libres.length !== 1 ? "s" : ""} disponible{libres.length !== 1 ? "s" : ""}
                  </p>
                  {libres.length === 0 ? (
                    <p className="text-xs text-gray-400 pl-5">Aucune chambre libre sur cette période.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {libres.map(c => (
                        <div key={c._id} className="flex items-center justify-between border border-emerald-200 bg-emerald-50/50 rounded-lg px-3 py-2">
                          <span className="text-sm font-medium text-[#0a1628]">Ch. {c.numeroChambre} <span className="text-gray-500 font-normal">— {c.typeChambre}</span></span>
                          <span className="text-xs font-bold text-emerald-700">{c.prixParNuit} TND/nuit</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Occupées */}
                {occupes.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 mb-1.5">
                      <Ban className="h-4 w-4" /> {occupes.length} chambre{occupes.length !== 1 ? "s" : ""} indisponible{occupes.length !== 1 ? "s" : ""}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {occupes.map(c => (
                        <div key={c._id} className="flex items-center justify-between border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 opacity-80">
                          <span className="text-sm font-medium text-gray-600">Ch. {c.numeroChambre} <span className="text-gray-400 font-normal">— {c.typeChambre}</span></span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.motifIndisponibilite === "BLOQUEE" ? "bg-gray-700 text-white" : "bg-amber-100 text-amber-700"}`}>
                            {c.motifIndisponibilite === "BLOQUEE" ? "🔒 Bloquée" : "Réservée"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Chambre colour chips */}
      {chambres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedChambre("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${selectedChambre === "all" ? "bg-[#0a1628] text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
          >
            Toutes
          </button>
          {chambres.map((c, i) => {
            const color = ROOM_PALETTE[i % ROOM_PALETTE.length];
            const sel = selectedChambre === String(c._id);
            return (
              <button
                key={c._id}
                onClick={() => setSelectedChambre(String(c._id))}
                style={{ backgroundColor: sel ? color : "white", color: sel ? "white" : color, borderColor: color }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              >
                Ch.{c.numeroChambre} {c.typeChambre}
              </button>
            );
          })}
        </div>
      )}

      {/* Calendar pane */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {!selectedHeb ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-300">
            <Building2 className="h-16 w-16 mb-4" />
            <p className="text-sm font-medium text-gray-400">Sélectionnez un hébergement pour afficher le calendrier</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-4">
            <FullCalendar
              ref={calRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="fr"
              headerToolbar={{
                left:   "prev,next today",
                center: "title",
                right:  "dayGridMonth,timeGridWeek",
              }}
              buttonText={{ today: "Aujourd'hui", month: "Mois", week: "Semaine" }}
              events={events}
              selectable
              selectMirror
              select={handleSelect}
              eventClick={info => setDetailEvt(info.event)}
              eventDisplay="block"
              height={620}
              dayMaxEvents={3}
              nowIndicator
              eventMouseEnter={info => { info.el.style.cursor = "pointer"; info.el.style.opacity = "0.88"; }}
              eventMouseLeave={info => { info.el.style.opacity = "1"; }}
            />
          </div>
        )}
      </div>

      {/* Stats summary */}
      {selectedHeb && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total chambres",  value: chambres.length, color: "blue"   },
            { label: "Réservations",    value: reservations.length, color: "green"  },
            { label: "Blocages actifs", value: blocages.length,     color: "gray"   },
            { label: "Taux d'occupation",
              value: reservations.length + blocages.length === 0 ? "0%" : `${Math.round(((reservations.filter(r => r.statut === "CONFIRMEE").length) / (chambres.length || 1)) * 100)}%`,
              color: "purple" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-2xl font-bold text-[#0a1628] mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── BLOCAGE CREATION MODAL ── */}
      {blocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget) setBlocModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-[#0a1628] flex items-center gap-2">
                <Lock className="h-5 w-5 text-gray-600" /> Bloquer un créneau
              </h3>
              <button onClick={() => setBlocModal(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 text-sm bg-blue-50 text-blue-800 rounded-lg px-4 py-2.5 items-center gap-2">
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>
                <strong>{new Date(blocModal.start).toLocaleDateString("fr-FR")}</strong>
                {" → "}
                <strong>{new Date(blocModal.end).toLocaleDateString("fr-FR")}</strong>
              </span>
            </div>

            {selectedChambre === "all" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chambre *</label>
                <select
                  value={blocChambre}
                  onChange={e => setBlocChambre(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Choisir une chambre —</option>
                  {chambres.map(c => (
                    <option key={c._id} value={String(c._id)}>Ch. {c.numeroChambre} — {c.typeChambre}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motif du blocage</label>
              <select
                value={blocMotif}
                onChange={e => setBlocMotif(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MOTIFS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={saveBlocage}
                disabled={blocSaving || !blocChambre}
                className="flex-1 bg-gray-800 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                {blocSaving ? "Enregistrement..." : "🔒 Confirmer le blocage"}
              </button>
              <button
                onClick={() => setBlocModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EVENT DETAIL MODAL ── */}
      {detailEvt && (() => {
        const props = detailEvt.extendedProps;
        const isRes   = props.type === "reservation";
        const isBlocage = props.type === "blocage";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget) setDetailEvt(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-[#0a1628]">
                  {isRes ? "Détail de la réservation" : "Créneau bloqué"}
                </h3>
                <button onClick={() => setDetailEvt(null)} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
              </div>

              {isRes && props.reservation && (() => {
                const r = props.reservation;
                const client = r.clientID
                  ? `${r.clientID.prenom ?? r.clientID.firstname ?? ""} ${r.clientID.nom ?? r.clientID.lastname ?? ""}`.trim()
                  : r.guestPrenom ? `${r.guestPrenom} ${r.guestNom}` : "Client";
                const rows = [
                  ["Client",    client],
                  ["Chambre",   props.chambre ? `Ch. ${props.chambre.numeroChambre} — ${props.chambre.typeChambre}` : "—"],
                  ["Arrivée",   new Date(r.dateDebutSejour).toLocaleDateString("fr-FR")],
                  ["Départ",    new Date(r.dateFinSejour).toLocaleDateString("fr-FR")],
                  ["Personnes", String(r.nbPersonnes)],
                  ["Montant",   `${(r.montantTotal ?? 0).toLocaleString("fr-FR")} TND`],
                ];
                return (
                  <div className="space-y-2 text-sm">
                    {rows.map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-500">{k}</span>
                        <span className="font-medium text-right">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-gray-500">Statut</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.statut === "CONFIRMEE"           ? "bg-green-100 text-green-700"  :
                        r.statut === "EN_ATTENTE_PAIEMENT" ? "bg-amber-100 text-amber-700"  :
                        r.statut === "ANNULEE"             ? "bg-red-100 text-red-700"      :
                        "bg-gray-100 text-gray-600"}`}>
                        {r.statut === "CONFIRMEE" ? "Confirmée" : r.statut === "EN_ATTENTE_PAIEMENT" ? "En attente" : r.statut === "ANNULEE" ? "Annulée" : r.statut}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {isBlocage && props.blocage && (() => {
                const b = props.blocage;
                return (
                  <div className="space-y-3 text-sm">
                    {[
                      ["Chambre", props.chambre ? `Ch. ${props.chambre.numeroChambre} — ${props.chambre.typeChambre}` : "—"],
                      ["Du",     new Date(b.dateDebut).toLocaleDateString("fr-FR")],
                      ["Au",     new Date(b.dateFin).toLocaleDateString("fr-FR")],
                      ["Motif",  b.motif],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-500">{k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => deleteBlocage(b._id)}
                      className="w-full flex items-center justify-center gap-2 mt-2 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" /> Supprimer ce blocage
                    </button>
                  </div>
                );
              })()}

              <button onClick={() => setDetailEvt(null)} className="w-full bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                Fermer
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
