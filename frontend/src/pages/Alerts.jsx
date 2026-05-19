import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiCheck } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';

const API_BASE = '/api';
const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers } });
  if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/'; return; }
  if (res.status === 429) { toast.error('Rate limit reached. Please try again later.'); return null; }
  return res.json();
};

const defaultForm = { type: '', severity: 'medium', message: '', source: '', equipment_id: '', sensor_id: '', status: 'active' };

export default function Alerts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  useEffect(() => { loadItems(); }, [page]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { loadItems(); }, 30000);
    return () => clearInterval(interval);
  }, [page]);

  const loadItems = async () => {
    try {
      const data = await apiCall(`/alerts?page=${page}&limit=${limit}`);
      if (data && data.data) { setItems(data.data); setPagination(data.pagination); }
      else if (Array.isArray(data)) setItems(data);
    }
    catch { toast.error('Failed to load alerts'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selected) {
        await apiCall(`/alerts/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
        toast.success('Alert updated');
      } else {
        await apiCall('/alerts', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Alert created');
      }
      setShowForm(false); setForm(defaultForm); setEditing(false); loadItems();
    } catch { toast.error('Operation failed'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this alert?')) return;
    try { await apiCall(`/alerts/${item.id}`, { method: 'DELETE' }); toast.success('Deleted'); setShowDetail(false); loadItems(); }
    catch { toast.error('Delete failed'); }
  };

  const handleAcknowledge = async (item) => {
    try {
      await apiCall(`/alerts/${item.id}/acknowledge`, { method: 'PATCH', body: JSON.stringify({}) });
      toast.success('Alert acknowledged'); loadItems(); setShowDetail(false);
    } catch { toast.error('Failed to acknowledge'); }
  };

  const openEdit = (item) => {
    setForm({ type: item.type || '', severity: item.severity || 'medium', message: item.message || '', source: item.source || '', equipment_id: item.equipment_id || '', sensor_id: item.sensor_id || '', status: item.status || 'active' });
    setSelected(item); setEditing(true); setShowDetail(false); setShowForm(true);
  };

  const getSeverityBadge = (s) => {
    if (s === 'critical') return 'badge badge-critical';
    if (s === 'high') return 'badge badge-high';
    if (s === 'medium') return 'badge badge-medium';
    return 'badge badge-low';
  };

  const getStatusBadge = (s) => {
    if (s === 'active') return 'badge badge-critical';
    if (s === 'acknowledged') return 'badge badge-acknowledged';
    if (s === 'resolved') return 'badge badge-resolved';
    return 'badge badge-pending';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Alert Management</h1><p>Monitor and manage system alerts</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setEditing(false); setShowForm(true); }}><FiPlus /> Create Alert</button>
      </div>
      <div className="table-container">
        {items.length === 0 ? <div className="empty-state"><p>No alerts found.</p></div> : (
          <>
            <table className="data-table">
              <thead><tr><th>Type</th><th>Severity</th><th>Message</th><th>Source</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="clickable-row" onClick={() => { setSelected(item); setShowDetail(true); }}>
                    <td>{item.type}</td>
                    <td><span className={getSeverityBadge(item.severity)}>{item.severity}</span></td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.message}</td>
                    <td>{item.source || '-'}</td>
                    <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                    <td>{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</td>
                    <td><div className="action-btns" onClick={(e) => e.stopPropagation()}>
                      {item.status === 'active' && <button className="btn btn-success btn-sm" onClick={() => handleAcknowledge(item)}><FiCheck /></button>}
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

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Alert Details">
        {selected && (<>
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{selected.type}</div></div>
            <div className="detail-item"><div className="detail-label">Severity</div><div className="detail-value"><span className={getSeverityBadge(selected.severity)}>{selected.severity}</span></div></div>
            <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={getStatusBadge(selected.status)}>{selected.status}</span></div></div>
            <div className="detail-item"><div className="detail-label">Source</div><div className="detail-value">{selected.source || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Equipment</div><div className="detail-value">{selected.equipment_name || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Sensor</div><div className="detail-value">{selected.sensor_name || '-'}</div></div>
            <div className="detail-item detail-full"><div className="detail-label">Message</div><div className="detail-value">{selected.message}</div></div>
            <div className="detail-item"><div className="detail-label">Acknowledged By</div><div className="detail-value">{selected.acknowledged_by || '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Acknowledged At</div><div className="detail-value">{selected.acknowledged_at ? new Date(selected.acknowledged_at).toLocaleString() : '-'}</div></div>
            <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{selected.created_at ? new Date(selected.created_at).toLocaleString() : '-'}</div></div>
          </div>
          <div className="modal-actions">
            {selected.status === 'active' && <button className="btn btn-success" onClick={() => handleAcknowledge(selected)}><FiCheck /> Acknowledge</button>}
            <button className="btn btn-outline" onClick={() => openEdit(selected)}><FiEdit2 /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete</button>
          </div>
        </>)}
      </DetailModal>

      <DetailModal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(false); }} title={editing ? 'Edit Alert' : 'Create Alert'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Type</label><input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g., threshold_exceeded" required /></div>
            <div className="form-group"><label>Severity</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Message</label><textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></div>
          <div className="form-row">
            <div className="form-group"><label>Source</label><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Alert</button>
          </div>
        </form>
      </DetailModal>
    </div>
  );
}
