import React, { useEffect, useMemo, useState } from 'react';

// VIZ 2 — Machine x Sensor anomaly intensity heatmap
export default function MachineSensorHeatmap() {
  const [payload, setPayload] = useState({ equipment: [], sensors: [], cells: [], maxIntensity: 0 });
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/custom-views/heatmap?days=${days}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setPayload(json);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [days]);

  const grid = useMemo(() => {
    const idx = new Map();
    (payload.cells || []).forEach((c) => {
      idx.set(`${c.equipment_name}||${c.sensor_name}`, c);
    });
    return idx;
  }, [payload]);

  const color = (intensity) => {
    if (!intensity) return '#f3f4f6';
    const ratio = Math.min(1, intensity / Math.max(1, payload.maxIntensity));
    // green → yellow → red
    const r = Math.round(34 + ratio * (220 - 34));
    const g = Math.round(197 - ratio * (197 - 38));
    const b = 38;
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div data-testid="machine-sensor-heatmap" style={{ background: '#fff', padding: '1rem', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>Machine × Sensor Anomaly Heatmap</h3>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}
          style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db' }}>
          <option value={7}>Last 7d</option>
          <option value={30}>Last 30d</option>
          <option value={90}>Last 90d</option>
        </select>
      </div>
      {loading && <div>Loading heatmap…</div>}
      {error && <div style={{ color: '#b91c1c' }}>Error: {error}</div>}
      {!loading && !error && (payload.equipment?.length === 0) && (
        <div style={{ color: '#6b7280' }}>No anomalies in this window.</div>
      )}
      {!loading && !error && payload.equipment?.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>Equipment \\ Sensor</th>
                {payload.sensors.map((s) => (
                  <th key={s} style={{ padding: '0.25rem 0.5rem', writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payload.equipment.map((eq) => (
                <tr key={eq}>
                  <td style={{ padding: '0.25rem 0.5rem', whiteSpace: 'nowrap', fontWeight: 600 }}>{eq}</td>
                  {payload.sensors.map((s) => {
                    const cell = grid.get(`${eq}||${s}`);
                    const intensity = cell?.intensity || 0;
                    const count = cell?.anomaly_count || 0;
                    return (
                      <td key={s}
                          title={`${eq} / ${s}\n${count} anomalies (intensity ${intensity})`}
                          style={{
                            background: color(intensity),
                            color: intensity > payload.maxIntensity * 0.4 ? '#fff' : '#111827',
                            width: 36, height: 28, textAlign: 'center', borderRadius: 3,
                          }}>
                        {count || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
            Color reflects severity-weighted intensity. Max intensity in window: {payload.maxIntensity}.
          </div>
        </div>
      )}
    </div>
  );
}
