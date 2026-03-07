import type { SensorReading } from '../types';

export default function SensorCard({ sensor }: { sensor: SensorReading }) {
  return (
    <article className={`sensor-card ${sensor.status === 'warning' ? 'warning' : ''}`}>
      <div className="sensor-card-header">
        <span className="sensor-source">{sensor.source_name}</span>
        <span className={`sensor-badge ${sensor.status}`}>{sensor.status}</span>
      </div>
      <h3>{sensor.metric_name}</h3>
      <div className="sensor-value"><span>{String(sensor.value)}</span><small>{sensor.unit}</small></div>
      <p className="sensor-time">Updated: {new Date(sensor.observed_at).toLocaleString()}</p>
      <p className="sensor-schema">Schema: {sensor.raw_schema ?? 'normalized'}</p>
    </article>
  );
}