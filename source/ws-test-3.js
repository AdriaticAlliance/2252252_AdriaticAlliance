const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:4000');

ws.on('open', () => {
    console.log('[WS] Connected for Actuator Test');
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'actuator_update') {
        process.stdout.write(JSON.stringify(msg) + '\n');
        process.exit(0);
    }
});

ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.error('[WS] Timeout waiting for actuator_update');
    process.exit(1);
}, 15000);
