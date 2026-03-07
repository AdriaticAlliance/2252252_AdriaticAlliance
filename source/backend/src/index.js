require('dotenv').config();
const http    = require('http');
const express = require('express');
const cors    = require('cors');

const config             = require('./config');
const { initDatabase }   = require('./db/database');
const { runMigrations }  = require('./db/migrations');
const wsServer           = require('./ws/wsServer');
const { startConsumer }  = require('./kafka/consumer');
const { startWarningConsumer } = require('./kafka/warningConsumer');

const rulesRouter     = require('./routes/rules');
const { router: actuatorsRouter } = require('./routes/actuators');
const sensorsRouter   = require('./routes/sensors');

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  const sensorCache = require('./state/sensorCache');
  res.json({
    status: 'ok',
    service: 'rules-service',
    cached_sensors: sensorCache.size(),
    uptime_s: Math.floor(process.uptime()),
  });
});

// Expose known sensors/actuators (useful for Student C's dropdowns)
app.get('/meta', (req, res) => {
  res.json({
    known_sensors:   config.KNOWN_SENSORS,
    known_actuators: config.KNOWN_ACTUATORS,
    valid_operators: config.VALID_OPERATORS,
  });
});

app.use('/rules',     rulesRouter);
app.use('/actuators', actuatorsRouter);
app.use('/sensors',   sensorsRouter);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Express] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── HTTP + WebSocket server ───────────────────────────────────────────────────
const server = http.createServer(app);
wsServer.init(server);

// ── Start everything ──────────────────────────────────────────────────────────
async function main() {
  console.log('[rules-service] Starting...');

  // 1. Initialize SQLite + run migrations
  await initDatabase();
  runMigrations();

  // 2. Connect Kafka consumers (retry loop in case Kafka isn't ready yet)
  let retries = 3;
  while (retries > 0) {
    try {
      await startConsumer();
      await startWarningConsumer();
      break;
    } catch (err) {
      retries--;
      console.warn(`[rules-service] Kafka not ready, retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  if (retries === 0) {
    console.error('[rules-service] Could not connect to Kafka. Starting HTTP-only mode.');
  }

  // 3. Start HTTP + WS server
  server.listen(config.PORT, () => {
    console.log(`[rules-service] HTTP + WS listening on port ${config.PORT}`);
    console.log(`[rules-service] Simulator target: ${config.SIMULATOR_URL}`);
  });
}

main().catch(err => {
  console.error('[rules-service] Fatal startup error:', err);
  process.exit(1);
});
