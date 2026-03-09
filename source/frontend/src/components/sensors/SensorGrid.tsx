import SensorCard from './SensorCard';

interface NormalizedEvent {
  sensor_id: string;
  metric: string;
  value: number | null;
  unit: string;
  status: string;
  timestamp: string;
  source_type?: string;
}

interface SensorGridProps {
  grouped: { [key: string]: NormalizedEvent[] };
  loading: boolean;
}

export default function SensorGrid({ grouped, loading }: SensorGridProps) {
  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '40px 0' }}>
        Connecting to sensor network...
      </div>
    );
  }

  const sensorIds = Object.keys(grouped).sort();

  if (sensorIds.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '40px 0' }}>
        No sensor data cached yet. Waiting for ingestion pipeline...
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: '12px',
    }}>
      {sensorIds.map(sensorId => (
        <SensorCard
          key={sensorId}
          events={grouped[sensorId]}
        />
      ))}
    </div>
  );
}
