require('dotenv').config();

<<<<<<< HEAD
module.exports = {
  PORT:                    parseInt(process.env.PORT || '4000'),
  KAFKA_BROKER:            process.env.KAFKA_BROKER || 'localhost:9092',
  SIMULATOR_URL:           process.env.SIMULATOR_URL || 'http://localhost:8080',
=======
const SIMULATOR_HOST = process.env.SIMULATOR_HOST || 'simulator';
const SIMULATOR_PORT = process.env.SIMULATOR_PORT || '8080';
const RULES_SERVICE_HOST = process.env.RULES_SERVICE_HOST || 'rules-service';
const RULES_SERVICE_PORT = process.env.RULES_SERVICE_PORT || '4000';
const KAFKA_HOST = process.env.KAFKA_HOST || 'kafka';
const KAFKA_PORT = process.env.KAFKA_PORT || '9092';

module.exports = {
  PORT:                    parseInt(process.env.PORT || '4000'),
  KAFKA_BROKER:            process.env.KAFKA_BROKER || `${KAFKA_HOST}:${KAFKA_PORT}`,
  SIMULATOR_URL:           process.env.SIMULATOR_URL || `http://${SIMULATOR_HOST}:${SIMULATOR_PORT}`,
  RULES_SERVICE_BASE_URL:  process.env.RULES_SERVICE_BASE_URL || `http://${RULES_SERVICE_HOST}:${RULES_SERVICE_PORT}`,
>>>>>>> origin/network
  DB_PATH:                 process.env.DB_PATH || './data/rules.db',
  KAFKA_TOPIC_NORMALIZED:  process.env.KAFKA_TOPIC_NORMALIZED || 'mars.common-data-records',
  KAFKA_TOPIC_WARNINGS:    process.env.KAFKA_TOPIC_WARNINGS   || 'mars.common-data-records-warnings',
  KAFKA_GROUP_ID:          process.env.KAFKA_GROUP_ID || 'rules-service',

  // Whitelist from OpenAPI + SCHEMA_CONTRACT
  KNOWN_SENSORS: [
    'greenhouse_temperature', 'entrance_humidity', 'co2_hall',
    'corridor_pressure', 'hydroponic_ph', 'water_tank_level',
    'air_quality_pm25', 'air_quality_voc',
    'mars/telemetry/solar_array', 'mars/telemetry/power_bus',
    'mars/telemetry/power_consumption', 'mars/telemetry/radiation',
    'mars/telemetry/life_support', 'mars/telemetry/thermal_loop',
    'mars/telemetry/airlock',
  ],

  KNOWN_ACTUATORS: [
    'cooling_fan', 'entrance_humidifier', 'hall_ventilation', 'habitat_heater',
  ],

  VALID_OPERATORS: ['<', '<=', '=', '>', '>='],
};
