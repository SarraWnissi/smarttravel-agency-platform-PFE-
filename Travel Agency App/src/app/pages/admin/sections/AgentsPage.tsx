import React, { useState, useEffect } from "react";
import { aiAPI } from "../../../../services/api";

const AGENTS_CONFIG = [
  {
    name: "ReservationAgent",
    icon: "🤖",
    color: "blue" as const,
    role: "Supervise la création et validation des réservations",
    algo: [
      "Vérifie les champs requis : clientID, typeReservation, nbPersonnes",
      "HOTEL : exige dateDebutSejour, dateFinSejour et chambreID",
      "INTERNATIONALE : exige numPassport et paysDestination",
      "Calcule le montant HOTEL : nbNuits × prixParNuit",
      "Calcule le montant EXCURSION/INTL : nbPersonnes × prixBase",
    ],
  },
  {
    name: "ConflictAgent",
    icon: "🔍",
    color: "orange" as const,
    role: "Détecte les conflits de disponibilité entre réservations",
    algo: [
      "Interroge la base pour toute réservation sur la même chambre",
      "Chevauchement si : dateDebut ≤ dateFin_autre ET dateFin ≥ dateDebut_autre",
      "Cible les statuts EN_ATTENTE_PAIEMENT et CONFIRMEE",
      "Exclut la réservation courante lors des modifications",
      "Analyse aussi la disponibilité globale d'un hébergement entier",
    ],
  },
  {
    name: "OptimizationAgent",
    icon: "✨",
    color: "purple" as const,
    role: "Optimise et personnalise les offres pour les clients",
    algo: [
      "Score de base : 50 / 100",
      "+20 si le prix est dans le budget du client",
      "+10 bonus si prix < 70% du budget max",
      "+25 si la destination correspond aux préférences sauvegardées",
      "+3 par réservation passée sur cette offre (max +15)",
    ],
  },
];

const COLOR_MAP = {
  blue:   { ring: "ring-blue-500",   bg: "bg-blue-50",   text: "text-blue-700",   badge: "bg-blue-100",   dot: "bg-blue-500"   },
  orange: { ring: "ring-orange-500", bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100", dot: "bg-orange-500" },
  purple: { ring: "ring-purple-500", bg: "bg-purple-50", text: "text-purple-700", badge: "bg-purple-100", dot: "bg-purple-500" },
};

function AgentStatRow({ label, value, badge, text }: { label: string; value: number; badge: string; text: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`${badge} ${text} px-2.5 py-0.5 rounded-full text-sm font-semibold min-w-[2rem] text-center`}>{value}</span>
    </div>
  );
}

