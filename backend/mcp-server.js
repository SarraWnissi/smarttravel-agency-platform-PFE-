// mcp-server.js
// IMPORTANT (MCP stdio) : rien ne doit écrire sur stdout sauf le protocole JSON-RPC.
// dotenv {quiet:true} évite la bannière qui corrompait la connexion MCP.
// path explicite : Claude Desktop lance le script depuis un autre cwd, donc on
// charge le .env depuis le dossier du script (sinon DATABASECLOUD est introuvable).
require('dotenv').config({ quiet: true, path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Models (require here; mongoose connection will be established in factory)
const Reservation = require('./models/reservation');
const Utilisateur = require('./models/utilisateur');
const Chambre = require('./models/chambre');
const Offre = require('./models/offre');
const Service = require('./models/service');
const Avis = require('./models/avis');
const Facture = require('./models/facture');
const Paiement = require('./models/paiement');
const Hebergement = require('./models/hebergement');

// Helper parse date
function parseDateFlexible(value) {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value); return isNaN(d.getTime()) ? undefined : d;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split('/'); const d = new Date(`${yyyy}-${mm}-${dd}`); return isNaN(d.getTime()) ? undefined : d;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split('-'); const d = new Date(`${yyyy}-${mm}-${dd}`); return isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(value); return isNaN(d.getTime()) ? undefined : d;
}

// Classe centrale (utilise injection des modules SDK)
class HotelMCPServer {
  constructor({ Server, StdioServerTransport, ListToolsRequestSchema, CallToolRequestSchema }) {
    this.ServerClass = Server;
    this.StdioServerTransport = StdioServerTransport;
    this.ListToolsRequestSchema = ListToolsRequestSchema;
    this.CallToolRequestSchema = CallToolRequestSchema;

    // session in-memory per instance
    this.SESSION = { token: null, user: null };

    // instantiate SDK server
    this.server = new this.ServerClass({ name: 'hotel-mcp-server', version: '1.0.0' }, { capabilities: { tools: {} } });

    // bind handlers
    this.server.setRequestHandler(this.ListToolsRequestSchema, this.handleToolsList.bind(this));
    this.server.setRequestHandler(this.CallToolRequestSchema, this.handleToolCall.bind(this));
  }

  // small helpers as instance methods
  deny(text, code = 'Access denied') {
    return { content: [{ type: 'text', text: `${code}: ${text}` }], isError: true };
  }

  requireAuth() {
    if (!this.SESSION.token || !this.SESSION.user) {
      return { ok: false, error: 'Unauthorized: token manquant. Utilise set_token.' };
    }
    return { ok: true, user: this.SESSION.user };
  }

  requireRole(...roles) {
    const auth = this.requireAuth();
    if (!auth.ok) return { ok: false, error: auth.error };
    const role = auth.user?.role;
    if (!roles.includes(role)) return { ok: false, error: `Forbidden: role requis = ${roles.join(', ')} (actuel=${role})` };
    return { ok: true, user: auth.user };
  }

  getUserId() {
    return this.SESSION?.user?.id || this.SESSION?.user?._id || null;
  }

  // Auto-connexion ADMIN : Claude Desktop est utilisé uniquement par l'admin,
  // donc on ouvre une session ADMIN au démarrage pour que TOUS les tools
  // fonctionnent sans avoir à appeler login. Choix du compte :
  //   1) MCP_ADMIN_EMAIL si défini dans le .env
  //   2) sinon le premier utilisateur ACTIF avec role=ADMIN
  async autoLoginAsAdmin() {
    const query = { role: 'ADMIN', etatCompte: 'ACTIF' };
    if (process.env.MCP_ADMIN_EMAIL) {
      query.email = String(process.env.MCP_ADMIN_EMAIL).toLowerCase().trim();
    }
    const admin = await Utilisateur.findOne(query).sort({ createdAt: 1 });
    if (!admin) {
      console.error(`MCP auto-login: aucun ADMIN ACTIF trouvé${process.env.MCP_ADMIN_EMAIL ? ` (email=${process.env.MCP_ADMIN_EMAIL})` : ''}.`);
      return false;
    }
    const token = jwt.sign(
      { id: admin._id, role: admin.role, email: admin.email },
      process.env.SECRET,
      { expiresIn: '12h' }
    );
    this.SESSION.token = token;
    this.SESSION.user = jwt.verify(token, process.env.SECRET);
    console.error(`MCP auto-login: connecté en ADMIN (${admin.email}).`);
    return true;
  }



    async handleToolsList() {
  return {
    tools: [

      // =====================================================
      // AUTH
      // =====================================================
      {
        name: 'login',
        description: 'Se connecter avec email + mot de passe (comme sur le site). Récupère et enregistre automatiquement le token pour autoriser les autres tools.',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            email: { type: 'string' },
            password: { type: 'string' }
          },
          required: ['email', 'password'],
        },
      },

      {
        name: 'set_token',
        description: 'Enregistrer un JWT (Bearer token) pour autoriser les autres tools',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            token: { type: 'string' }
          },
          required: ['token'],
        },
      },

      {
        name: 'logout',
        description: 'Effacer le token de la session MCP',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      },

      {
        name: 'whoami',
        description: 'Afficher l’utilisateur courant (décodé depuis le JWT)',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      },

      // =====================================================
      // RESERVATIONS
      // =====================================================
      {
        name: 'get_reservations',
        description: 'Obtenir la liste de toutes les réservations',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        },
      },

      {
        name: 'search_reservations',
        description: 'Rechercher des réservations (ADMIN)',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            clientID: { type: 'string' },
            offreID: { type: 'string' },
            chambreID: { type: 'string' },

            statut: {
              type: 'string',
              enum: [
                'EN_ATTENTE_PAIEMENT',
                'CONFIRMEE',
                'ANNULEE',
                'EXPIREE'
              ]
            },

            typeReservation: {
              type: 'string',
              enum: [
                'HOTEL',
                'EXCURSION',
                'INTERNATIONALE'
              ]
            },

            dateFrom: {
              type: 'string',
              description: 'YYYY-MM-DD'
            },

            dateTo: {
              type: 'string',
              description: 'YYYY-MM-DD'
            },

            limit: {
              type: 'number',
              minimum: 1,
              maximum: 200
            }
          }
        }
      },

      {
        name: 'create_reservation',
        description: 'Créer une nouvelle réservation',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            clientID: {
              type: 'string',
              description: 'ADMIN uniquement'
            },

            offreID: {
              type: 'string',
              description: "ID de l'offre"
            },

            typeReservation: {
              type: 'string',
              enum: [
                'HOTEL',
                'EXCURSION',
                'INTERNATIONALE'
              ]
            },

            statut: {
              type: 'string',
              enum: [
                'EN_ATTENTE_PAIEMENT',
                'CONFIRMEE',
                'ANNULEE',
                'EXPIREE'
              ]
            },

            dateReservation: {
              type: 'string',
              format: 'date'
            },

            dateDebutSejour: {
              type: 'string',
              format: 'date'
            },

            dateFinSejour: {
              type: 'string',
              format: 'date'
            },

            nbPersonnes: {
              type: 'number',
              minimum: 1
            },

            montantTotal: {
              type: 'number',
              minimum: 0
            },

            pension: {
              type: 'string'
            },

            nbNuits: {
              type: 'number',
              minimum: 1
            },

            dateExcursion: {
              type: 'string',
              format: 'date'
            },

            dureeHeures: {
              type: 'number',
              minimum: 1
            },

            numPassport: {
              type: 'string'
            },

            visa: {
              type: 'string'
            },

            paysDestination: {
              type: 'string'
            },

            hebergementID: {
              type: 'string'
            },

            chambreID: {
              type: 'string'
            },

            numeroChambre: {
              type: 'string'
            }
          },

          required: [
            'offreID',
            'typeReservation',
            'nbPersonnes'
          ],
        },
      },

      {
        name: 'get_reservation_by_id',
        description: 'Récupérer une réservation par son ID',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            reservationID: { type: 'string' }
          },
          required: ['reservationID']
        },
      },

      {
        name: 'get_reservations_by_client',
        description: 'Lister les réservations d’un client',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            clientID: { type: 'string' }
          },
          required: ['clientID']
        },
      },

      {
        name: 'update_reservation_status',
        description: 'Mettre à jour le statut d’une réservation',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            reservationID: {
              type: 'string'
            },

            statut: {
              type: 'string',
              enum: [
                'EN_ATTENTE_PAIEMENT',
                'CONFIRMEE',
                'ANNULEE',
                'EXPIREE'
              ]
            }
          },

          required: [
            'reservationID',
            'statut'
          ],
        },
      },

      // =====================================================
      // USERS
      // =====================================================
      {
        name: 'get_users',
        description: 'Obtenir la liste de tous les utilisateurs',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      },

      {
        name: 'create_user',
        description: 'Créer un utilisateur',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            email: {
              type: 'string'
            },

            password: {
              type: 'string'
            },

            firstname: {
              type: 'string'
            },

            lastname: {
              type: 'string'
            },

            role: {
              type: 'string',
              enum: ['CLIENT', 'ADMIN']
            },

            telephone: {
              type: 'string'
            },

            adresseFacturation: {
              type: 'string'
            },

            etatCompte: {
              type: 'string',
              enum: [
                'ACTIF',
                'SUSPENDU',
                'SUPPRIME'
              ]
            }
          },

          required: [
            'email',
            'password',
            'firstname',
            'lastname'
          ],
        },
      },

      {
        name: 'get_user_by_id',
        description: 'Récupérer un utilisateur par son ID',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            userID: { type: 'string' }
          },
          required: ['userID']
        }
      },

      // =====================================================
      // HEBERGEMENTS
      // =====================================================
      {
        name: 'get_hebergements',
        description: 'Obtenir la liste de tous les hébergements',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      },

      {
        name: 'get_hebergement_by_id',
        description: 'Récupérer un hébergement par son ID',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            hebergementID: { type: 'string' }
          },
          required: ['hebergementID']
        }
      },

      {
        name: 'create_hebergement',
        description: 'Créer un hébergement (ADMIN)',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            titre: { type: 'string' },
            description: { type: 'string' },
            prixBase: { type: 'number' },
            devise: { type: 'string' },
            localisation: { type: 'string' },

            type: {
              type: 'string',
              enum: [
                'HOTEL',
                'APPARTEMENT',
                'VILLA',
                'AUBERGE',
                'CAMPING',
                'RESORT',
                'BUNGALOW'
              ]
            },

            serviceID: { type: 'string' },

            etoiles: {
              type: 'number',
              minimum: 1,
              maximum: 5
            },

            images: {
              type: 'array',
              items: {
                type: 'string'
              }
            },

            adresse: {
              type: 'string'
            }
          },

          required: [
            'titre',
            'type'
          ]
        }
      },

      {
        name: 'get_hebergement_chambres',
        description: "Lister les chambres d'un hébergement",
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            hebergementID: { type: 'string' }
          },
          required: ['hebergementID']
        }
      },

      // =====================================================
      // CHAMBRES
      // =====================================================
      {
        name: 'get_chambres',
        description: 'Obtenir la liste de toutes les chambres',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      },

      {
        name: 'get_chambre_by_id',
        description: 'Récupérer une chambre par son ID',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            chambreID: { type: 'string' }
          },
          required: ['chambreID']
        }
      },

      {
        name: 'create_chambre',
        description: 'Créer une chambre',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            hebergementID: {
              type: 'string'
            },

            numeroChambre: {
              type: 'string'
            },

            typeChambre: {
              type: 'string',
              enum: [
                'SINGLE',
                'DOUBLE',
                'TWIN',
                'SUITE',
                'DELUXE',
                'FAMILIALE'
              ]
            },

            etage: {
              type: 'number',
              minimum: 0
            },

            capacite: {
              type: 'number',
              minimum: 1
            },

            superficie: {
              type: 'number',
              minimum: 0
            },

            prixParNuit: {
              type: 'number',
              minimum: 0
            },

            disponible: {
              type: 'boolean'
            }
          },

          required: [
            'hebergementID',
            'numeroChambre',
            'typeChambre',
            'capacite',
            'prixParNuit',
            'disponible'
          ]
        }
      },

      {
        name: 'search_chambres_available',
        description: 'Rechercher des chambres disponibles sur une période',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            dateDebut: {
              type: 'string',
              description: 'YYYY-MM-DD'
            },

            dateFin: {
              type: 'string',
              description: 'YYYY-MM-DD'
            },

            hebergementID: {
              type: 'string'
            },

            typeChambre: {
              type: 'string',
              enum: [
                'SINGLE',
                'DOUBLE',
                'TWIN',
                'SUITE',
                'DELUXE',
                'FAMILIALE'
              ]
            },

            capaciteMin: {
              type: 'number'
            },

            prixMax: {
              type: 'number'
            },

            limit: {
              type: 'number',
              minimum: 1,
              maximum: 200
            }
          },

          required: [
            'dateDebut',
            'dateFin'
          ]
        }
      },

      // =====================================================
      // SERVICES
      // =====================================================
      {
        name: 'get_services',
        description: 'Obtenir la liste de tous les services',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      },

      {
        name: 'create_service',
        description: 'Créer un service',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            titre: { type: 'string' },
            description: { type: 'string' },
            prixBase: { type: 'number' },
            devise: { type: 'string' },
            localisation: { type: 'string' },

            typeService: {
              type: 'string',
              enum: [
                'HEBERGEMENT',
                'DESTINATION',
                'ACTIVITE'
              ]
            },

            categorie: { type: 'string' },
            adresse: { type: 'string' },
            nbChambres: { type: 'number' }
          },

          required: [
            'titre',
            'typeService'
          ]
        }
      },

      {
        name: 'update_service',
        description: 'Mettre à jour un service (ADMIN)',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            serviceID: { type: 'string' },

            titre: { type: 'string' },
            description: { type: 'string' },
            prixBase: { type: 'number' },
            devise: { type: 'string' },
            localisation: { type: 'string' },

            typeService: {
              type: 'string',
              enum: [
                'HEBERGEMENT',
                'DESTINATION',
                'ACTIVITE'
              ]
            },

            categorie: { type: 'string' },
            adresse: { type: 'string' },
            nbChambres: { type: 'number' },

            typeDestination: { type: 'string' },
            avis: { type: 'number' },

            typeActivite: { type: 'string' },
            duree: { type: 'string' }
          },

          required: ['serviceID']
        }
      },

      // =====================================================
      // OFFRES
      // =====================================================
      {
        name: 'get_offres',
        description: 'Obtenir la liste de toutes les offres',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      },

      {
        name: 'create_offre',
        description: 'Créer une offre',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {
            titre: { type: 'string' },
            descriptionCourte: { type: 'string' },
            prixAPartirDe: { type: 'number' },
            serviceID: { type: 'string' }
          },

          required: [
            'titre',
            'prixAPartirDe',
            'serviceID'
          ]
        }
      },

      {
        name: 'search_offres',
        description: 'Rechercher des offres',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            keyword: {
              type: 'string'
            },

            serviceID: {
              type: 'string'
            },

            minPrice: {
              type: 'number'
            },

            maxPrice: {
              type: 'number'
            },

            limit: {
              type: 'number',
              minimum: 1,
              maximum: 200
            }
          }
        }
      },

      {
        name: 'update_offre',
        description: 'Mettre à jour une offre (ADMIN)',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            offreID: { type: 'string' },
            titre: { type: 'string' },
            descriptionCourte: { type: 'string' },
            prixAPartirDe: { type: 'number' },
            serviceID: { type: 'string' }
          },

          required: ['offreID']
        }
      },

      {
        name: 'get_offres_by_service',
        description: 'Lister les offres d’un service',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            serviceID: { type: 'string' }
          },
          required: ['serviceID']
        }
      },

      // =====================================================
      // AVIS
      // =====================================================
      {
        name: 'get_avis',
        description: 'Obtenir la liste de tous les avis',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      },

      {
        name: 'create_avis',
        description: 'Créer un avis',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            clientID: { type: 'string' },

            reservationID: {
              type: 'string'
            },

            note: {
              type: 'number',
              minimum: 1,
              maximum: 5
            },

            commentaire: {
              type: 'string'
            },

            dateAvis: {
              type: 'string',
              format: 'date'
            }
          },

          required: [
            'reservationID',
            'note'
          ]
        }
      },

      {
        name: 'delete_avis',
        description: 'Supprimer définitivement un avis (ADMIN)',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            avisID: { type: 'string' }
          },
          required: ['avisID']
        }
      },

      {
        name: 'get_avis_by_reservation',
        description: 'Lister les avis d’une réservation',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            reservationID: { type: 'string' }
          },
          required: ['reservationID']
        }
      },

      // =====================================================
      // PAIEMENTS
      // =====================================================
      {
        name: 'get_paiements',
        description: 'Obtenir la liste de tous les paiements',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      },

      {
        name: 'create_paiement',
        description: 'Créer un paiement basé sur une réservation',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            reservationID: {
              type: 'string'
            },

            methodePaiement: {
              type: 'string',
              enum: [
                'CARTE',
                'ESPECES',
                'PAYPAL',
                'STRIPE',
                'VIREMENT'
              ]
            },

            transactionId: {
              type: 'string'
            },

            statut: {
              type: 'string',
              enum: [
                'EN_COURS',
                'ACCEPTE',
                'REFUSE'
              ]
            },

            datePaiement: {
              type: 'string',
              format: 'date'
            }
          },

          required: [
            'reservationID',
            'methodePaiement'
          ]
        }
      },

      {
        name: 'get_paiements_by_reservation',
        description: 'Lister les paiements d’une réservation',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            reservationID: { type: 'string' }
          },
          required: ['reservationID']
        }
      },

      // =====================================================
      // FACTURES
      // =====================================================
      {
        name: 'get_my_factures',
        description: 'Lister mes factures',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      },

      {
        name: 'get_factures',
        description: 'Obtenir la liste de toutes les factures',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      },

      {
        name: 'create_facture',
        description: 'Créer une facture',
        inputSchema: {
          type: 'object',
          additionalProperties: false,

          properties: {

            paiementID: {
              type: 'string'
            },

            numeroFacture: {
              type: 'string'
            },

            dateEmission: {
              type: 'string',
              format: 'date'
            },

            montantHT: {
              type: 'number'
            },

            montantTTC: {
              type: 'number'
            }
          },

          required: [
            'paiementID',
            'numeroFacture',
            'dateEmission',
            'montantHT',
            'montantTTC'
          ]
        }
      },

      {
        name: 'get_facture_by_paiement',
        description: 'Récupérer la facture liée à un paiement',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            paiementID: { type: 'string' }
          },
          required: ['paiementID']
        }
      }
    ]
  };
}
async handleToolCall(request) {
  const { name, arguments: args = {} } = request.params || {};

  // public tools
  const publicTools = new Set(['login', 'set_token', 'logout', 'whoami', 'ping']);

  // guard global (require auth except token tools)
  if (!publicTools.has(name)) {
    const auth = this.requireAuth();
    if (!auth.ok) {
      return { content: [{ type: 'text', text: auth.error }], isError: true };
    }
  }

  try {
    switch (name) {
      // ---------- TOKEN ----------
      case 'login': {
        if (!args.email || !args.password) {
          return { content: [{ type: 'text', text: 'email et password sont requis' }], isError: true };
        }

        const user = await Utilisateur.findOne({ email: String(args.email).toLowerCase().trim() });
        if (!user) {
          return { content: [{ type: 'text', text: 'Utilisateur introuvable (email incorrect).' }], isError: true };
        }

        const valid = await bcrypt.compare(args.password, user.password);
        if (!valid) {
          return { content: [{ type: 'text', text: 'Mot de passe incorrect.' }], isError: true };
        }

        if (user.etatCompte && user.etatCompte !== 'ACTIF') {
          return { content: [{ type: 'text', text: `Compte ${user.etatCompte}. Connexion refusée.` }], isError: true };
        }

        const token = jwt.sign(
          { id: user._id, role: user.role, email: user.email },
          process.env.SECRET,
          { expiresIn: '8h' }
        );

        this.SESSION.token = token;
        this.SESSION.user = jwt.verify(token, process.env.SECRET);
        return { content: [{ type: 'text', text: `Connecté: ${user.email} (role=${user.role})` }] };
      }

      case 'set_token': {
        try {
          const decoded = jwt.verify(args.token, process.env.SECRET);
          this.SESSION.token = args.token;
          this.SESSION.user = decoded;
          return { content: [{ type: 'text', text: `Token OK. Connecté: ${decoded.email || decoded._id || 'user'} (role=${decoded.role})` }] };
        } catch (e) {
          this.SESSION.token = null; this.SESSION.user = null;
          return { content: [{ type: 'text', text: 'Token invalide' }], isError: true };
        }
      }

      case 'whoami': {
        const auth = this.requireAuth();
        if (!auth.ok) return { content: [{ type: 'text', text: auth.error }], isError: true };
        return { content: [{ type: 'text', text: JSON.stringify(auth.user, null, 2) }] };
      }

      case 'logout': {
        this.SESSION.token = null; this.SESSION.user = null;
        return { content: [{ type: 'text', text: 'Déconnecté (token effacé).' }] };
      }

      // ---------- PING ----------
      case 'ping':
        return { content: [{ type: 'text', text: 'pong' }] };

      // ---------- HEBERGEMENTS ----------
      case 'get_hebergements': {
        const auth = this.requireAuth();
        if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

        const list = await Hebergement.find();
        return { content: [{ type: 'text', text: JSON.stringify(list, null, 2) }] };
      }

      case 'get_hebergement_by_id': {
        const auth = this.requireAuth();
        if (!auth.ok) return this.deny(auth.error, 'Unauthorized');
        if (!isValidObjectId(args.hebergementID)) return { content:[{type:'text', text:`hebergementID invalide: "${args.hebergementID}"`}], isError:true };

        const h = await Hebergement.findById(args.hebergementID);
        if (!h) return { content:[{type:'text', text:`Hebergement introuvable: ${args.hebergementID}`}], isError:true };

        const chambres = await Chambre.find({ hebergementID: args.hebergementID });
        return { content: [{ type: 'text', text: JSON.stringify({ hebergement: h, chambres }, null, 2) }] };
      }

      case 'create_hebergement': {
        const gate = this.requireRole("ADMIN");
        if (!gate.ok) return this.deny(gate.error, 'Forbidden');

        if (!args.titre || !args.type) {
          return { content: [{ type: 'text', text: 'titre et type sont requis' }], isError: true };
        }

        const allowedTypes = ["HOTEL","APPARTEMENT","VILLA","AUBERGE","CAMPING","RESORT","BUNGALOW"];
        const normalizedType = String(args.type).trim().toUpperCase();
        if (!allowedTypes.includes(normalizedType)) {
          return { content: [{ type: 'text', text: `type invalide: "${args.type}". Valeurs acceptées: ${allowedTypes.join(', ')}` }], isError: true };
        }

        if (args.serviceID && !isValidObjectId(args.serviceID)) {
          return { content: [{ type: 'text', text: `serviceID invalide: "${args.serviceID}"` }], isError: true };
        }

        if (args.serviceID) {
          const svc = await Service.findById(args.serviceID);
          if (!svc) return { content: [{ type: 'text', text: `Service introuvable: ${args.serviceID}` }], isError: true };
          if (svc.typeService !== 'HEBERGEMENT') {
            return { content: [{ type: 'text', text: `Le service ${args.serviceID} n'est pas un service de type HEBERGEMENT (typeService=${svc.typeService})` }], isError: true };
          }
        }

        const payload = { ...args, type: normalizedType };
        Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

        const h = new Hebergement(payload);
        await h.save();
        return { content: [{ type: 'text', text: `Hebergement créé: ${JSON.stringify(h, null, 2)}` }] };
      }

      case 'get_hebergement_chambres': {
        const auth = this.requireAuth();
        if (!auth.ok) return this.deny(auth.error, 'Unauthorized');
        if (!isValidObjectId(args.hebergementID)) return { content:[{type:'text', text:`hebergementID invalide: "${args.hebergementID}"`}], isError:true };

        const chambres = await Chambre.find({ hebergementID: args.hebergementID });
        return { content: [{ type:'text', text: JSON.stringify(chambres, null, 2) }] };
      }

      // ---------- RESERVATIONS ----------
      case 'get_reservations': {
  const auth = this.requireAuth();
  if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

  const isAdmin = auth.user.role === 'ADMIN';
  const userId = this.getUserId();
  if (!userId) return this.deny("Impossible de lire l'id utilisateur depuis le token.", 'Unauthorized');

  const filter = isAdmin ? {} : { clientID: userId };
  const reservations = await Reservation.find(filter)
    .populate('clientID')
    .populate({ path: 'offreID', populate: { path: 'serviceID' } });

  return { content: [{ type: 'text', text: JSON.stringify(reservations, null, 2) }] };
}

case 'create_reservation': {
  const auth = this.requireAuth();
  if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

  const role = auth.user?.role;
  if (!['ADMIN', 'CLIENT'].includes(role)) {
    return this.deny(`Accès refusé: role requis = ADMIN ou CLIENT (actuel=${role})`, 'Forbidden');
  }

  const isAdmin = role === 'ADMIN';
  const userId = this.getUserId();
  if (!userId) return this.deny("Impossible de lire l'id utilisateur depuis le token.", 'Unauthorized');

  // ========== 1. Gestion du clientID (ADMIN peut forcer, CLIENT = auto) ==========
  if (!isAdmin) {
    // CLIENT : force son propre ID
    args.clientID = String(userId);
  } else {
    // ADMIN : si clientID fourni, on le valide ; sinon il faudra le rendre obligatoire
    if (args.clientID) {
      if (!isValidObjectId(args.clientID)) {
        return { 
          content: [{ type: 'text', text: `clientID invalide: "${args.clientID}"` }], 
          isError: true 
        };
      }
    } else {
      return { 
        content: [{ type: 'text', text: "ADMIN: le champ 'clientID' est obligatoire pour créer une réservation pour un client." }], 
        isError: true 
      };
    }
  }

  // ========== 2. Gestion du statut (ADMIN peut choisir, CLIENT fixe à EN_ATTENTE_PAIEMENT) ==========
  if (!isAdmin) {
    args.statut = 'EN_ATTENTE_PAIEMENT';
  }
  // ADMIN peut garder le statut qu'il a fourni (par défaut EN_ATTENTE_PAIEMENT si absent)
  if (!args.statut) {
    args.statut = 'EN_ATTENTE_PAIEMENT';
  }

  // ========== 3. Validations communes ==========
  if (!args.offreID || !isValidObjectId(args.offreID)) {
    return { 
      content: [{ type: 'text', text: `offreID invalide: "${args.offreID}"` }], 
      isError: true 
    };
  }

  if (typeof args.nbPersonnes !== 'number' || args.nbPersonnes < 1) {
    return { 
      content: [{ type: 'text', text: `nbPersonnes invalide: "${args.nbPersonnes}" (doit être >= 1)` }], 
      isError: true 
    };
  }

  if (args.montantTotal !== undefined && typeof args.montantTotal === 'number' && args.montantTotal < 0) {
    return { 
      content: [{ type: 'text', text: `montantTotal invalide: "${args.montantTotal}" (doit être >= 0)` }], 
      isError: true 
    };
  }

  // ========== 4. Parsing des dates ==========
  const dateDebut = parseDateFlexible(args.dateDebutSejour);
  const dateFin = parseDateFlexible(args.dateFinSejour);
  const dateExcursion = parseDateFlexible(args.dateExcursion);
  const dateReservation = parseDateFlexible(args.dateReservation) || new Date();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // ========== 5. Validation selon typeReservation ==========
  if (args.typeReservation === "HOTEL") {
    // Vérifications HOTEL
    if (!args.dateDebutSejour || !args.dateFinSejour) {
      return { 
        content: [{ type: 'text', text: 'Pour une réservation HOTEL, dateDebutSejour et dateFinSejour sont obligatoires.' }], 
        isError: true 
      };
    }
    if (!dateDebut) {
      return { content: [{ type: 'text', text: `dateDebutSejour invalide: "${args.dateDebutSejour}".` }], isError: true };
    }
    if (!dateFin) {
      return { content: [{ type: 'text', text: `dateFinSejour invalide: "${args.dateFinSejour}".` }], isError: true };
    }
    
    // Pas de réservation dans le passé (sauf ADMIN qui peut forcer pour des cas particuliers)
    if (!isAdmin && dateDebut < today) {
      return { 
        content: [{ type: 'text', text: "Impossible de réserver dans le passé. Veuillez choisir une date à partir d'aujourd'hui." }], 
        isError: true 
      };
    }
    
    if (dateFin <= dateDebut) {
      return { 
        content: [{ type: 'text', text: 'Période invalide: dateFinSejour doit être après dateDebutSejour.' }], 
        isError: true 
      };
    }

    // Gestion chambreID
    if (!args.chambreID) {
      if (args.hebergementID && args.numeroChambre) {
        if (!isValidObjectId(args.hebergementID)) {
          return { content: [{ type: 'text', text: `hebergementID invalide: "${args.hebergementID}"` }], isError: true };
        }
        const chambre = await Chambre.findOne({ 
          hebergementID: args.hebergementID, 
          numeroChambre: args.numeroChambre 
        });
        if (!chambre) {
          return { content: [{ type: 'text', text: 'Chambre introuvable pour hebergementID+numeroChambre' }], isError: true };
        }
        args.chambreID = String(chambre._id);
      } else {
        return { 
          content: [{ type: 'text', text: 'Pour HOTEL, chambreID ou (hebergementID + numeroChambre) est requis.' }], 
          isError: true 
        };
      }
    } else {
      if (!isValidObjectId(args.chambreID)) {
        return { content: [{ type: 'text', text: `chambreID invalide: "${args.chambreID}"` }], isError: true };
      }
    }

    // Vérification conflit de réservation (sauf pour ADMIN qui peut outrepasser)
    if (!isAdmin) {
      const conflit = await Reservation.findOne({
        chambreID: args.chambreID,
        statut: { $nin: ['ANNULEE', 'EXPIREE'] },
        $or: [
          { dateDebutSejour: { $lte: dateFin }, dateFinSejour: { $gte: dateDebut } }
        ]
      });
      if (conflit) {
        return { 
          content: [{ type: 'text', text: 'Conflit détecté: période déjà réservée pour cette chambre' }], 
          isError: true 
        };
      }
    }

    // Calcul nbNuits et montantTotal si non fourni
    args.nbNuits = Math.max(1, Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24)));
    if (!args.montantTotal) {
      const chambreObj = await Chambre.findById(args.chambreID);
      if (!chambreObj) {
        return { content: [{ type: 'text', text: 'Chambre introuvable pour le calcul du montant.' }], isError: true };
      }
      args.montantTotal = args.nbNuits * (Number(chambreObj.prixParNuit) || 0);
    }
  }

  else if (args.typeReservation === "EXCURSION") {
    // Vérifications EXCURSION
    if (!args.dateExcursion) {
      return { 
        content: [{ type: 'text', text: 'Pour une réservation EXCURSION, dateExcursion est obligatoire.' }], 
        isError: true 
      };
    }
    if (!dateExcursion) {
      return { content: [{ type: 'text', text: `dateExcursion invalide: "${args.dateExcursion}".` }], isError: true };
    }
    
    if (!isAdmin && dateExcursion < today) {
      return { 
        content: [{ type: 'text', text: "Impossible de réserver une excursion dans le passé." }], 
        isError: true 
      };
    }

    if (!args.dureeHeures) {
      return { 
        content: [{ type: 'text', text: 'Pour EXCURSION, dureeHeures est obligatoire (minimum 1).' }], 
        isError: true 
      };
    }
    if (args.dureeHeures < 1) {
      return { 
        content: [{ type: 'text', text: `dureeHeures invalide: "${args.dureeHeures}" (doit être >= 1)` }], 
        isError: true 
      };
    }

    // Calcul montantTotal si non fourni
    if (!args.montantTotal) {
      const offre = await Offre.findById(args.offreID).populate('serviceID');
      if (!offre || !offre.serviceID) {
        return { content: [{ type: 'text', text: "Offre ou service introuvable" }], isError: true };
      }
      const prixBase = offre.serviceID.prixBase || offre.serviceID.prix || 0;
      args.montantTotal = prixBase * Number(args.nbPersonnes);
    }
  }

  else if (args.typeReservation === "INTERNATIONALE") {
    // Vérifications INTERNATIONALES
    if (!args.dateDebutSejour) {
      return { 
        content: [{ type: 'text', text: 'Pour INTERNATIONALE, dateDebutSejour est obligatoire.' }], 
        isError: true 
      };
    }
    if (!dateDebut) {
      return { content: [{ type: 'text', text: `dateDebutSejour invalide: "${args.dateDebutSejour}".` }], isError: true };
    }
    
    if (!isAdmin && dateDebut < today) {
      return { 
        content: [{ type: 'text', text: "Impossible de réserver un voyage international dans le passé." }], 
        isError: true 
      };
    }

    if (!args.paysDestination) {
      return { 
        content: [{ type: 'text', text: 'Pour INTERNATIONALE, paysDestination est obligatoire.' }], 
        isError: true 
      };
    }

    if (!args.numPassport) {
      return { 
        content: [{ type: 'text', text: 'Pour INTERNATIONALE, numPassport est obligatoire.' }], 
        isError: true 
      };
    }

    // Calcul montantTotal si non fourni
    if (!args.montantTotal) {
      const offre = await Offre.findById(args.offreID).populate('serviceID');
      if (!offre || !offre.serviceID) {
        return { content: [{ type: 'text', text: "Offre ou service introuvable" }], isError: true };
      }
      const prixBase = offre.serviceID.prixBase || offre.serviceID.prix || 0;
      args.montantTotal = prixBase * Number(args.nbPersonnes);
    }
  }

  else {
    return { 
      content: [{ type: 'text', text: `typeReservation invalide: "${args.typeReservation}"` }], 
      isError: true 
    };
  }

  // ========== 6. Construction et sauvegarde ==========
  const payload = { 
    ...args,
    clientID: args.clientID,
    dateReservation: dateReservation,
    dateDebutSejour: dateDebut,
    dateFinSejour: dateFin,
    dateExcursion: dateExcursion,
  };

  // Nettoyage des undefined
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const reservation = new Reservation(payload);
  await reservation.save();

  return { 
    content: [{ 
      type: 'text', 
      text: `Réservation créée avec succès. ID: ${reservation._id}\n${JSON.stringify(reservation, null, 2)}` 
    }] 
  };
}

case 'search_reservations': {
  const gate = this.requireRole('ADMIN');
  if (!gate.ok) return this.deny(gate.error, 'Forbidden');

  const filter = {};
  if (args.clientID) {
    if (!isValidObjectId(args.clientID)) return { content: [{ type: 'text', text: `clientID invalide: "${args.clientID}"` }], isError: true };
    filter.clientID = args.clientID;
  }
  if (args.offreID) {
    if (!isValidObjectId(args.offreID)) return { content: [{ type: 'text', text: `offreID invalide: "${args.offreID}"` }], isError: true };
    filter.offreID = args.offreID;
  }
  if (args.chambreID) {
    if (!isValidObjectId(args.chambreID)) return { content: [{ type: 'text', text: `chambreID invalide: "${args.chambreID}"` }], isError: true };
    filter.chambreID = args.chambreID;
  }
  if (args.statut) filter.statut = args.statut;
  if (args.typeReservation) filter.typeReservation = args.typeReservation;

  const dateFrom = parseDateFlexible(args.dateFrom);
  const dateTo = parseDateFlexible(args.dateTo);
  if (args.dateFrom && !dateFrom) return { content: [{ type: 'text', text: `dateFrom invalide: "${args.dateFrom}"` }], isError: true };
  if (args.dateTo && !dateTo) return { content: [{ type: 'text', text: `dateTo invalide: "${args.dateTo}"` }], isError: true };

  if (dateFrom) filter.dateDebutSejour = { ...(filter.dateDebutSejour || {}), $gte: dateFrom };
  if (dateTo) filter.dateFinSejour = { ...(filter.dateFinSejour || {}), $lte: dateTo };

  const limit = Number.isFinite(args.limit) ? Math.min(Math.max(args.limit, 1), 200) : 50;

  const reservations = await Reservation.find(filter)
    .populate('clientID', '-password')
    .populate({ path: 'offreID', populate: { path: 'serviceID' } })
    .populate('chambreID')
    .limit(limit)
    .lean();

  return { content: [{ type: 'text', text: JSON.stringify({ count: reservations.length, reservations }, null, 2) }] };
}

case 'get_reservation_by_id': {
  const auth = this.requireAuth();
  if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

  if (!isValidObjectId(args.reservationID)) return { content: [{ type: 'text', text: `reservationID invalide: "${args.reservationID}"` }], isError: true };

  const reservation = await Reservation.findById(args.reservationID)
    .populate('clientID', '-password')
    .populate({ path: 'offreID', populate: { path: 'serviceID' } });

  if (!reservation) return { content: [{ type: 'text', text: `Réservation introuvable: ${args.reservationID}` }], isError: true };

  const isAdmin = this.SESSION.user.role === "ADMIN";
  const userId = this.getUserId();
  const reservationClientId = reservation.clientID?._id || reservation.clientID;
  if (!isAdmin && String(reservationClientId) !== String(userId)) return this.deny("Cette réservation ne t'appartient pas.", 'Forbidden');

  return { content: [{ type: 'text', text: JSON.stringify(reservation, null, 2) }] };
}

case 'get_reservations_by_client': {
  const auth = this.requireAuth();
  if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

  if (!isValidObjectId(args.clientID)) return { content: [{ type: 'text', text: `clientID invalide: "${args.clientID}"` }], isError: true };

  const isAdmin = this.SESSION.user.role === "ADMIN";
  const userId = this.getUserId();
  if (!isAdmin && String(args.clientID) !== String(userId)) return this.deny("Tu ne peux pas consulter les réservations d’un autre client.", 'Forbidden');

  const reservations = await Reservation.find({ clientID: args.clientID })
    .populate('clientID', '-password')
    .populate({ path: 'offreID', populate: { path: 'serviceID' } });

  return { content: [{ type: 'text', text: JSON.stringify(reservations, null, 2) }] };
}

case 'update_reservation_status': {
  const auth = this.requireAuth();
  if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

  if (!isValidObjectId(args.reservationID)) return { content: [{ type: 'text', text: `reservationID invalide: "${args.reservationID}"` }], isError: true };

  const existing = await Reservation.findById(args.reservationID);
  if (!existing) return { content: [{ type: 'text', text: `Réservation introuvable: ${args.reservationID}` }], isError: true };

  const isAdmin = this.SESSION.user.role === "ADMIN";
  const userId = this.getUserId();
  const isOwner = String(existing.clientID) === String(userId);

  if (!isAdmin) {
    if (!isOwner) return this.deny("Tu ne peux pas modifier le statut d’une réservation qui ne t'appartient pas.", 'Forbidden');
    if (args.statut !== "ANNULEE") return this.deny("Le client peut seulement annuler une réservation (statut=ANNULEE).", 'Forbidden');
    if (existing.statut !== "EN_ATTENTE_PAIEMENT") return this.deny("Annulation interdite (réservation déjà traitée).", 'Forbidden');
  }
const allowedStatus = [
  'EN_ATTENTE_PAIEMENT',
  'CONFIRMEE',
  'ANNULEE',
  'EXPIREE'
];

if (!allowedStatus.includes(args.statut)) {
  return {
    content: [{
      type: 'text',
      text: `statut invalide`
    }],
    isError: true
  };
}


  const updated = await Reservation.findByIdAndUpdate(
    args.reservationID,
    { statut: args.statut },
    { new: true, runValidators: true }
  );

  if (!updated) return { content: [{ type: 'text', text: `Erreur lors de la mise à jour du statut.` }], isError: true };
  return { content: [{ type: 'text', text: `Réservation mise à jour: ${JSON.stringify(updated, null, 2)}` }] };
}
      // ---------- USERS ----------
      case 'get_users': {
        const gate = this.requireRole("ADMIN");
        if (!gate.ok) return this.deny(gate.error, 'Forbidden');
        const users = await Utilisateur.find().select('-password');
        return { content: [{ type: 'text', text: JSON.stringify(users, null, 2) }] };
      }

      case 'create_user': {
        const gate = this.requireRole("ADMIN");
        if (!gate.ok) return this.deny(gate.error, 'Forbidden');

        if (args.role && !["CLIENT", "ADMIN"].includes(args.role)) {
          return { content: [{ type: 'text', text: `role invalide: "${args.role}".` }], isError: true };
        }


const exists = await Utilisateur.findOne({
  email: String(args.email).toLowerCase().trim()
});

if (exists) {
  return {
    content: [{
      type: 'text',
      text: 'Email déjà utilisé.'
    }],
    isError: true
  };
}

        const user = new Utilisateur(args);
        await user.save();
        return { content: [{ type: 'text', text: `Utilisateur créé: ${JSON.stringify(user, null, 2)}` }] };
      }

      case 'get_user_by_id': {
        const auth = this.requireAuth();
        if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

        if (!isValidObjectId(args.userID)) return { content: [{ type: 'text', text: `userID invalide: "${args.userID}"` }], isError: true };

        const isAdmin = this.SESSION.user.role === "ADMIN";
        const myId = this.getUserId();
        if (!isAdmin && String(args.userID) !== String(myId)) return this.deny("Tu ne peux pas consulter le profil d’un autre utilisateur.", 'Forbidden');

        const user = await Utilisateur.findById(args.userID).select('-password');
        if (!user) return { content: [{ type: 'text', text: `Utilisateur introuvable: ${args.userID}` }], isError: true };
        return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
      }

      // ---------- CHAMBRES ----------
      case 'get_chambres': {
        const auth = this.requireAuth();
        if (!auth.ok) return this.deny(auth.error, 'Unauthorized');
        const chambres = await Chambre.find();
        return { content: [{ type: 'text', text: JSON.stringify(chambres, null, 2) }] };
      }
    

      case 'get_chambre_by_id': {
  const auth = this.requireAuth();

  if (!auth.ok) {
    return this.deny(auth.error, 'Unauthorized');
  }

  if (!isValidObjectId(args.chambreID)) {
    return {
      content: [{
        type: 'text',
        text: `chambreID invalide: "${args.chambreID}"`
      }],
      isError: true
    };
  }

  const chambre = await Chambre.findById(args.chambreID)
    .populate('hebergementID');

  if (!chambre) {
    return {
      content: [{
        type: 'text',
        text: `Chambre introuvable: ${args.chambreID}`
      }],
      isError: true
    };
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(chambre, null, 2)
    }]
  };
}case 'create_chambre': {
  const gate = this.requireRole("ADMIN");

  if (!gate.ok) {
    return this.deny(gate.error, 'Forbidden');
  }

  if (!isValidObjectId(args.hebergementID)) {
    return {
      content: [{
        type: 'text',
        text: `hebergementID invalide: "${args.hebergementID}"`
      }],
      isError: true
    };
  }

  const hebergement = await Hebergement.findById(args.hebergementID);

  if (!hebergement) {
    return {
      content: [{
        type: 'text',
        text: `Hebergement introuvable: ${args.hebergementID}`
      }],
      isError: true
    };
  }

  const existing = await Chambre.findOne({
    hebergementID: args.hebergementID,
    numeroChambre: String(args.numeroChambre).trim()
  });

  if (existing) {
    return {
      content: [{
        type: 'text',
        text: `La chambre ${args.numeroChambre} existe déjà dans cet hébergement.`
      }],
      isError: true
    };
  }

  const allowedTypes = [
    'SINGLE',
    'DOUBLE',
    'TWIN',
    'SUITE',
    'DELUXE',
    'FAMILIALE'
  ];

  const normalizedType = String(args.typeChambre || '')
    .trim()
    .toUpperCase();

  if (!allowedTypes.includes(normalizedType)) {
    return {
      content: [{
        type: 'text',
        text: `typeChambre invalide`
      }],
      isError: true
    };
  }

  const chambre = new Chambre({
    ...args,
    numeroChambre: String(args.numeroChambre).trim(),
    typeChambre: normalizedType
  });

  await chambre.save();

  return {
    content: [{
      type: 'text',
      text: `Chambre créée: ${JSON.stringify(chambre, null, 2)}`
    }]
  };
}
       
      case 'search_chambres_available': {
  const auth = this.requireAuth();
  if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

  const dateDebut = parseDateFlexible(args.dateDebut);
  const dateFin = parseDateFlexible(args.dateFin);

  if (!dateDebut) return { content: [{ type: 'text', text: `dateDebut invalide: "${args.dateDebut}"` }], isError: true };
  if (!dateFin) return { content: [{ type: 'text', text: `dateFin invalide: "${args.dateFin}"` }], isError: true };
  if (dateFin <= dateDebut) return { content: [{ type: 'text', text: 'Période invalide: dateFin < dateDebut' }], isError: true };

  const chambreFilter = { disponible: true };

  if (args.hebergementID) {
    if (!isValidObjectId(args.hebergementID)) {
      return { content: [{ type: 'text', text: `hebergementID invalide: "${args.hebergementID}"` }], isError: true };
    }
    chambreFilter.hebergementID = args.hebergementID;
  }

  if (args.typeChambre) chambreFilter.typeChambre = args.typeChambre;

  if (Number.isFinite(args.capaciteMin)) {
    chambreFilter.capacite = { $gte: args.capaciteMin };
  }

  if (Number.isFinite(args.prixMax)) {
    chambreFilter.prixParNuit = { $lte: args.prixMax };
  }

  const limit = Number.isFinite(args.limit) ? Math.min(Math.max(args.limit, 1), 200) : 50;

  // 1) chambres candidates
  const chambres = await Chambre.find(chambreFilter).limit(limit).lean();
  if (!chambres.length) {
    return { content: [{ type: 'text', text: JSON.stringify({ count: 0, chambres: [] }, null, 2) }] };
  }

  const chambreIds = chambres.map((c) => c._id);

  // 2) réservations HOTEL en conflit sur la période (hors ANNULEE)
  const conflits = await Reservation.find({
    typeReservation: 'HOTEL',
    chambreID: { $in: chambreIds },
   statut: { $nin: ['ANNULEE', 'EXPIREE'] },
    dateDebutSejour: { $lte: dateFin },
    dateFinSejour: { $gte: dateDebut },
  }).select('chambreID').lean();

  const conflictSet = new Set(conflits.map((r) => String(r.chambreID)));

  // 3) disponibles = candidates - conflits
  const disponibles = chambres.filter((c) => !conflictSet.has(String(c._id)));

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(
        {
          count: disponibles.length,
          periode: { dateDebut: args.dateDebut, dateFin: args.dateFin },
          chambres: disponibles
        },
        null,
        2
      )
    }]
  };
}
      // ---------- SERVICES ----------
      case 'get_services': {
        const auth = this.requireAuth();
        if (!auth.ok) return this.deny(auth.error, 'Unauthorized');
        const services = await Service.find();
        return { content: [{ type: 'text', text: JSON.stringify(services, null, 2) }] };
      }

      case 'create_service': {
        const gate = this.requireRole("ADMIN");
        if (!gate.ok) return this.deny(gate.error, 'Forbidden');

        if (!args.titre || typeof args.titre !== 'string' || !args.titre.trim()) {
          return { content: [{ type: 'text', text: `titre est obligatoire.` }], isError: true };
        }

        if (!args.typeService || !["HEBERGEMENT", "DESTINATION", "ACTIVITE"].includes(args.typeService)) {
          return { content: [{ type: 'text', text: `typeService invalide.` }], isError: true };
        }

        const payload = { ...args }; Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
        const service = new Service(payload); await service.save();
        return { content: [{ type: 'text', text: `Service créé: ${JSON.stringify(service, null, 2)}` }] };
      }
