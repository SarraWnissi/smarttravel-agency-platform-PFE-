import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  LayoutDashboard, Users, Plane, Calendar, Settings,
  LogOut, TrendingUp, DollarSign, Package,
  Menu, X, Search, Bell, ChevronRight, ChevronLeft, MapPin,
  FileText, Shield, BarChart2, Eye, Pencil, Trash2,
  CheckCircle, Clock, XCircle, ArrowUpRight, Download,
  Lock, Phone, Home, Save, KeyRound, CreditCard, RefreshCw,
  BedDouble, ToggleLeft, ToggleRight, Building2, History, Bot,
  Route, Bus, Video, Share2, Youtube, Instagram, Facebook,
  Play, Loader2, CheckCircle2, AlertCircle, Sparkles,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { usersAPI, reservationsAPI, offresAPI, servicesAPI, chambresAPI, hebergementsAPI, campagnesAPI, mapStatut, mapEtatCompte } from "../../../services/api";
import { matchSearch, normalizeSearch } from "../../../utils/search";
import { DisponibilitesPage } from "./sections/DisponibilitesPage";
import { ImageManager } from "./sections/ImageManager";
import { CampagnePage } from "./sections/CampagnePage";
import { VideoPublicitairePage } from "./sections/VideoPublicitairePage";
import { AdminCopilot } from "./sections/AdminCopilot";
import { StatutBadge, buildChartData, Pagination } from "./shared";
import { SettingsPage } from "./sections/SettingsPage";
import { RapportsPage } from "./sections/RapportsPage";
import { CircuitsPage } from "./sections/CircuitsPage";
import { TransportsPage } from "./sections/TransportsPage";
import { AgentsPage } from "./sections/AgentsPage";

type Page = "dashboard" | "clients" | "offres" | "services" | "reservations" | "chambres" | "hebergements" | "disponibilites" | "campagnes" | "circuits" | "transports" | "agents" | "historique" | "rapports" | "settings" | "video";

const menuItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Users },
  { id: "offres", label: "Offres", icon: Plane },
  { id: "services", label: "Services", icon: Package },
  { id: "reservations", label: "Réservations", icon: Calendar },
  { id: "chambres", label: "Chambres", icon: BedDouble },
  { id: "hebergements", label: "Hébergements", icon: Building2 },
  { id: "disponibilites", label: "Disponibilités", icon: Calendar },
  { id: "campagnes",      label: "Campagnes promo",  icon: TrendingUp },
  { id: "video",          label: "Vidéo pub IA",     icon: Video },
  { id: "circuits", label: "Circuits", icon: Route },
  { id: "transports", label: "Transports", icon: Bus },
  { id: "historique", label: "Historique", icon: History },
  { id: "rapports", label: "Rapports", icon: BarChart2 },
  { id: "settings", label: "Paramètres", icon: Settings },
];

function Row({ icon, label, value, bold }: { icon: string; label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="text-base leading-none mt-0.5 flex-shrink-0">{icon}</span>
      <span className="text-gray-500 min-w-[100px] flex-shrink-0">{label}</span>
      <span className={`text-gray-900 break-all ${bold ? "font-semibold text-blue-700" : ""}`}>{value}</span>
    </div>
  );
}