export function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    aiAPI.getAgentsStatus()
      .then(data => setAgents(data.agents || []))
      .catch(() => setError("Impossible de contacter les agents (vérifiez que le serveur est démarré)"))
      .finally(() => setLoading(false));
  }, []);

  const getAgentData = (name: string) => agents.find(a => a.name === name);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Agents IA</h2>
        <p className="text-sm text-gray-500 mt-1">Supervision du système multi-agents — cliquez sur un agent pour voir les détails</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AGENTS_CONFIG.map(cfg => {
          const isSelected = selected === cfg.name;
          const c = COLOR_MAP[cfg.color];
          const data = getAgentData(cfg.name);
          return (
            <div
              key={cfg.name}
              onClick={() => setSelected(isSelected ? null : cfg.name)}
              className={`bg-white rounded-xl border shadow-sm p-6 cursor-pointer transition-all hover:shadow-md select-none ${isSelected ? `ring-2 ${c.ring} border-transparent` : "border-gray-100 hover:border-gray-200"}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{cfg.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{cfg.name}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${loading ? "bg-gray-100 text-gray-500" : error ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-gray-400 animate-pulse" : error ? "bg-red-500" : "bg-green-500 animate-pulse"}`} />
                    {loading ? "Chargement..." : error ? "Erreur" : "ACTIF"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3">{cfg.role}</p>
              {/* Mini stats badge */}
              {data?.stats && !loading && (
                <div className={`${c.bg} rounded-lg px-3 py-1.5 text-xs ${c.text} font-medium`}>
                  {cfg.name === "ReservationAgent" && `${data.stats.validations} validation(s) · ${data.stats.refusees} refusée(s)`}
                  {cfg.name === "ConflictAgent" && `${data.stats.verifications} vérif. · ${data.stats.conflitsDetectes} conflit(s)`}
                  {cfg.name === "OptimizationAgent" && `${data.stats.recommandations} recommandation(s)`}
                </div>
              )}
              <p className={`text-xs mt-3 ${c.text}`}>{isSelected ? "▲ Masquer les détails" : "▼ Voir les détails"}</p>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selected && (() => {
        const cfg = AGENTS_CONFIG.find(c => c.name === selected)!;
        const c = COLOR_MAP[cfg.color];
        const data = getAgentData(selected);
        const DB_LABELS: Record<string, string> = {
          total: "Total réservations",
          confirmees: "Confirmées",
          enAttente: "En attente de paiement",
          annulees: "Annulées",
          hotelActives: "Réservations hôtel actives",
          totalReservations: "Total réservations",
        };
        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cfg.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900">{cfg.name}</h3>
                  <p className="text-sm text-gray-500">{cfg.role}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors">✕ Fermer</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stats */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Statistiques de session</h4>
                  <div className={`${c.bg} rounded-xl p-4 divide-y divide-white/60`}>
                    {data?.stats ? (
                      <>
                        {cfg.name === "ReservationAgent" && (
                          <>
                            <AgentStatRow label="Validations effectuées" value={data.stats.validations} badge={c.badge} text={c.text} />
                            <AgentStatRow label="Réservations validées" value={data.stats.validees} badge="bg-green-100" text="text-green-700" />
                            <AgentStatRow label="Réservations refusées" value={data.stats.refusees} badge="bg-red-100" text="text-red-600" />
                          </>
                        )}
                        {cfg.name === "ConflictAgent" && (
                          <>
                            <AgentStatRow label="Vérifications de conflits" value={data.stats.verifications} badge={c.badge} text={c.text} />
                            <AgentStatRow label="Conflits détectés" value={data.stats.conflitsDetectes} badge="bg-red-100" text="text-red-600" />
                          </>
                        )}
                        {cfg.name === "OptimizationAgent" && (
                          <>
                            <AgentStatRow label="Recommandations générées" value={data.stats.recommandations} badge={c.badge} text={c.text} />
                            <AgentStatRow label="Optimisations globales" value={data.stats.optimisations} badge={c.badge} text={c.text} />
                          </>
                        )}
                        {data.stats.derniereAction && (
                          <p className="text-xs text-gray-400 pt-2">Dernière action : {new Date(data.stats.derniereAction).toLocaleTimeString("fr-FR")}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 italic py-2">Aucune activité depuis le démarrage du serveur.</p>
                    )}
                  </div>
                </div>

                {/* DB stats */}
                {data?.dbStats && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Données en base</h4>
                    <div className="bg-gray-50 rounded-xl p-4 divide-y divide-gray-100">
                      {Object.entries(data.dbStats).map(([k, v]) => (
                        <div key={k}><AgentStatRow label={DB_LABELS[k] ?? k} value={v as number} badge="bg-gray-200" text="text-gray-700" /></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Algorithm */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Logique de l'agent</h4>
                <ul className="space-y-2">
                  {cfg.algo.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className={`w-5 h-5 rounded-full ${c.badge} ${c.text} flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5`}>{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Top offres (OptimizationAgent only) */}
            {cfg.name === "OptimizationAgent" && data?.topOffres?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Top offres les plus réservées</h4>
                <div className="space-y-2">
                  {data.topOffres.map((o: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-purple-50 rounded-lg px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">#{i + 1}</span>
                        <span className="text-gray-800 font-medium">{o.titre}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500">{o.count} réservation(s)</span>
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{(o.totalRevenu ?? 0).toLocaleString("fr-FR")} TND</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {error && <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700">{error}</div>}

      {/* Architecture box */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-3">Architecture multi-agents</h3>
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
          <p><strong>AgentManager</strong> — Orchestrateur central qui coordonne les 3 agents spécialisés</p>
          <p><strong>ReservationAgent</strong> — Validations métier, calcul des montants</p>
          <p><strong>ConflictAgent</strong> — Détection de conflits de chambre en temps réel</p>
          <p><strong>OptimizationAgent</strong> — Score de recommandation basé sur préférences + historique</p>
          <p className="text-xs text-gray-400 mt-3">Service IA Python (FastAPI) disponible sur port 8000 — démarrez avec <code className="bg-gray-100 px-1 rounded">uvicorn main:app --reload</code> dans /ai-service</p>
        </div>
      </div>
    </div>
  );
}
