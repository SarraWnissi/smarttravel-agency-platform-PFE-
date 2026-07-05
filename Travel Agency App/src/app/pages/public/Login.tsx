import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, ArrowRight, Plane, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { authAPI } from "../../../services/api";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUnverifiedEmail("");
    setResendDone(false);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(result.role === "admin" ? "/admin" : "/client");
      } else {
        if (result.message?.includes("confirmer votre adresse email")) {
          setUnverifiedEmail(email);
        }
        setError(result.message);
      }
    } catch {
      setError("Erreur de connexion. Vérifiez que le serveur est démarré.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await authAPI.resendVerification(unverifiedEmail);
      setResendDone(true);
    } catch {
      setError("Impossible de renvoyer l'email. Réessayez plus tard.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f0f4f8]">

      {/* ── Panneau gauche (branding) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a1628] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Plane className="h-7 w-7 text-white" />
          </div>
          <span className="text-white" style={{ fontWeight: 700, fontSize: "1.4rem" }}>
            Smart<span className="text-blue-400">Travel</span>
          </span>
        </div>

        {/* Message central */}
        <div className="relative z-10">
          <h2 className="text-white mb-4" style={{ fontSize: "2.5rem", fontWeight: 700, lineHeight: 1.2 }}>
            Bienvenue sur<br />
            <span className="text-blue-400">SmartTravel</span>
          </h2>
          <p className="text-blue-200/80" style={{ fontSize: "1.05rem", lineHeight: 1.7 }}>
            Gérez vos voyages, réservations et destinations depuis une seule plateforme professionnelle.
          </p>
        </div>

        {/* Footer branding */}
        <p className="text-blue-900/60 text-xs relative">
          © 2026 SmartTravel Agency — Projet PFE
        </p>
      </div>

      {/* ── Panneau droit (formulaire) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <span className="text-[#0a1628]" style={{ fontWeight: 700, fontSize: "1.3rem" }}>
              Smart<span className="text-blue-500">Travel</span>
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-[#0a1628] mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              {t("login_title")}
            </h1>
            <p className="text-gray-500 text-sm">{t("login_subtitle")}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <form className="space-y-5" onSubmit={handleSubmit}>

              {/* Alerte erreur */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                  {unverifiedEmail && !resendDone && (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendLoading}
                      className="mt-2 text-blue-600 hover:underline text-xs disabled:opacity-50"
                    >
                      {resendLoading ? "Envoi en cours..." : "Renvoyer l'email de confirmation"}
                    </button>
                  )}
                  {resendDone && (
                    <p className="mt-2 text-green-600 text-xs">Email renvoyé ! Vérifiez votre boîte mail.</p>
                  )}
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-gray-700 text-sm mb-1.5">
                  {t("login_email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                    required
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-gray-700 text-sm">
                    {t("login_password")}
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Entrez votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Se souvenir */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-600">{t("remember_me")}</span>
              </label>

              {/* Bouton connexion */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {t("login_btn")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-center text-gray-500 text-sm">
                {t("no_account")}{" "}
                <Link to="/register" className="text-blue-600 hover:text-blue-700">
                  {t("register_link")}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
