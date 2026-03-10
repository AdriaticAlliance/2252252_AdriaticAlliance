const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:4000');

ws.on('open', () => {
    console.log('[WS] Connected');
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log(`[WS] Received: ${msg.type}`);
    if (msg.type === 'connected' || msg.type === 'sensor_update') {
        process.stdout.write(JSON.stringify(msg) + '\n');
    }
});

ws.on('error', (err) => console.error('[WS] Error:', err.message));

setTimeout(() => {
    ws.close();
    process.exit(0);
}, 15000);
