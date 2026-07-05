require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')

// Importer les modèles
const Reservation = require('./models/reservation');
const Utilisateur = require('./models/utilisateur');
const Chambre = require('./models/chambre');
const Offre = require('./models/offre');
const Service = require('./models/service');
const Hebergement = require('./models/hebergement');
const Avis = require('./models/avis');
const Facture = require('./models/facture');
const Paiement = require('./models/paiement');
const Preference = require('./models/preference');
const Circuit = require('./models/circuit');
const Transport = require('./models/transport');
const Blocage = require('./models/blocage');

const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

// ROUTES existantes
app.use('/api/auth', require('./routes/auth.route'))
app.use('/api/users', require('./routes/utilisateur.route'))
app.use('/api/services', require('./routes/service.route'))
app.use('/api/hebergements', require('./routes/hebergement.route'))
app.use('/api/reservations', require('./routes/reservation.route'))
app.use('/api/avis', require('./routes/avis.route'))
app.use('/api/chambres', require('./routes/chambre.route'))
app.use('/api/factures', require('./routes/facture.route'))
app.use('/api/offres', require('./routes/offre.route'))
app.use('/api/paiements', require('./routes/paiement.route'))

app.use('/api/circuits', require('./routes/circuit.route'))
app.use('/api/transports', require('./routes/transport.route'))

// NOUVELLES ROUTES
app.use('/api/preferences', require('./routes/preference.route'))
app.use('/api/ai', require('./routes/ai.route'))
app.use('/api/guest', require('./routes/guest.route'))
app.use('/api/blocages', require('./routes/blocage.route'))
app.use('/api/campagnes', require('./routes/campagne.route'))
app.use('/api/video',    require('./routes/video.route'))
app.use('/api/image-proxy', require('./routes/image.route'))


// Route de test email (dev uniquement)
app.get('/api/test-email', async (req, res) => {
  const { sendEmail } = require('./services/notificationService');
  const to = req.query.to || process.env.SMTP_USER;
  try {
    await sendEmail({
      to,
      subject: 'Test SmartTravel — Email opérationnel ✅',
      html: '<p>Ceci est un email de test SmartTravel. Si vous recevez ce message, la configuration SMTP fonctionne correctement.</p>',
    });
    res.json({ success: true, message: `Email envoyé à ${to}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DB
mongoose.connect(process.env.DATABASECLOUD, {
  dbName: "base",
  
})
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err))
// SERVER
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`)
})