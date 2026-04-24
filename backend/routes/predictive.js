const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

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

router.post('/:id/predict', auth, async (req, res) => {
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

Provide your prediction in the following format:
Failure Prediction Summary:
[Updated assessment of the predicted failure]

Probability Assessment:
[Updated probability and confidence level]

Timeline Analysis:
[Expected timeline for potential failure]

Contributing Factors:
[Key factors contributing to potential failure]

Recommended Preventive Actions:
[Specific maintenance actions to prevent or delay failure]

Cost-Benefit Analysis:
[Estimated cost of prevention vs. failure]`;

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
    await pool.query('UPDATE predictive_maintenance SET ai_analysis = $1 WHERE id = $2', [aiAnalysis, req.params.id]);

    res.json({ ...record, ai_analysis: aiAnalysis });
  } catch (err) {
    console.error('AI predict error:', err);
    res.status(500).json({ error: 'AI prediction failed: ' + (err.response?.data?.error?.message || err.message) });
  }
});

module.exports = router;
