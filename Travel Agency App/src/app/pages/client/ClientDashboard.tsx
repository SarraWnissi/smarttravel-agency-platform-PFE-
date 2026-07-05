import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import {
  Plane, Calendar, CreditCard, MapPin, Clock,
  LogOut, User, Bell, ChevronRight, Home, Package,
  FileText, Settings, Menu, X, CheckCircle, Search,
  AlertCircle, TrendingUp, Eye, EyeOff, Lock, ShieldCheck, ArrowLeft,
  Star, Trash2, MessageSquare, Download, Save, KeyRound, Phone, AlertTriangle,
  Bot, Sparkles, RefreshCw, Building2,
} from "lucide-react";
import { Hotels } from "../public/Hotels";
import { useAuth } from "../../contexts/AuthContext";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";
import { reservationsAPI, offresAPI, facturesAPI, paiementAPI, servicesAPI, hebergementsAPI, avisAPI, usersAPI, authAPI, mapStatut } from "../../../services/api";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { prixOffreLeMoinsCher } from "./shared";
import { DashboardPage } from "./sections/DashboardPage";
import { ReservationsPage } from "./sections/ReservationsPage";
import { OffresPage } from "./sections/OffresPage";
import { ServicesPage } from "./sections/ServicesPage";
import { FacturesPage } from "./sections/FacturesPage";
import { AvisPage } from "./sections/AvisPage";
import { ProfilPage } from "./sections/ProfilPage";
import { ParametresPage } from "./sections/ParametresPage";
import { PreferencesSection } from "./sections/PreferencesSection";
import { AIClientPage } from "./sections/AIClientPage";
import { ChatbotWidget } from "./sections/ChatbotWidget";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400",
  "https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?w=400",
  "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400",
  "https://images.unsplash.com/photo-1714412192114-61dca8f15f68?w=400",
];

const notifications = [
  { id: 1, text: "Bienvenue sur votre espace SmartTravel.", time: "Maintenant", type: "info" },
  { id: 2, text: "Découvrez nos nouvelles offres disponibles.", time: "Il y a 1j", type: "info" },
];

type Page = "dashboard" | "reservations" | "offres" | "hotels" | "services" | "factures" | "avis" | "preferences" | "ia" | "profil" | "parametres";

const menuItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: Home },
  { id: "reservations", label: "Mes réservations", icon: Calendar },
  { id: "offres", label: "Offres & Voyages", icon: Package },
  { id: "hotels", label: "Hôtels", icon: Building2 },
  { id: "services", label: "Nos services", icon: ShieldCheck },
  { id: "factures", label: "Mes factures", icon: FileText },
  { id: "avis", label: "Mes avis", icon: Star },
  { id: "preferences", label: "Mes préférences", icon: Settings },
  { id: "ia", label: "Recommandations IA", icon: Sparkles },
  { id: "profil", label: "Mon profil", icon: User },
  { id: "parametres", label: "Paramètres", icon: Settings },
];


function mapReservation(r: any, index: number) {
  return {
    id: r._id?.slice(-8)?.toUpperCase() ?? "—",
    rawId: r._id,
    destination: r.offreID?.titre ?? r.serviceID?.titre ?? r.paysDestination ?? "Voyage",
    image: PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length],
    dateDepart: r.dateDebutSejour ? new Date(r.dateDebutSejour).toLocaleDateString("fr-FR") : "—",
    dateRetour: r.dateFinSejour ? new Date(r.dateFinSejour).toLocaleDateString("fr-FR") : "—",
    nbPersonnes: r.nbPersonnes ?? 1,
    montant: r.montantTotal ?? 0,
    statut: mapStatut(r.statut),
    type: r.typeReservation === "HOTEL" ? "Hôtel" : r.typeReservation === "EXCURSION" ? "Excursion" : "International",
    rawType: r.typeReservation ?? "—",
    nbNuits: r.nbNuits ?? null,
    rawDateFin: r.dateFinSejour ?? null,
    rawDateExcursion: r.dateExcursion ?? null,
    rawStatut: r.statut,
    // conservé pour générer une facture virtuelle
    rawMontant: r.montantTotal ?? 0,
  };
}

const METHODES_PAIEMENT = [
  { value: "CARTE",    label: "Carte bancaire",   icon: "💳", desc: "Visa · Mastercard · CIB" },
  { value: "STRIPE",   label: "Stripe",           icon: "⚡", desc: "Paiement sécurisé en ligne" },
  { value: "PAYPAL",   label: "PayPal",           icon: "🅿️", desc: "Connexion avec votre compte PayPal" },
  { value: "VIREMENT", label: "Virement bancaire",icon: "🏦", desc: "RIB + référence fournis" },
  { value: "ESPECES",  label: "Espèces",          icon: "💵", desc: "Paiement à l'agence" },
];

const fmtCardNum = (v: string) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

const fmtExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d;
};

const cardBrand = (n: string): "VISA" | "MC" | "AMEX" | "GENERIC" => {
  const d = n.replace(/\s/g, "");
  if (/^4/.test(d)) return "VISA";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "MC";
  if (/^3[47]/.test(d)) return "AMEX";
  return "GENERIC";
};


