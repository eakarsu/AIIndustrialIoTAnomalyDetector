import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiCpu } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';

const API_BASE = '/api';
const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers } });
  if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/'; return; }
  if (res.status === 429) { toast.error('AI rate limit reached. Please wait before making more requests.'); return null; }
  return res.json();
};

const defaultForm = { sensor_id: '', equipment_id: '', type: '', severity: 'medium', description: '', status: 'open' };

const RISK_BADGE = {
  critical: { bg: '#ef4444', color: '#fff', label: 'CRITICAL' },
  high: { bg: '#f97316', color: '#fff', label: 'HIGH' },
  medium: { bg: '#eab308', color: '#000', label: 'MEDIUM' },
  low: { bg: '#10b981', color: '#fff', label: 'LOW' },
};

function StructuredAIResult({ structured, auto_alert_created }) {
  if (!structured) return null;
  const risk = RISK_BADGE[structured.risk_level] || RISK_BADGE.low;
  return (
    <div style={{ marginTop: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: 'var(--bg-card)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ background: risk.bg, color: risk.color, padding: '3px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '12px' }}>{risk.label}</span>
        {auto_alert_created && (
          <span style={{ background: 'var(--red)', color: '#fff', padding: '3px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '12px' }}>AUTO-ALERT CREATED</span>
        )}
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: 'auto' }}>AI Confidence</span>
      </div>
      {/* Confidence bar */}
      <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          <span>Confidence Score</span><span>{structured.confidence ?? '?'}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${structured.confidence ?? 0}%`, background: (structured.confidence ?? 0) > 70 ? 'var(--green)' : (structured.confidence ?? 0) > 40 ? 'var(--orange)' : 'var(--red)', borderRadius: '4px', transition: 'width 0.4s' }} />
        </div>
      </div>
      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {structured.probable_causes && structured.probable_causes.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--cyan)', marginBottom: '6px', fontWeight: 600 }}>PROBABLE CAUSES</div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {structured.probable_causes.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}
        {structured.immediate_actions && structured.immediate_actions.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--orange)', marginBottom: '6px', fontWeight: 600 }}>IMMEDIATE ACTIONS</div>
            <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {structured.immediate_actions.map((a, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ marginTop: '2px', color: 'var(--green)', flexShrink: 0 }}>&#9744;</span> {a}
                </li>
              ))}
            </ul>
          </div>
        )}
        {structured.affected_components && structured.affected_components.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--purple)', marginBottom: '6px', fontWeight: 600 }}>AFFECTED COMPONENTS</div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {structured.affected_components.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}
        {structured.estimated_impact && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--yellow)', marginBottom: '6px', fontWeight: 600 }}>ESTIMATED IMPACT</div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{structured.estimated_impact}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Anomalies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  useEffect(() => { loadItems(); loadRefs(); }, [page]);
  const loadItems = async () => {
    try {
      const data = await apiCall(`/anomalies?page=${page}&limit=${limit}`);
      if (data && data.data) { setItems(data.data); setPagination(data.pagination); }
      else if (Array.isArray(data)) setItems(data);
    } catch { toast.error('Failed to load anomalies'); }
    finally { setLoading(false); }
  };
  const loadRefs = async () => {
    try {
      const [s, e] = await Promise.all([apiCall('/sensors?limit=100'), apiCall('/equipment')]);
      setSensors(Array.isArray(s) ? s : (s && s.data ? s.data : []));
      setEquipment(Array.isArray(e) ? e : (e && e.data ? e.data : []));
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, sensor_id: form.sensor_id || null, equipment_id: form.equipment_id || null };
      if (editing && selected) {
        await apiCall(`/anomalies/${selected.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Anomaly updated');
      } else {
        await apiCall('/anomalies', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Anomaly created');
      }
      setShowForm(false); setForm(defaultForm); setEditing(false); loadItems();
    } catch { toast.error('Operation failed'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this anomaly?')) return;
    try { await apiCall(`/anomalies/${item.id}`, { method: 'DELETE' }); toast.success('Deleted'); setShowDetail(false); loadItems(); }
    catch { toast.error('Delete failed'); }
  };

  const handleAnalyze = async (item) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await apiCall(`/anomalies/${item.id}/analyze`, { method: 'POST' });
      if (!result) return; // 429 handled in apiCall
      setAiResult(result);
      setSelected(prev => ({ ...(prev || item), ai_analysis: result.raw }));
      if (result.auto_alert_created) {
        toast.warning('High/critical risk: auto-alert was created!');
      } else {
        toast.success('AI analysis complete');
      }
      loadItems();
    } catch { toast.error('AI analysis failed'); }
    finally { setAiLoading(false); }
  };

  const openEdit = (item) => {
    setForm({ sensor_id: item.sensor_id || '', equipment_id: item.equipment_id || '', type: item.type || '', severity: item.severity || 'medium', description: item.description || '', status: item.status || 'open' });
    setSelected(item); setEditing(true); setShowDetail(false); setShowForm(true);
  };

  const getSeverityBadge = (s) => {
    if (s === 'critical') return 'badge badge-critical';
    if (s === 'high') return 'badge badge-high';
    if (s === 'medium') return 'badge badge-medium';
    return 'badge badge-low';
  };

  const getStatusBadge = (s) => {
    if (s === 'open') return 'badge badge-critical';
    if (s === 'investigating') return 'badge badge-acknowledged';
    if (s === 'resolved') return 'badge badge-resolved';
    return 'badge badge-pending';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Anomaly Detection</h1><p>AI-powered sensor anomaly detection and analysis</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setEditing(false); setShowForm(true); }}><FiPlus /> Add Anomaly</button>
      </div>
      <div className="table-container">
        {items.length === 0 ? <div className="empty-state"><p>No anomalies detected.</p></div> : (
          <>
            <table className="data-table">
              <thead><tr><th>Type</th><th>Severity</th><th>Sensor</th><th>Equipment</th><th>Status</th><th>Detected</th><th>AI</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="clickable-row" onClick={() => { setSelected(item); setAiResult(null); setShowDetail(true); }}>
                    <td>{item.type}</td>
                    <td><span className={getSeverityBadge(item.severity)}>{item.severity}</span></td>
                    <td>{item.sensor_name || '-'}</td>
                    <td>{item.equipment_name || '-'}</td>
                    <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                    <td>{item.detected_at ? new Date(item.detected_at).toLocaleString() : '-'}</td>
                    <td>{item.ai_analysis ? <span className="badge badge-active">Done</span> : <span className="badge badge-pending">Pending</span>}</td>
                    <td><div className="action-btns" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-ai btn-sm" onClick={() => { setSelected(item); setAiResult(null); setShowDetail(true); handleAnalyze(item); }}><FiCpu /></button>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}><FiEdit2 /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)}><FiTrash2 /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px' }}>
                <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <button className="btn btn-outline btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      <DetailModal isOpen={showDetail} onClose={() => { setShowDetail(false); setAiLoading(false); setAiResult(null); }} title="Anomaly Details">
        {selected && (<>
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{selected.type}</div></div>
            <div className="detail-item"><div className="detail-label">Severity</div><div className="detail-value"><span className={getSeverityBadge(selected.severity)}>{selected.severity}</span></div></div>
            <div className="detail-item"><div className="detail-label">Sensor</div><div className="detail-value">{selected.sensor_name || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Equipment</div><div className="detail-value">{selected.equipment_name || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={getStatusBadge(selected.status)}>{selected.status}</span></div></div>
            <div className="detail-item"><div className="detail-label">Detected</div><div className="detail-value">{selected.detected_at ? new Date(selected.detected_at).toLocaleString() : '-'}</div></div>
            <div className="detail-item detail-full"><div className="detail-label">Description</div><div className="detail-value">{selected.description || '-'}</div></div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <button className="btn btn-ai" onClick={() => handleAnalyze(selected)} disabled={aiLoading}><FiCpu /> {aiLoading ? 'Analyzing...' : 'Analyze with AI'}</button>
          </div>
          {aiLoading && (
            <div style={{ marginTop: '16px', textAlign: 'center', color: 'var(--cyan)' }}>
              <div className="spinner" style={{ margin: '0 auto 8px' }}></div>
              <p>AI is analyzing...</p>
            </div>
          )}
          {aiResult && !aiLoading && (
            <StructuredAIResult structured={aiResult.structured} auto_alert_created={aiResult.auto_alert_created} />
          )}
          {!aiResult && selected.ai_analysis && !aiLoading && (
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              {(() => {
                try {
                  const parsed = JSON.parse(selected.ai_analysis);
                  return <StructuredAIResult structured={parsed} auto_alert_created={false} />;
                } catch {
                  return selected.ai_analysis;
                }
              })()}
            </div>
          )}
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => openEdit(selected)}><FiEdit2 /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete</button>
          </div>
        </>)}
      </DetailModal>

      <DetailModal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(false); }} title={editing ? 'Edit Anomaly' : 'Add Anomaly'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Type</label><input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g., temperature_spike" required /></div>
            <div className="form-group"><label>Severity</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Sensor</label>
              <select value={form.sensor_id} onChange={(e) => setForm({ ...form, sensor_id: e.target.value })}>
                <option value="">None</option>
                {sensors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Equipment</label>
              <select value={form.equipment_id} onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}>
                <option value="">None</option>
                {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Anomaly</button>
          </div>
        </form>
      </DetailModal>
    </div>
  );
}