export function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [offres, setOffres] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [searchClients, setSearchClients] = useState("");
  const [searchOffres, setSearchOffres] = useState("");
  const [searchReservations, setSearchReservations] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterType, setFilterType] = useState("tous");
  const [selectedResId, setSelectedResId] = useState<string | null>(null);

  // Tri
  const [sortClients, setSortClients] = useState("date_desc");
  const [sortReservations, setSortReservations] = useState("date_desc");

  // Pagination
  const PAGE_SIZE = 8;
  const [pageClients, setPageClients] = useState(1);
  const [pageOffres, setPageOffres] = useState(1);
  const [pageReservations, setPageReservations] = useState(1);

  const [chambres, setChambres] = useState<any[]>([]);
  const [hebergements, setHebergements] = useState<any[]>([]);
  const [searchChambres, setSearchChambres] = useState("");
  const [pageChambre, setPageChambre] = useState(1);

  const [chambreModal, setChambreModal] = useState<{ open: boolean; mode: "add" | "edit"; chambre: any | null }>({ open: false, mode: "add", chambre: null });
  const [chambreForm, setChambreForm] = useState({
    hebergementID: "", numeroChambre: "", typeChambre: "DOUBLE",
    etage: "", capacite: "2", superficie: "", prixParNuit: "", disponible: true,
    formule: "LOGEMENT_SEUL", vue: "AUCUNE", description: "", images: [] as string[],
  });
  const [savingChambre, setSavingChambre] = useState(false);

  // Hebergements state
  const [searchHeb, setSearchHeb] = useState("");
  const [pageHeb, setPageHeb] = useState(1);
  // Visionneuse d'images (lightbox) pour les hébergements
  const [imgViewer, setImgViewer] = useState<{ images: string[]; index: number; titre: string } | null>(null);
  const HEB_TYPES = ["HOTEL", "APPARTEMENT", "VILLA", "AUBERGE", "CAMPING", "RESORT", "BUNGALOW"];
  const [hebModal, setHebModal] = useState<{ open: boolean; mode: "add" | "edit"; heb: any | null }>({ open: false, mode: "add", heb: null });
  const [hebForm, setHebForm] = useState({ titre: "", description: "", type: "HOTEL", localisation: "", etoiles: "3", disponible: true, serviceID: "", images: [] as string[], telephone: "", siteWeb: "", lat: "", lng: "", actif: true });
  const [savingHeb, setSavingHeb] = useState(false);

  const openAddHeb = () => {
    setHebForm({ titre: "", description: "", type: "HOTEL", localisation: "", etoiles: "3", disponible: true, serviceID: "", images: [], telephone: "", siteWeb: "", lat: "", lng: "", actif: true });
    setHebModal({ open: true, mode: "add", heb: null });
  };
  const openEditHeb = (h: any) => {
    setHebForm({ titre: h.titre ?? "", description: h.description ?? "", type: h.type ?? "HOTEL", localisation: h.localisation ?? "", etoiles: String(h.etoiles ?? "3"), disponible: h.disponible ?? true, serviceID: String(h.serviceID?._id ?? h.serviceID ?? ""), images: h.images ?? [], telephone: h.telephone ?? "", siteWeb: h.siteWeb ?? "", lat: h.coordonnees?.lat != null ? String(h.coordonnees.lat) : "", lng: h.coordonnees?.lng != null ? String(h.coordonnees.lng) : "", actif: h.actif !== false });
    setHebModal({ open: true, mode: "edit", heb: h });
  };
  const handleSaveHeb = async () => {
    if (!hebForm.titre.trim()) { Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "Titre requis", showConfirmButton: false, timer: 2000 }); return; }
    setSavingHeb(true);
    try {
      const payload: any = { titre: hebForm.titre, description: hebForm.description, type: hebForm.type, localisation: hebForm.localisation, etoiles: parseInt(hebForm.etoiles) || 3, disponible: hebForm.disponible, actif: hebForm.actif };
      if (hebForm.serviceID) payload.serviceID = hebForm.serviceID;
      payload.images = hebForm.images;
      if (hebForm.telephone.trim()) payload.telephone = hebForm.telephone.trim();
      if (hebForm.siteWeb.trim()) payload.siteWeb = hebForm.siteWeb.trim();
      if (hebForm.lat.trim() && hebForm.lng.trim()) payload.coordonnees = { lat: parseFloat(hebForm.lat), lng: parseFloat(hebForm.lng) };
      if (hebModal.mode === "add") {
        await hebergementsAPI.create(payload);
      } else {
        await hebergementsAPI.update(hebModal.heb._id, payload);
      }
      const updated = await hebergementsAPI.getAll();
      setHebergements(updated);
      setHebModal({ open: false, mode: "add", heb: null });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: hebModal.mode === "add" ? "Hébergement créé" : "Hébergement mis à jour", showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: err?.message ?? "Erreur", showConfirmButton: false, timer: 3000 });
    } finally { setSavingHeb(false); }
  };
  const handleDeleteHeb = async (id: string) => {
    const res = await Swal.fire({ title: "Supprimer cet hébergement ?", text: "Action irréversible.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Supprimer", cancelButtonText: "Annuler" });
    if (!res.isConfirmed) return;
    try {
      await hebergementsAPI.delete(id);
      setHebergements(prev => prev.filter(h => h._id !== id));
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Supprimé", showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: err?.message ?? "Erreur", showConfirmButton: false, timer: 3000 });
    }
  };

  // Services state
  const [services, setServices] = useState<any[]>([]);
  const [searchServices, setSearchServices] = useState("");
  const [pageServices, setPageServices] = useState(1);
  const SERVICE_TYPES = ["HEBERGEMENT", "DESTINATION", "ACTIVITE"];
  const [serviceModal, setServiceModal] = useState<{ open: boolean; mode: "add" | "edit"; service: any | null }>({ open: false, mode: "add", service: null });
  const emptyServiceForm = { titre: "", description: "", typeService: "HEBERGEMENT", localisation: "", prixBase: "", devise: "TND", categorie: "", nbChambres: "", adresse: "", typeDestination: "", avis: "", typeActivite: "", duree: "" };
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [savingService, setSavingService] = useState(false);

  const openAddService = () => {
    setServiceForm(emptyServiceForm);
    setServiceModal({ open: true, mode: "add", service: null });
  };
  const openEditService = (s: any) => {
    setServiceForm({ titre: s.titre ?? "", description: s.description ?? "", typeService: s.typeService ?? "HEBERGEMENT", localisation: s.localisation ?? "", prixBase: String(s.prixBase ?? ""), devise: s.devise ?? "TND", categorie: s.categorie ?? "", nbChambres: String(s.nbChambres ?? ""), adresse: s.adresse ?? "", typeDestination: s.typeDestination ?? "", avis: String(s.avis ?? ""), typeActivite: s.typeActivite ?? "", duree: s.duree ?? "" });
    setServiceModal({ open: true, mode: "edit", service: s });
  };
  const handleSaveService = async () => {
    if (!serviceForm.titre.trim()) { Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "Titre requis", showConfirmButton: false, timer: 2000 }); return; }
    setSavingService(true);
    try {
      const base = { titre: serviceForm.titre, description: serviceForm.description, typeService: serviceForm.typeService, localisation: serviceForm.localisation, prixBase: parseFloat(serviceForm.prixBase) || 0, devise: serviceForm.devise, categorie: serviceForm.categorie };
      const specific: any = {};
      if (serviceForm.typeService === "HEBERGEMENT") {
        if (serviceForm.nbChambres) specific.nbChambres = parseInt(serviceForm.nbChambres);
        if (serviceForm.adresse)    specific.adresse = serviceForm.adresse;
      } else if (serviceForm.typeService === "DESTINATION") {
        if (serviceForm.typeDestination) specific.typeDestination = serviceForm.typeDestination;
        if (serviceForm.avis) specific.avis = parseFloat(serviceForm.avis);
      } else if (serviceForm.typeService === "ACTIVITE") {
        if (serviceForm.typeActivite) specific.typeActivite = serviceForm.typeActivite;
        if (serviceForm.duree)        specific.duree = serviceForm.duree;
      }
      const payload = { ...base, ...specific };
      if (serviceModal.mode === "add") {
        await servicesAPI.create(payload);
      } else {
        await servicesAPI.update(serviceModal.service._id, payload);
      }
      const updated = await servicesAPI.getAll();
      setServices(updated);
      setServiceModal({ open: false, mode: "add", service: null });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: serviceModal.mode === "add" ? "Service créé" : "Service mis à jour", showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: err?.message ?? "Erreur", showConfirmButton: false, timer: 3000 });
    } finally { setSavingService(false); }
  };
  const handleDeleteService = async (id: string) => {
    const res = await Swal.fire({ title: "Supprimer ce service ?", text: "Action irréversible.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Supprimer", cancelButtonText: "Annuler" });
    if (!res.isConfirmed) return;
    try {
      await servicesAPI.delete(id);
      setServices(prev => prev.filter(s => s._id !== id));
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Supprimé", showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: err?.message ?? "Erreur", showConfirmButton: false, timer: 3000 });
    }
  };

  // Modal offre
  const [offreModal, setOffreModal] = useState<{ open: boolean; mode: "add" | "edit"; offre: any | null }>({ open: false, mode: "add", offre: null });
  const [offreForm, setOffreForm] = useState({ titre: "", descriptionCourte: "", prixAPartirDe: "", serviceID: "" });
  const [savingOffre, setSavingOffre] = useState(false);

  // Suspension offres (localStorage)
  const [suspendedIds, setSuspendedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("st_suspended_offres") ?? "[]")); }
    catch { return new Set(); }
  });
  const toggleSuspend = (id: string) => {
    setSuspendedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("st_suspended_offres", JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    Promise.all([
      usersAPI.getAll().catch(() => []),
      reservationsAPI.getAll().catch(() => []),
      offresAPI.getAll().catch(() => []),
      chambresAPI.getAll().catch(() => []),
      hebergementsAPI.getAll().catch(() => []),
      servicesAPI.getAll().catch(() => []),
    ]).then(([u, r, o, c, h, sv]) => {
      setUsers(u);
      setReservations(r);
      setOffres(o);
      setChambres(c);
      setHebergements(h);
      setServices(sv);
    }).finally(() => setLoadingData(false));
  }, []);

  // BroadcastChannel: receive payment notifications from client dashboard (same browser)
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("st_payments");
    channel.onmessage = (e) => {
      if (e.data?.type === "NEW_PAYMENT") {
        Swal.fire({
          toast: true, position: "top-end", icon: "info",
          title: `💳 Nouveau paiement`,
          text: `${e.data.destination ?? "Réservation"} — ${e.data.montant ?? ""}`,
          showConfirmButton: false, timer: 5000, timerProgressBar: true,
        });
        reservationsAPI.getAll().catch(() => []).then((r) => setReservations(r));
      }
    };
    return () => channel.close();
  }, []);

  const handleLogout = () => { logout(); navigate("/"); };

  const prenom = user?.prenom ?? "";
  const nom = user?.nom ?? "";
  const initials = (prenom[0] ?? "A") + (nom[0] ?? "D");

  // ── Computed stats ──
  const totalRevenu = reservations.reduce((s, r) => s + (r.montantTotal ?? 0), 0);
  const clientsActifs = users.filter((u) => u.role === "CLIENT" && u.etatCompte === "ACTIF").length;
  const chartData = buildChartData(reservations);

  const statsData = [
    { title: "Chiffre d'affaires", value: `${totalRevenu.toLocaleString("fr-FR")} TND`, change: "live", icon: DollarSign, color: "bg-blue-600" },
    { title: "Réservations", value: String(reservations.length), change: "live", icon: Package, color: "bg-indigo-600" },
    { title: "Clients actifs", value: String(clientsActifs), change: "live", icon: Users, color: "bg-[#0a1628]" },
    { title: "Offres actives", value: String(offres.length), change: "live", icon: TrendingUp, color: "bg-green-600" },
  ];

  // ── Helpers de formatage ──
  const parseDate = (d: unknown): Date | null => {
    if (!d) return null;
    // Objet Date natif
    if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
    // MongoDB extended JSON : { "$date": "..." } ou { "$date": { "$numberLong": "..." } }
    if (typeof d === "object" && d !== null) {
      const obj = d as Record<string, unknown>;
      if ("$date" in obj) {
        const inner = obj.$date;
        if (typeof inner === "string" || typeof inner === "number") {
          const date = new Date(inner);
          return isNaN(date.getTime()) ? null : date;
        }
        if (typeof inner === "object" && inner !== null && "$numberLong" in (inner as Record<string,unknown>)) {
          const date = new Date(Number((inner as Record<string,unknown>).$numberLong));
          return isNaN(date.getTime()) ? null : date;
        }
      }
    }
    // ISO string ou timestamp numérique
    const date = new Date(d as string | number);
    return isNaN(date.getTime()) ? null : date;
  };

  const fmt = (d: unknown): string | null => {
    const date = parseDate(d);
    if (!date) return null;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getCreatedAt = (r: any): string => {
    const date = parseDate(r.createdAt);
    if (!date) return "—";
    // Rejeter les dates manifestement aberrantes (dans le futur de plus de 24h)
    if (date.getTime() > Date.now() + 86_400_000) return "—";
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // ── Hôtel le moins réservé (semaine ou mois) ──
  const [hotelStatPeriod, setHotelStatPeriod] = useState<"semaine" | "mois" | "tous">("semaine");
  const [promoIALoadingId, setPromoIALoadingId] = useState<string | null>(null);
  const [selectedPromoHotels, setSelectedPromoHotels] = useState<Set<string>>(new Set());

  const togglePromoHotel = (id: string) => {
    setSelectedPromoHotels((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Génère une promo IA (paragraphe commercial + vraies photos) pour un ou plusieurs hôtels
  // puis l'envoie à tous les clients
  const handlePromoIA = async (hotels: { id: string; titre: string }[]) => {
    if (hotels.length === 0) return;
    const titleLabel = hotels.length === 1 ? hotels[0].titre : `${hotels.length} hôtels`;
    const { value: formValues, isConfirmed } = await Swal.fire({
      title: `Promo IA — ${titleLabel}`,
      html:
        `<p style="font-size:13px;color:#64748b;margin-bottom:16px">L'agent IA va rédiger un message commercial avec de vraies photos ${hotels.length === 1 ? "de l'hôtel" : `de chaque hôtel (${hotels.length})`}, puis l'envoyer par email à <b>tous les clients</b>.</p>` +
        `<div style="text-align:left;margin-bottom:12px">` +
          `<label style="display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:4px">Réduction (%) — optionnel</label>` +
          `<input id="swal-reduction" type="number" min="0" max="100" class="swal2-input" style="margin:0;width:100%" placeholder="Ex : 20 pour -20%">` +
          `<span style="font-size:11px;color:#94a3b8">Appliquée à tous les hôtels sélectionnés. Laisse vide si aucune réduction.</span>` +
        `</div>` +
        `<div style="text-align:left">` +
          `<label style="display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:4px">Conditions — optionnel</label>` +
          `<input id="swal-details" class="swal2-input" style="margin:0;width:100%" placeholder="Ex : séjour de 3 nuits minimum">` +
          `<span style="font-size:11px;color:#94a3b8">Texte affiché en bas de l'email (durée, validité…).</span>` +
        `</div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: hotels.length === 1 ? "Générer & envoyer" : `Générer & envoyer (${hotels.length})`,
      cancelButtonText: "Annuler",
      confirmButtonColor: "#7c3aed",
      preConfirm: () => ({
        reduction: (document.getElementById("swal-reduction") as HTMLInputElement)?.value,
        details: (document.getElementById("swal-details") as HTMLInputElement)?.value,
      }),
    });
    if (!isConfirmed) return;
    const reduction = formValues?.reduction ? Number(formValues.reduction) : undefined;
    const details = formValues?.details || undefined;
    setPromoIALoadingId(hotels.length === 1 ? hotels[0].id : "__batch__");
    try {
      // Un seul appel → un seul email groupé présentant tous les hôtels sélectionnés
      const res = await campagnesAPI.promoIA({ hotelIds: hotels.map((h) => h.id), reduction, details });
      toast("success", res.message);
      setSelectedPromoHotels(new Set());
    } catch (err: any) {
      toast("error", err?.message ?? "Erreur lors du lancement de la promo IA");
    } finally {
      setPromoIALoadingId(null);
    }
  };

  const weeklyHotelStats = React.useMemo(() => {
    const now = new Date();
    const isAll = hotelStatPeriod === "tous";
    const days = hotelStatPeriod === "semaine" ? 7 : 30;
    const periodStart: Date | null = isAll ? null : new Date(now.getTime() - days * 86_400_000);

    // On ne considère que les hébergements de type HOTEL
    const hotels = hebergements.filter((h) => (h.type ?? "HOTEL") === "HOTEL");
    if (hotels.length === 0) return null;

    // Résoudre l'hébergement d'une réservation (chambreID peuplé ou simple id)
    const resolveHebId = (r: any): string | null => {
      const direct = r.chambreID?.hebergementID?._id ?? r.chambreID?.hebergementID;
      if (direct) return String(direct);
      const cId = String(r.chambreID?._id ?? r.chambreID ?? "");
      const ch = chambres.find((c) => String(c._id) === cId);
      return ch ? String(ch.hebergementID) : null;
    };

    // Compteur des réservations hôtel créées sur les 7 derniers jours
    const counts = new Map<string, number>(hotels.map((h) => [String(h._id), 0]));
    let totalWeek = 0;
    reservations.forEach((r) => {
      if (!isAll) {
        const d = parseDate(r.createdAt);
        if (!d || d < periodStart! || d > now) return;
      }
      const hebId = resolveHebId(r);
      if (hebId && counts.has(hebId)) {
        counts.set(hebId, (counts.get(hebId) ?? 0) + 1);
        totalWeek++;
      }
    });

    const ranked = hotels
      .map((h) => ({
        id: String(h._id),
        titre: h.titre ?? "—",
        localisation: h.localisation ?? "",
        count: counts.get(String(h._id)) ?? 0,
      }))
      .sort((a, b) => a.count - b.count || a.titre.localeCompare(b.titre));

    return { periodStart, ranked, least: ranked[0], totalWeek };
  }, [hebergements, chambres, reservations, hotelStatPeriod]);

  // ── Mapped rows for tables ──
  const mappedUsers = users.map((u) => ({
    id: u._id,
    name: `${u.firstname ?? ""} ${u.lastname ?? ""}`.trim() || u.email || "—",
    email: u.email,
    status: mapEtatCompte(u.etatCompte),
    date: getCreatedAt(u),
    role: u.role === "ADMIN" ? "Admin" : "Client",
  }));

  const mappedReservations = reservations.map((r) => {
    const type: string = r.typeReservation ?? "";
    let periodeLabel = "—";
    let periodeDebut: string | null = null;
    let periodeFin: string | null = null;

    if (type === "HOTEL") {
      periodeDebut = fmt(r.dateDebutSejour);
      periodeFin = fmt(r.dateFinSejour);
      periodeLabel = periodeDebut && periodeFin ? `${periodeDebut} → ${periodeFin}` : periodeDebut ?? "—";
    } else if (type === "EXCURSION") {
      periodeDebut = fmt(r.dateExcursion);
      periodeLabel = periodeDebut ?? "—";
    } else if (type === "INTERNATIONALE") {
      periodeLabel = "Voyage international";
    }

    const isGuest = !r.clientID && (r.guestNom || r.guestEmail);
    const clientName = r.clientID
      ? `${r.clientID.firstname ?? ""} ${r.clientID.lastname ?? ""}`.trim() || r.clientID.email
      : isGuest
        ? `${r.guestPrenom ?? ""} ${r.guestNom ?? ""}`.trim() || r.guestEmail || "Visiteur"
        : "—";

    const destination = r.offreID?.titre
      ?? r.serviceID?.titre
      ?? r.chambreID?.hebergementID?.titre
      ?? r.paysDestination
      ?? "—";

    return {
      id: r._id?.slice(-6)?.toUpperCase() ?? "—",
      rawId: r._id,
      client: clientName,
      isGuest,
      guestEmail: r.guestEmail ?? "",
      destination,
      montantRaw: r.montantTotal ?? 0,
      montant: `${(r.montantTotal ?? 0).toLocaleString("fr-FR")} TND`,
      statut: mapStatut(r.statut),
      dateCreation: getCreatedAt(r),
      type,
      periodeLabel,
      periodeDebut,
      periodeFin,
      nbPersonnes: r.nbPersonnes ?? "—",
      rawData: r,
    };
  });

  const mappedOffres = offres.map((o) => ({
    id: o._id,
    destination: o.titre ?? "—",
    descriptionCourte: o.descriptionCourte ?? "",
    prixRaw: o.prixAPartirDe ?? 0,
    prix: `${(o.prixAPartirDe ?? 0).toLocaleString("fr-FR")} TND`,
    statut: suspendedIds.has(o._id) ? "Suspendue" : "Active",
    reservations: reservations.filter((r) => r.offreID?._id === o._id || r.offreID === o._id).length,
    serviceID: String(o.serviceID?._id ?? o.serviceID ?? ""),
    serviceLabel: o.serviceID?.titre ?? "",
    serviceType: o.serviceID?.typeService ?? "",
  }));

  // ── Données filtrées + triées + paginées ──
  // Normalisation commune à toutes les recherches admin (tolérante djerba/jerba).
  const q = (s: unknown) => normalizeSearch(String(s ?? ""));

  // Clients
  const filteredUsers = mappedUsers
    .filter((u) => {
      const term = q(searchClients);
      return !term || q(u.name).includes(term) || q(u.email).includes(term) || q(u.role).includes(term) || q(u.status).includes(term);
    })
    .sort((a, b) => {
      if (sortClients === "name_asc") return a.name.localeCompare(b.name);
      if (sortClients === "name_desc") return b.name.localeCompare(a.name);
      if (sortClients === "date_asc") return a.date.localeCompare(b.date);
      return b.date.localeCompare(a.date); // date_desc
    });
  const totalPagesClients = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((pageClients - 1) * PAGE_SIZE, pageClients * PAGE_SIZE);

  // Offres
  const filteredOffres = mappedOffres.filter((o) => {
    const term = q(searchOffres);
    return !term || q(o.destination).includes(term) || q(o.prix).includes(term);
  });
  const totalPagesOffres = Math.max(1, Math.ceil(filteredOffres.length / PAGE_SIZE));
  const pagedOffres = filteredOffres.slice((pageOffres - 1) * PAGE_SIZE, pageOffres * PAGE_SIZE);

  // Chambres
  const TYPE_LABELS: Record<string, string> = {
    SINGLE: "Single", DOUBLE: "Double", TWIN: "Twin",
    SUITE: "Suite", DELUXE: "Deluxe", FAMILIALE: "Familiale",
  };
  const mappedChambres = chambres.map((c) => {
    const heb = hebergements.find((h) => String(h._id) === String(c.hebergementID)) ?? null;
    return {
      raw: c,
      id: c._id,
      hebergementName: heb?.titre ?? "—",
      numeroChambre: c.numeroChambre,
      typeChambre: c.typeChambre,
      typeLabel: TYPE_LABELS[c.typeChambre] ?? c.typeChambre,
      etage: c.etage != null ? String(c.etage) : "—",
      capacite: c.capacite,
      superficie: c.superficie != null ? `${c.superficie} m²` : "—",
      prixParNuit: c.prixParNuit,
      disponible: c.disponible,
    };
  });
  const filteredChambres = mappedChambres.filter((c) => {
    const term = q(searchChambres);
    return !term || q(c.hebergementName).includes(term) || q(c.numeroChambre).includes(term) || q(c.typeLabel).includes(term);
  });
  const totalPagesChambre = Math.max(1, Math.ceil(filteredChambres.length / PAGE_SIZE));
  const pagedChambres = filteredChambres.slice((pageChambre - 1) * PAGE_SIZE, pageChambre * PAGE_SIZE);

  // Réservations
  const filteredReservations = mappedReservations
    .filter((r) => {
      const term = q(searchReservations);
      const matchSearch = !term || q(r.id).includes(term) || q(r.client).includes(term) || q(r.destination).includes(term) || q(r.montant).includes(term) || q(r.guestEmail).includes(term);
      const matchStatut = filterStatut === "tous" || r.statut === filterStatut;
      const matchType = filterType === "tous" || r.type === filterType;
      return matchSearch && matchStatut && matchType;
    })
    .sort((a, b) => {
      if (sortReservations === "client_asc") return a.client.localeCompare(b.client);
      if (sortReservations === "client_desc") return b.client.localeCompare(a.client);
      if (sortReservations === "montant_asc") return (parseFloat(a.montant) || 0) - (parseFloat(b.montant) || 0);
      if (sortReservations === "montant_desc") return (parseFloat(b.montant) || 0) - (parseFloat(a.montant) || 0);
      if (sortReservations === "date_asc") return a.dateCreation.localeCompare(b.dateCreation);
      return b.dateCreation.localeCompare(a.dateCreation); // date_desc
    });
  const totalPagesReservations = Math.max(1, Math.ceil(filteredReservations.length / PAGE_SIZE));
  const pagedReservations = filteredReservations.slice((pageReservations - 1) * PAGE_SIZE, pageReservations * PAGE_SIZE);

  const pendingPaymentsCount = mappedReservations.filter((r) => r.statut === "En attente").length;

  // Reset page quand le filtre change
  React.useEffect(() => { setPageClients(1); }, [searchClients, sortClients]);
  React.useEffect(() => { setPageOffres(1); }, [searchOffres]);
  React.useEffect(() => { setPageReservations(1); }, [searchReservations, filterStatut, filterType, sortReservations]);
  React.useEffect(() => { setPageChambre(1); }, [searchChambres]);

  const toast = (icon: "success" | "error" | "warning", title: string) =>
    Swal.fire({ toast: true, position: "top-end", icon, title, showConfirmButton: false, timer: 2500, timerProgressBar: true });

  const handleToggleUser = async (email: string, currentStatus: string) => {
    const action = currentStatus === "Actif" ? "suspendre" : "activer";
    const result = await Swal.fire({
      title: `Voulez-vous ${action} ce compte ?`,
      text: `L'utilisateur ${email} sera ${action === "suspendre" ? "suspendu" : "réactivé"}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: `Oui, ${action}`,
      cancelButtonText: "Annuler",
      confirmButtonColor: action === "suspendre" ? "#d97706" : "#2563eb",
    });
    if (!result.isConfirmed) return;
    try {
      await usersAPI.toggleStatus(email);
      const updated = await usersAPI.getAll();
      setUsers(updated);
      toast("success", `Compte ${action === "suspendre" ? "suspendu" : "activé"} avec succès`);
    } catch {
      toast("error", "Erreur lors de la mise à jour");
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: "Supprimer ce client ?",
      text: `${name} sera définitivement supprimé. Cette action est irréversible.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await usersAPI.delete(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast("success", "Client supprimé avec succès");
    } catch {
      toast("error", "Erreur lors de la suppression");
    }
  };

  const exportClientsCSV = () => {
    const headers = ["Nom complet", "Email", "Rôle", "Date inscription", "Statut"];
    const rows = filteredUsers.map((u) => [u.name, u.email, u.role, u.date, u.status]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteOffre = async (id: string, title: string) => {
    const result = await Swal.fire({
      title: "Supprimer cette offre ?",
      text: `"${title}" sera définitivement supprimée.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await offresAPI.delete(id);
      setOffres((prev) => prev.filter((o) => o._id !== id));
      toast("success", "Offre supprimée avec succès");
    } catch {
      toast("error", "Erreur lors de la suppression");
    }
  };

  const openAddChambre = () => {
    setChambreForm({ hebergementID: hebergements[0]?._id ?? "", numeroChambre: "", typeChambre: "DOUBLE", etage: "", capacite: "2", superficie: "", prixParNuit: "", disponible: true, formule: "LOGEMENT_SEUL", vue: "AUCUNE", description: "", images: [] });
    setChambreModal({ open: true, mode: "add", chambre: null });
  };

  const openEditChambre = (c: any) => {
    setChambreForm({
      hebergementID: String(c.hebergementID),
      numeroChambre: c.numeroChambre,
      typeChambre: c.typeChambre,
      etage: c.etage != null ? String(c.etage) : "",
      capacite: String(c.capacite),
      superficie: c.superficie != null ? String(c.superficie) : "",
      prixParNuit: String(c.prixParNuit),
      disponible: c.disponible,
      formule: c.formule ?? "LOGEMENT_SEUL",
      vue: c.vue ?? "AUCUNE",
      description: c.description ?? "",
      images: c.images ?? [],
    });
    setChambreModal({ open: true, mode: "edit", chambre: c });
  };

  const handleSubmitChambre = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!chambreForm.hebergementID || !chambreForm.numeroChambre || !chambreForm.capacite || !chambreForm.prixParNuit) {
      toast("error", "Hébergement, n° chambre, capacité et prix sont requis");
      return;
    }
    const payload: any = {
      hebergementID: chambreForm.hebergementID,
      numeroChambre: chambreForm.numeroChambre.trim(),
      typeChambre: chambreForm.typeChambre,
      capacite: parseInt(chambreForm.capacite),
      prixParNuit: parseFloat(chambreForm.prixParNuit),
      disponible: chambreForm.disponible,
    };
    if (chambreForm.etage !== "") payload.etage = parseInt(chambreForm.etage);
    if (chambreForm.superficie !== "") payload.superficie = parseFloat(chambreForm.superficie);
    payload.formule = chambreForm.formule;
    payload.vue = chambreForm.vue;
    if (chambreForm.description.trim()) payload.description = chambreForm.description.trim();
    payload.images = chambreForm.images;

    setSavingChambre(true);
    try {
      if (chambreModal.mode === "add") {
        const created = await chambresAPI.create(payload);
        setChambres((prev) => [...prev, created]);
      } else {
        const updated = await chambresAPI.update(chambreModal.chambre._id, payload);
        setChambres((prev) => prev.map((c) => c._id === updated._id ? updated : c));
      }
      setChambreModal({ open: false, mode: "add", chambre: null });
      toast("success", chambreModal.mode === "add" ? "Chambre créée avec succès" : "Chambre modifiée avec succès");
    } catch (err: any) {
      toast("error", err?.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSavingChambre(false);
    }
  };

  const handleToggleChambreAvailability = async (c: any) => {
    const action = c.disponible ? "désactiver" : "activer";
    const result = await Swal.fire({
      title: `${c.disponible ? "Désactiver" : "Activer"} cette chambre ?`,
      text: c.disponible ? "La chambre ne sera plus proposée." : "La chambre sera à nouveau disponible.",
      icon: "question", showCancelButton: true,
      confirmButtonText: `Oui, ${action}`, cancelButtonText: "Annuler",
      confirmButtonColor: c.disponible ? "#d97706" : "#2563eb",
    });
    if (!result.isConfirmed) return;
    try {
      await chambresAPI.toggleAvailability(c._id, !c.disponible);
      setChambres((prev) => prev.map((ch) => ch._id === c._id ? { ...ch, disponible: !ch.disponible } : ch));
      toast("success", `Chambre ${!c.disponible ? "activée" : "désactivée"}`);
    } catch (err: any) {
      toast("error", err?.message ?? "Erreur lors de la mise à jour");
    }
  };

  const handleDeleteChambre = async (c: any) => {
    const result = await Swal.fire({
      title: "Désactiver / Supprimer la chambre ?",
      text: `Chambre n°${c.numeroChambre}. Si des réservations actives existent, l'opération sera refusée.`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Oui, supprimer", cancelButtonText: "Annuler",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await chambresAPI.delete(c._id);
      setChambres((prev) => prev.map((ch) => ch._id === c._id ? { ...ch, disponible: false } : ch));
      toast("success", "Chambre désactivée");
    } catch (err: any) {
      toast("error", err?.message ?? "Impossible de supprimer cette chambre");
    }
  };

  const openAddOffre = () => {
    setOffreForm({ titre: "", descriptionCourte: "", prixAPartirDe: "", serviceID: "" });
    setOffreModal({ open: true, mode: "add", offre: null });
  };

  const openEditOffre = (o: any) => {
    setOffreForm({ titre: o.destination, descriptionCourte: o.descriptionCourte, prixAPartirDe: String(o.prixRaw), serviceID: o.serviceID ?? "" });
    setOffreModal({ open: true, mode: "edit", offre: o });
  };

  const handleSubmitOffre = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const prix = parseFloat(offreForm.prixAPartirDe);
    if (!offreForm.titre.trim() || isNaN(prix) || prix < 0) {
      toast("error", "Titre et prix valide obligatoires");
      return;
    }
    if (!offreForm.serviceID) {
      toast("error", "Veuillez sélectionner un service");
      return;
    }
    setSavingOffre(true);
    try {
      const payload = { titre: offreForm.titre.trim(), descriptionCourte: offreForm.descriptionCourte.trim(), prixAPartirDe: prix, serviceID: offreForm.serviceID };
      if (offreModal.mode === "add") {
        await offresAPI.create(payload);
        toast("success", "Offre ajoutée avec succès");
      } else {
        await offresAPI.update(offreModal.offre.id, payload);
        toast("success", "Offre modifiée avec succès");
      }
      const updated = await offresAPI.getAll();
      setOffres(updated);
      setOffreModal({ open: false, mode: "add", offre: null });
    } catch {
      toast("error", "Erreur lors de l'enregistrement");
    } finally {
      setSavingOffre(false);
    }
  };

  const handleConfirmReservation = async (id: string, ref: string) => {
    const result = await Swal.fire({
      title: "Confirmer la réservation ?",
      text: `La réservation ${ref} sera confirmée et le client notifié.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Oui, confirmer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#16a34a",
    });
    if (!result.isConfirmed) return;
    try {
      await reservationsAPI.confirm(id);
      const updated = await reservationsAPI.getAll();
      setReservations(updated);
      toast("success", "Réservation confirmée");
    } catch {
      toast("error", "Erreur lors de la confirmation");
    }
  };

  const handleCancelReservation = async (id: string, ref: string) => {
    const result = await Swal.fire({
      title: "Annuler la réservation ?",
      text: `La réservation ${ref} sera annulée.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, annuler",
      cancelButtonText: "Retour",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await reservationsAPI.cancel(id);
      const updated = await reservationsAPI.getAll();
      setReservations(updated);
      toast("success", "Réservation annulée");
    } catch {
      toast("error", "Erreur lors de l'annulation");
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
                <p className="text-blue-500/60" style={{ fontSize: "0.6rem", letterSpacing: "0.1em" }}>ADMIN PANEL</p>
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
                {initials.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-sm truncate">{prenom} {nom}</p>
                <span className="bg-blue-600/20 text-blue-400 text-xs px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                  <Shield className="h-2.5 w-2.5" /> Administrateur
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
                activePage === item.id ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/8"
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
              Administration SmartTravel · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActivePage("settings")}
              className="flex items-center gap-2 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors group"
              title="Voir mon profil"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs group-hover:bg-blue-700 transition-colors">
                {initials.toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-gray-800 text-sm group-hover:text-blue-600 transition-colors" style={{ fontWeight: 500 }}>{prenom} {nom}</p>
                <p className="text-blue-600" style={{ fontSize: "0.7rem" }}>Administrateur</p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              title="Se déconnecter"
              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">

          {/* ══ DASHBOARD ══ */}
          {activePage === "dashboard" && (
            <div className="space-y-6">

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsData.map((stat) => (
                  <div key={stat.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.color} w-10 h-10 rounded-xl flex items-center justify-center`}>
                        <stat.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="flex items-center gap-0.5 text-green-600 text-xs">
                        <ArrowUpRight className="h-3 w-3" />
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-[#080f1e] mb-0.5" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                      {loadingData ? "..." : stat.value}
                    </p>
                    <p className="text-gray-500 text-xs">{stat.title}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-[#080f1e]" style={{ fontWeight: 600 }}>Évolution des revenus</h3>
                      <p className="text-gray-400 text-xs mt-0.5">Données réelles par mois</p>
                    </div>
                    <span className="bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-lg">Live</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRevenu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                        formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} TND`, "Revenus"]}
                      />
                      <Area type="monotone" dataKey="revenus" stroke="#2563eb" strokeWidth={2.5} fill="url(#colorRevenu)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-[#080f1e]" style={{ fontWeight: 600 }}>Réservations</h3>
                      <p className="text-gray-400 text-xs mt-0.5">Par mois</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0" }} cursor={{ fill: "#f1f5f9" }} />
                      <Bar dataKey="reservations" fill="#0a1628" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── Chambres réservées par mois ── */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-[#080f1e]" style={{ fontWeight: 600 }}>Chambres réservées par mois</h3>
                    <p className="text-gray-400 text-xs mt-0.5">Réservations d'hôtel, par mois de séjour · {reservations.filter(r => r.typeReservation === "HOTEL" || r.chambreID).length} au total</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-600 text-xs px-3 py-1 rounded-lg">🛏 Hôtels</span>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} barSize={26}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0" }}
                      cursor={{ fill: "#f1f5f9" }}
                      formatter={(value) => [`${value} chambre${Number(value) > 1 ? "s" : ""}`, "Réservées"]}
                    />
                    <Bar dataKey="chambres" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ── Hôtel le moins réservé cette semaine ── */}
              {weeklyHotelStats && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <div>
                      <h3 className="text-[#080f1e]" style={{ fontWeight: 600 }}>
                        Hôtel le moins réservé {hotelStatPeriod === "semaine" ? "cette semaine" : hotelStatPeriod === "mois" ? "ce mois-ci" : "(toutes périodes)"}
                      </h3>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {hotelStatPeriod === "tous"
                          ? "Toutes les réservations confondues"
                          : `${hotelStatPeriod === "semaine" ? "7 derniers jours" : "30 derniers jours"} · depuis le ${weeklyHotelStats.periodStart!.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`}
                        {" · "}{weeklyHotelStats.totalWeek} réservation{weeklyHotelStats.totalWeek > 1 ? "s" : ""} au total
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Sélecteur de période */}
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        {([["semaine", "Semaine"], ["mois", "Mois"], ["tous", "Tous"]] as const).map(([p, label]) => (
                          <button
                            key={p}
                            onClick={() => setHotelStatPeriod(p)}
                            className={`text-xs px-3 py-1 rounded-md transition-colors ${
                              hotelStatPeriod === p ? "bg-white text-[#080f1e] shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}
                            style={{ fontWeight: hotelStatPeriod === p ? 600 : 400 }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <span className="bg-amber-50 text-amber-600 text-xs px-3 py-1 rounded-lg flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> À booster
                      </span>
                    </div>
                  </div>

                  {/* Hôtel en tête du classement (le moins réservé) */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50/60 border border-amber-100 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[#080f1e] truncate" style={{ fontWeight: 700, fontSize: "1.05rem" }}>{weeklyHotelStats.least.titre}</p>
                      <p className="text-gray-500 text-xs truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" /> {weeklyHotelStats.least.localisation || "Localisation non renseignée"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-amber-600" style={{ fontWeight: 700, fontSize: "1.6rem", lineHeight: 1 }}>{weeklyHotelStats.least.count}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">réservation{weeklyHotelStats.least.count > 1 ? "s" : ""}</p>
                    </div>
                    <button
                      onClick={() => handlePromoIA([{ id: weeklyHotelStats.least.id, titre: weeklyHotelStats.least.titre }])}
                      disabled={promoIALoadingId !== null}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-sm disabled:opacity-50"
                      title="Générer un message promotionnel IA et l'envoyer à tous les clients"
                    >
                      {promoIALoadingId === weeklyHotelStats.least.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Sparkles className="h-3.5 w-3.5" />}
                      Promo IA
                    </button>
                  </div>

                  {/* Classement des hôtels les moins réservés */}
                  {(() => {
                    const visible = hotelStatPeriod === "tous" ? weeklyHotelStats.ranked : weeklyHotelStats.ranked.slice(0, 5);
                    const allSelected = visible.length > 0 && visible.every((h) => selectedPromoHotels.has(h.id));
                    return (
                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <p className="text-gray-400 text-[11px] uppercase tracking-wide">
                          Classement (du moins au plus réservé){hotelStatPeriod === "tous" ? ` · ${weeklyHotelStats.ranked.length} hôtels` : ""}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setSelectedPromoHotels((prev) => {
                                const n = new Set(prev);
                                if (allSelected) visible.forEach((h) => n.delete(h.id));
                                else visible.forEach((h) => n.add(h.id));
                                return n;
                              })
                            }
                            className="text-[11px] text-gray-500 hover:text-gray-700"
                          >
                            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                          </button>
                          <button
                            onClick={() =>
                              handlePromoIA(
                                weeklyHotelStats.ranked
                                  .filter((h) => selectedPromoHotels.has(h.id))
                                  .map((h) => ({ id: h.id, titre: h.titre }))
                              )
                            }
                            disabled={selectedPromoHotels.size === 0 || promoIALoadingId !== null}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {promoIALoadingId === "__batch__"
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Sparkles className="h-3.5 w-3.5" />}
                            Promo IA ({selectedPromoHotels.size})
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                  <div className={`space-y-2.5 ${hotelStatPeriod === "tous" ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
                    {(hotelStatPeriod === "tous" ? weeklyHotelStats.ranked : weeklyHotelStats.ranked.slice(0, 5)).map((h, i) => {
                      const max = Math.max(1, weeklyHotelStats.ranked[weeklyHotelStats.ranked.length - 1].count);
                      const pct = Math.round((h.count / max) * 100);
                      return (
                        <div key={h.id}>
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPromoHotels.has(h.id)}
                                onChange={() => togglePromoHotel(h.id)}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                              />
                              <span className="text-gray-400 text-xs w-4 flex-shrink-0">{i + 1}.</span>
                              <span className="text-gray-700 text-sm truncate">{h.titre}</span>
                            </label>
                            <span className="text-xs flex-shrink-0" style={{ fontWeight: 600, color: i === 0 ? "#d97706" : "#6b7280" }}>
                              {h.count}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${Math.max(pct, h.count > 0 ? 6 : 2)}%`, backgroundColor: i === 0 ? "#f59e0b" : "#cbd5e1" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tables résumé */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="text-[#080f1e]" style={{ fontWeight: 600 }}>Derniers clients</h3>
                    <button onClick={() => setActivePage("clients")} className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                      Voir tout <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/70">
                        <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wide">Nom</th>
                        <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wide">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {mappedUsers.slice(0, 5).map((u) => (
                        <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#0a1628] flex items-center justify-center text-white" style={{ fontSize: "0.65rem" }}>
                                {(u.name || "?").split(" ").map((n: string) => n[0] ?? "").join("").slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-gray-800 text-sm">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{u.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="text-[#080f1e]" style={{ fontWeight: 600 }}>Dernières réservations</h3>
                    <button onClick={() => setActivePage("reservations")} className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                      Voir tout <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/70">
                        <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wide">Réf.</th>
                        <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wide">Client</th>
                        <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wide">Réservé le</th>
                        <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wide">Séjour</th>
                        <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wide">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {mappedReservations.slice(0, 5).map((r) => (
                        <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-5 py-3 text-gray-500 text-xs font-mono">{r.id}</td>
                          <td className="px-5 py-3 text-gray-800 text-sm">{r.client}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{r.dateCreation}</td>
                          <td className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap">{r.periodeLabel}</td>
                          <td className="px-5 py-3 text-blue-600 text-sm" style={{ fontWeight: 600 }}>{r.montant}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ CLIENTS ══ */}
          {activePage === "clients" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
                <h3 className="text-[#080f1e]" style={{ fontWeight: 600 }}>
                  Clients ({filteredUsers.length}{filteredUsers.length !== mappedUsers.length ? `/${mappedUsers.length}` : ""})
                  <span className="text-gray-400 text-xs ml-2" style={{ fontWeight: 400 }}>
                    — page {pageClients}/{totalPagesClients}
                  </span>
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={exportClientsCSV}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    title="Exporter la liste filtrée en CSV"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </button>
                  <select
                    value={sortClients}
                    onChange={(e) => setSortClients(e.target.value)}
                    className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                  >
                    <option value="date_desc">Plus récents d'abord</option>
                    <option value="date_asc">Plus anciens d'abord</option>
                    <option value="name_asc">Nom A → Z</option>
                    <option value="name_desc">Nom Z → A</option>
                  </select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={searchClients}
                      onChange={(e) => setSearchClients(e.target.value)}
                      className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-60"
                      placeholder="Nom, email, rôle, statut..."
                    />
                    {searchClients && (
                      <button onClick={() => setSearchClients("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/70">
                      {["Client", "Email", "Rôle", "Date d'inscription", "Statut", "Actions"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagedUsers.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">Aucun client trouvé pour « {searchClients} »</td></tr>
                    ) : pagedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0a1628] flex items-center justify-center text-white text-xs">
                              {(u.name || "?").split(" ").map((n: string) => n[0] ?? "").join("").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-gray-800 text-sm">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-sm">{u.email}</td>
                        <td className="px-5 py-4">
                          <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">{u.role}</span>
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-sm">{u.date}</td>
                        <td className="px-5 py-4"><StatutBadge statut={u.status} /></td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleUser(u.email, u.status)}
                              className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
                              title="Activer/Suspendre"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageClients} total={totalPagesClients} onChange={setPageClients} />
            </div>
          )}

          {/* ══ OFFRES ══ */}
          {activePage === "offres" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-[#080f1e]" style={{ fontWeight: 600 }}>
                  Offres ({filteredOffres.length}{filteredOffres.length !== mappedOffres.length ? `/${mappedOffres.length}` : ""})
                  <span className="text-gray-400 text-xs ml-2" style={{ fontWeight: 400 }}>— page {pageOffres}/{totalPagesOffres}</span>
                </h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={searchOffres}
                      onChange={(e) => setSearchOffres(e.target.value)}
                      className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                      placeholder="Rechercher une offre..."
                    />
                    {searchOffres && (
                      <button onClick={() => setSearchOffres("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <button onClick={openAddOffre} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <Plane className="h-4 w-4" /> Ajouter une offre
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/70">
                      {["Titre", "Service lié", "Prix / pers.", "Réservations", "Statut", "Actions"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagedOffres.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">Aucune offre trouvée pour « {searchOffres} »</td></tr>
                    ) : pagedOffres.map((o) => (
                      <tr key={o.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="px-5 py-4">
                          <div>
                            <span className="text-gray-800 text-sm font-medium">{o.destination}</span>
                            {o.descriptionCourte && <p className="text-xs text-gray-400 truncate max-w-[180px]">{o.descriptionCourte}</p>}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {o.serviceLabel ? (
                            <div>
                              <span className="text-sm text-gray-700">{o.serviceLabel}</span>
                              {o.serviceType && (
                                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${o.serviceType === "HEBERGEMENT" ? "bg-blue-100 text-blue-700" : o.serviceType === "ACTIVITE" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>
                                  {o.serviceType}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-red-400 italic">Non lié</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-blue-600 text-sm" style={{ fontWeight: 600 }}>{o.prix}</td>
                        <td className="px-5 py-4">
                          <span className="bg-[#0a1628] text-white text-xs px-3 py-1 rounded-full">{o.reservations}</span>
                        </td>
                        <td className="px-5 py-4"><StatutBadge statut={o.statut} /></td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditOffre(o)}
                              className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                toggleSuspend(o.id);
                                toast(suspendedIds.has(o.id) ? "success" : "warning",
                                  suspendedIds.has(o.id) ? "Offre réactivée" : "Offre suspendue");
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${suspendedIds.has(o.id) ? "hover:bg-green-50 text-green-600" : "hover:bg-yellow-50 text-yellow-600"}`}
                              title={suspendedIds.has(o.id) ? "Réactiver" : "Suspendre"}
                            >
                              {suspendedIds.has(o.id) ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteOffre(o.id, o.destination)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageOffres} total={totalPagesOffres} onChange={setPageOffres} />
            </div>
          )}

          {/* ══ SERVICES ══ */}
          {activePage === "services" && (() => {
            const TYPE_BADGE: Record<string, string> = { HEBERGEMENT: "bg-blue-100 text-blue-700", DESTINATION: "bg-purple-100 text-purple-700", ACTIVITE: "bg-green-100 text-green-700" };
            const TYPE_ICON: Record<string, string> = { HEBERGEMENT: "🏨", DESTINATION: "✈️", ACTIVITE: "🧭" };
            const filtered = services.filter(s =>
              matchSearch(s.titre, searchServices) ||
              matchSearch(s.localisation, searchServices) ||
              matchSearch(s.typeService, searchServices)
            );
            const SVC_PAGE_SIZE = 8;
            const totalPagesSvc = Math.max(1, Math.ceil(filtered.length / SVC_PAGE_SIZE));
            const paged = filtered.slice((pageServices - 1) * SVC_PAGE_SIZE, pageServices * SVC_PAGE_SIZE);
            return (
            <div className="space-y-6">
              {/* KPI */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {SERVICE_TYPES.map(t => (
                  <div key={t} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${TYPE_BADGE[t] ?? "bg-gray-100"}`}>
                      {TYPE_ICON[t]}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#0a1628]">{services.filter(s => s.typeService === t).length}</p>
                      <p className="text-xs text-gray-500">{t.charAt(0) + t.slice(1).toLowerCase()}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un service…"
                      value={searchServices}
                      onChange={e => { setSearchServices(e.target.value); setPageServices(1); }}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={openAddService}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    <Package className="h-4 w-4" /> Ajouter un service
                  </button>
                </div>

                {filtered.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Package className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                    <p className="text-sm">Aucun service trouvé</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/70">
                          {["Service", "Type", "Localisation", "Prix base", "Durée/Catégorie", "Actions"].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paged.map(s => (
                          <tr key={s._id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-[#0a1628]">{s.titre}</p>
                              {s.description && <p className="text-xs text-gray-400 truncate max-w-[180px]">{s.description}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_BADGE[s.typeService] ?? "bg-gray-100 text-gray-600"}`}>
                                {TYPE_ICON[s.typeService]} {s.typeService}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{s.localisation || "—"}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {s.typeService === "HEBERGEMENT"
                                ? <span className="text-xs text-gray-400 italic">via chambres</span>
                                : (s.prixBase ? `${s.prixBase} ${s.devise ?? "TND"}` : "—")}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{s.duree || s.categorie || "—"}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => openEditService(s)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Modifier">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDeleteService(s._id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Supprimer">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pagination page={pageServices} total={totalPagesSvc} onChange={setPageServices} />
              </div>
            </div>
            );
          })()}

          {/* ══ RESERVATIONS ══ */}
          {activePage === "reservations" && (
            <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
                <h3 className="text-[#080f1e]" style={{ fontWeight: 600 }}>
                  Réservations ({filteredReservations.length}{filteredReservations.length !== mappedReservations.length ? `/${mappedReservations.length}` : ""})
                  <span className="text-gray-400 text-xs ml-2" style={{ fontWeight: 400 }}>— page {pageReservations}/{totalPagesReservations}</span>
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Tri */}
                  <select
                    value={sortReservations}
                    onChange={(e) => setSortReservations(e.target.value)}
                    className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                  >
                    <option value="date_desc">Plus récentes</option>
                    <option value="date_asc">Plus anciennes</option>
                    <option value="client_asc">Client A → Z</option>
                    <option value="client_desc">Client Z → A</option>
                    <option value="montant_desc">Montant ↓</option>
                    <option value="montant_asc">Montant ↑</option>
                  </select>
                  {/* Filtre type */}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                  >
                    <option value="tous">Tous les types</option>
                    <option value="HOTEL">🏨 Hôtel</option>
                    <option value="EXCURSION">🧭 Excursion</option>
                    <option value="INTERNATIONALE">✈️ Internationale</option>
                  </select>
                  {/* Filtre statut */}
                  <select
                    value={filterStatut}
                    onChange={(e) => setFilterStatut(e.target.value)}
                    className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                  >
                    <option value="tous">Tous les statuts</option>
                    <option value="En attente">En attente</option>
                    <option value="Confirmée">Confirmée</option>
                    <option value="Annulée">Annulée</option>
                    <option value="Terminée">Terminée</option>
                  </select>
                  {/* Recherche texte */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={searchReservations}
                      onChange={(e) => setSearchReservations(e.target.value)}
                      className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                      placeholder="Réf., client, destination..."
                    />
                    {searchReservations && (
                      <button onClick={() => setSearchReservations("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {(searchReservations || filterStatut !== "tous" || filterType !== "tous") && (
                    <button
                      onClick={() => { setSearchReservations(""); setFilterStatut("tous"); setFilterType("tous"); }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Réinitialiser
                    </button>
                  )}
                  <button
                    onClick={() => reservationsAPI.getAll().catch(() => []).then((r) => setReservations(r))}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                    title="Actualiser"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50/70">
                      <th className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide">Réf.</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide">Client</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide">Offre</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide">Dates du séjour</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide">Réservé le</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide">Pers.</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagedReservations.length === 0 ? (
                      <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">Aucune réservation ne correspond à vos critères</td></tr>
                    ) : pagedReservations.map((r) => (
                      <tr key={r.rawId} className="hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => setSelectedResId(r.rawId)}>
                        <td className="px-4 py-4 text-gray-500 text-xs font-mono">{r.id}</td>
                        <td className="px-4 py-4 text-sm whitespace-nowrap">
                          <span className="text-gray-800">{r.client}</span>
                          {r.isGuest && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">Visiteur</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="flex items-center gap-1 text-gray-700 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{r.destination}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                            r.type === "HOTEL" ? "bg-blue-100 text-blue-700" :
                            r.type === "EXCURSION" ? "bg-green-100 text-green-700" :
                            "bg-purple-100 text-purple-700"
                          }`}>
                            {r.type === "HOTEL" ? "🏨 Hôtel" : r.type === "EXCURSION" ? "🧭 Excursion" : "✈️ Internationale"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {r.type === "HOTEL" && r.periodeDebut ? (
                            <div className="text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                                <span>{r.periodeDebut}</span>
                              </div>
                              {r.periodeFin && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                                  <span>{r.periodeFin}</span>
                                </div>
                              )}
                            </div>
                          ) : r.type === "EXCURSION" && r.periodeDebut ? (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-green-500" />{r.periodeDebut}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">{r.dateCreation}</td>
                        <td className="px-4 py-4 text-center text-gray-700 text-sm">{r.nbPersonnes}</td>
                        <td className="px-4 py-4 text-blue-600 text-sm whitespace-nowrap" style={{ fontWeight: 600 }}>{r.montant}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageReservations} total={totalPagesReservations} onChange={setPageReservations} />
            </div>

            {/* ── Panneau de détails réservation ── */}
            {selectedResId && (() => {
              const sel = mappedReservations.find(r => r.rawId === selectedResId);
              if (!sel) return null;
              const raw = sel.rawData;
              const isGuest = sel.isGuest;
              const FORMULE_LABELS: Record<string, string> = {
                ALL_INCLUSIVE: "All Inclusive", DEMI_PENSION: "Demi-pension",
                PRIX_SPECIAL: "Prix spécial", LOGEMENT_SEUL: "Logement seul",
              };
              const statutColors: Record<string, string> = {
                "Confirmée": "bg-green-100 text-green-700",
                "En attente": "bg-yellow-100 text-yellow-700",
                "Annulée": "bg-red-100 text-red-700",
                "Terminée": "bg-gray-100 text-gray-600",
              };
              return (
                <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedResId(null)}>
                  <div
                    className="relative h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* En-tête */}
                    <div className="flex items-center justify-between px-6 py-4 bg-[#0a1628] text-white sticky top-0 z-10">
                      <div>
                        <p className="font-bold text-base">Réservation #{sel.id}</p>
                        <p className="text-blue-300 text-xs mt-0.5">{sel.dateCreation}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statutColors[sel.statut] ?? "bg-gray-100 text-gray-600"}`}>
                          {sel.statut}
                        </span>
                        <button onClick={() => setSelectedResId(null)} className="text-white/60 hover:text-white transition-colors">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 p-6 space-y-5">

                      {/* Identité */}
                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                          {isGuest ? "Visiteur (sans compte)" : "Client enregistré"}
                        </h3>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                          {isGuest ? (
                            <>
                              <Row icon="👤" label="Nom complet" value={`${raw.guestPrenom ?? ""} ${raw.guestNom ?? ""}`.trim() || "—"} />
                              <Row icon="✉️" label="Email" value={raw.guestEmail || "—"} />
                              <Row icon="📞" label="Téléphone" value={raw.guestTelephone || "—"} />
                              <div className="pt-1">
                                <span className="text-[11px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">Visiteur sans compte</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <Row icon="👤" label="Nom complet" value={`${raw.clientID?.firstname ?? ""} ${raw.clientID?.lastname ?? ""}`.trim() || "—"} />
                              <Row icon="✉️" label="Email" value={raw.clientID?.email || "—"} />
                            </>
                          )}
                        </div>
                      </section>

                      {/* Séjour */}
                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Détails du séjour</h3>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                          <Row icon="🏷️" label="Type" value={raw.typeReservation === "HOTEL" ? "Hôtel" : raw.typeReservation === "EXCURSION" ? "Excursion" : "International"} />
                          {raw.chambreID?.hebergementID?.titre && (
                            <Row icon="🏨" label="Hôtel" value={raw.chambreID.hebergementID.titre} />
                          )}
                          {raw.chambreID?.hebergementID?.localisation && (
                            <Row icon="📍" label="Localisation" value={raw.chambreID.hebergementID.localisation} />
                          )}
                          {raw.chambreID && (
                            <Row icon="🛏️" label="Chambre" value={`${raw.chambreID.typeChambre ?? ""} — N°${raw.chambreID.numeroChambre ?? ""}`} />
                          )}
                          {raw.offreID?.titre && <Row icon="🎫" label="Offre" value={raw.offreID.titre} />}
                          {sel.periodeDebut && (
                            <Row icon="📅" label="Arrivée" value={sel.periodeDebut} />
                          )}
                          {sel.periodeFin && (
                            <Row icon="📅" label="Départ" value={sel.periodeFin} />
                          )}
                          {raw.nbNuits > 0 && (
                            <Row icon="🌙" label="Durée" value={`${raw.nbNuits} nuit${raw.nbNuits > 1 ? "s" : ""}`} />
                          )}
                          <Row icon="👥" label="Personnes" value={String(raw.nbPersonnes ?? "—")} />
                          {raw.formule && raw.formule !== "LOGEMENT_SEUL" && (
                            <Row icon="🍽️" label="Formule" value={FORMULE_LABELS[raw.formule] ?? raw.formule} />
                          )}
                        </div>
                      </section>

                      {/* Paiement */}
                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Paiement</h3>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                          <Row icon="💰" label="Montant total" value={sel.montant} bold />
                          <div className="flex items-start gap-2.5 text-sm">
                            <span className="text-base leading-none mt-0.5 flex-shrink-0">📋</span>
                            <span className="text-gray-500 min-w-[100px] flex-shrink-0">Statut</span>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                              sel.statut === "Confirmée" ? "bg-green-100 text-green-700" :
                              sel.statut === "Annulée"   ? "bg-red-100 text-red-700" :
                              sel.statut === "Terminée"  ? "bg-gray-100 text-gray-600" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {sel.statut === "En attente"
                                ? isGuest ? "En attente du paiement visiteur" : "En attente de confirmation"
                                : sel.statut}
                            </span>
                          </div>
                        </div>
                      </section>

                      {/* Actions admin */}
                      {sel.statut === "En attente" && sel.isGuest && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          Confirmation automatique dès que le visiteur effectue son paiement.
                        </div>
                      )}

                      {sel.statut === "En attente" && !sel.isGuest && (
                        <section className="flex gap-3">
                          <button
                            onClick={async () => {
                              try {
                                await reservationsAPI.confirm(sel.rawId);
                                const updated = await reservationsAPI.getAll();
                                setReservations(updated);
                                setSelectedResId(null);
                                toast("success", "Réservation confirmée");
                              } catch { toast("error", "Erreur lors de la confirmation"); }
                            }}
                            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle className="h-4 w-4" /> Confirmer
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await reservationsAPI.cancel(sel.rawId);
                                const updated = await reservationsAPI.getAll();
                                setReservations(updated);
                                setSelectedResId(null);
                                toast("success", "Réservation annulée");
                              } catch { toast("error", "Erreur lors de l'annulation"); }
                            }}
                            className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="h-4 w-4" /> Annuler
                          </button>
                        </section>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            </>
          )}

          {/* ══ CHAMBRES ══ */}
          {activePage === "chambres" && (
            <div className="space-y-5">
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total chambres", value: chambres.length, color: "bg-[#0a1628]", icon: BedDouble },
                  { label: "Disponibles", value: chambres.filter(c => c.disponible).length, color: "bg-green-600", icon: CheckCircle },
                  { label: "Indisponibles", value: chambres.filter(c => !c.disponible).length, color: "bg-red-500", icon: XCircle },
                  { label: "Hébergements", value: hebergements.length, color: "bg-blue-600", icon: MapPin },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className={`${s.color} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <s.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">{s.label}</p>
                      <p className="text-[#080f1e] text-xl" style={{ fontWeight: 700 }}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="text-[#080f1e]" style={{ fontWeight: 600 }}>
                    Chambres ({filteredChambres.length}{filteredChambres.length !== mappedChambres.length ? `/${mappedChambres.length}` : ""})
                    <span className="text-gray-400 text-xs ml-2" style={{ fontWeight: 400 }}>— page {pageChambre}/{totalPagesChambre}</span>
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        value={searchChambres}
                        onChange={(e) => setSearchChambres(e.target.value)}
                        className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                        placeholder="Hébergement, n°, type..."
                      />
                      {searchChambres && (
                        <button onClick={() => setSearchChambres("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={openAddChambre}
                      disabled={hebergements.length === 0}
                      className="bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <BedDouble className="h-4 w-4" /> Ajouter une chambre
                    </button>
                  </div>
                </div>

                {hebergements.length === 0 && (
                  <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-100 text-yellow-700 text-sm flex items-center gap-2">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    Aucun hébergement trouvé — créez d'abord un hébergement pour pouvoir ajouter des chambres.
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50/70">
                        {["Hébergement", "N° Chambre", "Type", "Étage", "Capacité", "Superficie", "Prix / nuit", "Statut", "Actions"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingData ? (
                        <tr><td colSpan={9} className="px-5 py-10 text-center text-gray-400 text-sm">Chargement…</td></tr>
                      ) : pagedChambres.length === 0 ? (
                        <tr><td colSpan={9} className="px-5 py-10 text-center text-gray-400 text-sm">
                          {searchChambres ? `Aucune chambre pour « ${searchChambres} »` : "Aucune chambre enregistrée — cliquez sur « Ajouter une chambre »."}
                        </td></tr>
                      ) : pagedChambres.map((c) => (
                        <tr key={c.id} className={`hover:bg-blue-50/20 transition-colors ${!c.disponible ? "opacity-60" : ""}`}>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 text-gray-800 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                              <span className="truncate max-w-[130px]">{c.hebergementName}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-700 text-sm">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const imgs = (c.raw.images || []).filter(
                                  (u: any) => typeof u === "string" && u.startsWith("http") && !u.includes("localhost")
                                );
                                return imgs.length > 0 ? (
                                  <img
                                    src={imgs[0]}
                                    onClick={() => setImgViewer({ images: imgs, index: 0, titre: `Ch. ${c.numeroChambre} — ${c.typeLabel}` })}
                                    title={`Voir les ${imgs.length} photo(s)`}
                                    className="w-10 h-9 rounded object-cover cursor-pointer flex-shrink-0 border border-gray-100 hover:ring-2 hover:ring-blue-400 transition-all"
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                  />
                                ) : null;
                              })()}
                              <span>{c.numeroChambre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{c.typeLabel}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-sm text-center">{c.etage}</td>
                          <td className="px-4 py-3 text-gray-700 text-sm text-center">{c.capacite} pers.</td>
                          <td className="px-4 py-3 text-gray-500 text-sm">{c.superficie}</td>
                          <td className="px-4 py-3 text-blue-600 text-sm" style={{ fontWeight: 600 }}>
                            {c.prixParNuit.toLocaleString("fr-FR")} TND
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs ${c.disponible ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {c.disponible ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {c.disponible ? "Disponible" : "Indisponible"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openEditChambre(c.raw)}
                                className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                title="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleChambreAvailability(c.raw)}
                                className={`p-1.5 rounded-lg transition-colors ${c.disponible ? "hover:bg-yellow-50 text-yellow-600" : "hover:bg-green-50 text-green-600"}`}
                                title={c.disponible ? "Désactiver" : "Activer"}
                              >
                                {c.disponible ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteChambre(c.raw)}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={pageChambre} total={totalPagesChambre} onChange={setPageChambre} />
              </div>
            </div>
          )}

          {/* ══ HÉBERGEMENTS ══ */}
          {activePage === "hebergements" && (() => {
            const filteredHeb = hebergements.filter(h =>
              matchSearch(h.titre, searchHeb) ||
              matchSearch(h.localisation, searchHeb)
            );
            const HEB_PAGE_SIZE = 8;
            const totalPagesHeb = Math.max(1, Math.ceil(filteredHeb.length / HEB_PAGE_SIZE));
            const pagedHeb = filteredHeb.slice((pageHeb - 1) * HEB_PAGE_SIZE, pageHeb * HEB_PAGE_SIZE);
            // Emoji de repli selon le type d'hébergement (si aucune photo)
            const HEB_TYPE_EMOJI: Record<string, string> = {
              HOTEL: "🏨", APPARTEMENT: "🏢", VILLA: "🏡", AUBERGE: "🏚️",
              CAMPING: "⛺", RESORT: "🏖️", BUNGALOW: "🛖",
            };
            // Prix « à partir de » = prix/nuit le plus bas des chambres de l'hébergement
            const prixDepuisChambres = (h: any) => {
              const prix = chambres
                .filter((c: any) => String(c.hebergementID?._id ?? c.hebergementID) === String(h._id))
                .map((c: any) => c.prixParNuit)
                .filter((p: any) => typeof p === "number" && p > 0);
              return prix.length ? Math.min(...prix) : null;
            };
            return (
            <div className="space-y-6">
              {/* KPI */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total hébergements", value: hebergements.length, color: "bg-blue-600", icon: Building2 },
                  { label: "Disponibles", value: hebergements.filter(h => h.disponible !== false).length, color: "bg-green-600", icon: CheckCircle },
                  { label: "Indisponibles", value: hebergements.filter(h => h.disponible === false).length, color: "bg-red-500", icon: XCircle },
                  { label: "Chambres liées", value: chambres.length, color: "bg-purple-600", icon: BedDouble },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className={`w-10 h-10 ${kpi.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <kpi.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#0a1628]">{kpi.value}</p>
                      <p className="text-xs text-gray-500">{kpi.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un hébergement…"
                      value={searchHeb}
                      onChange={e => { setSearchHeb(e.target.value); setPageHeb(1); }}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={openAddHeb}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    <Building2 className="h-4 w-4" /> Ajouter un hébergement
                  </button>
                </div>

                {filteredHeb.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                    <p className="text-sm">Aucun hébergement trouvé</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/70">
                          {["Hébergement", "Service lié", "Type", "Prix / nuit", "Étoiles", "Statut", "Actions"].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pagedHeb.map(h => {
                          const linkedSvc = services.find(s => s._id === String(h.serviceID?._id ?? h.serviceID ?? ""));
                          return (
                          <tr key={h._id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-4 py-3">
                              {(() => {
                                const imgs = (h.images || []).filter(
                                  (u: any) => typeof u === "string" && u.startsWith("http") && !u.includes("localhost")
                                );
                                return (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-[#0a1628]">{h.titre}</p>
                                      {h.localisation && <p className="text-xs text-gray-400">{h.localisation}</p>}
                                    </div>
                                    {imgs.length > 0 ? (
                                      <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-[300px]">
                                        {imgs.map((src: string, i: number) => (
                                          <img
                                            key={i}
                                            src={src}
                                            alt={`${h.titre} ${i + 1}`}
                                            title={`${h.titre} — photo ${i + 1}/${imgs.length} (cliquer pour agrandir)`}
                                            onClick={() => setImgViewer({ images: imgs, index: i, titre: h.titre })}
                                            className="w-14 h-11 rounded-md object-cover flex-shrink-0 border border-gray-100 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="w-14 h-11 rounded-md bg-gray-100 flex items-center justify-center text-lg">
                                        {HEB_TYPE_EMOJI[h.type] ?? "🏨"}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3">
                              {linkedSvc ? (
                                <span className="text-sm text-gray-700">{linkedSvc.titre}</span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Non lié</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{h.type}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                              {(() => {
                                const pmin = prixDepuisChambres(h);
                                return pmin != null ? (
                                  <span>
                                    <span className="text-gray-400 text-xs">dès </span>
                                    {pmin.toLocaleString("fr-FR")} TND
                                    <span className="text-gray-400 text-xs">/nuit</span>
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-sm text-yellow-500">{"★".repeat(h.etoiles ?? 3)}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${h.disponible !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                {h.disponible !== false ? "Disponible" : "Indisponible"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => openEditHeb(h)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Modifier">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDeleteHeb(h._id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Supprimer">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pagination page={pageHeb} total={totalPagesHeb} onChange={setPageHeb} />
              </div>
            </div>
            );
          })()}

          {/* ══ DISPONIBILITÉS (A-06 FullCalendar) ══ */}
          {activePage === "disponibilites" && <DisponibilitesPage />}

          {/* ══ CAMPAGNES PROMOTIONNELLES (N-01/N-02) ══ */}
          {activePage === "campagnes" && <CampagnePage />}

          {/* ══ VIDEO PUB IA ══ */}
          {activePage === "video" && <VideoPublicitairePage hebergements={hebergements} toast={toast} />}

          {/* ══ CIRCUITS ══ */}
          {activePage === "circuits" && <CircuitsPage toast={toast} />}

          {/* ══ TRANSPORTS ══ */}
          {activePage === "transports" && <TransportsPage toast={toast} />}

          {/* ══ AGENTS IA ══ */}
          {activePage === "agents" && <AgentsPage />}

          {/* ══ HISTORIQUE ══ */}
          {activePage === "historique" && (() => {
            const events: { date: Date; icon: React.ElementType; color: string; title: string; sub: string }[] = [];
            reservations.forEach(r => {
              const d = new Date(r.createdAt ?? r.dateDebutSejour ?? Date.now());
              const client = r.clientID?.firstname ? `${r.clientID.firstname} ${r.clientID.lastname ?? ""}`.trim() : "Client";
              events.push({ date: d, icon: Calendar, color: "bg-blue-500", title: `Réservation créée`, sub: `${client} — ${r.offreID?.titre ?? "Offre"} (${(r.montantTotal ?? 0).toLocaleString("fr-FR")} TND)` });
              if (r.statut === "CONFIRMEE") events.push({ date: new Date(r.updatedAt ?? d), icon: CheckCircle, color: "bg-green-500", title: `Réservation confirmée`, sub: `${client} — ${r.offreID?.titre ?? "Offre"}` });
              if (r.statut === "ANNULEE") events.push({ date: new Date(r.updatedAt ?? d), icon: XCircle, color: "bg-red-500", title: `Réservation annulée`, sub: `${client} — ${r.offreID?.titre ?? "Offre"}` });
            });
            users.forEach(u => {
              const d = new Date(u.createdAt ?? Date.now());
              events.push({ date: d, icon: Users, color: "bg-purple-500", title: `Nouveau compte`, sub: `${u.firstname ?? ""} ${u.lastname ?? ""} (${u.email})` });
            });
            const sorted = events.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50);
            return (
            <div className="space-y-4">
              <div>
                <h3 className="text-[#0a1628] font-semibold text-base">Historique des actions</h3>
                <p className="text-gray-400 text-xs mt-0.5">Activité récente — réservations et inscriptions</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                {sorted.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <History className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                    <p className="text-sm">Aucune activité pour le moment</p>
                  </div>
                ) : (
                  <ol className="relative border-l border-gray-200 ml-3 space-y-6">
                    {sorted.map((ev, i) => (
                      <li key={i} className="ml-6">
                        <span className={`absolute -left-3.5 flex items-center justify-center w-7 h-7 rounded-full ${ev.color} ring-4 ring-white`}>
                          <ev.icon className="h-3.5 w-3.5 text-white" />
                        </span>
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <p className="text-sm font-semibold text-[#0a1628]">{ev.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{ev.sub}</p>
                          </div>
                          <time className="text-xs text-gray-400 flex-shrink-0">
                            {ev.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })} {ev.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
            );
          })()}

          {/* ══ RAPPORTS ══ */}
          {activePage === "rapports" && (
            <RapportsPage
              reservations={reservations}
              users={users}
              offres={offres}
              mappedReservations={mappedReservations}
              mappedUsers={mappedUsers}
              mappedOffres={mappedOffres}
              totalRevenu={totalRevenu}
              clientsActifs={clientsActifs}
              chartData={chartData}
            />
          )}

          {/* ══ SETTINGS ══ */}
          {activePage === "settings" && (
            <SettingsPage
              userId={user?.id ?? ""}
              userEmail={user?.email ?? ""}
              userPrenom={user?.prenom ?? ""}
              userNom={user?.nom ?? ""}
              onLogout={handleLogout}
              toast={toast}
            />
          )}

        </main>
      </div>

      {/* ══ MODAL CHAMBRE ══ */}
      {chambreModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#0a1628] rounded-xl flex items-center justify-center">
                  <BedDouble className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-[#080f1e]" style={{ fontWeight: 700 }}>
                  {chambreModal.mode === "add" ? "Ajouter une chambre" : "Modifier la chambre"}
                </h3>
              </div>
              <button
                onClick={() => setChambreModal({ open: false, mode: "add", chambre: null })}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitChambre} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {/* Hébergement */}
              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                  Hébergement <span className="text-red-500">*</span>
                </label>
                {hebergements.length === 0 ? (
                  <p className="text-yellow-600 text-sm bg-yellow-50 rounded-lg px-4 py-2">Aucun hébergement disponible.</p>
                ) : (
                  <select
                    value={chambreForm.hebergementID}
                    onChange={(e) => setChambreForm((f) => ({ ...f, hebergementID: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">— Choisir un hébergement —</option>
                    {hebergements.map((h) => (
                      <option key={h._id} value={h._id}>{h.titre ?? h._id}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* N° + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                    N° de chambre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={chambreForm.numeroChambre}
                    onChange={(e) => setChambreForm((f) => ({ ...f, numeroChambre: e.target.value }))}
                    required
                    placeholder="Ex : 101, A-12…"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={chambreForm.typeChambre}
                    onChange={(e) => setChambreForm((f) => ({ ...f, typeChambre: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {["SINGLE","DOUBLE","TWIN","SUITE","DELUXE","FAMILIALE"].map((t) => (
                      <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Capacité + Étage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                    Capacité (pers.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={chambreForm.capacite}
                    onChange={(e) => setChambreForm((f) => ({ ...f, capacite: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Étage</label>
                  <input
                    type="number"
                    min="0"
                    value={chambreForm.etage}
                    onChange={(e) => setChambreForm((f) => ({ ...f, etage: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Prix + Superficie */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                    Prix / nuit (TND) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={chambreForm.prixParNuit}
                      onChange={(e) => setChambreForm((f) => ({ ...f, prixParNuit: e.target.value }))}
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 pr-14 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">TND</span>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Superficie (m²)</label>
                  <input
                    type="number"
                    min="0"
                    value={chambreForm.superficie}
                    onChange={(e) => setChambreForm((f) => ({ ...f, superficie: e.target.value }))}
                    placeholder="Ex : 25"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Formule + Vue */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Formule</label>
                  <select
                    value={chambreForm.formule}
                    onChange={(e) => setChambreForm((f) => ({ ...f, formule: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {[["LOGEMENT_SEUL","Logement seul"],["DEMI_PENSION","Demi-pension"],["ALL_INCLUSIVE","All inclusive"]].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Vue</label>
                  <select
                    value={chambreForm.vue}
                    onChange={(e) => setChambreForm((f) => ({ ...f, vue: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {[["AUCUNE","Aucune"],["MER","Mer"],["JARDIN","Jardin"],["PISCINE","Piscine"],["VILLE","Ville"],["MONTAGNE","Montagne"]].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Description</label>
                <textarea
                  value={chambreForm.description}
                  onChange={(e) => setChambreForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Équipements, caractéristiques…"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Photos de la chambre</label>
                <ImageManager
                  images={chambreForm.images}
                  onChange={imgs => setChambreForm(f => ({ ...f, images: imgs }))}
                  type="chambre"
                  maxImages={6}
                />
              </div>

              {/* Disponible */}
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-gray-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  checked={chambreForm.disponible}
                  onChange={(e) => setChambreForm((f) => ({ ...f, disponible: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <div>
                  <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>Chambre disponible à la réservation</p>
                  <p className="text-gray-400 text-xs">Décochez pour bloquer temporairement cette chambre</p>
                </div>
              </label>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={savingChambre}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-xl text-sm transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  <Save className="h-4 w-4" />
                  {savingChambre ? "Enregistrement..." : chambreModal.mode === "add" ? "Créer la chambre" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => setChambreModal({ open: false, mode: "add", chambre: null })}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL HÉBERGEMENT ══ */}
      {hebModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-[#080f1e] font-bold">{hebModal.mode === "add" ? "Ajouter un hébergement" : "Modifier l'hébergement"}</h3>
              </div>
              <button onClick={() => setHebModal({ open: false, mode: "add", heb: null })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto" onSubmit={e => { e.preventDefault(); handleSaveHeb(); }}>
              {/* Service HEBERGEMENT lié */}
              {(() => {
                const hebServices = services.filter(s => s.typeService === "HEBERGEMENT");
                return (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Service hébergement lié</label>
                    {hebServices.length === 0 ? (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700">
                        <Package className="h-4 w-4 flex-shrink-0" />
                        Aucun service de type HÉBERGEMENT. Créez-en un dans l'espace «&nbsp;Services&nbsp;».
                      </div>
                    ) : (
                      <select
                        value={hebForm.serviceID}
                        onChange={e => setHebForm(f => ({ ...f, serviceID: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">— Aucun service lié —</option>
                        {hebServices.map(s => (
                          <option key={s._id} value={s._id}>
                            {s.titre}{s.localisation ? ` · ${s.localisation}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })()}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Titre *</label>
                <input required value={hebForm.titre} onChange={e => setHebForm(f => ({ ...f, titre: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Hôtel Palm Beach" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea value={hebForm.description} onChange={e => setHebForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Description de l'hébergement…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type *</label>
                  <select value={hebForm.type} onChange={e => setHebForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {HEB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Étoiles</label>
                  <select value={hebForm.etoiles} onChange={e => setHebForm(f => ({ ...f, etoiles: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {["1","2","3","4","5"].map(s => <option key={s} value={s}>{"★".repeat(Number(s))} ({s})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Localisation</label>
                <input value={hebForm.localisation} onChange={e => setHebForm(f => ({ ...f, localisation: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Tunis, Hammamet…" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Photos de l'hébergement</label>
                <ImageManager
                  images={hebForm.images}
                  onChange={imgs => setHebForm(f => ({ ...f, images: imgs }))}
                  type="hotel"
                  maxImages={10}
                />
              </div>

              {/* Téléphone + Site web */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Téléphone</label>
                  <input value={hebForm.telephone} onChange={e => setHebForm(f => ({ ...f, telephone: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+216 xx xxx xxx" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Site web</label>
                  <input type="url" value={hebForm.siteWeb} onChange={e => setHebForm(f => ({ ...f, siteWeb: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://…" />
                </div>
              </div>

              {/* Coordonnées GPS */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Coordonnées GPS (latitude / longitude)</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="any" value={hebForm.lat} onChange={e => setHebForm(f => ({ ...f, lat: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: 36.8189" />
                  <input type="number" step="any" value={hebForm.lng} onChange={e => setHebForm(f => ({ ...f, lng: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: 10.1658" />
                </div>
                <p className="text-gray-400 text-xs mt-1">Utilisez Google Maps pour obtenir les coordonnées précises</p>
              </div>

              {/* Disponible + Actif */}
              <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={hebForm.disponible} onChange={e => setHebForm(f => ({ ...f, disponible: e.target.checked }))} className="w-4 h-4 accent-blue-600 rounded" />
                  <span className="text-sm text-gray-700">Disponible</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={hebForm.actif} onChange={e => setHebForm(f => ({ ...f, actif: e.target.checked }))} className="w-4 h-4 accent-green-600 rounded" />
                  <span className="text-sm text-gray-700">Actif (visible sur le site)</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setHebModal({ open: false, mode: "add", heb: null })} className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={savingHeb} className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-sm disabled:opacity-50 transition-colors">
                  {savingHeb ? "Enregistrement…" : hebModal.mode === "add" ? "Créer" : "Mettre à jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL SERVICE ══ */}
      {serviceModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-[#080f1e] font-bold">{serviceModal.mode === "add" ? "Ajouter un service" : "Modifier le service"}</h3>
              </div>
              <button onClick={() => setServiceModal({ open: false, mode: "add", service: null })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto" onSubmit={e => { e.preventDefault(); handleSaveService(); }}>
              {/* Champs communs */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Titre *</label>
                <input required value={serviceForm.titre} onChange={e => setServiceForm(f => ({ ...f, titre: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Hôtel Palmier, Excursion Sahara…" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type de service *</label>
                <div className="grid grid-cols-3 gap-2">
                  {SERVICE_TYPES.map(t => {
                    const icons: Record<string,string> = { HEBERGEMENT: "🏨", DESTINATION: "✈️", ACTIVITE: "🧭" };
                    const active = serviceForm.typeService === t;
                    return (
                      <button key={t} type="button" onClick={() => setServiceForm(f => ({ ...f, typeService: t }))}
                        className={`px-2 py-2 rounded-xl text-xs font-medium border transition-colors ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                        {icons[t]} {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {serviceForm.typeService === "HEBERGEMENT" ? (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prix</label>
                    <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 leading-snug">
                      ℹ️ Le prix d'un hôtel provient de ses <strong>chambres</strong> (prix/nuit). Pas de prix de base à saisir.
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prix / personne (TND)</label>
                    <input type="number" min="0" value={serviceForm.prixBase} onChange={e => setServiceForm(f => ({ ...f, prixBase: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Catégorie</label>
                  <input value={serviceForm.categorie} onChange={e => setServiceForm(f => ({ ...f, categorie: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Luxe, Famille…" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Localisation</label>
                <input value={serviceForm.localisation} onChange={e => setServiceForm(f => ({ ...f, localisation: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Tunis, Djerba…" />
              </div>

              {/* ── Attributs HÉBERGEMENT ── */}
              {serviceForm.typeService === "HEBERGEMENT" && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">🏨 Attributs hébergement</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nombre de chambres</label>
                      <input type="number" min="0" value={serviceForm.nbChambres} onChange={e => setServiceForm(f => ({ ...f, nbChambres: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Ex: 50" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Adresse</label>
                      <input value={serviceForm.adresse} onChange={e => setServiceForm(f => ({ ...f, adresse: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Adresse complète" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Attributs DESTINATION ── */}
              {serviceForm.typeService === "DESTINATION" && (
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 space-y-3">
                  <p className="text-xs font-semibold text-purple-700 flex items-center gap-1">✈️ Attributs destination</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type de destination</label>
                      <input value={serviceForm.typeDestination} onChange={e => setServiceForm(f => ({ ...f, typeDestination: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Ex: Balnéaire, Culturel…" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Avis moyen (/ 5)</label>
                      <input type="number" min="0" max="5" step="0.1" value={serviceForm.avis} onChange={e => setServiceForm(f => ({ ...f, avis: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="4.5" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Attributs ACTIVITÉ ── */}
              {serviceForm.typeService === "ACTIVITE" && (
                <div className="rounded-xl border border-green-100 bg-green-50/40 p-4 space-y-3">
                  <p className="text-xs font-semibold text-green-700 flex items-center gap-1">🧭 Attributs activité</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type d'activité</label>
                      <input value={serviceForm.typeActivite} onChange={e => setServiceForm(f => ({ ...f, typeActivite: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Ex: Randonnée, Plongée…" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Durée</label>
                      <input value={serviceForm.duree} onChange={e => setServiceForm(f => ({ ...f, duree: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Ex: 3h, 2 jours…" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setServiceModal({ open: false, mode: "add", service: null })} className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={savingService} className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-sm disabled:opacity-50 transition-colors">
                  {savingService ? "Enregistrement…" : serviceModal.mode === "add" ? "Créer" : "Mettre à jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL OFFRE ══ */}
      {offreModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* En-tête */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Plane className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-[#080f1e]" style={{ fontWeight: 700 }}>
                  {offreModal.mode === "add" ? "Ajouter une offre" : "Modifier l'offre"}
                </h3>
              </div>
              <button
                onClick={() => setOffreModal({ open: false, mode: "add", offre: null })}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmitOffre} className="px-6 py-5 space-y-4">

              {/* Service lié */}
              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                  Service lié <span className="text-red-500">*</span>
                </label>
                {services.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                    <Package className="h-4 w-4 flex-shrink-0" />
                    Aucun service disponible. Créez d'abord un service dans l'espace «&nbsp;Services&nbsp;».
                  </div>
                ) : (
                  <select
                    value={offreForm.serviceID}
                    onChange={e => setOffreForm(f => ({ ...f, serviceID: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">— Choisir un service —</option>
                    {services.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.titre} ({s.typeService})
                      </option>
                    ))}
                  </select>
                )}
                {offreForm.serviceID && (() => {
                  const sel = services.find(s => s._id === offreForm.serviceID);
                  if (!sel) return null;
                  const typeCss: Record<string, string> = { HEBERGEMENT: "bg-blue-50 text-blue-700 border-blue-100", DESTINATION: "bg-purple-50 text-purple-700 border-purple-100", ACTIVITE: "bg-green-50 text-green-700 border-green-100" };
                  return (
                    <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${typeCss[sel.typeService] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
                      <Package className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-medium">{sel.typeService}</span>
                      {sel.localisation && <span className="text-xs opacity-70">· {sel.localisation}</span>}
                      {sel.prixBase ? <span className="ml-auto opacity-70">{sel.prixBase} TND</span> : null}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                  Titre de l'offre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={offreForm.titre}
                  onChange={e => setOffreForm(f => ({ ...f, titre: e.target.value }))}
                  required
                  placeholder="Ex : Offre Hôtel Kasbah 3 nuits"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                  Description courte
                </label>
                <textarea
                  value={offreForm.descriptionCourte}
                  onChange={e => setOffreForm(f => ({ ...f, descriptionCourte: e.target.value }))}
                  rows={3}
                  placeholder="Brève description de l'offre..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                  Prix à partir de (TND) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={offreForm.prixAPartirDe}
                    onChange={e => setOffreForm(f => ({ ...f, prixAPartirDe: e.target.value }))}
                    required
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 pr-14 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">TND</span>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingOffre}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-xl text-sm transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  <Save className="h-4 w-4" />
                  {savingOffre ? "Enregistrement..." : offreModal.mode === "add" ? "Ajouter" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => setOffreModal({ open: false, mode: "add", offre: null })}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Co-pilote IA flottant */}
      <AdminCopilot />

      {/* ── Visionneuse d'images globale (hébergements, chambres…) ── */}
      {imgViewer && (
        <div
          className="fixed inset-0 z-[90] bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setImgViewer(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <span className="text-white/70 text-sm">{imgViewer.index + 1} / {imgViewer.images.length}</span>
            <button onClick={() => setImgViewer(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-white font-semibold mb-3">{imgViewer.titre}</p>
          <div className="relative max-w-4xl w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {imgViewer.images.length > 1 && (
              <button
                onClick={() => setImgViewer(v => v && { ...v, index: (v.index - 1 + v.images.length) % v.images.length })}
                className="absolute left-2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <img
              src={imgViewer.images[imgViewer.index]}
              alt={imgViewer.titre}
              className="max-h-[78vh] max-w-full rounded-xl object-contain"
            />
            {imgViewer.images.length > 1 && (
              <button
                onClick={() => setImgViewer(v => v && { ...v, index: (v.index + 1) % v.images.length })}
                className="absolute right-2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>
          {imgViewer.images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto max-w-full pb-1" onClick={e => e.stopPropagation()}>
              {imgViewer.images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  onClick={() => setImgViewer(v => v && { ...v, index: i })}
                  className={`w-16 h-12 rounded-md object-cover cursor-pointer flex-shrink-0 border-2 transition-all ${i === imgViewer.index ? "border-blue-400" : "border-transparent opacity-50 hover:opacity-100"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
