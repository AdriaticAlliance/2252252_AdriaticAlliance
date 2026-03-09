import { useState, useEffect } from 'react';
import { getActuators, setActuator } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';

const ACTUATORS = ['cooling_fan', 'entrance_humidifier', 'hall_ventilation', 'habitat_heater'];

const ICONS: { [key: string]: string } = {
  cooling_fan:         '❄',
  entrance_humidifier: '💧',
  hall_ventilation:    '🌀',
  habitat_heater:      '🔥',
};

interface ActuatorCardProps {
  name: string;
  state: string;
  onToggle: (name: string, state: string) => void;
  loading: boolean;
}

function ActuatorCard({ name, state, onToggle, loading }: ActuatorCardProps) {
  const isOn = state === 'ON';
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderTop: `3px solid ${isOn ? 'var(--green)' : 'var(--border)'}`,
      borderRadius: '4px',
      padding: '24px',
      textAlign: 'center',
      transition: 'border-top-color 0.3s',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{ICONS[name] || '⚙'}</div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: '16px',
      }}>
        {name.replace(/_/g, ' ')}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '28px',
        fontWeight: 700,
        color: isOn ? 'var(--green)' : '#334155',
        marginBottom: '20px',
        letterSpacing: '0.1em',
      }}>
        {state || '—'}
      </div>
      <button
        onClick={() => onToggle(name, isOn ? 'OFF' : 'ON')}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: isOn ? '#1a0a0a' : '#0f2d1a',
          color: isOn ? 'var(--red)' : 'var(--green)',
          border: `1px solid ${isOn ? '#7f1d1d' : '#166534'}`,
          borderRadius: '3px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'UPDATING...' : isOn ? 'TURN OFF' : 'TURN ON'}
      </button>
    </div>
  );
}

export default function Actuators() {
  const [states, setStates]   = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  const fetchStates = () =>
    getActuators().then(r => setStates(r.actuators || {})).catch(console.error);

  useEffect(() => { fetchStates(); }, []);

  // React to actuator_update WS messages (from rules engine auto-trigger)
  useWebSocket('actuator_update', (payload: any) => {
    setStates(prev => ({ ...prev, [payload.actuator]: payload.state }));
  });

  const handleToggle = async (name: string, newState: string) => {
    setLoading(prev => ({ ...prev, [name]: true }));
    try {
      const result = await setActuator(name, newState);
      setStates(prev => ({ ...prev, [name]: result.state }));
    } catch (err: any) {
      alert(`Failed to update ${name}: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  return (
    <div style={{ padding: '24px 32px' }}>
      <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: '28px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
        ACTUATOR CONTROLS
      </h1>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '28px' }}>
        Manual override · changes are logged in the audit trail
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px',
      }}>
        {ACTUATORS.map(name => (
          <ActuatorCard
            key={name}
            name={name}
            state={states[name] || '—'}
            onToggle={handleToggle}
            loading={!!loading[name]}
          />
        ))}
      </div>
    </div>
  );
}
