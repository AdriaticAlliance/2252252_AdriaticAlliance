const { Kafka }  = require('kafkajs');
const config     = require('../config');
const wsServer   = require('../ws/wsServer');

const kafka    = new Kafka({ clientId: 'rules-service-warnings', brokers: [config.KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID + '-warnings' });

async function startWarningConsumer() {
  await consumer.connect();
  await consumer.subscribe({
    topic: config.KAFKA_TOPIC_WARNINGS,
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.warn(`[WarningConsumer] WARNING: ${event.sensor_id}/${event.metric} = ${event.value}`);
        wsServer.broadcast({ type: 'warning', payload: event });
      } catch (err) {
        console.error('[WarningConsumer] Parse error:', err.message);
      }
    },
  });

  console.log(`[WarningConsumer] Subscribed to ${config.KAFKA_TOPIC_WARNINGS}`);
}

module.exports = { startWarningConsumer };
