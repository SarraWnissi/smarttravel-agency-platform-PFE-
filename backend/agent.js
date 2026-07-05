// agent.js
// ======================================================
// AI HOTEL AGENT - SMART CONVERSATIONAL VERSION
// node agent.js
// ======================================================

require('dotenv').config();

const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');

// ======================================================
// CONFIG
// ======================================================

const PORT = process.env.AGENT_PORT || 4000;

const MCP_URL =
  process.env.MCP_URL ||
  'http://localhost:3000/tools';

const MONGO_URI = process.env.DATABASECLOUD;

const OLLAMA_URL =
  process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || 'llama3.2:3b';

// ======================================================
// LOGS
// ======================================================

console.log('==================================================');
console.log('🤖 AI HOTEL AGENT SMART');
console.log('==================================================');
console.log('PORT:', PORT);
console.log('MCP :', MCP_URL);
console.log('DB  :', MONGO_URI);
console.log('OLLAMA:', OLLAMA_MODEL);
console.log('==================================================');

// ======================================================
// EXPRESS
// ======================================================

const app = express();
app.use(express.json({ limit: '2mb' }));

// ======================================================
// MONGODB
// ======================================================

async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });

    console.log('✅ MongoDB connected');

  } catch (err) {

    console.error('❌ MongoDB error', err);
    process.exit(1);

  }
}

// ======================================================
// MEMORY
// ======================================================

const memorySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true
    },

    history: [
      {
        role: String,
        content: String,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    context: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

const Memory = mongoose.model('memory', memorySchema);

// ======================================================
// MCP CALL
// ======================================================

async function callMCP(toolName, args = {}, token) {

  try {

    console.log('📤 MCP CALL:', toolName);
    console.log(args);

    const res = await axios.post(
      `${MCP_URL}/${toolName}`,
      args,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return res.data;

  } catch (err) {

    console.error(`❌ MCP ERROR ${toolName}`);

    return {
      ok: false,
      error: err.response?.data || err.message
    };

  }
}

// ======================================================
// INTENT DETECTION
// ======================================================

function detectIntent(message = '') {

  const text = message.toLowerCase();

  if (
    text.includes('réserver') ||
    text.includes('reservation')
  ) {
    return 'create_reservation';
  }

  if (
    text.includes('annuler')
  ) {
    return 'cancel_reservation';
  }

  if (
    text.includes('payer') ||
    text.includes('paiement')
  ) {
    return 'create_paiement';
  }

  return 'ai';
}

// ======================================================
// QUESTIONS
// ======================================================

const questions = {

  typeReservation:
    'Quel type de réservation ? HOTEL / EXCURSION / INTERNATIONALE',

  offreID:
    'Quel est le ID de l’offre ?',

  chambreID:
    'Quel est le ID de la chambre ?',

  dateDebutSejour:
    'Quelle est la date d’arrivée ? (YYYY-MM-DD)',

  dateFinSejour:
    'Quelle est la date de départ ? (YYYY-MM-DD)',

  nbPersonnes:
    'Combien de personnes ?',

  dateExcursion:
    'Quelle est la date de l’excursion ?',

  numPassport:
    'Quel est votre numéro de passeport ?',

  visa:
    'Avez-vous un visa ?',

  paysDestination:
    'Quel est le pays de destination ?',

  reservationID:
    'Quel est le ID de la réservation ?',

  montant:
    'Quel est le montant du paiement ?'
};

// ======================================================
// REQUIRED FIELDS
// ======================================================

function getRequiredFields(type) {

  if (type === 'HOTEL') {

    return [
      'offreID',
      'chambreID',
      'dateDebutSejour',
      'dateFinSejour',
      'nbPersonnes'
    ];
  }

  if (type === 'EXCURSION') {

    return [
      'offreID',
      'dateExcursion',
      'nbPersonnes'
    ];
  }

  if (type === 'INTERNATIONALE') {

    return [
      'offreID',
      'dateDebutSejour',
      'dateFinSejour',
      'nbPersonnes',
      'numPassport',
      'visa',
      'paysDestination'
    ];
  }

  return [];
}

// ======================================================
// FIND MISSING FIELD
// ======================================================

function getMissingField(context) {

  if (!context.typeReservation) {
    return 'typeReservation';
  }

  const requiredFields =
    getRequiredFields(context.typeReservation);

  for (const field of requiredFields) {

    if (
      context[field] === undefined ||
      context[field] === null ||
      context[field] === ''
    ) {
      return field;
    }
  }

  return null;
}

// ======================================================
// SAVE FIELD
// ======================================================

function saveField(context, field, value) {

  if (field === 'nbPersonnes') {
    context[field] = Number(value);
    return;
  }

  context[field] = value;
}

// ======================================================
// OLLAMA
// ======================================================

async function callOllama(messages) {

  const res = await axios.post(
    `${OLLAMA_URL}/api/chat`,
    {
      model: OLLAMA_MODEL,
      messages,
      stream: false
    }
  );

  return res.data.message.content;
}

// ======================================================
// AGENT
// ======================================================

async function agent(userId, message, token) {

  let memory =
    await Memory.findOne({ userId });

  if (!memory) {

    memory =
      await Memory.create({
        userId,
        history: [],
        context: {}
      });
  }

  const context = memory.context;

  // ====================================================
  // INTENT
  // ====================================================

  if (!context.intent) {

    context.intent =
      detectIntent(message);

    console.log('🧠 Intent:', context.intent);

    // ==================================================
    // CREATE RESERVATION
    // ==================================================

    if (
      context.intent ===
      'create_reservation'
    ) {

      const missing =
        getMissingField(context);

      memory.markModified('context');
      await memory.save();

      return {
        ok: true,
        response: questions[missing]
      };
    }

    // ==================================================
    // CANCEL
    // ==================================================

    if (
      context.intent ===
      'cancel_reservation'
    ) {

      context.waitingField =
        'reservationID';

      memory.markModified('context');
      await memory.save();

      return {
        ok: true,
        response:
          questions.reservationID
      };
    }

    // ==================================================
    // PAYMENT
    // ==================================================

    if (
      context.intent ===
      'create_paiement'
    ) {

      context.waitingField =
        'reservationID';

      memory.markModified('context');
      await memory.save();

      return {
        ok: true,
        response:
          questions.reservationID
      };
    }
  }

  // ====================================================
  // RESERVATION FLOW
  // ====================================================

  if (
    context.intent ===
    'create_reservation'
  ) {

    const currentMissing =
      getMissingField(context);

    if (currentMissing) {

      saveField(
        context,
        currentMissing,
        message
      );
    }

    const nextMissing =
      getMissingField(context);

    // ================================================
    // ASK NEXT QUESTION
    // ================================================

    if (nextMissing) {

      memory.markModified('context');
      await memory.save();

      return {
        ok: true,
        response:
          questions[nextMissing]
      };
    }

    // ================================================
    // FINAL PAYLOAD
    // ================================================

    const payload = {

      offreID:
        context.offreID,

      chambreID:
        context.chambreID,

      typeReservation:
        context.typeReservation,

      dateDebutSejour:
        context.dateDebutSejour,

      dateFinSejour:
        context.dateFinSejour,

      nbPersonnes:
        context.nbPersonnes,

      dateExcursion:
        context.dateExcursion,

      numPassport:
        context.numPassport,

      visa:
        context.visa,

      paysDestination:
        context.paysDestination
    };

    console.log('✅ FINAL PAYLOAD');
    console.log(payload);

    // ================================================
    // MCP CREATE RESERVATION
    // ================================================

    const mcpData =
      await callMCP(
        'create_reservation',
        payload,
        token
      );

    // ================================================
    // RESET CONTEXT
    // ================================================

    memory.context = {};

    memory.history.push(
      {
        role: 'user',
        content: message
      },
      {
        role: 'assistant',
        content:
          JSON.stringify(mcpData)
      }
    );

    await memory.save();

    return {
      ok: true,
      intent: 'create_reservation',
      mcpData,
      response:
        '✅ Réservation créée avec succès.'
    };
  }

  // ====================================================
  // CANCEL FLOW
  // ====================================================

  if (
    context.intent ===
    'cancel_reservation'
  ) {

    if (!context.reservationID) {

      context.reservationID = message;

      const mcpData =
        await callMCP(
          'cancel_reservation',
          {
            reservationID:
              context.reservationID
          },
          token
        );

      memory.context = {};
      await memory.save();

      return {
        ok: true,
        mcpData,
        response:
          '✅ Réservation annulée.'
      };
    }
  }

  // ====================================================
  // PAYMENT FLOW
  // ====================================================

  if (
    context.intent ===
    'create_paiement'
  ) {

    if (!context.reservationID) {

      context.reservationID = message;

      context.waitingField =
        'montant';

      memory.markModified('context');
      await memory.save();

      return {
        ok: true,
        response:
          questions.montant
      };
    }

    if (!context.montant) {

      context.montant =
        Number(message);

      const mcpData =
        await callMCP(
          'create_paiement',
          {
            reservationID:
              context.reservationID,

            montant:
              context.montant
          },
          token
        );

      memory.context = {};
      await memory.save();

      return {
        ok: true,
        mcpData,
        response:
          '✅ Paiement effectué.'
      };
    }
  }

  // ====================================================
  // FALLBACK OLLAMA
  // ====================================================

  const reply =
    await callOllama([
      {
        role: 'system',
        content:
          'Tu es un assistant hôtel professionnel.'
      },
      {
        role: 'user',
        content: message
      }
    ]);

  return {
    ok: true,
    response: reply
  };
}

// ======================================================
// ROUTES
// ======================================================

app.get('/health', (req, res) => {

  res.json({
    ok: true
  });
});

app.post('/chat', async (req, res) => {

  try {

    const {
      userId,
      message,
      token
    } = req.body;

    if (!userId || !message) {

      return res.status(400).json({
        ok: false,
        error:
          'userId & message required'
      });
    }

    const finalToken =
      token ||
      process.env.MCP_API_TOKEN;

    const result =
      await agent(
        userId,
        message,
        finalToken
      );

    res.json(result);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      ok: false,
      error: err.message
    });

  }
});

// ======================================================
// START
// ======================================================

async function start() {

  await connectMongo();

  app.listen(PORT, () => {

    console.log('==================================================');
    console.log(`🚀 Agent running on http://localhost:${PORT}`);
    console.log('==================================================');

  });
}

start();

// ======================================================
// ERRORS
// ======================================================

process.on(
  'unhandledRejection',
  console.error
);

process.on(
  'uncaughtException',
  console.error
);