case 'update_service': {
  const gate = this.requireRole('ADMIN');
  if (!gate.ok) return this.deny(gate.error, 'Forbidden');

  const { serviceID } = args;
  if (!serviceID || !isValidObjectId(serviceID)) {
    return { content: [{ type: 'text', text: `serviceID invalide: "${serviceID}"` }], isError: true };
  }

  const update = {};
  const allowed = [
    'titre','description','prixBase','devise','localisation','typeService',
    'categorie','adresse','nbChambres',
    'typeDestination','avis',
    'typeActivite','duree'
  ];

  for (const k of allowed) {
    if (args[k] !== undefined) update[k] = args[k];
  }

  // validations minimales
  if (update.typeService && !['HEBERGEMENT', 'DESTINATION', 'ACTIVITE'].includes(update.typeService)) {
    return { content: [{ type: 'text', text: `typeService invalide: "${update.typeService}"` }], isError: true };
  }
  if (update.prixBase !== undefined && (typeof update.prixBase !== 'number' || update.prixBase < 0)) {
    return { content: [{ type: 'text', text: `prixBase invalide: "${update.prixBase}"` }], isError: true };
  }
  if (update.avis !== undefined && (typeof update.avis !== 'number' || update.avis < 0)) {
    return { content: [{ type: 'text', text: `avis invalide: "${update.avis}"` }], isError: true };
  }

  if (Object.keys(update).length === 0) {
    return { content: [{ type: 'text', text: 'Aucun champ à mettre à jour.' }], isError: true };
  }

  const updated = await Service.findByIdAndUpdate(
  serviceID,
  update,
  {
    new: true,
    runValidators: true
  }
).lean();
  if (!updated) return { content: [{ type: 'text', text: `Service introuvable: ${serviceID}` }], isError: true };

  return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
}
      // ---------- OFFRES ----------
      case 'get_offres': {
        const auth = this.requireAuth(); if (!auth.ok) return this.deny(auth.error, 'Unauthorized');
        const offres = await Offre.find().populate('serviceID'); return { content: [{ type: 'text', text: JSON.stringify(offres, null, 2) }] };
      }

      case 'create_offre': {
        const gate = this.requireRole("ADMIN"); if (!gate.ok) return this.deny(gate.error, 'Forbidden');
        if (!args.serviceID || !isValidObjectId(args.serviceID)) return { content: [{ type: 'text', text: `serviceID invalide: "${args.serviceID}"` }], isError: true };
        const offre = new Offre(args); await offre.save(); return { content: [{ type: 'text', text: `Offre créée: ${JSON.stringify(offre, null, 2)}` }] };
      }

      case 'get_offres_by_service': {
        const auth = this.requireAuth(); if (!auth.ok) return this.deny(auth.error, 'Unauthorized');
        if (!isValidObjectId(args.serviceID)) return { content: [{ type: 'text', text: `serviceID invalide: "${args.serviceID}"` }], isError: true };
        const offres = await Offre.find({ serviceID: args.serviceID }).populate('serviceID'); return { content: [{ type: 'text', text: JSON.stringify(offres, null, 2) }] };
      }
