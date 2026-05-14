import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiCpu, FiActivity, FiTool, FiAlertTriangle, FiBarChart2, FiSearch, FiClock, FiTarget, FiHeart, FiZap, FiLogOut, FiMenu, FiX, FiGrid } from 'react-icons/fi';

export default function Navbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <FiX /> : <FiMenu />}
      </button>

      <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <FiCpu className="brand-icon" />
          <div>
            <h2>IoT Detector</h2>
            <span>Anomaly Detection Platform</span>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section-label">Overview</div>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <FiGrid className="nav-icon" />
            Dashboard
          </NavLink>

          <div className="nav-section-label">Operations</div>
          <NavLink to="/sensors" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <FiActivity className="nav-icon" />
            Sensors
          </NavLink>
          <NavLink to="/equipment" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <FiTool className="nav-icon" />
            Equipment
          </NavLink>
          <NavLink to="/maintenance" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <FiClock className="nav-icon" />
            Maintenance
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <FiAlertTriangle className="nav-icon" />
            Alerts
          </NavLink>

          <div className="nav-section-label">AI Features</div>
          <NavLink to="/anomalies" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <FiSearch className="nav-icon" />
            Anomaly Detection
            <span className="ai-badge">AI</span>
          </NavLink>
          <NavLink to="/predictive" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <FiBarChart2 className="nav-icon" />
            Predictive Maint.
            <span className="ai-badge">AI</span>
          </NavLink>
          <NavLink to="/rootcause" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <FiTarget className="nav-icon" />
            Root Cause
            <span className="ai-badge">AI</span>
          </NavLink>
          <NavLink to="/health" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <FiHeart className="nav-icon" />
            Health Scores
            <span className="ai-badge">AI</span>
          </NavLink>
          <NavLink to="/energy" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <FiZap className="nav-icon" />
            Energy Optimization
            <span className="ai-badge">AI</span>
          </NavLink>
          <NavLink to="/advanced-ai" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <FiCpu className="nav-icon" />
            Advanced AI
            <span className="ai-badge">AI</span>
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut />
            Logout
          </button>
        </div>
      
        {/* // === Batch 04 Gaps & Frontend Mounts === */}
        <div style={{ borderTop: '1px solid #eee', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
        <a href="/cf-agentic-maintenance-coordinator-predicti" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Agentic maintenance coordinator predicti</a>
        <a href="/cf-federated-anomaly-detection-trained-on-a" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Federated anomaly detection trained on a</a>
        <a href="/cf-vibration-acoustic-monitoring-for-early-" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Vibration + acoustic monitoring for earl</a>
        <a href="/cf-supply-chain-disruption-prediction-corre" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Supply-chain disruption prediction corre</a>
        <a href="/cf-energy-efficiency-optimizer-recommending" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Energy efficiency optimizer recommending</a>
        <a href="/cf-cross-equipment-correlation-extending-co" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Cross-equipment correlation extending co</a>
        <a href="/gap-no-detect-anomaly-endpoint-with-ml" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No /detect-anomaly endpoint with ML mode</a>
        <a href="/gap-no-predict-failure-endpoint" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No predict-failure endpoint</a>
        <a href="/gap-no-root-cause-ai-synthesis" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No root-cause AI synthesis</a>
        <a href="/gap-no-energy-optimization-ai" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No energy-optimization AI</a>
        <a href="/gap-no-equipment-health-score-ai" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No equipment health-score AI</a>
        <a href="/gap-no-maintenance-recommendation-ai" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No maintenance-recommendation AI</a>
        <a href="/gap-no-mqtt-broker-only-http-ingestion" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No MQTT broker (only HTTP ingestion)</a>
        <a href="/gap-no-real-plcscada-integration-only-integr" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No real PLC/SCADA integration (only inte</a>
        <a href="/gap-no-technician-dispatch-mobile-workflow" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No technician dispatch / mobile workflow</a>
        <a href="/gap-no-sla-tracking" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No SLA tracking</a>
        <a href="/gap-no-webhook-surface" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No webhook surface</a>
        <a href="/gap-no-notifications-module-0-references" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No notifications module (0 references)</a>
        <a href="/gap-no-websocket-real-time-telemetry-stream" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No WebSocket real-time telemetry stream</a>
        </div>
</nav>
    </>
  );
}
