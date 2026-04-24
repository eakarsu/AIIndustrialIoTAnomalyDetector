import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';

const API_BASE = '/api';
const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers } });
  if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/'; return; }
  return res.json();
};

const defaultForm = { equipment_id: '', type: 'preventive', description: '', scheduled_date: '', status: 'scheduled', priority: 'medium', assigned_to: '', notes: '' };

export default function Maintenance() {
  const [items, setItems] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(false);

  useEffect(() => { loadItems(); loadEquipment(); }, []);
  const loadItems = async () => {
    try { const data = await apiCall('/maintenance'); setItems(Array.isArray(data) ? data : []); }
    catch { toast.error('Failed to load maintenance'); }
    finally { setLoading(false); }
  };
  const loadEquipment = async () => {
    try { const data = await apiCall('/equipment'); setEquipment(Array.isArray(data) ? data : []); } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selected) {
        await apiCall(`/maintenance/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
        toast.success('Schedule updated');
      } else {
        await apiCall('/maintenance', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Schedule created');
      }
      setShowForm(false); setForm(defaultForm); setEditing(false); loadItems();
    } catch { toast.error('Operation failed'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this schedule?')) return;
    try { await apiCall(`/maintenance/${item.id}`, { method: 'DELETE' }); toast.success('Deleted'); setShowDetail(false); loadItems(); }
    catch { toast.error('Delete failed'); }
  };

  const openEdit = (item) => {
    setForm({ equipment_id: item.equipment_id || '', type: item.type || 'preventive', description: item.description || '', scheduled_date: item.scheduled_date ? item.scheduled_date.split('T')[0] : '', status: item.status || 'scheduled', priority: item.priority || 'medium', assigned_to: item.assigned_to || '', notes: item.notes || '' });
    setSelected(item); setEditing(true); setShowDetail(false); setShowForm(true);
  };

  const getBadgeClass = (s) => {
    if (s === 'completed') return 'badge badge-completed';
    if (s === 'in_progress') return 'badge badge-in_progress';
    if (s === 'scheduled') return 'badge badge-scheduled';
    return 'badge badge-pending';
  };

  const getPriorityBadge = (p) => {
    if (p === 'critical') return 'badge badge-critical';
    if (p === 'high') return 'badge badge-high';
    if (p === 'medium') return 'badge badge-medium';
    return 'badge badge-low';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Maintenance Scheduling</h1><p>Schedule and track equipment maintenance</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setEditing(false); setShowForm(true); }}><FiPlus /> Add Schedule</button>
      </div>
      <div className="table-container">
        {items.length === 0 ? <div className="empty-state"><p>No maintenance schedules found.</p></div> : (
          <table className="data-table">
            <thead><tr><th>Equipment</th><th>Type</th><th>Scheduled Date</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="clickable-row" onClick={() => { setSelected(item); setShowDetail(true); }}>
                  <td>{item.equipment_name || '-'}</td><td>{item.type}</td>
                  <td>{item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString() : '-'}</td>
                  <td><span className={getPriorityBadge(item.priority)}>{item.priority}</span></td>
                  <td><span className={getBadgeClass(item.status)}>{item.status}</span></td>
                  <td>{item.assigned_to || '-'}</td>
                  <td><div className="action-btns" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}><FiEdit2 /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)}><FiTrash2 /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Maintenance Details">
        {selected && (<>
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Equipment</div><div className="detail-value">{selected.equipment_name || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{selected.type}</div></div>
            <div className="detail-item"><div className="detail-label">Scheduled Date</div><div className="detail-value">{selected.scheduled_date ? new Date(selected.scheduled_date).toLocaleDateString() : '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={getBadgeClass(selected.status)}>{selected.status}</span></div></div>
            <div className="detail-item"><div className="detail-label">Priority</div><div className="detail-value"><span className={getPriorityBadge(selected.priority)}>{selected.priority}</span></div></div>
            <div className="detail-item"><div className="detail-label">Assigned To</div><div className="detail-value">{selected.assigned_to || '-'}</div></div>
            <div className="detail-item detail-full"><div className="detail-label">Description</div><div className="detail-value">{selected.description || '-'}</div></div>
            <div className="detail-item detail-full"><div className="detail-label">Notes</div><div className="detail-value">{selected.notes || '-'}</div></div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => openEdit(selected)}><FiEdit2 /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete</button>
          </div>
        </>)}
      </DetailModal>

      <DetailModal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(false); }} title={editing ? 'Edit Schedule' : 'Add Maintenance Schedule'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Equipment</label>
              <select value={form.equipment_id} onChange={(e) => setForm({ ...form, equipment_id: e.target.value })} required>
                <option value="">Select Equipment</option>
                {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="preventive">Preventive</option><option value="corrective">Corrective</option><option value="predictive">Predictive</option><option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Scheduled Date</label><input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} required /></div>
            <div className="form-group"><label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Assigned To</label><input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Schedule</button>
          </div>
        </form>
      </DetailModal>
    </div>
  );
}
