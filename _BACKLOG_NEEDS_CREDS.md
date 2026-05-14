# Backlog: Needs Credentials — AIIndustrialIoTAnomalyDetector

Apply pass 5 stubs.

## MQTT broker
- **Endpoint:** `POST /api/integrations/mqtt/publish`
- **Env:** `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`
- **Wire-up TODO:** Connect via `mqtt.js` (already eligible for reuse if
  added to deps); publish + retained-msg semantics; topic ACL.

## PLC / SCADA gateway (Modbus / OPC-UA)
- **Endpoint:** `GET /api/integrations/plc/tag/:tag`
- **Env:** `PLC_GATEWAY_URL`, `PLC_GATEWAY_TOKEN`
- **Wire-up TODO:** Tag read via gateway; cache rules; audit per tag.

## Technician dispatch
- **Endpoint:** `POST /api/integrations/dispatch/ticket`
- **Env:** `DISPATCH_PROVIDER`, `DISPATCH_API_KEY`
- **Wire-up TODO:** Map anomaly severity → ticket priority; SLA timer;
  webhook for status updates.

## Pager / SLA tracker
- **Endpoint:** `POST /api/integrations/sla/incident`
- **Env:** `PAGER_PROVIDER`, `PAGER_API_KEY`, `PAGER_SERVICE_ID`
- **Wire-up TODO:** Incident create + escalation policy; auto-resolve when
  anomaly closes.

## Backlog NOT mechanical (deferred)

- **Federated anomaly detection** — NEEDS-PRODUCT-DECISION + NEEDS-INFRA
  (federation server, model coordination).
- **Vibration/acoustic specialized detection** — NEEDS-CREDS for FFT-DSP
  library licensing or specialized provider.
- **Agentic maintenance coordinator** — NEEDS-PRODUCT-DECISION on autonomy
  bounds (auto-create tickets vs. suggest only).
