require('dotenv').config();
const http    = require('http');
const express = require('express');
const cors    = require('cors');
const swaggerUi = require('swagger-ui-express');

const config             = require('./config');
const swaggerSpec        = require('./swagger');
const { initDatabase }   = require('./db/database');
const { runMigrations }  = require('./db/migrations');
const wsServer           = require('./ws/wsServer');
const { startConsumer }  = require('./kafka/consumer');
const sensorService      = require('./services/sensorService');

const rulesRouter     = require('./routes/rules');
const actuatorsRouter = require('./routes/actuators');
const sensorsRouter   = require('./routes/sensors');

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ── OpenAPI / Swagger UI ──────────────────────────────────────────────────────
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Mars IoT — Rules Service API',
}));
app.get('/openapi.json', (req, res) => res.json(swaggerSpec));

// ── System routes ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Service health check
 *     responses:
 *       200:
 *         description: Health status
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'rules-service',
    cached_sensors: sensorService.getCacheSize(),
    uptime_s: Math.floor(process.uptime()),
  });
});

/**
 * @openapi
 * /meta:
 *   get:
 *     tags: [System]
 *     summary: List known sensors, actuators, and valid operators
 *     responses:
 *       200:
 *         description: Metadata for frontend dropdowns
 */
app.get('/meta', (req, res) => {
  res.json({
    known_sensors:   config.KNOWN_SENSORS,
    known_actuators: config.KNOWN_ACTUATORS,
    valid_operators: config.VALID_OPERATORS,
  });
});

// ── Domain routes ─────────────────────────────────────────────────────────────
app.use('/rules',     rulesRouter);
app.use('/actuators', actuatorsRouter);
app.use('/sensors',   sensorsRouter);

// ── Static Frontend ─────────────────────────────────────────────────────────────
const path = require('path');
app.use(express.static(path.join(__dirname, '../public/dist')));

// 404 fallback for API, SPA fallback for frontend
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/rules') || req.path.startsWith('/actuators') || req.path.startsWith('/sensors') || req.path.startsWith('/health') || req.path.startsWith('/meta') || req.path.startsWith('/docs')) {
    return res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
  }
  res.sendFile(path.resolve(__dirname, '../public/dist/index.html'));
});

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

  // 2. Connect Kafka consumers (retry loop)
  let retries = 15;
  while (retries > 0) {
    try {
      await startConsumer();
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
    console.log(`[rules-service] Swagger UI: http://localhost:${config.PORT}/docs`);
    console.log(`[rules-service] OpenAPI JSON: http://localhost:${config.PORT}/openapi.json`);
    console.log(`[rules-service] Simulator target: ${config.SIMULATOR_URL}`);
  });
}

main().catch(err => {
  console.error('[rules-service] Fatal startup error:', err);
  process.exit(1);
});
