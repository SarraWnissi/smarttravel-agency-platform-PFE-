const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Models
const Paiement = require('../models/paiement');
const Reservation = require('../models/reservation');
const Facture = require('../models/facture');
const Chambre = require('../models/chambre');
const Utilisateur = require('../models/utilisateur');

// Middlewares
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');
const { notifyPaiementAccepte, notifyPaiementRefuse } = require('../services/notificationService');

// Stripe
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.use(verifyToken);

const METHODES = ['CARTE', 'ESPECES', 'PAYPAL', 'STRIPE', 'VIREMENT'];

/**
 * Helpers
 */
function badRequest(res, message) {
  return res.status(400).json({ message });
}
function forbidden(res, message) {
  return res.status(403).json({ message });
}
function conflict(res, message) {
  return res.status(409).json({ message });
}

function genNumeroFacture(paiementId) {
  const year = new Date().getFullYear();
  const suffix = String(paiementId).slice(-6).toUpperCase();
  return `FAC-${year}-${suffix}`;
}

/**
 * Crée la facture si elle n'existe pas déjà pour ce paiement (sans condition sur le statut).
 * Utilisé dès la création du paiement pour tous les modes hors STRIPE.
 */
async function createFactureForPaiement(paiement) {
  const already = await Facture.exists({ paiementID: paiement._id });
  if (already) return null;

  const montantTTC = Number(paiement.montant || 0);
  const facture = new Facture({
    paiementID: paiement._id,
    numeroFacture: genNumeroFacture(paiement._id),
    dateEmission: new Date(),
    montantHT: montantTTC,
    montantTTC,
  });
  await facture.save();
  return facture;
}

/**
 * AUTO-ONLY: assure la facture lors de l'acceptation admin (idempotent).
 * Si la facture existe déjà (créée à la soumission), on la retourne sans doublon.
 */
async function ensureFactureForPaiement(paiement, session) {
  if (!paiement || paiement.statut !== 'ACCEPTE') return null;

  const already = await Facture.exists({ paiementID: paiement._id }).session(session);
  if (already) return null;

  const montantTTC = Number(paiement.montant || 0);
  const facture = new Facture({
    paiementID: paiement._id,
    numeroFacture: genNumeroFacture(paiement._id),
    dateEmission: new Date(),
    montantHT: montantTTC,
    montantTTC,
  });
  await facture.save({ session });
  return facture;
}

/**
 * POST /paiements
 * Démarrer un paiement (CLIENT/ADMIN)
 *
 * Règles:
 * - montant = reservation.montantTotal (jamais depuis req.body)
 * - statut initial = EN_COURS (le client ne contrôle pas statut)
 * - 1 seule ACCEPTÉ par réservation
 * - le client ne peut payer que ses réservations
 */
