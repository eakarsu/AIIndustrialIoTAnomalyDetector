/*
 * routes/timeseries.js — Apply pass 5
 *
 * Mechanical (no-LLM) z-score anomaly screen for sensor time-series.
 * Complements the existing LLM-driven `/api/anomalies/:id/analyze` endpoint
 * by giving callers a deterministic baseline that works even when
 * `OPENROUTER_API_KEY` is not set. Audit (batch_04 §30) flagged anomaly
 * detection as the headline missing capability — pass 2-4 covered the LLM
 * version, this pass adds the always-on statistical fallback.
 *
 * POST /api/timeseries/anomaly-screen
 *   body: { values: number[], window?: number, threshold?: number }
 *   returns deterministic z-score anomalies + summary stats.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}
function stddev(arr, mu) {
  if (arr.length < 2) return 0;
  const v = arr.reduce((s, x) => s + (x - mu) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}

router.post('/anomaly-screen', auth, (req, res) => {
  const { values, window, threshold } = req.body || {};
  if (!Array.isArray(values) || values.length === 0) {
    return res.status(400).json({ error: 'values[] is required' });
  }
  const w = Math.max(5, Math.min(500, parseInt(window, 10) || 30));
  const thr = Math.max(1, Math.min(6, Number(threshold) || 3));

  const numeric = values.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  if (numeric.length < w) {
    return res.status(400).json({
      error: 'insufficient_data',
      need: w,
      got: numeric.length,
    });
  }

  const anomalies = [];
  for (let i = w; i < numeric.length; i += 1) {
    const slice = numeric.slice(i - w, i);
    const mu = mean(slice);
    const sd = stddev(slice, mu);
    if (sd === 0) continue;
    const z = (numeric[i] - mu) / sd;
    if (Math.abs(z) >= thr) {
      anomalies.push({
        index: i,
        value: numeric[i],
        rolling_mean: Math.round(mu * 1000) / 1000,
        rolling_stddev: Math.round(sd * 1000) / 1000,
        z_score: Math.round(z * 1000) / 1000,
        direction: z > 0 ? 'spike' : 'drop',
      });
    }
  }

  const overallMu = mean(numeric);
  res.json({
    n: numeric.length,
    window: w,
    threshold: thr,
    summary: {
      mean: Math.round(overallMu * 1000) / 1000,
      stddev: Math.round(stddev(numeric, overallMu) * 1000) / 1000,
      min: Math.min(...numeric),
      max: Math.max(...numeric),
    },
    anomalies,
    method: 'rolling_zscore',
    note: 'Deterministic statistical fallback. For domain-aware analysis use POST /api/anomalies/:id/analyze.',
    generated_at: new Date().toISOString(),
  });
});

module.exports = router;
