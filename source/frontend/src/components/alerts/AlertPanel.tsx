import { useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

interface Alert {
  id: number;
  sensor_id: string;
  metric: string;
  value: number | null;
  unit: string;
  timestamp: string;
}

export default function AlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useWebSocket('warning', (event: any) => {
    setAlerts(prev => [{
      id:        Date.now(),
      sensor_id: event.sensor_id,
      metric:    event.metric,
      value:     event.value,
      unit:      event.unit,
      timestamp: event.timestamp,
    }, ...prev].slice(0, 30)); // keep last 30
  });

  return (
    <div style={{
      width: '280px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '0',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: alerts.length > 0 ? '#1a0a0a' : 'var(--bg-card)',
        border: '1px solid',
        borderColor: alerts.length > 0 ? '#7f1d1d' : 'var(--border)',
        borderRadius: '4px 4px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: 700,
          fontSize: '13px',
          letterSpacing: '0.1em',
          color: alerts.length > 0 ? 'var(--red)' : 'var(--text-muted)',
        }}>
          ⚠ ALERTS
        </span>
        {alerts.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              background: 'var(--red)',
              color: 'white',
              borderRadius: '3px',
              padding: '1px 7px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
            }}>
              {alerts.length}
            </span>
            <button
              onClick={() => setAlerts([])}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              CLEAR
            </button>
          </div>
        )}
      </div>

      {/* Alert list */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderTop: 'none',
        borderRadius: '0 0 4px 4px',
        maxHeight: '70vh',
        overflowY: 'auto',
      }}>
        {alerts.length === 0 ? (
          <div style={{
            padding: '24px 16px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textAlign: 'center',
          }}>
            All systems nominal
          </div>
        ) : alerts.map(a => (
          <div key={a.id} style={{
            padding: '12px 16px',
            borderBottom: '1px solid #1a0a0a',
            borderLeft: '3px solid var(--red)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--red)',
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}>
              {a.sensor_id.replace('mars/telemetry/', '')} / {a.metric}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--amber)',
            }}>
              {typeof a.value === 'number' ? a.value.toFixed(2) : a.value}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                {a.unit}
              </span>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}>
              {new Date(a.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
