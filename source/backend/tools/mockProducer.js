require('dotenv').config();
const { Kafka } = require('kafkajs');

const kafka    = new Kafka({ clientId: 'mock-producer', brokers: [process.env.KAFKA_BROKER || 'localhost:29092'] });
const producer = kafka.producer();

// These match the normalized event schema Student A will produce.
// Covers ALL sensor types from KNOWN_SENSORS for a complete demo.
const mockEvents = [
  // ── REST scalar sensors ──────────────────────────────────────────────────
  {
    sensor_id: 'greenhouse_temperature', source_type: 'rest',
    metric: 'temperature', value: 25.3, unit: '°C', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'greenhouse_temperature', source_type: 'rest',
    metric: 'temperature', value: 31.2, unit: '°C', status: 'warning',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'entrance_humidity', source_type: 'rest',
    metric: 'humidity', value: 62.1, unit: '%', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'co2_hall', source_type: 'rest',
    metric: 'co2', value: 850, unit: 'ppm', status: 'warning',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'corridor_pressure', source_type: 'rest',
    metric: 'pressure', value: 1013.2, unit: 'hPa', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },

  // ── REST chemistry sensors ───────────────────────────────────────────────
  {
    sensor_id: 'hydroponic_ph', source_type: 'rest',
    metric: 'ph', value: 6.2, unit: 'pH', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'air_quality_voc', source_type: 'rest',
    metric: 'voc', value: 0.35, unit: 'mg/m³', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },

  // ── REST particulate / level sensors ─────────────────────────────────────
  {
    sensor_id: 'air_quality_pm25', source_type: 'rest',
    metric: 'pm25', value: 12.4, unit: 'µg/m³', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'water_tank_level', source_type: 'rest',
    metric: 'level_pct', value: 15.0, unit: '%', status: 'warning',
    timestamp: new Date().toISOString(), raw: {},
  },

  // ── Telemetry sensors ────────────────────────────────────────────────────
  {
    sensor_id: 'mars/telemetry/solar_array', source_type: 'telemetry',
    metric: 'power_kw', value: 12.4, unit: 'kW', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'mars/telemetry/power_bus', source_type: 'telemetry',
    metric: 'voltage_v', value: 48.1, unit: 'V', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'mars/telemetry/power_consumption', source_type: 'telemetry',
    metric: 'power_kw', value: 8.7, unit: 'kW', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'mars/telemetry/radiation', source_type: 'telemetry',
    metric: 'radiation_uSv', value: 0.8, unit: 'µSv/h', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'mars/telemetry/life_support', source_type: 'telemetry',
    metric: 'o2_pct', value: 20.9, unit: '%', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'mars/telemetry/thermal_loop', source_type: 'telemetry',
    metric: 'temperature_c', value: 22.1, unit: '°C', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'mars/telemetry/airlock', source_type: 'telemetry',
    metric: 'cycles_per_hour', value: 2, unit: 'cycles/h', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
];

async function run() {
  await producer.connect();
  console.log(`[MockProducer] Connected to Kafka — cycling through ${mockEvents.length} sensor events`);

  let i = 0;
  const interval = setInterval(async () => {
    const base = mockEvents[i % mockEvents.length];
    const event = {
      ...base,
      timestamp: new Date().toISOString(),
      value: base.value + (Math.random() * 2 - 1), // slight jitter
    };

    // Always publish to normalized
    await producer.send({
      topic: 'mars.events.normalized',
      messages: [{ value: JSON.stringify(event) }],
    });

    // Also publish to warnings if status === 'warning'
    if (event.status === 'warning') {
      await producer.send({
        topic: 'mars.events.warnings',
        messages: [{ value: JSON.stringify(event) }],
      });
    }

    console.log(`[MockProducer] → ${event.sensor_id}/${event.metric} = ${event.value.toFixed(2)} [${event.status}]`);
    i++;
  }, 2000);

  process.on('SIGINT', async () => {
    clearInterval(interval);
    await producer.disconnect();
    console.log('[MockProducer] Disconnected');
    process.exit(0);
  });
}

run().catch(console.error);
