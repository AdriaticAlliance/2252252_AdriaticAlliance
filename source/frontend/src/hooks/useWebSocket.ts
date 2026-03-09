import { useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';

// Global singleton so all components share one WS connection
let globalWs: WebSocket | null = null;
const listeners = new Map<string, Set<Function>>(); // type → Set of callbacks

function getOrCreateWs() {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) return globalWs;

  globalWs = new WebSocket(WS_URL);

  globalWs.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const handlers = listeners.get(msg.type);
      if (handlers) handlers.forEach(fn => fn(msg.payload));
      // Also call '*' listeners (catch-all)
      const all = listeners.get('*');
      if (all) all.forEach(fn => fn(msg));
    } catch (e) {
      console.error('[WS] Parse error:', e);
    }
  };

  globalWs.onclose = () => {
    console.log('[WS] Disconnected. Reconnecting in 3s...');
    globalWs = null;
    setTimeout(getOrCreateWs, 3000);
  };

  globalWs.onerror = () => globalWs?.close();

  return globalWs;
}

/**
 * useWebSocket(type, callback)
 * type: 'sensor_update' | 'warning' | 'actuator_update' | '*'
 * callback: (payload) => void
 */
export function useWebSocket(type: string, callback: (payload: any) => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    getOrCreateWs();

    const handler = (payload: any) => cbRef.current(payload);

    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)?.add(handler);

    return () => {
      listeners.get(type)?.delete(handler);
    };
  }, [type]);
}
