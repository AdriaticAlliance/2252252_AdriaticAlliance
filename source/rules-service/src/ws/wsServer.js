const WebSocket = require('ws');

let wss = null;

function init(httpServer) {
  wss = new WebSocket.Server({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log(`[WS] Client connected. Total: ${wss.clients.size}`);

    // Send a welcome so the client knows it's connected
    ws.send(JSON.stringify({ type: 'connected', message: 'Mars IoT rules-service WS ready' }));

    ws.on('close', () => {
      console.log(`[WS] Client disconnected. Total: ${wss.clients.size}`);
    });

    ws.on('error', (err) => {
      console.error('[WS] Socket error:', err.message);
    });
  });

  console.log('[WS] WebSocket server initialized');
}

// Broadcast to ALL connected clients
function broadcast(message) {
  if (!wss) return;
  const data = JSON.stringify(message);
  let sent = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
      sent++;
    }
  });
  return sent;
}

module.exports = { init, broadcast };
