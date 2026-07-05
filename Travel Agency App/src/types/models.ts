// ============================================================
// SmartTravel Agency - Modèles de données (TypeScript Interfaces)
// Compatible avec le diagramme de classes UML SmartTravel
// ============================================================

// ==================== ENUMS ====================

export enum EtatCompte {
  ACTIF = "ACTIF",
  SUSPENDU = "SUSPENDU",
  SUPPRIME = "SUPPRIME",
}

export enum StatutReservation {
  EN_ATTENTE_PAIEMENT = "EN_ATTENTE_PAIEMENT",
  CONFIRMEE = "CONFIRMEE",
  ANNULEE = "ANNULEE",
  EXPIREE = "EXPIREE",
}

export enum StatutPaiement {
  EN_COURS = "EN_COURS",
  ACCEPTE = "ACCEPTE",
  REFUSE = "REFUSE",
}

// ==================== UTILISATEUR ====================

export interface IUtilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  motDePasseHash: string;
  dateCreation: Date;
  etatCompte: EtatCompte;
}

export interface IClient extends IUtilisateur {
  telephone: string;
  adresseFacturation: string;
}

export interface IAdministrateur extends IUtilisateur {
  roleAdmin: string;
}

// ==================== SERVICE (abstract) ====================

export interface IService {
  id: number;
  titre: string;
  description: string;
  prixBase: number;
  devise: string;
  localisation: string;
}

export interface IHebergement extends IService {
  categorie: string;
  adresse: string;
  nbChambres: number;
  prix: string;
}

export interface IDestination extends IService {
  typeDestination: string;
  description: string;
  avis: number; // note moyenne (float)
}

export interface IActivite extends IService {
  typeActivite: string;
  description: string;
  duree: string;
  prix: string;
}

// ==================== OFFRE ====================

export interface IOffre {
  id: number;
  titre: string;
  descriptionCourte: string;
  prixAPartirDe: number;
  serviceId: number; // relation vers IService
}

// ==================== RESERVATION (abstract) ====================

export interface IReservation {
  id: number;
  clientId: number; // relation vers IClient
  offreId: number;  // relation vers IOffre
  dateCreation: Date;
  dateDebutSejour: Date;
  dateFinSejour: Date;
  nbPersonnes: number;
  statut: StatutReservation;
  montantTotal: number;
}

export interface ITypeReservation {
  id: number;
  libelle: string;
}

export interface IReservationHotel extends IReservation {
  pension: string;
  nbNuits: number;
  chambres: IChambre[]; // relation 1..* vers Chambre
}

export interface IReservationExcursion extends IReservation {
  dateExcursion: Date;
  dureeHeures: number;
}

export interface IReservationInternationale extends IReservation {
  numPassport: string;
  visa: string;
  paysDestination: string;
}

// ==================== AVIS ====================

export interface IAvis {
  id: number;
  clientId: number;      // relation vers IClient
  destinationId: number; // relation vers IDestination
  note: number;          // entier (1-5)
  commentaire: string;
  dateAvis: Date;
}

// ==================== CHAMBRE ====================

export interface ITypeChambre {
  id: number;
  libelle: string;
  description: string;
}

export interface ITarif {
  id: number;
  typeChambreId: number;        // relation vers ITypeChambre
  typeReservationId: number;    // relation vers ITypeReservation
  prixNuit: number;
  dateDebut: Date;
  dateFin: Date;
}

export interface IChambre {
  id: number;
  typeChambreId: number; // relation vers ITypeChambre
  numeroChambre: string;
  etage: number;
  capacite: number;
  superficie: number;
  disponible: boolean;
  tarifs?: ITarif[];     // relation vers Tarif
}

// ==================== PAIEMENT ====================

export interface IPaiement {
  id: number;
  reservationId: number; // relation vers IReservation
  methodePaiement: string;
  transactionId: string;
  montant: number;
  datePaiement: Date;
  statut: StatutPaiement;
}

// ==================== FACTURE ====================

