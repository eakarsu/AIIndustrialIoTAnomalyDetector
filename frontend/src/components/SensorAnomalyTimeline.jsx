import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

// VIZ 1 — Sensor anomaly timeline (severity stacked over time)
export default function SensorAnomalyTimeline() {
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({});
  const [hours, setHours] = useState(168);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/custom-views/timeline?hours=${hours}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setData((json.series || []).map((b) => ({
          ...b,
          label: new Date(b.bucket).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }),
        })));
        setTotals(json.totals || {});
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [hours]);

  return (
    <div data-testid="anomaly-timeline" style={{ background: '#fff', padding: '1rem', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>Sensor Anomaly Timeline</h3>
        <select value={hours} onChange={(e) => setHours(parseInt(e.target.value))}
          style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db' }}>
          <option value={24}>Last 24h</option>
          <option value={72}>Last 72h</option>
          <option value={168}>Last 7d</option>
          <option value={720}>Last 30d</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#374151' }}>
        <span>Total: <b>{totals.total ?? 0}</b></span>
        <span style={{ color: '#dc2626' }}>Critical: <b>{totals.critical ?? 0}</b></span>
        <span style={{ color: '#ea580c' }}>High: <b>{totals.high ?? 0}</b></span>
        <span style={{ color: '#ca8a04' }}>Medium: <b>{totals.medium ?? 0}</b></span>
        <span style={{ color: '#16a34a' }}>Low: <b>{totals.low ?? 0}</b></span>
      </div>
      {loading && <div>Loading timeline…</div>}
      {error && <div style={{ color: '#b91c1c' }}>Error: {error}</div>}
      {!loading && !error && (
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="critical" stroke="#dc2626" dot={false} />
              <Line type="monotone" dataKey="high" stroke="#ea580c" dot={false} />
              <Line type="monotone" dataKey="medium" stroke="#ca8a04" dot={false} />
              <Line type="monotone" dataKey="low" stroke="#16a34a" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {!loading && !error && data.length === 0 && (
        <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>No anomalies in this window.</div>
      )}
    </div>
  );
}
