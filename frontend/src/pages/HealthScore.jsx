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

const defaultForm = { equipment_id: '', score: '', recommendations: '' };

export default function HealthScore() {
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
    try { const data = await apiCall('/health'); setItems(Array.isArray(data) ? data : []); }
    catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };
  const loadEquipment = async () => {
    try { const data = await apiCall('/equipment'); setEquipment(Array.isArray(data) ? data : []); } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, score: Number(form.score) };
      if (editing && selected) {
        await apiCall(`/health/${selected.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Updated');
      } else {
        await apiCall('/health', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Created');
      }
      setShowForm(false); setForm(defaultForm); setEditing(false); loadItems();
    } catch { toast.error('Operation failed'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this health score?')) return;
    try { await apiCall(`/health/${item.id}`, { method: 'DELETE' }); toast.success('Deleted'); setShowDetail(false); loadItems(); }
    catch { toast.error('Delete failed'); }
  };

  const handleCalculate = async (item) => {
    setAiLoading(true);
    try {
      const result = await apiCall(`/health/${item.id}/calculate`, { method: 'POST' });
      setSelected({ ...item, ai_analysis: result.ai_analysis });
      toast.success('AI calculation complete');
      loadItems();
    } catch { toast.error('AI calculation failed'); }
    finally { setAiLoading(false); }
  };

  const openEdit = (item) => {
    setForm({ equipment_id: item.equipment_id || '', score: item.score || '', recommendations: item.recommendations || '' });
    setSelected(item); setEditing(true); setShowDetail(false); setShowForm(true);
  };

  const getScoreColor = (s) => {
    if (s >= 80) return 'green';
    if (s >= 50) return 'yellow';
    return 'red';
  };

  const getScoreColorVar = (s) => {
    if (s >= 80) return 'var(--green)';
    if (s >= 50) return 'var(--orange)';
    return 'var(--red)';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Equipment Health Scoring</h1><p>AI-powered equipment health assessment</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setEditing(false); setShowForm(true); }}><FiPlus /> Add Health Score</button>
      </div>
      <div className="table-container">
        {items.length === 0 ? <div className="empty-state"><p>No health scores found.</p></div> : (
          <table className="data-table">
            <thead><tr><th>Equipment</th><th>Health Score</th><th>Calculated At</th><th>AI</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="clickable-row" onClick={() => { setSelected(item); setShowDetail(true); }}>
                  <td>{item.equipment_name || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="health-bar" style={{ maxWidth: '150px' }}>
                        <div className={`health-fill ${getScoreColor(item.score)}`} style={{ width: `${item.score}%` }}></div>
                      </div>
                      <span style={{ fontWeight: 700, color: getScoreColorVar(item.score), fontSize: '16px' }}>{Math.round(item.score)}</span>
                    </div>
                  </td>
                  <td>{item.calculated_at ? new Date(item.calculated_at).toLocaleString() : '-'}</td>
                  <td>{item.ai_analysis ? <span className="badge badge-active">Done</span> : <span className="badge badge-pending">Pending</span>}</td>
                  <td><div className="action-btns" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ai btn-sm" onClick={() => { setSelected(item); setShowDetail(true); handleCalculate(item); }}><FiCpu /></button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}><FiEdit2 /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)}><FiTrash2 /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DetailModal isOpen={showDetail} onClose={() => { setShowDetail(false); setAiLoading(false); }} title="Health Score Details">
        {selected && (<>
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Equipment</div><div className="detail-value">{selected.equipment_name || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Health Score</div>
              <div className="detail-value">
                <span style={{ fontSize: '24px', fontWeight: 700, color: getScoreColorVar(selected.score) }}>{Math.round(selected.score)}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}> / 100</span>
              </div>
            </div>
            <div className="detail-item"><div className="detail-label">Calculated At</div><div className="detail-value">{selected.calculated_at ? new Date(selected.calculated_at).toLocaleString() : '-'}</div></div>
            {selected.factors && (
              <div className="detail-item detail-full">
                <div className="detail-label">Health Factors</div>
                <div className="detail-value">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {Object.entries(typeof selected.factors === 'string' ? JSON.parse(selected.factors) : selected.factors).map(([key, val]) => (
                      <div key={key} style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: getScoreColorVar(val) }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="detail-item detail-full"><div className="detail-label">Recommendations</div><div className="detail-value">{selected.recommendations || '-'}</div></div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <button className="btn btn-ai" onClick={() => handleCalculate(selected)} disabled={aiLoading}><FiCpu /> {aiLoading ? 'Calculating...' : 'Calculate Health Score'}</button>
          </div>
          <AIOutput content={selected.ai_analysis} loading={aiLoading} />
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => openEdit(selected)}><FiEdit2 /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete</button>
          </div>
        </>)}
      </DetailModal>

      <DetailModal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(false); }} title={editing ? 'Edit Health Score' : 'Add Health Score'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Equipment</label>
              <select value={form.equipment_id} onChange={(e) => setForm({ ...form, equipment_id: e.target.value })} required>
                <option value="">Select Equipment</option>
                {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Score (0-100)</label><input type="number" min="0" max="100" step="0.1" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} required /></div>
          </div>
          <div className="form-group"><label>Recommendations</label><textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} /></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Health Score</button>
          </div>
        </form>
      </DetailModal>
    </div>
  );
}
