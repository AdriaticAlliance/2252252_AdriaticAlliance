// MarsOperations ingestion gate service
// - Exposes REST API: GET /sensors/:sensorName to poll the simulator.
// - Maintains WebSocket subscriptions to simulator telemetry topics.
// - Publishes messages to Kafka with topics:
//     interpret_sensor_<sensorName>
//     interpret_telemetry_<dataName>
// - Consumes Kafka topics:
//     poll_sensor_<sensorName>

const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const { Kafka } = require('kafkajs');
const { startAutoPolling } = require('./poller');

const SIMULATOR_HOST = process.env.SIMULATOR_HOST || 'simulator';
const SIMULATOR_PORT = process.env.SIMULATOR_PORT || '8080';
const SIMULATOR_BASE_URL = process.env.SIMULATOR_BASE_URL || `http://${SIMULATOR_HOST}:${SIMULATOR_PORT}`;
const TELEMETRY_TOPICS = (process.env.TELEMETRY_TOPICS || '').split(',').map(t => t.trim()).filter(Boolean);
const KAFKA_HOST = process.env.KAFKA_HOST || 'kafka';
const KAFKA_PORT = process.env.KAFKA_PORT || '9092';
const KAFKA_BROKER = process.env.KAFKA_BROKER || `${KAFKA_HOST}:${KAFKA_PORT}`;
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'mars-gate';

const app = express();
const port = process.env.PORT || 3001;

const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: [KAFKA_BROKER],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ 
  groupId: `${KAFKA_CLIENT_ID}-pollers`,
  // Disable auto-commit so we can manually commit only after successful answer sent
  allowAutoTopicCreation: true,
});

function buildInterpretTopic(kind, name) {
  return `interpret_${kind}_${name}`;
}

function buildPollSensorTopic(sensorName) {
  return `poll_sensor_${sensorName}`;
}

// Polls sensor and sends answer to interpreter via Kafka
// Returns true on success, false on failure
async function pollSensor(sensorName, reason = 'api') {
  const url = `${SIMULATOR_BASE_URL}/api/sensors/${encodeURIComponent(sensorName)}`;
  const startedAt = new Date().toISOString();
  try {
    const response = await axios.get(url);
    const payload = {
      kind: 'sensor',
      sensorName,
      reason,
      startedAt,
      receivedAt: new Date().toISOString(),
      simulatorUrl: url,
      data: response.data,
    };

    const topic = buildInterpretTopic('sensor', sensorName);
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });
    console.log(`[Gate] Forwarded ${sensorName} to interpreter`);

    return true;
  } catch (err) {
    console.error(`Error polling sensor ${sensorName}:`, err.message);
    return false;
  }
}

// REST endpoint to trigger a sensor poll
app.get('/sensors/:sensorName', async (req, res) => {
  const sensorName = req.params.sensorName;
  try {
    const success = await pollSensor(sensorName, 'rest_api');
    if (success) {
      res.json({ status: 'ok', topic: buildInterpretTopic('sensor', sensorName) });
    } else {
      res.status(502).json({ status: 'error', message: 'Failed to poll simulator or send to interpreter' });
    }
  } catch (err) {
    res.status(502).json({ status: 'error', message: err.message || 'Failed to poll simulator' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ingestion-gate' });
});

async function startKafka() {
  let retries = 15;
  let connected = false;
  
  while (retries > 0 && !connected) {
    try {
      await producer.connect();
      await consumer.connect();
      connected = true;
    } catch (err) {
      retries--;
      console.warn(`[Producer/Consumer] Kafka not ready, retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, 4000));
    }
  }
  
  if (!connected) {
    throw new Error('Could not connect to Kafka after retries');
  }

  // Subscribe to all poll_sensor_* topics; fromBeginning: true to process existing messages
  await consumer.subscribe({ topic: /^poll_sensor_.+/, fromBeginning: true });

  await consumer.run({
    // Disable auto-commit - we'll commit manually only after successful answer sent
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const prefix = 'poll_sensor_';
      if (topic.startsWith(prefix)) {
        const sensorName = topic.substring(prefix.length);
        if (sensorName) {
          console.log(`Received poll request from Kafka for sensor ${sensorName} (partition ${partition}, offset ${message.offset})`);
          try {
            // Poll sensor and send answer to interpreter
            const success = await pollSensor(sensorName, 'kafka_request');
            
            if (success) {
              // Only commit the poll message offset after successfully sending answer to interpreter
              // This removes the original poll message from Kafka
              await consumer.commitOffsets([{
                topic,
                partition,
                offset: (parseInt(message.offset) + 1).toString(),
              }]);
              console.log(`Committed poll request: ${topic} partition ${partition} offset ${message.offset}`);
            } else {
              // Poll failed - don't commit, message will be retried
              console.warn(`Poll request not committed (will retry): ${topic} partition ${partition} offset ${message.offset}`);
            }
          } catch (err) {
            console.error(`Kafka-triggered poll failed for ${sensorName}:`, err.message);
            // Don't commit on error - message will be retried
          }
        }
      }
    },
  });
}

function startTelemetryWebSockets() {
  if (TELEMETRY_TOPICS.length === 0) {
    console.log('No TELEMETRY_TOPICS configured; skipping telemetry WebSocket subscriptions.');
    return;
  }

  TELEMETRY_TOPICS.forEach((topicName) => {
    const wsUrl = SIMULATOR_BASE_URL.replace(/^http/, 'ws') + `/api/telemetry/ws?topic=${encodeURIComponent(topicName)}`;
    console.log(`Connecting to telemetry WebSocket for topic ${topicName} at ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      console.log(`Telemetry WebSocket open for topic ${topicName}`);
    });

    ws.on('message', async (data) => {
      const receivedAt = new Date().toISOString();
      let parsed;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        parsed = { raw: data.toString() };
      }

      const payload = {
        kind: 'telemetry',
        topic: topicName,
        receivedAt,
        data: parsed,
      };

      const topicSuffix = topicName.split('/').pop();
      const topic = buildInterpretTopic('telemetry', topicSuffix);
      try {
        await producer.send({
          topic,
          messages: [{ value: JSON.stringify(payload) }],
        });
      } catch (err) {
        console.error(`Failed to send telemetry for ${topicName} to Kafka:`, err.message);
      }
    });

    ws.on('error', (err) => {
      console.error(`Telemetry WebSocket error for topic ${topicName}:`, err.message);
    });

    ws.on('close', () => {
      console.warn(`Telemetry WebSocket closed for topic ${topicName}`);
    });
  });
}

async function start() {
  app.listen(port, () => {
    console.log(`Mars ingestion gate listening on port ${port}`);
  });

  try {
    await startKafka();
    console.log('Kafka producer and consumer connected.');
  } catch (err) {
    console.error('Failed to connect to Kafka:', err.message);
  }

  startTelemetryWebSockets();
  
  // Start autonomous polling
  startAutoPolling();
}

start().catch((err) => {
  console.error('Fatal error in gate service:', err);
  process.exit(1);
});

