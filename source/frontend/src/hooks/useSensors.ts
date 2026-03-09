import { useState, useEffect } from 'react';
import { getSensorsLatest } from '../api/client';
import { useWebSocket } from './useWebSocket';

interface NormalizedEvent {
  sensor_id: string;
  metric: string;
  value: number | null;
  unit: string;
  status: string;
  timestamp: string;
  source_type?: string;
}

export function useSensors() {
  // key: "sensor_id::metric" → NormalizedEvent
  const [sensors, setSensors] = useState(new Map<string, NormalizedEvent>());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    getSensorsLatest()
      .then(({ data }) => {
        const map = new Map<string, NormalizedEvent>();
        data.forEach((e: NormalizedEvent) => map.set(`${e.sensor_id}::${e.metric}`, e));
        setSensors(map);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Live updates
  useWebSocket('sensor_update', (event: NormalizedEvent) => {
    setSensors(prev => {
      const next = new Map(prev);
      next.set(`${event.sensor_id}::${event.metric}`, event);
      return next;
    });
  });

  // Group sensors by sensor_id for the grid view
  const grouped: { [key: string]: NormalizedEvent[] } = {};
  sensors.forEach((event) => {
    if (!grouped[event.sensor_id]) grouped[event.sensor_id] = [];
    grouped[event.sensor_id].push(event);
  });

  return {
    sensors,       // Map — all individual metric readings
    grouped,       // { sensor_id: [NormalizedEvent, ...] }
    sensorList: Array.from(sensors.values()),
    loading,
    error,
  };
}
