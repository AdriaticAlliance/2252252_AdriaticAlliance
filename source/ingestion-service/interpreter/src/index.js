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

// Emit function: sends translated record to Kafka
// Returns true on success, false on failure
async function emit(kind, name, record) {
  const topic = broadcastTopic(kind, name);
  const valid = validateCommonFormat(record);

  if (!valid) {
    console.error(
      `Validation failed for ${topic}:`,
      ajv.errorsText(validateCommonFormat.errors, { separator: '; ' })
    );
    return false;
  }

  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(record) }],
    });
    return true;
  } catch (err) {
    console.error(`Failed to publish to ${topic}:`, err.message);
    return false;
  }
}

// Translation functions namespace: translate/<kind>/<name>
const translate = {
  sensor: {
    // Example: sensor-specific translator; more can be added following this pattern.
    // translate/sensor/default
    default: (message) => {
      const now = new Date().toISOString();
      return {
        sensor_id: message.sensorName || message.sensor_id || 'unknown_sensor',
        source_type: 'sensor',
        metric: message.metric || 'value',
        value: typeof message.data === 'number' ? message.data : message.data?.value ?? 0,
        unit: message.unit || message.data?.unit || '',
        status: message.status || 'unknown',
        timestamp: message.timestamp || message.receivedAt || now,
        raw: message,
      };
    },
  },
  telemetry: {
    // translate/telemetry/default
    default: (message) => {
      const now = new Date().toISOString();
      return {
        sensor_id: message.topic || message.sensor_id || 'unknown_telemetry',
        source_type: 'telemetry',
        metric: message.metric || 'value',
        value: typeof message.data === 'number' ? message.data : message.data?.value ?? 0,
        unit: message.unit || message.data?.unit || '',
        status: message.status || 'unknown',
        timestamp: message.timestamp || message.receivedAt || now,
        raw: message,
      };
    },
  },
};

// Dispatch: picks the right translate/<kind>/<name> function based on topic
// Returns true on success, false on failure
async function dispatch(topic, message) {
  try {
    // topic format: interpret_<kind>_<name>
    const [, kind, ...rest] = topic.split('_');
    const dataName = rest.join('_') || 'default';

    const kindMap = translate[kind];
    const translator =
      (kindMap && (kindMap[dataName] || kindMap.default)) || translate.sensor.default;

    const record = translator(message);
    const success = await emit(kind, dataName, record);
    return success;
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

