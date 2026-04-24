import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiCpu } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';
import AIOutput from '../components/AIOutput';

const API_BASE = '/api';
const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers } });
  if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/'; return; }
  return res.json();
};

const defaultForm = { anomaly_id: '', equipment_id: '', title: '', root_cause: '', confidence: '', recommendations: '', status: 'pending' };

export default function RootCause() {
  const [items, setItems] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { loadItems(); loadRefs(); }, []);
  const loadItems = async () => {
    try { const data = await apiCall('/rootcause'); setItems(Array.isArray(data) ? data : []); }
    catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };
  const loadRefs = async () => {
    try {
      const [a, e] = await Promise.all([apiCall('/anomalies'), apiCall('/equipment')]);
      setAnomalies(Array.isArray(a) ? a : []); setEquipment(Array.isArray(e) ? e : []);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, confidence: form.confidence ? Number(form.confidence) / 100 : null, anomaly_id: form.anomaly_id || null, equipment_id: form.equipment_id || null };
      if (editing && selected) {
        await apiCall(`/rootcause/${selected.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Updated');
      } else {
        await apiCall('/rootcause', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Created');
      }
      setShowForm(false); setForm(defaultForm); setEditing(false); loadItems();
    } catch { toast.error('Operation failed'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this analysis?')) return;
    try { await apiCall(`/rootcause/${item.id}`, { method: 'DELETE' }); toast.success('Deleted'); setShowDetail(false); loadItems(); }
    catch { toast.error('Delete failed'); }
  };

  const handleAnalyze = async (item) => {
    setAiLoading(true);
    try {
      const result = await apiCall(`/rootcause/${item.id}/analyze`, { method: 'POST' });
      setSelected({ ...item, ai_analysis: result.ai_analysis });
      toast.success('AI analysis complete');
      loadItems();
    } catch { toast.error('AI analysis failed'); }
    finally { setAiLoading(false); }
  };

  const openEdit = (item) => {
    setForm({ anomaly_id: item.anomaly_id || '', equipment_id: item.equipment_id || '', title: item.title || '', root_cause: item.root_cause || '', confidence: item.confidence ? Math.round(item.confidence * 100) : '', recommendations: item.recommendations || '', status: item.status || 'pending' });
    setSelected(item); setEditing(true); setShowDetail(false); setShowForm(true);
  };

  const getConfColor = (c) => {
    const pct = c * 100;
    if (pct >= 80) return 'var(--green)';
    if (pct >= 50) return 'var(--orange)';
    return 'var(--red)';
  };

  const getStatusBadge = (s) => {
    if (s === 'confirmed') return 'badge badge-active';
    if (s === 'investigating') return 'badge badge-acknowledged';
    if (s === 'pending') return 'badge badge-pending';
    return 'badge badge-info';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Root Cause Analysis</h1><p>AI-powered root cause identification</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setEditing(false); setShowForm(true); }}><FiPlus /> Add Analysis</button>
      </div>
      <div className="table-container">
        {items.length === 0 ? <div className="empty-state"><p>No analyses found.</p></div> : (
          <table className="data-table">
            <thead><tr><th>Title</th><th>Equipment</th><th>Confidence</th><th>Status</th><th>Created</th><th>AI</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="clickable-row" onClick={() => { setSelected(item); setShowDetail(true); }}>
                  <td>{item.title}</td>
                  <td>{item.equipment_name || '-'}</td>
                  <td>
                    {item.confidence ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="health-bar"><div className="health-fill" style={{ width: `${item.confidence * 100}%`, background: getConfColor(item.confidence) }}></div></div>
                        <span style={{ color: getConfColor(item.confidence), fontWeight: 600 }}>{Math.round(item.confidence * 100)}%</span>
                      </div>
                    ) : '-'}
                  </td>
                  <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</td>
                  <td>{item.ai_analysis ? <span className="badge badge-active">Done</span> : <span className="badge badge-pending">Pending</span>}</td>
                  <td><div className="action-btns" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ai btn-sm" onClick={() => { setSelected(item); setShowDetail(true); handleAnalyze(item); }}><FiCpu /></button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}><FiEdit2 /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)}><FiTrash2 /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DetailModal isOpen={showDetail} onClose={() => { setShowDetail(false); setAiLoading(false); }} title="Root Cause Analysis Details">
        {selected && (<>
          <div className="detail-grid">
            <div className="detail-item detail-full"><div className="detail-label">Title</div><div className="detail-value">{selected.title}</div></div>
            <div className="detail-item"><div className="detail-label">Equipment</div><div className="detail-value">{selected.equipment_name || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={getStatusBadge(selected.status)}>{selected.status}</span></div></div>
            <div className="detail-item"><div className="detail-label">Confidence</div><div className="detail-value">{selected.confidence ? Math.round(selected.confidence * 100) + '%' : '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{selected.created_at ? new Date(selected.created_at).toLocaleString() : '-'}</div></div>
            <div className="detail-item detail-full"><div className="detail-label">Root Cause</div><div className="detail-value">{selected.root_cause || '-'}</div></div>
            <div className="detail-item detail-full"><div className="detail-label">Recommendations</div><div className="detail-value">{selected.recommendations || '-'}</div></div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <button className="btn btn-ai" onClick={() => handleAnalyze(selected)} disabled={aiLoading}><FiCpu /> {aiLoading ? 'Analyzing...' : 'Analyze Root Cause'}</button>
          </div>
          <AIOutput content={selected.ai_analysis} loading={aiLoading} />
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => openEdit(selected)}><FiEdit2 /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete</button>
          </div>
        </>)}
      </DetailModal>

      <DetailModal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(false); }} title={editing ? 'Edit Analysis' : 'Add Root Cause Analysis'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="form-row">
            <div className="form-group"><label>Anomaly</label>
              <select value={form.anomaly_id} onChange={(e) => setForm({ ...form, anomaly_id: e.target.value })}>
                <option value="">None</option>
                {anomalies.map(a => <option key={a.id} value={a.id}>{a.type} - {a.description?.substring(0, 40) || 'No desc'}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Equipment</label>
              <select value={form.equipment_id} onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}>
                <option value="">None</option>
                {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Confidence (%)</label><input type="number" min="0" max="100" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: e.target.value })} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option><option value="investigating">Investigating</option><option value="confirmed">Confirmed</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Root Cause</label><textarea value={form.root_cause} onChange={(e) => setForm({ ...form, root_cause: e.target.value })} /></div>
          <div className="form-group"><label>Recommendations</label><textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} /></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Analysis</button>
          </div>
        </form>
      </DetailModal>
    </div>
  );
}
