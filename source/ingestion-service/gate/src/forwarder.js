const fetch = require('node-fetch');
const config = require('./config');

async function forward(sourceType, sensorId, rawPayload) {
  try {
    const body = {
      source_type: sourceType,  // 'rest' or 'telemetry'
      sensor_id:   sensorId,
      received_at: new Date().toISOString(),
      payload:     rawPayload,
    };

    const res = await fetch(`${config.INTERPRETER_URL}/ingest`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`[Forwarder] Interpreter rejected ${sensorId}: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`[Forwarder] Could not reach interpreter for ${sensorId}:`, err.message);
  }
}

module.exports = { forward };