case 'search_offres': {
  const auth = this.requireAuth();
  if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

  const filter = {};

  if (args.serviceID) {
    if (!isValidObjectId(args.serviceID)) {
      return { content: [{ type: 'text', text: `serviceID invalide: "${args.serviceID}"` }], isError: true };
    }
    filter.serviceID = args.serviceID;
  }

  if (Number.isFinite(args.minPrice) || Number.isFinite(args.maxPrice)) {
    filter.prixAPartirDe = {};
    if (Number.isFinite(args.minPrice)) filter.prixAPartirDe.$gte = args.minPrice;
    if (Number.isFinite(args.maxPrice)) filter.prixAPartirDe.$lte = args.maxPrice;
  }

  if (args.keyword && String(args.keyword).trim()) {
    const kw = String(args.keyword).trim();
    filter.$or = [
      { titre: { $regex: kw, $options: 'i' } },
      { descriptionCourte: { $regex: kw, $options: 'i' } },
    ];
  }

  const limit = Number.isFinite(args.limit) ? Math.min(Math.max(args.limit, 1), 200) : 50;

  const offres = await Offre.find(filter).populate('serviceID').limit(limit).lean();

  return { content: [{ type: 'text', text: JSON.stringify({ count: offres.length, offres }, null, 2) }] };
}
case 'update_offre': {
  const gate = this.requireRole('ADMIN');
  if (!gate.ok) return this.deny(gate.error, 'Forbidden');

  const { offreID } = args;
  if (!offreID || !isValidObjectId(offreID)) {
    return { content: [{ type: 'text', text: `offreID invalide: "${offreID}"` }], isError: true };
  }

  const update = {};
  if (args.titre !== undefined) update.titre = args.titre;
  if (args.descriptionCourte !== undefined) update.descriptionCourte = args.descriptionCourte;

  if (args.prixAPartirDe !== undefined) {
    if (typeof args.prixAPartirDe !== 'number' || args.prixAPartirDe < 0) {
      return { content: [{ type: 'text', text: `prixAPartirDe invalide: "${args.prixAPartirDe}"` }], isError: true };
    }
    update.prixAPartirDe = args.prixAPartirDe;
  }

  if (args.serviceID !== undefined) {
    if (!isValidObjectId(args.serviceID)) {
      return { content: [{ type: 'text', text: `serviceID invalide: "${args.serviceID}"` }], isError: true };
    }
    update.serviceID = args.serviceID;
  }

  if (Object.keys(update).length === 0) {
    return { content: [{ type: 'text', text: 'Aucun champ à mettre à jour.' }], isError: true };
  }

  const updated = await Offre.findByIdAndUpdate(offreID, update, { new: true,
  runValidators: true })
    .populate('serviceID')
    .lean();

  if (!updated) {
    return { content: [{ type: 'text', text: `Offre introuvable: ${offreID}` }], isError: true };
  }

  return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
}

      // ---------- AVIS ----------
      case 'get_avis': {
        const auth = this.requireAuth(); if (!auth.ok) return this.deny(auth.error, 'Unauthorized');
        const avis = await Avis.find().populate({ path: 'clientID', select: '-password' }).populate({ path: 'reservationID', populate: [{ path: 'clientID', select: '-password' }, { path: 'offreID' }] });
        return { content: [{ type: 'text', text: JSON.stringify(avis, null, 2) }] };
      }

      case 'create_avis': {
        const auth = this.requireAuth(); if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

        const isAdmin = this.SESSION.user.role === "ADMIN";
        const userId = this.getUserId(); if (!userId) return this.deny("Impossible de lire l'id utilisateur depuis le token.", 'Unauthorized');

        if (!args.reservationID || !isValidObjectId(args.reservationID)) return { content: [{ type: 'text', text: `reservationID invalide: "${args.reservationID}"` }], isError: true };

        let finalClientId;
        if (!isAdmin) {
          if (args.clientID && String(args.clientID) !== String(userId)) {
            return { content: [{ type: 'text', text: 'Interdit: vous ne pouvez pas créer un avis au nom d un autre client.' }], isError: true };
          }
          finalClientId = String(userId);
        } else {
          finalClientId = args.clientID;
        }

        const n = Number(args.note);
        if (!Number.isInteger(n) || n < 1 || n > 5) return { content: [{ type: 'text', text: `note invalide: "${args.note}"` }], isError: true };

        const reservation = await Reservation.findById(args.reservationID);
        if (!reservation) return { content: [{ type: 'text', text: `Réservation introuvable: ${args.reservationID}` }], isError: true };

        if (!isAdmin && String(reservation.clientID) !== String(finalClientId)) return this.deny("Tu ne peux pas laisser un avis sur une réservation qui ne t'appartient pas.", 'Forbidden');

        const already = await Avis.findOne({ reservationID: args.reservationID, clientID: finalClientId });
        if (already) return { content: [{ type: 'text', text: `Avis déjà existant pour cette réservation.` }], isError: true };

        const parsedDateAvis = parseDateFlexible(args.dateAvis) || new Date();
        const payload = { reservationID: args.reservationID, clientID: finalClientId, note: n, commentaire: args.commentaire || '', dateAvis: parsedDateAvis };
        const avis = new Avis(payload); await avis.save();
        return { content: [{ type: 'text', text: `Avis créé: ${JSON.stringify(avis, null, 2)}` }] };
      }

      case 'get_avis_by_reservation': {
        const auth = this.requireAuth(); if (!auth.ok) return this.deny(auth.error, 'Unauthorized');
        if (!isValidObjectId(args.reservationID)) return { content: [{ type: 'text', text: `reservationID invalide: "${args.reservationID}"` }], isError: true };
        const avis = await Avis.find({ reservationID: args.reservationID }).populate('clientID').populate('reservationID');
        return { content: [{ type: 'text', text: JSON.stringify(avis, null, 2) }] };
      }
       
      case 'delete_avis': {
  const gate = this.requireRole('ADMIN');
  if (!gate.ok) return this.deny(gate.error, 'Forbidden');

  const { avisID } = args;

  if (!avisID || !isValidObjectId(avisID)) {
    return { content: [{ type: 'text', text: `avisID invalide: "${avisID}"` }], isError: true };
  }

  const deleted = await Avis.findByIdAndDelete(avisID);
  if (!deleted) {
    return { content: [{ type: 'text', text: `Avis introuvable: ${avisID}` }], isError: true };
  }

  return {
    content: [{ type: 'text', text: `Avis supprimé définitivement: ${avisID}` }],
  };
}
      // ---------- PAIEMENTS ----------
      case 'get_paiements': {
        const gate = this.requireRole("ADMIN"); if (!gate.ok) return this.deny(gate.error, 'Forbidden');
        const paiements = await Paiement.find().populate({ path: 'reservationID', populate: [{ path: 'clientID' }, { path: 'offreID' }] });
        return { content: [{ type: 'text', text: JSON.stringify(paiements, null, 2) }] };
      }

      case 'create_paiement': {
  const auth = this.requireAuth();
  if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

  const isAdmin = this.SESSION.user.role === "ADMIN";
  const userId = this.getUserId();

  // validation reservationID
  if (!args.reservationID || !isValidObjectId(args.reservationID)) {
    return { content: [{ type: 'text', text: `reservationID invalide: "${args.reservationID}"` }], isError: true };
  }

  //  enum methode paiement
  const METHODES = ["CARTE", "ESPECES", "PAYPAL", "STRIPE", "VIREMENT"];
  const methode = typeof args.methodePaiement === 'string'
    ? args.methodePaiement.trim().toUpperCase()
    : null;

  if (!METHODES.includes(methode)) {
    return {
      content: [{ type: 'text', text: `methodePaiement invalide. Choix: ${METHODES.join(", ")}` }],
      isError: true
    };
  }

  // récupérer réservation
  const reservation = await Reservation.findById(args.reservationID);
  if (!reservation) {
    return { content: [{ type: 'text', text: `Réservation introuvable: ${args.reservationID}` }], isError: true };
  }

  //  sécurité propriétaire
  if (!isAdmin && String(reservation.clientID) !== String(userId)) {
    return this.deny("Tu ne peux pas payer une réservation qui ne t'appartient pas.", 'Forbidden');
  }

  //  déjà payé ?
  const alreadyAccepted = await Paiement.exists({
    reservationID: args.reservationID,
    statut: 'ACCEPTE'
  });

  if (alreadyAccepted) {
    return {
      content: [{ type: 'text', text: `Un paiement "ACCEPTE" existe déjà pour cette réservation.` }],
      isError: true
    };
  }

  // montant AUTO (sécurité)
  const montant = reservation.montantTotal;

  //  date paiement
  let datePaiement = new Date();
  if (args.datePaiement) {
    const parsed = parseDateFlexible(args.datePaiement);
    if (!parsed) {
      return { content: [{ type: 'text', text: `datePaiement invalide: "${args.datePaiement}"` }], isError: true };
    }
    
    datePaiement = parsed;
  }

const allowedPaiementStatus = [
  'EN_COURS',
  'ACCEPTE',
  'REFUSE'
];

if (
  args.statut &&
  !allowedPaiementStatus.includes(args.statut)
) {
  return {
    content: [{
      type: 'text',
      text: 'statut paiement invalide'
    }],
    isError: true
  };
}

  // 👮 statut sécurisé
  let statut = "EN_COURS";
  if (isAdmin && args.statut) {
    statut = args.statut;
  }

  const paiement = new Paiement({
    reservationID: args.reservationID,
    methodePaiement: methode,
    transactionId: args.transactionId || "TXN_" + Date.now(),
    montant,
    statut,
    datePaiement
  });

  await paiement.save();

  // 🔥 AUTO CONFIRM RESERVATION
  let updatedReservation = null;
  if (paiement.statut === 'ACCEPTE') {
    updatedReservation = await Reservation.findByIdAndUpdate(
      paiement.reservationID,
      { statut: 'CONFIRMEE', paiementID: paiement._id },
      { new: true }
    );
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ paiement, updatedReservation }, null, 2)
    }]
  };
}
      case 'get_paiements_by_reservation': {
        const auth = this.requireAuth(); if (!auth.ok) return this.deny(auth.error, 'Unauthorized');
        if (!isValidObjectId(args.reservationID)) return { content: [{ type: 'text', text: `reservationID invalide: "${args.reservationID}"` }], isError: true };
        const reservation = await Reservation.findById(args.reservationID);
        if (!reservation) return { content: [{ type: 'text', text: `Réservation introuvable: ${args.reservationID}` }], isError: true };

        const isAdmin = this.SESSION.user.role === "ADMIN"; const userId = this.getUserId();
        if (!isAdmin && String(reservation.clientID) !== String(userId)) return this.deny("Tu ne peux pas consulter les paiements d’une réservation qui ne t'appartient pas.", 'Forbidden');

        const paiements = await Paiement.find({ reservationID: args.reservationID }).populate({ path: 'reservationID', populate: [{ path: 'clientID' }, { path: 'offreID' }] });
        return { content: [{ type: 'text', text: JSON.stringify(paiements, null, 2) }] };
      }

      // ---------- FACTURES ----------
      case 'get_my_factures': {
        const auth = this.requireAuth(); if (!auth.ok) return this.deny(auth.error, 'Unauthorized');

        const userId = this.getUserId();
        if (!userId) return this.deny("Impossible de lire l'id utilisateur depuis le token.", 'Unauthorized');

        const reservations = await Reservation.find({ clientID: userId }).select('_id');
        const reservationIds = reservations.map(r => r._id);
        if (!reservationIds.length) return { content: [{ type: 'text', text: JSON.stringify([]) }] };

        const paiementsAcceptes = await Paiement.find({ reservationID: { $in: reservationIds }, statut: 'ACCEPTE' }).select('_id');
        if (!paiementsAcceptes.length) return { content: [{ type: 'text', text: JSON.stringify([]) }] };

        const paiementIds = paiementsAcceptes.map(p => p._id);

        const factures = await Facture.find({ paiementID: { $in: paiementIds } })
          .populate({ path: 'paiementID', populate: { path: 'reservationID', populate: [{ path: 'clientID' }, { path: 'offreID' }] } });

        return { content: [{ type: 'text', text: JSON.stringify(factures, null, 2) }] };
      }

      case 'get_facture_by_paiement': {
        const auth = this.requireAuth(); if (!auth.ok) return this.deny(auth.error, 'Unauthorized');
        if (!isValidObjectId(args.paiementID)) return { content: [{ type: 'text', text: `paiementID invalide: "${args.paiementID}"` }], isError: true };

        const isAdmin = this.SESSION.user.role === "ADMIN"; const userId = this.getUserId();
        const facture = await Facture.findOne({ paiementID: args.paiementID }).populate({ path: 'paiementID', populate: { path: 'reservationID', populate: [{ path: 'clientID' }, { path: 'offreID' }] } });
        if (!facture) return { content: [{ type: 'text', text: `Aucune facture trouvée pour paiementID=${args.paiementID}` }], isError: true };

        if (!isAdmin) {
          const factureClientId = facture?.paiementID?.reservationID?.clientID?._id || facture?.paiementID?.reservationID?.clientID;
          if (String(factureClientId) !== String(userId)) return this.deny("Tu ne peux pas consulter la facture d’un autre client.", 'Forbidden');
        }

        return { content: [{ type: 'text', text: JSON.stringify(facture, null, 2) }] };
      }

      case 'get_factures': {
        const gate = this.requireRole("ADMIN"); if (!gate.ok) return this.deny(gate.error, 'Forbidden');
        const factures = await Facture.find().populate('paiementID'); return { content: [{ type: 'text', text: JSON.stringify(factures, null, 2) }] };
      }

      case 'create_facture': {
        const gate = this.requireRole("ADMIN"); if (!gate.ok) return this.deny(gate.error, 'Forbidden');
        if (!isValidObjectId(args.paiementID)) return { content: [{ type: 'text', text: `paiementID invalide: "${args.paiementID}"` }], isError: true };
        const paiement = await Paiement.findById(args.paiementID); if (!paiement) return { content: [{ type: 'text', text: `Paiement introuvable: ${args.paiementID}` }], isError: true };
        if (paiement.statut !== "ACCEPTE") return { content: [{ type: 'text', text: `Facture interdite: paiement.statut=${paiement.statut}` }], isError: true };
        const already = await Facture.exists({ paiementID: args.paiementID }); if (already) return { content: [{ type: 'text', text: `Une facture existe déjà pour ce paiement.` }], isError: true };
        const dateEmission = parseDateFlexible(args.dateEmission) || new Date();
        const payload = { ...args, dateEmission }; Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
        if (args.montantTTC < args.montantHT) {
  return {
    content: [{
      type: 'text',
      text: 'montantTTC doit être >= montantHT'
    }],
    isError: true
  };
}
        const facture = new Facture(payload); await facture.save();
        return { content: [{ type: 'text', text: `Facture créée: ${JSON.stringify(facture, null, 2)}` }] };
      }

      default:
        return { content: [{ type: 'text', text: `Outil inconnu: ${name}` }], isError: true };
    }
  } catch (error) {
    console.error('Tool call error:', error);
    return { content: [{ type: 'text', text: `Erreur: ${error.message}` }], isError: true };
  }
}

  // run STDIO transport (pour usage direct)
  async runStdIo() {
    const transport = new this.StdioServerTransport();
    await this.server.connect(transport);
    console.error('Hotel MCP Server running on stdio');
  }
}

