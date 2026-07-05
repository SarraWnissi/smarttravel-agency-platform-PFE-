import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "fr" | "en";

const translations = {
  fr: {
    // ── Nav ──
    nav_home: "Accueil",
    nav_hotels: "Hôtels",
    nav_offers: "Offres",
    nav_destinations: "Destinations",
    nav_contact: "Contact",
    login: "Se connecter",
    register: "S'inscrire",
    logout: "Se déconnecter",
    my_space: "Mon espace",
    my_profile: "Mon profil",
    connected_as: "Connecté en tant que",
    administrator: "Administrateur",
    client: "Client",
    favorites: "Mes favoris",

    // ── Hero ──
    hero_title: "Explorez le monde avec SmartTravel",
    hero_subtitle: "Réservez hôtels et expériences de voyage facilement",
    search_placeholder: "Destination",
    search_persons: "Personnes",
    search_btn: "Rechercher",

    // ── Sections Home ──
    popular_dest: "Destinations Populaires",
    popular_desc: "Découvrez nos offres de voyages les plus demandées",
    from: "À partir de",
    per_person: "/ personne",
    see_offers: "Voir les offres",
    special_offers: "Offres Spéciales",
    special_offers_desc: "Profitez de nos meilleures promotions et réductions exclusives",
    no_offers: "Aucune offre disponible pour le moment.",
    discover: "Découvrir",
    testimonials: "Ce que disent nos clients",
    testimonials_desc: "Des milliers de voyageurs satisfaits à travers le monde",
    no_reviews: "Aucun avis pour le moment.",
    book_share: "Réservez un voyage et partagez votre expérience !",
    chatbot_greeting: "Bonjour ! Je suis l'assistant SmartTravel. Posez-moi vos questions sur nos voyages et offres.",
    chatbot_placeholder: "Posez votre question...",
    chatbot_unavailable: "Désolé, service temporairement indisponible.",
    chatbot_always: "Toujours disponible pour vous",
    reduction: "de réduction",
    book_now: "Réserver maintenant",
    smart_search_try: "Essayer la recherche intelligente",

    // ── Login ──
    login_title: "Connexion",
    login_subtitle: "Accédez à votre espace personnel SmartTravel",
    login_email: "Adresse email",
    login_password: "Mot de passe",
    login_btn: "Se connecter",
    no_account: "Pas encore de compte ?",
    register_link: "S'inscrire",
    remember_me: "Se souvenir de moi",

    // ── Register ──
    register_title: "Créer un compte",
    register_subtitle: "Rejoignez la communauté SmartTravel",
    firstname: "Prénom",
    lastname: "Nom",
    register_btn: "Créer mon compte",
    have_account: "Déjà un compte ?",
    login_link: "Se connecter",
    confirm_password: "Confirmer le mot de passe",
    phone_optional: "Téléphone (optionnel)",
    accept_terms: "J'accepte les",
    terms_of_use: "Conditions d'utilisation",
    and_privacy: "et la politique de confidentialité",
    register_password_mismatch: "Les mots de passe ne correspondent pas.",
    register_password_short: "Le mot de passe doit contenir au moins 6 caractères.",
    register_server_error: "Erreur lors de l'inscription. Vérifiez que le serveur est démarré.",

    // ── Common ──
    loading: "Chargement...",
    night: "nuit",
    per_night: "/ nuit",
    book: "Réserver",
    view_details: "Voir détails",
    available: "Disponible",
    unavailable: "Indisponible",
    price: "Prix",
    nights: "nuits",
    phone: "Téléphone",
    email: "Email",
    address: "Adresse",
    description: "Message",

    // ── Booking ──
    booking_load_error: "Impossible de charger les détails.",
    booking_required_fields: "Nom, prénom et email sont obligatoires.",
    booking_error: "Erreur lors de la réservation.",
    booking_room_not_found: "Chambre ou hôtel introuvable.",
    back: "Retour",
    booking_title: "Finaliser votre réservation",
    booking_your_info: "Vos informations",
    booking_as_guest: "Vous réservez en tant que visiteur.",
    booking_sign_in: "Connectez-vous",
    booking_manage_bookings: "pour gérer vos réservations.",
    booking_lastname_label: "Nom *",
    booking_firstname_label: "Prénom *",
    booking_in_name_of: "Réservation au nom de",
    booking_formula: "Formule incluse",
    booking_processing: "Traitement...",
    booking_continue: "Continuer vers le paiement",
    booking_summary: "Récapitulatif",
    booking_person_singular: "personne",
    booking_person_plural: "personnes",
    booking_secure_payment: "Paiement sécurisé par Stripe",
    total: "Total",

    // ── Hotel Detail ──
    hotel_not_found: "Hôtel introuvable.",
    hotel_back: "Retour aux hôtels",
    hotel_official_site: "Site officiel",
    hotel_about: "À propos",
    hotel_location_label: "Localisation",
    hotel_rooms_title: "Chambres disponibles",
    hotel_checkin: "Arrivée",
    hotel_checkout: "Départ",
    hotel_guests_label: "Personnes",
    hotel_checking: "Vérification…",
    hotel_availability_checked: "Disponibilités vérifiées",
    hotel_check_avail: "Vérifier disponibilité",
    hotel_no_rooms: "Aucune chambre disponible.",
    hotel_guests_max: "pers. max",
    hotel_choose_dates: "📅 Choisissez des dates",
    hotel_check_first: "🔍 Vérifiez d'abord la dispo",
    hotel_unavail_dates: "✗ Indisponible sur ces dates",
    hotel_book_cta: "Réserver →",
    hotel_from_night: "à partir de / nuit",

    // ── Nav extra ──
    nav_smart_search: "Recherche IA",

    // ── Register extra ──
    register_join_prefix: "Rejoignez des milliers de",
    register_join_travellers: "voyageurs",
    register_hero_desc: "Créez votre compte et accédez à des offres exclusives, gérez vos réservations et planifiez vos voyages en toute simplicité.",
    register_stat_clients: "Clients satisfaits",
    register_stat_rating: "Note moyenne",
    register_pass_placeholder: "Créer un mot de passe",
    register_confirm_placeholder: "Confirmer votre mot de passe",

    // ── Payment ──
    payment_stripe_label: "Carte bancaire (Stripe)",
    payment_stripe_desc: "Paiement sécurisé 3D Secure — Visa, Mastercard, Amex",
    payment_stripe_badge: "Recommandé",
    payment_virement_label: "Virement bancaire",
    payment_virement_desc: "Virement via RIB — confirmation sous 2-3 jours ouvrés",
    payment_especes_label: "Paiement sur place",
    payment_especes_desc: "Régler en espèces à l'arrivée (sous réserve de disponibilité)",

    // ── Footer ──
    footer_desc: "Votre agence de voyage de confiance pour des expériences inoubliables à travers le monde.",
    footer_nav: "Navigation",
    footer_services: "Services",
    footer_flights: "Vols",
    footer_hotels: "Hôtels",
    footer_packages: "Séjours tout compris",
    footer_car_rental: "Location de voiture",
    footer_insurance: "Assurance voyage",
    footer_contact: "Contact",
    footer_copyright: "© 2026 SmartTravel. Tous droits réservés.",
    footer_privacy: "Confidentialité",
    footer_terms: "CGU",
    footer_cookies: "Cookies",

    // ── Contact ──
    contact_title: "Contactez-nous",
    contact_subtitle: "Notre équipe est disponible pour répondre à toutes vos questions",
    contact_success: "Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.",
    contact_faq_title: "Questions fréquentes",
    contact_faq_1_q: "Comment réserver un voyage ?",
    contact_faq_1_a: "Choisissez votre destination, sélectionnez vos dates et le nombre de voyageurs, puis suivez les étapes de réservation en ligne.",
    contact_faq_2_q: "Quels modes de paiement acceptez-vous ?",
    contact_faq_2_a: "Nous acceptons les cartes bancaires (Visa, Mastercard, Amex), les virements bancaires et les paiements en espèces à l'arrivée.",
    contact_faq_3_q: "Puis-je annuler ou modifier ma réservation ?",
    contact_faq_3_a: "Oui, vous pouvez annuler ou modifier votre réservation depuis votre espace client, sous réserve des conditions d'annulation.",
    contact_faq_4_q: "Combien de temps à l'avance dois-je réserver ?",
    contact_faq_4_a: "Nous recommandons de réserver au moins 2 semaines à l'avance, notamment en haute saison, pour garantir votre disponibilité.",
    contact_phone_hours: "Lun–Ven, 9h–18h",
    contact_email_delay: "Réponse sous 24h",
    contact_hours_label: "Horaires d'ouverture",
    contact_hours_detail: "Lun–Ven : 9h00 – 18h00\nSam : 10h00 – 14h00\nDim : Fermé",
    contact_send_message: "Envoyez-nous un message",
    contact_fullname: "Nom complet",
    contact_subject: "Sujet",
    contact_subject_placeholder: "Choisissez un sujet",
    contact_subject_quote: "Demande de devis",
    contact_subject_info: "Information",
    contact_subject_booking: "Réservation",
    contact_subject_complaint: "Réclamation",
    contact_subject_other: "Autre",
    contact_message_placeholder: "Décrivez votre demande...",
    contact_send_btn: "Envoyer le message",
    contact_agency: "Notre agence",
    contact_map_placeholder: "Carte interactive disponible prochainement",
    contact_street: "Avenue des Voyages",

    // ── Destinations ──
    destinations_title: "Nos Destinations",
    destinations_subtitle: "Explorez les plus belles destinations du monde avec SmartTravel",
    destinations_cat_all: "Toutes",
    destinations_cat_beach: "Plage",
    destinations_cat_city: "Ville",
    destinations_cat_adventure: "Aventure",
    destinations_filter: "Filtrer par :",
    destinations_count_suffix: "destination(s)",
    destinations_load_error: "Impossible de charger les destinations.",
    destinations_all_capacities: "Toutes capacités",
    destinations_see_offers: "Voir les offres",
    destinations_none: "Aucune destination disponible pour ce filtre.",
  },
  en: {
    // ── Nav ──
    nav_home: "Home",
    nav_hotels: "Hotels",
    nav_offers: "Offers",
    nav_destinations: "Destinations",
    nav_contact: "Contact",
    login: "Log in",
    register: "Sign up",
    logout: "Log out",
    my_space: "My space",
    my_profile: "My profile",
    connected_as: "Logged in as",
    administrator: "Administrator",
    client: "Client",
    favorites: "My favorites",

    // ── Hero ──
    hero_title: "Explore the world with SmartTravel",
    hero_subtitle: "Book hotels and travel experiences easily",
    search_placeholder: "Destination",
    search_persons: "Persons",
    search_btn: "Search",

    // ── Sections Home ──
    popular_dest: "Popular Destinations",
    popular_desc: "Discover our most requested travel offers",
    from: "From",
    per_person: "/ person",
    see_offers: "See offers",
    special_offers: "Special Offers",
    special_offers_desc: "Take advantage of our best promotions and exclusive deals",
    no_offers: "No offers available at the moment.",
    discover: "Discover",
    testimonials: "What our clients say",
    testimonials_desc: "Thousands of happy travelers worldwide",
    no_reviews: "No reviews yet.",
    book_share: "Book a trip and share your experience!",
    chatbot_greeting: "Hello! I'm the SmartTravel assistant. Ask me anything about our trips and offers.",
    chatbot_placeholder: "Ask your question...",
    chatbot_unavailable: "Sorry, service temporarily unavailable.",
    chatbot_always: "Always here for you",
    reduction: "off",
    book_now: "Book now",
    smart_search_try: "Try smart search",

    // ── Login ──
    login_title: "Login",
    login_subtitle: "Access your SmartTravel personal space",
    login_email: "Email address",
    login_password: "Password",
    login_btn: "Log in",
    no_account: "No account yet?",
    register_link: "Sign up",
    remember_me: "Remember me",

    // ── Register ──
    register_title: "Create an account",
    register_subtitle: "Join the SmartTravel community",
    firstname: "First name",
    lastname: "Last name",
    register_btn: "Create my account",
    have_account: "Already have an account?",
    login_link: "Log in",
    confirm_password: "Confirm password",
    phone_optional: "Phone (optional)",
    accept_terms: "I accept the",
    terms_of_use: "Terms of use",
    and_privacy: "and privacy policy",
    register_password_mismatch: "Passwords do not match.",
    register_password_short: "Password must be at least 6 characters.",
    register_server_error: "Registration error. Please check that the server is running.",

    // ── Common ──
    loading: "Loading...",
    night: "night",
    per_night: "/ night",
    book: "Book",
    view_details: "View details",
    available: "Available",
    unavailable: "Unavailable",
    price: "Price",
    nights: "nights",
    phone: "Phone",
    email: "Email",
    address: "Address",
    description: "Message",

    // ── Booking ──
    booking_load_error: "Unable to load details.",
    booking_required_fields: "Last name, first name and email are required.",
    booking_error: "Booking error.",
    booking_room_not_found: "Room or hotel not found.",
    back: "Back",
    booking_title: "Complete your booking",
    booking_your_info: "Your information",
    booking_as_guest: "You are booking as a guest.",
    booking_sign_in: "Sign in",
    booking_manage_bookings: "to manage your bookings.",
    booking_lastname_label: "Last name *",
    booking_firstname_label: "First name *",
    booking_in_name_of: "Booking in the name of",
    booking_formula: "Included package",
    booking_processing: "Processing...",
    booking_continue: "Continue to payment",
    booking_summary: "Summary",
    booking_person_singular: "person",
    booking_person_plural: "people",
    booking_secure_payment: "Secure payment powered by Stripe",
    total: "Total",

    // ── Hotel Detail ──
    hotel_not_found: "Hotel not found.",
    hotel_back: "Back to hotels",
    hotel_official_site: "Official website",
    hotel_about: "About",
    hotel_location_label: "Location",
    hotel_rooms_title: "Available rooms",
    hotel_checkin: "Check-in",
    hotel_checkout: "Check-out",
    hotel_guests_label: "Guests",
    hotel_checking: "Checking…",
    hotel_availability_checked: "Availability checked",
    hotel_check_avail: "Check availability",
    hotel_no_rooms: "No rooms available.",
    hotel_guests_max: "guests max",
    hotel_choose_dates: "📅 Choose dates",
    hotel_check_first: "🔍 Check availability first",
    hotel_unavail_dates: "✗ Unavailable for these dates",
    hotel_book_cta: "Book →",
    hotel_from_night: "from / night",

    // ── Nav extra ──
    nav_smart_search: "AI Search",

    // ── Register extra ──
    register_join_prefix: "Join thousands of",
    register_join_travellers: "travellers",
    register_hero_desc: "Create your account and access exclusive offers, manage your bookings and plan your trips with ease.",
    register_stat_clients: "Happy clients",
    register_stat_rating: "Avg. rating",
    register_pass_placeholder: "Create a password",
    register_confirm_placeholder: "Confirm your password",

    // ── Payment ──
    payment_stripe_label: "Credit card (Stripe)",
    payment_stripe_desc: "Secure 3D Secure payment — Visa, Mastercard, Amex",
    payment_stripe_badge: "Recommended",
    payment_virement_label: "Bank transfer",
    payment_virement_desc: "Bank transfer — confirmed within 2–3 business days",
    payment_especes_label: "Pay on arrival",
    payment_especes_desc: "Pay cash on arrival (subject to availability)",

    // ── Footer ──
    footer_desc: "Your trusted travel agency for unforgettable experiences around the world.",
    footer_nav: "Navigation",
    footer_services: "Services",
    footer_flights: "Flights",
    footer_hotels: "Hotels",
    footer_packages: "All-inclusive packages",
    footer_car_rental: "Car rental",
    footer_insurance: "Travel insurance",
    footer_contact: "Contact",
    footer_copyright: "© 2026 SmartTravel. All rights reserved.",
    footer_privacy: "Privacy",
    footer_terms: "Terms",
    footer_cookies: "Cookies",

    // ── Contact ──
    contact_title: "Contact us",
    contact_subtitle: "Our team is available to answer all your questions",
    contact_success: "Message sent successfully! We will get back to you as soon as possible.",
    contact_faq_title: "Frequently asked questions",
    contact_faq_1_q: "How do I book a trip?",
    contact_faq_1_a: "Choose your destination, select your dates and number of travelers, then follow the online booking steps.",
    contact_faq_2_q: "What payment methods do you accept?",
    contact_faq_2_a: "We accept credit cards (Visa, Mastercard, Amex), bank transfers, and cash payments on arrival.",
    contact_faq_3_q: "Can I cancel or modify my booking?",
    contact_faq_3_a: "Yes, you can cancel or modify your booking from your account, subject to the cancellation conditions.",
    contact_faq_4_q: "How far in advance should I book?",
    contact_faq_4_a: "We recommend booking at least 2 weeks in advance, especially during peak season, to ensure availability.",
    contact_phone_hours: "Mon–Fri, 9am–6pm",
    contact_email_delay: "Reply within 24h",
    contact_hours_label: "Opening hours",
    contact_hours_detail: "Mon–Fri: 9:00am – 6:00pm\nSat: 10:00am – 2:00pm\nSun: Closed",
    contact_send_message: "Send us a message",
    contact_fullname: "Full name",
    contact_subject: "Subject",
    contact_subject_placeholder: "Choose a subject",
    contact_subject_quote: "Quote request",
    contact_subject_info: "Information",
    contact_subject_booking: "Booking",
    contact_subject_complaint: "Complaint",
    contact_subject_other: "Other",
    contact_message_placeholder: "Describe your request...",
    contact_send_btn: "Send message",
    contact_agency: "Our agency",
    contact_map_placeholder: "Interactive map coming soon",
    contact_street: "Travel Avenue",

    // ── Destinations ──
    destinations_title: "Our Destinations",
    destinations_subtitle: "Explore the world's most beautiful destinations with SmartTravel",
    destinations_cat_all: "All",
    destinations_cat_beach: "Beach",
    destinations_cat_city: "City",
    destinations_cat_adventure: "Adventure",
    destinations_filter: "Filter by:",
    destinations_count_suffix: "destination(s)",
    destinations_load_error: "Unable to load destinations.",
    destinations_all_capacities: "All capacities",
    destinations_see_offers: "See offers",
    destinations_none: "No destinations available for this filter.",
  },
} as const;

export type TranslationKey = keyof typeof translations.fr;

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("st_lang");
    return (saved === "fr" || saved === "en") ? saved : "fr";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("st_lang", l);
  };

  const t = (key: TranslationKey): string => {
    if (lang === "en") return translations.en[key] as string;
    return translations.fr[key] as string;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