router.post('/', async (req, res) => {
  try {
    const { reservationID, methodePaiement, transactionId } = req.body;

    if (!reservationID || !mongoose.isValidObjectId(reservationID)) {
      return badRequest(res, 'reservationID invalide');
    }

    const methode = String(methodePaiement || '').trim().toUpperCase();
    if (!METHODES.includes(methode)) {
      return badRequest(res, `methodePaiement invalide. Valeurs: ${METHODES.join(', ')}`);
    }

    // Charger réservation
    const reservation = await Reservation.findById(reservationID);
    if (!reservation) return res.status(404).json({ message: 'Réservation introuvable' });

    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = String(reservation.clientID) === String(req.user.id);

    if (!isAdmin && !isOwner) {
      return forbidden(res, "Cette réservation ne t'appartient pas.");
    }

    // ✅ Vérification cohérence B (date paiement vs date séjour/activité)
    // - STRIPE/CARTE/PAYPAL => paiement doit être AVANT la date de début
    // - ESPECES/VIREMENT   => paiement autorisé le jour du début (ou avant)
    const now = new Date();

    // Date de référence selon type
    // EXCURSION: priorité dateExcursion si existe, sinon dateDebutSejour
    // HOTEL/INTERNATIONALE: dateDebutSejour
    let referenceDate = null;
    if (reservation.typeReservation === 'EXCURSION') {
      referenceDate = reservation.dateExcursion || reservation.dateDebutSejour || null;
    } else {
      referenceDate = reservation.dateDebutSejour || null;
    }

    if (referenceDate) {
      const ref = new Date(referenceDate);
      if (!isNaN(ref.getTime())) {
        if (['STRIPE', 'CARTE', 'PAYPAL'].includes(methode)) {
          // strictement avant le début
          if (now >= ref) {
            return badRequest(
              res,
              "Paiement en ligne (STRIPE/CARTE/PAYPAL) doit être effectué avant la date du séjour/activité."
            );
          }
        }

        if (['ESPECES', 'VIREMENT'].includes(methode)) {
          // autorisé le jour du début (ou avant)
          // -> on compare avec la fin de la journée du début
          const endOfRefDay = new Date(ref);
          endOfRefDay.setHours(23, 59, 59, 999);

          if (now > endOfRefDay) {
            return badRequest(
              res,
              "Paiement ESPECES/VIREMENT n'est autorisé que jusqu'au jour du début du séjour/activité."
            );
          }
        }
      }
    }

    // Bloquer si déjà accepté
    const alreadyAccepted = await Paiement.exists({ reservationID, statut: 'ACCEPTE' });
    if (alreadyAccepted) return badRequest(res, 'Déjà payé: un paiement ACCEPTÉ existe déjà.');

    // Montant FORCÉ
    const montant = Number(reservation.montantTotal || 0);
    if (!Number.isFinite(montant) || montant <= 0) {
      return badRequest(res, `Montant réservation invalide: ${montant}`);
    }

    // Si un paiement EN_COURS existe déjà, on le réutilise (mise à jour méthode + date)
    let paiement = await Paiement.findOne({ reservationID, statut: 'EN_COURS' });
    if (paiement) {
      paiement.methodePaiement = methode;
      paiement.datePaiement = now;
      if (transactionId) paiement.transactionId = transactionId;
      await paiement.save();
    } else {
      paiement = new Paiement({
        reservationID,
        methodePaiement: methode,
        transactionId: transactionId || undefined,
        montant,
        statut: 'EN_COURS',
        datePaiement: now,
      });
      await paiement.save();
    }

    // Pour tous les modes hors STRIPE : créer la facture en base dès maintenant
    let factureImmediate = null;
    if (methode !== 'STRIPE') {
      factureImmediate = await createFactureForPaiement(paiement);
    }

    // Réponse selon méthode
    if (methode === 'VIREMENT') {
      const reference = `VIR-${reservationID.slice(-6)}-${Date.now()}`;
      return res.status(201).json({
        paiement,
        facture: factureImmediate,
        instructions: {
          type: 'VIREMENT',
          rib: 'TN59 1000 0000 1234 5678 9012',
          banque: 'Banque Demo',
          reference,
          note: 'Indiquez la reference dans le libellé du virement.',
        },
      });
    }

    if (methode === 'ESPECES') {
      return res.status(201).json({
        paiement,
        facture: factureImmediate,
        instructions: {
          type: 'ESPECES',
          note: "Paiement à effectuer sur place. Un admin confirmera la réception.",
        },
      });
    }

    if (methode === 'CARTE') {
      return res.status(201).json({
        paiement,
        facture: factureImmediate,
        instructions: {
          type: 'CARTE',
          note: "Paiement carte en attente. Un admin confirmera (simulation).",
        },
      });
    }

    if (methode === 'PAYPAL') {
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/paypal/simulate?paiementID=${paiement._id}`;
      return res.status(201).json({
        paiement,
        facture: factureImmediate,
        redirectUrl,
        instructions: {
          type: 'PAYPAL',
          note: "Simulation PayPal: redirection vers une page de simulation.",
        },
      });
    }

    if (methode === 'STRIPE') {
      const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              product_data: { name: `Réservation #${reservationID.slice(-6).toUpperCase()}` },
              unit_amount: Math.round(montant * 100),
            },
          },
        ],
        success_url: `${frontend}/payment/success?session_id={CHECKOUT_SESSION_ID}&paiementID=${paiement._id}&reservationID=${reservationID}&montant=${montant}&method=STRIPE`,
        cancel_url: `${frontend}/payment/cancel?paiementID=${paiement._id}`,
        metadata: {
          paiementID: String(paiement._id),
          reservationID: String(reservationID),
        },
      });

      return res.status(201).json({
        paiement,
        checkoutUrl: session.url,
        stripeSessionId: session.id
      });
    }

    return res.status(201).json({ paiement });
  } catch (err) {
    if (err?.code === 11000) {
      return conflict(res, 'Conflit: paiement ACCEPTÉ déjà existant pour cette réservation.');
    }
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PUT /paiements/:id/accept
 * ADMIN: accepter un paiement
 * AUTO-ONLY: génère aussi la facture automatiquement
 */
router.put('/:id/accept', authorizeRole('ADMIN'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const paiementID = req.params.id;
    if (!mongoose.isValidObjectId(paiementID)) {
      await session.abortTransaction(); session.endSession();
      return badRequest(res, 'paiementID invalide');
    }

    const paiement = await Paiement.findById(paiementID).session(session);
    if (!paiement) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ message: 'Paiement introuvable' });
    }

    // Idempotent: si déjà accepté, on s'assure juste que la facture existe
    if (paiement.statut === 'ACCEPTE') {
      await ensureFactureForPaiement(paiement, session);
      await session.commitTransaction();
      session.endSession();
      return res.json(paiement);
    }

    // Bloquer si déjà accepté par un autre paiement (paiement total)
    const alreadyAccepted = await Paiement.exists({
      reservationID: paiement.reservationID,
      statut: 'ACCEPTE',
    }).session(session);

    if (alreadyAccepted) {
      await session.abortTransaction(); session.endSession();
      return conflict(res, 'Un paiement ACCEPTÉ existe déjà pour cette réservation.');
    }
