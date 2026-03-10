const KAFKA_HOST = process.env.KAFKA_HOST || 'kafka';
const KAFKA_PORT = process.env.KAFKA_PORT || '9092';

module.exports = {
  PORT:         parseInt(process.env.PORT || '3002'),
  KAFKA_BROKER: process.env.KAFKA_BROKER || `${KAFKA_HOST}:${KAFKA_PORT}`,
  KAFKA_TOPIC:  process.env.KAFKA_TOPIC  || 'mars.common-data-records',

  // Maps sensor_id → normalizer family
  SENSOR_SCHEMA_MAP: {
    greenhouse_temperature: 'scalar',
    entrance_humidity:      'scalar',
    co2_hall:               'scalar',
    corridor_pressure:      'scalar',
    hydroponic_ph:          'chemistry',
    water_tank_level:       'level',
    air_quality_pm25:       'particulate',
    air_quality_voc:        'chemistry',
    'mars/telemetry/solar_array':       'power',
    'mars/telemetry/power_bus':         'power',
    'mars/telemetry/power_consumption': 'power',
    'mars/telemetry/radiation':         'environment',
    'mars/telemetry/life_support':      'environment',
    'mars/telemetry/thermal_loop':      'thermalLoop',
    'mars/telemetry/airlock':           'airlock',
  },
};
