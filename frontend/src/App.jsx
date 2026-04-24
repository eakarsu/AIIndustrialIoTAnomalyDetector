import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sensors from './pages/Sensors';
import Equipment from './pages/Equipment';
import Maintenance from './pages/Maintenance';
import Alerts from './pages/Alerts';
import Anomalies from './pages/Anomalies';
import Predictive from './pages/Predictive';
import RootCause from './pages/RootCause';
import HealthScore from './pages/HealthScore';
import Energy from './pages/Energy';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isLogin = location.pathname === '/';

  if (isLogin) {
    return (
      <Routes>
        <Route path="/" element={<Login />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sensors" element={<ProtectedRoute><Sensors /></ProtectedRoute>} />
        <Route path="/equipment" element={<ProtectedRoute><Equipment /></ProtectedRoute>} />
        <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/anomalies" element={<ProtectedRoute><Anomalies /></ProtectedRoute>} />
        <Route path="/predictive" element={<ProtectedRoute><Predictive /></ProtectedRoute>} />
        <Route path="/rootcause" element={<ProtectedRoute><RootCause /></ProtectedRoute>} />
        <Route path="/health" element={<ProtectedRoute><HealthScore /></ProtectedRoute>} />
        <Route path="/energy" element={<ProtectedRoute><Energy /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}
