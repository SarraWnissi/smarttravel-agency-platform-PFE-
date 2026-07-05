import { Plane, Facebook, Instagram, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router";
import { useLanguage } from "../../contexts/LanguageContext";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-[#080f1e] text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Plane className="h-4 w-4 text-white" />
              </div>
              <span className="text-white" style={{ fontWeight: 700 }}>
                Smart<span className="text-blue-400">Travel</span>
              </span>
            </div>
            <p className="text-sm mb-4 text-gray-500 leading-relaxed">
              {t("footer_desc")}
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Facebook, href: "https://www.facebook.com/profile.php?id=61590436086756", label: "Facebook" },
                { Icon: Instagram, href: "https://www.instagram.com/smarttravel.agency/", label: "Instagram" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 transition-all"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-sm mb-4" style={{ fontWeight: 600 }}>{t("footer_nav")}</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: t("nav_home"), to: "/" },
                { label: t("nav_offers"), to: "/offers" },
                { label: t("nav_destinations"), to: "/destinations" },
                { label: t("nav_contact"), to: "/contact" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-blue-400 transition-colors text-gray-500">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white text-sm mb-4" style={{ fontWeight: 600 }}>{t("footer_contact")}</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                <span>Gabès, Tunisie</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>(216) 20 xxx xxx</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>contact@smarttravel.tn</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>{t("footer_copyright")}</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-blue-400 transition-colors">{t("footer_privacy")}</a>
            <a href="#" className="hover:text-blue-400 transition-colors">{t("footer_terms")}</a>
            <a href="#" className="hover:text-blue-400 transition-colors">{t("footer_cookies")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}