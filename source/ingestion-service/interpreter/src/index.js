require('dotenv').config();
const express         = require('express');
const config          = require('./config');
const producer        = require('./kafka/producer');
const { normalize }   = require('./normalizers');

const app = express();
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ingestion-interpreter' });
});

// Main ingest endpoint — called by Gate for every raw payload
app.post('/ingest', async (req, res) => {
  const { source_type, sensor_id, received_at, payload } = req.body;

  // Basic validation
  if (!source_type || !sensor_id || !payload) {
    return res.status(400).json({ error: 'Missing source_type, sensor_id, or payload' });
  }

  try {
    // Normalize raw payload → array of common data records
    const events = normalize(sensor_id, source_type, payload);

    if (events.length === 0) {
      return res.status(422).json({ error: `Could not normalize sensor_id: ${sensor_id}` });
    }

    // Publish all events to Kafka
    await producer.publish(events);

    console.log(`[Interpreter] Published ${events.length} record(s) from ${sensor_id}`);
    res.status(200).json({ published: events.length, sensor_id });

  } catch (err) {
    console.error(`[Interpreter] Error processing ${sensor_id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

async function main() {
  console.log('[Interpreter] Starting...');
  await producer.connect();

  app.listen(config.PORT, () => {
    console.log(`[Interpreter] Listening on port ${config.PORT}`);
    console.log(`[Interpreter] Kafka topic: ${config.KAFKA_TOPIC}`);
  });
}

main().catch(err => {
  console.error('[Interpreter] Fatal:', err);
  process.exit(1);
});
