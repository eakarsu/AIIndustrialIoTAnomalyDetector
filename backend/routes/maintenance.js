const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');
const { aiRateLimiter, callWithRetry } = require('../middleware/aiHelpers');

// GET /api/maintenance
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ms.*, e.name as equipment_name
      FROM maintenance_schedules ms
      LEFT JOIN equipment e ON ms.equipment_id = e.id
      ORDER BY ms.scheduled_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get maintenance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/maintenance/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ms.*, e.name as equipment_name
      FROM maintenance_schedules ms
      LEFT JOIN equipment e ON ms.equipment_id = e.id
      WHERE ms.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get maintenance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/maintenance
router.post('/', auth, async (req, res) => {
  try {
    const { equipment_id, type, description, scheduled_date, completed_date, status, priority, assigned_to, notes } = req.body;
    if (!equipment_id || !type || !scheduled_date) {
      return res.status(400).json({ error: 'Equipment ID, type, and scheduled date are required' });
    }
    const result = await pool.query(
      `INSERT INTO maintenance_schedules (equipment_id, type, description, scheduled_date, completed_date, status, priority, assigned_to, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [equipment_id, type, description || null, scheduled_date, completed_date || null, status || 'scheduled', priority || 'medium', assigned_to || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create maintenance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/maintenance/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { equipment_id, type, description, scheduled_date, completed_date, status, priority, assigned_to, notes } = req.body;
    const result = await pool.query(
      `UPDATE maintenance_schedules SET equipment_id = COALESCE($1, equipment_id), type = COALESCE($2, type),
       description = COALESCE($3, description), scheduled_date = COALESCE($4, scheduled_date),
       completed_date = COALESCE($5, completed_date), status = COALESCE($6, status),
       priority = COALESCE($7, priority), assigned_to = COALESCE($8, assigned_to), notes = COALESCE($9, notes)
       WHERE id = $10 RETURNING *`,
      [equipment_id, type, description, scheduled_date, completed_date, status, priority, assigned_to, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update maintenance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/maintenance/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM maintenance_schedules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }
    res.json({ message: 'Maintenance schedule deleted', schedule: result.rows[0] });
  } catch (err) {
    console.error('Delete maintenance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/maintenance/:equipment_id/recommendation — AI maintenance recommendation
router.post('/:equipment_id/recommendation', auth, aiRateLimiter, async (req, res) => {
  try {
    const { equipment_id } = req.params;

    const equipResult = await pool.query('SELECT * FROM equipment WHERE id = $1', [equipment_id]);
    if (equipResult.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });
    const equipment = equipResult.rows[0];

    const anomaliesResult = await pool.query(
      `SELECT type, severity, description, detected_at, status FROM anomalies
       WHERE equipment_id = $1 ORDER BY detected_at DESC LIMIT 20`,
      [equipment_id]
    ).catch(() => ({ rows: [] }));

    const sensorsResult = await pool.query(
      `SELECT name, type, location, last_reading, min_value, max_value, unit, status FROM sensors
       WHERE equipment_id = $1`,
      [equipment_id]
    ).catch(() => ({ rows: [] }));

    const scheduleResult = await pool.query(
      `SELECT scheduled_date, type, status, notes FROM maintenance_schedules
       WHERE equipment_id = $1 ORDER BY scheduled_date DESC LIMIT 10`,
      [equipment_id]
    ).catch(() => ({ rows: [] }));

    const prompt = `You are an industrial maintenance advisor. Recommend maintenance actions for the following equipment based on recent anomalies, sensor readings, and prior schedules.

Equipment:
- id=${equipment.id}, name=${equipment.name}, type=${equipment.type}, status=${equipment.status}, location=${equipment.location || 'n/a'}, install_date=${equipment.install_date || 'n/a'}

Recent anomalies (${anomaliesResult.rows.length}):
${anomaliesResult.rows.map(a => `- ${a.detected_at}: ${a.severity} ${a.type} (${a.status}) - ${a.description || ''}`).join('\n') || 'none'}

Sensors:
${sensorsResult.rows.map(s => `- ${s.name} (${s.type}): last=${s.last_reading}${s.unit || ''} range=[${s.min_value}-${s.max_value}] status=${s.status}`).join('\n') || 'none'}

Prior maintenance:
${scheduleResult.rows.map(s => `- ${s.scheduled_date}: ${s.type} (${s.status}) - ${s.notes || ''}`).join('\n') || 'none'}

Return JSON:
{
  "urgency": "routine|elevated|urgent|critical",
  "recommended_action": string,
  "recommended_window_days": number,
  "tasks": [{ "task": string, "priority": "low|medium|high", "estimated_minutes": number, "trade_required": string }],
  "parts_to_have_on_hand": string[],
  "expected_downtime_minutes": number,
  "risk_if_deferred": string,
  "rationale": string,
  "confidence_0_100": number
}`;

    const aiResponse = await callWithRetry(() =>
      axios.post(process.env.OPENROUTER_BASE_URL + '/chat/completions', {
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: prompt }],
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      })
    );

    const rawContent = aiResponse.data.choices[0].message.content;
    let structured = null;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || rawContent.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent.trim();
      structured = JSON.parse(jsonStr);
    } catch (e) {
      structured = null;
    }

    res.json({ equipment_id: equipment.id, structured, raw: rawContent });
  } catch (err) {
    console.error('Maintenance recommendation error:', err);
    res.status(500).json({ error: 'Maintenance recommendation failed: ' + (err.response?.data?.error?.message || err.message) });
  }
});

module.exports = router;
