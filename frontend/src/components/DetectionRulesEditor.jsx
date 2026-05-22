import React, { useEffect, useState } from 'react';

// NON-VIZ 2 — Detection rules editor (CRUD thresholds)
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export default function DetectionRulesEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState({
    sensor_type: '', min_threshold: '', max_threshold: '', severity: 'medium', enabled: true,
  });

  const token = () => localStorage.getItem('token');
  const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/custom-views/rules', { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRules(json.rules || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!draft.sensor_type.trim()) return;
    try {
      const body = {
        sensor_type: draft.sensor_type.trim(),
        min_threshold: draft.min_threshold === '' ? null : Number(draft.min_threshold),
        max_threshold: draft.max_threshold === '' ? null : Number(draft.max_threshold),
        severity: draft.severity,
        enabled: !!draft.enabled,
      };
      const res = await fetch('/api/custom-views/rules', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDraft({ sensor_type: '', min_threshold: '', max_threshold: '', severity: 'medium', enabled: true });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggle = async (rule) => {
    try {
      const res = await fetch(`/api/custom-views/rules/${rule.id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (e) { setError(e.message); }
  };

  const updateField = async (rule, field, value) => {
    try {
      const res = await fetch(`/api/custom-views/rules/${rule.id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (e) { setError(e.message); }
  };

  const remove = async (rule) => {
    if (!window.confirm(`Delete rule for ${rule.sensor_type}?`)) return;
    try {
      const res = await fetch(`/api/custom-views/rules/${rule.id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div data-testid="detection-rules-editor" style={{ background: '#fff', padding: '1rem', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      <h3 style={{ marginTop: 0 }}>Detection Rules (Thresholds)</h3>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Configure per-sensor-type min/max thresholds and severity that drive anomaly detection.
      </p>

      <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr) auto', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          placeholder="sensor_type (e.g. temperature)"
          value={draft.sensor_type}
          onChange={(e) => setDraft({ ...draft, sensor_type: e.target.value })}
          style={{ padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: 4, gridColumn: 'span 2' }}
        />
        <input
          type="number" step="any" placeholder="min"
          value={draft.min_threshold}
          onChange={(e) => setDraft({ ...draft, min_threshold: e.target.value })}
          style={{ padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: 4 }}
        />
        <input
          type="number" step="any" placeholder="max"
          value={draft.max_threshold}
          onChange={(e) => setDraft({ ...draft, max_threshold: e.target.value })}
          style={{ padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: 4 }}
        />
        <select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })}
          style={{ padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: 4 }}>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{ fontSize: '0.85rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
          enabled
        </label>
        <button type="submit"
          style={{ background: '#16a34a', color: 'white', border: 0, borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Add
        </button>
      </form>

      {loading && <div>Loading rules…</div>}
      {error && <div style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>Error: {error}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>Sensor type</th>
            <th style={{ padding: '0.5rem' }}>Min</th>
            <th style={{ padding: '0.5rem' }}>Max</th>
            <th style={{ padding: '0.5rem' }}>Severity</th>
            <th style={{ padding: '0.5rem' }}>Enabled</th>
            <th style={{ padding: '0.5rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '0.5rem' }}>{r.sensor_type}</td>
              <td style={{ padding: '0.5rem' }}>
                <input type="number" step="any" defaultValue={r.min_threshold ?? ''}
                       onBlur={(e) => {
                         const v = e.target.value === '' ? null : Number(e.target.value);
                         if (v !== r.min_threshold) updateField(r, 'min_threshold', v);
                       }}
                       style={{ width: 80, padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: 4 }} />
              </td>
              <td style={{ padding: '0.5rem' }}>
                <input type="number" step="any" defaultValue={r.max_threshold ?? ''}
                       onBlur={(e) => {
                         const v = e.target.value === '' ? null : Number(e.target.value);
                         if (v !== r.max_threshold) updateField(r, 'max_threshold', v);
                       }}
                       style={{ width: 80, padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: 4 }} />
              </td>
              <td style={{ padding: '0.5rem' }}>
                <select value={r.severity} onChange={(e) => updateField(r, 'severity', e.target.value)}
                        style={{ padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: 4 }}>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td style={{ padding: '0.5rem' }}>
                <input type="checkbox" checked={r.enabled} onChange={() => toggle(r)} />
              </td>
              <td style={{ padding: '0.5rem' }}>
                <button onClick={() => remove(r)}
                        style={{ background: '#dc2626', color: 'white', border: 0, borderRadius: 4, padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {rules.length === 0 && !loading && (
            <tr><td colSpan={6} style={{ padding: '1rem', color: '#6b7280' }}>No rules configured.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
