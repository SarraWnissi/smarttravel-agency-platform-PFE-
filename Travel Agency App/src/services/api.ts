export const BASE_URL = "http://localhost:3001";

/**
 * Réécrit une URL d'image externe vers le proxy backend (contourne le hotlink
 * des CDN d'hôtels). Laisse inchangées les data:, les chemins relatifs et les
 * URLs déjà proxifiées.
 */
export function proxyImage(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/")) return `${BASE_URL}${url}`;
  if (url.startsWith("/")) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  if (url.includes("/api/image-proxy")) return url;
  return `${BASE_URL}/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export const getToken = () => localStorage.getItem("st_token");
export const setToken = (token: string) => localStorage.setItem("st_token", token);
export const removeToken = () => localStorage.removeItem("st_token");

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erreur serveur");
  return data as T;
}

export const authAPI = {
  login: (email: string, password: string) =>
    request<{ user: any; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (data: {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
  }) =>
    request<{ message: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  verifyEmail: (token: string) =>
    request<{ message: string }>(`/api/auth/verify/${token}`),
  resendVerification: (email: string) =>
    request<{ message: string }>("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};

export const campagnesAPI = {
  // Lance la promo IA (agent Llama + Serper) pour un ou plusieurs hôtels
  // → un seul email groupé envoyé à tous les clients
  promoIA: (data: { hotelIds: string[]; reduction?: number; details?: string }) =>
    request<{ message: string; n8nStatus: string }>("/api/campagnes/promo-ia", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const usersAPI = {
  getAll: () => request<any[]>("/api/users"),
  update: (id: string, data: any) =>
    request<any>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => request<any>(`/api/users/${id}`, { method: "DELETE" }),
  toggleStatus: (email: string) =>
    request<any>(`/api/users/status/edit?email=${encodeURIComponent(email)}`),
};

export const offresAPI = {
  getAll: () => request<any[]>("/api/offres"),
  create: (data: any) =>
    request<any>("/api/offres", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/api/offres/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/offres/${id}`, { method: "DELETE" }),
};

export const reservationsAPI = {
  getAll: () => request<any[]>("/api/reservations"),
  create: (data: any) =>
    request<any>("/api/reservations", { method: "POST", body: JSON.stringify(data) }),
  confirm: (id: string) =>
    request<any>(`/api/reservations/${id}/confirm`, { method: "PUT" }),
  cancel: (id: string) =>
    request<any>(`/api/reservations/${id}/cancel`, { method: "PUT" }),
  delete: (id: string) =>
    request<any>(`/api/reservations/${id}`, { method: "DELETE" }),
};

export const servicesAPI = {
  getAll: () => request<any[]>("/api/services"),
  create: (data: any) => request<any>("/api/services", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/services/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/services/${id}`, { method: "DELETE" }),
};

export const hebergementsAPI = {
  getAll: () => request<any[]>("/api/hebergements"),
  getById: (id: string) => request<any>(`/api/hebergements/${id}`),
  getChambres: (id: string) => request<any[]>(`/api/hebergements/${id}/chambres`),
  getDisponibilite: (id: string, queryString: string) =>
    request<any[]>(`/api/hebergements/${id}/disponibilite?${queryString}`),
  search: (queryString: string) =>
    request<any[]>(`/api/hebergements/search?${queryString}`),
  create: (data: any) => request<any>("/api/hebergements", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/hebergements/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/hebergements/${id}`, { method: "DELETE" }),
};

export const facturesAPI = {
  getAll: () => request<any[]>("/api/factures"),
};

export const confirmerStripeLocal = (data: { reservationID: string; sessionId?: string }) =>
  request<{ success: boolean; paiement: any; facture: any }>("/api/paiement/confirmer-stripe-local", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const paiementAPI = {
  create: (data: { reservationID: string; methodePaiement: string; transactionId?: string }) =>
    request<any>("/api/paiements", { method: "POST", body: JSON.stringify(data) }),
  accept: (id: string) => request<any>(`/api/paiements/${id}/accept`, { method: "PUT" }),
  refuse: (id: string) => request<any>(`/api/paiements/${id}/refuse`, { method: "PUT" }),
};

// Routes sans authentification (visiteurs guest)
async function publicRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw { response: { data }, message: data.message || "Erreur serveur" };
  return data as T;
}

