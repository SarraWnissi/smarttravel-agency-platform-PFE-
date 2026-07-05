const express = require('express');
const router = express.Router();
const Reservation = require('../models/reservation');
const mongoose = require('mongoose');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');
const Chambre = require('../models/chambre');
const agentManager = require('../agents/agentManager');
const { notifyReservationCreee, notifyAnnulation } = require('../services/notificationService');
const Utilisateur = require('../models/utilisateur');
const { calculerMontantHotel } = require('../utils/pricing');

// Normalise le tableau des âges enfants reçu (array ou "3,7")
function parseAgesEnfants(v) {
  if (Array.isArray(v)) return v.map(Number).filter(n => !isNaN(n));
  if (typeof v === 'string') return v.split(',').map(Number).filter(n => !isNaN(n));
  return [];
}
router.use(verifyToken);

// GET (ADMIN: all, CLIENT: own)
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === "ADMIN" ? {} : { clientID: req.user.id };

    const data = await Reservation.find(filter)
      .populate("clientID", "firstname lastname email")
      .populate("offreID", "titre")
      .populate("serviceID", "titre")
      .populate({ path: "chambreID", populate: { path: "hebergementID", select: "titre localisation" } });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper: resolve chambreID from hebergementID+numeroChambre if needed
async function resolveChambreId(body) {
  if (body.typeReservation !== "HOTEL") return body;

  if (body.hebergementID && body.numeroChambre && !body.chambreID) {
    if (!mongoose.isValidObjectId(body.hebergementID)) {
      throw { status: 400, message: "hebergementID invalide" };
    }
    const chambre = await Chambre.findOne({ hebergementID: body.hebergementID, numeroChambre: body.numeroChambre });
    if (!chambre) throw { status: 400, message: "Chambre non trouvée pour cet hébergement" };
    body.chambreID = chambre._id;
  }

  if (body.chambreID && body.hebergementID) {
    if (!mongoose.isValidObjectId(body.chambreID)) {
      throw { status: 400, message: "chambreID invalide" };
    }
    const chambre = await Chambre.findById(body.chambreID);
    if (!chambre) throw { status: 400, message: "Chambre introuvable" };
    if (String(chambre.hebergementID) !== String(body.hebergementID)) {
      throw { status: 400, message: "La chambre ne correspond pas à l'hébergement fourni" };
    }
  }

  if (!body.chambreID) {
    throw { status: 400, message: "chambreID requis pour les réservations de type HOTEL" };
  }

  return body;
}

