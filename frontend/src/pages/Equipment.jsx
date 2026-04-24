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

const defaultForm = { name: '', type: '', location: '', manufacturer: '', model: '', serial_number: '', status: 'operational', install_date: '', last_maintenance: '' };

export default function Equipment() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(false);

  useEffect(() => { loadItems(); }, []);
  const loadItems = async () => {
    try { const data = await apiCall('/equipment'); setItems(Array.isArray(data) ? data : []); }
    catch { toast.error('Failed to load equipment'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selected) {
        await apiCall(`/equipment/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
        toast.success('Equipment updated');
      } else {
        await apiCall('/equipment', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Equipment created');
      }
      setShowForm(false); setForm(defaultForm); setEditing(false); loadItems();
    } catch { toast.error('Operation failed'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this equipment?')) return;
    try { await apiCall(`/equipment/${item.id}`, { method: 'DELETE' }); toast.success('Equipment deleted'); setShowDetail(false); loadItems(); }
    catch { toast.error('Delete failed'); }
  };

  const openEdit = (item) => {
    setForm({ name: item.name || '', type: item.type || '', location: item.location || '', manufacturer: item.manufacturer || '', model: item.model || '', serial_number: item.serial_number || '', status: item.status || 'operational', install_date: item.install_date ? item.install_date.split('T')[0] : '', last_maintenance: item.last_maintenance ? item.last_maintenance.split('T')[0] : '' });
    setSelected(item); setEditing(true); setShowDetail(false); setShowForm(true);
  };

  const getBadgeClass = (s) => {
    if (s === 'operational') return 'badge badge-active';
    if (s === 'maintenance') return 'badge badge-warning';
    if (s === 'warning') return 'badge badge-high';
    if (s === 'offline') return 'badge badge-critical';
    return 'badge badge-info';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Equipment Registry</h1><p>Track industrial equipment inventory and status</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setEditing(false); setShowForm(true); }}><FiPlus /> Add Equipment</button>
      </div>
      <div className="table-container">
        {items.length === 0 ? <div className="empty-state"><p>No equipment found.</p></div> : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Type</th><th>Location</th><th>Manufacturer</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="clickable-row" onClick={() => { setSelected(item); setShowDetail(true); }}>
                  <td>{item.name}</td><td>{item.type}</td><td>{item.location}</td><td>{item.manufacturer || '-'}</td>
                  <td><span className={getBadgeClass(item.status)}>{item.status}</span></td>
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

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Equipment Details">
        {selected && (<>
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Name</div><div className="detail-value">{selected.name}</div></div>
            <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{selected.type}</div></div>
            <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selected.location}</div></div>
            <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={getBadgeClass(selected.status)}>{selected.status}</span></div></div>
            <div className="detail-item"><div className="detail-label">Manufacturer</div><div className="detail-value">{selected.manufacturer || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Model</div><div className="detail-value">{selected.model || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Serial Number</div><div className="detail-value">{selected.serial_number || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Install Date</div><div className="detail-value">{selected.install_date ? new Date(selected.install_date).toLocaleDateString() : '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Last Maintenance</div><div className="detail-value">{selected.last_maintenance ? new Date(selected.last_maintenance).toLocaleDateString() : '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{selected.created_at ? new Date(selected.created_at).toLocaleString() : '-'}</div></div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => openEdit(selected)}><FiEdit2 /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete</button>
          </div>
        </>)}
      </DetailModal>

      <DetailModal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(false); }} title={editing ? 'Edit Equipment' : 'Add New Equipment'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Type</label><input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g., CNC Machine, Pump" required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></div>
            <div className="form-group"><label>Manufacturer</label><input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Model</label><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div className="form-group"><label>Serial Number</label><input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Install Date</label><input type="date" value={form.install_date} onChange={(e) => setForm({ ...form, install_date: e.target.value })} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="operational">Operational</option><option value="maintenance">Maintenance</option><option value="warning">Warning</option><option value="offline">Offline</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Equipment</button>
          </div>
        </form>
      </DetailModal>
    </div>
  );
}
