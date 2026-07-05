const express = require('express')
const router = express.Router()
const Utilisateur = require('../models/utilisateur')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { sendVerificationEmail } = require('../services/notificationService')
/* REGISTER seul admin
router.post('/register', async (req, res) => {
  try {
    const { firstname, lastname, email, password, role } = req.body;

    const exist = await Utilisateur.findOne({ email });
    if (exist) return res.status(400).json({ message: "User exists" });

    const user = new Utilisateur({
      firstname,
      lastname,
      email,
      password,
      role: role || "CLIENT"
    });

    await user.save();

    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(500).json(err);
  }
});*/


// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { firstname, lastname, email, password } = req.body

    const exist = await Utilisateur.findOne({ email })
    if (exist) return res.status(400).json({ message: "User exists" })

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const user = new Utilisateur({
      firstname, lastname, email, password,
      emailVerified: false,
      verificationToken: token,
      verificationTokenExpiry: expiry
    })
    await user.save()

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    sendVerificationEmail({ to: email, name: firstname, token, frontendUrl }).catch(() => {})

    res.status(201).json({ message: "User created" })
  } catch (err) {
    res.status(500).json(err)
  }
})

// VERIFY EMAIL
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await Utilisateur.findOne({
      verificationToken: req.params.token,
      verificationTokenExpiry: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({ message: "Lien invalide ou expiré" })
    }

    user.emailVerified = true
    user.verificationToken = undefined
    user.verificationTokenExpiry = undefined
    await user.save()

    res.json({ message: "Email confirmé avec succès" })
  } catch (err) {
    res.status(500).json(err)
  }
})

// RENVOYER EMAIL DE VERIFICATION
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body
    const user = await Utilisateur.findOne({ email })

    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" })
    if (user.emailVerified) return res.status(400).json({ message: "Email déjà confirmé" })

    const token = crypto.randomBytes(32).toString('hex')
    user.verificationToken = token
    user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await user.save()

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    await sendVerificationEmail({ to: email, name: user.firstname, token, frontendUrl })

    res.json({ message: "Email de vérification renvoyé" })
  } catch (err) {
    res.status(500).json(err)
  }
})

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await Utilisateur.findOne({ email })
    if (!user) return res.status(404).json({ message: "User not found" })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(400).json({ message: "Wrong password" })

    if (!user.emailVerified && user.verificationToken) {
      return res.status(403).json({ message: "Veuillez confirmer votre adresse email avant de vous connecter." })
    }

    if (user.etatCompte !== "ACTIF") {
      return res.status(403).json({ message: "Your account is inactive" })
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.SECRET,
      { expiresIn: "8h" }
    )

    res.json({ user, token })

  } catch (err) {
    res.status(500).json(err)
  }
})

module.exports = router