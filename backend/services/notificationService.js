const nodemailer = require('nodemailer');

function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,       // true pour 465, false pour 587
    requireTLS: port === 587,   // forcer STARTTLS sur 587
    auth: { user, pass: pass.replace(/\s/g, '') }, // supprimer espaces du mot de passe app Google
    tls: { rejectUnauthorized: false },
  });
}

async function sendEmail({ to, subject, html }) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn(`[EMAIL] SMTP non configuré — email simulé vers ${to}`);
    return { simulated: true };
  }
  try {
    const info = await transporter.sendMail({
      from: `"SmartTravel Agency" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] ✅ Envoyé à ${to} | messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[EMAIL] ❌ Échec envoi à ${to} :`, err.message);
    throw err;
  }
}

// SMS simulé — à remplacer par Twilio/Vonage si disponible
async function sendSMS({ to, message }) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[NOTIF SMS simulé] To: ${to} | Message: ${message}`);
    return { simulated: true };
  }
  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return client.messages.create({ body: message, from: process.env.TWILIO_FROM, to });
  } catch {
    console.log(`[NOTIF SMS simulé] To: ${to} | Message: ${message}`);
    return { simulated: true };
  }
}

async function notifyReservationCreee({ email, telephone, nom, reservation }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e40af, #0891b2); padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">SmartTravel Agency</h1>
      </div>
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1e293b;">Réservation créée ✅</h2>
        <p>Bonjour <strong>${nom}</strong>,</p>
        <p>Votre réservation <strong>#${String(reservation._id).slice(-8).toUpperCase()}</strong> a été créée avec succès.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #e2e8f0;"><td style="padding: 8px;">Type</td><td style="padding: 8px;">${reservation.typeReservation}</td></tr>
          <tr><td style="padding: 8px;">Montant</td><td style="padding: 8px;"><strong>${reservation.montantTotal} TND</strong></td></tr>
          <tr style="background: #e2e8f0;"><td style="padding: 8px;">Statut</td><td style="padding: 8px;">En attente de paiement</td></tr>
        </table>
        <p>Merci de procéder au paiement pour confirmer votre réservation.</p>
        <p>Cordialement,<br><strong>L'équipe SmartTravel</strong></p>
      </div>
    </div>`;

  const results = [sendEmail({ to: email, subject: 'Votre réservation SmartTravel', html })];
  if (telephone) {
    results.push(sendSMS({
      to: telephone,
      message: `SmartTravel: Réservation #${String(reservation._id).slice(-8).toUpperCase()} créée. Montant: ${reservation.montantTotal} TND. Veuillez procéder au paiement.`,
    }));
  }
  return Promise.allSettled(results);
}

async function notifyPaiementAccepte({ email, telephone, nom, reservation, facture }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">SmartTravel Agency</h1>
      </div>
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1e293b;">Paiement confirmé ✅</h2>
        <p>Bonjour <strong>${nom}</strong>,</p>
        <p>Votre paiement pour la réservation <strong>#${String(reservation._id).slice(-8).toUpperCase()}</strong> a été accepté.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #e2e8f0;"><td style="padding: 8px;">Montant payé</td><td style="padding: 8px;"><strong>${reservation.montantTotal} TND</strong></td></tr>
          <tr><td style="padding: 8px;">N° Facture</td><td style="padding: 8px;">${facture?.numeroFacture ?? 'N/A'}</td></tr>
          <tr style="background: #e2e8f0;"><td style="padding: 8px;">Statut</td><td style="padding: 8px; color: #16a34a;"><strong>Réservation confirmée</strong></td></tr>
        </table>
        <p>Bon voyage ! 🌍</p>
        <p>Cordialement,<br><strong>L'équipe SmartTravel</strong></p>
      </div>
    </div>`;

  const results = [sendEmail({ to: email, subject: 'Paiement confirmé - SmartTravel', html })];
  if (telephone) {
    results.push(sendSMS({
      to: telephone,
      message: `SmartTravel: Paiement confirmé pour la réservation #${String(reservation._id).slice(-8).toUpperCase()}. Bon voyage !`,
    }));
  }
  return Promise.allSettled(results);
}

