import React, { useState, useEffect } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { circuitsAPI } from "../../../../services/api";

export function CircuitsPage({ toast }: { toast: (icon: "success" | "error" | "warning", title: string) => void }) {
  const [circuits, setCircuits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ titre: "", description: "", dureeJours: 1, prix: 0, destinations: "", activitesIncluses: "", placesDisponibles: 1, placesTotal: 1, niveauDifficulte: "FACILE", repasInclus: false, transportInclus: false, hebergementInclus: false, disponible: true });

  const load = () => {
    setLoading(true);
    circuitsAPI.getAll().then(setCircuits).catch(() => toast("error", "Erreur chargement circuits")).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ titre: "", description: "", dureeJours: 1, prix: 0, destinations: "", activitesIncluses: "", placesDisponibles: 1, placesTotal: 1, niveauDifficulte: "FACILE", repasInclus: false, transportInclus: false, hebergementInclus: false, disponible: true }); setShowForm(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ ...c, destinations: (c.destinations || []).join(", "), activitesIncluses: (c.activitesIncluses || []).join(", ") }); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, destinations: form.destinations.split(",").map((s: string) => s.trim()).filter(Boolean), activitesIncluses: form.activitesIncluses.split(",").map((s: string) => s.trim()).filter(Boolean) };
    try {
      if (editing) { await circuitsAPI.update(editing._id, payload); toast("success", "Circuit mis à jour"); }
      else { await circuitsAPI.create(payload); toast("success", "Circuit créé"); }
      setShowForm(false); load();
    } catch { toast("error", "Erreur lors de l'enregistrement"); }
  };

  const handleDelete = async (id: string) => {
    const r = await Swal.fire({ title: "Supprimer ce circuit ?", icon: "warning", showCancelButton: true, confirmButtonText: "Supprimer", cancelButtonText: "Annuler", confirmButtonColor: "#ef4444" });
    if (!r.isConfirmed) return;
    try { await circuitsAPI.delete(id); toast("success", "Circuit supprimé"); load(); } catch { toast("error", "Erreur suppression"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Circuits touristiques</h2>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <span className="text-lg leading-none">+</span> Nouveau circuit
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editing ? "Modifier le circuit" : "Nouveau circuit"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label><input required value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Durée (jours) *</label><input required type="number" min={1} value={form.dureeJours} onChange={e => setForm(f => ({ ...f, dureeJours: +e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix (TND) *</label><input required type="number" min={0} value={form.prix} onChange={e => setForm(f => ({ ...f, prix: +e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Destinations (séparées par virgule)</label><input value={form.destinations} onChange={e => setForm(f => ({ ...f, destinations: e.target.value }))} placeholder="Tunis, Sousse, Hammamet" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Activités incluses (séparées par virgule)</label><input value={form.activitesIncluses} onChange={e => setForm(f => ({ ...f, activitesIncluses: e.target.value }))} placeholder="Visite musée, Baignade, Randonnée" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Places disponibles *</label><input required type="number" min={0} value={form.placesDisponibles} onChange={e => setForm(f => ({ ...f, placesDisponibles: +e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Places totales *</label><input required type="number" min={1} value={form.placesTotal} onChange={e => setForm(f => ({ ...f, placesTotal: +e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Niveau de difficulté</label>
                <select value={form.niveauDifficulte} onChange={e => setForm(f => ({ ...f, niveauDifficulte: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="FACILE">Facile</option><option value="MODERE">Modéré</option><option value="DIFFICILE">Difficile</option>
                </select>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={form.repasInclus} onChange={e => setForm(f => ({ ...f, repasInclus: e.target.checked }))} className="rounded" /> Repas inclus</label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={form.transportInclus} onChange={e => setForm(f => ({ ...f, transportInclus: e.target.checked }))} className="rounded" /> Transport inclus</label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={form.hebergementInclus} onChange={e => setForm(f => ({ ...f, hebergementInclus: e.target.checked }))} className="rounded" /> Hébergement inclus</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">{editing ? "Mettre à jour" : "Créer"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{["Titre", "Durée", "Prix", "Destinations", "Places", "Difficulté", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {circuits.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun circuit</td></tr> : circuits.map(c => (
                <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.titre}</td>
                  <td className="px-4 py-3 text-gray-600">{c.dureeJours}j</td>
                  <td className="px-4 py-3 text-blue-600 font-semibold">{c.prix} TND</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{(c.destinations || []).join(", ") || "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${c.placesDisponibles === 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>{c.placesDisponibles}/{c.placesTotal}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${c.niveauDifficulte === "FACILE" ? "bg-green-100 text-green-700" : c.niveauDifficulte === "MODERE" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{c.niveauDifficulte}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(c._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
