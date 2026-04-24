const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hs.*, e.name as equipment_name, e.type as equipment_type
      FROM health_scores hs
      LEFT JOIN equipment e ON hs.equipment_id = e.id
      ORDER BY hs.calculated_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get health error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hs.*, e.name as equipment_name, e.type as equipment_type
      FROM health_scores hs
      LEFT JOIN equipment e ON hs.equipment_id = e.id
      WHERE hs.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get health error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { equipment_id, score, factors, recommendations } = req.body;
    if (!equipment_id || score === undefined) return res.status(400).json({ error: 'Equipment ID and score are required' });
    const result = await pool.query(
      `INSERT INTO health_scores (equipment_id, score, factors, recommendations)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [equipment_id, score, factors ? JSON.stringify(factors) : null, recommendations || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create health error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { equipment_id, score, factors, recommendations } = req.body;
    const result = await pool.query(
      `UPDATE health_scores SET equipment_id = COALESCE($1, equipment_id), score = COALESCE($2, score),
       factors = COALESCE($3, factors), recommendations = COALESCE($4, recommendations)
       WHERE id = $5 RETURNING *`,
      [equipment_id, score, factors ? JSON.stringify(factors) : null, recommendations, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update health error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM health_scores WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    console.error('Delete health error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/calculate', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hs.*, e.name as equipment_name, e.type as equipment_type, e.manufacturer, e.model,
             e.status as equipment_status, e.install_date, e.last_maintenance
      FROM health_scores hs
      LEFT JOIN equipment e ON hs.equipment_id = e.id
      WHERE hs.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

    const record = result.rows[0];

    const anomalies = await pool.query(
      `SELECT type, severity, description FROM anomalies WHERE equipment_id = $1 AND status != 'resolved' ORDER BY detected_at DESC LIMIT 5`,
      [record.equipment_id]
    );

    const prompt = `You are an equipment health assessment AI for industrial equipment. Calculate and explain the health score.

Equipment:
- Name: ${record.equipment_name} (${record.equipment_type})
- Manufacturer: ${record.manufacturer || 'N/A'}, Model: ${record.model || 'N/A'}
- Status: ${record.equipment_status}
- Installed: ${record.install_date || 'N/A'}
- Last Maintenance: ${record.last_maintenance || 'N/A'}

Current Health Score: ${record.score}/100
Current Factors: ${JSON.stringify(record.factors || {})}

Active Anomalies:
${anomalies.rows.map(a => `- ${a.type} (${a.severity}): ${a.description || 'No description'}`).join('\n') || 'None'}

Provide your assessment in the following format:
Health Score Assessment:
[Overall health evaluation and score justification]

Component Health Breakdown:
[Analysis of individual health factors]

Degradation Trends:
[Observed trends and rate of degradation]

Risk Factors:
[Current risks and their impact on health]

Maintenance Recommendations:
[Prioritized maintenance actions to improve health score]

Projected Health Timeline:
[Expected health trajectory over next 3-6 months]`;

    const aiResponse = await axios.post(process.env.OPENROUTER_BASE_URL + '/chat/completions', {
      model: process.env.OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const aiAnalysis = aiResponse.data.choices[0].message.content;
    await pool.query('UPDATE health_scores SET ai_analysis = $1, calculated_at = NOW() WHERE id = $2', [aiAnalysis, req.params.id]);

    res.json({ ...record, ai_analysis: aiAnalysis });
  } catch (err) {
    console.error('AI health error:', err);
    res.status(500).json({ error: 'AI calculation failed: ' + (err.response?.data?.error?.message || err.message) });
  }
});

module.exports = router;