async function notifyPaiementRefuse({ email, telephone, nom, reservationId }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">SmartTravel Agency</h1>
      </div>
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1e293b;">Paiement refusé ❌</h2>
        <p>Bonjour <strong>${nom}</strong>,</p>
        <p>Votre paiement pour la réservation <strong>#${String(reservationId).slice(-8).toUpperCase()}</strong> a été refusé.</p>
        <p>Veuillez contacter notre équipe ou essayer un autre moyen de paiement.</p>
        <p>Contactez-nous: <a href="mailto:contact@smarttravel.tn">contact@smarttravel.tn</a></p>
        <p>Cordialement,<br><strong>L'équipe SmartTravel</strong></p>
      </div>
    </div>`;

  const results = [sendEmail({ to: email, subject: 'Paiement refusé - SmartTravel', html })];
  if (telephone) {
    results.push(sendSMS({
      to: telephone,
      message: `SmartTravel: Paiement refusé pour la réservation #${String(reservationId).slice(-8).toUpperCase()}. Contactez-nous.`,
    }));
  }
  return Promise.allSettled(results);
}

async function notifyAnnulation({ email, telephone, nom, reservationId }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #64748b, #475569); padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">SmartTravel Agency</h1>
      </div>
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1e293b;">Réservation annulée</h2>
        <p>Bonjour <strong>${nom}</strong>,</p>
        <p>Votre réservation <strong>#${String(reservationId).slice(-8).toUpperCase()}</strong> a été annulée.</p>
        <p>Si vous avez des questions, contactez-nous à <a href="mailto:contact@smarttravel.tn">contact@smarttravel.tn</a></p>
        <p>Cordialement,<br><strong>L'équipe SmartTravel</strong></p>
      </div>
    </div>`;

  const results = [sendEmail({ to: email, subject: 'Réservation annulée - SmartTravel', html })];
  if (telephone) {
    results.push(sendSMS({
      to: telephone,
      message: `SmartTravel: Réservation #${String(reservationId).slice(-8).toUpperCase()} annulée.`,
    }));
  }
  return Promise.allSettled(results);
}

/**
 * Envoie la facture par email à un visiteur (guest) sans compte.
 * Contient tous les détails nécessaires puisque le guest ne peut pas se connecter.
 */
