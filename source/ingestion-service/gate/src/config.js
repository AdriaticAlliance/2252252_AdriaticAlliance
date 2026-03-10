<<<<<<< HEAD
require('dotenv').config();

=======
>>>>>>> 55e4a569c7755da1d8329f89b780aba2491eaf3d
const SIMULATOR_HOST = process.env.SIMULATOR_HOST || 'simulator';
const SIMULATOR_PORT = process.env.SIMULATOR_PORT || '8080';
const INGESTION_INTERPRETER_HOST = process.env.INGESTION_INTERPRETER_HOST || 'ingestion-interpreter';
const INGESTION_INTERPRETER_PORT = process.env.INGESTION_INTERPRETER_PORT || '3002';
const INGESTION_GATE_HOST = process.env.INGESTION_GATE_HOST || 'ingestion-gate';
const INGESTION_GATE_PORT = process.env.INGESTION_GATE_PORT || '3001';

module.exports = {
  SIMULATOR_URL:    process.env.SIMULATOR_URL    || `http://${SIMULATOR_HOST}:${SIMULATOR_PORT}`,
  INTERPRETER_URL:  process.env.INTERPRETER_URL  || `http://${INGESTION_INTERPRETER_HOST}:${INGESTION_INTERPRETER_PORT}`,
  GATE_BASE_URL:    process.env.GATE_BASE_URL    || `http://${INGESTION_GATE_HOST}:${INGESTION_GATE_PORT}`,
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