export const guestAPI = {
  createReservation: (data: {
    guestNom: string;
    guestPrenom: string;
    guestEmail: string;
    guestTelephone?: string;
    chambreID: string;
    hebergementID: string;
    dateDebutSejour: string;
    dateFinSejour: string;
    nbPersonnes: number;
    agesEnfants?: number[];
    formule?: string;
  }) =>
    publicRequest<{ reservation: any; message: string }>("/api/guest/reservation", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getReservation: (id: string, email: string) =>
    publicRequest<any>(`/api/guest/reservation/${id}?email=${encodeURIComponent(email)}`),

  createStripeIntent: (data: { reservationID: string; guestEmail: string }) =>
    publicRequest<{ checkoutUrl: string; montant: number }>("/api/guest/stripe/create-intent", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Paiement carte groupé (plusieurs chambres) — une seule session Stripe
  createStripeIntentGroup: (data: { reservationIDs: string[]; guestEmail?: string }) =>
    publicRequest<{ checkoutUrl: string; montant: number }>("/api/guest/stripe/create-intent-group", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  paiementSimple: (data: { reservationID: string; methode: string }) =>
    publicRequest<{ success: boolean; message: string; methode: string; paiementID: string; factureNumero: string }>("/api/guest/paiement-simple", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  confirmStripe: (data: { reservationID: string; sessionId?: string; guestEmail?: string }) =>
    publicRequest<{ success: boolean; paiement: any; facture: any; alreadyConfirmed?: boolean }>("/api/guest/stripe/confirm", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const chambresAPI = {
  getAll: () => request<any[]>("/api/chambres"),
  create: (data: any) =>
    request<any>("/api/chambres", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/api/chambres/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  toggleAvailability: (id: string, disponible: boolean) =>
    request<any>(`/api/chambres/${id}/availability`, { method: "PATCH", body: JSON.stringify({ disponible }) }),
  delete: (id: string) => request<any>(`/api/chambres/${id}`, { method: "DELETE" }),
};

export const circuitsAPI = {
  getAll: () => request<any[]>("/api/circuits"),
  create: (data: any) => request<any>("/api/circuits", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/circuits/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/circuits/${id}`, { method: "DELETE" }),
};

export const transportsAPI = {
  getAll: () => request<any[]>("/api/transports"),
  create: (data: any) => request<any>("/api/transports", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/transports/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/transports/${id}`, { method: "DELETE" }),
};

export const avisAPI = {
  getAll: () => request<any[]>("/api/avis"),
  create: (data: { reservationID: string; note: number; commentaire?: string }) =>
    request<any>("/api/avis", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/avis/${id}`, { method: "DELETE" }),
};

export const preferencesAPI = {
  get: () => request<any | null>("/api/preferences"),
  save: (data: any) =>
    request<any>("/api/preferences", { method: "POST", body: JSON.stringify(data) }),
};


export const aiAPI = {
  getRecommandations: () => request<{ recommandations: any[]; source: string }>("/api/ai/recommandations"),
  chat: (message: string, historique: { role: string; content: string }[] = []) =>
    request<{ reply: string; source: string }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, historique_chat: historique }),
    }),
  reservationIntent: (message: string) =>
    request<{ intent: string; reply: string; suggestions?: any[]; hotels?: any[]; extractedData: any }>("/api/ai/reservation-intent", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  getAgentsStatus: () => request<any>("/api/ai/agents/status"),
  // Assistant IA public (visiteurs + clients) basé sur la base de données
  assistant: (message: string, historique: { role: string; content: string }[] = []) =>
    publicRequest<{ reply: string; hotels?: any[]; source: string }>("/api/ai/assistant", {
      method: "POST",
      body: JSON.stringify({ message, historique_chat: historique }),
    }),
  // Co-pilote Admin IA (ADMIN) — actions réelles sur la base
  adminAssistant: (message: string) =>
    request<{ reply: string; action: string }>("/api/ai/admin-assistant", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

export function mapStatut(backendStatut: string): string {
  const map: Record<string, string> = {
    EN_ATTENTE_PAIEMENT: "En attente",
    CONFIRMEE: "Confirmée",
    ANNULEE: "Annulée",
    EXPIREE: "Terminée",
  };
  return map[backendStatut] ?? backendStatut;
}

export function mapEtatCompte(etat: string): string {
  const map: Record<string, string> = {
    ACTIF: "Actif",
    SUSPENDU: "Suspendu",
    SUPPRIME: "Supprimé",
  };
  return map[etat] ?? etat;
}
