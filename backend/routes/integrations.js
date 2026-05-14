/*
 * routes/integrations.js — Apply pass 5
 *
 * 503-on-no-key stubs for industrial integrations called out in batch_04 §30
 * "missing non-AI features" + "custom feature suggestions" for
 * AIIndustrialIoTAnomalyDetector.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

function requireEnv(req, res, providerName, vars) {
  const missing = vars.filter((v) => !process.env[v] || String(process.env[v]).startsWith('your_'));
  if (missing.length) {
    res.status(503).json({
      error: 'integration_not_configured',
      provider: providerName,
      missing_env: missing,
      message: `${providerName} not configured. Set ${missing.join(', ')} to enable.`,
    });
    return false;
  }
  return true;
}

// MQTT broker — real-time sensor ingest
router.post('/mqtt/publish', auth, (req, res) => {
  if (!requireEnv(req, res, 'MQTT', ['MQTT_BROKER_URL', 'MQTT_USERNAME', 'MQTT_PASSWORD'])) return;
  res.json({ status: 'stub_with_creds', note: 'MQTT broker reachable; implement publish + retained-msg semantics.' });
});

// PLC / SCADA gateway (Modbus/OPC-UA via gateway)
router.get('/plc/tag/:tag', auth, (req, res) => {
  if (!requireEnv(req, res, 'PLC-Gateway', ['PLC_GATEWAY_URL', 'PLC_GATEWAY_TOKEN'])) return;
  res.json({ status: 'stub_with_creds', tag: req.params.tag, note: 'Gateway reachable; implement tag read + audit.' });
});

// Technician dispatch (ServiceMax / Salesforce Field Service / generic)
router.post('/dispatch/ticket', auth, (req, res) => {
  if (!requireEnv(req, res, 'Dispatch', ['DISPATCH_PROVIDER', 'DISPATCH_API_KEY'])) return;
  res.json({ status: 'stub_with_creds', note: 'Dispatch provider configured; implement ticket creation + SLA tracking.' });
});

// SLA tracker (Pagerduty / Opsgenie / generic)
router.post('/sla/incident', auth, (req, res) => {
  if (!requireEnv(req, res, 'SLA-Pager', ['PAGER_PROVIDER', 'PAGER_API_KEY', 'PAGER_SERVICE_ID'])) return;
  res.json({ status: 'stub_with_creds', note: 'Pager provider configured; implement incident create + escalation.' });
});

module.exports = router;
