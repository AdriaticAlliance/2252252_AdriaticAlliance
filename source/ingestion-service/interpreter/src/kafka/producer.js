const { Kafka } = require('kafkajs');
const config    = require('../config');

const kafka    = new Kafka({ clientId: 'ingestion-interpreter', brokers: [config.KAFKA_BROKER] });
const producer = kafka.producer();
let connected  = false;

async function connect() {
  let retries = 15;
  while (retries > 0) {
    try {
      await producer.connect();
      connected = true;
      console.log('[Producer] Connected to Kafka');
      return;
    } catch (err) {
      retries--;
      console.warn(`[Producer] Kafka not ready, retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('Could not connect to Kafka after retries');
}

async function publish(events) {
  if (!connected) throw new Error('Producer not connected');
  // events is always an array (multi-metric sensors emit multiple records)
  const messages = events.map(e => ({ value: JSON.stringify(e) }));
  await producer.send({ topic: config.KAFKA_TOPIC, messages });
}

module.exports = { connect, publish };
