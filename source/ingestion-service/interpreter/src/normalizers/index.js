// Sensor → schema family mapping (from SCHEMA_CONTRACT.md)
const SCHEMA_MAP = {
  greenhouse_temperature: 'scalar',
  entrance_humidity:      'scalar',
  co2_hall:               'scalar',
  corridor_pressure:      'scalar',
  hydroponic_ph:          'chemistry',
  water_tank_level:       'level',
  air_quality_pm25:       'particulate',
  air_quality_voc:       'chemistry',
  'mars/telemetry/solar_array':       'power',
  'mars/telemetry/power_bus':         'power',
  'mars/telemetry/power_consumption': 'power',
  'mars/telemetry/radiation':         'environment',
  'mars/telemetry/life_support':      'environment',
  'mars/telemetry/thermal_loop':      'thermalLoop',
  'mars/telemetry/airlock':           'airlock',
};

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

function normalize(sensorId, sourceType, rawPayload) {
  const family = SCHEMA_MAP[sensorId];
  if (!family || !normalizers[family]) {
    console.warn(`[Normalizer] Unknown sensor: ${sensorId} — skipping`);
    return [];
  }
  try {
    return normalizers[family](sensorId, sourceType, rawPayload);
  } catch (err) {
    console.error(`[Normalizer] Failed to normalize ${sensorId}:`, err.message);
    return [];
  }
}

module.exports = { normalize };