export function ClientDashboard() {
  const [activePage, setActivePage] = useState<Page>("hotels");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [reservations, setReservations] = useState<any[]>([]);
  const [offres, setOffres] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [hebergements, setHebergements] = useState<any[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);

  // Reservation creation modal
  const [resModal, setResModal] = useState<{ open: boolean; offre: any | null; service: any | null; hebergement: any | null }>({ open: false, offre: null, service: null, hebergement: null });
  const [chambres, setChambres] = useState<any[]>([]);
  const [loadingChambres, setLoadingChambres] = useState(false);
  const [resForm, setResForm] = useState({ dateDebut: "", dateFin: "", dateExcursion: "", nbPersonnes: "1", chambreId: "", numPassport: "", visa: false, paysDestination: "", agesEnfants: [] as number[] });
  const [resLoading, setResLoading] = useState(false);

  const [payModal, setPayModal] = useState<{ open: boolean; reservation: any | null }>({ open: false, reservation: null });
  const [payMethod, setPayMethod] = useState("CARTE");
  const [payStep, setPayStep] = useState<"method" | "details">("method");
  const [payProcessing, setPayProcessing] = useState(false);
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [myAvis, setMyAvis] = useState<any[]>([]);
  const [avisModal, setAvisModal] = useState<{ open: boolean; reservation: any | null }>({ open: false, reservation: null });
  const [avisNote, setAvisNote] = useState(5);
  const [avisComment, setAvisComment] = useState("");
  const [avisSubmitting, setAvisSubmitting] = useState(false);
  // Pagination
  const [pageRes, setPageRes] = useState(1);
  const [pageResAttente, setPageResAttente] = useState(1);
  const [pageResConfirmees, setPageResConfirmees] = useState(1);
  const [pageResAutres, setPageResAutres] = useState(1);
  const [pageOffres, setPageOffres] = useState(1);
  const [pageFactures, setPageFactures] = useState(1);
  const [pageAvis, setPageAvis] = useState(1);
  const [pageHebSvc, setPageHebSvc] = useState(1);
  const [pageDestSvc, setPageDestSvc] = useState(1);
  const [pageActSvc, setPageActSvc] = useState(1);
  const [searchOffres, setSearchOffres] = useState("");
  const [searchServices, setSearchServices] = useState("");
  // Profil edit state
  const [profilFirstname, setProfilFirstname] = useState("");
  const [profilLastname, setProfilLastname] = useState("");
  const [profilAdresse, setProfilAdresse] = useState("");
  const [profilPhone, setProfilPhone] = useState("");
  const [savingProfil, setSavingProfil] = useState(false);
  const [profilCurrentPwd, setProfilCurrentPwd] = useState("");
  const [profilNewPwd, setProfilNewPwd] = useState("");
  const [profilConfirmPwd, setProfilConfirmPwd] = useState("");
  const [savingProfilPwd, setSavingProfilPwd] = useState(false);
  const [showProfilPwds, setShowProfilPwds] = useState(false);
  // Card form state
  const [cardNum, setCardNum] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardFlipped, setCardFlipped] = useState(false);
  // PayPal form state
  const [ppEmail, setPpEmail] = useState("");
  const [ppPwd, setPpPwd] = useState("");
  const [ppShowPwd, setPpShowPwd] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Lire le paramètre ?page=factures au chargement (venant de PaymentSuccess)
  useEffect(() => {
    const page = searchParams.get("page");
    if (page === "factures") {
      // Recharger les factures puis naviguer
      facturesAPI.getAll().then(f => {
        setFactures(f);
        setActivePage("factures");
      }).catch(() => setActivePage("factures"));
      // Nettoyer l'URL
      navigate("/client", { replace: true });
    }
  }, []);

  // Recharger les factures à chaque fois qu'on navigue vers cet onglet
  useEffect(() => {
    if (activePage === "factures") {
      facturesAPI.getAll().then(f => setFactures(f)).catch(() => {});
    }
  }, [activePage]);

  useEffect(() => {
    Promise.all([
      reservationsAPI.getAll().catch(() => []),
      offresAPI.getAll().catch(() => []),
      facturesAPI.getAll().catch(() => []),
      servicesAPI.getAll().catch(() => []),
      hebergementsAPI.getAll().catch(() => []),
      avisAPI.getAll().catch(() => []),
    ]).then(([r, o, f, s, h, a]) => {
      setReservations(r.map(mapReservation));
      setOffres(o);
      setFactures(f);
      setServices(s);
      setHebergements(h);
      const uid = user?.id;
      setMyAvis(uid ? a.filter((av: any) => String(av.clientID?._id ?? av.clientID) === String(uid)) : []);

      // Traiter une réservation initiée depuis la page publique Offres (sans login)
      const rawPending = localStorage.getItem("st_pending_reservation");
      if (rawPending) {
        localStorage.removeItem("st_pending_reservation");
        try {
          const pending = JSON.parse(rawPending);
          let data: any;
          if (pending.typeReservation === "HOTEL") {
            data = {
              offreID: pending.offreId,
              typeReservation: "HOTEL",
              chambreID: pending.chambreID,
              dateDebutSejour: pending.dateDebutSejour ?? pending.dateDebut,
              dateFinSejour: pending.dateFinSejour ?? pending.dateFin,
              nbPersonnes: pending.nbPersonnes ?? 1,
            };
          } else {
            data = {
              offreID: pending.offreId,
              typeReservation: pending.typeReservation ?? "INTERNATIONALE",
              dateDebutSejour: pending.dateDebut,
              dateFinSejour: pending.dateFin,
              nbPersonnes: pending.nbPersonnes ?? 1,
              agesEnfants: pending.agesEnfants ?? [],
              numPassport: pending.numPassport,
            };
          }
          reservationsAPI.create(data)
            .then(async () => {
              const updated = await reservationsAPI.getAll();
              setReservations(updated.map(mapReservation));
              setActivePage("reservations");
              Swal.fire({
                icon: "success",
                title: "Réservation créée !",
                text: "Votre réservation est en attente de paiement. Cliquez sur « Payer » pour procéder.",
                confirmButtonColor: "#2563eb",
              });
            })
            .catch(async (err: any) => {
              try {
                const updated = await reservationsAPI.getAll();
                const mapped = updated.map(mapReservation);
                if (mapped.length > r.length) {
                  setReservations(mapped);
                  setActivePage("reservations");
                  Swal.fire({ icon: "success", title: "Réservation créée !", text: "Votre réservation est en attente de paiement. Cliquez sur « Payer » pour procéder.", confirmButtonColor: "#2563eb" });
                  return;
                }
              } catch {}
              Swal.fire({ icon: "error", title: "Erreur", text: err?.message ?? "Impossible de créer la réservation." });
            });
        } catch {
          // données corrompues, on ignore
        }
      }
    }).finally(() => setLoadingRes(false));
  }, []);

  const handleLogout = () => { logout(); navigate("/"); };

  const prenom = user?.prenom ?? "";
  const nom = user?.nom ?? "";
  const userId = user?.id ?? "";
  const initials = ((prenom[0] ?? "") + (nom[0] ?? "")).toUpperCase() || "CL";

  const totalDepense = reservations.reduce((s, r) => s + (r.montant ?? 0), 0);
  const firstRes = reservations[0];

  // Enrich each offer with its service, type badge, validity period, and hebergement link
  const enrichedOffres = offres.map((o, i) => {
    const svcId = String(o.serviceID?._id ?? o.serviceID ?? "");
    const service = services.find((s) => String(s._id) === svcId) ?? null;
    const typeService = service?.typeService ?? "";
    const typeBadge =
      typeService === "HEBERGEMENT" ? { label: "Hôtel", css: "bg-blue-100 text-blue-700", icon: "🏨", res: "HOTEL" } :
      typeService === "ACTIVITE"    ? { label: "Excursion", css: "bg-green-100 text-green-700", icon: "🧭", res: "EXCURSION" } :
                                      { label: "International", css: "bg-purple-100 text-purple-700", icon: "✈️", res: "INTERNATIONALE" };
    // Simulated validity: spread between 22 and 70 days so cards look varied
    const daysLeft = 22 + ((i * 16) % 49);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + daysLeft);
    const urgency = daysLeft <= 7 ? "text-red-600" : daysLeft <= 14 ? "text-orange-500" : "text-green-600";
    // Vraies images : hôtel lié (HEBERGEMENT) ou photos du service (DESTINATION/ACTIVITE)
    const heb = typeService === "HEBERGEMENT"
      ? hebergements.find((h) => String(h.serviceID) === String(service?._id)) ?? null
      : null;
    const image = heb?.images?.[0] ?? service?.images?.[0] ?? PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length];
    return { ...o, service, typeBadge, daysLeft, urgency, validUntil, image };
  });

  // Set of service IDs that already have promotional offers linked
  const serviceIdsWithOffres = new Set(
    offres.map((o: any) => String(o.serviceID?._id ?? o.serviceID ?? "")).filter(Boolean)
  );

  const openResModal = async (offre: any | null, directService: any | null = null) => {
    const svcId = offre ? String(offre.serviceID?._id ?? offre.serviceID ?? "") : null;
    const service = offre
      ? (services.find((s) => String(s._id) === svcId) ?? null)
      : directService;
    let hebergement: any = null;

    // ── Option 1 : pour un hôtel, basculer sur le parcours complet (page hôtel)
    // qui gère la disponibilité par dates, adultes/enfants et le prix calculé,
    // exactement comme le parcours visiteur. ──
    if (service?.typeService === "HEBERGEMENT") {
      const heb = hebergements.find((h) => String(h.serviceID) === String(service._id)) ?? null;
      if (heb?._id) {
        navigate(`/hotels/${heb._id}`);
        return;
      }
      // Repli : hébergement lié introuvable → on retombe sur le modal simple ci-dessous.
    }

    setResForm({ dateDebut: "", dateFin: "", dateExcursion: "", nbPersonnes: "1", chambreId: "", numPassport: "", visa: false, paysDestination: "", agesEnfants: [] });
    setChambres([]);
    setResModal({ open: true, offre, service, hebergement });

    if (service?.typeService === "HEBERGEMENT") {
      const heb = hebergements.find((h) => String(h.serviceID) === String(service._id)) ?? null;
      hebergement = heb;
      setResModal({ open: true, offre, service, hebergement });
      if (heb) {
        setLoadingChambres(true);
        try {
          const all = await hebergementsAPI.getChambres(heb._id);
          setChambres(all.filter((c: any) => c.disponible));
        } catch { setChambres([]); }
        finally { setLoadingChambres(false); }
      }
    }
  };

  const handleCreateReservation = async () => {
    const { offre, service } = resModal;
    if (!service) {
      Swal.fire({ icon: "error", title: "Service introuvable", text: "Impossible de déterminer le type de cette réservation. Rechargez la page et réessayez." });
      return;
    }
    const nb = parseInt(resForm.nbPersonnes) || 1;
    let data: any = offre
      ? { offreID: offre._id, nbPersonnes: nb }
      : { serviceID: service._id, nbPersonnes: nb };

    if (service.typeService === "HEBERGEMENT") {
      if (!resForm.dateDebut || !resForm.dateFin) { Swal.fire({ icon: "warning", title: "Dates requises", text: "Sélectionnez les dates d'arrivée et de départ." }); return; }
      if (!resForm.chambreId) { Swal.fire({ icon: "warning", title: "Chambre requise", text: "Veuillez choisir une chambre." }); return; }
      data = { ...data, typeReservation: "HOTEL", dateDebutSejour: resForm.dateDebut, dateFinSejour: resForm.dateFin, chambreID: resForm.chambreId };
    } else if (service.typeService === "ACTIVITE") {
      if (!resForm.dateExcursion) { Swal.fire({ icon: "warning", title: "Date requise", text: "Sélectionnez la date de l'excursion." }); return; }
      data = { ...data, typeReservation: "EXCURSION", dateExcursion: resForm.dateExcursion };
    } else {
      if (!resForm.dateDebut || !resForm.dateFin) { Swal.fire({ icon: "warning", title: "Dates requises" }); return; }
      if (!resForm.numPassport) { Swal.fire({ icon: "warning", title: "Numéro de passeport requis", text: "Le passeport est obligatoire pour une réservation internationale." }); return; }
      if (!/^[A-Z][0-9]{7}$/.test(resForm.numPassport)) { Swal.fire({ icon: "warning", title: "Numéro de passeport invalide", text: "Format attendu : 1 lettre suivie de 7 chiffres (ex : A1234567)." }); return; }
      // Forfait par personne : enfants de moins de 5 ans gratuits → on facture les payants.
      const enfantsPayants = resForm.agesEnfants.filter((a) => a >= 5).length;
      data = { ...data, nbPersonnes: nb + enfantsPayants, agesEnfants: resForm.agesEnfants, typeReservation: "INTERNATIONALE", dateDebutSejour: resForm.dateDebut, dateFinSejour: resForm.dateFin, numPassport: resForm.numPassport, visa: resForm.visa };
    }

    // Redirige vers la page de paiement (mêmes méthodes que le parcours visiteur)
    const goToPayment = (reservationID: string, montant: number) => {
      const params = new URLSearchParams({
        reservationIDs: reservationID,
        montant: String(montant ?? 0),
        guestEmail: user?.email ?? "",
      });
      navigate(`/payment?${params.toString()}`);
    };

    setResLoading(true);
    try {
      const created = await reservationsAPI.create(data);
      const reservationID = created?._id ?? created?.reservation?._id;
      const montant = created?.montantTotal ?? created?.reservation?.montantTotal ?? 0;
      setResModal({ open: false, offre: null, service: null, hebergement: null });
      if (!reservationID) throw new Error("Réservation créée mais identifiant introuvable.");
      goToPayment(reservationID, montant);
    } catch (err: any) {
      // The backend saves the reservation before calling an external webhook.
      // If the webhook is offline the backend returns 500, but the reservation
      // is already persisted. Reload and check — if a new entry appeared, treat
      // it as a success (the only real failure was the notification webhook).
      try {
        const updated = await reservationsAPI.getAll();
        const mapped = updated.map(mapReservation);
        if (mapped.length > reservations.length) {
          setReservations(mapped);
          setResModal({ open: false, offre: null, service: null, hebergement: null });
          const knownIds = new Set(reservations.map((r: any) => r.rawId));
          const nouvelle = mapped.find((r: any) => !knownIds.has(r.rawId)) ?? mapped[mapped.length - 1];
          goToPayment(nouvelle.rawId, nouvelle.montant);
          return;
        }
      } catch {}
      Swal.fire({ icon: "error", title: "Erreur", text: err?.message ?? "Impossible de créer la réservation" });
    } finally { setResLoading(false); }
  };

  const reloadReservations = async () => {
    const updated = await reservationsAPI.getAll();
    setReservations(updated.map(mapReservation));
  };

  const reloadAvis = async () => {
    const all = await avisAPI.getAll();
    const uid = user?.id;
    setMyAvis(uid ? all.filter((av: any) => String(av.clientID?._id ?? av.clientID) === String(uid)) : []);
  };

  const getAvisForReservation = (rawId: string) =>
    myAvis.find((a: any) => String(a.reservationID?._id ?? a.reservationID) === String(rawId));

  const isTripEnded = (res: any) => {
    const now = new Date();
    if (res.type === "Excursion") return res.rawDateExcursion && new Date(res.rawDateExcursion) < now;
    return res.rawDateFin && new Date(res.rawDateFin) < now;
  };

  const openAvisModal = (res: any) => {
    setAvisNote(5);
    setAvisComment("");
    setAvisModal({ open: true, reservation: res });
  };

  const handleSubmitAvis = async () => {
    if (!avisModal.reservation) return;
    setAvisSubmitting(true);
    try {
      await avisAPI.create({ reservationID: avisModal.reservation.rawId, note: avisNote, commentaire: avisComment });
      await reloadAvis();
      setAvisModal({ open: false, reservation: null });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Avis publié !", showConfirmButton: false, timer: 2500, timerProgressBar: true });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Erreur", text: err?.message ?? "Impossible de publier l'avis" });
    } finally {
      setAvisSubmitting(false);
    }
  };

  const handleDeleteAvis = async (avisId: string) => {
    const result = await Swal.fire({
      title: "Supprimer cet avis ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });
    if (!result.isConfirmed) return;
    try {
      await avisAPI.delete(avisId);
      await reloadAvis();
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Avis supprimé", showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Erreur", text: err?.message ?? "Impossible de supprimer" });
    }
  };

  const handleCancelReservation = async (rawId: string) => {
    const result = await Swal.fire({
      title: "Annuler la réservation ?",
      text: "Cette action est irréversible.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Oui, annuler",
      cancelButtonText: "Non",
    });
    if (!result.isConfirmed) return;
    try {
      await reservationsAPI.cancel(rawId);
      await reloadReservations();
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Réservation annulée", showConfirmButton: false, timer: 2500, timerProgressBar: true });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Erreur", text: err?.message ?? "Impossible d'annuler" });
    }
  };

  const handleDeleteReservation = async (rawId: string) => {
    const result = await Swal.fire({
      title: "Supprimer la réservation ?",
      text: "La réservation sera définitivement supprimée de votre historique.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });
    if (!result.isConfirmed) return;
    try {
      await reservationsAPI.cancel(rawId);
      setReservations(prev => prev.filter(r => r.rawId !== rawId));
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Réservation supprimée", showConfirmButton: false, timer: 2500, timerProgressBar: true });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Erreur", text: err?.message ?? "Impossible de supprimer" });
    }
  };

  const openPayModal = (res: any) => {
    setPayMethod("CARTE");
    setPayStep("method");
    setPayProcessing(false);
    setCardNum(""); setCardName(""); setCardExpiry(""); setCardCvv(""); setCardFlipped(false);
    setPpEmail(""); setPpPwd(""); setPpShowPwd(false);
    setPayModal({ open: true, reservation: res });
  };

  const closePayModal = () => { setPayModal({ open: false, reservation: null }); setPayProcessing(false); };

  // Load profil fields whenever user data is available
  useEffect(() => {
    if (!userId) return;
    usersAPI.getAll().then((all: any[]) => {
      const me = all.find((u: any) => u._id === userId);
      if (me) {
        setProfilFirstname(me.firstname ?? "");
        setProfilLastname(me.lastname ?? "");
        setProfilAdresse(me.adresseFacturation ?? "");
        setProfilPhone(me.telephone ?? "");
      }
    }).catch(() => {});
  }, [userId]);

  const handleSaveProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfil(true);
    try {
      await usersAPI.update(userId, { firstname: profilFirstname, lastname: profilLastname, adresseFacturation: profilAdresse, telephone: profilPhone });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Profil mis à jour", showConfirmButton: false, timer: 2500 });
    } catch {
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: "Erreur lors de la mise à jour", showConfirmButton: false, timer: 2500 });
    } finally { setSavingProfil(false); }
  };

  const handleChangeProfilPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profilNewPwd !== profilConfirmPwd) { Swal.fire({ toast: true, position: "top-end", icon: "error", title: "Mots de passe non identiques", showConfirmButton: false, timer: 2500 }); return; }
    if (profilNewPwd.length < 6) { Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "Min 6 caractères", showConfirmButton: false, timer: 2500 }); return; }
    setSavingProfilPwd(true);
    try {
      await authAPI.login(user!.email, profilCurrentPwd);
      const hashed = await bcrypt.hash(profilNewPwd, 10);
      await usersAPI.update(userId, { password: hashed });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Mot de passe modifié", showConfirmButton: false, timer: 2500 });
      setProfilCurrentPwd(""); setProfilNewPwd(""); setProfilConfirmPwd("");
    } catch {
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: "Mot de passe actuel incorrect", showConfirmButton: false, timer: 2500 });
    } finally { setSavingProfilPwd(false); }
  };

  const handleDeleteAccount = async () => {
    const res = await Swal.fire({ title: "Supprimer le compte ?", text: "Cette action est définitive et irréversible.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Oui, supprimer", cancelButtonText: "Annuler" });
    if (!res.isConfirmed) return;
    try {
      await usersAPI.delete(userId);
      logout();
      navigate("/");
    } catch {
      Swal.fire({ icon: "error", title: "Erreur", text: "Impossible de supprimer le compte." });
    }
  };

  const downloadFacturePDF = async (f: any) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const PW = doc.internal.pageSize.getWidth();   // 210
    const PH = doc.internal.pageSize.getHeight();  // 297

    // ── Résolution des données ────────────────────────────────────
    const isVirtual = !!f._isVirtual;
    const vRes      = f._reservation;
    const res       = f.paiementID?.reservationID;
    const pmt       = f.paiementID;

    // Infos client — priorité aux données de la réservation (guest ou client connecté)
    const isGuest   = !res?.clientID && (res?.guestEmail || res?.guestNom);
    const clientPrenom = isGuest
      ? (res?.guestPrenom ?? "")
      : (res?.clientID?.firstname ?? prenom ?? "");
    const clientNom = isGuest
      ? (res?.guestNom ?? "")
      : (res?.clientID?.lastname ?? nom ?? "");
    const clientEmail = isGuest
      ? (res?.guestEmail ?? "")
      : (res?.clientID?.email ?? user?.email ?? "");
    const clientTel = isGuest
      ? (res?.guestTelephone ?? "")
      : (res?.clientID?.telephone ?? user?.telephone ?? "");

    // Numéro de facture
    const numero = isVirtual
      ? `ST-${vRes?.id ?? "—"}`
      : (f.numeroFacture ?? `ST-${f._id?.slice(-8)?.toUpperCase() ?? "—"}`);

    // Date d'émission
    const dateEm = isVirtual
      ? new Date().toLocaleDateString("fr-FR")
      : (f.dateEmission ? new Date(f.dateEmission).toLocaleDateString("fr-FR") : "—");

    // Montants — en base montantHT == montantTTC (pas de TVA séparée), on recalcule
    const montantTTC = isVirtual ? Number(vRes?.rawMontant ?? 0) : Number(f.montantTTC ?? 0);
    const rawHT      = isVirtual ? 0 : Number(f.montantHT ?? 0);
    const montantHT  = (rawHT === 0 || rawHT === montantTTC)
      ? +(montantTTC / 1.19).toFixed(3)
      : rawHT;
    const tva = +(montantTTC - montantHT).toFixed(3);

    // Type de réservation
    const typeMap: Record<string, string> = { HOTEL: "Hôtel", EXCURSION: "Excursion", INTERNATIONALE: "International" };
    const rawType  = isVirtual ? (vRes?.rawType ?? "") : (res?.typeReservation ?? "");
    const typeLabel = typeMap[rawType] ?? rawType ?? "—";

    // Titre / prestation
    let titre: string;
    if (isVirtual) {
      titre = vRes?.destination ?? "Réservation de voyage";
    } else {
      const hotelName   = res?.chambreID?.hebergementID?.titre ?? null;
      const chambreInfo = res?.chambreID
        ? `${hotelName ? hotelName + " — " : ""}Chambre ${res.chambreID.typeChambre ?? ""} n°${res.chambreID.numeroChambre ?? ""}`.trim()
        : null;
      titre = res?.offreID?.titre
        ?? res?.serviceID?.titre
        ?? chambreInfo
        ?? (res?.paysDestination ? `Voyage — ${res.paysDestination}` : null)
        ?? "Réservation de voyage";
    }

    // Nombre de personnes
    const nbPers = isVirtual ? (vRes?.nbPersonnes ?? 1) : (res?.nbPersonnes ?? 1);

    // Période / dates
    let periode: string;
    if (isVirtual) {
      const d1  = vRes?.dateDepart ?? "—";
      const d2  = vRes?.dateRetour ?? "—";
      const dEx = vRes?.rawDateExcursion
        ? new Date(vRes.rawDateExcursion).toLocaleDateString("fr-FR")
        : (vRes?.dateDepart ?? "—");
      if (rawType === "EXCURSION")
        periode = dEx;
      else
        periode = d2 !== "—" ? `${d1} au ${d2}` : d1;
    } else {
      const d1  = res?.dateDebutSejour ? new Date(res.dateDebutSejour).toLocaleDateString("fr-FR") : "—";
      const d2  = res?.dateFinSejour   ? new Date(res.dateFinSejour).toLocaleDateString("fr-FR")   : "—";
      const dEx = res?.dateExcursion   ? new Date(res.dateExcursion).toLocaleDateString("fr-FR")   : "—";
      if (rawType === "EXCURSION")
        periode = dEx;
      else
        periode = d2 !== "—" ? `${d1} au ${d2}` : d1;
    }

    // Nombre de nuits
    const nbNuits = isVirtual ? (vRes?.nbNuits ?? null) : (res?.nbNuits ?? null);
    const nuitsText = nbNuits ? `${nbNuits} nuit${nbNuits > 1 ? "s" : ""}` : null;

    // Méthode de paiement
    const methodeMap: Record<string, string> = {
      CARTE: "Carte bancaire", STRIPE: "Stripe", PAYPAL: "PayPal",
      VIREMENT: "Virement bancaire", ESPECES: "Espèces",
    };
    const methode = isVirtual
      ? "Paiement en ligne"
      : (methodeMap[pmt?.methodePaiement ?? ""] ?? pmt?.methodePaiement ?? "Paiement en ligne");

    // Destination pays (internationale)
    const paysDest = isVirtual ? null : (res?.paysDestination ?? null);

    // Sanitise text: replace narrow no-break space (U+202F) and remove non-Latin-1 chars
    const pdf = (s: string | number) =>
      String(s).replace(/ /g, " ").replace(/[^\x00-\xFF]/g, "");

    // ── QR Code ────────────────────────────────────────────────
    const qrContent = `SMARTTRAVEL|${numero}|${montantTTC}TND|${dateEm}`;
    const qrDataUrl = await QRCode.toDataURL(qrContent, { width: 160, margin: 1, color: { dark: "#0f1f3d", light: "#ffffff" } });

    // ── Helpers ────────────────────────────────────────────────
    const fmtMoney = (n: number) => pdf(n.toLocaleString("fr-FR"));
    const C = {
      navy:    [15, 31, 61]  as [number,number,number],
      blue:    [37, 99, 235] as [number,number,number],
      lblue:   [219, 234, 254] as [number,number,number],
      green:   [22, 163, 74] as [number,number,number],
      white:   [255,255,255] as [number,number,number],
      gray1:   [248, 250, 252] as [number,number,number],
      gray2:   [226, 232, 240] as [number,number,number],
      text:    [15, 23, 42]  as [number,number,number],
      muted:   [100, 116, 139] as [number,number,number],
      sub:     [71, 85, 105] as [number,number,number],
    };
    const setFill  = (c: [number,number,number]) => doc.setFillColor(...c);
    const setTxt   = (c: [number,number,number]) => doc.setTextColor(...c);
    const setDraw  = (c: [number,number,number]) => doc.setDrawColor(...c);

    // ══════════════════════════════════════════════
    //  HEADER BLOCK (full width navy)
    // ══════════════════════════════════════════════
    setFill(C.navy);
    doc.rect(0, 0, PW, 56, "F");

    // Accent bar top
    setFill(C.blue);
    doc.rect(0, 0, PW, 3, "F");

    // Company name — left
    setTxt(C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("Smart", 14, 24);
    setTxt(C.lblue);
    doc.text("Travel", 14 + doc.getTextWidth("Smart") + 1, 24);

    setTxt([148, 163, 184]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Agence de voyages - Projet de Fin d'Etudes", 14, 32);
    doc.text("contact@smarttravel.com   +33 1 23 45 67 89   smarttravel.tn", 14, 39);

    // FACTURE label — right
    setTxt(C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.text("FACTURE", PW - 14, 28, { align: "right" });

    // Invoice number — right below
    setTxt(C.lblue);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(pdf(`N ${numero}`), PW - 14, 37, { align: "right" });

    // PAYEE badge — right
    setFill(C.green);
    doc.roundedRect(PW - 46, 43, 32, 8, 2, 2, "F");
    setTxt(C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("PAYEE", PW - 30, 48.5, { align: "center" });

    // ══════════════════════════════════════════════
    //  DATE LINE (thin blue bar)
    // ══════════════════════════════════════════════
    setFill(C.lblue);
    doc.rect(0, 56, PW, 10, "F");
    setTxt(C.blue);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(pdf(`Date d'emission : ${dateEm}`), 14, 62.5);
    doc.setFont("helvetica", "bold");
    doc.text(pdf(`Methode : ${methode}`), PW / 2, 62.5);
    doc.text(pdf(`Type : ${typeLabel}`), PW - 14, 62.5, { align: "right" });

    // ══════════════════════════════════════════════
    //  SECTION DE / A (deux colonnes)
    // ══════════════════════════════════════════════
    const secY = 74;
    const colW = (PW - 42) / 2;

    // Box "DE" — company
    setFill(C.gray1);
    setDraw(C.gray2);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, secY, colW, 38, 2, 2, "FD");

    setTxt(C.blue);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("DE", 19, secY + 7);
    setFill(C.blue);
    doc.rect(19, secY + 8.5, 6, 0.6, "F");

    setTxt(C.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("SmartTravel Agency", 19, secY + 16);
    setTxt(C.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("456 Rue du Commerce, 75001 Paris", 19, secY + 23);
    doc.text("contact@smarttravel.com", 19, secY + 29);
    doc.text("+33 1 23 45 67 89   smarttravel.tn", 19, secY + 35);

    // Box "A" — client
    const boxAx = 14 + colW + 14;
    setFill(C.gray1);
    doc.roundedRect(boxAx, secY, colW, 38, 2, 2, "FD");

    setTxt(C.blue);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("FACTURE A", boxAx + 5, secY + 7);
    setFill(C.blue);
    doc.rect(boxAx + 5, secY + 8.5, 14, 0.6, "F");

    setTxt(C.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(pdf(`${clientPrenom} ${clientNom}`.trim() || "Client"), boxAx + 5, secY + 16);
    setTxt(C.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (clientEmail) doc.text(pdf(clientEmail), boxAx + 5, secY + 23);
    if (clientTel)   doc.text(pdf(clientTel),   boxAx + 5, secY + 29);

    // ══════════════════════════════════════════════
    //  4 INFO CHIPS (row below)
    // ══════════════════════════════════════════════
    const chipY = secY + 44;
    const chips = [
      { label: "N FACTURE",  val: pdf(numero)   },
      { label: "DATE",       val: pdf(dateEm)   },
      { label: "TYPE",       val: pdf(typeLabel) },
      { label: "STATUT",     val: "PAYEE"        },
    ];
    const chipW = (PW - 28 - 9) / 4;
    chips.forEach((ch, i) => {
      const cx = 14 + i * (chipW + 3);
      setFill(i === 3 ? C.green : C.navy);
      doc.roundedRect(cx, chipY, chipW, 16, 2, 2, "F");
      setTxt(i === 3 ? C.white : [148, 163, 184]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(ch.label, cx + chipW / 2, chipY + 5.5, { align: "center" });
      setTxt(C.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(ch.val, cx + chipW / 2, chipY + 12, { align: "center" });
    });

    // ══════════════════════════════════════════════
    //  TABLE DÉTAIL
    // ══════════════════════════════════════════════
    const tableY = chipY + 22;
    setTxt(C.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DETAIL DE LA PRESTATION", 14, tableY - 2);

    autoTable(doc, {
      startY: tableY,
      margin: { left: 14, right: 14 },
      head: [["Description", "Periode", "Personnes", "Montant HT", "Montant TTC"]],
      body: [[
        pdf(titre),
        pdf(periode),
        nuitsText ? pdf(`${nbPers} pers. / ${nuitsText}`) : pdf(`${nbPers} pers.`),
        pdf(`${fmtMoney(montantHT)} TND`),
        pdf(`${fmtMoney(montantTTC)} TND`),
      ]],
      styles: {
        fontSize: 9,
        cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: C.navy,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
      },
      bodyStyles: { fillColor: C.white },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: {
        0: { cellWidth: 65 },
        1: { cellWidth: 38 },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold", textColor: C.navy },
      },
    });

    const afterT = (doc as any).lastAutoTable.finalY;

    // ══════════════════════════════════════════════
    //  TOTAUX
    // ══════════════════════════════════════════════
    const totW = 86;
    const totX2 = PW - 14 - totW;
    let ty = afterT + 6;

    // Fond totaux
    setFill(C.gray1);
    setDraw(C.gray2);
    doc.setLineWidth(0.3);
    doc.roundedRect(totX2, ty, totW, 44, 3, 3, "FD");

    // Sous-total HT
    setTxt(C.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Sous-total HT", totX2 + 6, ty + 10);
    setTxt(C.text);
    doc.setFont("helvetica", "bold");
    doc.text(pdf(`${fmtMoney(montantHT)} TND`), totX2 + totW - 6, ty + 10, { align: "right" });

    // TVA
    setTxt(C.muted);
    doc.setFont("helvetica", "normal");
    doc.text("TVA 19%", totX2 + 6, ty + 20);
    setTxt(C.text);
    doc.setFont("helvetica", "bold");
    doc.text(pdf(`${fmtMoney(tva)} TND`), totX2 + totW - 6, ty + 20, { align: "right" });

    // Ligne séparatrice
    setDraw(C.gray2);
    doc.setLineWidth(0.4);
    doc.line(totX2 + 6, ty + 25, totX2 + totW - 6, ty + 25);

    // TOTAL TTC box bleue
    setFill(C.blue);
    doc.roundedRect(totX2, ty + 27, totW, 17, 3, 3, "F");
    setTxt(C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL TTC", totX2 + 6, ty + 37);
    doc.setFontSize(12);
    doc.text(pdf(`${fmtMoney(montantTTC)} TND`), totX2 + totW - 6, ty + 37, { align: "right" });

    // ══════════════════════════════════════════════
    //  QR CODE + NOTE
    // ══════════════════════════════════════════════
    const qrY3 = afterT + 6;
    const qrSz = 34;
    doc.addImage(qrDataUrl, "PNG", 14, qrY3, qrSz, qrSz);
    setTxt(C.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Scannez pour verifier", 14, qrY3 + qrSz + 4);
    doc.text("l'authenticite du document", 14, qrY3 + qrSz + 9);

    // ══════════════════════════════════════════════
    //  FOOTER
    // ══════════════════════════════════════════════
    // Top accent footer line
    setFill(C.blue);
    doc.rect(0, PH - 22, PW, 1, "F");

    setFill(C.navy);
    doc.rect(0, PH - 21, PW, 21, "F");

    setTxt([148, 163, 184]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("SmartTravel Agency", PW / 2, PH - 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("contact@smarttravel.com   smarttravel.tn   +33 1 23 45 67 89   2026 PFE", PW / 2, PH - 8, { align: "center" });
    setTxt([71, 85, 105]);
    doc.text(pdf(`Facture generee le ${new Date().toLocaleDateString("fr-FR")} - Document officiel de paiement`), PW / 2, PH - 3, { align: "center" });

    doc.save(`facture-${pdf(numero)}.pdf`);
  };


  const validateDetails = (): string | null => {
    if (payMethod === "CARTE" || payMethod === "STRIPE") {
      if (cardNum.replace(/\s/g, "").length < 16) return "Numéro de carte incomplet (16 chiffres)";
      if (!cardName.trim()) return "Nom du titulaire requis";
      const parts = cardExpiry.split("/");
      if (parts.length !== 2 || parts[0].length < 2 || parts[1].length < 2) return "Date d'expiration invalide (MM/AA)";
      const mm = parseInt(parts[0]), yy = parseInt(parts[1]);
      if (isNaN(mm) || mm < 1 || mm > 12) return "Mois invalide";
      if (new Date(2000 + yy, mm - 1) < new Date()) return "Carte expirée";
      if (cardCvv.length < 3) return "CVV invalide";
    }
    if (payMethod === "PAYPAL") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ppEmail)) return "Email invalide";
      if (!ppPwd) return "Mot de passe requis";
    }
    return null;
  };

  const handlePay = async () => {
    if (!payModal.reservation) return;
    const validErr = validateDetails();
    if (validErr) {
      Swal.fire({ toast: true, position: "top-end", icon: "warning", title: validErr, showConfirmButton: false, timer: 3000 });
      return;
    }
    setPayProcessing(true);
    await new Promise((r) => setTimeout(r, 1800));
    const res = payModal.reservation;
    try {
      const resp = await paiementAPI.create({ reservationID: res.rawId, methodePaiement: payMethod });
      setPaidIds((prev) => new Set(prev).add(res.rawId));
      setReservations((prev) => prev.map((r) => r.rawId === res.rawId ? { ...r, statut: "Confirmée" } : r));
      closePayModal();
      try {
        const bc = new BroadcastChannel("st_payments");
        bc.postMessage({ type: "NEW_PAYMENT", reservationID: res.rawId, destination: res.destination, montant: `${res.montant.toLocaleString("fr-FR")} TND` });
        bc.close();
      } catch {}
      Swal.fire({ toast: true, position: "top-end", icon: "info", title: "Notification envoyée à l'administrateur", showConfirmButton: false, timer: 3000, timerProgressBar: true });
      const instructions = resp.instructions;
      let html = `<p class="text-sm text-gray-600 mb-3">Votre paiement de <strong>${res.montant.toLocaleString("fr-FR")} TND</strong> a été validé.</p>`;
      if (instructions?.type === "VIREMENT") {
        html += `<div class="text-left text-sm bg-blue-50 rounded-lg p-3 mt-2 space-y-1.5">
          <p><b>RIB :</b> <span class="font-mono">${instructions.rib}</span></p>
          <p><b>Banque :</b> ${instructions.banque}</p>
          <p><b>Référence :</b> <span class="font-mono text-blue-700">${instructions.reference}</span></p>
          <p class="text-gray-500 text-xs mt-1">${instructions.note}</p>
        </div>`;
      }
      Swal.fire({ icon: "success", title: "Paiement confirmé !", html, confirmButtonColor: "#2563eb" });
    } catch (err: any) {
      setPayProcessing(false);
      Swal.fire({ icon: "error", title: "Erreur de paiement", text: err?.message ?? "Impossible de traiter le paiement" });
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex">

      {/* ══════════ SIDEBAR ══════════ */}
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} bg-[#080f1e] text-white transition-all duration-300 flex flex-col flex-shrink-0 shadow-2xl`}>

        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Plane className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white" style={{ fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.2 }}>
                  Smart<span className="text-blue-400">Travel</span>
                </p>
                <p className="text-blue-500/60" style={{ fontSize: "0.6rem", letterSpacing: "0.1em" }}>ESPACE CLIENT</p>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {sidebarOpen && (
          <div className="mx-3 mt-4 mb-2 p-3 bg-blue-600/10 rounded-xl border border-blue-600/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-sm truncate">{prenom} {nom}</p>
                <span className="bg-blue-600/20 text-blue-400 text-xs px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                  <User className="h-2.5 w-2.5" /> Client
                </span>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                activePage === item.id
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/8"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
              {sidebarOpen && activePage === item.id && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="px-3 pb-2 space-y-0.5">
            <p className="text-white/20 text-xs px-3 py-1 uppercase tracking-widest">Accès rapide</p>
            <Link to="/" className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-white hover:bg-white/8 rounded-lg text-xs transition-colors">
              <Plane className="h-3.5 w-3.5" /> Site public
            </Link>
          </div>
        )}

        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? "Se déconnecter" : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {sidebarOpen && <span>Se déconnecter</span>}
          </button>
        </div>
      </aside>

      {/* ══════════ MAIN ══════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
          <div>
            <h1 className="text-[#080f1e]" style={{ fontWeight: 600, fontSize: "1.05rem" }}>
              {menuItems.find((m) => m.id === activePage)?.label}
            </h1>
            <p className="text-gray-400" style={{ fontSize: "0.7rem" }}>
              Espace Client SmartTravel · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              >
                <Bell className="h-5 w-5 text-gray-500" />
                {(() => {
                  const count = reservations.filter(r => r.statut === "Confirmée" || r.statut === "En attente").length + factures.length;
                  return count > 0 ? (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-0.5">
                      {count > 9 ? "9+" : count}
                    </span>
                  ) : null;
                })()}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-semibold text-gray-800 text-sm">Notifications</span>
                    <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {reservations.filter(r => r.statut === "Confirmée").map(r => (
                      <div key={`notif-conf-${r.rawId}`} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-700 font-medium">Réservation acceptée</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.destination}</p>
                          <p className="text-xs text-gray-400">{r.dateDepart}</p>
                        </div>
                      </div>
                    ))}
                    {reservations.filter(r => r.statut === "En attente").map(r => (
                      <div key={`notif-att-${r.rawId}`} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                        <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-700 font-medium">Réservation en attente de paiement</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.destination}</p>
                          <p className="text-xs text-gray-400">{r.dateDepart}</p>
                        </div>
                      </div>
                    ))}
                    {factures.slice(0, 5).map((f: any) => (
                      <div key={`notif-fac-${f._id}`} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-700 font-medium">Nouvelle facture disponible</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {f.montantTotal ? `${f.montantTotal.toLocaleString("fr-FR")} TND` : ""}
                          </p>
                          <p className="text-xs text-gray-400">
                            {f.createdAt ? new Date(f.createdAt).toLocaleDateString("fr-FR") : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                    {reservations.length === 0 && factures.length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-400 text-xs">Aucune notification</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setActivePage("profil")} className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">{initials}</div>
              <span className="text-gray-700 text-sm hidden sm:block">{prenom} {nom}</span>
            </button>
            <button onClick={handleLogout} title="Se déconnecter" className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500 hover:text-red-600">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">

          {/* ══ DASHBOARD ══ */}
          {activePage === "dashboard" && (
            <DashboardPage
              prenom={prenom}
              nom={nom}
              reservations={reservations}
              loadingRes={loadingRes}
              totalDepense={totalDepense}
              firstRes={firstRes}
              setActivePage={setActivePage}
              notifications={notifications}
            />
          )}

          {/* ══ RESERVATIONS ══ */}
          {activePage === "reservations" && (
            <ReservationsPage
              reservations={reservations}
              loadingRes={loadingRes}
              paidIds={paidIds}
              pageResAttente={pageResAttente}
              setPageResAttente={setPageResAttente}
              pageResConfirmees={pageResConfirmees}
              setPageResConfirmees={setPageResConfirmees}
              pageResAutres={pageResAutres}
              setPageResAutres={setPageResAutres}
              openPayModal={openPayModal}
              handleCancelReservation={handleCancelReservation}
              handleDeleteReservation={handleDeleteReservation}
              setActivePage={setActivePage}
            />
          )}

          {/* ══ OFFRES ══ */}
          {activePage === "offres" && (
            <OffresPage
              searchOffres={searchOffres}
              setSearchOffres={setSearchOffres}
              enrichedOffres={enrichedOffres}
              pageOffres={pageOffres}
              setPageOffres={setPageOffres}
              openResModal={openResModal}
            />
          )}

          {/* ══ SERVICES ══ */}
          {activePage === "services" && (
            <ServicesPage
              searchServices={searchServices}
              setSearchServices={setSearchServices}
              services={services}
              offres={offres}
              hebergements={hebergements}
              pageHebSvc={pageHebSvc}
              setPageHebSvc={setPageHebSvc}
              pageDestSvc={pageDestSvc}
              setPageDestSvc={setPageDestSvc}
              pageActSvc={pageActSvc}
              setPageActSvc={setPageActSvc}
              openResModal={openResModal}
            />
          )}

          {/* ══ HOTELS ══ */}
          {activePage === "hotels" && (
            <div className="-mx-6 -my-6">
              <Hotels />
            </div>
          )}

          {/* ══ FACTURES ══ */}
          {activePage === "factures" && (
            <FacturesPage
              factures={factures}
              reservations={reservations}
              paidIds={paidIds}
              pageFactures={pageFactures}
              setPageFactures={setPageFactures}
              downloadFacturePDF={downloadFacturePDF}
            />
          )}

          {/* ══ AVIS ══ */}
          {activePage === "avis" && (
            <AvisPage
              reservations={reservations}
              pageAvis={pageAvis}
              setPageAvis={setPageAvis}
              getAvisForReservation={getAvisForReservation}
              isTripEnded={isTripEnded}
              openAvisModal={openAvisModal}
              handleDeleteAvis={handleDeleteAvis}
              setActivePage={setActivePage}
            />
          )}

          {/* ══ PROFIL ══ */}
          {activePage === "profil" && (
            <ProfilPage
              prenom={prenom}
              nom={nom}
              user={user}
              initials={initials}
              profilFirstname={profilFirstname}
              setProfilFirstname={setProfilFirstname}
              profilLastname={profilLastname}
              setProfilLastname={setProfilLastname}
              profilPhone={profilPhone}
              setProfilPhone={setProfilPhone}
              profilAdresse={profilAdresse}
              setProfilAdresse={setProfilAdresse}
              profilCurrentPwd={profilCurrentPwd}
              setProfilCurrentPwd={setProfilCurrentPwd}
              profilNewPwd={profilNewPwd}
              setProfilNewPwd={setProfilNewPwd}
              profilConfirmPwd={profilConfirmPwd}
              setProfilConfirmPwd={setProfilConfirmPwd}
              showProfilPwds={showProfilPwds}
              setShowProfilPwds={setShowProfilPwds}
              savingProfil={savingProfil}
              savingProfilPwd={savingProfilPwd}
              handleSaveProfil={handleSaveProfil}
              handleChangeProfilPwd={handleChangeProfilPwd}
              handleDeleteAccount={handleDeleteAccount}
            />
          )}

          {/* ══ PREFERENCES ══ */}
          {activePage === "preferences" && <PreferencesSection userId={user?.id ?? ""} />}

          {/* ══ MON IA ══ */}
          {activePage === "ia" && <AIClientPage onGoPrefs={() => setActivePage("preferences")} onOpenRes={openResModal} />}

          {/* ══ PARAMETRES ══ */}
          {activePage === "parametres" && (
            <ParametresPage
              user={user}
              handleLogout={handleLogout}
            />
          )}

        </main>
      </div>

      {/* ══ CHATBOT ══ */}
      <ChatbotWidget onReservationCreated={reloadReservations} reservations={reservations} offres={offres} paidIds={paidIds} />

      {/* ══ PAYMENT MODAL ══ */}
      {payModal.open && payModal.reservation && (() => {
        const rez = payModal.reservation;
        const brand = cardBrand(cardNum);
        const inputCls = "w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

              {/* Header */}
              <div className="bg-[#0a1628] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {payStep === "details" && !payProcessing && (
                    <button onClick={() => setPayStep("method")} className="text-white/60 hover:text-white mr-1">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <div>
                    <h2 className="text-white text-base" style={{ fontWeight: 600 }}>
                      {payStep === "method" ? "Choisir un mode de paiement" : payProcessing ? "Traitement en cours…" : `Payer avec ${METHODES_PAIEMENT.find(m => m.value === payMethod)?.label}`}
                    </h2>
                    <p className="text-blue-300/70 text-xs mt-0.5">{rez.destination} · {rez.montant.toLocaleString("fr-FR")} TND</p>
                  </div>
                </div>
                {!payProcessing && (
                  <button onClick={closePayModal} className="text-white/50 hover:text-white text-xl leading-none">×</button>
                )}
              </div>

              <div className="p-6">

                {/* ── STEP 1: Method selection ── */}
                {payStep === "method" && (
                  <>
                    <div className="bg-blue-50 rounded-xl p-3 mb-5 flex items-center justify-between border border-blue-100">
                      <div>
                        <p className="text-xs text-blue-500">Montant à payer</p>
                        <p className="text-[#0a1628] text-xl" style={{ fontWeight: 700 }}>{rez.montant.toLocaleString("fr-FR")} TND</p>
                        <p className="text-gray-400 text-xs">{rez.type} · Réf. {rez.id}</p>
                      </div>
                      <ShieldCheck className="h-8 w-8 text-blue-400" />
                    </div>
                    <div className="space-y-2 mb-5">
                      {METHODES_PAIEMENT.map((m) => (
                        <label key={m.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${payMethod === m.value ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-blue-300"}`}>
                          <input type="radio" name="methode" value={m.value} checked={payMethod === m.value} onChange={() => setPayMethod(m.value)} className="accent-blue-600" />
                          <span className="text-xl">{m.icon}</span>
                          <div className="flex-1">
                            <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{m.label}</p>
                            <p className="text-gray-400 text-xs">{m.desc}</p>
                          </div>
                          {payMethod === m.value && <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={closePayModal} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">Annuler</button>
                      <button onClick={() => setPayStep("details")} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                        Suivant <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}

                {/* ── STEP 2: Details (method-specific) ── */}
                {payStep === "details" && !payProcessing && (
                  <>
                    {/* ─── CARTE / STRIPE ─── */}
                    {(payMethod === "CARTE" || payMethod === "STRIPE") && (
                      <div className="space-y-4">
                        {/* Visual card preview */}
                        <div className="relative rounded-2xl p-5 overflow-hidden select-none" style={{ background: brand === "VISA" ? "linear-gradient(135deg,#1a237e,#1565c0,#0288d1)" : brand === "MC" ? "linear-gradient(135deg,#b71c1c,#880e4f,#311b92)" : "linear-gradient(135deg,#0a1628,#1e3a5f,#2563eb)", minHeight: "140px" }}>
                          {/* Chip */}
                          <div className="absolute top-4 left-5 w-10 h-7 rounded-md" style={{ background: "linear-gradient(135deg,#d4a017,#f5d060)" }}>
                            <div className="border-b border-yellow-700/30 h-1/2" />
                            <div className="flex h-1/2"><div className="w-1/2 border-r border-yellow-700/30" /></div>
                          </div>
                          {/* Brand */}
                          <div className="absolute top-4 right-5">
                            {brand === "VISA" && <span className="text-white font-bold italic text-2xl tracking-tight">VISA</span>}
                            {brand === "MC" && <div className="flex -space-x-2"><div className="w-7 h-7 rounded-full bg-red-500/90" /><div className="w-7 h-7 rounded-full bg-yellow-400/80" /></div>}
                            {(brand === "AMEX" || brand === "GENERIC") && <CreditCard className="h-7 w-7 text-white/60" />}
                          </div>
                          {/* Number */}
                          <p className="absolute bottom-14 left-5 font-mono text-white text-lg tracking-widest">
                            {cardNum ? cardNum.padEnd(19, " ") : "•••• •••• •••• ••••"}
                          </p>
                          {/* Name + Expiry */}
                          <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
                            <div>
                              <p className="text-white/40 text-xs uppercase tracking-wider">Titulaire</p>
                              <p className="text-white text-sm uppercase truncate max-w-[140px]">{cardName || "VOTRE NOM"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white/40 text-xs">Expire</p>
                              <p className="text-white text-sm font-mono">{cardExpiry || "MM/AA"}</p>
                            </div>
                          </div>
                          {payMethod === "STRIPE" && <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/10 rounded-full px-3 py-0.5 text-white/70 text-xs">⚡ Stripe Secure</div>}
                        </div>

                        <div>
                          <label className="text-gray-600 text-xs mb-1 block">Numéro de carte</label>
                          <input className={inputCls} placeholder="1234 5678 9012 3456" maxLength={19} value={cardNum}
                            onChange={(e) => setCardNum(fmtCardNum(e.target.value))} />
                        </div>
                        <div>
                          <label className="text-gray-600 text-xs mb-1 block">Nom du titulaire</label>
                          <input className={inputCls} placeholder="PRÉNOM NOM" value={cardName}
                            onChange={(e) => setCardName(e.target.value.toUpperCase())} />
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-gray-600 text-xs mb-1 block">Date d'expiration</label>
                            <input className={inputCls} placeholder="MM/AA" maxLength={5} value={cardExpiry}
                              onChange={(e) => setCardExpiry(fmtExpiry(e.target.value))} />
                          </div>
                          <div className="w-28">
                            <label className="text-gray-600 text-xs mb-1 block">CVV</label>
                            <input className={inputCls} placeholder="•••" maxLength={4} type={cardFlipped ? "text" : "password"}
                              value={cardCvv}
                              onFocus={() => setCardFlipped(true)}
                              onBlur={() => setCardFlipped(false)}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                          </div>
                        </div>
                        <p className="text-gray-400 text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> Paiement sécurisé — simulation uniquement</p>
                      </div>
                    )}

                    {/* ─── PAYPAL ─── */}
                    {payMethod === "PAYPAL" && (
                      <div className="space-y-4">
                        <div className="text-center py-2">
                          <span style={{ fontSize: "2rem", fontWeight: 800, color: "#003087", fontFamily: "Arial, sans-serif" }}>Pay</span>
                          <span style={{ fontSize: "2rem", fontWeight: 800, color: "#009cde", fontFamily: "Arial, sans-serif" }}>Pal</span>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100 mb-2">
                          <p className="text-blue-700 text-sm">Connectez-vous pour payer <strong>{rez.montant.toLocaleString("fr-FR")} TND</strong></p>
                        </div>
                        <div>
                          <label className="text-gray-600 text-xs mb-1 block">Email ou numéro de téléphone</label>
                          <input type="email" className={inputCls} placeholder="email@exemple.com" value={ppEmail} onChange={(e) => setPpEmail(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-gray-600 text-xs mb-1 block">Mot de passe</label>
                          <div className="relative">
                            <input type={ppShowPwd ? "text" : "password"} className={inputCls + " pr-10"} placeholder="••••••••" value={ppPwd} onChange={(e) => setPpPwd(e.target.value)} />
                            <button type="button" onClick={() => setPpShowPwd(!ppShowPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {ppShowPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-400 text-xs text-center">🔒 Simulation — aucun compte PayPal réel requis</p>
                      </div>
                    )}

                    {/* ─── VIREMENT ─── */}
                    {payMethod === "VIREMENT" && (
                      <div className="space-y-3">
                        <p className="text-gray-600 text-sm">Effectuez votre virement avec les coordonnées ci-dessous et indiquez la référence dans le libellé.</p>
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-3">
                          {[
                            { label: "Bénéficiaire", value: "SmartTravel SARL" },
                            { label: "RIB", value: "TN59 1000 0000 1234 5678 9012", mono: true },
                            { label: "Banque", value: "Banque Demo Tunisie — BDT" },
                            { label: "Référence obligatoire", value: `VIR-${rez.id}-${Date.now().toString().slice(-6)}`, mono: true, highlight: true },
                          ].map((row) => (
                            <div key={row.label}>
                              <p className="text-blue-500 text-xs mb-0.5">{row.label}</p>
                              <p className={`text-sm ${row.mono ? "font-mono" : ""} ${row.highlight ? "text-blue-700 font-semibold" : "text-gray-800"}`}>{row.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100 text-xs text-yellow-800 flex items-start gap-2">
                          <span className="text-base">⏱</span>
                          Délai de traitement : 1 à 2 jours ouvrés après réception du virement.
                        </div>
                      </div>
                    )}

                    {/* ─── ESPECES ─── */}
                    {payMethod === "ESPECES" && (
                      <div className="space-y-3">
                        <p className="text-gray-600 text-sm">Rendez-vous à l'agence SmartTravel pour régler en espèces.</p>
                        <div className="bg-green-50 rounded-xl p-4 border border-green-100 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                              <MapPin className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>Agence SmartTravel</p>
                              <p className="text-gray-500 text-xs">123 Avenue Habib Bourguiba, Tunis 1000</p>
                            </div>
                          </div>
                          <div className="space-y-1.5 text-xs text-gray-600 pl-1">
                            <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-green-600" /> Lun – Ven : 08h00 – 17h00</p>
                            <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-green-600" /> Samedi : 08h00 – 13h00</p>
                          </div>
                        </div>
                        <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100 text-xs text-yellow-800">
                          Présentez votre référence : <span className="font-mono font-bold">{rez.id}</span> à l'accueil.
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3 mt-5">
                      <button onClick={() => setPayStep("method")} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
                        <ArrowLeft className="h-4 w-4" /> Retour
                      </button>
                      <button onClick={handlePay} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                        <Lock className="h-4 w-4" /> Payer {rez.montant.toLocaleString("fr-FR")} TND
                      </button>
                    </div>
                  </>
                )}

                {/* ── PROCESSING ── */}
                {payProcessing && (
                  <div className="flex flex-col items-center py-10 gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-blue-100" />
                      <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-700 text-sm" style={{ fontWeight: 600 }}>Traitement en cours…</p>
                      <p className="text-gray-400 text-xs mt-1">Connexion sécurisée · Ne fermez pas cette fenêtre</p>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ AVIS MODAL ══ */}
      {avisModal.open && avisModal.reservation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#0a1628] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white text-base" style={{ fontWeight: 600 }}>Laisser un avis</h2>
                <p className="text-blue-300/70 text-xs mt-0.5">{avisModal.reservation.destination}</p>
              </div>
              <button onClick={() => setAvisModal({ open: false, reservation: null })} className="text-white/50 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Star rating */}
              <div>
                <p className="text-gray-600 text-sm mb-3" style={{ fontWeight: 500 }}>Votre note</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      onClick={() => setAvisNote(i)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={`h-9 w-9 transition-colors ${i <= avisNote ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-300"}`} />
                    </button>
                  ))}
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  {["", "Très décevant", "Décevant", "Correct", "Bien", "Excellent"][avisNote]}
                </p>
              </div>

              {/* Comment */}
              <div>
                <label className="text-gray-600 text-sm mb-1 block" style={{ fontWeight: 500 }}>Votre commentaire</label>
                <textarea
                  rows={4}
                  placeholder="Décrivez votre expérience…"
                  value={avisComment}
                  onChange={(e) => setAvisComment(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setAvisModal({ open: false, reservation: null })}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmitAvis}
                  disabled={avisSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {avisSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Star className="h-4 w-4" /> Publier l'avis</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ RESERVATION MODAL ══ */}
      {resModal.open && (resModal.offre || resModal.service) && (() => {
        const { offre, service } = resModal;
        const typeService = service?.typeService ?? "";
        const isDirectService = !offre && !!service;
        const typeBadge = offre?.typeBadge ?? (
          typeService === "HEBERGEMENT" ? { label: "Hôtel", css: "bg-blue-100 text-blue-700", icon: "🏨" } :
          typeService === "ACTIVITE"    ? { label: "Excursion", css: "bg-green-100 text-green-700", icon: "🧭" } :
                                          { label: "International", css: "bg-purple-100 text-purple-700", icon: "✈️" }
        );
        const titre = offre?.titre ?? service?.titre ?? "Réservation";
        // Affiche le prix le moins cher (cf. prixOffreLeMoinsCher) — repli sur le service direct.
        // Le backend facture désormais ce même prix le moins cher (cf. reservation.route.js),
        // donc le « Total estimé » correspond au montant de la page de paiement.
        const prix = prixOffreLeMoinsCher(offre ? { ...offre, service } : { service });
        // Option 2 : les offres International/Excursion sont des forfaits par personne.
        const prixUnitaire = prix;
        const AGE_GRATUIT = 5;
        const nbAdultes = Math.max(0, parseInt(resForm.nbPersonnes) || 0);
        const enfantsPayants = resForm.agesEnfants.filter((a) => a >= AGE_GRATUIT).length;
        const enfantsGratuits = resForm.agesEnfants.length - enfantsPayants;
        const nbPayants = nbAdultes + enfantsPayants;
        const totalEstime = Number(prixUnitaire) * nbPayants;
        // Helpers enfants (ajout / retrait / âge)
        const setAgesEnfants = (fn: (prev: number[]) => number[]) =>
          setResForm((f) => ({ ...f, agesEnfants: fn(f.agesEnfants) }));
        const inputCls = "w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
        const chambreTypeLabel: Record<string, string> = {
          SINGLE: "Single", DOUBLE: "Double", TWIN: "Twin",
          SUITE: "Suite", DELUXE: "Deluxe", FAMILIALE: "Familiale",
        };
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>

              {/* Header */}
              <div className="bg-[#0a1628] px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
                <div>
                  <h2 className="text-white text-base" style={{ fontWeight: 600 }}>Réserver</h2>
                  <p className="text-blue-300/70 text-xs mt-0.5">
                    {titre} · {typeBadge.icon} {typeBadge.label}
                    {isDirectService && <span className="ml-2 bg-blue-800/40 px-1.5 py-0.5 rounded text-blue-200">Réservation directe</span>}
                  </p>
                </div>
                <button
                  onClick={() => setResModal({ open: false, offre: null, service: null, hebergement: null })}
                  className="text-white/50 hover:text-white text-xl leading-none"
                >×</button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 p-6 space-y-4">

                {/* Recap */}
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-blue-500 text-xs">{isDirectService ? "Prix de base" : "Prix à partir de"}</p>
                    <p className="text-[#0a1628] text-xl" style={{ fontWeight: 800 }}>
                      {Number(prix).toLocaleString("fr-FR")} <span className="text-sm">TND</span>
                    </p>
                    {service?.localisation && (
                      <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {service.localisation}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1.5 rounded-xl text-xs ${typeBadge.css}`} style={{ fontWeight: 600 }}>
                    {typeBadge.icon} {typeBadge.label}
                  </span>
                </div>

                {/* Nombre d'adultes (commun) */}
                <div>
                  <label className="text-gray-600 text-xs mb-1 block">
                    {typeService !== "HEBERGEMENT" && typeService !== "ACTIVITE" ? "Adultes" : "Nombre de personnes"}
                  </label>
                  <input
                    type="number" min="1" max="20" className={inputCls}
                    value={resForm.nbPersonnes}
                    onChange={(e) => setResForm((f) => ({ ...f, nbPersonnes: e.target.value }))}
                  />
                </div>

                {/* ─── HEBERGEMENT ─── */}
                {typeService === "HEBERGEMENT" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-600 text-xs mb-1 block">Date d'arrivée</label>
                        <input type="date" className={inputCls} value={resForm.dateDebut}
                          onChange={(e) => setResForm((f) => ({ ...f, dateDebut: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-gray-600 text-xs mb-1 block">Date de départ</label>
                        <input type="date" className={inputCls} value={resForm.dateFin}
                          onChange={(e) => setResForm((f) => ({ ...f, dateFin: e.target.value }))} />
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-600 text-xs mb-2 block">Choisir une chambre</label>
                      {loadingChambres && (
                        <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          Chargement des chambres…
                        </div>
                      )}
                      {!loadingChambres && chambres.length === 0 && (
                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-yellow-700 text-sm">
                          Aucune chambre disponible pour cet hébergement.
                        </div>
                      )}
                      {!loadingChambres && chambres.length > 0 && (
                        <div className="space-y-2">
                          {chambres.map((c: any) => (
                            <label key={c._id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${resForm.chambreId === c._id ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-blue-300"}`}>
                              <input
                                type="radio" name="chambre" value={c._id}
                                checked={resForm.chambreId === c._id}
                                onChange={() => setResForm((f) => ({ ...f, chambreId: c._id }))}
                                className="accent-blue-600 mt-0.5 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>
                                    {chambreTypeLabel[c.typeChambre] ?? c.typeChambre}
                                    {c.numeroChambre && (
                                      <span className="text-gray-400 ml-1" style={{ fontWeight: 400 }}>#{c.numeroChambre}</span>
                                    )}
                                  </p>
                                  <p className="text-blue-600 text-sm flex-shrink-0" style={{ fontWeight: 700 }}>
                                    {(c.prixParNuit ?? 0).toLocaleString("fr-FR")} TND
                                    <span className="text-gray-400 text-xs ml-0.5" style={{ fontWeight: 400 }}>/nuit</span>
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                                  <span>👤 {c.capacite} pers.</span>
                                  {c.superficie && <span>📐 {c.superficie} m²</span>}
                                  {c.etage !== undefined && <span>🏢 Étage {c.etage}</span>}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ─── ACTIVITE ─── */}
                {typeService === "ACTIVITE" && (
                  <div>
                    <label className="text-gray-600 text-xs mb-1 block">Date de l'excursion</label>
                    <input type="date" className={inputCls} value={resForm.dateExcursion}
                      onChange={(e) => setResForm((f) => ({ ...f, dateExcursion: e.target.value }))} />
                  </div>
                )}

                {/* ─── DESTINATION / INTERNATIONALE ─── */}
                {typeService !== "HEBERGEMENT" && typeService !== "ACTIVITE" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-600 text-xs mb-1 block">Date de départ</label>
                        <input type="date" className={inputCls} value={resForm.dateDebut}
                          onChange={(e) => setResForm((f) => ({ ...f, dateDebut: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-gray-600 text-xs mb-1 block">Date de retour</label>
                        <input type="date" className={inputCls} value={resForm.dateFin}
                          onChange={(e) => setResForm((f) => ({ ...f, dateFin: e.target.value }))} />
                      </div>
                    </div>
                    {/* Enfants (âges) — forfait par personne, gratuit avant 5 ans */}
                    <div>
                      <label className="text-gray-600 text-xs mb-1 block">Enfants</label>
                      <div className="flex items-center gap-3">
                        <button type="button" disabled={resForm.agesEnfants.length === 0}
                          onClick={() => setAgesEnfants((p) => p.slice(0, -1))}
                          className="w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed">−</button>
                        <span className="text-sm w-6 text-center" style={{ fontWeight: 700 }}>{resForm.agesEnfants.length}</span>
                        <button type="button"
                          onClick={() => setAgesEnfants((p) => (p.length < 10 ? [...p, 5] : p))}
                          className="w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50">+</button>
                        <span className="text-[11px] text-gray-400">Moins de {AGE_GRATUIT} ans : gratuit</span>
                      </div>
                      {resForm.agesEnfants.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {resForm.agesEnfants.map((age, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-600">Enfant {i + 1}</span>
                              <div className="flex items-center gap-2">
                                <select value={age}
                                  onChange={(e) => setAgesEnfants((p) => p.map((a, j) => (j === i ? Number(e.target.value) : a)))}
                                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                                  {Array.from({ length: 18 }).map((_, a) => (
                                    <option key={a} value={a}>{a} an{a > 1 ? "s" : ""}</option>
                                  ))}
                                </select>
                                {age < AGE_GRATUIT && (
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Gratuit</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-600 text-xs mb-1 block">Numéro de passeport</label>
                      <input type="text" className={inputCls} placeholder="Ex : A1234567"
                        maxLength={8} autoComplete="off" inputMode="text"
                        value={resForm.numPassport}
                        onChange={(e) => setResForm((f) => ({ ...f, numPassport: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) }))} />
                      <p className="text-gray-400 text-[11px] mt-1">1 lettre suivie de 7 chiffres (ex : A1234567)</p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input type="checkbox" checked={resForm.visa}
                        onChange={(e) => setResForm((f) => ({ ...f, visa: e.target.checked }))}
                        className="w-4 h-4 accent-blue-600 rounded" />
                      <span className="text-gray-700 text-sm">Je possède un visa valide pour cette destination</span>
                    </label>
                  </>
                )}

                {/* Récap prix (forfait par personne) — Excursion / International */}
                {typeService !== "HEBERGEMENT" && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {nbAdultes} adulte{nbAdultes > 1 ? "s" : ""}
                        {enfantsPayants > 0 && ` + ${enfantsPayants} enfant${enfantsPayants > 1 ? "s" : ""} payant${enfantsPayants > 1 ? "s" : ""}`}
                        {" "}× {Number(prixUnitaire).toLocaleString("fr-FR")} TND
                      </span>
                    </div>
                    {enfantsGratuits > 0 && (
                      <div className="text-[11px] text-emerald-600" style={{ fontWeight: 600 }}>
                        ✓ {enfantsGratuits} enfant{enfantsGratuits > 1 ? "s" : ""} de moins de {AGE_GRATUIT} ans gratuit{enfantsGratuits > 1 ? "s" : ""}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 text-sm" style={{ fontWeight: 600 }}>Total estimé</span>
                      <span className="text-[#0a1628] text-lg" style={{ fontWeight: 800 }}>
                        {totalEstime.toLocaleString("fr-FR")} <span className="text-sm">TND</span>
                      </span>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0 bg-white rounded-b-2xl">
                <button
                  onClick={() => setResModal({ open: false, offre: null, service: null, hebergement: null })}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateReservation}
                  disabled={resLoading}
                  className="flex-1 py-2.5 bg-[#0a1628] text-white rounded-xl text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {resLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Création…
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" /> Confirmer la réservation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
