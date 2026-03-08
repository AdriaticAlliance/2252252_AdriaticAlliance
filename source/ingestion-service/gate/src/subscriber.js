const WebSocket = require('ws');
const config    = require('./config');
const { forward } = require('./forwarder');

function subscribeTopic(topic) {
  const url = `${config.SIMULATOR_URL.replace('http', 'ws')}/api/telemetry/ws?topic=${encodeURIComponent(topic)}`;

  function connect() {
    const ws = new WebSocket(url);

    ws.on('open', () => {
      console.log(`[Subscriber] Connected to topic: ${topic}`);
    });

    ws.on('message', async (data) => {
      try {
        const raw = JSON.parse(data.toString());
        await forward('telemetry', topic, raw);
      } catch (err) {
        console.error(`[Subscriber] Parse error on ${topic}:`, err.message);
      }
    });

    ws.on('error', (err) => {
      console.error(`[Subscriber] WS error on ${topic}:`, err.message);
    });

    ws.on('close', () => {
      console.log(`[Subscriber] Disconnected from ${topic}. Reconnecting in 5s...`);
      setTimeout(connect, 5000);
    });
  }

  connect();
}

function startSubscriptions() {
  console.log(`[Subscriber] Subscribing to ${config.TELEMETRY_TOPICS.length} telemetry topics`);
  config.TELEMETRY_TOPICS.forEach(topic => subscribeTopic(topic));
}

module.exports = { startSubscriptions };
