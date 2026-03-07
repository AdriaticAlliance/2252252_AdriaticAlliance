const express = require('express');
const router  = express.Router();
const { getDb, save } = require('../db/database');
const config  = require('../config');
const fetch   = require('node-fetch');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function callSimulator(actuatorName, state) {
  const res = await fetch(
    `${config.SIMULATOR_URL}/api/actuators/${actuatorName}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    }
  );
  if (!res.ok) throw new Error(`Simulator returned ${res.status}`);
  return res.json();
}

function writeLog({ actuator, new_state, trigger_type, rule_id = null, sensor_id = null, metric = null, sensor_value = null }) {
  const db = getDb();
  db.run(
    `INSERT INTO actuator_logs
       (actuator, new_state, trigger_type, rule_id, sensor_id, metric, sensor_value)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [actuator, new_state, trigger_type, rule_id, sensor_id, metric, sensor_value]
  );
  save();
}

function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /actuators — list current states from simulator
router.get('/', async (req, res) => {
  try {
    const r = await fetch(`${config.SIMULATOR_URL}/api/actuators`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Cannot reach simulator', detail: err.message });
  }
});

// GET /actuators/logs — audit log (must be BEFORE /:name)
router.get('/logs', (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit || '100'), 500);
    const offset = parseInt(req.query.offset || '0');
    const logs   = queryAll(
      'SELECT * FROM actuator_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    res.json({ data: logs, count: logs.length, limit, offset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /actuators/:name — manual toggle
router.post('/:name', async (req, res) => {
  const { name } = req.params;
  const { state } = req.body;

  if (!config.KNOWN_ACTUATORS.includes(name))
    return res.status(404).json({ error: `Unknown actuator: ${name}` });

  if (!['ON', 'OFF'].includes(state))
    return res.status(400).json({ error: 'state must be "ON" or "OFF"' });

  try {
    const result = await callSimulator(name, state);
    writeLog({ actuator: name, new_state: state, trigger_type: 'manual' });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Simulator call failed', detail: err.message });
  }
});

module.exports = { router, callSimulator, writeLog };
