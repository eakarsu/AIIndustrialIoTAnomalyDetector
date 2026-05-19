# Audit Apply Notes — AIIndustrialIoTAnomalyDetector

## Source
`/Users/erolakarsu/projects/_AUDIT/reports/batch_04.md` section 30.

## Audit vs. Reality
Audit reported "0 AI endpoints"; in fact most "missing" endpoints already exist as per-resource AI sub-routes:
- `POST /api/anomalies/:id/analyze` — detect-anomaly equivalent (also auto-creates alerts on high/critical risk)
- `POST /api/predictive/:id/predict` — predict-failure
- `POST /api/rootcause/:id/analyze` — root-cause-analysis
- `POST /api/energy/:id/optimize` — energy-optimization
- `POST /api/health/:id/calculate` — equipment-health-score

The genuine gap was a maintenance recommendation endpoint informed by anomalies + sensors + prior schedules.

## Original Recommendations (AI Counterparts)
- `/detect-anomaly` — already exists
- `/predict-failure` — already exists
- `/root-cause-analysis` — already exists
- `/energy-optimization` — already exists
- `/equipment-health-score` — already exists
- `/maintenance-recommendation` — MISSING (added)

## Implemented (this pass)
- `POST /api/maintenance/:equipment_id/recommendation` — pulls equipment record, last 20 anomalies, sensor list, last 10 maintenance schedules; calls OpenRouter via existing `axios` + `callWithRetry` pattern; returns structured JSON (urgency, recommended action, tasks, parts, downtime estimate, risk if deferred, confidence). Uses existing `aiRateLimiter`.

Syntax: `node --check` passes.

## Backlog
- Custom: agentic maintenance coordinator (auto-ticketing + dispatch), federated anomaly detection, vibration/acoustic specialized anomaly detection, supply chain disruption prediction, energy efficiency optimizer (existing `/energy/:id/optimize` could be extended), cross-equipment correlation analysis.
- Non-AI: real-time streaming ingestion, MQTT/PLC/SCADA support, technician dispatch, SLA tracking.

## Categorization
- MECHANICAL: 1 endpoint (done — exhausts the audit's missing list given existing endpoints).
- TOO-RISKY mechanically: auto-ticketing/auto-dispatch without explicit policy.
- NEEDS-CREDS: PLC/SCADA/MQTT integrations.
- NEEDS-PRODUCT-DECISION: federated learning architecture, alert escalation policy.

## Apply pass 3 (frontend)

LEFT-AS-IS. `frontend/src/pages/AdvancedAITools.jsx` already calls `POST /api/maintenance/:equipment_id/recommendation` with JWT Bearer from localStorage and is registered at `/advanced-ai` in `App.jsx`. Server 503-no-key responses are caught and shown inline + toast. No FE files modified.
