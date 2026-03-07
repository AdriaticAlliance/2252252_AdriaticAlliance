require('dotenv').config();
const { Kafka } = require('kafkajs');

const kafka    = new Kafka({ clientId: 'mock-producer', brokers: [process.env.KAFKA_BROKER || 'localhost:29092'] });
const producer = kafka.producer();

// These match the normalized event schema Student A will produce
const mockEvents = [
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
    sensor_id: 'mars/telemetry/solar_array', source_type: 'telemetry',
    metric: 'power_kw', value: 12.4, unit: 'kW', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'water_tank_level', source_type: 'rest',
    metric: 'level_pct', value: 15.0, unit: '%', status: 'warning',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'corridor_pressure', source_type: 'rest',
    metric: 'pressure', value: 1013.2, unit: 'hPa', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
  {
    sensor_id: 'mars/telemetry/radiation', source_type: 'telemetry',
    metric: 'radiation_uSv', value: 0.8, unit: 'µSv/h', status: 'ok',
    timestamp: new Date().toISOString(), raw: {},
  },
];

async function run() {
  await producer.connect();
  console.log('[MockProducer] Connected to Kafka');

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
