const { Kafka } = require('kafkajs');
const config      = require('../config');
const sensorCache = require('../state/sensorCache');
const { evaluateEvent } = require('../engine/ruleEvaluator');
const wsServer    = require('../ws/wsServer');

const kafka    = new Kafka({ clientId: 'rules-service-main', brokers: [config.KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({
    topic: config.KAFKA_TOPIC_NORMALIZED,
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      let event;
      try {
        event = JSON.parse(message.value.toString());
      } catch (err) {
        console.error('[Consumer] Could not parse message:', message.value.toString());
        return;
      }

      // Validate minimum required fields
      if (!event.sensor_id || !event.metric || event.value === undefined) {
        console.warn('[Consumer] Skipping malformed event:', event);
        return;
      }

      // 1. Update in-memory sensor cache
      sensorCache.update(event);

      // 2. Evaluate against enabled rules → may trigger actuators
      await evaluateEvent(event);

      // 3. Push to all connected WebSocket clients
      wsServer.broadcast({ type: 'sensor_update', payload: event });

      // 4. If warning, also broadcast a dedicated warning message
      if (event.status === 'warning') {
        wsServer.broadcast({ type: 'warning', payload: event });
      }
    },
  });

  console.log(`[Consumer] Subscribed to ${config.KAFKA_TOPIC_NORMALIZED}`);
}

async function stopConsumer() {
  await consumer.disconnect();
}

module.exports = { startConsumer, stopConsumer };