export interface IFacture {
  id: number;
  paiementId: number;    // relation vers IPaiement
  clientId: number;      // relation vers IClient
  numeroFacture: string;
  dateEmission: Date;
  montantHT: number;
  montantTTC: number;
}

// ==================== TYPES UTILITAIRES ====================

/** Union des 3 types de réservation */
export type Reservation =
  | IReservationHotel
  | IReservationExcursion
  | IReservationInternationale;

/** Union des 3 types de service */
export type Service = IHebergement | IDestination | IActivite;

/** Réponse paginée générique */
export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Résultat d'une opération CRUD */
export interface IOperationResult<T = void> {
  success: boolean;
  message?: string;
  data?: T;
}

// ==================== DONNÉES MOCK ====================

export const mockClients: IClient[] = [
  {
    id: 1,
    nom: "Martin",
    prenom: "Sophie",
    email: "sophie.martin@email.com",
    motDePasseHash: "$2b$10$hashexample1",
    dateCreation: new Date("2024-01-15"),
    etatCompte: EtatCompte.ACTIF,
    telephone: "+33 6 12 34 56 78",
    adresseFacturation: "12 rue de la Paix, 75001 Paris",
  },
  {
    id: 2,
    nom: "Dupont",
    prenom: "Jean",
    email: "jean.dupont@email.com",
    motDePasseHash: "$2b$10$hashexample2",
    dateCreation: new Date("2024-02-20"),
    etatCompte: EtatCompte.ACTIF,
    telephone: "+33 6 98 76 54 32",
    adresseFacturation: "45 avenue des Fleurs, 69002 Lyon",
  },
  {
    id: 3,
    nom: "Bernard",
    prenom: "Marie",
    email: "marie.bernard@email.com",
    motDePasseHash: "$2b$10$hashexample3",
    dateCreation: new Date("2024-03-10"),
    etatCompte: EtatCompte.SUSPENDU,
    telephone: "+33 6 55 44 33 22",
    adresseFacturation: "8 boulevard Victor Hugo, 13001 Marseille",
  },
];

export const mockAdministrateurs: IAdministrateur[] = [
  {
    id: 101,
    nom: "Admin",
    prenom: "Super",
    email: "admin@smarttravel.com",
    motDePasseHash: "$2b$10$adminhash1",
    dateCreation: new Date("2023-01-01"),
    etatCompte: EtatCompte.ACTIF,
    roleAdmin: "SUPER_ADMIN",
  },
  {
    id: 102,
    nom: "Gérant",
    prenom: "Paul",
    email: "paul.gerant@smarttravel.com",
    motDePasseHash: "$2b$10$adminhash2",
    dateCreation: new Date("2023-06-15"),
    etatCompte: EtatCompte.ACTIF,
    roleAdmin: "GESTIONNAIRE",
  },
];

export const mockDestinations: IDestination[] = [
  {
    id: 1,
    titre: "Bali, Indonésie",
    description: "Île des dieux aux temples millénaires et rizières en terrasses",
    typeDestination: "Île tropicale",
    prixBase: 1299,
    devise: "EUR",
    localisation: "Bali, Indonésie",
    avis: 4.8,
  },
  {
    id: 2,
    titre: "Marrakech, Maroc",
    description: "Cité impériale aux souks colorés et palais somptueux",
    typeDestination: "Ville culturelle",
    prixBase: 799,
    devise: "EUR",
    localisation: "Marrakech, Maroc",
    avis: 4.6,
  },
  {
    id: 3,
    titre: "Maldives",
    description: "Paradis de sable blanc et lagons turquoise",
    typeDestination: "Île tropicale",
    prixBase: 2499,
    devise: "EUR",
    localisation: "Maldives, Océan Indien",
    avis: 4.9,
  },
  {
    id: 4,
    titre: "Kyoto, Japon",
    description: "Ancienne capitale impériale aux temples et jardins zen",
    typeDestination: "Ville historique",
    prixBase: 1899,
    devise: "EUR",
    localisation: "Kyoto, Japon",
    avis: 4.7,
  },
];

