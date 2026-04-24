import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCpu, FiActivity, FiTool, FiAlertTriangle, FiBarChart2, FiSearch, FiClock, FiTarget, FiHeart, FiZap } from 'react-icons/fi';
import { toast } from 'react-toastify';

const API_BASE = '/api';

const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/';
    return;
  }
  return res.json();
};

const features = [
  { key: 'sensors', title: 'Sensor Management', desc: 'Monitor and manage IoT sensors across your facility', icon: FiActivity, path: '/sensors', ai: false },
  { key: 'equipment', title: 'Equipment Registry', desc: 'Track industrial equipment inventory and status', icon: FiTool, path: '/equipment', ai: false },
  { key: 'maintenance', title: 'Maintenance Scheduling', desc: 'Schedule and track equipment maintenance tasks', icon: FiClock, path: '/maintenance', ai: false },
  { key: 'alerts', title: 'Alert Management', desc: 'Monitor and manage system alerts and notifications', icon: FiAlertTriangle, path: '/alerts', ai: false },
  { key: 'reports', title: 'Dashboard & Reports', desc: 'Overview with comprehensive stats and metrics', icon: FiBarChart2, path: '/dashboard', ai: false },
  { key: 'anomalies', title: 'Anomaly Detection', desc: 'AI analyzes sensor data to detect anomalies', icon: FiSearch, path: '/anomalies', ai: true },
  { key: 'predictive', title: 'Predictive Maintenance', desc: 'AI predicts equipment failures before they occur', icon: FiCpu, path: '/predictive', ai: true },
  { key: 'rootcause', title: 'Root Cause Analysis', desc: 'AI correlates data to identify root causes', icon: FiTarget, path: '/rootcause', ai: true },
  { key: 'health', title: 'Equipment Health Scoring', desc: 'AI generates health scores for equipment', icon: FiHeart, path: '/health', ai: true },
  { key: 'energy', title: 'Energy Optimization', desc: 'AI recommends energy savings opportunities', icon: FiZap, path: '/energy', ai: true },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await apiCall('/dashboard/stats');
      setStats(data);
    } catch (err) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const getStatValue = (key) => {
    if (!stats) return '...';
    // Handle different response structures
    if (stats[key] !== undefined) return stats[key];
    if (stats.data && stats.data[key] !== undefined) return stats.data[key];
    return '...';
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>AI-Powered Industrial IoT Monitoring Overview</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon cyan"><FiActivity /></div>
          <div className="stat-info">
            <h3>{getStatValue('totalSensors') ?? getStatValue('sensors') ?? '0'}</h3>
            <p>Total Sensors</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FiTool /></div>
          <div className="stat-info">
            <h3>{getStatValue('totalEquipment') ?? getStatValue('equipment') ?? '0'}</h3>
            <p>Equipment</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><FiAlertTriangle /></div>
          <div className="stat-info">
            <h3>{getStatValue('activeAlerts') ?? getStatValue('alerts') ?? '0'}</h3>
            <p>Active Alerts</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><FiSearch /></div>
          <div className="stat-info">
            <h3>{getStatValue('anomalies') ?? getStatValue('totalAnomalies') ?? '0'}</h3>
            <p>Anomalies</p>
          </div>
        </div>
      </div>

      <div className="cards-grid">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.key} className="feature-card" onClick={() => navigate(f.path)}>
              <div className="card-header">
                <Icon className="card-icon" />
                {f.ai && <span className="card-badge">AI</span>}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
