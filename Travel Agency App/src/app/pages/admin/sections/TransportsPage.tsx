import React, { useState, useEffect } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { transportsAPI } from "../../../../services/api";

export function TransportsPage({ toast }: { toast: (icon: "success" | "error" | "warning", title: string) => void }) {
  const [transports, setTransports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ type: "BUS", compagnie: "", origine: "", destination: "", dateDepart: "", dateArrivee: "", capacite: 1, placesDisponibles: 1, prix: 0, classeService: "ECONOMIQUE", bagageInclus: false, climatise: false, disponible: true, numeroVol: "" });

  const load = () => {
    setLoading(true);
    transportsAPI.getAll().then(setTransports).catch(() => toast("error", "Erreur chargement transports")).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const fmt = (d: string) => d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
  const typeLabels: Record<string, string> = { AVION: "✈️ Avion", BUS: "🚌 Bus", TRAIN: "🚆 Train", FERRY: "⛴️ Ferry", VOITURE: "🚗 Voiture", MINIBUS: "🚐 Minibus" };

  const openCreate = () => { setEditing(null); setForm({ type: "BUS", compagnie: "", origine: "", destination: "", dateDepart: "", dateArrivee: "", capacite: 1, placesDisponibles: 1, prix: 0, classeService: "ECONOMIQUE", bagageInclus: false, climatise: false, disponible: true, numeroVol: "" }); setShowForm(true); };
  const openEdit = (t: any) => { setEditing(t); setForm({ ...t, dateDepart: t.dateDepart ? new Date(t.dateDepart).toISOString().slice(0, 16) : "", dateArrivee: t.dateArrivee ? new Date(t.dateArrivee).toISOString().slice(0, 16) : "" }); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) { await transportsAPI.update(editing._id, form); toast("success", "Transport mis à jour"); }
      else { await transportsAPI.create(form); toast("success", "Transport créé"); }
      setShowForm(false); load();
    } catch { toast("error", "Erreur lors de l'enregistrement"); }
  };

  const handleDelete = async (id: string) => {
    const r = await Swal.fire({ title: "Supprimer ce transport ?", icon: "warning", showCancelButton: true, confirmButtonText: "Supprimer", cancelButtonText: "Annuler", confirmButtonColor: "#ef4444" });
    if (!r.isConfirmed) return;
    try { await transportsAPI.delete(id); toast("success", "Transport supprimé"); load(); } catch { toast("error", "Erreur suppression"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Transports</h2>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <span className="text-lg leading-none">+</span> Nouveau transport
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editing ? "Modifier le transport" : "Nouveau transport"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {["AVION", "BUS", "TRAIN", "FERRY", "VOITURE", "MINIBUS"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Compagnie *</label><input required value={form.compagnie} onChange={e => setForm(f => ({ ...f, compagnie: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Origine *</label><input required value={form.origine} onChange={e => setForm(f => ({ ...f, origine: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label><input required value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Départ *</label><input required type="datetime-local" value={form.dateDepart} onChange={e => setForm(f => ({ ...f, dateDepart: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Arrivée *</label><input required type="datetime-local" value={form.dateArrivee} onChange={e => setForm(f => ({ ...f, dateArrivee: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Capacité *</label><input required type="number" min={1} value={form.capacite} onChange={e => setForm(f => ({ ...f, capacite: +e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Places dispo *</label><input required type="number" min={0} value={form.placesDisponibles} onChange={e => setForm(f => ({ ...f, placesDisponibles: +e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix (TND) *</label><input required type="number" min={0} value={form.prix} onChange={e => setForm(f => ({ ...f, prix: +e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                  <select value={form.classeService} onChange={e => setForm(f => ({ ...f, classeService: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ECONOMIQUE">Économique</option><option value="AFFAIRES">Affaires</option><option value="PREMIERE">Première</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">N° Vol / Ref</label><input value={form.numeroVol} onChange={e => setForm(f => ({ ...f, numeroVol: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={form.bagageInclus} onChange={e => setForm(f => ({ ...f, bagageInclus: e.target.checked }))} className="rounded" /> Bagage inclus</label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={form.climatise} onChange={e => setForm(f => ({ ...f, climatise: e.target.checked }))} className="rounded" /> Climatisé</label>
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
              <tr>{["Type", "Compagnie", "Trajet", "Départ", "Places", "Prix", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transports.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun transport</td></tr> : transports.map(t => (
                <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{typeLabels[t.type] ?? t.type}</td>
                  <td className="px-4 py-3 text-gray-700">{t.compagnie}</td>
                  <td className="px-4 py-3 text-gray-600">{t.origine} → {t.destination}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmt(t.dateDepart)}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${t.placesDisponibles === 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>{t.placesDisponibles}/{t.capacite}</span></td>
                  <td className="px-4 py-3 text-blue-600 font-semibold">{t.prix} TND</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(t._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
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