export const mockHebergements: IHebergement[] = [
  {
    id: 1,
    titre: "Hôtel Bali Paradise Resort",
    description: "Resort de luxe avec piscine à débordement et spa",
    categorie: "Resort 5 étoiles",
    adresse: "Jl. Raya Seminyak, Bali",
    nbChambres: 120,
    prix: "À partir de 180€/nuit",
    prixBase: 180,
    devise: "EUR",
    localisation: "Seminyak, Bali",
  },
  {
    id: 2,
    titre: "Riad La Sultana",
    description: "Riad traditionnel au cœur de la médina de Marrakech",
    categorie: "Riad 4 étoiles",
    adresse: "Rue de la Kasbah, Médina, Marrakech",
    nbChambres: 28,
    prix: "À partir de 120€/nuit",
    prixBase: 120,
    devise: "EUR",
    localisation: "Médina, Marrakech",
  },
  {
    id: 3,
    titre: "Overwater Bungalow Maldives",
    description: "Bungalow sur pilotis avec vue directe sur le lagon",
    categorie: "Bungalow 5 étoiles",
    adresse: "North Malé Atoll, Maldives",
    nbChambres: 40,
    prix: "À partir de 450€/nuit",
    prixBase: 450,
    devise: "EUR",
    localisation: "North Malé Atoll, Maldives",
  },
];

export const mockActivites: IActivite[] = [
  {
    id: 1,
    titre: "Cours de surf à Seminyak",
    description: "Initiation au surf avec moniteur professionnel sur la plage de Seminyak",
    typeActivite: "Sport nautique",
    duree: "3h",
    prix: "45€/personne",
    prixBase: 45,
    devise: "EUR",
    localisation: "Seminyak, Bali",
  },
  {
    id: 2,
    titre: "Visite guidée des souks",
    description: "Tour des souks de Marrakech avec guide local francophone",
    typeActivite: "Culture",
    duree: "4h",
    prix: "30€/personne",
    prixBase: 30,
    devise: "EUR",
    localisation: "Médina, Marrakech",
  },
  {
    id: 3,
    titre: "Plongée sous-marine",
    description: "Exploration des récifs coralliens des Maldives",
    typeActivite: "Sport nautique",
    duree: "2h30",
    prix: "85€/personne",
    prixBase: 85,
    devise: "EUR",
    localisation: "North Malé Atoll, Maldives",
  },
  {
    id: 4,
    titre: "Cérémonie du thé à Kyoto",
    description: "Découverte authentique du rituel japonais du thé en maison de thé traditionnelle",
    typeActivite: "Culture",
    duree: "2h",
    prix: "60€/personne",
    prixBase: 60,
    devise: "EUR",
    localisation: "Kyoto, Japon",
  },
];

export const mockOffres: IOffre[] = [
  {
    id: 1,
    titre: "Escapade à Bali",
    descriptionCourte: "7 nuits en resort 5★ avec excursions incluses",
    prixAPartirDe: 1299,
    serviceId: 1,
  },
  {
    id: 2,
    titre: "Magie de Marrakech",
    descriptionCourte: "5 nuits en riad, visites et hammam",
    prixAPartirDe: 799,
    serviceId: 2,
  },
  {
    id: 3,
    titre: "Maldives Prestige",
    descriptionCourte: "10 nuits en bungalow sur l'eau, all inclusive",
    prixAPartirDe: 2499,
    serviceId: 3,
  },
  {
    id: 4,
    titre: "Japon Éternel",
    descriptionCourte: "12 jours entre Tokyo, Kyoto et Osaka",
    prixAPartirDe: 1899,
    serviceId: 4,
  },
];

export const mockTypeChambres: ITypeChambre[] = [
  { id: 1, libelle: "Standard", description: "Chambre standard avec vue jardin" },
  { id: 2, libelle: "Supérieure", description: "Chambre supérieure avec vue piscine" },
  { id: 3, libelle: "Suite", description: "Suite luxueuse avec salon séparé" },
  { id: 4, libelle: "Bungalow", description: "Bungalow sur pilotis avec accès direct à l'eau" },
];

