import { Filter, MapPin, Clock, Users, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { servicesAPI, proxyImage } from "../../../services/api";
import { getImageForLocation } from "./Home";
import { useLanguage } from "../../contexts/LanguageContext";

const CATEGORY_MAP: Record<string, string> = {
  plage: "plage",
  beach: "plage",
  aventure: "aventure",
  adventure: "aventure",
  ville: "ville",
  city: "ville",
  urban: "ville",
};

function getCategory(svc: any): string {
  const raw = (svc.typeDestination ?? "").toLowerCase();
  return CATEGORY_MAP[raw] ?? "ville";
}

export function Destinations() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const categories = [
    { value: "all",      label: t("destinations_cat_all"),       icon: "🌍" },
    { value: "plage",    label: t("destinations_cat_beach"),      icon: "🏖️" },
    { value: "ville",    label: t("destinations_cat_city"),       icon: "🏙️" },
    { value: "aventure", label: t("destinations_cat_adventure"),  icon: "🏔️" },
  ];

  useEffect(() => {
    servicesAPI.getAll()
      .then((data: any[]) => {
        const dest = data.filter((s) => s.typeService === "DESTINATION");
        setDestinations(dest);
      })
      .catch(() => setError(t("destinations_load_error")))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    selectedCategory === "all"
      ? destinations
      : destinations.filter((d) => getCategory(d) === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold mb-4">{t("destinations_title")}</h1>
          <p className="text-xl text-white/90">
            {t("destinations_subtitle")}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-gray-700">
              <Filter className="h-5 w-5" />
              <span className="font-semibold text-sm">{t("destinations_filter")}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat.value
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
            {!loading && (
              <span className="ml-auto text-sm text-gray-400">
                {filtered.length} {t("destinations_count_suffix")}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse">
                <div className="h-64 bg-gray-200" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && <p className="text-center text-red-500 py-20">{error}</p>}

        {/* Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((dest, index) => {
              const realImg = (dest.images || []).find((u: any) => typeof u === "string" && u.startsWith("http") && !u.includes("localhost"));
              const image = realImg ?? getImageForLocation(dest.localisation ?? dest.titre, index);
              const rating = dest.avis ?? (4.5 + (index % 5) * 0.1);
              const cat = getCategory(dest);
              const catLabel = categories.find(c => c.value === cat);
              return (
                <div
                  key={dest._id}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group"
                >
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={proxyImage(image)}
                      alt={dest.titre}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        // Repli si l'image réelle est cassée même via le proxy
                        const fb = proxyImage(getImageForLocation(dest.localisation ?? dest.titre, index));
                        if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                      }}
                    />
                    <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {dest.prixBase?.toLocaleString("fr-FR") ?? "—"} TND
                    </div>
                    {catLabel && (
                      <div className="absolute top-4 left-4 bg-white/90 text-gray-700 text-xs px-2 py-1 rounded-full">
                        {catLabel.icon} {catLabel.label}
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{dest.titre}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{typeof rating === 'number' ? rating.toFixed(1) : rating}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                      <MapPin className="h-4 w-4" />
                      <span>{dest.localisation ?? dest.adresse ?? dest.titre}</span>
                    </div>

                    {dest.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{dest.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-5">
                      {dest.duree && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{dest.duree}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{t("destinations_all_capacities")}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/offers?destination=${encodeURIComponent(dest.titre)}`)}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium"
                    >
                      {t("destinations_see_offers")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">{t("destinations_none")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
