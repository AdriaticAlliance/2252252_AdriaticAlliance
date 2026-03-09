import { useState, useEffect, useRef } from 'react';
import Badge from '../shared/Badge';
import SensorChart from './SensorChart';

interface NormalizedEvent {
  sensor_id: string;
  metric: string;
  value: number | null;
  unit: string;
  status: string;
  timestamp: string;
  source_type?: string;
}

interface SensorCardProps {
  events: NormalizedEvent[];
}

export default function SensorCard({ events }: SensorCardProps) {
  // events = array of NormalizedEvent for one sensor_id (multiple metrics)
  const primary = events[0];
  const [expanded, setExpanded] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(primary?.value);

  // Flash animation when value changes
  useEffect(() => {
    if (primary && primary.value !== prevValue.current) {
      setFlash(true);
      setTimeout(() => setFlash(false), 400);
      prevValue.current = primary.value;
    }
  }, [primary?.value]);

  if (!primary) return null;

  const isWarning = events.some(e => e.status === 'warning');
  const accentColor = isWarning ? 'var(--amber)' : 'var(--cyan)';

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: '4px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'background 0.15s',
        animation: isWarning ? 'pulse-red 3s infinite' : 'none',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '70%',
        }}>
          {primary.sensor_id.replace('mars/telemetry/', '📡 ')}
        </span>
        <Badge status={primary.status} />
      </div>

      {/* Primary metric — large value */}
      <div
        className={flash ? 'value-updated' : ''}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '32px',
          fontWeight: 700,
          color: isWarning ? 'var(--amber)' : 'var(--text)',
          lineHeight: 1,
          marginBottom: '4px',
        }}
      >
        {typeof primary.value === 'number' ? primary.value.toFixed(2) : '—'}
        <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 400 }}>
          {primary.unit}
        </span>
      </div>

      {/* Metric label */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: accentColor, letterSpacing: '0.1em' }}>
        {primary.metric.toUpperCase()}
      </div>

      {/* Additional metrics (chemistry, power, etc.) */}
      {events.length > 1 && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {events.slice(1).map(e => (
            <div key={e.metric} style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {e.metric}: <span style={{ color: 'var(--text)' }}>{e.value?.toFixed(2)} {e.unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {primary.timestamp ? new Date(primary.timestamp).toLocaleTimeString() : '—'}
        <span style={{ marginLeft: '8px', color: 'var(--border)' }}>
          {expanded ? '▲ hide chart' : '▼ show chart'}
        </span>
      </div>

      {/* Expandable chart */}
      {expanded && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: '16px' }}>
          <SensorChart sensorId={primary.sensor_id} metric={primary.metric} unit={primary.unit} />
        </div>
      )}
    </div>
  );
}
