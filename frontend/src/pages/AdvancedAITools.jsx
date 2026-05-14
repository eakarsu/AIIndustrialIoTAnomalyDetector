import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCpu, FiTool, FiActivity, FiTruck } from 'react-icons/fi';
import AIOutput from '../components/AIOutput';

const API_BASE = '/api';
const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  });
  if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/'; return; }
  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }
  if (!res.ok) {
    const err = data || { error: `Request failed (${res.status})` };
    err._status = res.status;
    throw err;
  }
  return data;
};

const TABS = [
  { id: 'maintenance', label: 'Maintenance', icon: FiTool },
  { id: 'cross-correlation', label: 'Cross-Equipment Correlation', icon: FiActivity },
  { id: 'supply-chain', label: 'Supply-Chain Disruption', icon: FiTruck },
];

export default function AdvancedAITools() {
  const [tab, setTab] = useState('maintenance');
  const [equipment, setEquipment] = useState([]);
  const [equipmentId, setEquipmentId] = useState('');

  // supply-chain form state
  const [partsText, setPartsText] = useState('');
  const [horizonDays, setHorizonDays] = useState(90);
  const [region, setRegion] = useState('');
  const [signalsText, setSignalsText] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiCall('/equipment')
      .then((data) => setEquipment(Array.isArray(data) ? data : []))
      .catch(() => setEquipment([]));
  }, []);

  const handleErr = (err) => {
    const status = err?._status;
    const msg = err?.error || err?.message || 'AI request failed';
    const decorated = status === 503 ? `${msg} (server is missing the LLM API key)` : msg;
    setError(decorated);
    toast.error(decorated);
  };

  const submitMaintenance = async (e) => {
    e.preventDefault();
    if (!equipmentId) { setError('Please select equipment'); return; }
    setError(null); setResult(null); setLoading(true);
    try {
      const data = await apiCall(`/maintenance/${equipmentId}/recommendation`, { method: 'POST' });
      setResult(data);
      toast.success('Maintenance recommendation generated');
    } catch (err) { handleErr(err); }
    finally { setLoading(false); }
  };

  const submitCorrelation = async (e) => {
    e.preventDefault();
    if (!equipmentId) { setError('Please select equipment'); return; }
    setError(null); setResult(null); setLoading(true);
    try {
      const data = await apiCall(`/correlation/equipment/${equipmentId}`, { method: 'POST' });
      setResult(data);
      toast.success('Cross-equipment correlation generated');
    } catch (err) { handleErr(err); }
    finally { setLoading(false); }
  };

  const submitSupplyChain = async (e) => {
    e.preventDefault();
    const parts = partsText.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      // accept "name | vendor=X | lead_time_days=N | sole_source=true"
      const segs = line.split('|').map(s => s.trim());
      const out = { name: segs[0] };
      segs.slice(1).forEach(s => {
        const eq = s.indexOf('=');
        if (eq > 0) {
          const k = s.slice(0, eq).trim();
          const v = s.slice(eq + 1).trim();
          if (k === 'lead_time_days') out.lead_time_days = Number(v) || null;
          else if (k === 'sole_source') out.sole_source = /^(true|yes|1)$/i.test(v);
          else out[k] = v;
        }
      });
      return out;
    });
    if (parts.length === 0) { setError('Please enter at least one part'); return; }
    const signals = signalsText.split('\n').map(s => s.trim()).filter(Boolean);
    setError(null); setResult(null); setLoading(true);
    try {
      const data = await apiCall(`/correlation/supply-chain-disruption`, {
        method: 'POST',
        body: JSON.stringify({ parts, horizon_days: Number(horizonDays) || 90, region: region || undefined, signals }),
      });
      setResult(data);
      toast.success('Supply-chain disruption forecast generated');
    } catch (err) { handleErr(err); }
    finally { setLoading(false); }
  };

  const aiContent = result?.recommendation || result?.ai_analysis || result?.structured || result;

  const switchTab = (id) => {
    setTab(id);
    setResult(null);
    setError(null);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1><FiCpu /> Advanced AI Tools</h1>
          <p>AI-driven maintenance, cross-equipment correlation, and supply-chain disruption forecasting</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 8,
                border: active ? '1px solid transparent' : '1px solid var(--border, #e5e7eb)',
                background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--card-bg, white)',
                color: active ? 'white' : 'var(--text, #111827)',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Icon /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="card" style={{ padding: 24, background: 'var(--card-bg, white)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, marginBottom: 24 }}>
        {tab === 'maintenance' && (
          <>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiTool /> Maintenance Recommendation
            </h3>
            <p style={{ color: 'var(--text-secondary, #6b7280)' }}>
              Pulls equipment record, last 20 anomalies, sensors, and the last 10 maintenance schedules to recommend
              urgency, action, tasks, parts, downtime estimate, deferred risk, and confidence.
            </p>
            <form onSubmit={submitMaintenance}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Equipment *</label>
                <select
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border, #e5e7eb)' }}
                  required
                >
                  <option value="">-- Select Equipment --</option>
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      #{eq.id} {eq.name || eq.equipment_name || ''} {eq.location ? `(${eq.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                <FiCpu />{loading ? 'Generating...' : 'Generate Recommendation'}
              </button>
            </form>
          </>
        )}

        {tab === 'cross-correlation' && (
          <>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiActivity /> Cross-Equipment Correlation
            </h3>
            <p style={{ color: 'var(--text-secondary, #6b7280)' }}>
              Identifies correlated failure patterns between the selected equipment and the rest of the fleet using
              the last 30 focal anomalies and the last 60 fleet-wide anomalies.
            </p>
            <form onSubmit={submitCorrelation}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Focal Equipment *</label>
                <select
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border, #e5e7eb)' }}
                  required
                >
                  <option value="">-- Select Equipment --</option>
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      #{eq.id} {eq.name || eq.equipment_name || ''} {eq.location ? `(${eq.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                <FiCpu />{loading ? 'Analyzing...' : 'Run Correlation Analysis'}
              </button>
            </form>
          </>
        )}

        {tab === 'supply-chain' && (
          <>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiTruck /> Supply-Chain Disruption Prediction
            </h3>
            <p style={{ color: 'var(--text-secondary, #6b7280)' }}>
              Predicts disruption risk and lead-time inflation across critical parts. Combines parts/vendors with the
              fleet's open anomalies + upcoming maintenance pressure.
            </p>
            <form onSubmit={submitSupplyChain}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Parts (one per line — &quot;name | vendor=X | lead_time_days=N | sole_source=true&quot;) *
                </label>
                <textarea
                  value={partsText}
                  onChange={(e) => setPartsText(e.target.value)}
                  placeholder={'Bearing 6204 | vendor=SKF | lead_time_days=14 | sole_source=false\nMotor controller VFD-A | vendor=Acme | lead_time_days=42 | sole_source=true'}
                  rows={5}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border, #e5e7eb)', fontFamily: 'monospace', fontSize: 13 }}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Horizon (days)</label>
                  <input
                    type="number"
                    min={7}
                    max={365}
                    value={horizonDays}
                    onChange={(e) => setHorizonDays(e.target.value)}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border, #e5e7eb)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Region (optional)</label>
                  <input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. EMEA"
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border, #e5e7eb)' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>External signals (one per line, optional)</label>
                <textarea
                  value={signalsText}
                  onChange={(e) => setSignalsText(e.target.value)}
                  placeholder={'Container freight rates spiked 18% MoM\nVendor SKF announced plant maintenance window'}
                  rows={3}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border, #e5e7eb)' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                <FiCpu />{loading ? 'Forecasting...' : 'Forecast Disruption Risk'}
              </button>
            </form>
          </>
        )}

        {error && (
          <div style={{ marginTop: 16, padding: 12, background: '#fee2e2', color: '#991b1b', borderRadius: 8, border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}
      </div>

      {(loading || result) && (
        <AIOutput content={aiContent} loading={loading} />
      )}

      {result && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>Raw response</summary>
          <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 14, borderRadius: 8, overflow: 'auto', fontSize: 12, maxHeight: 360 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
