import type { Actuator } from '../types';

export default function ActuatorPanel({ actuators }: { actuators: Actuator[] }) {
  return (
    <div className="actuator-grid">
      {actuators.map((actuator) => (
        <article key={actuator.actuator_name} className="actuator-card">
          <div className="sensor-card-header">
            <span className="sensor-source">{actuator.actuator_name}</span>
            <span className={`sensor-badge ${actuator.state === 'ON' ? 'ok' : 'neutral'}`}>{actuator.state}</span>
          </div>
          <p className="sensor-time">Updated: {new Date(actuator.updated_at).toLocaleString()}</p>
        </article>
      ))}
    </div>
  );
}