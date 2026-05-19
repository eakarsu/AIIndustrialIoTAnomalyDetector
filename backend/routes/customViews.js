// customViews.js — Industrial IoT Anomaly Detection custom views
// 2 VIZ endpoints: timeline of sensor anomalies, machine x sensor heatmap
// 2 NON-VIZ endpoints: PDF anomaly report, CRUD detection rules (thresholds)

const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// -------------------------------------------------------------------------
// In-memory store for detection rules (no schema migration required).
// Each rule: { id, sensor_type, min_threshold, max_threshold, severity, enabled, created_at, updated_at }
// -------------------------------------------------------------------------
let _ruleCounter = 1;
const detectionRules = [
  {
    id: _ruleCounter++,
    sensor_type: 'temperature',
    min_threshold: 10,
    max_threshold: 85,
    severity: 'high',
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: _ruleCounter++,
    sensor_type: 'vibration',
    min_threshold: 0,
    max_threshold: 6.5,
    severity: 'critical',
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: _ruleCounter++,
    sensor_type: 'pressure',
    min_threshold: 1,
    max_threshold: 12,
    severity: 'medium',
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// =========================================================================
// VIZ 1 — GET /timeline
// Returns time-bucketed counts of anomalies per severity for charting.
// =========================================================================
router.get('/timeline', auth, async (req, res) => {
  try {
    const hours = Math.min(720, Math.max(1, parseInt(req.query.hours) || 168));
    const sql = `
      SELECT
        date_trunc('hour', detected_at) AS bucket,
        severity,
        COUNT(*)::int AS count
      FROM anomalies
      WHERE detected_at >= NOW() - ($1 || ' hours')::interval
      GROUP BY bucket, severity
      ORDER BY bucket ASC
    `;
    const result = await pool.query(sql, [hours.toString()]);

    // Pivot into { bucket, low, medium, high, critical, total }
    const map = new Map();
    for (const row of result.rows) {
      const key = row.bucket.toISOString();
      if (!map.has(key)) {
        map.set(key, { bucket: key, low: 0, medium: 0, high: 0, critical: 0, total: 0 });
      }
      const entry = map.get(key);
      const sev = (row.severity || 'low').toLowerCase();
      if (entry[sev] !== undefined) entry[sev] += row.count;
      entry.total += row.count;
    }

    const series = Array.from(map.values());
    const totals = series.reduce(
      (acc, b) => {
        acc.low += b.low; acc.medium += b.medium; acc.high += b.high;
        acc.critical += b.critical; acc.total += b.total;
        return acc;
      },
      { low: 0, medium: 0, high: 0, critical: 0, total: 0 }
    );

    res.json({ hours, series, totals });
  } catch (err) {
    console.error('customViews timeline error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// =========================================================================
// VIZ 2 — GET /heatmap
// Returns machine (equipment) x sensor anomaly intensity grid.
// =========================================================================
router.get('/heatmap', auth, async (req, res) => {
  try {
    const days = Math.min(180, Math.max(1, parseInt(req.query.days) || 30));
    const sql = `
      SELECT
        COALESCE(e.name, 'Unassigned') AS equipment_name,
        COALESCE(s.name, 'Unknown sensor') AS sensor_name,
        COALESCE(s.type, '-') AS sensor_type,
        COUNT(a.id)::int AS anomaly_count,
        SUM(
          CASE a.severity
            WHEN 'critical' THEN 4
            WHEN 'high' THEN 3
            WHEN 'medium' THEN 2
            ELSE 1
          END
        )::int AS intensity
      FROM anomalies a
      LEFT JOIN sensors s ON s.id = a.sensor_id
      LEFT JOIN equipment e ON e.id = a.equipment_id
      WHERE a.detected_at >= NOW() - ($1 || ' days')::interval
      GROUP BY equipment_name, sensor_name, sensor_type
      ORDER BY intensity DESC
      LIMIT 200
    `;
    const result = await pool.query(sql, [days.toString()]);

    const equipmentSet = new Set();
    const sensorSet = new Set();
    for (const r of result.rows) {
      equipmentSet.add(r.equipment_name);
      sensorSet.add(r.sensor_name);
    }
    const maxIntensity = result.rows.reduce((m, r) => Math.max(m, r.intensity || 0), 0);

    res.json({
      days,
      equipment: Array.from(equipmentSet),
      sensors: Array.from(sensorSet),
      cells: result.rows,
      maxIntensity,
    });
  } catch (err) {
    console.error('customViews heatmap error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// =========================================================================
// NON-VIZ 1 — GET /report.pdf
// Generates a PDF-style anomaly report (minimal PDF, no external dep).
// =========================================================================
router.get('/report.pdf', auth, async (req, res) => {
  try {
    const days = Math.min(180, Math.max(1, parseInt(req.query.days) || 7));
    const summarySql = `
      SELECT severity, COUNT(*)::int AS count
      FROM anomalies
      WHERE detected_at >= NOW() - ($1 || ' days')::interval
      GROUP BY severity
    `;
    const topSql = `
      SELECT a.id, a.type, a.severity, a.status, a.description,
             COALESCE(s.name, 'n/a') AS sensor_name,
             COALESCE(e.name, 'n/a') AS equipment_name,
             a.detected_at
      FROM anomalies a
      LEFT JOIN sensors s ON s.id = a.sensor_id
      LEFT JOIN equipment e ON e.id = a.equipment_id
      WHERE a.detected_at >= NOW() - ($1 || ' days')::interval
      ORDER BY
        CASE a.severity
          WHEN 'critical' THEN 4
          WHEN 'high' THEN 3
          WHEN 'medium' THEN 2
          ELSE 1
        END DESC,
        a.detected_at DESC
      LIMIT 25
    `;
    const [summary, top] = await Promise.all([
      pool.query(summarySql, [days.toString()]),
      pool.query(topSql, [days.toString()]),
    ]);

    // ---- Build minimal valid PDF (single page, plain text) ----
    const sanitize = (s) =>
      String(s == null ? '' : s)
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/[\r\n\t]+/g, ' ')
        .slice(0, 110);

    const lines = [];
    lines.push('Industrial IoT Anomaly Detection Report');
    lines.push(`Window: last ${days} day(s)   Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('Severity summary:');
    if (summary.rows.length === 0) {
      lines.push('  (no anomalies in window)');
    } else {
      for (const r of summary.rows) {
        lines.push(`  - ${r.severity}: ${r.count}`);
      }
    }
    lines.push('');
    lines.push('Top anomalies:');
    if (top.rows.length === 0) {
      lines.push('  (none)');
    } else {
      for (const r of top.rows) {
        lines.push(
          `#${r.id} [${r.severity}/${r.status}] ${r.type} - ${r.equipment_name}/${r.sensor_name}`
        );
      }
    }

    // Build the content stream — first line at top, then line-feeds.
    let contentStream = 'BT\n/F1 11 Tf\n50 770 Td\n14 TL\n';
    lines.forEach((ln, idx) => {
      if (idx === 0) {
        contentStream += `(${sanitize(ln)}) Tj\n`;
      } else {
        contentStream += `T*\n(${sanitize(ln)}) Tj\n`;
      }
    });
    contentStream += 'ET\n';

    const objects = [];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects.push(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
      '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>'
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}endstream`
    );
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objects.forEach((body, i) => {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="anomaly-report-${Date.now()}.pdf"`
    );
    res.send(Buffer.from(pdf, 'utf8'));
  } catch (err) {
    console.error('customViews report.pdf error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// =========================================================================
// NON-VIZ 2 — Detection rules CRUD (thresholds)
// GET  /rules         → list
// POST /rules         → create
// PUT  /rules/:id     → update
// DELETE /rules/:id   → delete
// All exposed under a single /rules surface (counts as one "endpoint family").
// =========================================================================
router.get('/rules', auth, (req, res) => {
  res.json({ rules: detectionRules, count: detectionRules.length });
});

router.post('/rules', auth, (req, res) => {
  try {
    const { sensor_type, min_threshold, max_threshold, severity, enabled } = req.body || {};
    if (!sensor_type || typeof sensor_type !== 'string') {
      return res.status(400).json({ error: 'sensor_type is required' });
    }
    const rule = {
      id: _ruleCounter++,
      sensor_type: sensor_type.trim(),
      min_threshold: min_threshold == null ? null : Number(min_threshold),
      max_threshold: max_threshold == null ? null : Number(max_threshold),
      severity: severity || 'medium',
      enabled: enabled !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    detectionRules.push(rule);
    res.status(201).json(rule);
  } catch (err) {
    console.error('customViews create rule error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/rules/:id', auth, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = detectionRules.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const r = detectionRules[idx];
  const { sensor_type, min_threshold, max_threshold, severity, enabled } = req.body || {};
  if (sensor_type !== undefined) r.sensor_type = String(sensor_type).trim();
  if (min_threshold !== undefined) r.min_threshold = min_threshold == null ? null : Number(min_threshold);
  if (max_threshold !== undefined) r.max_threshold = max_threshold == null ? null : Number(max_threshold);
  if (severity !== undefined) r.severity = severity;
  if (enabled !== undefined) r.enabled = !!enabled;
  r.updated_at = new Date().toISOString();
  res.json(r);
});

router.delete('/rules/:id', auth, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = detectionRules.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const [removed] = detectionRules.splice(idx, 1);
  res.json({ deleted: true, rule: removed });
});

module.exports = router;
