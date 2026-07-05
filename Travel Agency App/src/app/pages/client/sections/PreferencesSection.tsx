import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { preferencesAPI } from "../../../../services/api";

export function PreferencesSection({ userId }: { userId: string }) {
  const [form, setForm] = useState({
    destinations_favorites: "",
    types_sejour: [] as string[],
    budget_min: 0,
    budget_max: 0,
    activites_preferees: "",
    nombre_personnes_habituel: 1,
    periode_preferee: "PEU_IMPORTE",
    notifications_email: true,
    notifications_sms: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    preferencesAPI.get()
      .then(pref => {
        if (pref) setForm({
          ...pref,
          destinations_favorites: (pref.destinations_favorites || []).join(", "),
          activites_preferees: (pref.activites_preferees || []).join(", "),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const typesOptions = ["HOTEL", "EXCURSION", "INTERNATIONALE", "CIRCUIT", "TRANSPORT"];
  const toggleType = (t: string) => setForm(f => ({
    ...f,
    types_sejour: f.types_sejour.includes(t) ? f.types_sejour.filter(x => x !== t) : [...f.types_sejour, t],
  }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        destinations_favorites: form.destinations_favorites.split(",").map(s => s.trim()).filter(Boolean),
        activites_preferees: form.activites_preferees.split(",").map(s => s.trim()).filter(Boolean),
      };
      await preferencesAPI.save(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0a1628]">Mes préférences de voyage</h2>
        <p className="text-sm text-gray-500 mt-1">Ces informations permettent à notre IA de vous proposer des offres personnalisées.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Destinations favorites</label>
          <input value={form.destinations_favorites} onChange={e => setForm(f => ({ ...f, destinations_favorites: e.target.value }))}
            placeholder="Paris, Maldives, Barcelone..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="text-xs text-gray-400 mt-1">Séparées par des virgules</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Types de séjour préférés</label>
          <div className="flex flex-wrap gap-2">
            {typesOptions.map(t => (
              <button key={t} type="button" onClick={() => toggleType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${form.types_sejour.includes(t) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget min (TND)</label>
            <input type="number" min={0} value={form.budget_min} onChange={e => setForm(f => ({ ...f, budget_min: +e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget max (TND)</label>
            <input type="number" min={0} value={form.budget_max} onChange={e => setForm(f => ({ ...f, budget_max: +e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Activités préférées</label>
          <input value={form.activites_preferees} onChange={e => setForm(f => ({ ...f, activites_preferees: e.target.value }))}
            placeholder="Plongée, Randonnée, Culture..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de personnes habituel</label>
            <input type="number" min={1} value={form.nombre_personnes_habituel} onChange={e => setForm(f => ({ ...f, nombre_personnes_habituel: +e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Période préférée</label>
            <select value={form.periode_preferee} onChange={e => setForm(f => ({ ...f, periode_preferee: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="PEU_IMPORTE">Peu importe</option>
              <option value="ETE">Été</option>
              <option value="HIVER">Hiver</option>
              <option value="PRINTEMPS">Printemps</option>
              <option value="AUTOMNE">Automne</option>
            </select>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Notifications</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.notifications_email} onChange={e => setForm(f => ({ ...f, notifications_email: e.target.checked }))} className="rounded" />
            <span className="text-sm text-gray-600">Recevoir les confirmations par email</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.notifications_sms} onChange={e => setForm(f => ({ ...f, notifications_sms: e.target.checked }))} className="rounded" />
            <span className="text-sm text-gray-600">Recevoir les notifications par SMS</span>
          </label>
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-60">
          <Save className="h-4 w-4" />
          {saving ? "Enregistrement..." : saved ? "Enregistré ✓" : "Enregistrer les préférences"}
        </button>
      </form>
    </div>
  );
}
