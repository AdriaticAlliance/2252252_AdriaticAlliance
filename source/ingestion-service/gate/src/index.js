require('dotenv').config();
const http   = require('http');
const config = require('./config');
const { startPolling }       = require('./poller');
const { startSubscriptions } = require('./subscriber');

// ── Simple health endpoint ────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'ingestion-gate' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// ── Start everything ──────────────────────────────────────────────────────────
console.log('[Gate] Starting ingestion gate...');
console.log(`[Gate] Simulator: ${config.SIMULATOR_URL}`);
console.log(`[Gate] Interpreter: ${config.INTERPRETER_URL}`);

startPolling();
startSubscriptions();

server.listen(config.PORT, () => {
  console.log(`[Gate] Health endpoint on port ${config.PORT}`);
});
