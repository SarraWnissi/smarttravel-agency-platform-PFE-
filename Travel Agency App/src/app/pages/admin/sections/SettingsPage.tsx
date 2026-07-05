import React, { useState, useEffect } from "react";
import { Shield, Home, Phone, Save, KeyRound, Lock, LogOut } from "lucide-react";
import { usersAPI, authAPI } from "../../../../services/api";
import bcrypt from "bcryptjs";

interface SettingsPageProps {
  userId: string;
  userEmail: string;
  userPrenom: string;
  userNom: string;
  onLogout: () => void;
  toast: (icon: "success" | "error" | "warning", title: string) => void;
}

export function SettingsPage({ userId, userEmail, userPrenom, userNom, onLogout, toast }: SettingsPageProps) {
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [showPwds, setShowPwds] = useState(false);

  // Charger les données actuelles de l'utilisateur
  useEffect(() => {
    if (!userId) return;
    usersAPI.getAll().then((all: any[]) => {
      const me = all.find((u: any) => u._id === userId);
      if (me) {
        setAdresse(me.adresseFacturation ?? "");
        setTelephone(me.telephone ?? "");
      }
    }).catch(() => {});
  }, [userId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await usersAPI.update(userId, { adresseFacturation: adresse, telephone });
      toast("success", "Informations mises à jour avec succès");
    } catch {
      toast("error", "Erreur lors de la mise à jour");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      toast("error", "Les mots de passe ne correspondent pas");
      return;
    }
    if (newPwd.length < 6) {
      toast("error", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setSavingPwd(true);
    try {
      // Vérifier l'ancien mot de passe via la route de login
      await authAPI.login(userEmail, currentPwd);
      // Hasher le nouveau mot de passe côté client (bcrypt, same rounds as backend)
      const hashed = await bcrypt.hash(newPwd, 10);
      await usersAPI.update(userId, { password: hashed });
      toast("success", "Mot de passe modifié avec succès");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch {
      toast("error", "Mot de passe actuel incorrect ou erreur serveur");
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Infos compte */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-[#080f1e]" style={{ fontWeight: 700 }}>Compte administrateur</h3>
            <p className="text-gray-400 text-xs">{userEmail}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-gray-400 text-xs mb-1">Prénom</p>
            <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{userPrenom}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Nom</p>
            <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{userNom}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Email</p>
            <p className="text-gray-800 text-sm">{userEmail}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Rôle</p>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">Administrateur</span>
          </div>
        </div>
      </div>

      {/* Formulaire adresse / téléphone */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Home className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-[#080f1e]" style={{ fontWeight: 700 }}>Informations de contact</h3>
            <p className="text-gray-400 text-xs">Adresse et téléphone enregistrés en base</p>
          </div>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-gray-600 text-sm mb-1.5" style={{ fontWeight: 500 }}>
              <Phone className="h-3.5 w-3.5 inline mr-1.5 text-indigo-500" />Téléphone
            </label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+216 XX XXX XXX"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1.5" style={{ fontWeight: 500 }}>
              <Home className="h-3.5 w-3.5 inline mr-1.5 text-indigo-500" />Adresse de facturation
            </label>
            <textarea
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              rows={3}
              placeholder="Rue, ville, code postal..."
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-lg text-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            <Save className="h-4 w-4" />
            {savingProfile ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </form>
      </div>

      {/* Formulaire mot de passe */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-[#0a1628] rounded-xl flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-[#080f1e]" style={{ fontWeight: 700 }}>Changer le mot de passe</h3>
            <p className="text-gray-400 text-xs">Le nouveau mot de passe sera hashé et enregistré en base</p>
          </div>
        </div>
        <form onSubmit={handleChangePwd} className="space-y-4">
          <div>
            <label className="block text-gray-600 text-sm mb-1.5" style={{ fontWeight: 500 }}>Mot de passe actuel</label>
            <div className="relative">
              <input
                type={showPwds ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                required
                placeholder="Votre mot de passe actuel"
                className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <button type="button" onClick={() => setShowPwds(!showPwds)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <Lock className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1.5" style={{ fontWeight: 500 }}>Nouveau mot de passe</label>
            <input
              type={showPwds ? "text" : "password"}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              minLength={6}
              placeholder="Minimum 6 caractères"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1.5" style={{ fontWeight: 500 }}>Confirmer le nouveau mot de passe</label>
            <input
              type={showPwds ? "text" : "password"}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
              placeholder="Répétez le nouveau mot de passe"
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                confirmPwd && newPwd !== confirmPwd
                  ? "border-red-400 focus:ring-red-400 bg-red-50"
                  : "border-gray-200 focus:ring-gray-400"
              }`}
            />
            {confirmPwd && newPwd !== confirmPwd && (
              <p className="text-red-500 text-xs mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>
          <button
            type="submit"
            disabled={savingPwd || (!!confirmPwd && newPwd !== confirmPwd)}
            className="flex items-center gap-2 bg-[#0a1628] hover:bg-[#0f2040] disabled:bg-gray-400 text-white px-5 py-2.5 rounded-lg text-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            <KeyRound className="h-4 w-4" />
            {savingPwd ? "Modification en cours..." : "Modifier le mot de passe"}
          </button>
        </form>
      </div>

      {/* Déconnexion */}
      <div className="bg-white rounded-xl shadow-sm border border-red-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>Se déconnecter</p>
            <p className="text-gray-400 text-xs mt-0.5">Terminer la session administrateur</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
