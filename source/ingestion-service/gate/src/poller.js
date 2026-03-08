const fetch    = require('node-fetch');
const config   = require('./config');
const { forward } = require('./forwarder');

async function pollOnce(sensorId) {
  try {
    const res = await fetch(`${config.SIMULATOR_URL}/api/sensors/${sensorId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    await forward('rest', sensorId, raw);
  } catch (err) {
    console.error(`[Poller] Failed to poll ${sensorId}:`, err.message);
  }
}

function startPolling() {
  console.log(`[Poller] Polling ${config.REST_SENSORS.length} sensors every ${config.POLL_INTERVAL_MS}ms`);

  setInterval(async () => {
    await Promise.all(config.REST_SENSORS.map(id => pollOnce(id)));
  }, config.POLL_INTERVAL_MS);

  // Also poll immediately on startup
  Promise.all(config.REST_SENSORS.map(id => pollOnce(id)));
}

module.exports = { startPolling };
