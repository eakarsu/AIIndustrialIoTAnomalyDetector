const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');
const { aiRateLimiter, callWithRetry } = require('../middleware/aiHelpers');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pm.*, e.name as equipment_name, e.type as equipment_type
      FROM predictive_maintenance pm
      LEFT JOIN equipment e ON pm.equipment_id = e.id
      ORDER BY pm.probability DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get predictive error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pm.*, e.name as equipment_name, e.type as equipment_type
      FROM predictive_maintenance pm
      LEFT JOIN equipment e ON pm.equipment_id = e.id
      WHERE pm.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get predictive error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { equipment_id, predicted_failure_date, failure_type, probability, recommended_action, status } = req.body;
    if (!equipment_id || !failure_type) return res.status(400).json({ error: 'Equipment ID and failure type are required' });
    const result = await pool.query(
      `INSERT INTO predictive_maintenance (equipment_id, predicted_failure_date, failure_type, probability, recommended_action, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [equipment_id, predicted_failure_date || null, failure_type, probability || null, recommended_action || null, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create predictive error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { equipment_id, predicted_failure_date, failure_type, probability, recommended_action, status } = req.body;
    const result = await pool.query(
      `UPDATE predictive_maintenance SET equipment_id = COALESCE($1, equipment_id),
       predicted_failure_date = COALESCE($2, predicted_failure_date), failure_type = COALESCE($3, failure_type),
       probability = COALESCE($4, probability), recommended_action = COALESCE($5, recommended_action),
       status = COALESCE($6, status) WHERE id = $7 RETURNING *`,
      [equipment_id, predicted_failure_date, failure_type, probability, recommended_action, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update predictive error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM predictive_maintenance WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    console.error('Delete predictive error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/predict', auth, aiRateLimiter, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pm.*, e.name as equipment_name, e.type as equipment_type, e.status as equipment_status,
             e.manufacturer, e.model, e.install_date, e.last_maintenance
      FROM predictive_maintenance pm
      LEFT JOIN equipment e ON pm.equipment_id = e.id
      WHERE pm.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

    const record = result.rows[0];

    const recentAnomalies = await pool.query(
      `SELECT type, severity, description FROM anomalies WHERE equipment_id = $1 ORDER BY detected_at DESC LIMIT 5`,
      [record.equipment_id]
    );

    const prompt = `You are a predictive maintenance AI expert for industrial equipment. Analyze the following equipment data and provide an updated failure prediction.

Equipment Details:
- Name: ${record.equipment_name} (${record.equipment_type})
- Manufacturer: ${record.manufacturer || 'N/A'}, Model: ${record.model || 'N/A'}
- Installed: ${record.install_date || 'N/A'}
- Last Maintenance: ${record.last_maintenance || 'N/A'}
- Current Status: ${record.equipment_status}

Current Prediction:
- Failure Type: ${record.failure_type}
- Predicted Failure Date: ${record.predicted_failure_date || 'N/A'}
- Current Probability: ${record.probability ? (record.probability * 100) + '%' : 'N/A'}

Recent Anomalies:
${recentAnomalies.rows.map(a => `- ${a.type} (${a.severity}): ${a.description || 'No description'}`).join('\n') || 'None'}

Return JSON with this exact structure:
{
  "failure_probability": <number 0-100>,
  "predicted_failure_date": "<ISO date string>",
  "maintenance_type": "preventive|corrective|replacement",
  "parts_needed": ["part1", "part2"],
  "estimated_cost": <number>,
  "priority": "low|medium|high|critical"
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

    const aiAnalysis = structured ? JSON.stringify(structured) : rawContent;
    await pool.query('UPDATE predictive_maintenance SET ai_analysis = $1 WHERE id = $2', [aiAnalysis, req.params.id]);

    // Auto-create maintenance record if failure_probability > 75
    if (structured && structured.failure_probability > 75) {
      try {
        await pool.query(
          `INSERT INTO maintenance (equipment_id, type, status, description, scheduled_date)
           VALUES ($1, $2, 'scheduled', $3, $4)
           ON CONFLICT DO NOTHING`,
          [
            record.equipment_id,
            structured.maintenance_type || 'preventive',
            `Auto-scheduled: AI predicted ${structured.failure_probability}% failure probability. Parts needed: ${(structured.parts_needed || []).join(', ')}`,
            structured.predicted_failure_date || null,
          ]
        );
      } catch (maintErr) {
        console.error('Auto-maintenance creation error:', maintErr);
      }
    }

    res.json({ ...record, ai_analysis: aiAnalysis, structured });
  } catch (err) {
    console.error('AI predict error:', err);
    res.status(500).json({ error: 'AI prediction failed: ' + (err.response?.data?.error?.message || err.message) });
  }
});

module.exports = router;
