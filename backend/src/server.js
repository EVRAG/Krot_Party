import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fetch from 'node-fetch';
import { nanoid } from 'nanoid';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const port = process.env.PORT || 4000;
const corsOrigin = process.env.CORS_ORIGIN || '*';
const forwardUrl = process.env.FORWARD_URL || '';

app.use(morgan('dev'));
app.use(express.json());
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(','), credentials: false }));

/** In-memory message store */
const messages = [];

/** SSE clients */
const sseClients = new Set();

/** HTTP server wrapper (needed for WS) */
const server = createServer(app);

/** WebSocket server */
const wss = new WebSocketServer({ server, path: '/ws' });

function wsBroadcast(type, payload) {
  const message = JSON.stringify({ type, payload });
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */) {
      try { client.send(message); } catch {}
    }
  }
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch {}
  }
  // Mirror to WS with normalized types
  const map = { created: 'created', accepted: 'accepted', cancelled: 'cancelled' };
  wsBroadcast(map[event] || event, data);
}

wss.on('connection', (ws) => {
  // Send initial snapshot
  ws.send(JSON.stringify({ type: 'init', payload: messages }));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Ingest text
app.post('/ingest', (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }
  const msg = { id: nanoid(), text, status: 'pending', createdAt: new Date().toISOString() };
  messages.unshift(msg);
  broadcast('created', msg);
  res.status(201).json(msg);
});

// List items
app.get('/items', (req, res) => {
  res.json(messages);
});

// Accept item and optionally forward
app.post('/accept/:id', async (req, res) => {
  const { id } = req.params;
  const msg = messages.find(m => m.id === id);
  if (!msg) return res.status(404).json({ error: 'not_found' });
  if (msg.status === 'accepted') return res.json(msg);

  // If no forward URL, accept locally and broadcast
  if (!forwardUrl) {
    msg.status = 'accepted';
    msg.acceptedAt = new Date().toISOString();
    msg.forwardSkipped = true;
    broadcast('accepted', { id: msg.id, text: msg.text });
    return res.json(msg);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const r = await fetch(forwardUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: msg.text, id: msg.id }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return res.status(502).json({ error: 'forward_failed', status: r.status, body });
    }
    msg.status = 'accepted';
    msg.acceptedAt = new Date().toISOString();
    broadcast('accepted', { id: msg.id, text: msg.text });
    res.json(msg);
  } catch (e) {
    return res.status(502).json({ error: 'forward_error', message: String(e) });
  }
});

// Cancel item
app.post('/cancel/:id', (req, res) => {
  const { id } = req.params;
  const msg = messages.find(m => m.id === id);
  if (!msg) return res.status(404).json({ error: 'not_found' });
  if (msg.status === 'cancelled') return res.json(msg);
  msg.status = 'cancelled';
  msg.cancelledAt = new Date().toISOString();
  broadcast('cancelled', { id: msg.id });
  res.json(msg);
});

// SSE stream
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: init\ndata: ${JSON.stringify(messages)}\n\n`);

  sseClients.add(res);
  req.on('close', () => {
    sseClients.delete(res);
    res.end();
  });
});

server.listen(port, () => {
  console.log(`Backend listening on :${port} (HTTP + WS /ws)`);
});
