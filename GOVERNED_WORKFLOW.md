# Governed industrial IoT workflow

`/api/governed-iot` provisions device identities by non-secret credential fingerprint, enforces schema/unit/sequence validation on telemetry, records gaps for offline replay analysis, creates deterministic z-score advisories, and routes anomalies through operator and maintenance approval to verified outcomes. Telemetry is idempotent and ordered per tenant/device. Recommendations are advisory: no endpoint sends commands to PLCs, actuators, or equipment.

Device registry/PKI, gateways/brokers, time-series storage, CMMS, edge deployment, and alerting are not bundled. `IOT_PROVIDER_ALLOWLIST` gates only status records for separately approved adapters. Empty configuration fails closed. Raw credentials are never persisted by this workflow.

Apply `backend/migrations/` in numeric order, then assign tenant IDs through an authorized identity-admin process. Install locked dependencies with `npm ci`, create an untracked `.env`, migrate, then run `./start.sh`. Startup performs no installation, seeding, database creation, migration, port killing, device provisioning, or control action. Destructive demo seed is opt-in outside production only.

No device certificates, broker, industrial network, hardware, safety case, model-precision study, drift study, latency benchmark, edge test, or fleet-load validation is supplied or claimed. Network segmentation and operator acceptance remain launch blockers.
