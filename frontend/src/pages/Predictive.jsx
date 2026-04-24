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

const defaultForm = { equipment_id: '', failure_type: '', probability: '', predicted_failure_date: '', recommended_action: '', status: 'pending' };

export default function Predictive() {
  const [items, setItems] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { loadItems(); loadEquipment(); }, []);
  const loadItems = async () => {
    try { const data = await apiCall('/predictive'); setItems(Array.isArray(data) ? data : []); }
    catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };
  const loadEquipment = async () => {
    try { const data = await apiCall('/equipment'); setEquipment(Array.isArray(data) ? data : []); } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, probability: form.probability ? Number(form.probability) / 100 : null };
      if (editing && selected) {
        await apiCall(`/predictive/${selected.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Updated');
      } else {
        await apiCall('/predictive', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Created');
      }
      setShowForm(false); setForm(defaultForm); setEditing(false); loadItems();
    } catch { toast.error('Operation failed'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this prediction?')) return;
    try { await apiCall(`/predictive/${item.id}`, { method: 'DELETE' }); toast.success('Deleted'); setShowDetail(false); loadItems(); }
    catch { toast.error('Delete failed'); }
  };

  const handlePredict = async (item) => {
    setAiLoading(true);
    try {
      const result = await apiCall(`/predictive/${item.id}/predict`, { method: 'POST' });
      setSelected({ ...item, ai_analysis: result.ai_analysis });
      toast.success('AI prediction complete');
      loadItems();
    } catch { toast.error('AI prediction failed'); }
    finally { setAiLoading(false); }
  };

  const openEdit = (item) => {
    setForm({ equipment_id: item.equipment_id || '', failure_type: item.failure_type || '', probability: item.probability ? Math.round(item.probability * 100) : '', predicted_failure_date: item.predicted_failure_date ? item.predicted_failure_date.split('T')[0] : '', recommended_action: item.recommended_action || '', status: item.status || 'pending' });
    setSelected(item); setEditing(true); setShowDetail(false); setShowForm(true);
  };

  const getProbColor = (p) => {
    const pct = p * 100;
    if (pct >= 80) return 'var(--red)';
    if (pct >= 50) return 'var(--orange)';
    return 'var(--green)';
  };

  const getStatusBadge = (s) => {
    if (s === 'pending') return 'badge badge-pending';
    if (s === 'acknowledged') return 'badge badge-acknowledged';
    if (s === 'in_progress') return 'badge badge-in_progress';
    if (s === 'monitoring') return 'badge badge-info';
    return 'badge badge-resolved';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Predictive Maintenance</h1><p>AI-powered equipment failure predictions</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setEditing(false); setShowForm(true); }}><FiPlus /> Add Prediction</button>
      </div>
      <div className="table-container">
        {items.length === 0 ? <div className="empty-state"><p>No predictions found.</p></div> : (
          <table className="data-table">
            <thead><tr><th>Equipment</th><th>Failure Type</th><th>Probability</th><th>Predicted Date</th><th>Status</th><th>AI</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="clickable-row" onClick={() => { setSelected(item); setShowDetail(true); }}>
                  <td>{item.equipment_name || '-'}</td>
                  <td>{item.failure_type}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="health-bar"><div className="health-fill" style={{ width: `${(item.probability || 0) * 100}%`, background: getProbColor(item.probability || 0) }}></div></div>
                      <span style={{ color: getProbColor(item.probability || 0), fontWeight: 600 }}>{item.probability ? Math.round(item.probability * 100) + '%' : '-'}</span>
                    </div>
                  </td>
                  <td>{item.predicted_failure_date ? new Date(item.predicted_failure_date).toLocaleDateString() : '-'}</td>
                  <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                  <td>{item.ai_analysis ? <span className="badge badge-active">Done</span> : <span className="badge badge-pending">Pending</span>}</td>
                  <td><div className="action-btns" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ai btn-sm" onClick={() => { setSelected(item); setShowDetail(true); handlePredict(item); }}><FiCpu /></button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}><FiEdit2 /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)}><FiTrash2 /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DetailModal isOpen={showDetail} onClose={() => { setShowDetail(false); setAiLoading(false); }} title="Prediction Details">
        {selected && (<>
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Equipment</div><div className="detail-value">{selected.equipment_name || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Failure Type</div><div className="detail-value">{selected.failure_type}</div></div>
            <div className="detail-item"><div className="detail-label">Probability</div><div className="detail-value" style={{ color: getProbColor(selected.probability || 0) }}>{selected.probability ? Math.round(selected.probability * 100) + '%' : '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Predicted Date</div><div className="detail-value">{selected.predicted_failure_date ? new Date(selected.predicted_failure_date).toLocaleDateString() : '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={getStatusBadge(selected.status)}>{selected.status}</span></div></div>
            <div className="detail-item detail-full"><div className="detail-label">Recommended Action</div><div className="detail-value">{selected.recommended_action || '-'}</div></div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <button className="btn btn-ai" onClick={() => handlePredict(selected)} disabled={aiLoading}><FiCpu /> {aiLoading ? 'Predicting...' : 'Predict with AI'}</button>
          </div>
          <AIOutput content={selected.ai_analysis} loading={aiLoading} />
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => openEdit(selected)}><FiEdit2 /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete</button>
          </div>
        </>)}
      </DetailModal>

      <DetailModal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(false); }} title={editing ? 'Edit Prediction' : 'Add Prediction'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Equipment</label>
              <select value={form.equipment_id} onChange={(e) => setForm({ ...form, equipment_id: e.target.value })} required>
                <option value="">Select Equipment</option>
                {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Failure Type</label><input value={form.failure_type} onChange={(e) => setForm({ ...form, failure_type: e.target.value })} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Probability (%)</label><input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} /></div>
            <div className="form-group"><label>Predicted Failure Date</label><input type="date" value={form.predicted_failure_date} onChange={(e) => setForm({ ...form, predicted_failure_date: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option><option value="acknowledged">Acknowledged</option><option value="in_progress">In Progress</option><option value="monitoring">Monitoring</option><option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="form-group"><label>Recommended Action</label><textarea value={form.recommended_action} onChange={(e) => setForm({ ...form, recommended_action: e.target.value })} /></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Prediction</button>
          </div>
        </form>
      </DetailModal>
    </div>
  );
}