async function notifyFactureGuest({ email, telephone, nom, reservation, facture, methode }) {
  const methodLabels = {
    VIREMENT: 'Virement bancaire',
    ESPECES: 'Paiement sur place',
    STRIPE: 'Carte bancaire (Stripe)',
    CARTE: 'Carte bancaire',
    PAYPAL: 'PayPal',
  };
  const methodLabel = methodLabels[methode] || methode;
  const isVirement = methode === 'VIREMENT';
  const isEspeces  = methode === 'ESPECES';

  const statutMsg = isVirement
    ? '⏳ En attente de réception du virement'
    : isEspeces
    ? '⏳ Paiement à régler sur place à l\'arrivée'
    : '✅ Paiement confirmé';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">

      <!-- EN-TÊTE -->
      <div style="background: linear-gradient(135deg, #1e40af, #0891b2); padding: 30px 24px;">
        <h1 style="color: white; margin: 0; font-size: 22px;">SmartTravel Agency</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Agence de voyages — Tunisie</p>
      </div>

      <!-- CORPS -->
      <div style="background: #f8fafc; padding: 30px 24px;">
        <h2 style="color: #1e293b; margin: 0 0 8px;">Votre facture SmartTravel 🧾</h2>
        <p style="color: #64748b; margin: 0 0 24px;">Bonjour <strong>${nom}</strong>, voici le récapitulatif de votre réservation.</p>

        <!-- STATUT -->
        <div style="background: ${isVirement || isEspeces ? '#fffbeb' : '#f0fdf4'}; border: 1px solid ${isVirement || isEspeces ? '#fde68a' : '#bbf7d0'}; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-weight: bold; color: ${isVirement || isEspeces ? '#92400e' : '#166534'}; font-size: 14px;">${statutMsg}</p>
        </div>

        <!-- DÉTAILS FACTURE -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr style="background: #1e40af; color: white;">
            <th style="padding: 10px 12px; text-align: left; border-radius: 6px 0 0 0;">N° Facture</th>
            <td style="padding: 10px 12px; border-radius: 0 6px 0 0;">${facture.numeroFacture}</td>
          </tr>
          <tr style="background: #f1f5f9;">
            <th style="padding: 10px 12px; text-align: left;">Date d'émission</th>
            <td style="padding: 10px 12px;">${new Date(facture.dateEmission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
          </tr>
          <tr>
            <th style="padding: 10px 12px; text-align: left;">Réservation</th>
            <td style="padding: 10px 12px; font-family: monospace;">#${String(reservation._id).slice(-8).toUpperCase()}</td>
          </tr>
          <tr style="background: #f1f5f9;">
            <th style="padding: 10px 12px; text-align: left;">Mode de paiement</th>
            <td style="padding: 10px 12px;">${methodLabel}</td>
          </tr>
          <tr>
            <th style="padding: 10px 12px; text-align: left;">Montant HT</th>
            <td style="padding: 10px 12px;">${Number(facture.montantHT).toLocaleString('fr-FR')} TND</td>
          </tr>
          <tr style="background: #dbeafe;">
            <th style="padding: 10px 12px; text-align: left; font-size: 15px;">Montant TTC</th>
            <td style="padding: 10px 12px; font-weight: bold; font-size: 15px; color: #1d4ed8;">${Number(facture.montantTTC).toLocaleString('fr-FR')} TND</td>
          </tr>
        </table>

        ${isVirement ? `
        <!-- INSTRUCTIONS VIREMENT -->
        <div style="background: #fff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="font-weight: bold; color: #1e40af; margin: 0 0 8px;">Instructions pour le virement :</p>
          <p style="margin: 4px 0; font-size: 13px; color: #374151;">🏦 Banque : <strong>Banque Demo</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #374151;">📋 RIB : <strong>TN59 1000 0000 1234 5678 9012</strong></p>
          <p style="margin: 4px 0; font-size: 13px; color: #374151;">💬 Référence à mentionner : <strong>${facture.numeroFacture}</strong></p>
        </div>` : ''}

        ${isEspeces ? `
        <!-- INFO ESPECES -->
        <div style="background: #fff; border: 1px solid #d1fae5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="font-weight: bold; color: #065f46; margin: 0 0 8px;">Paiement sur place :</p>
          <p style="margin: 0; font-size: 13px; color: #374151;">Présentez-vous à l'agence SmartTravel avec ce numéro de réservation. Le paiement en espèces sera encaissé à votre arrivée.</p>
        </div>` : ''}

        <p style="color: #64748b; font-size: 13px; margin: 0;">Conservez cet email comme justificatif de votre réservation.</p>
        <p style="color: #64748b; font-size: 13px; margin: 8px 0 0;">Pour toute question : <a href="mailto:contact@smarttravel.tn" style="color: #1e40af;">contact@smarttravel.tn</a></p>
      </div>

      <!-- PIED DE PAGE -->
      <div style="background: #1e293b; padding: 16px 24px; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">SmartTravel Agency — contact@smarttravel.tn — smarttravel.tn</p>
        <p style="color: #64748b; font-size: 11px; margin: 4px 0 0;">Merci de votre confiance ! 🌍</p>
      </div>
    </div>`;

  const results = [
    sendEmail({
      to: email,
      subject: `Votre facture SmartTravel N° ${facture.numeroFacture}`,
      html,
    }),
  ];
  if (telephone) {
    results.push(sendSMS({
      to: telephone,
      message: `SmartTravel: Facture N° ${facture.numeroFacture} envoyée par email. Montant: ${facture.montantTTC} TND. Réf: #${String(reservation._id).slice(-8).toUpperCase()}`,
    }));
  }
  return Promise.allSettled(results);
}

async function sendVerificationEmail({ to, name, token, frontendUrl }) {
  const link = `${frontendUrl}/verify-email?token=${token}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e40af, #0891b2); padding: 30px 24px;">
        <h1 style="color: white; margin: 0; font-size: 22px;">SmartTravel Agency</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Agence de voyages — Tunisie</p>
      </div>
      <div style="background: #f8fafc; padding: 30px 24px;">
        <h2 style="color: #1e293b; margin: 0 0 12px;">Confirmez votre adresse email</h2>
        <p style="color: #475569; margin: 0 0 24px;">Bonjour <strong>${name}</strong>, merci de vous être inscrit sur SmartTravel !</p>
        <p style="color: #475569; margin: 0 0 24px;">Cliquez sur le bouton ci-dessous pour activer votre compte. Ce lien expire dans <strong>24 heures</strong>.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${link}" style="display: inline-block; background: #1d4ed8; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 15px;">
            Confirmer mon adresse email
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Si vous n'avez pas créé de compte, ignorez cet email.</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0;">Ou copiez ce lien dans votre navigateur :<br/><span style="color: #1d4ed8;">${link}</span></p>
      </div>
      <div style="background: #1e293b; padding: 16px 24px; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">SmartTravel Agency — contact@smarttravel.tn</p>
      </div>
    </div>`;

  return sendEmail({ to, subject: 'Confirmez votre adresse email — SmartTravel', html })
}

module.exports = { sendEmail, sendVerificationEmail, notifyReservationCreee, notifyPaiementAccepte, notifyPaiementRefuse, notifyAnnulation, notifyFactureGuest };
