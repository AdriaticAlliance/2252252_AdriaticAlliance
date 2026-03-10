// MarsOperations ingestion interpreter service
// - Subscribes to Kafka topics: interpret_sensor_* and interpret_telemetry_*.
// - Dispatches each message to the appropriate translate/<kind>/<name> function.
// - Each translate function converts payloads into the common format defined
//   in ../../format.json.
// - The translated record is handed to emit(), which publishes it to Kafka
//   under topic: broadcast_<kind>_<name>.

const fs = require('fs');
const path = require('path');
const express = require('express');
const { Kafka } = require('kafkajs');
const Ajv = require('ajv/dist/2020');
const { normalize } = require('./normalizers');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ingestion-interpreter' });
});

app.post('/ingest', async (req, res) => {
  try {
    const payload = req.body;
    const sensorId = payload.sensor_id;
    // determine kind from payload if missing
    const isTelemetry = sensorId.startsWith('mars/telemetry/');
    const topicKind = isTelemetry ? 'telemetry' : 'sensor';
    const sourceType = isTelemetry ? 'telemetry' : 'rest';
    const topicName = isTelemetry ? sensorId.split('/').pop() : sensorId;
    const topic = `interpret_${topicKind}_${topicName}`;
    
    const rawPayload = payload.payload ? payload.payload : payload;
    const events = normalize(sensorId, sourceType, rawPayload);
    
    if (events.length === 0) return res.status(400).json({ status: "error", message: "no valid events" });
    
    const validEvents = events.filter(record => validateCommonFormat(record));
    if (validEvents.length === 0) return res.status(400).json({ status: "error", message: "validation failed" });

    await producer.send({
      topic: 'mars.common-data-records',
      messages: validEvents.map(e => ({ value: JSON.stringify(e) })),
    });

    res.json({ published: validEvents.length, sensor_id: sensorId });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

const KAFKA_HOST = process.env.KAFKA_HOST || 'kafka';
const KAFKA_PORT = process.env.KAFKA_PORT || '9092';
const KAFKA_BROKER = process.env.KAFKA_BROKER || `${KAFKA_HOST}:${KAFKA_PORT}`;
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'mars-interpreter';
const COMMON_SCHEMA_PATH =
  process.env.COMMON_SCHEMA_PATH || path.join(__dirname, '../../../format.json');

// Load and compile the common format JSON schema
const schemaRaw = fs.readFileSync(COMMON_SCHEMA_PATH, 'utf-8');
const commonSchema = JSON.parse(schemaRaw);
const ajv = new Ajv({ allErrors: true, strict: false });
const validateCommonFormat = ajv.compile(commonSchema);
const { SCHEMA_MAP } = require('./normalizers/index');

const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: [KAFKA_BROKER],
});

const consumer = kafka.consumer({ 
  groupId: `${KAFKA_CLIENT_ID}-interpreters`,
  // Disable auto-commit so we can manually commit only after successful translation
  allowAutoTopicCreation: true,
});
const producer = kafka.producer();
const admin = kafka.admin();

// Utility: build topic names
function interpretTopic(kind, name) {
  return `interpret_${kind}_${name}`;
}

function broadcastTopic(kind, name) {
  return `broadcast_${kind}_${name}`;
}

// Dispatch: normalizes via our 8 specific schemas and returns array of valid records
async function dispatch(topic, message) {
  try {
    // topic format: interpret_<kind>_<name>
    const [, topicKind, ...rest] = topic.split('_');
    const dataName = rest.join('_');
    
    // Convert topic back to canonical sensor_id for mapping
    const sensorId = topicKind === 'telemetry' ? `mars/telemetry/${dataName}` : dataName;
    const rawPayload = message.data || message;
    
    const sourceType = topicKind === 'telemetry' ? 'telemetry' : 'rest';
    // Normalize nested data into common data records array
    const events = normalize(sensorId, sourceType, rawPayload);
    
    if (events.length === 0) return false;

    // Validate and publish all valid records to the standard common topic
    const validEvents = events.filter(record => validateCommonFormat(record));
    
    if (validEvents.length === 0) {
       console.error(`Validation failed for ${sensorId}:`, ajv.errorsText(validateCommonFormat.errors, { separator: '; ' }));
       return false;
    }

    await producer.send({
      topic: 'mars.common-data-records',
      messages: validEvents.map(e => ({ value: JSON.stringify(e) })),
    });
    
    return true;
  } catch (err) {
    console.error(`Translation error for ${topic}:`, err.message);
    return false;
  }
}

async function start() {
  await producer.connect();
  
  const knownTopics = Object.keys(require('./normalizers/index').SCHEMA_MAP || {}).map(sensorId => {
    return sensorId.startsWith('mars/telemetry/') 
      ? `interpret_telemetry_${sensorId.split('/').pop()}`
      : `interpret_sensor_${sensorId}`;
  });
  
  // Also include the generic ones if they pop up
  knownTopics.push('simulator.sensors.raw', 'simulator.telemetry.raw');
  
  await admin.connect();
  const existingTopics = await admin.listTopics();
  
  const toCreate = knownTopics
    .filter(t => !existingTopics.includes(t))
    .map(t => ({ topic: t, numPartitions: 1, replicationFactor: 1 }));
    
  if (toCreate.length > 0) {
    await admin.createTopics({ topics: toCreate, waitForLeaders: true });
    console.log(`[Interpreter] Pre-created ${toCreate.length} topics`);
  } else {
    console.log('[Interpreter] All topics already exist');
  }
  await admin.disconnect();

  await consumer.connect();

  // Subscribe to all explicit topics
  await consumer.subscribe({ topics: knownTopics, fromBeginning: true });

  await consumer.run({
    // Disable auto-commit - we'll commit manually only after successful translation
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      try {
        console.log(`[Interpreter] Received message on topic ${topic}`);
        const payloadStr = message.value?.toString() || '{}';
        const payload = JSON.parse(payloadStr);
        
        // Attempt translation and emit
        const success = await dispatch(topic, payload);
        
        if (success) {
          // Only commit the message offset if translation and emit succeeded
          // This ensures failed messages remain in Kafka for retry
          await consumer.commitOffsets([{
            topic,
            partition,
            offset: (parseInt(message.offset) + 1).toString(),
          }]);
          console.log(`Committed: ${topic} partition ${partition} offset ${message.offset}`);
        } else {
          // Translation failed - don't commit, message will be retried
          console.warn(`Message not committed (will retry): ${topic} partition ${partition} offset ${message.offset}`);
        }
      } catch (err) {
        console.error(`Error handling message on ${topic}:`, err.message);
        // Don't commit on error - message will be retried
      }
    },
  });

  console.log('Mars ingestion interpreter started, listening to interpret_* topics');
  
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => console.log(`Interpreter Express listening on port ${PORT}`));
}

start().catch((err) => {
  console.error('Fatal error in interpreter service:', err);
  process.exit(1);
});