// Factory : connecte mongoose si besoin et instancie HotelMCPServer avec modules SDK
module.exports.createHotelMCPInstance = async function createHotelMCPInstance() {
  const MONGO_URI = process.env.DATABASECLOUD || process.env.MONGO_URI || process.env.DATABASE || 'mongodb://127.0.0.1:27017/base';
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI, { dbName: 'base' });
    console.error('MCP Server: MongoDB connected (factory)');
  }

  // dynamic import des SDK modules
  const [{ Server }, { StdioServerTransport }, { ListToolsRequestSchema, CallToolRequestSchema }] = await Promise.all([
    import('@modelcontextprotocol/sdk/server/index.js'),
    import('@modelcontextprotocol/sdk/server/stdio.js'),
    import('@modelcontextprotocol/sdk/types.js'),
  ]);

  const instance = new HotelMCPServer({ Server, StdioServerTransport, ListToolsRequestSchema, CallToolRequestSchema });
  await instance.autoLoginAsAdmin();
  return instance;
};

// Si on exécute le fichier directement, lance le serveur STDIO (comportement original)
if (require.main === module) {
  (async () => {
    try {
      const MONGO_URI = process.env.DATABASECLOUD || process.env.MONGO_URI || process.env.DATABASE || 'mongodb://127.0.0.1:27017/base';
      await mongoose.connect(MONGO_URI, { dbName: 'base' });
      console.error('MCP Server: MongoDB connected (standalone)');
      const [{ Server }, { StdioServerTransport }, { ListToolsRequestSchema, CallToolRequestSchema }] = await Promise.all([
        import('@modelcontextprotocol/sdk/server/index.js'),
        import('@modelcontextprotocol/sdk/server/stdio.js'),
        import('@modelcontextprotocol/sdk/types.js'),
      ]);
      const server = new HotelMCPServer({ Server, StdioServerTransport, ListToolsRequestSchema, CallToolRequestSchema });
      await server.autoLoginAsAdmin();
      await server.runStdIo();
    } catch (err) {
      console.error('MCP startup error:', err);
      process.exit(1);
    }
  })();
}