export const mockChambres: IChambre[] = [
  {
    id: 1,
    typeChambreId: 1,
    numeroChambre: "101",
    etage: 1,
    capacite: 2,
    superficie: 28,
    disponible: true,
  },
  {
    id: 2,
    typeChambreId: 2,
    numeroChambre: "205",
    etage: 2,
    capacite: 2,
    superficie: 36,
    disponible: true,
  },
  {
    id: 3,
    typeChambreId: 3,
    numeroChambre: "310",
    etage: 3,
    capacite: 4,
    superficie: 75,
    disponible: false,
  },
  {
    id: 4,
    typeChambreId: 4,
    numeroChambre: "BG-07",
    etage: 0,
    capacite: 2,
    superficie: 55,
    disponible: true,
  },
];

export const mockTarifs: ITarif[] = [
  {
    id: 1,
    typeChambreId: 1,
    typeReservationId: 1,
    prixNuit: 120,
    dateDebut: new Date("2025-01-01"),
    dateFin: new Date("2025-12-31"),
  },
  {
    id: 2,
    typeChambreId: 2,
    typeReservationId: 1,
    prixNuit: 180,
    dateDebut: new Date("2025-01-01"),
    dateFin: new Date("2025-12-31"),
  },
  {
    id: 3,
    typeChambreId: 3,
    typeReservationId: 2,
    prixNuit: 350,
    dateDebut: new Date("2025-01-01"),
    dateFin: new Date("2025-12-31"),
  },
  {
    id: 4,
    typeChambreId: 4,
    typeReservationId: 2,
    prixNuit: 450,
    dateDebut: new Date("2025-06-01"),
    dateFin: new Date("2025-09-30"),
  },
];

export const mockReservationsHotel: IReservationHotel[] = [
  {
    id: 1,
    clientId: 1,
    offreId: 1,
    dateCreation: new Date("2025-03-10"),
    dateDebutSejour: new Date("2025-07-15"),
    dateFinSejour: new Date("2025-07-22"),
    nbPersonnes: 2,
    statut: StatutReservation.CONFIRMEE,
    montantTotal: 1899,
    pension: "Petit-déjeuner inclus",
    nbNuits: 7,
    chambres: [mockChambres[1]],
  },
  {
    id: 2,
    clientId: 2,
    offreId: 3,
    dateCreation: new Date("2025-04-02"),
    dateDebutSejour: new Date("2025-08-01"),
    dateFinSejour: new Date("2025-08-11"),
    nbPersonnes: 2,
    statut: StatutReservation.EN_ATTENTE_PAIEMENT,
    montantTotal: 4950,
    pension: "All Inclusive",
    nbNuits: 10,
    chambres: [mockChambres[3]],
  },
];

export const mockReservationsExcursion: IReservationExcursion[] = [
  {
    id: 3,
    clientId: 1,
    offreId: 1,
    dateCreation: new Date("2025-03-15"),
    dateDebutSejour: new Date("2025-07-18"),
    dateFinSejour: new Date("2025-07-18"),
    nbPersonnes: 2,
    statut: StatutReservation.CONFIRMEE,
    montantTotal: 90,
    dateExcursion: new Date("2025-07-18"),
    dureeHeures: 3,
  },
];

export const mockReservationsInternationales: IReservationInternationale[] = [
  {
    id: 4,
    clientId: 3,
    offreId: 4,
    dateCreation: new Date("2025-02-28"),
    dateDebutSejour: new Date("2025-10-01"),
    dateFinSejour: new Date("2025-10-13"),
    nbPersonnes: 1,
    statut: StatutReservation.CONFIRMEE,
    montantTotal: 1899,
    numPassport: "FR12345678",
    visa: "Visa touriste",
    paysDestination: "Japon",
  },
];

