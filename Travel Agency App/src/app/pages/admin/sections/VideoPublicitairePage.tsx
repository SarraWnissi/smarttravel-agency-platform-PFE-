import { useState } from "react";
import {
  Video, Share2, Play, Loader2, CheckCircle2,
  Facebook, Instagram, AlertCircle, X, Image,
} from "lucide-react";

const BASE_URL = "http://localhost:3001";

function authHeader() {
  const token = localStorage.getItem("st_token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const SOCIAL_OPTIONS = [
  { id: "facebook",  label: "Facebook",   icon: Facebook,  color: "bg-blue-600",  desc: "Page Facebook SmartTravel" },
  { id: "instagram", label: "Instagram",  icon: Instagram, color: "bg-pink-600",  desc: "Instagram Reels" },
];

interface Props {
  hebergements: any[];
  toast: (type: string, msg: string) => void;
}

export function VideoPublicitairePage({ hebergements, toast }: Props) {
  const [selectedHotels, setSelectedHotels] = useState<string[]>([]);
  const [selectedSocial, setSelectedSocial] = useState<string[]>([]);
  const [titre, setTitre] = useState("Découvrez nos hôtels d'exception — SmartTravel");
  const [description, setDescription] = useState("Réservez dès maintenant sur smarttravel.tn et profitez de nos meilleures offres !");
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const toggleHotel = (id: string) =>
    setSelectedHotels(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSocial = (id: string) =>
    setSelectedSocial(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleGenerer = async () => {
    if (selectedHotels.length === 0) { setError("Sélectionnez au moins un hôtel."); return; }
    if (selectedSocial.length === 0) { setError("Sélectionnez au moins un réseau social."); return; }
    setError(""); setGenerating(true); setDone(false);

    try {
      const hotelsData = hebergements
        .filter(h => selectedHotels.includes(h._id))
        .map(h => ({
          nom: h.titre,
          localisation: h.localisation,
          etoiles: h.etoiles || 3,
          prixMin: h.prixMin || 0,
          description: h.description || "",
          images: (h.images || []).slice(0, 4),
          amenites: { wifi: h.wifi, piscine: h.piscine, restaurant: h.restaurant },
        }));

      const res = await fetch(`${BASE_URL}/api/video/generer`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ hotels: hotelsData, titre, description, publierSur: selectedSocial }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setDone(true);
      toast("success", "Génération lancée ! Vous recevrez un email quand la vidéo sera publiée.");
    } catch (e: any) {
      setError(e.message || "Erreur lors de la génération.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0a1628] flex items-center gap-2">
          <Video className="h-6 w-6 text-purple-600" /> Génération Vidéo Publicitaire IA
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Sélectionnez des hôtels → l'IA génère une vidéo pro et la publie automatiquement sur vos réseaux sociaux.
        </p>
      </div>

      {/* Pipeline visuel */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { n: "01", label: "Sélectionner hôtels", icon: Image, color: "blue" },
          { n: "02", label: "Shotstack génère vidéo", icon: Video, color: "purple" },
          { n: "03", label: "Publication auto", icon: Share2, color: "pink" },
          { n: "04", label: "Email notification", icon: CheckCircle2, color: "green" },
        ].map(s => (
          <div key={s.n} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
            <div className={`w-8 h-8 rounded-full bg-${s.color}-100 flex items-center justify-center mx-auto mb-2`}>
              <s.icon className={`h-4 w-4 text-${s.color}-600`} />
            </div>
            <p className="text-xs font-semibold text-gray-600">{s.label}</p>
            <p className="text-[10px] text-gray-400">N-{s.n}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sélection hôtels */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-blue-500" />
              <span className="font-semibold text-gray-800 text-sm">Hôtels à mettre en vedette</span>
              <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">{selectedHotels.length} sélectionné(s)</span>
            </div>
            {selectedHotels.length > 0 && (
              <button onClick={() => setSelectedHotels([])} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                <X className="h-3 w-3" /> Tout désélectionner
              </button>
            )}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "340px" }}>
            {hebergements.filter(h => h.actif !== false).map(h => (
              <label key={h._id} className={`flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 transition-colors ${selectedHotels.includes(h._id) ? "bg-blue-50" : ""}`}>
                <input
                  type="checkbox"
                  checked={selectedHotels.includes(h._id)}
                  onChange={() => toggleHotel(h._id)}
                  className="w-4 h-4 accent-blue-600 flex-shrink-0"
                />
                {h.images?.[0] ? (
                  <img src={h.images[0]} alt={h.titre} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm">🏨</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{h.titre}</p>
                  <p className="text-xs text-gray-400">{h.localisation} · {"⭐".repeat(Math.min(h.etoiles || 3, 5))}</p>
                </div>
                {h.prixMin > 0 && <span className="text-xs text-blue-600 font-semibold whitespace-nowrap">{h.prixMin} TND/nuit</span>}
              </label>
            ))}
          </div>
        </div>

        {/* Paramètres + réseaux */}
        <div className="space-y-4">
          {/* Titre & description */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="font-semibold text-gray-800 text-sm flex items-center gap-2"><Video className="h-4 w-4 text-purple-500" /> Paramètres vidéo</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Titre de la vidéo</label>
              <input value={titre} onChange={e => setTitre(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Description / Caption</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="font-semibold text-gray-800 text-sm flex items-center gap-2"><Share2 className="h-4 w-4 text-pink-500" /> Publier sur</p>
            {SOCIAL_OPTIONS.map(s => (
              <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${selectedSocial.includes(s.id) ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-gray-200"}`}>
                <input type="checkbox" checked={selectedSocial.includes(s.id)} onChange={() => toggleSocial(s.id)} className="hidden" />
                <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.label}</p>
                  <p className="text-xs text-gray-400">{s.desc}</p>
                </div>
                {selectedSocial.includes(s.id) && <CheckCircle2 className="h-4 w-4 text-blue-500 ml-auto" />}
              </label>
            ))}
          </div>

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Succès */}
          {done && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-800">Génération lancée !</p>
              <p className="text-xs text-green-600 mt-1">Vous recevrez un email avec les liens de publication (~2 min).</p>
            </div>
          )}

          {/* Bouton générer */}
          <button
            onClick={handleGenerer}
            disabled={generating}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {generating ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Génération en cours...</>
            ) : (
              <><Play className="h-5 w-5" /> Générer &amp; Publier la vidéo</>
            )}
          </button>
          <p className="text-xs text-center text-gray-400">Powered by Shotstack AI · ~2 minutes de traitement</p>
        </div>
      </div>
    </div>
  );
}
