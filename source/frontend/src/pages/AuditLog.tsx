import { useState, useEffect } from 'react';
import { getAuditLog } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actuator: string;
  new_state: string;
  trigger_type: string;
  rule_id?: number;
  sensor_id?: string;
  metric?: string;
  sensor_value?: number;
}

export default function AuditLog() {
  const [logs, setLogs]     = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    getAuditLog(200).then(r => setLogs(r.data)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // Refresh on any actuator update
  useWebSocket('actuator_update', () => load());

  const th = { padding: '10px 14px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: '#0d0d14' };
  const td = { padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', borderBottom: '1px solid #111118', verticalAlign: 'middle' };

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: '28px', fontWeight: 700, letterSpacing: '0.05em' }}>
            AUDIT LOG
          </h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginTop: '4px' }}>
            {logs.length} events · auto-refreshes on new actuator change
          </p>
        </div>
        <button onClick={load} style={{
          background: 'none', color: 'var(--text-muted)',
          border: '1px solid var(--border)', borderRadius: '3px',
          padding: '8px 16px', fontFamily: 'var(--font-mono)',
          fontSize: '11px', cursor: 'pointer', letterSpacing: '0.08em',
        }}>
          ↻ REFRESH
        </button>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th as any}>TIMESTAMP</th>
              <th style={th as any}>ACTUATOR</th>
              <th style={th as any}>STATE</th>
              <th style={th as any}>TRIGGER</th>
              <th style={th as any}>RULE</th>
              <th style={th as any}>SENSOR / VALUE</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' } as any}>
                Loading...
              </td></tr>
            )}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)', padding: '32px' } as any}>
                No actuator events recorded yet.
              </td></tr>
            )}
            {logs.map(l => (
              <tr key={l.id}>
                <td style={{ ...td, color: 'var(--text-muted)' } as any}>
                  {new Date(l.timestamp).toLocaleString()}
                </td>
                <td style={{ ...td, color: 'var(--text)' } as any}>
                  {l.actuator.replace(/_/g, ' ')}
                </td>
                <td style={td as any}>
                  <span style={{
                    color: l.new_state === 'ON' ? 'var(--green)' : 'var(--red)',
                    fontWeight: 700,
                  }}>
                    {l.new_state}
                  </span>
                </td>
                <td style={td as any}>
                  <span style={{
                    background: l.trigger_type === 'rule' ? '#1a1a2d' : '#1a140a',
                    color: l.trigger_type === 'rule' ? '#818cf8' : 'var(--amber)',
                    border: `1px solid ${l.trigger_type === 'rule' ? '#3730a3' : '#92400e'}`,
                    borderRadius: '3px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    letterSpacing: '0.08em',
                  }}>
                    {l.trigger_type.toUpperCase()}
                  </span>
                </td>
                <td style={{ ...td, color: 'var(--text-muted)' } as any}>
                  {l.rule_id ? `#${l.rule_id}` : '—'}
                </td>
                <td style={{ ...td, color: 'var(--text-muted)' } as any}>
                  {l.sensor_id ? (
                    <>
                      <span style={{ color: 'var(--cyan)' }}>{l.metric}</span>
                      {' = '}
                      <span style={{ color: 'var(--text)' }}>
                        {typeof l.sensor_value === 'number' ? l.sensor_value.toFixed(2) : '—'}
                      </span>
                    </>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
