import { Link, useNavigate } from "react-router";
import { User, Mail, Phone, Lock, ArrowRight, Plane, Eye, EyeOff, AlertCircle } from "lucide-react";
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export function Register() {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("register_password_mismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("register_password_short"));
      return;
    }

    setLoading(true);
    try {
      const result = await register({ firstname, lastname, email, password });
      if (result.success) {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        setError(result.message);
      }
    } catch {
      setError(t("register_server_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f0f4f8]">

      {/* ── Branding panel ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#0a1628] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -bottom-32 -right-20 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute top-20 -left-16 w-60 h-60 bg-blue-400/10 rounded-full blur-2xl" />

        <div className="relative flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Plane className="h-7 w-7 text-white" />
          </div>
          <span className="text-white" style={{ fontWeight: 700, fontSize: "1.4rem" }}>
            Smart<span className="text-blue-400">Travel</span>
          </span>
        </div>

        <div className="relative z-10">
          <h2 className="text-white mb-4" style={{ fontSize: "2.2rem", fontWeight: 700, lineHeight: 1.3 }}>
            {t("register_join_prefix")} <span className="text-blue-400">{t("register_join_travellers")}</span>
          </h2>
          <p className="text-blue-200/70" style={{ fontSize: "1rem", lineHeight: 1.7 }}>
            {t("register_hero_desc")}
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { value: "10K+", label: t("register_stat_clients") },
              { value: "120+", label: t("nav_destinations") },
              { value: "4.9★", label: t("register_stat_rating") },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-white" style={{ fontWeight: 700, fontSize: "1.15rem" }}>{s.value}</p>
                <p className="text-blue-300/60 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-900/50 text-xs relative">
          © 2026 SmartTravel Agency — Projet PFE
        </p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
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

          <div className="mb-7">
            <h1 className="text-[#0a1628] mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              {t("register_title")}
            </h1>
            <p className="text-gray-500 text-sm">{t("register_subtitle")}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-7">
            <form className="space-y-4" onSubmit={handleSubmit}>

              {/* Erreur */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Prénom + Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-xs mb-1.5">{t("firstname")}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Jean"
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 text-xs mb-1.5">{t("lastname")}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Dupont"
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 text-xs mb-1.5">{t("login_email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="jean.dupont@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800"
                    required
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-gray-700 text-xs mb-1.5">{t("phone_optional")}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="+216 12 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-gray-700 text-xs mb-1.5">{t("login_password")}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder={t("register_pass_placeholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmer mot de passe */}
              <div>
                <label className="block text-gray-700 text-xs mb-1.5">{t("confirm_password")}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder={t("register_confirm_placeholder")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* CGU */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" required />
                <span className="text-xs text-gray-600 leading-relaxed">
                  {t("accept_terms")}{" "}
                  <a href="#" className="text-blue-600 hover:text-blue-700">{t("terms_of_use")}</a>
                  {" "}{t("and_privacy")}
                </span>
              </label>

              {/* Bouton */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md mt-1"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {t("register_btn")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-center text-gray-500 text-sm">
                {t("have_account")}{" "}
                <Link to="/login" className="text-blue-600 hover:text-blue-700">
                  {t("login_link")}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
