import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiSend } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';

const API_BASE = '/api';
const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers },
  });
  if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/'; return; }
  if (res.status === 429) { toast.error('Rate limit reached. Please try again later.'); return; }
  return res.json();
};

const defaultForm = { name: '', type: 'temperature', location: '', status: 'active', unit: '', min_value: '', max_value: '' };

export default function Sensors() {
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

  // Sensor reading simulator state
  const [simSensorId, setSimSensorId] = useState('');
  const [simValue, setSimValue] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  useEffect(() => { loadItems(); }, [page]);

  const loadItems = async () => {
    try {
      const data = await apiCall(`/sensors?page=${page}&limit=${limit}`);
      if (data && data.data) {
        setItems(data.data);
        setPagination(data.pagination);
      } else if (Array.isArray(data)) {
        setItems(data);
      }
    } catch { toast.error('Failed to load sensors'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, min_value: form.min_value ? Number(form.min_value) : null, max_value: form.max_value ? Number(form.max_value) : null };
      if (editing && selected) {
        await apiCall(`/sensors/${selected.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Sensor updated');
      } else {
        await apiCall('/sensors', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Sensor created');
      }
      setShowForm(false); setForm(defaultForm); setEditing(false); loadItems();
    } catch { toast.error('Operation failed'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this sensor?')) return;
    try {
      await apiCall(`/sensors/${item.id}`, { method: 'DELETE' });
      toast.success('Sensor deleted'); setShowDetail(false); setSelected(null); loadItems();
    } catch { toast.error('Delete failed'); }
  };

  const handleSendReading = async (e) => {
    e.preventDefault();
    if (!simSensorId || simValue === '') { toast.error('Select a sensor and enter a value'); return; }
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await fetch(`${API_BASE}/sensors/${simSensorId}/reading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: Number(simValue), timestamp: new Date().toISOString() }),
      });
      if (res.status === 429) { toast.error('Rate limit reached.'); return; }
      const data = await res.json();
      setSimResult(data);
      if (data.anomaly_created) {
        toast.warning('Anomaly detected! Auto-created anomaly record.');
      } else {
        toast.success('Reading sent successfully.');
      }
      loadItems();
    } catch { toast.error('Failed to send reading'); }
    finally { setSimLoading(false); }
  };

  const openEdit = (item) => {
    setForm({ name: item.name || '', type: item.type || 'temperature', location: item.location || '', status: item.status || 'active', unit: item.unit || '', min_value: item.min_value || '', max_value: item.max_value || '' });
    setSelected(item); setEditing(true); setShowDetail(false); setShowForm(true);
  };

  const getBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return 'badge badge-active';
    if (s === 'warning') return 'badge badge-warning';
    if (s === 'error') return 'badge badge-critical';
    return 'badge badge-inactive';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Sensor Management</h1><p>Monitor and manage IoT sensors</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setEditing(false); setShowForm(true); }}><FiPlus /> Add New Sensor</button>
      </div>

      {/* Sensor Reading Simulator */}
      <div className="table-container" style={{ marginBottom: '16px', padding: '16px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--cyan)' }}>Test Sensor — Send Reading</h3>
        <form onSubmit={handleSendReading} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flex: '1', minWidth: '160px' }}>
            <label>Sensor</label>
            <select value={simSensorId} onChange={(e) => setSimSensorId(e.target.value)}>
              <option value="">Select sensor...</option>
              {items.map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit || 'no unit'})</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: '1', minWidth: '120px' }}>
            <label>Value</label>
            <input type="number" step="any" value={simValue} onChange={(e) => setSimValue(e.target.value)} placeholder="e.g. 95.5" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={simLoading} style={{ marginBottom: '0' }}>
            <FiSend /> {simLoading ? 'Sending...' : 'Send Reading'}
          </button>
        </form>
        {simResult && (
          <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px', background: simResult.anomaly_created ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${simResult.anomaly_created ? 'var(--red)' : 'var(--green)'}` }}>
            {simResult.anomaly_created
              ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>Anomaly detected! An anomaly record was auto-created.</span>
              : <span style={{ color: 'var(--green)' }}>Reading received. No anomaly detected.</span>
            }
          </div>
        )}
      </div>

      <div className="table-container">
        {items.length === 0 ? <div className="empty-state"><p>No sensors found.</p></div> : (
          <>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Type</th><th>Location</th><th>Status</th><th>Last Reading</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="clickable-row" onClick={() => { setSelected(item); setShowDetail(true); }}>
                    <td>{item.name}</td>
                    <td>{item.type}</td>
                    <td>{item.location}</td>
                    <td><span className={getBadgeClass(item.status)}>{item.status}</span></td>
                    <td>{item.last_reading != null ? `${item.last_reading} ${item.unit || ''}` : '-'}</td>
                    <td>
                      <div className="action-btns" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}><FiEdit2 /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)}><FiTrash2 /></button>
                      </div>
                    </td>
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

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Sensor Details">
        {selected && (
          <>
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">Name</div><div className="detail-value">{selected.name}</div></div>
              <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{selected.type}</div></div>
              <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selected.location}</div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={getBadgeClass(selected.status)}>{selected.status}</span></div></div>
              <div className="detail-item"><div className="detail-label">Unit</div><div className="detail-value">{selected.unit || '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Last Reading</div><div className="detail-value">{selected.last_reading != null ? `${selected.last_reading} ${selected.unit || ''}` : '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Min Value</div><div className="detail-value">{selected.min_value ?? '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Max Value</div><div className="detail-value">{selected.max_value ?? '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Installed</div><div className="detail-value">{selected.installed_date ? new Date(selected.installed_date).toLocaleDateString() : '-'}</div></div>
              <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{selected.created_at ? new Date(selected.created_at).toLocaleString() : '-'}</div></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => openEdit(selected)}><FiEdit2 /> Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete</button>
            </div>
          </>
        )}
      </DetailModal>

      <DetailModal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(false); }} title={editing ? 'Edit Sensor' : 'Add New Sensor'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="temperature">Temperature</option><option value="pressure">Pressure</option><option value="vibration">Vibration</option>
                <option value="humidity">Humidity</option><option value="flow">Flow</option><option value="level">Level</option>
                <option value="current">Current</option><option value="speed">Speed</option><option value="gas">Gas</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></div>
            <div className="form-group"><label>Unit</label><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g., °C, bar, mm/s" required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Min Value</label><input type="number" step="any" value={form.min_value} onChange={(e) => setForm({ ...form, min_value: e.target.value })} /></div>
            <div className="form-group"><label>Max Value</label><input type="number" step="any" value={form.max_value} onChange={(e) => setForm({ ...form, max_value: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option><option value="inactive">Inactive</option><option value="warning">Warning</option><option value="error">Error</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(false); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'} Sensor</button>
          </div>
        </form>
      </DetailModal>
    </div>
  );
}
