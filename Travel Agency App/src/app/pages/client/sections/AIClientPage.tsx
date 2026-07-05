import React, { useState, useEffect } from "react";
import { Bot, RefreshCw, Sparkles, ChevronRight, Plane } from "lucide-react";
import { aiAPI } from "../../../../services/api";
import { prixOffreLeMoinsCher } from "../shared";

const IA_AGENTS_CLIENT = [
  {
    name: "ReservationAgent",
    icon: "🤖",
    color: "blue" as const,
    title: "Validation intelligente",
    desc: "Vérifie la validité de chaque réservation et calcule le montant exact selon vos dates et le nombre de personnes.",
  },
  {
    name: "ConflictAgent",
    icon: "🔍",
    color: "orange" as const,
    title: "Disponibilité en temps réel",
    desc: "S'assure que vos dates sont libres avant confirmation, évitant tout conflit de réservation.",
  },
  {
    name: "OptimizationAgent",
    icon: "✨",
    color: "purple" as const,
    title: "Recommandations pour vous",
    desc: "Analyse vos préférences et votre historique pour vous proposer les offres les plus adaptées à votre profil.",
  },
];

const IA_COLORS = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   badge: "bg-blue-100"   },
  orange: { bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", badge: "bg-purple-100" },
};

export function AIClientPage({ onGoPrefs, onOpenRes }: { onGoPrefs: () => void; onOpenRes: (offre: any) => void }) {
  const [reco, setReco] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      aiAPI.getRecommandations().catch(() => ({ recommandations: [], source: "error" })),
      aiAPI.getAgentsStatus().catch(() => ({ agents: [] })),
    ]).then(([recoData, statusData]: [any, any]) => {
      setReco(recoData.recommandations ?? []);
      setSource(recoData.source ?? "");
      setAgents(statusData.agents ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-600" /> Mon Intelligence Artificielle
          </h2>
          <p className="text-sm text-gray-500 mt-1">Le système multi-agents SmartTravel au service de vos voyages</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </button>
      </div>

      {/* Agent cards — vue client */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {IA_AGENTS_CLIENT.map(card => {
          const c = IA_COLORS[card.color];
          const agentData = agents.find((a: any) => a.name === card.name);
          const isActive = agentData?.status === "ACTIF";
          return (
            <div key={card.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{card.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">{card.title}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs mt-1 ${loading ? "bg-gray-100 text-gray-400" : isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-gray-300" : isActive ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                    {loading ? "..." : isActive ? "Actif" : "Hors ligne"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">{card.desc}</p>
              {agentData?.stats && (
                <div className={`${c.bg} ${c.text} rounded-lg px-3 py-1.5 text-xs font-medium`}>
                  {card.name === "ReservationAgent" && `${agentData.stats.validations} validation(s) effectuée(s)`}
                  {card.name === "ConflictAgent" && `${agentData.stats.verifications} vérif. · ${agentData.stats.conflitsDetectes} conflit(s) évité(s)`}
                  {card.name === "OptimizationAgent" && `${agentData.stats.recommandations} recommandation(s) générée(s)`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommandations personnalisées */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Recommandations personnalisées</h3>
            {source && !loading && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${source === "llm" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                {source === "llm" ? "✦ IA avancée" : "OptimizationAgent"}
              </span>
            )}
          </div>
          <button onClick={onGoPrefs} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            Affiner mes suggestions <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-10 h-10 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Analyse de votre historique en cours…</p>
          </div>
        ) : reco.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-8 w-8 text-purple-300" />
            </div>
            <p className="text-gray-600 font-medium text-sm">Aucune recommandation disponible</p>
            <p className="text-gray-400 text-xs mt-1 max-w-xs mx-auto">
              Effectuez au moins une réservation ou définissez vos préférences pour recevoir des suggestions personnalisées.
            </p>
            <button onClick={onGoPrefs}
              className="mt-4 bg-purple-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
              Définir mes préférences →
            </button>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {reco.map((offre: any, i: number) => {
              const score: number = offre.score ?? 0;
              const niveau = offre.niveau ?? { label: "Moyen", color: "amber", icon: "🟡" };
              const scoreDetails = offre.scoreDetails;
              const tags: any[] = offre.tags ?? [];

              const scoreBg =
                score >= 75 ? "bg-emerald-500" :
                score >= 50 ? "bg-amber-500"   : "bg-red-400";

              const SCORE_BARS = scoreDetails ? [
                { key: "budget",    label: "Budget",      pts: scoreDetails.budget?.pts    ?? 0, max: scoreDetails.budget?.max    ?? 30, color: "bg-blue-500"   },
                { key: "dest",      label: "Destination", pts: scoreDetails.dest?.pts      ?? 0, max: scoreDetails.dest?.max      ?? 25, color: "bg-purple-500" },
                { key: "type",      label: "Type séjour", pts: scoreDetails.type?.pts      ?? 0, max: scoreDetails.type?.max      ?? 20, color: "bg-teal-500"   },
                { key: "formule",   label: "Formule",     pts: scoreDetails.formule?.pts   ?? 0, max: scoreDetails.formule?.max   ?? 15, color: "bg-orange-500" },
                { key: "popularite",label: "Popularité",  pts: scoreDetails.popularite?.pts?? 0, max: scoreDetails.popularite?.max?? 10, color: "bg-pink-500"   },
              ] : [];

              return (
                <div key={offre._id ?? i}
                  className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-purple-200 transition-all flex flex-col group">
                  <div className="relative h-32 bg-gradient-to-br from-[#0a1628] via-blue-900 to-purple-900 flex items-center justify-center overflow-hidden">
                    <Plane className="h-14 w-14 text-white/10 absolute" />
                    <div className="relative text-center px-4">
                      <p className="text-white/80 text-xs uppercase tracking-widest font-semibold">
                        {offre.serviceID?.typeService === "HEBERGEMENT" ? "🏨 Hôtel" :
                         offre.serviceID?.typeService === "ACTIVITE"    ? "🧭 Excursion" : "✈️ International"}
                      </p>
                      <h4 className="text-white font-bold text-sm mt-1 line-clamp-2 leading-tight">{offre.titre}</h4>
                    </div>
                    <div className={`absolute top-3 right-3 ${scoreBg} text-white rounded-2xl px-2.5 py-1.5 text-center min-w-[52px]`}>
                      <p className="text-lg font-black leading-none">{score}</p>
                      <p className="text-[9px] font-semibold opacity-80">/ 100</p>
                    </div>
                    <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                      <span className="text-[10px]">{niveau.icon}</span>
                      <span className="text-white text-[10px] font-semibold">{niveau.label}</span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1 space-y-3">
                    {offre.raison && (
                      <div className="flex items-start gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-purple-700 font-medium leading-relaxed">{offre.raison}</p>
                      </div>
                    )}
                    {SCORE_BARS.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Analyse de compatibilité</p>
                        {SCORE_BARS.map(bar => {
                          const pct = Math.round((bar.pts / bar.max) * 100);
                          return (
                            <div key={bar.key} className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 w-20 flex-shrink-0 text-right">{bar.label}</span>
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${bar.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-gray-600 w-8">{bar.pts}<span className="text-gray-300">/{bar.max}</span></span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag: any, ti: number) => (
                          <span key={ti} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            tag.color === "green"  ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            tag.color === "blue"   ? "bg-blue-50 text-blue-700 border-blue-200"         :
                            tag.color === "purple" ? "bg-purple-50 text-purple-700 border-purple-200"   :
                            tag.color === "orange" ? "bg-orange-50 text-orange-700 border-orange-200"   :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>{tag.label}</span>
                        ))}
                      </div>
                    )}
                    {offre.descriptionCourte && (
                      <p className="text-xs text-gray-400 line-clamp-1 flex-1">{offre.descriptionCourte}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <div>
                        <p className="text-[10px] text-gray-400">À partir de</p>
                        <p className="text-base font-extrabold text-blue-600 leading-tight">
                          {offre.prixAPartirDe != null ? `${prixOffreLeMoinsCher(offre).toLocaleString("fr-FR")} TND` : "—"}
                        </p>
                      </div>
                      <button onClick={() => onOpenRes(offre)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm">
                        Réserver
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA préférences */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-700 rounded-2xl p-6 flex items-center justify-between gap-4">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full translate-x-16 -translate-y-8" />
        <div className="relative">
          <h4 className="font-bold text-white text-base mb-1">Améliorez la précision de vos recommandations</h4>
          <p className="text-purple-200 text-sm">
            L'OptimizationAgent analyse votre budget, destinations, type de séjour et formule préférée
            pour atteindre un score de confiance plus élevé.
          </p>
        </div>
        <button onClick={onGoPrefs}
          className="flex-shrink-0 bg-white text-purple-700 px-5 py-2.5 rounded-xl hover:bg-purple-50 transition-colors text-sm font-bold whitespace-nowrap shadow-lg relative">
          Mes préférences →
        </button>
      </div>
    </div>
  );
}
