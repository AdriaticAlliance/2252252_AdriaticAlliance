import { useState, useEffect } from 'react';
import { getMeta } from '../../api/client';

const inputStyle = {
  background: '#0d0d14',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  padding: '8px 10px',
  width: '100%',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.1em',
  marginBottom: '5px',
  textTransform: 'uppercase',
};

interface RuleFormProps {
  initial?: any;
  onSubmit: (form: any) => void;
  onCancel: () => void;
  errors?: string[];
}

export default function RuleForm({ initial, onSubmit, onCancel, errors = [] }: RuleFormProps) {
  const [meta, setMeta] = useState({ known_sensors: [], known_actuators: [], valid_operators: [] });
  const [form, setForm] = useState(initial || {
    sensor_id: '', metric: '', operator: '>', threshold: 0, unit: '',
    actuator: '', target_state: 'ON',
  });

  useEffect(() => {
    getMeta().then(setMeta).catch(() => {});
  }, []);

  // Pre-fill sensor/actuator when meta loads and no initial value
  useEffect(() => {
    if (!initial && meta.known_sensors.length > 0 && !form.sensor_id) {
      setForm((f: any) => ({
        ...f,
        sensor_id: meta.known_sensors[0],
        actuator:  meta.known_actuators[0] || '',
        operator:  meta.valid_operators[3] || '>',
      }));
    }
  }, [meta]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div>
      {errors.length > 0 && (
        <div style={{
          background: '#1a0a0a', border: '1px solid #7f1d1d',
          borderRadius: '3px', padding: '10px 14px', marginBottom: '16px',
        }}>
          {errors.map((e, i) => (
            <div key={i} style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              • {e}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Sensor ID</label>
          <select style={inputStyle as any} value={form.sensor_id} onChange={e => set('sensor_id', e.target.value)}>
            {meta.known_sensors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Metric</label>
          <input style={inputStyle as any} placeholder="e.g. temperature" value={form.metric}
            onChange={e => set('metric', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Operator</label>
          <select style={inputStyle as any} value={form.operator} onChange={e => set('operator', e.target.value)}>
            {meta.valid_operators.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Threshold</label>
          <input style={inputStyle as any} type="number" step="any" value={form.threshold}
            onChange={e => set('threshold', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label style={labelStyle}>Unit (optional)</label>
          <input style={inputStyle as any} placeholder="e.g. °C" value={form.unit}
            onChange={e => set('unit', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Actuator</label>
          <select style={inputStyle as any} value={form.actuator} onChange={e => set('actuator', e.target.value)}>
            {meta.known_actuators.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Target State</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ON', 'OFF'].map(s => (
              <button key={s} onClick={() => set('target_state', s)} style={{
                flex: 1,
                padding: '10px',
                background: form.target_state === s
                  ? (s === 'ON' ? '#0f2d1a' : '#1a0a0a')
                  : 'var(--bg-card)',
                color: form.target_state === s
                  ? (s === 'ON' ? 'var(--green)' : 'var(--red)')
                  : 'var(--text-muted)',
                border: `1px solid ${form.target_state === s
                  ? (s === 'ON' ? '#166534' : '#7f1d1d')
                  : 'var(--border)'}`,
                borderRadius: '3px',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.1em',
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rule preview */}
      <div style={{
        margin: '16px 0',
        padding: '12px 16px',
        background: '#0d0d14',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--cyan)',
        borderRadius: '3px',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--text-muted)',
      }}>
        IF <span style={{ color: 'var(--cyan)' }}>{form.sensor_id || '...'}/{form.metric || '...'}</span>
        {' '}<span style={{ color: 'var(--amber)' }}>{form.operator}</span>{' '}
        <span style={{ color: 'var(--text)' }}>{form.threshold} {form.unit}</span>
        {' '}THEN set <span style={{ color: form.target_state === 'ON' ? 'var(--green)' : 'var(--red)' }}>
          {form.actuator || '...'} {form.target_state}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button onClick={onCancel} style={{
          padding: '9px 20px', background: 'none', color: 'var(--text-muted)',
          border: '1px solid var(--border)', borderRadius: '3px',
          fontFamily: 'var(--font-mono)', fontSize: '12px', cursor: 'pointer',
        }}>
          CANCEL
        </button>
        <button onClick={() => onSubmit(form)} style={{
          padding: '9px 20px', background: 'var(--cyan)', color: '#000',
          border: 'none', borderRadius: '3px',
          fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
        }}>
          SAVE RULE
        </button>
      </div>
    </div>
  );
}
