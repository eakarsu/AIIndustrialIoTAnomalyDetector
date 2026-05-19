const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');
const { aiRateLimiter, callWithRetry } = require('../middleware/aiHelpers');

function _missingKey() {
  const k = process.env.OPENROUTER_API_KEY;
  return !k || !k.trim() || k === 'your-openrouter-api-key';
}

function _model() {
  return process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
}

function _baseUrl() {
  return (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
}

async function _callLLM(prompt) {
  if (_missingKey()) {
    const err = new Error('OpenRouter API key not configured (set OPENROUTER_API_KEY)');
    err.statusCode = 503;
    throw err;
  }
  const resp = await callWithRetry(() =>
    axios.post(_baseUrl() + '/chat/completions', {
      model: _model(),
      messages: [{ role: 'user', content: prompt }],
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
  );
  const raw = resp.data.choices[0].message.content;
  let structured = null;
  try {
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    structured = JSON.parse(m ? m[1].trim() : raw.trim());
  } catch (_) { structured = null; }
  return { structured, raw };
}

// POST /api/correlation/equipment/:equipment_id — cross-equipment correlation analysis
router.post('/equipment/:equipment_id', auth, aiRateLimiter, async (req, res) => {
  try {
    const { equipment_id } = req.params;

    const equipResult = await pool.query('SELECT * FROM equipment WHERE id = $1', [equipment_id]);
    if (equipResult.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });
    const focal = equipResult.rows[0];

    const focalAnomalies = await pool.query(
      `SELECT type, severity, description, detected_at, status FROM anomalies
       WHERE equipment_id = $1 ORDER BY detected_at DESC LIMIT 30`,
      [equipment_id]
    ).catch(() => ({ rows: [] }));

    const fleetAnomalies = await pool.query(
      `SELECT a.equipment_id, e.name AS equipment_name, e.type AS equipment_type,
              a.type, a.severity, a.detected_at, a.description
       FROM anomalies a
       LEFT JOIN equipment e ON a.equipment_id = e.id
       WHERE a.equipment_id <> $1
       ORDER BY a.detected_at DESC LIMIT 60`,
      [equipment_id]
    ).catch(() => ({ rows: [] }));

    const prompt = `You are an industrial reliability engineer. Identify cross-equipment correlation patterns between a focal asset and the rest of the fleet.

Focal equipment:
- id=${focal.id} name=${focal.name} type=${focal.type} location=${focal.location || 'n/a'} status=${focal.status}

Focal anomalies (${focalAnomalies.rows.length}):
${focalAnomalies.rows.map(a => `- ${a.detected_at}: ${a.severity} ${a.type} (${a.status}) - ${a.description || ''}`).join('\n') || 'none'}

Fleet anomalies (${fleetAnomalies.rows.length}):
${fleetAnomalies.rows.map(a => `- ${a.detected_at}: eq#${a.equipment_id} (${a.equipment_name || ''}/${a.equipment_type || ''}) ${a.severity} ${a.type} - ${a.description || ''}`).join('\n') || 'none'}

Return JSON:
{
  "focal_equipment_id": ${focal.id},
  "correlation_pairs": [{ "other_equipment_id": number, "other_equipment_name": string, "pattern": string, "co_occurrence_strength_0_100": number, "lead_or_lag": "leads|lags|simultaneous", "estimated_lag_minutes": number, "candidate_root_cause": string }],
  "shared_failure_modes": [{ "mode": string, "evidence": string, "affected_equipment_ids": number[] }],
  "process_chain_implications": string,
  "recommended_investigations": [{ "action": string, "priority": "low|medium|high", "rationale": string }],
  "confidence_0_100": number
}`;

    const { structured, raw } = await _callLLM(prompt);
    res.json({ equipment_id: focal.id, structured, raw });
  } catch (err) {
    console.error('cross-correlation error:', err.message);
    res.status(err.statusCode || 500).json({ error: 'Cross-correlation failed: ' + (err.response?.data?.error?.message || err.message) });
  }
});

// POST /api/correlation/supply-chain-disruption — supply-chain disruption prediction
// Body: { parts: [{ name, vendor?, lead_time_days?, sole_source? }], horizon_days?, region?, signals?: [string] }
router.post('/supply-chain-disruption', auth, aiRateLimiter, async (req, res) => {
  try {
    const { parts, horizon_days, region, signals } = req.body || {};
    if (!Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: 'parts must be a non-empty array' });
    }

    // Pull active maintenance / open anomalies as fleet pressure signals
    const openAnomalies = await pool.query(
      `SELECT type, severity, detected_at, equipment_id FROM anomalies
       WHERE status = 'open' OR status = 'investigating'
       ORDER BY detected_at DESC LIMIT 30`
    ).catch(() => ({ rows: [] }));

    const upcomingMaint = await pool.query(
      `SELECT scheduled_date, type, equipment_id FROM maintenance_schedules
       WHERE status = 'scheduled' ORDER BY scheduled_date ASC LIMIT 20`
    ).catch(() => ({ rows: [] }));

    const partsText = parts.map((p, i) => `${i + 1}. ${p.name || 'unnamed'} | vendor=${p.vendor || 'n/a'} | lead_time_days=${p.lead_time_days ?? 'n/a'} | sole_source=${p.sole_source ? 'yes' : 'no'}`).join('\n');
    const signalText = Array.isArray(signals) && signals.length ? signals.map(s => `- ${s}`).join('\n') : '(none)';

    const prompt = `You are an industrial supply-chain risk analyst. Predict disruption risks for the parts feeding this equipment fleet over the next ${Number(horizon_days) || 90} days${region ? ` in region: ${region}` : ''}.

Parts:
${partsText}

Externally observed signals:
${signalText}

Open fleet anomalies (${openAnomalies.rows.length}):
${openAnomalies.rows.map(a => `- ${a.detected_at}: eq#${a.equipment_id} ${a.severity} ${a.type}`).join('\n') || 'none'}

Upcoming maintenance (${upcomingMaint.rows.length}):
${upcomingMaint.rows.map(m => `- ${m.scheduled_date}: eq#${m.equipment_id} ${m.type}`).join('\n') || 'none'}

Return JSON:
{
  "horizon_days": ${Number(horizon_days) || 90},
  "overall_risk": "low|moderate|elevated|high|severe",
  "per_part_risk": [{ "part": string, "risk_level": "low|moderate|elevated|high|severe", "probability_disruption_0_1": number, "primary_drivers": string[], "estimated_lead_time_inflation_pct": number }],
  "single_points_of_failure": [{ "part": string, "rationale": string, "mitigation": string }],
  "recommended_actions": [{ "action": string, "priority": "low|medium|high", "owner_function": "ops|procurement|engineering|finance", "expected_impact": string }],
  "watchlist_signals": [{ "signal": string, "where_to_monitor": string, "trigger_threshold": string }],
  "confidence_0_100": number
}`;

    const { structured, raw } = await _callLLM(prompt);
    res.json({ horizon_days: Number(horizon_days) || 90, structured, raw });
  } catch (err) {
    console.error('supply-chain-disruption error:', err.message);
    res.status(err.statusCode || 500).json({ error: 'Supply-chain disruption analysis failed: ' + (err.response?.data?.error?.message || err.message) });
  }
});

module.exports = router;
