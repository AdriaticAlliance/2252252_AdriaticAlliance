require('dotenv').config();

module.exports = {
  SIMULATOR_URL:    process.env.SIMULATOR_URL    || 'http://simulator:8080',
  INTERPRETER_URL:  process.env.INTERPRETER_URL  || 'http://ingestion-interpreter:3002',
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || '5000'),
  PORT: 3001,

  REST_SENSORS: [
    'greenhouse_temperature', 'entrance_humidity', 'co2_hall',
    'corridor_pressure', 'hydroponic_ph', 'water_tank_level',
    'air_quality_pm25', 'air_quality_voc',
  ],

  TELEMETRY_TOPICS: [
    'mars/telemetry/solar_array',
    'mars/telemetry/power_bus',
    'mars/telemetry/power_consumption',
    'mars/telemetry/radiation',
    'mars/telemetry/life_support',
    'mars/telemetry/thermal_loop',
    'mars/telemetry/airlock',
  ],
};
