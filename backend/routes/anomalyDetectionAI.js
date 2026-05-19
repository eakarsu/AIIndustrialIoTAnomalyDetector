// Agentic maintenance coordinator predicting failures and auto-generating
// tickets, plus AI-driven anomaly detection.
// Audit: batch_04.md / AIIndustrialIoTAnomalyDetector / Custom Feature Suggestions #1
const express = require('express');
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const pool = require('../db');

const router = express.Router();
router.use(auth);

async function callAI(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'Industrial IoT - Anomaly AI'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2, max_tokens: 3000
    })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || 'AI failed');
  return d.choices[0].message.content;
}

function parseJSON(t) { try { const m = t.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (_) {} return { notes: t }; }

// POST /api/anomaly-ai/detect { equipment_id?, lookback_hours? }
router.post('/detect', async (req, res) => {
  try {
    const { equipment_id, lookback_hours = 24 } = req.body || {};

    let ts = { rows: [] }, equipment = null, alerts = { rows: [] };
    try {
      ts = await pool.query(
        `SELECT sensor_id, metric, value, recorded_at FROM timeseries
         WHERE recorded_at > NOW() - ($1 || ' hours')::interval
           ${equipment_id ? 'AND equipment_id = $2' : ''}
         ORDER BY recorded_at DESC LIMIT 300`,
        equipment_id ? [String(lookback_hours), equipment_id] : [String(lookback_hours)]
      );
    } catch (_) {}
    if (equipment_id) {
      try {
        const r = await pool.query(`SELECT * FROM equipment WHERE id = $1`, [equipment_id]);
        equipment = r.rows[0] || null;
      } catch (_) {}
    }
    try {
      alerts = await pool.query(
        `SELECT id, severity, message, created_at FROM alerts ORDER BY created_at DESC LIMIT 30`
      );
    } catch (_) {}

    const systemPrompt = `You are an industrial IoT anomaly-detection AI. Given recent telemetry, flag
anomalies (outliers, drift, dead sensors), correlate with equipment context, and recommend tickets. Return
STRICT JSON only.`;

    const userPrompt = `Equipment: ${JSON.stringify(equipment)}
Lookback hours: ${lookback_hours}
Timeseries sample: ${JSON.stringify(ts.rows.slice(0, 80))}
Recent alerts: ${JSON.stringify(alerts.rows.slice(0, 15))}

Return JSON:
{
  "summary": "...",
  "anomalies": [
    { "sensor_id": "string", "metric": "string", "type": "spike|drift|stuck|dropout|out_of_band", "severity": "low|medium|high|critical", "evidence": "string", "auto_ticket": { "title": "string", "priority": "string", "actions": ["..."] } }
  ],
  "failure_predictions": [{ "equipment_id": 0, "predicted_window_days": 0, "failure_mode": "string", "confidence_pct": 0 }],
  "next_check_minutes": 0,
  "disclaimer": "AI assistance; engineer triage recommended for high/critical."
}`;

    const raw = await callAI(systemPrompt, userPrompt);
    const parsed = parseJSON(raw);

    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS anomaly_ai_runs (
        id SERIAL PRIMARY KEY, user_id INTEGER, equipment_id INTEGER,
        payload JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      await pool.query(
        `INSERT INTO anomaly_ai_runs (user_id, equipment_id, payload) VALUES ($1,$2,$3)`,
        [req.user.id, equipment_id || null, JSON.stringify(parsed)]
      );
    } catch (_) {}

    res.json({ equipment_id: equipment_id || null, lookback_hours, detection: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, equipment_id, payload, created_at FROM anomaly_ai_runs ORDER BY created_at DESC LIMIT 30`
    ).catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
