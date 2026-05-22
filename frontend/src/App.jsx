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
import AdvancedAITools from './pages/AdvancedAITools';
import CustomViewsPage from './pages/CustomViewsPage';
import SensorCalibrationDrift from './pages/SensorCalibrationDrift';

// === Batch 04 Gaps & Frontend Mounts ===
import CfAgenticMaintenanceCoordinatorPredicti from './pages/CfAgenticMaintenanceCoordinatorPredicti';
import CfFederatedAnomalyDetectionTrainedOnA from './pages/CfFederatedAnomalyDetectionTrainedOnA';
import CfVibrationAcousticMonitoringForEarly from './pages/CfVibrationAcousticMonitoringForEarly';
import CfSupplyChainDisruptionPredictionCorre from './pages/CfSupplyChainDisruptionPredictionCorre';
import CfEnergyEfficiencyOptimizerRecommending from './pages/CfEnergyEfficiencyOptimizerRecommending';
import CfCrossEquipmentCorrelationExtendingCo from './pages/CfCrossEquipmentCorrelationExtendingCo';
import GapNoDetectAnomalyEndpointWithMl from './pages/GapNoDetectAnomalyEndpointWithMl';
import GapNoPredictFailureEndpoint from './pages/GapNoPredictFailureEndpoint';
import GapNoRootCauseAiSynthesis from './pages/GapNoRootCauseAiSynthesis';
import GapNoEnergyOptimizationAi from './pages/GapNoEnergyOptimizationAi';
import GapNoEquipmentHealthScoreAi from './pages/GapNoEquipmentHealthScoreAi';
import GapNoMaintenanceRecommendationAi from './pages/GapNoMaintenanceRecommendationAi';
import GapNoMqttBrokerOnlyHttpIngestion from './pages/GapNoMqttBrokerOnlyHttpIngestion';
import GapNoRealPlcscadaIntegrationOnlyIntegr from './pages/GapNoRealPlcscadaIntegrationOnlyIntegr';
import GapNoTechnicianDispatchMobileWorkflow from './pages/GapNoTechnicianDispatchMobileWorkflow';
import GapNoSlaTracking from './pages/GapNoSlaTracking';
import GapNoWebhookSurface from './pages/GapNoWebhookSurface';
import GapNoNotificationsModule0References from './pages/GapNoNotificationsModule0References';
import GapNoWebsocketRealTimeTelemetryStream from './pages/GapNoWebsocketRealTimeTelemetryStream';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

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
        <Route path="/codex/custom-viz" element={<ProtectedRoute><CodexCustomVizFeature /></ProtectedRoute>} />
        <Route path="/codex/operations" element={<ProtectedRoute><CodexOperationsFeature /></ProtectedRoute>} />

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
        <Route path="/advanced-ai" element={<ProtectedRoute><AdvancedAITools /></ProtectedRoute>} />
        <Route path="/custom-views" element={<ProtectedRoute><CustomViewsPage /></ProtectedRoute>} />
        <Route path="/sensor-calibration-drift" element={<ProtectedRoute><SensorCalibrationDrift /></ProtectedRoute>} />
          {/* // === Batch 04 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-maintenance-coordinator-predicti" element={<CfAgenticMaintenanceCoordinatorPredicti />} />
          <Route path="/cf-federated-anomaly-detection-trained-on-a" element={<CfFederatedAnomalyDetectionTrainedOnA />} />
          <Route path="/cf-vibration-acoustic-monitoring-for-early-" element={<CfVibrationAcousticMonitoringForEarly />} />
          <Route path="/cf-supply-chain-disruption-prediction-corre" element={<CfSupplyChainDisruptionPredictionCorre />} />
          <Route path="/cf-energy-efficiency-optimizer-recommending" element={<CfEnergyEfficiencyOptimizerRecommending />} />
          <Route path="/cf-cross-equipment-correlation-extending-co" element={<CfCrossEquipmentCorrelationExtendingCo />} />
          <Route path="/gap-no-detect-anomaly-endpoint-with-ml" element={<GapNoDetectAnomalyEndpointWithMl />} />
          <Route path="/gap-no-predict-failure-endpoint" element={<GapNoPredictFailureEndpoint />} />
          <Route path="/gap-no-root-cause-ai-synthesis" element={<GapNoRootCauseAiSynthesis />} />
          <Route path="/gap-no-energy-optimization-ai" element={<GapNoEnergyOptimizationAi />} />
          <Route path="/gap-no-equipment-health-score-ai" element={<GapNoEquipmentHealthScoreAi />} />
          <Route path="/gap-no-maintenance-recommendation-ai" element={<GapNoMaintenanceRecommendationAi />} />
          <Route path="/gap-no-mqtt-broker-only-http-ingestion" element={<GapNoMqttBrokerOnlyHttpIngestion />} />
          <Route path="/gap-no-real-plcscada-integration-only-integr" element={<GapNoRealPlcscadaIntegrationOnlyIntegr />} />
          <Route path="/gap-no-technician-dispatch-mobile-workflow" element={<GapNoTechnicianDispatchMobileWorkflow />} />
          <Route path="/gap-no-sla-tracking" element={<GapNoSlaTracking />} />
          <Route path="/gap-no-webhook-surface" element={<GapNoWebhookSurface />} />
          <Route path="/gap-no-notifications-module-0-references" element={<GapNoNotificationsModule0References />} />
          <Route path="/gap-no-websocket-real-time-telemetry-stream" element={<GapNoWebsocketRealTimeTelemetryStream />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}
