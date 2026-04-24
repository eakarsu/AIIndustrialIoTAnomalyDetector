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

const defaultForm = { equipment_id: '', consumption_kwh: '', cost: '', period_start: '', period_end: '', savings_potential: '' };

export default function Energy() {
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
    try { const data = await apiCall('/energy'); setItems(Array.isArray(data) ? data : []); }
    catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };
  const loadEquipment = async () => {
    try { const data = await apiCall('/equipment'); setEquipment(Array.isArray(data) ? data : []); } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, consumption_kwh: Number(form.consumption_kwh), cost: form.cost ? Number(form.cost) : null, savings_potential: form.savings_potential ? Number(form.savings_potential) : null };
      if (editing && selected) {
        await apiCall(`/energy/${selected.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Updated');
      } else {
        await apiCall('/energy', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Created');
      }
      setShowForm(false); setForm(defaultForm); setEditing(false); loadItems();
    } catch { toast.error('Operation failed'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this record?')) return;
    try { await apiCall(`/energy/${item.id}`, { method: 'DELETE' }); toast.success('Deleted'); setShowDetail(false); loadItems(); }
    catch { toast.error('Delete failed'); }
  };

  const handleOptimize = async (item) => {
    setAiLoading(true);
    try {
      const result = await apiCall(`/energy/${item.id}/optimize`, { method: 'POST' });
      setSelected({ ...item, ai_optimization: result.ai_optimization });
      toast.success('AI optimization complete');
      loadItems();
    } catch { toast.error('AI optimization failed'); }
    finally { setAiLoading(false); }
  };

  const openEdit = (item) => {
    setForm({ equipment_id: item.equipment_id || '', consumption_kwh: item.consumption_kwh || '', cost: item.cost || '', period_start: item.period_start ? item.period_start.split('T')[0] : '', period_end: item.period_end ? item.period_end.split('T')[0] : '', savings_potential: item.savings_potential || '' });
    setSelected(item); setEditing(true); setShowDetail(false); setShowForm(true);
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Energy Optimization</h1><p>AI-powered energy consumption analysis and optimization</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setEditing(false); setShowForm(true); }}><FiPlus /> Add Record</button>
      </div>
      <div className="table-container">
        {items.length === 0 ? <div className="empty-state"><p>No energy records found.</p></div> : (
          <table className="data-table">
            <thead><tr><th>Equipment</th><th>Consumption (kWh)</th><th>Cost ($)</th><th>Period</th><th>Savings Potential</th><th>AI</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="clickable-row" onClick={() => { setSelected(item); setShowDetail(true); }}>
                  <td>{item.equipment_name || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{Number(item.consumption_kwh).toLocaleString()}</td>
                  <td>{item.cost ? `$${Number(item.cost).toFixed(2)}` : '-'}</td>
                  <td style={{ fontSize: '12px' }}>{item.period_start ? new Date(item.period_start).toLocaleDateString() : ''} - {item.period_end ? new Date(item.period_end).toLocaleDateString() : ''}</td>
                  <td>{item.savings_potential ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>{Number(item.savings_potential).toLocaleString()} kWh</span> : '-'}</td>
                  <td>{item.ai_optimization ? <span className="badge badge-active">Done</span> : <span className="badge badge-pending">Pending</span>}</td>
                  <td><div className="action-btns" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ai btn-sm" onClick={() => { setSelected(item); setShowDetail(true); handleOptimize(item); }}><FiCpu /></button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}><FiEdit2 /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)}><FiTrash2 /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DetailModal isOpen={showDetail} onClose={() => { setShowDetail(false); setAiLoading(false); }} title="Energy Record Details">
        {selected && (<>
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Equipment</div><div className="detail-value">{selected.equipment_name || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Consumption</div><div className="detail-value" style={{ fontSize: '18px', fontWeight: 700 }}>{Number(selected.consumption_kwh).toLocaleString()} kWh</div></div>
            <div className="detail-item"><div className="detail-label">Cost</div><div className="detail-value">{selected.cost ? `$${Number(selected.cost).toFixed(2)}` : '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Savings Potential</div><div className="detail-value" style={{ color: 'var(--green)', fontWeight: 600 }}>{selected.savings_potential ? `${Number(selected.savings_potential).toLocaleString()} kWh` : '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Period Start</div><div className="detail-value">{selected.period_start ? new Date(selected.period_start).toLocaleDateString() : '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Period End</div><div className="detail-value">{selected.period_end ? new Date(selected.period_end).toLocaleDateString() : '-'}</div></div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <button className="btn btn-ai" onClick={() => handleOptimize(selected)} disabled={aiLoading}><FiCpu /> {aiLoading ? 'Optimizing...' : 'Optimize with AI'}</button>
          </div>
          <AIOutput content={selected.ai_optimization} loading={aiLoading} />
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => openEdit(selected)}><FiEdit2 /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete</button>
          </div>
        </>)}
      </DetailModal>

      <DetailModal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(false); }} title={editing ? 'Edit Energy Record' : 'Add Energy Record'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Equipment</label>
              <select value={form.equipment_id} onChange={(e) => setForm({ ...form, equipment_id: e.target.value })} required>
                <option value="">Select Equipment</option>
                {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Consumption (kWh)</label><input type="number" step="0.1" value={form.consumption_kwh} onChange={(e) => setForm({ ...form, consumption_kwh: e.target.value })} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Cost ($)</label><input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            <div className="form-group"><label>Savings Potential (kWh)</label><input type="number" step="0.1" value={form.savings_potential} onChange={(e) => setForm({ ...form, savings_potential: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Period Start</label><input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} required /></div>
            <div className="form-group"><label>Period End</label><input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} required /></div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Record</button>
          </div>
        </form>
      </DetailModal>
    </div>
  );
}
