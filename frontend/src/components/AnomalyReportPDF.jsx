import React, { useState } from 'react';

// NON-VIZ 1 — Anomaly report PDF download
export default function AnomalyReportPDF() {
  const [days, setDays] = useState(7);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true); setStatus(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/custom-views/report.pdf?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anomaly-report-${days}d.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus(`Downloaded report (${(blob.size / 1024).toFixed(1)} KB).`);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="anomaly-report-pdf" style={{ background: '#fff', padding: '1rem', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      <h3 style={{ marginTop: 0 }}>Anomaly Report (PDF)</h3>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Generate and download a PDF summary of severity counts and top anomalies for the selected window.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.85rem' }}>Window:</label>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}
          style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db' }}>
          <option value={1}>Last 1d</option>
          <option value={7}>Last 7d</option>
          <option value={30}>Last 30d</option>
          <option value={90}>Last 90d</option>
        </select>
        <button onClick={download} disabled={busy}
          style={{
            background: '#2563eb', color: 'white', border: 0, borderRadius: 6,
            padding: '0.5rem 1rem', cursor: busy ? 'not-allowed' : 'pointer',
          }}>
          {busy ? 'Generating…' : 'Download PDF'}
        </button>
      </div>
      {status && <div style={{ fontSize: '0.85rem', color: status.startsWith('Error') ? '#b91c1c' : '#16a34a' }}>{status}</div>}
    </div>
  );
}