export const mockPaiements: IPaiement[] = [
  {
    id: 1,
    reservationId: 1,
    methodePaiement: "Carte bancaire",
    transactionId: "TXN-2025-001",
    montant: 1899,
    datePaiement: new Date("2025-03-10"),
    statut: StatutPaiement.ACCEPTE,
  },
  {
    id: 2,
    reservationId: 3,
    methodePaiement: "PayPal",
    transactionId: "TXN-2025-002",
    montant: 90,
    datePaiement: new Date("2025-03-15"),
    statut: StatutPaiement.ACCEPTE,
  },
  {
    id: 3,
    reservationId: 4,
    methodePaiement: "Virement bancaire",
    transactionId: "TXN-2025-003",
    montant: 1899,
    datePaiement: new Date("2025-03-01"),
    statut: StatutPaiement.ACCEPTE,
  },
];

export const mockFactures: IFacture[] = [
  {
    id: 1,
    paiementId: 1,
    clientId: 1,
    numeroFacture: "FAC-2025-001",
    dateEmission: new Date("2025-03-10"),
    montantHT: 1582.5,
    montantTTC: 1899,
  },
  {
    id: 2,
    paiementId: 2,
    clientId: 1,
    numeroFacture: "FAC-2025-002",
    dateEmission: new Date("2025-03-15"),
    montantHT: 75,
    montantTTC: 90,
  },
  {
    id: 3,
    paiementId: 3,
    clientId: 3,
    numeroFacture: "FAC-2025-003",
    dateEmission: new Date("2025-03-01"),
    montantHT: 1582.5,
    montantTTC: 1899,
  },
];

export const mockAvis: IAvis[] = [
  {
    id: 1,
    clientId: 1,
    destinationId: 1,
    note: 5,
    commentaire: "Séjour absolument magique à Bali ! Tout était parfait, je recommande vivement.",
    dateAvis: new Date("2025-08-25"),
  },
  {
    id: 2,
    clientId: 2,
    destinationId: 2,
    note: 4,
    commentaire: "Marrakech est une ville incroyable, riche en couleurs et en saveurs.",
    dateAvis: new Date("2025-05-18"),
  },
  {
    id: 3,
    clientId: 3,
    destinationId: 4,
    note: 5,
    commentaire: "Le Japon est un pays à part, une expérience inoubliable !",
    dateAvis: new Date("2025-10-20"),
  },
];

// ==================== HELPERS TYPES ====================

/**
 * Vérifie si une réservation est une ReservationHotel
 */
export function isReservationHotel(r: Reservation): r is IReservationHotel {
  return "nbNuits" in r && "pension" in r;
}

/**
 * Vérifie si une réservation est une ReservationExcursion
 */
export function isReservationExcursion(r: Reservation): r is IReservationExcursion {
  return "dateExcursion" in r && "dureeHeures" in r;
}

/**
 * Vérifie si une réservation est une ReservationInternationale
 */
export function isReservationInternationale(r: Reservation): r is IReservationInternationale {
  return "numPassport" in r && "paysDestination" in r;
}

/**
 * Libellé lisible pour le statut d'une réservation
 */
export function getStatutReservationLabel(statut: StatutReservation): string {
  const labels: Record<StatutReservation, string> = {
    [StatutReservation.EN_ATTENTE_PAIEMENT]: "En attente de paiement",
    [StatutReservation.CONFIRMEE]: "Confirmée",
    [StatutReservation.ANNULEE]: "Annulée",
    [StatutReservation.EXPIREE]: "Expirée",
  };
  return labels[statut];
}

/**
 * Libellé lisible pour le statut d'un paiement
 */
export function getStatutPaiementLabel(statut: StatutPaiement): string {
  const labels: Record<StatutPaiement, string> = {
    [StatutPaiement.EN_COURS]: "En cours",
    [StatutPaiement.ACCEPTE]: "Accepté",
    [StatutPaiement.REFUSE]: "Refusé",
  };
  return labels[statut];
}

/**
 * Libellé lisible pour l'état d'un compte
 */
export function getEtatCompteLabel(etat: EtatCompte): string {
  const labels: Record<EtatCompte, string> = {
    [EtatCompte.ACTIF]: "Actif",
    [EtatCompte.SUSPENDU]: "Suspendu",
    [EtatCompte.SUPPRIME]: "Supprimé",
  };
  return labels[etat];
}
