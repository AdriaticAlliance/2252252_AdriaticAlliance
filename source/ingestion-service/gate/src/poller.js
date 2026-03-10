const config = require('./config');

const REST_SENSORS = [
  'greenhouse_temperature', 'entrance_humidity', 'co2_hall',
  'corridor_pressure',      'hydroponic_ph',     'water_tank_level',
  'air_quality_pm25',       'air_quality_voc',
];

// Call the Gate's own REST endpoint (keeps the architecture intact)
async function triggerPoll(sensorName) {
  try {
    const res = await fetch(
      `${config.GATE_BASE_URL}/sensors/${encodeURIComponent(sensorName)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.error(`[AutoPoller] Failed to trigger poll for ${sensorName}:`, err.message);
  }
}

function startAutoPolling() {
  const INTERVAL = parseInt(process.env.SENSOR_POLL_INTERVAL_MS || '5000');
  console.log(`[AutoPoller] Starting autonomous polling every ${INTERVAL}ms`);

  // Poll immediately on startup
  REST_SENSORS.forEach(s => triggerPoll(s));

  // Then poll on interval
  setInterval(() => {
    REST_SENSORS.forEach(s => triggerPoll(s));
  }, INTERVAL);
}

module.exports = { startAutoPolling };
