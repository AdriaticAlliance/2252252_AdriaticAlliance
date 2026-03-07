import type { Rule } from '../types';

interface RuleListProps {
  rules: Rule[];
  onToggle: (ruleId: string | number) => Promise<void>;
  onDelete: (ruleId: string | number) => Promise<void>;
}

export default function RuleList({ rules, onToggle, onDelete }: RuleListProps) {
  if (rules.length === 0) return <p>No rules configured.</p>;

  return (
    <div className="rule-list">
      {rules.map((rule) => (
        <article key={String(rule.id)} className="rule-card">
          <div className="sensor-card-header">
            <span className="sensor-source">Rule #{rule.id}</span>
            <span className={`sensor-badge ${rule.enabled ? 'ok' : 'neutral'}`}>{rule.enabled ? 'enabled' : 'disabled'}</span>
          </div>
          <p>IF <strong>{rule.sensor_name}</strong> / <strong>{rule.metric_name}</strong> <strong>{rule.operator}</strong> <strong>{rule.threshold}</strong> {rule.unit}</p>
          <p>THEN set <strong>{rule.actuator_name}</strong> to <strong>{rule.target_state}</strong></p>
          <div className="rule-actions">
            <button type="button" onClick={() => void onToggle(rule.id)}>{rule.enabled ? 'Disable' : 'Enable'}</button>
            <button type="button" className="danger" onClick={() => void onDelete(rule.id)}>Delete</button>
          </div>
        </article>
      ))}
    </div>
  );
}