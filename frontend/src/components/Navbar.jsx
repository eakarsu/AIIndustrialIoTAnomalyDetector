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
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut />
            Logout
          </button>
        </div>
      </nav>
    </>
  );
}