// POST (CLIENT/ADMIN)
router.post('/', async (req, res) => {
  try {
    const body = { ...req.body };
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (req.user.role !== "ADMIN") {
      body.clientID = req.user.id;
      body.statut = "EN_ATTENTE_PAIEMENT";
    }

    // Basic checks — require either offreID (promotional offer) or serviceID (direct booking)
    const hasOffre = body.offreID && mongoose.isValidObjectId(body.offreID);
    const hasSvc   = body.serviceID && mongoose.isValidObjectId(body.serviceID);
    if (!hasOffre && !hasSvc) {
      return res.status(400).json({ message: "offreID ou serviceID requis" });
    }
    if (typeof body.nbPersonnes !== 'number' || body.nbPersonnes < 1) {
      return res.status(400).json({ message: "nbPersonnes invalide" });
    }
    if (body.montantTotal !== undefined && typeof body.montantTotal === 'number' && body.montantTotal < 0) {
      return res.status(400).json({ message: "montantTotal invalide (doit être >= 0)" });
    }

    const dateDebut = parseDateFlexible(body.dateDebutSejour);
    const dateFin = parseDateFlexible(body.dateFinSejour);
   
    if (dateDebut && dateDebut < today) {
      return res.status(400).json({ message: "Impossible de réserver dans le passé." });
    }

    let montantTotal = 0;

    if (body.typeReservation === "HOTEL") {
      if (!body.dateDebutSejour || !body.dateFinSejour) {
        return res.status(400).json({ message: "Pour une réservation HOTEL, dateDebutSejour et dateFinSejour sont obligatoires." });
      }
      if (!dateDebut) return res.status(400).json({ message: `dateDebutSejour invalide: "${body.dateDebutSejour}"` });
      if (!dateFin) return res.status(400).json({ message: `dateFinSejour invalide: "${body.dateFinSejour}"` });
      if (dateFin < dateDebut) return res.status(400).json({ message: "dateFinSejour doit être >= dateDebutSejour" });

      let chambre = null;
      if (body.chambreID) {
        chambre = await Chambre.findById(body.chambreID);
      } else if (body.hebergementID && body.numeroChambre) {
        chambre = await Chambre.findOne({ hebergementID: body.hebergementID, numeroChambre: body.numeroChambre });
        body.chambreID = chambre?._id;
      }
      if (!chambre) return res.status(400).json({ message: "Chambre introuvable" });
      
      const conflit = await Reservation.findOne({
        chambreID: body.chambreID,
        statut: { $in: ["EN_ATTENTE_PAIEMENT", "CONFIRMEE"] },
        dateDebutSejour: { $lte: dateFin },
        dateFinSejour: { $gte: dateDebut }
      });

      if (conflit) {
        return res.status(400).json({
          message: "Chambre déjà réservée sur cette période"
        });
      }

      delete body.nbNuits;
      body.nbNuits = Math.max(1, Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24)));
      // Tarif par personne : body.nbPersonnes = adultes ; agesEnfants = âges des enfants
      const agesEnfants = parseAgesEnfants(body.agesEnfants);
      body.agesEnfants = agesEnfants;
      montantTotal = calculerMontantHotel(chambre.prixParNuit, body.nbPersonnes, agesEnfants, body.nbNuits);
    }

    if (["EXCURSION", "INTERNATIONALE"].includes(body.typeReservation)) {
      const Offre = require('../models/offre');
      const Service = require('../models/service');
      let service;
      let offre = null;
      if (hasOffre) {
        offre = await Offre.findById(body.offreID);
        if (!offre) return res.status(400).json({ message: "Offre introuvable" });
        service = await Service.findById(offre.serviceID ?? body.serviceID);
      } else {
        service = await Service.findById(body.serviceID);
      }
      if (!service) return res.status(400).json({ message: "Service introuvable" });
      // Facturer le prix le moins cher (cohérent avec l'affichage client) :
      // minimum entre le prix de l'offre et le prix du service lié.
      const candidats = [offre?.prixAPartirDe, service.prixBase, service.prix, service.prixAPartirDe]
        .filter((p) => typeof p === "number" && p > 0);
      const prixParPersonne = candidats.length ? Math.min(...candidats) : 0;
      montantTotal = prixParPersonne * Number(body.nbPersonnes);
    }

    body.dateDebutSejour = dateDebut || undefined;
    body.dateFinSejour = dateFin || undefined;
    body.montantTotal = montantTotal;

    const reservation = new Reservation(body);
    await reservation.save();

    // Supervision par les agents IA
    agentManager.superviserReservation({ ...body, clientID: reservation.clientID }).catch(console.error);

    // Fetch client une seule fois pour webhook + notification
    const clientData = await Utilisateur.findById(reservation.clientID)
      .select('email firstname lastname telephone').lean();

    const clientNom = clientData ? `${clientData.firstname} ${clientData.lastname}` : '';

    // Webhook n8n enrichi avec données client (tolérant aux erreurs)
    const axios = require("axios");
    axios.post("http://localhost:5678/webhook/reservation-created", {
      reservationID: reservation._id,
      clientID: reservation.clientID,
      clientEmail: clientData?.email ?? '',
      clientNom,
      montantTotal: reservation.montantTotal,
      typeReservation: reservation.typeReservation,
      dateDebutSejour: reservation.dateDebutSejour ?? null,
      dateFinSejour: reservation.dateFinSejour ?? null,
      dateExcursion: reservation.dateExcursion ?? null,
      paysDestination: reservation.paysDestination ?? null,
    }).catch(() => {});

    // Notification email/SMS
    if (clientData) {
      notifyReservationCreee({
        email: clientData.email,
        telephone: clientData.telephone,
        nom: clientNom,
        reservation,
      }).catch(console.error);
    }

    res.status(201).json(reservation);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

function parseDateFlexible(input) {
  if (!input) return undefined;
  const d = new Date(input);
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return undefined;
  }
  return d;
}

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const existing = await Reservation.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Reservation not found" });

    const isAdmin = req.user.role === "ADMIN";
    const isOwner = String(existing.clientID) === String(req.user.id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!isAdmin && existing.statut !== "EN_ATTENTE_PAIEMENT") {
      return res.status(403).json({ message: "Modification interdite (réservation déjà traitée)" });
    }

    const incoming = { ...req.body };

    if ((incoming.typeReservation ?? existing.typeReservation) === "HOTEL" && (incoming.dateDebutSejour || incoming.dateFinSejour)) {
      const dateDebut = new Date(incoming.dateDebutSejour ?? existing.dateDebutSejour);
      const dateFin = new Date(incoming.dateFinSejour ?? existing.dateFinSejour);
      delete incoming.nbNuits;
      incoming.nbNuits = Math.max(1, Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24)));

      let chambre = null;
      const chambreID = incoming.chambreID ?? existing.chambreID;
      if (chambreID) {
        chambre = await Chambre.findById(chambreID);
        if (!chambre) {
          return res.status(400).json({ message: "Chambre introuvable" });
        }
        if (chambre) {
          const agesEnfants = parseAgesEnfants(incoming.agesEnfants ?? existing.agesEnfants);
          const nbAdultes = incoming.nbPersonnes ?? existing.nbPersonnes;
          incoming.montantTotal = calculerMontantHotel(chambre.prixParNuit, nbAdultes, agesEnfants, incoming.nbNuits);
        }
      }
    }

    const dateDebutSejour = incoming.dateDebutSejour ?? existing.dateDebutSejour;
    const dateFinSejour = incoming.dateFinSejour ?? existing.dateFinSejour;
    const chambreID = incoming.chambreID ?? existing.chambreID;

    const conflit = await Reservation.findOne({
      _id: { $ne: req.params.id },
      chambreID,
      statut: { $in: ["EN_ATTENTE_PAIEMENT", "CONFIRMEE"] },
      dateDebutSejour: { $lte: dateFinSejour },
      dateFinSejour: { $gte: dateDebutSejour }
    });

    if (conflit) return res.status(400).json({ message: "Conflit détecté" });

    if (!isAdmin) {
      delete incoming.statut;
      delete incoming.clientID;
    }

    const updated = await Reservation.findByIdAndUpdate(
      req.params.id,
      { $set: incoming },
      { new: true, runValidators: true }
    );

    res.json(updated);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const existing = await Reservation.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Reservation not found" });

    const isAdmin = req.user.role === "ADMIN";
    const isOwner = String(existing.clientID) === String(req.user.id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!isAdmin && existing.statut !== "EN_ATTENTE_PAIEMENT") {
      return res.status(403).json({ message: "Annulation interdite (réservation déjà traitée)" });
    }

    await Reservation.findByIdAndDelete(req.params.id);

    // Notification annulation
    Utilisateur.findById(existing.clientID).select('email firstname lastname telephone').lean()
      .then(client => {
        if (client) {
          notifyAnnulation({
            email: client.email,
            telephone: client.telephone,
            nom: `${client.firstname} ${client.lastname}`,
            reservationId: existing._id,
          }).catch(console.error);
        }
      }).catch(console.error);

    res.json({ message: "deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN confirm
router.put('/:id/confirm', authorizeRole("ADMIN"), async (req, res) => {
  try {
    const r = await Reservation.findByIdAndUpdate(
      req.params.id,
      { $set: { statut: "CONFIRMEE" } },
      { new: true }
    );
    if (!r) return res.status(404).json({ message: "Reservation not found" });
    res.json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CANCEL
router.put('/:id/cancel', async (req, res) => {
  try {
    const existing = await Reservation.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Reservation not found" });
    
    if (existing.statut === "ANNULEE") {
      return res.status(400).json({ message: "Déjà annulée" });
    }

    const isAdmin = req.user.role === "ADMIN";
    const isOwner = String(existing.clientID) === String(req.user.id);

    if (!isAdmin && !isOwner) return res.status(403).json({ message: "Access denied" });

    if (!isAdmin && existing.statut !== "EN_ATTENTE_PAIEMENT") {
      return res.status(403).json({ message: "Annulation interdite (réservation déjà traitée)" });
    }

    const r = await Reservation.findByIdAndUpdate(
      req.params.id,
      { $set: { statut: "ANNULEE" } },
      { new: true }
    );

    res.json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;