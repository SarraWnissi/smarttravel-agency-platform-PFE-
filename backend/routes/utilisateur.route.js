const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/utilisateur');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

// GET ALL USERS
router.get('/', verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  try {
    const users = await Utilisateur.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});


// CHANGE STATUS
router.get('/status/edit', verifyToken, authorizeRole("ADMIN"),async (req, res) => {
  try {
    let email = req.query.email;

    let user = await Utilisateur.findOne({ email });

    if (!user) {
      return res.status(404).send({ success: false, message: "User not found" });
    }

    user.etatCompte =
      user.etatCompte === "ACTIF" ? "SUSPENDU" : "ACTIF";

    await user.save();

    res.status(200).send({ success: true, user });

  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});


// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstname, lastname } = req.body;

    if (!email || !password || !firstname || !lastname) {
      return res.status(400).send({
        success: false,
        message: "All fields are required"
      });
    }

    const exist = await Utilisateur.findOne({ email });
    if (exist) {
      return res.status(400).send({
        success: false,
        message: "User already exists"
      });
    }

    const newUser = new Utilisateur({
      email,
      password,   // ❌ PAS HASH ici
      firstname,
      lastname
    });

    const saved = await newUser.save();
console.log("USER SAVED =>", saved);
    res.status(201).send({
      success: true,
      message: "Account created successfully",
      user: saved
    });

  } catch (err) {
    console.log(err); // IMPORTANT
    res.status(500).send({
      success: false,
      message: err.message
    });
  }
});
// LOGIN
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({ success: false, message: "All fields are required" });
    }

    let user = await Utilisateur.findOne({ email });
    if (!user) {
      return res.status(404).send({ success: false, message: "Account doesn't exist" });
    }

    let isCorrectPassword = await bcrypt.compare(password, user.password);

    if (!isCorrectPassword) {
      return res.status(400).send({ success: false, message: "Invalid credentials" });
    }

  if (user.etatCompte !== "ACTIF") {
  return res.status(403).send({
    success: false,
    message: "Your account is inactive"
  });
}

    const token = jwt.sign(
      {
        id: user._id,
        name: user.firstname,
        role: user.role
      },
      process.env.SECRET,
      { expiresIn: "8h" }
    );

    user.password = undefined;

    res.status(200).send({ success: true, user, token });

  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});


// GET ONE 
router.get('/:id',verifyToken, authorizeRole("ADMIN"), async (req, res) => {
  const user = await Utilisateur.findById(req.params.id);
  res.json(user);
});


// UPDATE (ADMIN or self)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const isSelf = String(req.user.id) === String(req.params.id);
    if (!isAdmin && !isSelf) return res.status(403).json({ message: 'Accès refusé' });
    const { role, etatCompte, ...safeFields } = req.body;
    const updates = isAdmin ? req.body : safeFields;
    const user = await Utilisateur.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// DELETE (ADMIN or self)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const isSelf = String(req.user.id) === String(req.params.id);
    if (!isAdmin && !isSelf) return res.status(403).json({ message: 'Accès refusé' });
    await Utilisateur.findByIdAndDelete(req.params.id);
    res.json({ message: "deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;