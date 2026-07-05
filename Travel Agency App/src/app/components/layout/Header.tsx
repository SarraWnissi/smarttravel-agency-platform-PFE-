import { Link, useNavigate } from "react-router";
import { Plane, Menu, X, LogOut, User, LayoutDashboard, ChevronDown, Heart, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate("/");
  };

  const initials = user
    ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase()
    : "";

  const [favCount, setFavCount] = useState(() => {
    try {
      const saved = localStorage.getItem("st_favorites");
      return saved ? JSON.parse(saved).length : 0;
    } catch { return 0; }
  });

  useEffect(() => {
    const refresh = () => {
      try {
        const saved = localStorage.getItem("st_favorites");
        setFavCount(saved ? JSON.parse(saved).length : 0);
      } catch { setFavCount(0); }
    };
    window.addEventListener("st_favorites_changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("st_favorites_changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const navLinks = [
    { label: t("nav_home"), to: "/" },
    { label: t("nav_offers"), to: "/offers" },
    { label: t("nav_destinations"), to: "/destinations" },
    { label: t("nav_contact"), to: "/contact" },
  ];

  const smartLabel = t("nav_smart_search");

  return (
    <header className="bg-[#0a1628] sticky top-0 z-50 border-b border-blue-900/40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-500 transition-colors">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-white" style={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: "0.02em" }}>
              Smart<span className="text-blue-400">Travel</span>
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} className="text-gray-300 hover:text-white text-sm transition-colors">
                {link.label}
              </Link>
            ))}
            <Link
              to="/smart-search"
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {smartLabel}
            </Link>
          </div>

          {/* ── Right zone: favoris + langue + auth ── */}
          <div className="hidden md:flex items-center gap-2">

            {/* Favoris */}
            <Link
              to="/offers?favorites=true"
              className="relative p-2 text-gray-300 hover:text-white transition-colors"
              title={t("favorites")}
            >
              <Heart className="h-5 w-5" />
              {favCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {favCount > 9 ? "9+" : favCount}
                </span>
              )}
            </Link>

            {/* Sélecteur de langue */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setLang("fr")}
                className={`text-[11px] font-semibold tracking-widest transition-colors ${
                  lang === "fr" ? "text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                FR
              </button>
              <span className="text-gray-600 text-[10px]">/</span>
              <button
                onClick={() => setLang("en")}
                className={`text-[11px] font-semibold tracking-widest transition-colors ${
                  lang === "en" ? "text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                EN
              </button>
            </div>


            {/* Auth */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                    {initials}
                  </div>
                  <div className="text-left">
                    <p className="text-white text-sm">{user.prenom} {user.nom}</p>
                    <p className="text-blue-400" style={{ fontSize: "0.7rem" }}>
                      {user.role === "admin" ? t("administrator") : t("client")}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-gray-500" style={{ fontSize: "0.72rem" }}>{t("connected_as")}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs mt-1 ${
                        user.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      }`}>
                        {user.role === "admin" ? `👑 ${t("administrator")}` : `👤 ${t("client")}`}
                      </span>
                    </div>
                    <Link
                      to={user.role === "admin" ? "/admin" : "/client"}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      {t("my_space")}
                    </Link>
                    <Link
                      to={user.role === "admin" ? "/admin" : "/client"}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-sm"
                    >
                      <User className="h-4 w-4" />
                      {t("my_profile")}
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-sm"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white text-sm transition-colors px-3 py-2">
                  {t("login")}
                </Link>
                <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-500 transition-colors">
                  {t("register")}
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile toggle ── */}
          <button
            className="md:hidden p-2 text-gray-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-blue-900/40 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="block px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/smart-search"
              className="flex items-center gap-1.5 px-3 py-2.5 text-blue-400 hover:text-blue-300 hover:bg-white/10 rounded-lg text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Sparkles className="h-4 w-4" />
              {smartLabel}
            </Link>

            <hr className="border-blue-900/40 my-2" />
            {isAuthenticated && user ? (
              <>
                <div className="px-3 py-2">
                  <p className="text-white text-sm">{user.prenom} {user.nom}</p>
                  <p className="text-blue-400" style={{ fontSize: "0.75rem" }}>
                    {user.role === "admin" ? t("administrator") : t("client")}
                  </p>
                </div>
                <Link
                  to={user.role === "admin" ? "/admin" : "/client"}
                  className="flex items-center gap-2 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t("my_space")}
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-red-400 hover:bg-red-900/20 rounded-lg text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  {t("logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("login")}
                </Link>
                <Link
                  to="/register"
                  className="block mx-3 py-2.5 bg-blue-600 text-white rounded-lg text-center text-sm hover:bg-blue-500"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("register")}
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
