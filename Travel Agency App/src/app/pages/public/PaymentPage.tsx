import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { CreditCard, Building2, Wallet, ArrowRight, Lock, CheckCircle, FileText } from "lucide-react";
import { paiementAPI } from "../../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const METHODS = [
    {
      id: "STRIPE",
      label: t("payment_stripe_label"),
      icon: CreditCard,
      description: t("payment_stripe_desc"),
      badge: t("payment_stripe_badge"),
    },
    {
      id: "VIREMENT",
      label: t("payment_virement_label"),
      icon: Building2,
      description: t("payment_virement_desc"),
    },
    {
      id: "ESPECES",
      label: t("payment_especes_label"),
      icon: Wallet,
      description: t("payment_especes_desc"),
    },
  ];

  // Supporte une réservation unique (reservationID) ou un groupe (reservationIDs)
  const reservationIDs = (() => {
    const grouped = searchParams.get("reservationIDs");
    if (grouped) return grouped.split(",").filter(Boolean);
    const single = searchParams.get("reservationID");
    return single ? [single] : [];
  })();
  const reservationID = reservationIDs[0] || "";
  const montant = Number(searchParams.get("montant") || 0);
  const guestEmail = searchParams.get("guestEmail") || "";

  const [selectedMethod, setSelectedMethod] = useState("STRIPE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{ message: string; methode: string } | null>(null);

  const handlePay = async () => {
    if (reservationIDs.length === 0) {
      setError("Réservation introuvable.");
      return;
    }
    setLoading(true);
    setError("");
    const isGroup = reservationIDs.length > 1;

    try {
      if (selectedMethod === "STRIPE") {
        const { guestAPI } = await import("../../../services/api");
        if (isGroup) {
          // Plusieurs chambres → une seule session Stripe groupée
          const result = await guestAPI.createStripeIntentGroup({ reservationIDs, guestEmail });
          if (result.checkoutUrl) window.location.href = result.checkoutUrl;
        } else if (user) {
          const result = await paiementAPI.create({ reservationID, methodePaiement: "STRIPE" });
          if (result.checkoutUrl) window.location.href = result.checkoutUrl;
        } else {
          const result = await guestAPI.createStripeIntent({ reservationID, guestEmail });
          if (result.checkoutUrl) window.location.href = result.checkoutUrl;
        }
      } else {
        // VIREMENT / ESPECES : payer chaque réservation (boucle pour un groupe)
        const { guestAPI } = await import("../../../services/api");
        let lastPaiementID = "";
        for (const rid of reservationIDs) {
          if (user) {
            const result = await paiementAPI.create({ reservationID: rid, methodePaiement: selectedMethod });
            lastPaiementID = result.paiement._id;
          } else {
            const result = await guestAPI.paiementSimple({ reservationID: rid, methode: selectedMethod });
            lastPaiementID = result.paiementID;
          }
        }
        navigate(
          `/payment/success?paiementID=${lastPaiementID}&method=${selectedMethod}` +
          `&montant=${montant}&reservationIDs=${reservationIDs.join(",")}` +
          (guestEmail ? `&guestEmail=${encodeURIComponent(guestEmail)}` : "")
        );
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Erreur lors du paiement.");
    } finally {
      setLoading(false);
    }
  };

  if (confirmation) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Demande enregistrée !</h1>
        <p className="text-gray-600 mb-6">{confirmation.message}</p>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3 text-left">
          <FileText className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Votre facture</p>
            <p className="text-amber-700 text-sm mt-1">
              {confirmation.methode === "VIREMENT"
                ? "Une facture pro-forma vous sera envoyée par email dès confirmation du virement. Elle sera également disponible dans votre espace client si vous possédez un compte."
                : "Une facture sera générée et disponible à votre arrivée à l'agence ou dans votre espace client."}
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate("/")} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Retour à l'accueil
          </button>
          <button onClick={() => navigate("/login")} className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            Se connecter pour suivre
          </button>
        </div>
      </div>
    );
  }

  if (reservationIDs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500">Réservation invalide.</p>
        <button onClick={() => navigate("/hotels")} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl">
          Retour aux hôtels
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4">
          <Lock className="h-7 w-7 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Paiement sécurisé</h1>
        <p className="text-gray-500 mt-1">Choisissez votre mode de paiement</p>
      </div>

      {/* Montant */}
      <div className="bg-blue-50 rounded-2xl p-5 mb-6 text-center border border-blue-100">
        <p className="text-sm text-blue-600 font-medium mb-1">Montant total à régler</p>
        <p className="text-4xl font-bold text-blue-700">{montant.toLocaleString("fr-FR")} TND</p>
        <p className="text-xs text-gray-400 mt-1">Réservation #{reservationID.slice(-8).toUpperCase()}</p>
      </div>

      {/* Méthodes de paiement */}
      <div className="space-y-3 mb-6">
        {METHODS.map(method => (
          <button
            key={method.id}
            type="button"
            onClick={() => setSelectedMethod(method.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
              selectedMethod === method.id
                ? "border-blue-500 bg-blue-50 shadow-sm"
                : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <div className={`p-2.5 rounded-xl ${selectedMethod === method.id ? "bg-blue-100" : "bg-gray-100"}`}>
              <method.icon className={`h-5 w-5 ${selectedMethod === method.id ? "text-blue-600" : "text-gray-500"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">{method.label}</span>
                {method.badge && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    {method.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{method.description}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              selectedMethod === method.id ? "border-blue-500 bg-blue-500" : "border-gray-200"
            }`}>
              {selectedMethod === method.id && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-base hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
      >
        {loading ? (
          <span>Traitement en cours...</span>
        ) : (
          <>
            {selectedMethod === "STRIPE" ? "Payer par carte" : "Confirmer"} <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
        <Lock className="h-3.5 w-3.5" />
        <span>Paiement sécurisé — chiffrement SSL 256 bits</span>
      </div>

      {selectedMethod === "STRIPE" && (
        <div className="flex items-center justify-center gap-3 mt-3 opacity-60">
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-5" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5" />
        </div>
      )}
    </div>
  );
}
