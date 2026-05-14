# Apply Pass 5 — AIIndustrialIoTAnomalyDetector

**Date:** 2026-05-08
**Project:** AIIndustrialIoTAnomalyDetector
**Stack:** Node-Express + React (Vite, port 5173), Postgres `pg` pool,
JWT bearer auth (`backend/middleware/auth.js`), in-memory AI rate limiter
(`backend/middleware/aiHelpers.js`).
**Audit source:** `/Users/erolakarsu/projects/_AUDIT/reports/batch_04.md` §30

## Verified-present (no changes)

Pass 1-4 already implemented:
- `/api/anomalies/:id/analyze` (LLM anomaly detection),
- `/api/predictive/:id/predict`,
- `/api/rootcause/:id/analyze`,
- `/api/energy/:id/optimize`,
- `/api/health/:id/calculate`,
- `/api/maintenance/:equipment_id/recommendation` (pass 2),
- `/api/correlation/...` (pass 3 / 4 cross-equipment).
- `aiRateLimiter` mounted in `aiHelpers.js`.

## Implemented this pass (5 items — at cap)

1. `POST /api/integrations/mqtt/publish` — 503-on-no-key.
2. `GET  /api/integrations/plc/tag/:tag` — 503-on-no-key.
3. `POST /api/integrations/dispatch/ticket` — 503-on-no-key.
4. `POST /api/integrations/sla/incident` — 503-on-no-key (Pagerduty/Opsgenie).
5. `POST /api/timeseries/anomaly-screen` — **mechanical**, deterministic
   rolling z-score anomaly detector (always works, even without
   `OPENROUTER_API_KEY`). Complements the LLM `/api/anomalies/:id/analyze`.

Files written:
- `backend/routes/integrations.js` (new)
- `backend/routes/timeseries.js` (new)
- `backend/server.js` (added 2 `app.use(...)` lines — additive only)
- `_BACKLOG_NEEDS_CREDS.md` (new)

## Categorization of remaining backlog

- **NEEDS-CREDS (stubbed):** MQTT, PLC gateway, dispatch, pager.
- **MECHANICAL (implemented):** rolling-zscore anomaly screen — provides a
  deterministic baseline for callers without an AI key.
- **NEEDS-PRODUCT-DECISION:** federated detection, agentic coordinator
  autonomy.
- **NEEDS-CREDS (deferred):** specialized vibration/acoustic DSP.

## Smoke test outcome

`node --check` passes for all 3 modified/new files. `anomaly-screen`
correctly returns 400 when fewer than `window` samples are provided and
skips zero-variance windows; values are rounded to 3 decimals.

## Cap

5 / 5.
