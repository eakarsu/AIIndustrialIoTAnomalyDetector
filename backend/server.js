const express = require('express');
const cors = require('cors');
const path = require('path');
// === Batch 04 Gaps & Frontend Mounts ===
const route_gap_no_detect_anomaly_endpoint_with_ml = require('./routes/gap-no-detect-anomaly-endpoint-with-ml');
const route_gap_no_predict_failure_endpoint = require('./routes/gap-no-predict-failure-endpoint');
const route_gap_no_root_cause_ai_synthesis = require('./routes/gap-no-root-cause-ai-synthesis');
const route_gap_no_energy_optimization_ai = require('./routes/gap-no-energy-optimization-ai');
const route_gap_no_equipment_health_score_ai = require('./routes/gap-no-equipment-health-score-ai');
const route_gap_no_maintenance_recommendation_ai = require('./routes/gap-no-maintenance-recommendation-ai');
const route_gap_no_mqtt_broker_only_http_ingestion = require('./routes/gap-no-mqtt-broker-only-http-ingestion');
const route_gap_no_real_plcscada_integration_only_integr = require('./routes/gap-no-real-plcscada-integration-only-integr');
const route_gap_no_technician_dispatch_mobile_workflow = require('./routes/gap-no-technician-dispatch-mobile-workflow');
const route_gap_no_sla_tracking = require('./routes/gap-no-sla-tracking');
const route_gap_no_webhook_surface = require('./routes/gap-no-webhook-surface');
const route_gap_no_notifications_module_0_references = require('./routes/gap-no-notifications-module-0-references');
const route_gap_no_websocket_real_time_telemetry_stream = require('./routes/gap-no-websocket-real-time-telemetry-stream');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/anomalies', require('./routes/anomalies'));
app.use('/api/predictive', require('./routes/predictive'));
app.use('/api/rootcause', require('./routes/rootcause'));
app.use('/api/health', require('./routes/health'));
app.use('/api/energy', require('./routes/energy'));
app.use('/api/correlation', require('./routes/correlation'));
// Apply pass 5 — additive
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/timeseries', require('./routes/timeseries'));
app.use('/api/anomaly-ai', require('./routes/anomalyDetectionAI'));
app.use('/api/vibration-acoustic-ai', require('./routes/vibrationAcousticAI'));

app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


app.use('/api/gap-no-detect-anomaly-endpoint-with-ml', route_gap_no_detect_anomaly_endpoint_with_ml);
app.use('/api/gap-no-predict-failure-endpoint', route_gap_no_predict_failure_endpoint);
app.use('/api/gap-no-root-cause-ai-synthesis', route_gap_no_root_cause_ai_synthesis);
app.use('/api/gap-no-energy-optimization-ai', route_gap_no_energy_optimization_ai);
app.use('/api/gap-no-equipment-health-score-ai', route_gap_no_equipment_health_score_ai);
app.use('/api/gap-no-maintenance-recommendation-ai', route_gap_no_maintenance_recommendation_ai);
app.use('/api/gap-no-mqtt-broker-only-http-ingestion', route_gap_no_mqtt_broker_only_http_ingestion);
app.use('/api/gap-no-real-plcscada-integration-only-integr', route_gap_no_real_plcscada_integration_only_integr);
app.use('/api/gap-no-technician-dispatch-mobile-workflow', route_gap_no_technician_dispatch_mobile_workflow);
app.use('/api/gap-no-sla-tracking', route_gap_no_sla_tracking);
app.use('/api/gap-no-webhook-surface', route_gap_no_webhook_surface);
app.use('/api/gap-no-notifications-module-0-references', route_gap_no_notifications_module_0_references);
app.use('/api/gap-no-websocket-real-time-telemetry-stream', route_gap_no_websocket_real_time_telemetry_stream);

// === Custom Views (Industrial Views) — mounted before any 404 handler ===
app.use('/api/custom-views', require('./routes/customViews'));

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
