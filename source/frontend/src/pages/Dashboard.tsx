import { useState } from 'react';
import { useSensors } from '../hooks/useSensors';
import SensorGrid from '../components/sensors/SensorGrid';
import AlertPanel from '../components/alerts/AlertPanel';

interface NormalizedEvent {
  sensor_id: string;
  metric: string;
  value: number | null;
  unit: string;
  status: string;
  timestamp: string;
  source_type?: string;
}

export default function Dashboard() {
  const { grouped, loading, error } = useSensors();
  const [filter, setFilter] = useState('all'); // 'all' | 'rest' | 'telemetry' | 'warning'

  const filtered = Object.fromEntries(
    Object.entries(grouped).filter(([, events]) => {
      if (filter === 'warning') return events.some(e => e.status === 'warning');
      if (filter === 'rest')     return events[0]?.source_type === 'rest';
      if (filter === 'telemetry')return events[0]?.source_type === 'telemetry';
      return true;
    })
  );

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: '28px', fontWeight: 700, letterSpacing: '0.05em' }}>
            HABITAT MONITOR
          </h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginTop: '4px' }}>
            {Object.keys(grouped).length} sensors · live updates via WebSocket
          </p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {['all', 'rest', 'telemetry', 'warning'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'var(--cyan)' : 'var(--bg-card)',
              color: filter === f ? '#000' : 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: '3px',
              padding: '6px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px', marginBottom: '16px' }}>
          ⚠ API Error: {error}
        </div>
      )}

      {/* Main layout: grid + alert panel */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SensorGrid grouped={filtered} loading={loading} />
        </div>
        <AlertPanel />
      </div>
    </div>
  );
}
