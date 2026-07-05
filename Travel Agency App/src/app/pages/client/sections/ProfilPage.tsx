import React from "react";
import { User, MapPin, Phone, Save, KeyRound, Lock, Eye, EyeOff, AlertTriangle, Trash2 } from "lucide-react";

interface ProfilPageProps {
  prenom: string;
  nom: string;
  user: any;
  initials: string;
  profilFirstname: string;
  setProfilFirstname: (v: string) => void;
  profilLastname: string;
  setProfilLastname: (v: string) => void;
  profilPhone: string;
  setProfilPhone: (v: string) => void;
  profilAdresse: string;
  setProfilAdresse: (v: string) => void;
  profilCurrentPwd: string;
  setProfilCurrentPwd: (v: string) => void;
  profilNewPwd: string;
  setProfilNewPwd: (v: string) => void;
  profilConfirmPwd: string;
  setProfilConfirmPwd: (v: string) => void;
  showProfilPwds: boolean;
  setShowProfilPwds: (v: boolean) => void;
  savingProfil: boolean;
  savingProfilPwd: boolean;
  handleSaveProfil: (e: React.FormEvent) => void;
  handleChangeProfilPwd: (e: React.FormEvent) => void;
  handleDeleteAccount: () => void;
}

export function ProfilPage({
  prenom, nom, user, initials,
  profilFirstname, setProfilFirstname,
  profilLastname, setProfilLastname,
  profilPhone, setProfilPhone,
  profilAdresse, setProfilAdresse,
  profilCurrentPwd, setProfilCurrentPwd,
  profilNewPwd, setProfilNewPwd,
  profilConfirmPwd, setProfilConfirmPwd,
  showProfilPwds, setShowProfilPwds,
  savingProfil, savingProfilPwd,
  handleSaveProfil, handleChangeProfilPwd, handleDeleteAccount,
}: ProfilPageProps) {
  return (
    <div className="space-y-6 max-w-lg">
      {/* Avatar header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl flex-shrink-0" style={{ fontWeight: 700 }}>{initials}</div>
        <div>
          <h3 className="text-[#0a1628] text-lg" style={{ fontWeight: 700 }}>{prenom} {nom}</h3>
          <p className="text-gray-500 text-sm">{user?.email}</p>
          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded mt-1 inline-block">Client actif</span>
        </div>
      </div>

      {/* Edit info form */}
      <form onSubmit={handleSaveProfil} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-blue-600" />
          <h4 className="text-[#0a1628] text-sm" style={{ fontWeight: 600 }}>Informations personnelles</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Prénom</label>
            <input value={profilFirstname} onChange={e => setProfilFirstname(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nom</label>
            <input value={profilLastname} onChange={e => setProfilLastname(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email</label>
          <input value={user?.email ?? ""} readOnly className="w-full px-3 py-2 text-sm border border-gray-100 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed" />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-500 mb-1"><Phone className="h-3 w-3" /> Téléphone</label>
          <input value={profilPhone} onChange={e => setProfilPhone(e.target.value)} placeholder="Ex: +216 22 333 444" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-500 mb-1"><MapPin className="h-3 w-3" /> Adresse de facturation</label>
          <input value={profilAdresse} onChange={e => setProfilAdresse(e.target.value)} placeholder="Adresse complète" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" disabled={savingProfil} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <Save className="h-4 w-4" /> {savingProfil ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      {/* Change password form */}
      <form onSubmit={handleChangeProfilPwd} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-blue-600" />
            <h4 className="text-[#0a1628] text-sm" style={{ fontWeight: 600 }}>Changer le mot de passe</h4>
          </div>
          <button type="button" onClick={() => setShowProfilPwds(!showProfilPwds)} className="text-gray-400 hover:text-gray-600">
            {showProfilPwds ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Mot de passe actuel</label>
          <input type={showProfilPwds ? "text" : "password"} value={profilCurrentPwd} onChange={e => setProfilCurrentPwd(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nouveau mot de passe</label>
          <input type={showProfilPwds ? "text" : "password"} value={profilNewPwd} onChange={e => setProfilNewPwd(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Confirmer le mot de passe</label>
          <input type={showProfilPwds ? "text" : "password"} value={profilConfirmPwd} onChange={e => setProfilConfirmPwd(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" disabled={savingProfilPwd} className="flex items-center gap-2 bg-[#0a1628] text-white px-5 py-2.5 rounded-xl text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors">
          <Lock className="h-4 w-4" /> {savingProfilPwd ? "Modification…" : "Modifier le mot de passe"}
        </button>
      </form>

      {/* Danger zone */}
      <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <h4 className="text-red-600 text-sm" style={{ fontWeight: 600 }}>Zone de danger</h4>
        </div>
        <p className="text-gray-500 text-xs mb-4">La suppression de votre compte est définitive. Toutes vos données seront effacées.</p>
        <button onClick={handleDeleteAccount} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm transition-colors">
          <Trash2 className="h-4 w-4" /> Supprimer mon compte
        </button>
      </div>
    </div>
  );
}
