const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:4000');

ws.on('open', () => {
    console.log('[WS] Connected for Warning Test');
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'warning') {
        process.stdout.write(JSON.stringify(msg) + '\n');
        process.exit(0);
    }
});

ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.error('[WS] Timeout waiting for warning');
    process.exit(1);
}, 15000);
