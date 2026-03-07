import { useMemo, useState } from 'react';
import { ActuatorState, RuleOperator } from '../types';

interface RuleFormProps {
  actuators: Array<{ actuator_name: string }>;
  uniqueSensors: Array<{ source_name: string; metric_name: string; unit: string }>;
  onSubmit: (form: any) => Promise<void>;
}

export function RuleForm({ actuators, uniqueSensors, onSubmit }: RuleFormProps) {
  const [form, setForm] = useState({
    sensor_name: '',
    metric_name: '',
    operator: '<' as RuleOperator,
    threshold: 0,
    unit: '',
    actuator_name: actuators[0]?.actuator_name ?? 'cooling_fan',
    target_state: 'ON' as ActuatorState,
    enabled: true,
  });

  function handleSensorChange(value: string) {
    const [sensor_name, metric_name] = value.split('::');
    const selected = uniqueSensors.find((item) => item.source_name === sensor_name && item.metric_name === metric_name);
    setForm((prev) => ({ ...prev, sensor_name, metric_name, unit: selected?.unit ?? prev.unit }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <form className="rule-form" onSubmit={handleSubmit}>
      <label>
        Sensor metric
        <select value={`${form.sensor_name}::${form.metric_name}`} onChange={(e) => handleSensorChange(e.target.value)}>
          {uniqueSensors.map((sensor) => (
            <option key={`${sensor.source_name}:${sensor.metric_name}`} value={`${sensor.source_name}::${sensor.metric_name}`}>
              {sensor.source_name} / {sensor.metric_name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Operator
        <select value={form.operator} onChange={(e) => setForm((prev) => ({ ...prev, operator: e.target.value as RuleOperator }))}>
          <option value="<">&lt;</option>
          <option value="<=">&lt;=</option>
          <option value="=">=</option>
          <option value=">">&gt;</option>
          <option value=">=">&gt;=</option>
        </select>
      </label>
      <label>
        Threshold
        <input type="number" step="any" value={form.threshold} onChange={(e) => setForm((prev) => ({ ...prev, threshold: Number(e.target.value) }))} />
      </label>
      <label>
        Unit
        <input type="text" value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} />
      </label>
      <label>
        Actuator
        <select value={form.actuator_name} onChange={(e) => setForm((prev) => ({ ...prev, actuator_name: e.target.value }))}>
          {actuators.map((actuator) => <option key={actuator.actuator_name} value={actuator.actuator_name}>{actuator.actuator_name}</option>)}
        </select>
      </label>
      <label>
        Target state
        <select value={form.target_state} onChange={(e) => setForm((prev) => ({ ...prev, target_state: e.target.value as ActuatorState }))}>
          <option value="ON">ON</option>
          <option value="OFF">OFF</option>
        </select>
      </label>
      <label className="checkbox-row">
        <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))} />
        Enabled
      </label>
      <button type="submit">Save rule</button>
    </form>
  );
}