import React, { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import SensorGrid from './components/SensorGrid';
import ActuatorPanel from './components/AcutatorPanel';
import { RuleForm } from './components/RuleForm';
import RuleList from './components/RuleList';
import { api } from './api/client';
import type {
  SensorReading,
  Actuator,
  Rule,
  RuleInput,
  ConnectionStatus,
} from './types';

export default function App() {
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules'>('dashboard');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(
    () => ({
      totalSensors: sensors.length,
      warningCount: sensors.filter((s) => s.status === 'warning').length,
      activeActuators: actuators.filter((a) => a.state === 'ON').length,
    }),
    [sensors, actuators],
  );

  useEffect(() => {
    // fetch initial data
    api
      .getState()
      .then((data) => {
        setSensors(data);
        setConnectionStatus('live');
      })
      .catch((_) => setError('Failed to load sensor state.'));

    api.getRules().then(setRules).catch((_) => setError('Failed to load rules.'));
    api.getActuators().then(setActuators).catch((_) => setError('Failed to load actuators.'));

    const unsubscribe = api.subscribeToState((payload) => {
      setSensors((prev) => mergeSensorUpdate(prev, payload));
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  async function handleCreateRule(input: RuleInput): Promise<void> {
    try {
      const created = await api.createRule(input);
      setRules((prev) => [...prev, created]);
    } catch {
      setError('Failed to create rule.');
    }
  }

  async function handleToggleRule(ruleId: string | number): Promise<void> {
    const previous = rules;
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    );
    try {
      await api.toggleRule(ruleId);
    } catch {
      setError('Backend rule toggle failed. UI state changed locally only.');
      setRules(previous);
    }
  }

  async function handleDeleteRule(ruleId: string | number): Promise<void> {
    const previous = rules;
    setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
    try {
      await api.deleteRule(ruleId);
    } catch {
      setError('Backend rule delete failed. Restoring local state.');
      setRules(previous);
    }
  }

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        connectionStatus={connectionStatus}
        summary={summary}
      />
      <main className="main-content">
        {error && <div className="banner warning-banner">{error}</div>}
        {activeTab === 'dashboard' && (
          <>
            <section className="panel">
              <div className="panel-header">
                <h2>Live Habitat Readings</h2>
                <p>Latest normalized sensor values from the habitat state service.</p>
              </div>
              <SensorGrid sensors={sensors} />
            </section>
            <section className="panel">
              <div className="panel-header">
                <h2>Actuator Status</h2>
                <p>Current output devices controlled by automation rules.</p>
              </div>
              <ActuatorPanel actuators={actuators} />
            </section>
          </>
        )}
        {activeTab === 'rules' && (
          <div className="rules-layout">
            <section className="panel rules-form-panel">
              <div className="panel-header">
                <h2>Create Rule</h2>
                <p>IF sensor operator threshold THEN set actuator ON/OFF.</p>
              </div>
              <RuleForm
                uniqueSensors={sensors}
                actuators={actuators}
                onSubmit={handleCreateRule}
              />
            </section>
            <section className="panel rules-list-panel">
              <div className="panel-header">
                <h2>Persisted Rules</h2>
              </div>
              <RuleList
                rules={rules}
                onToggle={handleToggleRule}
                onDelete={handleDeleteRule}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function mergeSensorUpdate(
  previous: SensorReading[],
  incoming: SensorReading | SensorReading[],
): SensorReading[] {
  const updates = Array.isArray(incoming) ? incoming : [incoming];
  const map = new Map(
    previous.map((item) => [item.source_name, item]),
  );
  for (const update of updates)
    map.set(
      update.source_name,
      { ...map.get(update.source_name), ...update },
    );
  return Array.from(map.values());
}
