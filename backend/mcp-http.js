// mcp-http.js - HTTP wrapper pour réutiliser HotelMCPServer via createHotelMCPInstance()
// Usage: node mcp-http.js
// comme api gateway pour n8n ou autres clients HTTP (ex: frontend React)
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));
// Evite la page HTML Express quand le JSON est invalide
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }
  return next(err);
});
app.use(morgan('tiny'));

function tryParseJsonText(text) {
  if (typeof text !== 'string') return null;
  const s = text.trim();
  if (!s) return null;

  // Heuristique: si ça ne ressemble pas à du JSON, on ne tente pas
  const first = s[0];
  if (first !== '{' && first !== '[') return null;

  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
// Auth middleware: MCP_API_TOKEN (machine) OR JWT (user)
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Missing Authorization header' });
  }

  // 1. MACHINE AUTH (n8n / API)
  if (process.env.MCP_API_TOKEN && token === process.env.MCP_API_TOKEN) {
    req.mcpSession = { authType: 'machine' };
    return next();
  }

  // 2. USER AUTH (JWT)
  try {
    const payload = jwt.verify(token, process.env.SECRET);
    req.mcpSession = { authType: 'jwt', user: payload, token };
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
}
// Health
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Lazy MCP instance
let mcpInstance = null;
async function ensureMcpInstance() {
  if (mcpInstance) return mcpInstance;

  // Ensure mongoose is connected (so models work in the instance)
  const MONGO_URI = process.env.DATABASECLOUD || process.env.MONGO_URI || process.env.DATABASE || 'mongodb://127.0.0.1:27017/base';
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI, { dbName: 'base' });
    console.error('mcp-http: MongoDB connected (wrapper)');
  }

  // require the mcp-server module (must export createHotelMCPInstance)
  const mcpModulePath = path.join(__dirname, 'mcp-server.js'); 
  let mcpModule;
  try {
    mcpModule = require(mcpModulePath);
  } catch (err) {
    throw new Error(`Impossible de charger le module MCP à ${mcpModulePath}: ${err.message}`);
  }
  if (!mcpModule || typeof mcpModule.createHotelMCPInstance !== 'function') {
    throw new Error('Le module MCP doit exporter createHotelMCPInstance()');
  }

  mcpInstance = await mcpModule.createHotelMCPInstance();
  console.log('mcp-http: MCP instance ready');
  return mcpInstance;
}
function injectSession(inst, req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (req.mcpSession?.authType === 'jwt') {
    inst.SESSION = {
      token,
      user: req.mcpSession.user
    };
  }
}
// GET /tools -> appelle handleToolsList()
app.get('/tools', authMiddleware, async (req, res) => {
  try {
    const inst = await ensureMcpInstance();

    const prevSession = { ...inst.SESSION };
    injectSession(inst, req);

    const result = await inst.handleToolsList();

    inst.SESSION = prevSession;

    return res.json({ ok: true, result });
  } catch (err) {
    console.error('/tools error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});
// POST /tools/:name -> invoque handleToolCall({ params: { name, arguments } })
app.post('/tools/:name', authMiddleware, async (req, res) => {
  const toolName = req.params.name;
  const args = req.body || {};

  try {
    const inst = await ensureMcpInstance();

    const prevSession = { ...inst.SESSION };
    injectSession(inst, req);

    const result = await inst.handleToolCall({
      params: { name: toolName, arguments: args }
    });

    inst.SESSION = prevSession;

    const firstText = result?.content?.[0]?.text;
    const parsed = tryParseJsonText(firstText);

    if (result?.isError) {
      return res.status(400).json({
        ok: false,
        result,
        parsed,
        text: firstText
      });
    }

    return res.json({
      ok: true,
      result,
      parsed,
      text: firstText
    });

  } catch (err) {
    console.error(`Tool error ${toolName}:`, err);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

// START server + graceful shutdown
const port = Number(process.env.MCP_HTTP_PORT || process.env.MCP_PORT || 3000);
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`MCP HTTP wrapper listening on port ${port} (MCP_API_TOKEN set: ${!!process.env.MCP_API_TOKEN})`);
});

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down...`);
  try {
    server.close(() => console.log('HTTP server closed.'));
    // disconnect mongoose if connected
    if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Shutdown error:', err);
    process.exit(1);
  }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (r) => console.error('Unhandled Rejection:', r));
process.on('uncaughtException', (e) => { console.error('Uncaught Exception:', e); shutdown('uncaughtException'); });