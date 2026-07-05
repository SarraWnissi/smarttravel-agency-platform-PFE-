import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { User, Mail, Phone, Calendar, Users, Bed, CreditCard, ChevronLeft, Info } from "lucide-react";
import { hebergementsAPI, guestAPI } from "../../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { calculerTarif, AGE_GRATUIT } from "../../../utils/pricing";

const FORMULE_LABELS: Record<string, string> = {
  ALL_INCLUSIVE: "All Inclusive",
  DEMI_PENSION: "Demi-pension",
  PRIX_SPECIAL: "Prix spécial",
  LOGEMENT_SEUL: "Logement seul",
};

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const hebergementID = searchParams.get("hebergementID") || "";
  const dateDebut = searchParams.get("dateDebut") || "";
  const dateFin = searchParams.get("dateFin") || "";
  const formule = searchParams.get("formule") || "LOGEMENT_SEUL";

  // Allocation par chambre. Format "rooms" : "chambreID:adultes:age1.age2,chambreID2:adultes2:ages"
  // Repli mono-chambre : chambreID + nbPersonnes + agesEnfants (ancien format).
  const allocations = (() => {
    const roomsParam = searchParams.get("rooms");
    if (roomsParam) {
      return roomsParam.split(",").map(seg => {
        const [chambreID, ad, ages] = seg.split(":");
        return {
          chambreID,
          nbAdultes: Number(ad) || 0,
          agesEnfants: ages ? ages.split(".").map(Number).filter(n => !isNaN(n)) : [],
        };
      }).filter(a => a.chambreID);
    }
    const raw = searchParams.get("agesEnfants");
    return [{
      chambreID: searchParams.get("chambreID") || "",
      nbAdultes: Number(searchParams.get("nbPersonnes") || 2),
      agesEnfants: raw ? raw.split(",").map(Number).filter(n => !isNaN(n)) : [],
    }].filter(a => a.chambreID);
  })();

  const [chambres, setChambres] = useState<any[]>([]);
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Formulaire guest
  const [guestNom, setGuestNom] = useState("");
  const [guestPrenom, setGuestPrenom] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestTelephone, setGuestTelephone] = useState("");

  // Mode de réservation : guest ou compte
  const isLoggedIn = !!user;
  const { t } = useLanguage();

  useEffect(() => {
    if (allocations.length === 0 || !hebergementID) {
      navigate("/hotels");
      return;
    }
    Promise.all([
      hebergementsAPI.getById(hebergementID),
      hebergementsAPI.getChambres(hebergementID),
    ]).then(([h, ch]) => {
      setHotel(h.hebergement || h);
      setChambres(ch);
    }).catch(() => setError(t("booking_load_error")))
      .finally(() => setLoading(false));
  }, [hebergementID]);

  const nbNuits = dateDebut && dateFin
    ? Math.max(1, Math.ceil((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000))
    : 0;

  // Réunit chaque allocation avec sa chambre et son tarif par personne
  const rooms = allocations
    .map(a => {
      const chambre = chambres.find((c: any) => c._id === a.chambreID);
      const tarif = chambre ? calculerTarif(chambre.prixParNuit, a.nbAdultes, a.agesEnfants, nbNuits) : null;
      return { ...a, chambre, tarif };
    })
    .filter(r => r.chambre);

  const montantTotal = rooms.reduce((s, r) => s + (r.tarif?.total || 0), 0);
  const totalAdultes = rooms.reduce((s, r) => s + r.nbAdultes, 0);
  const totalEnfants = rooms.reduce((s, r) => s + r.agesEnfants.length, 0);
  const nbEnfantsGratuits = rooms.reduce((s, r) => s + (r.tarif?.nbEnfantsGratuits || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isLoggedIn && (!guestNom || !guestPrenom || !guestEmail)) {
      setError(t("booking_required_fields"));
      return;
    }
    setSubmitting(true);

    try {
      const reservationIDs: string[] = [];

      // Une réservation par chambre sélectionnée (le paiement les regroupe ensuite)
      for (const r of rooms) {
        let reservation: any;
        if (isLoggedIn) {
          const { reservationsAPI } = await import("../../../services/api");
          reservation = await reservationsAPI.create({
            chambreID: r.chambreID,
            serviceID: hebergementID,
            typeReservation: "HOTEL",
            dateDebutSejour: dateDebut,
            dateFinSejour: dateFin,
            nbPersonnes: r.nbAdultes,
            agesEnfants: r.agesEnfants,
            formule,
            montantTotal: r.tarif?.total || 0,
          });
        } else {
          reservation = await guestAPI.createReservation({
            guestNom, guestPrenom, guestEmail, guestTelephone,
            chambreID: r.chambreID,
            hebergementID,
            dateDebutSejour: dateDebut,
            dateFinSejour: dateFin,
            nbPersonnes: r.nbAdultes,
            agesEnfants: r.agesEnfants,
            formule,
          });
        }
        reservationIDs.push(reservation.reservation?._id || reservation._id);
      }

      // Rediriger vers la page de paiement (groupé)
      const params = new URLSearchParams({
        reservationIDs: reservationIDs.join(","),
        montant: String(montantTotal),
        guestEmail: guestEmail || (user as any)?.email || "",
      });
      navigate(`/payment?${params.toString()}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || t("booking_error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (rooms.length === 0 || !hotel) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500">{t("booking_room_not_found")}</p>
        <button onClick={() => navigate("/hotels")} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl">
          {t("back")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> {t("back")}
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t("booking_title")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Formulaire */}
        <div className="md:col-span-3">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Infos guest */}
            {!isLoggedIn && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-500" /> {t("booking_your_info")}
                </h2>

                <div className="bg-blue-50 rounded-xl p-3 mb-4 flex items-start gap-2 text-sm text-blue-700">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    {t("booking_as_guest")}{" "}
                    <button type="button" onClick={() => navigate("/login")} className="underline font-medium">
                      {t("booking_sign_in")}
                    </button>{" "}
                    {t("booking_manage_bookings")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("booking_lastname_label")}</label>
                    <input
                      type="text"
                      value={guestNom}
                      onChange={e => setGuestNom(e.target.value)}
                      required
                      placeholder="Dupont"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("booking_firstname_label")}</label>
                    <input
                      type="text"
                      value={guestPrenom}
                      onChange={e => setGuestPrenom(e.target.value)}
                      required
                      placeholder="Marie"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse e-mail *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        required
                        placeholder="marie@exemple.com"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("phone")}</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={guestTelephone}
                        onChange={e => setGuestTelephone(e.target.value)}
                        placeholder="+216 XX XXX XXX"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isLoggedIn && (
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("booking_in_name_of")} <strong>{user?.prenom} {user?.nom}</strong>
              </div>
            )}

            {/* Choix formule */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("booking_formula")}</h2>
              <div className="px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium text-gray-700">
                {FORMULE_LABELS[formule] || formule}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-base hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="h-5 w-5" />
              {submitting ? t("booking_processing") : t("booking_continue")}
            </button>
          </form>
        </div>

        {/* Récapitulatif */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">{t("booking_summary")}</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Bed className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">{hotel.titre}</p>
                  <p className="text-gray-500">
                    {rooms.length} chambre{rooms.length > 1 ? "s" : ""} ·{" "}
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                      {FORMULE_LABELS[formule]}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-700">{formatDate(dateDebut)}</p>
                  <p className="text-gray-400 text-xs">→ {formatDate(dateFin)}</p>
                  <p className="text-gray-500">{nbNuits} {nbNuits > 1 ? t("nights") : t("night")}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-gray-700">
                    {totalAdultes} adulte{totalAdultes > 1 ? "s" : ""}
                    {totalEnfants > 0 && ` · ${totalEnfants} enfant${totalEnfants > 1 ? "s" : ""}`}
                  </span>
                  {nbEnfantsGratuits > 0 && (
                    <p className="text-emerald-600 text-xs font-medium">
                      ✓ {nbEnfantsGratuits} enfant{nbEnfantsGratuits > 1 ? "s" : ""} de moins de {AGE_GRATUIT} ans gratuit{nbEnfantsGratuits > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Détail par chambre */}
            <div className="border-t border-gray-100 mt-4 pt-4 space-y-3">
              {rooms.map((r, idx) => (
                <div key={idx} className="text-sm">
                  <div className="flex justify-between font-medium text-gray-800">
                    <span>{r.chambre.typeChambre} — N°{r.chambre.numeroChambre}</span>
                    <span>{(r.tarif?.total || 0).toLocaleString("fr-FR")} TND</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {r.nbAdultes} adulte{r.nbAdultes > 1 ? "s" : ""}
                    {r.agesEnfants.length > 0 && ` + ${r.agesEnfants.length} enfant${r.agesEnfants.length > 1 ? "s" : ""} (${r.agesEnfants.map(a => `${a} an${a > 1 ? "s" : ""}`).join(", ")})`}
                    {" · "}{(r.tarif?.parNuit || 0).toLocaleString("fr-FR")} TND × {nbNuits} {nbNuits > 1 ? t("nights") : t("night")}
                  </p>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-3">
                <span>{t("total")}</span>
                <span className="text-blue-600">{montantTotal.toLocaleString("fr-FR")} TND</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              {t("booking_secure_payment")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
