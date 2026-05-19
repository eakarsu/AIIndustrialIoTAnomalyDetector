// Vibration + acoustic monitoring for early bearing/motor failure detection.
// Audit: batch_04.md / AIIndustrialIoTAnomalyDetector / Custom Feature Suggestions #3
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
      'X-Title': 'Industrial IoT - Vibration/Acoustic AI'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2, max_tokens: 2500
    })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || 'AI failed');
  return d.choices[0].message.content;
}

function parseJSON(t) { try { const m = t.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (_) {} return { notes: t }; }

// POST /api/vibration-acoustic-ai/diagnose
// Body: { equipment_id, fft_bands?, rms_g?, peak_hz?, audio_signature?, runtime_hours? }
router.post('/diagnose', async (req, res) => {
  try {
    const {
      equipment_id, fft_bands = [], rms_g, peak_hz,
      audio_signature, runtime_hours
    } = req.body || {};
    if (!equipment_id) return res.status(400).json({ error: 'equipment_id required' });

    let equipment = null;
    try {
      const r = await pool.query(`SELECT * FROM equipment WHERE id = $1`, [equipment_id]);
      equipment = r.rows[0] || null;
    } catch (_) {}

    const systemPrompt = `You are a rotating-equipment vibration + acoustic analyst. Given FFT bands, RMS,
peak frequency, audio signature descriptor, and runtime hours, diagnose likely failure modes (bearing inner
race, outer race, cage, ball, imbalance, misalignment, looseness, gear-mesh, cavitation) and provide
remaining-useful-life (RUL) estimate. Return STRICT JSON only.`;

    const userPrompt = `Equipment: ${JSON.stringify(equipment)}
Runtime hours: ${runtime_hours || 'unspecified'}
RMS g: ${rms_g}; Peak Hz: ${peak_hz}
FFT bands (frequency_Hz, amplitude_g): ${JSON.stringify(fft_bands.slice(0, 50))}
Audio signature descriptor: ${audio_signature || 'none'}

Return JSON:
{
  "summary": "...",
  "likely_failure_modes": [
    { "mode": "string", "probability_pct": 0, "evidence": "string" }
  ],
  "remaining_useful_life_estimate": { "days_low": 0, "days_high": 0, "confidence": "low|medium|high" },
  "recommended_actions": ["..."],
  "iso_10816_severity_band": "A|B|C|D",
  "next_inspection_window_days": 0,
  "disclaimer": "AI-assisted diagnosis; reliability engineer review required before maintenance action."
}`;

    const raw = await callAI(systemPrompt, userPrompt);
    res.json({ equipment_id, diagnosis: parseJSON(raw) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/equipment', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT id, name, type FROM equipment LIMIT 100`)
      .catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
