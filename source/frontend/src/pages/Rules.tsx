import { useState, useEffect, useCallback } from 'react';
import { getRules, createRule, updateRule, toggleRule, deleteRule } from '../api/client';
import RuleForm from '../components/rules/RuleForm';

interface Rule {
  id: string | number;
  sensor_id: string;
  metric: string;
  operator: string;
  threshold: number;
  unit: string;
  actuator: string;
  target_state: string;
  enabled: boolean;
}

export default function Rules() {
  const [rules, setRules]   = useState<Rule[]>([]);
  const [mode, setMode]     = useState<any>(null); // null | 'create' | rule object (edit)
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const load = useCallback(() => getRules().then(r => setRules(r.data)), []);
  useEffect(() => { load(); }, []);

  const handleCreate = async (data: any) => {
    try {
      await createRule(data);
      setMode(null); setFormErrors([]); load();
    } catch (err: any) {
      setFormErrors(err.response?.data?.errors || [err.message]);
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      await updateRule(mode.id, data);
      setMode(null); setFormErrors([]); load();
    } catch (err: any) {
      setFormErrors(err.response?.data?.errors || [err.message]);
    }
  };

  const handleToggle = async (id: any) => {
    await toggleRule(id); load();
  };

  const handleDelete = async (id: any) => {
    if (!window.confirm('Delete this rule permanently?')) return;
    await deleteRule(id); load();
  };

  const th = { padding: '10px 14px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
  const td = { padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', borderBottom: '1px solid #111118', verticalAlign: 'middle' };

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: '28px', fontWeight: 700, letterSpacing: '0.05em' }}>
            AUTOMATION RULES
          </h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginTop: '4px' }}>
            {rules.filter(r => r.enabled).length} active · {rules.length} total
          </p>
        </div>
        <button onClick={() => { setMode('create'); setFormErrors([]); }} style={{
          background: 'var(--cyan)', color: '#000',
          border: 'none', borderRadius: '3px',
          padding: '10px 20px', fontFamily: 'var(--font-mono)',
          fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
        }}>
          + NEW RULE
        </button>
      </div>

      {/* Form panel */}
      {mode && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderLeft: '3px solid var(--cyan)',
          borderRadius: '4px', padding: '24px', marginBottom: '20px',
        }}>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.1em', marginBottom: '20px', color: 'var(--cyan)' }}>
            {mode === 'create' ? 'CREATE NEW RULE' : `EDIT RULE #${mode.id}`}
          </h2>
          <RuleForm
            initial={mode !== 'create' ? mode : undefined}
            onSubmit={mode === 'create' ? handleCreate : handleUpdate}
            onCancel={() => { setMode(null); setFormErrors([]); }}
            errors={formErrors}
          />
        </div>
      )}

      {/* Rules table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d0d14' }}>
              <th style={th as any}>ID</th>
              <th style={th as any}>CONDITION</th>
              <th style={th as any}>ACTION</th>
              <th style={th as any}>STATUS</th>
              <th style={th as any}></th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)', padding: '32px' } as any}>
                  No rules defined. Click + NEW RULE to create one.
                </td>
              </tr>
            )}
            {rules.map(r => (
              <tr key={r.id} style={{ opacity: r.enabled ? 1 : 0.45 }}>
                <td style={{ ...td, color: 'var(--text-muted)' } as any}>#{r.id}</td>
                <td style={td as any}>
                  <span style={{ color: 'var(--cyan)' }}>{r.sensor_id}</span>
                  <span style={{ color: 'var(--text-muted)' }}>/{r.metric} </span>
                  <span style={{ color: 'var(--amber)' }}>{r.operator} </span>
                  <span style={{ color: 'var(--text)' }}>{r.threshold} {r.unit}</span>
                </td>
                <td style={td as any}>
                  <span style={{ color: 'var(--text-muted)' }}>set </span>
                  <span style={{ color: 'var(--text)' }}>{r.actuator} </span>
                  <span style={{
                    color: r.target_state === 'ON' ? 'var(--green)' : 'var(--red)',
                    fontWeight: 700,
                  }}>
                    {r.target_state}
                  </span>
                </td>
                <td style={td as any}>
                  <button onClick={() => handleToggle(r.id)} style={{
                    background: r.enabled ? '#0f2d1a' : '#1a1a2d',
                    color: r.enabled ? 'var(--green)' : 'var(--text-muted)',
                    border: `1px solid ${r.enabled ? '#166534' : 'var(--border)'}`,
                    borderRadius: '3px', padding: '3px 10px',
                    fontFamily: 'var(--font-mono)', fontSize: '10px',
                    fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
                  }}>
                    {r.enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </td>
                <td style={{ ...td, textAlign: 'right' } as any}>
                  <button onClick={() => { setMode(r); setFormErrors([]); }} style={{
                    background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)',
                    borderRadius: '3px', padding: '5px 12px', fontFamily: 'var(--font-mono)',
                    fontSize: '11px', cursor: 'pointer', marginRight: '6px',
                  }}>
                    EDIT
                  </button>
                  <button onClick={() => handleDelete(r.id)} style={{
                    background: 'none', color: 'var(--red)', border: '1px solid #7f1d1d',
                    borderRadius: '3px', padding: '5px 12px', fontFamily: 'var(--font-mono)',
                    fontSize: '11px', cursor: 'pointer',
                  }}>
                    DELETE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
