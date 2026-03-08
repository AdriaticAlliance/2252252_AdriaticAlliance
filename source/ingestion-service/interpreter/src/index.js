// MarsOperations ingestion interpreter service
// - Subscribes to Kafka topics: interpret_sensor_* and interpret_telemetry_*.
// - Dispatches each message to the appropriate translate/<kind>/<name> function.
// - Each translate function converts payloads into the common format defined
//   in ../../format.json.
// - The translated record is handed to emit(), which publishes it to Kafka
//   under topic: broadcast_<kind>_<name>.

const fs = require('fs');
const path = require('path');
const { Kafka } = require('kafkajs');
const Ajv = require('ajv');
const { normalize } = require('./normalizers');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'mars-interpreter';
const COMMON_SCHEMA_PATH =
  process.env.COMMON_SCHEMA_PATH || path.join(__dirname, '../../../format.json');

// Load and compile the common format JSON schema
const schemaRaw = fs.readFileSync(COMMON_SCHEMA_PATH, 'utf-8');
const commonSchema = JSON.parse(schemaRaw);
const ajv = new Ajv({ allErrors: true, strict: false });
const validateCommonFormat = ajv.compile(commonSchema);

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
    const [, kind, ...rest] = topic.split('_');
    const dataName = rest.join('_');
    
    // Convert topic back to canonical sensor_id for mapping
    const sensorId = kind === 'telemetry' ? `mars/telemetry/${dataName}` : dataName;
    const rawPayload = message.data || message;
    
    // Normalize nested data into common data records array
    const events = normalize(sensorId, kind, rawPayload);
    
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
  await consumer.connect();

  // Subscribe to all interpret_* topics
  // fromBeginning: true ensures we process messages already in Kafka
  await consumer.subscribe({ topic: /^interpret_.+/, fromBeginning: true });

  await consumer.run({
    // Disable auto-commit - we'll commit manually only after successful translation
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      try {
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
}

start().catch((err) => {
  console.error('Fatal error in interpreter service:', err);
  process.exit(1);
});

