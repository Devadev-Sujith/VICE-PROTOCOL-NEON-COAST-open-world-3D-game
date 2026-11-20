import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const PORT = Number(process.env.PORT || 8080);

// Load .env.local dynamically on the server so API keys stay 100% private & never leak to GitHub/browsers!
function readOpenAiConfig() {
  let apiKey = (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '').trim();
  let model = (process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini').trim();
  const envFile = path.join(ROOT_DIR, '.env.local');
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if ((k === 'OPENAI_API_KEY' || k === 'VITE_OPENAI_API_KEY') && v) apiKey = v;
      if ((k === 'OPENAI_MODEL' || k === 'VITE_OPENAI_MODEL') && v) model = v;
    }
  }
  return { apiKey, model };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
};

const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.wasm']);

// RAM + Gzip static asset cache for INSTANT load speed over public tunnels!
const assetCache = new Map(); // filePath -> { raw, gz, mime, cacheControl }

function loadAsset(filePath) {
  let entry = assetCache.get(filePath);
  if (entry) return entry;
  const raw = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const gz = COMPRESSIBLE.has(ext) ? zlib.gzipSync(raw, { level: 6 }) : null;
  const isImmutable =
    filePath.includes(`${path.sep}assets${path.sep}`) ||
    filePath.includes(`${path.sep}models${path.sep}`) ||
    filePath.includes(`${path.sep}draco${path.sep}`);
  const cacheControl = isImmutable ? 'public, max-age=31536000, immutable' : 'no-cache';
  entry = { raw, gz, mime, cacheControl };
  assetCache.set(filePath, entry);
  return entry;
}

// Pre-warm index.html & JS/CSS bundles in RAM on startup!
function prewarmDist() {
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) walk(full);
      else loadAsset(full);
    }
  };
  walk(DIST_DIR);
}
prewarmDist();

// SINGLE GLOBAL WORLD STATE
const clients = new Map(); // socket -> { playerId: string | null }
const latestStates = new Map(); // playerId -> raw state JSON string

function encodeWsFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let hdr;
  if (len < 126) {
    hdr = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    hdr = Buffer.alloc(4);
    hdr[0] = 0x81;
    hdr[1] = 126;
    hdr.writeUInt16BE(len, 2);
  } else {
    hdr = Buffer.alloc(10);
    hdr[0] = 0x81;
    hdr[1] = 127;
    hdr.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([hdr, payload]);
}

function broadcast(sender, text) {
  const frame = encodeWsFrame(text);
  for (const sock of clients.keys()) {
    if (sock !== sender && !sock.destroyed) {
      sock.write(frame);
    }
  }
}

async function handleNovaProxy(req, res) {
  const { apiKey, model } = readOpenAiConfig();
  if (!apiKey) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'no_api_key' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 64000) req.destroy();
  });
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: parsed.model || model,
          messages: parsed.messages || [],
          response_format: { type: 'json_object' },
          max_tokens: 180,
          temperature: 0.85,
        }),
      });
      const text = await upstream.text();
      res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
      res.end(text);
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/api/health') {
    const { apiKey } = readOpenAiConfig();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, ws: true, players: latestStates.size, novaAi: apiKey.length > 10 }));
    return;
  }

  if (urlPath === '/api/nova' && req.method === 'POST') {
    void handleNovaProxy(req, res);
    return;
  }

  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const asset = loadAsset(filePath);
  const acceptEnc = String(req.headers['accept-encoding'] || '');
  const useGzip = asset.gz && acceptEnc.includes('gzip');
  const buf = useGzip ? asset.gz : asset.raw;

  const headers = {
    'Content-Type': asset.mime,
    'Content-Length': buf.length,
    'Cache-Control': asset.cacheControl,
    Vary: 'Accept-Encoding',
  };
  if (useGzip) headers['Content-Encoding'] = 'gzip';

  res.writeHead(200, headers);
  if (req.method === 'HEAD') res.end();
  else res.end(buf);
});

// Zero-dependency RFC 6455 WebSocket upgrade for SINGLE GLOBAL WORLD multiplayer!
server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }
  socket.setNoDelay(true);
  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  const meta = { playerId: null };
  clients.set(socket, meta);

  // Immediately sync all currently active players in the single world to this new joiner!
  for (const stateJson of latestStates.values()) {
    if (!socket.destroyed) socket.write(encodeWsFrame(stateJson));
  }

  let rxBuf = head && head.length ? Buffer.from(head) : Buffer.alloc(0);

  const processFrames = () => {
    while (rxBuf.length >= 2) {
      const opcode = rxBuf[0] & 0x0f;
      const masked = (rxBuf[1] & 0x80) !== 0;
      let payloadLen = rxBuf[1] & 0x7f;
      let offset = 2;
      if (payloadLen === 126) {
        if (rxBuf.length < 4) break;
        payloadLen = rxBuf.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (rxBuf.length < 10) break;
        payloadLen = Number(rxBuf.readBigUInt64BE(2));
        offset = 10;
      }
      const maskLen = masked ? 4 : 0;
      if (rxBuf.length < offset + maskLen + payloadLen) break;

      const mask = masked ? rxBuf.subarray(offset, offset + 4) : null;
      const payload = Buffer.from(rxBuf.subarray(offset + maskLen, offset + maskLen + payloadLen));
      rxBuf = rxBuf.subarray(offset + maskLen + payloadLen);

      if (mask) {
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
      }
      if (opcode === 0x8) {
        socket.end();
        break;
      }
      if (opcode === 0x9) {
        socket.write(Buffer.from([0x8a, 0x00])); // Pong
        continue;
      }
      if (opcode === 0x1) {
        const text = payload.toString('utf8');
        try {
          const pkt = JSON.parse(text);
          if (pkt.t === 'state' && pkt.id) {
            meta.playerId = pkt.id;
            latestStates.set(pkt.id, text);
          } else if (pkt.t === 'leave' && pkt.id) {
            latestStates.delete(pkt.id);
          }
        } catch {
          // ignore
        }
        broadcast(socket, text);
      }
    }
  };

  if (rxBuf.length) processFrames();
  socket.on('data', (chunk) => {
    rxBuf = Buffer.concat([rxBuf, chunk]);
    processFrames();
  });

  const cleanup = () => {
    clients.delete(socket);
    if (meta.playerId) {
      latestStates.delete(meta.playerId);
      broadcast(socket, JSON.stringify({ t: 'leave', id: meta.playerId }));
    }
  };
  socket.on('close', cleanup);
  socket.on('error', cleanup);
});

server.listen(PORT, '0.0.0.0', () => {
  const { apiKey } = readOpenAiConfig();
  console.log(`VICE PROTOCOL: NEON COAST Single-World Server (GZIP RAM Cache) listening on http://0.0.0.0:${PORT} (OpenAI proxy: ${apiKey ? 'ACTIVE' : 'NOT SET'})`);
});
