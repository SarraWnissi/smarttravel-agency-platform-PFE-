import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { CheckCircle, Download, Home, Calendar, FileText } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { guestAPI } from "../../../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtTND } from "../../../utils/format";

function generateFacturePDF(info: {
  reference: string;
  nom: string;
  email: string;
  montant: number;
  date: string;
  methode: string;
  reservation: string;
}) {
  const doc = new jsPDF();
  const PW = doc.internal.pageSize.getWidth();

  // En-tête
  doc.setFillColor(0, 53, 128);
  doc.rect(0, 0, PW, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SmartTravel", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Agence de voyages — Tunisie", 14, 26);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE", PW - 14, 22, { align: "right" });

  // Numéro & date
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const numero = `FAC-${new Date().getFullYear()}-${info.reference.slice(-6).toUpperCase()}`;
  doc.text(`N° : ${numero}`, 14, 48);
  doc.text(`Date : ${info.date}`, 14, 55);
  doc.text(`Réf. réservation : #${info.reservation.slice(-8).toUpperCase()}`, 14, 62);

  // Client
  doc.setFillColor(240, 244, 250);
  doc.rect(14, 70, PW - 28, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Client", 18, 79);
  doc.setFont("helvetica", "normal");
  doc.text(`${info.nom}`, 18, 87);
  doc.text(info.email, PW - 18, 87, { align: "right" });

  // Tableau détail
  autoTable(doc, {
    startY: 100,
    head: [["Prestation", "Mode de paiement", "Montant TTC"]],
    body: [[
      `Réservation SmartTravel #${info.reservation.slice(-8).toUpperCase()}`,
      info.methode,
      fmtTND(info.montant),
    ]],
    headStyles: { fillColor: [0, 87, 184], textColor: 255, fontStyle: "bold" },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 2: { halign: "right", fontStyle: "bold" } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Total
  doc.setFillColor(0, 53, 128);
  doc.rect(PW - 80, finalY, 66, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL TTC", PW - 76, finalY + 9);
  doc.text(fmtTND(info.montant), PW - 18, finalY + 9, { align: "right" });

  // Pied de page
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("SmartTravel Agency — contact@smarttravel.tn — smarttravel.tn", PW / 2, 280, { align: "center" });
  doc.text("Merci de votre confiance !", PW / 2, 286, { align: "center" });

  doc.save(`facture-${numero}.pdf`);
}

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const method = searchParams.get("method") || "STRIPE";
  const paiementID = searchParams.get("paiementID") || "";
  const sessionId = searchParams.get("session_id") || "";
  const reservationIDsParam = searchParams.get("reservationIDs");
  const reservationIDs = reservationIDsParam
    ? reservationIDsParam.split(",").filter(Boolean)
    : (searchParams.get("reservationID") ? [searchParams.get("reservationID") as string] : []);
  const reservationID = reservationIDs[0] || "";
  const montantParam = Number(searchParams.get("montant") || 0);
  const guestEmailParam = searchParams.get("guestEmail") || "";

  const [countdown, setCountdown] = useState(12);
  const [pdfReady, setPdfReady] = useState(false);
  const [montant, setMontant] = useState(montantParam);
  const [guestInfo, setGuestInfo] = useState<{ nom: string; prenom: string; email: string } | null>(null);

  const isVirement = method === "VIREMENT";
  const isEspeces  = method === "ESPECES";
  const isCard     = !isVirement && !isEspeces;

  // Récupérer les infos du visiteur depuis la réservation (nom, prénom, email pour le PDF)
  useEffect(() => {
    if (user || !reservationID) return;
    const url = `http://localhost:3001/api/guest/reservation/${reservationID}` +
      (guestEmailParam ? `?email=${encodeURIComponent(guestEmailParam)}` : "");
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data?.guestNom || data?.guestPrenom || data?.guestEmail) {
          setGuestInfo({
            nom:    data.guestNom    || "",
            prenom: data.guestPrenom || "",
            email:  data.guestEmail  || guestEmailParam || "",
          });
          if (!montantParam && data.montantTotal > 0) setMontant(data.montantTotal);
        }
      })
      .catch(() => {});
  }, []);

  // Pour les visiteurs (guest) qui reviennent de Stripe : confirmer le paiement côté backend
  useEffect(() => {
    if (!isCard || user || !reservationID) {
      if (isCard) setPdfReady(true);
      return;
    }
    // Guest + Stripe : confirmer chaque réservation du groupe
    Promise.all(
      reservationIDs.map(rid =>
        guestAPI.confirmStripe({
          reservationID: rid,
          sessionId: sessionId || undefined,
          guestEmail: guestEmailParam || undefined,
        }).catch((err: any) => console.error("[confirmStripe guest]", rid, err))
      )
    ).finally(() => setPdfReady(true));
  }, []);

  // Pour clients connectés qui reviennent de Stripe
  useEffect(() => {
    if (!isCard || !user || montantParam > 0) { if (isCard) setPdfReady(true); return; }
    const reservID = reservationID;
    if (!reservID) { setPdfReady(true); return; }

    fetch(`http://localhost:3001/api/guest/reservation/${reservID}?email=${encodeURIComponent((user as any)?.email || "")}`)
      .then(r => r.json())
      .then(data => {
        const m = data?.reservation?.montantTotal || data?.montantTotal || 0;
        if (m > 0) setMontant(m);
      })
      .catch(() => {})
      .finally(() => setPdfReady(true));
  }, []);

  const handleDownloadPDF = () => {
    const ref = paiementID || sessionId || reservationID;
    const clientNom = user
      ? `${(user as any).prenom || ""} ${(user as any).nom || ""}`.trim()
      : guestInfo
        ? `${guestInfo.prenom} ${guestInfo.nom}`.trim()
        : guestEmailParam || "Client";
    const clientEmail = user
      ? (user as any).email || ""
      : guestInfo?.email || guestEmailParam || "";
    generateFacturePDF({
      reference: ref,
      nom:   clientNom   || "Client",
      email: clientEmail,
      montant: montant,
      date: new Date().toLocaleDateString("fr-FR"),
      methode: method === "STRIPE" ? "Carte bancaire (Stripe)" : method,
      reservation: reservationID || paiementID,
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          navigate(user ? "/client?page=factures" : "/");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate, user]);

  const ref = paiementID || sessionId || reservationID;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isVirement ? "Virement en attente" : isEspeces ? "Réservation confirmée" : "Paiement confirmé !"}
        </h1>

        <p className="text-gray-500 mb-6">
          {isVirement
            ? "Votre réservation est en attente de confirmation de virement. Un email avec le RIB vous a été envoyé."
            : isEspeces
            ? "Votre réservation est confirmée. Réglez à l'arrivée."
            : "Votre paiement a été accepté. Un email de confirmation vous a été envoyé."}
        </p>

        {ref && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 mb-1">Référence</p>
            <p className="font-mono text-sm text-gray-700">#{ref.slice(-12).toUpperCase()}</p>
          </div>
        )}

        <div className="space-y-3">
          {/* Bouton téléchargement direct PDF */}
          {isCard && (
            <button
              onClick={handleDownloadPDF}
              disabled={!pdfReady}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-200"
            >
              <Download className="h-5 w-5" />
              {pdfReady ? "⬇ Télécharger la facture PDF maintenant" : "Préparation de la facture..."}
            </button>
          )}

          {/* Voir dans Mes factures — pour tous les modes de paiement */}
          {user && (
            <button
              onClick={() => navigate("/client?page=factures")}
              className="w-full py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" /> Voir dans Mes factures
            </button>
          )}

          {user && (
            <button
              onClick={() => navigate("/client")}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4" /> Mes réservations
            </button>
          )}

          <button
            onClick={() => navigate(user ? "/client" : "/")}
            className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" /> {user ? "Tableau de bord" : "Accueil"}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Redirection automatique dans {countdown}s...
        </p>
      </div>
    </div>
  );
}
