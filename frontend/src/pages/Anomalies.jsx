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

const defaultForm = { sensor_id: '', equipment_id: '', type: '', severity: 'medium', description: '', status: 'open' };

export default function Anomalies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [sensors, setSensors] = useState([]);
  const [equipment, setEquipment] = useState([]);

  useEffect(() => { loadItems(); loadRefs(); }, []);
  const loadItems = async () => {
    try { const data = await apiCall('/anomalies'); setItems(Array.isArray(data) ? data : []); }
    catch { toast.error('Failed to load anomalies'); }
    finally { setLoading(false); }
  };
  const loadRefs = async () => {
    try {
      const [s, e] = await Promise.all([apiCall('/sensors'), apiCall('/equipment')]);
      setSensors(Array.isArray(s) ? s : []); setEquipment(Array.isArray(e) ? e : []);
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
    try {
      const result = await apiCall(`/anomalies/${item.id}/analyze`, { method: 'POST' });
      setSelected({ ...item, ai_analysis: result.ai_analysis });
      toast.success('AI analysis complete');
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
          <table className="data-table">
            <thead><tr><th>Type</th><th>Severity</th><th>Sensor</th><th>Equipment</th><th>Status</th><th>Detected</th><th>AI</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="clickable-row" onClick={() => { setSelected(item); setShowDetail(true); }}>
                  <td>{item.type}</td>
                  <td><span className={getSeverityBadge(item.severity)}>{item.severity}</span></td>
                  <td>{item.sensor_name || '-'}</td>
                  <td>{item.equipment_name || '-'}</td>
                  <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                  <td>{item.detected_at ? new Date(item.detected_at).toLocaleString() : '-'}</td>
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

      <DetailModal isOpen={showDetail} onClose={() => { setShowDetail(false); setAiLoading(false); }} title="Anomaly Details">
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
          <AIOutput content={selected.ai_analysis} loading={aiLoading} />
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