const reservation = await Reservation.findById(
  paiement.reservationID
).session(session);

if (!reservation) {
  throw new Error("Réservation introuvable");
}

if (reservation.typeReservation === "HOTEL") {

  const chambre = await Chambre.findById(
    reservation.chambreID
  ).session(session);

  if (!chambre || !chambre.disponible) {
    throw new Error("Chambre indisponible");
  }
}
    // Accepter paiement
    paiement.statut = 'ACCEPTE';
    paiement.datePaiement = new Date();
    await paiement.save({ session });

    // AUTO: générer facture et confirmer réservation
    const facture = await ensureFactureForPaiement(paiement, session);

    await Reservation.findByIdAndUpdate(
      paiement.reservationID,
      { statut: 'CONFIRMEE' },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    // Notification email/SMS au client
    Utilisateur.findById(reservation.clientID).select('email firstname lastname telephone').lean()
      .then(client => {
        if (client) {
          notifyPaiementAccepte({
            email: client.email,
            telephone: client.telephone,
            nom: `${client.firstname} ${client.lastname}`,
            reservation,
            facture,
          }).catch(console.error);
        }
      }).catch(console.error);

    return res.json(paiement);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    if (err?.code === 11000) {
      return conflict(res, 'Conflit DB: paiement ACCEPTÉ ou facture déjà existante.');
    }

    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PUT /paiements/:id/refuse
 * ADMIN: refuser un paiement
 */
router.put('/:id/refuse', authorizeRole('ADMIN'), async (req, res) => {
  try {
    const paiementID = req.params.id;
    if (!mongoose.isValidObjectId(paiementID)) return badRequest(res, 'paiementID invalide');

    const paiement = await Paiement.findByIdAndUpdate(
      paiementID,
      { $set: { statut: 'REFUSE', datePaiement: new Date() } },
      { new: true }
    );

    if (!paiement) return res.status(404).json({ message: 'Paiement introuvable' });

    // Notification refus au client
    Reservation.findById(paiement.reservationID).lean()
      .then(reservation => {
        if (!reservation) return;
        return Utilisateur.findById(reservation.clientID).select('email firstname lastname telephone').lean()
          .then(client => {
            if (client) {
              notifyPaiementRefuse({
                email: client.email,
                telephone: client.telephone,
                nom: `${client.firstname} ${client.lastname}`,
                reservationId: reservation._id,
              }).catch(console.error);
            }
          });
      }).catch(console.error);

    return res.json(paiement);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /paiements/confirmer-stripe-local
 * Confirme un paiement Stripe après retour de Checkout (sans webhook, pour dev local)
 * Crée le Paiement + Facture + met à jour le statut réservation
 */
router.post('/confirmer-stripe-local', async (req, res) => {
  const { reservationID, sessionId } = req.body;

  if (!reservationID || !mongoose.isValidObjectId(reservationID)) {
    return res.status(400).json({ message: 'reservationID invalide' });
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    // Vérifier la session Stripe
    let stripeSession;
    if (sessionId) {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
      if (stripeSession.payment_status !== 'paid') {
        await dbSession.abortTransaction();
        return res.status(400).json({ message: 'Paiement Stripe non confirmé' });
      }
    }

    const reservation = await Reservation.findById(reservationID).session(dbSession);
    if (!reservation) {
      await dbSession.abortTransaction();
      return res.status(404).json({ message: 'Réservation introuvable' });
    }

    // Associer clientID si le client est connecté et que la réservation n'en a pas
    if (req.user && !reservation.clientID) {
      reservation.clientID = req.user.id;
    }

    // Vérifier qu'un paiement ACCEPTE n'existe pas déjà
    const existing = await Paiement.findOne({ reservationID, statut: 'ACCEPTE' }).session(dbSession);
    if (existing) {
      await dbSession.abortTransaction();
      const facture = await Facture.findOne({ paiementID: existing._id }).lean();
      return res.json({ message: 'Déjà confirmé', paiement: existing, facture });
    }

    const montant = reservation.montantTotal || 0;
    console.log('[confirmer-stripe-local] reservation:', reservationID, 'montant:', montant, 'user:', req.user?.id);

    // Forcer le clientID sur la réservation
    if (req.user?.id) {
      reservation.clientID = req.user.id;
    }

    // Créer le paiement
    const paiement = new Paiement({
      reservationID,
      methodePaiement: 'STRIPE',
      montant,
      statut: 'ACCEPTE',
      transactionId: stripeSession?.payment_intent || sessionId || `local_${Date.now()}`,
    });
    await paiement.save({ session: dbSession });

    // Créer la facture
    const facture = new Facture({
      paiementID: paiement._id,
      numeroFacture: genNumeroFacture(paiement._id),
      dateEmission: new Date(),
      montantHT: montant,
      montantTTC: montant,
    });
    await facture.save({ session: dbSession });

    // Mettre à jour la réservation — statut enum valide
    reservation.statut = 'CONFIRMEE';
    await reservation.save({ session: dbSession });
    console.log('[confirmer-stripe-local] facture créée:', facture.numeroFacture);

    await dbSession.commitTransaction();
    dbSession.endSession();

    res.json({ success: true, paiement, facture });
  } catch (err) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error('[confirmer-stripe-local]', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /paiements/stripe/webhook
 * Webhook Stripe - confirme le paiement automatiquement
 * (body doit être raw/buffer - configuré dans app.js)
 */
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Stripe signature invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const paiementID = session.metadata?.paiementID;

    if (paiementID && mongoose.isValidObjectId(paiementID)) {
      const dbSession = await mongoose.startSession();
      dbSession.startTransaction();
      try {
        const paiement = await Paiement.findById(paiementID).session(dbSession);
        if (paiement && paiement.statut !== 'ACCEPTE') {
          paiement.statut = 'ACCEPTE';
          paiement.datePaiement = new Date();
          await paiement.save({ session: dbSession });

          await ensureFactureForPaiement(paiement, dbSession);

          await Reservation.findByIdAndUpdate(
            paiement.reservationID,
            { statut: 'CONFIRMEE' },
            { new: true, session: dbSession }
          );
        }
        await dbSession.commitTransaction();
        dbSession.endSession();
      } catch (err) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        console.error('Erreur traitement webhook Stripe:', err);
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;