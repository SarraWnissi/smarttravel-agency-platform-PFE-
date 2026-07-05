const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Reservation = require('../models/reservation');
const Chambre     = require('../models/chambre');
const Offre       = require('../models/offre');
const Paiement    = require('../models/paiement');
const Facture     = require('../models/facture');
const { notifyFactureGuest, notifyReservationCreee } = require('../services/notificationService');
const { calculerMontantHotel } = require('../utils/pricing');

function parseAgesEnfants(v) {
  if (Array.isArray(v)) return v.map(Number).filter(n => !isNaN(n));
  if (typeof v === 'string') return v.split(',').map(Number).filter(n => !isNaN(n));
  return [];
}

function parseDateFlexible(input) {
  if (!input) return undefined;
  const d = new Date(input);
  return isNaN(d.getTime()) ? undefined : d;
}

function genNumeroFacture(paiementId) {
  const year = new Date().getFullYear();
  const suffix = String(paiementId).slice(-6).toUpperCase();
  return `FAC-${year}-${suffix}`;
}

// ─────────────────────────────────────────────────────────────
// POST /api/guest/reservation
// Réservation sans compte (visiteur) — HOTEL ou OFFRE (excursion/internationale)
// ─────────────────────────────────────────────────────────────
router.post('/reservation', async (req, res) => {
  try {
    const {
      guestNom, guestPrenom, guestEmail, guestTelephone,
      chambreID, hebergementID,
      offreId, typeReservation,
      dateDebutSejour, dateFinSejour,
      paysDestination, numPassport,
      nbPersonnes, formule, agesEnfants,
    } = req.body;

    if (!guestNom || !guestPrenom || !guestEmail) {
      return res.status(400).json({ message: "Nom, prénom et email sont obligatoires" });
    }
    if (!nbPersonnes || nbPersonnes < 1) {
      return res.status(400).json({ message: "nbPersonnes invalide" });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // ── CAS 1 : réservation de chambre d'hôtel ──────────────────
    if (chambreID) {
      if (!mongoose.isValidObjectId(chambreID)) {
        return res.status(400).json({ message: "chambreID invalide" });
      }
      const dateDebut = parseDateFlexible(dateDebutSejour);
      const dateFin   = parseDateFlexible(dateFinSejour);
      if (!dateDebut || !dateFin) return res.status(400).json({ message: "Dates invalides" });
      if (dateDebut < today)     return res.status(400).json({ message: "Impossible de réserver dans le passé" });
      if (dateFin < dateDebut)   return res.status(400).json({ message: "La date de fin doit être après la date de début" });

      const chambre = await Chambre.findById(chambreID);
      if (!chambre)          return res.status(404).json({ message: "Chambre introuvable" });
      if (!chambre.disponible) return res.status(400).json({ message: "Chambre indisponible" });

      const conflit = await Reservation.findOne({
        chambreID,
        statut: { $in: ["EN_ATTENTE_PAIEMENT", "CONFIRMEE"] },
        dateDebutSejour: { $lte: dateFin },
        dateFinSejour:   { $gte: dateDebut },
      });
      if (conflit) return res.status(400).json({ message: "Chambre déjà réservée sur cette période" });

      const nbNuits      = Math.max(1, Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24)));
      // Tarif par personne : nbPersonnes = adultes ; agesEnfants = âges des enfants
      const agesEnfantsArr = parseAgesEnfants(agesEnfants);
      const montantTotal = calculerMontantHotel(chambre.prixParNuit, Number(nbPersonnes), agesEnfantsArr, nbNuits);

      const reservation = new Reservation({
        clientID: null,
        guestNom, guestPrenom, guestEmail,
        guestTelephone: guestTelephone || "",
        chambreID,
        offreID: offreId && mongoose.isValidObjectId(offreId) ? offreId : undefined,
        typeReservation: "HOTEL",
        dateDebutSejour: dateDebut,
        dateFinSejour:   dateFin,
        nbPersonnes: Number(nbPersonnes),
        agesEnfants: agesEnfantsArr,
        nbNuits,
        montantTotal,
        formule: formule || "LOGEMENT_SEUL",
        statut: "EN_ATTENTE_PAIEMENT",
      });
      await reservation.save();

      notifyReservationCreee({
        email: guestEmail,
        telephone: guestTelephone || null,
        nom: `${guestPrenom} ${guestNom}`.trim(),
        reservation,
      }).catch(err => console.error('[notifyReservationCreee guest HOTEL]', err));

      return res.status(201).json({ reservation, message: "Réservation créée. Procédez au paiement pour confirmer." });
    }

    // ── CAS 2 : réservation d'offre (excursion / internationale) ──
    if (offreId) {
      if (!mongoose.isValidObjectId(offreId)) {
        return res.status(400).json({ message: "offreId invalide" });
      }
      const offre = await Offre.findById(offreId);
      if (!offre) return res.status(404).json({ message: "Offre introuvable" });

      const dateDebut = parseDateFlexible(dateDebutSejour);
      if (!dateDebut) return res.status(400).json({ message: "Date de début invalide" });
      if (dateDebut < today) return res.status(400).json({ message: "Impossible de réserver dans le passé" });

      const dateFin = parseDateFlexible(dateFinSejour);
      const type    = typeReservation === "EXCURSION" ? "EXCURSION" : "INTERNATIONALE";
      const montantTotal = Number(offre.prixAPartirDe ?? 0) * Number(nbPersonnes);

      const reservationData = {
        clientID: null,
        guestNom, guestPrenom, guestEmail,
        guestTelephone: guestTelephone || "",
        offreID: offreId,
        typeReservation: type,
        dateDebutSejour: dateDebut,
        nbPersonnes: Number(nbPersonnes),
        agesEnfants: parseAgesEnfants(agesEnfants),
        montantTotal,
        statut: "EN_ATTENTE_PAIEMENT",
      };
      if (dateFin) reservationData.dateFinSejour = dateFin;
      if (type === "EXCURSION") reservationData.dateExcursion = dateDebut;
      if (paysDestination) reservationData.paysDestination = paysDestination;
      if (numPassport)     reservationData.numPassport     = numPassport;

      const reservation = new Reservation(reservationData);
      await reservation.save();

      notifyReservationCreee({
        email: guestEmail,
        telephone: guestTelephone || null,
        nom: `${guestPrenom} ${guestNom}`.trim(),
        reservation,
      }).catch(err => console.error('[notifyReservationCreee guest OFFRE]', err));

      return res.status(201).json({ reservation, message: "Réservation créée. Procédez au paiement pour confirmer." });
    }

    return res.status(400).json({ message: "chambreID ou offreId requis" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/guest/reservation/:id
// Consulter une réservation guest (vérification email)
// ─────────────────────────────────────────────────────────────
router.get('/reservation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.query;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "ID invalide" });

    const reservation = await Reservation.findById(id)
      .populate('chambreID')
      .populate({ path: 'chambreID', populate: { path: 'hebergementID' } });

    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });

    if (reservation.guestEmail && email &&
        reservation.guestEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/guest/stripe/create-intent
// Créer une session Stripe Checkout pour visiteur (sans auth)
// ─────────────────────────────────────────────────────────────
router.post('/stripe/create-intent', async (req, res) => {
  try {
    const Stripe = require('stripe');
    const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { reservationID, guestEmail } = req.body;

    if (!reservationID || !mongoose.isValidObjectId(reservationID)) {
      return res.status(400).json({ message: "reservationID invalide" });
    }

    const reservation = await Reservation.findById(reservationID);
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });

    if (reservation.guestEmail && guestEmail &&
        reservation.guestEmail.toLowerCase() !== guestEmail.toLowerCase()) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const montant = Number(reservation.montantTotal || 0);
    if (!Number.isFinite(montant) || montant <= 0) {
      return res.status(400).json({ message: "Montant invalide" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: reservation.guestEmail || guestEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Réservation SmartTravel #${String(reservationID).slice(-8).toUpperCase()}`,
          },
          unit_amount: Math.round(montant * 100),
        },
        quantity: 1,
      }],
      metadata: { reservationID: String(reservationID) },
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&reservationID=${reservationID}&montant=${montant}&method=STRIPE&guestEmail=${encodeURIComponent(reservation.guestEmail || guestEmail || '')}`,
      cancel_url:  `${process.env.FRONTEND_URL}/payment?reservationID=${reservationID}&montant=${montant}`,
    });

    res.json({ checkoutUrl: session.url, montant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/guest/stripe/create-intent-group
// Une seule session Stripe Checkout pour plusieurs réservations (multi-chambres)
// ─────────────────────────────────────────────────────────────
router.post('/stripe/create-intent-group', async (req, res) => {
  try {
    const Stripe = require('stripe');
    const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { reservationIDs, guestEmail } = req.body;

    const ids = Array.isArray(reservationIDs) ? reservationIDs.filter(i => mongoose.isValidObjectId(i)) : [];
    if (ids.length === 0) {
      return res.status(400).json({ message: "reservationIDs invalide" });
    }

    const reservations = await Reservation.find({ _id: { $in: ids } });
    if (reservations.length !== ids.length) {
      return res.status(404).json({ message: "Une ou plusieurs réservations introuvables" });
    }

    const montantTotal = reservations.reduce((s, r) => s + Number(r.montantTotal || 0), 0);
    if (!Number.isFinite(montantTotal) || montantTotal <= 0) {
      return res.status(400).json({ message: "Montant invalide" });
    }

    const email = reservations[0].guestEmail || guestEmail || undefined;
    const idsParam = ids.join(',');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: reservations.map(r => ({
        price_data: {
          currency: 'eur',
          product_data: { name: `Réservation SmartTravel #${String(r._id).slice(-8).toUpperCase()}` },
          unit_amount: Math.round(Number(r.montantTotal || 0) * 100),
        },
        quantity: 1,
      })),
      metadata: { reservationIDs: idsParam },
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&reservationIDs=${idsParam}&montant=${montantTotal}&method=STRIPE&guestEmail=${encodeURIComponent(email || '')}`,
      cancel_url:  `${process.env.FRONTEND_URL}/payment?reservationIDs=${idsParam}&montant=${montantTotal}`,
    });

    res.json({ checkoutUrl: session.url, montant: montantTotal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/guest/stripe/confirm
// Confirmer paiement Stripe pour visiteur — crée Paiement + Facture + envoie email
// ─────────────────────────────────────────────────────────────
router.post('/stripe/confirm', async (req, res) => {
  const { reservationID, sessionId, guestEmail } = req.body;

  if (!reservationID || !mongoose.isValidObjectId(reservationID)) {
    return res.status(400).json({ message: 'reservationID invalide' });
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    // Vérifier session Stripe si fournie
    if (sessionId) {
      const Stripe = require('stripe');
      const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY);
      const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
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

    // Idempotent : si déjà confirmé, retourner la facture existante
    const existingPaiement = await Paiement.findOne({ reservationID, statut: 'ACCEPTE' }).session(dbSession);
    if (existingPaiement) {
      const existingFacture = await Facture.findOne({ paiementID: existingPaiement._id }).lean();
      await dbSession.abortTransaction();
      return res.json({ success: true, alreadyConfirmed: true, paiement: existingPaiement, facture: existingFacture });
    }

    const montant = Number(reservation.montantTotal || 0);

    // Créer le paiement ACCEPTE
    const paiement = new Paiement({
      reservationID,
      methodePaiement: 'STRIPE',
      montant,
      statut: 'ACCEPTE',
      transactionId: sessionId || `guest_stripe_${Date.now()}`,
      datePaiement: new Date(),
    });
    await paiement.save({ session: dbSession });

    // Créer la facture
    const facture = new Facture({
      paiementID:    paiement._id,
      numeroFacture: genNumeroFacture(paiement._id),
      dateEmission:  new Date(),
      montantHT:     montant,
      montantTTC:    montant,
    });
    await facture.save({ session: dbSession });

    // Confirmer la réservation
    reservation.statut = 'CONFIRMEE';
    await reservation.save({ session: dbSession });

    await dbSession.commitTransaction();
    dbSession.endSession();

    // Envoyer la facture par email au guest
    const email = guestEmail || reservation.guestEmail;
    if (email) {
      notifyFactureGuest({
        email,
        telephone: reservation.guestTelephone || null,
        nom: `${reservation.guestPrenom || ''} ${reservation.guestNom || ''}`.trim() || 'Client',
        reservation,
        facture,
        methode: 'STRIPE',
      }).catch(err => console.error('[notifyFactureGuest STRIPE]', err));
    }

    res.json({ success: true, paiement, facture });
  } catch (err) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error('[guest/stripe/confirm]', err);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/guest/paiement-simple
// VIREMENT ou ESPECES pour visiteur — crée Paiement + Facture + envoie email
// ─────────────────────────────────────────────────────────────
router.post('/paiement-simple', async (req, res) => {
  try {
    const { reservationID, methode } = req.body;

    if (!reservationID || !mongoose.isValidObjectId(reservationID)) {
      return res.status(400).json({ message: 'reservationID invalide' });
    }
    if (!['VIREMENT', 'ESPECES'].includes(methode)) {
      return res.status(400).json({ message: 'methode doit être VIREMENT ou ESPECES' });
    }

    const reservation = await Reservation.findById(reservationID);
    if (!reservation) return res.status(404).json({ message: 'Réservation introuvable' });

    const montant = Number(reservation.montantTotal || 0);

    // Paiement immédiatement ACCEPTE — le visiteur n'attend pas la validation admin
    let paiement = await Paiement.findOne({ reservationID, statut: 'ACCEPTE' });
    if (!paiement) {
      // Annuler tout paiement EN_COURS existant pour éviter les doublons
      await Paiement.deleteMany({ reservationID, statut: 'EN_COURS' });
      paiement = new Paiement({
        reservationID,
        methodePaiement: methode,
        montant,
        statut: 'ACCEPTE',
        datePaiement: new Date(),
      });
      await paiement.save();
    }

    // Confirmer la réservation directement
    reservation.statut = 'CONFIRMEE';
    await reservation.save();

    // Créer la facture si elle n'existe pas déjà
    let facture = await Facture.findOne({ paiementID: paiement._id });
    if (!facture) {
      facture = new Facture({
        paiementID:    paiement._id,
        numeroFacture: genNumeroFacture(paiement._id),
        dateEmission:  new Date(),
        montantHT:     montant,
        montantTTC:    montant,
      });
      await facture.save();
    }

    // Envoyer la facture par email au guest
    const email = reservation.guestEmail;
    if (email) {
      notifyFactureGuest({
        email,
        telephone: reservation.guestTelephone || null,
        nom: `${reservation.guestPrenom || ''} ${reservation.guestNom || ''}`.trim() || 'Client',
        reservation,
        facture,
        methode,
      }).catch(err => console.error('[notifyFactureGuest]', err));
    }

    const message = methode === 'VIREMENT'
      ? `Votre réservation est enregistrée. La facture N° ${facture.numeroFacture} a été envoyée à ${email}. Effectuez votre virement avec ce numéro en référence.`
      : `Votre réservation est enregistrée. La facture N° ${facture.numeroFacture} a été envoyée à ${email}. Présentez-vous à l'agence pour régler sur place.`;

    res.json({
      success: true,
      methode,
      paiementID: paiement._id,
      factureNumero: facture.numeroFacture,
      message,
      reservationID,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
