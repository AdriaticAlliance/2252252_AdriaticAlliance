const normalizers = {
  scalar:      require('./scalar'),
  chemistry:   require('./chemistry'),
  particulate: require('./particulate'),
  level:       require('./level'),
  power:       require('./power'),
  environment: require('./environment'),
  thermalLoop: require('./thermalLoop'),
  airlock:     require('./airlock'),
};

const config = require('../config');

function normalize(sensorId, sourceType, rawPayload) {
  const family = config.SENSOR_SCHEMA_MAP[sensorId];
  if (!family) {
    console.warn(`[Normalizer] Unknown sensor_id: ${sensorId} — skipping`);
    return [];
  }
  const fn = normalizers[family];
  if (!fn) {
    console.warn(`[Normalizer] No normalizer for family: ${family} — skipping`);
    return [];
  }
  return fn(sensorId, sourceType, rawPayload);
}

module.exports = { normalize };
