const { getDb, save } = require('../db/database');
const config = require('../config');
const fetch  = require('node-fetch');
const wsServer = require('../ws/wsServer');

// ─── Simulator proxy ─────────────────────────────────────────────────────────

async function callSimulator(actuatorName, state, context = {}) {
  const res = await fetch(
    `${config.SIMULATOR_URL}/api/actuators/${actuatorName}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    }
  );
  if (!res.ok) throw new Error(`Simulator returned ${res.status}`);
  const data = await res.json();

  // Broadcast actuator state change to all WebSocket clients
  wsServer.broadcast({
    type: 'actuator_update',
    payload: {
      actuator:     actuatorName,
      state:        state,
      trigger_type: context.trigger_type || 'unknown',
      rule_id:      context.rule_id || null,
      timestamp:    new Date().toISOString(),
    },
  });

  return data;
}

async function getSimulatorStates() {
  const res = await fetch(`${config.SIMULATOR_URL}/api/actuators`);
  if (!res.ok) throw new Error(`Simulator returned ${res.status}`);
  return res.json();
}

// ─── Audit log ────────────────────────────────────────────────────────────────

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

function getLogs(limit = 100, offset = 0) {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT * FROM actuator_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?'
  );
  stmt.bind([limit, offset]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ─── Manual toggle ────────────────────────────────────────────────────────────

async function manualToggle(name, state) {
  const result = await callSimulator(name, state, { trigger_type: 'manual' });
  writeLog({ actuator: name, new_state: state, trigger_type: 'manual' });
  return result;
}

module.exports = { callSimulator, getSimulatorStates, writeLog, getLogs, manualToggle };
