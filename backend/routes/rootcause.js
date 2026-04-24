const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rca.*, a.type as anomaly_type, a.severity as anomaly_severity,
             e.name as equipment_name
      FROM root_cause_analyses rca
      LEFT JOIN anomalies a ON rca.anomaly_id = a.id
      LEFT JOIN equipment e ON rca.equipment_id = e.id
      ORDER BY rca.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get rootcause error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rca.*, a.type as anomaly_type, a.severity as anomaly_severity, a.description as anomaly_description,
             e.name as equipment_name, e.type as equipment_type
      FROM root_cause_analyses rca
      LEFT JOIN anomalies a ON rca.anomaly_id = a.id
      LEFT JOIN equipment e ON rca.equipment_id = e.id
      WHERE rca.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get rootcause error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { anomaly_id, equipment_id, title, root_cause, confidence, recommendations, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const result = await pool.query(
      `INSERT INTO root_cause_analyses (anomaly_id, equipment_id, title, root_cause, confidence, recommendations, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [anomaly_id || null, equipment_id || null, title, root_cause || null, confidence || null, recommendations || null, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create rootcause error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { anomaly_id, equipment_id, title, root_cause, confidence, recommendations, status } = req.body;
    const result = await pool.query(
      `UPDATE root_cause_analyses SET anomaly_id = COALESCE($1, anomaly_id), equipment_id = COALESCE($2, equipment_id),
       title = COALESCE($3, title), root_cause = COALESCE($4, root_cause), confidence = COALESCE($5, confidence),
       recommendations = COALESCE($6, recommendations), status = COALESCE($7, status) WHERE id = $8 RETURNING *`,
      [anomaly_id, equipment_id, title, root_cause, confidence, recommendations, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update rootcause error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM root_cause_analyses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    console.error('Delete rootcause error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/analyze', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rca.*, a.type as anomaly_type, a.severity as anomaly_severity, a.description as anomaly_description,
             a.detected_at, e.name as equipment_name, e.type as equipment_type, e.manufacturer, e.model,
             s.name as sensor_name, s.type as sensor_type, s.last_reading, s.unit
      FROM root_cause_analyses rca
      LEFT JOIN anomalies a ON rca.anomaly_id = a.id
      LEFT JOIN equipment e ON rca.equipment_id = e.id
      LEFT JOIN sensors s ON a.sensor_id = s.id
      WHERE rca.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

    const record = result.rows[0];

    const prompt = `You are a root cause analysis expert for industrial equipment failures. Perform a thorough root cause analysis.

Issue Title: ${record.title}
Known Root Cause (if any): ${record.root_cause || 'Under investigation'}

Related Anomaly:
- Type: ${record.anomaly_type || 'N/A'}
- Severity: ${record.anomaly_severity || 'N/A'}
- Description: ${record.anomaly_description || 'N/A'}
- Detected: ${record.detected_at || 'N/A'}

Equipment:
- Name: ${record.equipment_name || 'N/A'} (${record.equipment_type || 'N/A'})
- Manufacturer: ${record.manufacturer || 'N/A'}, Model: ${record.model || 'N/A'}

Sensor Data:
- Sensor: ${record.sensor_name || 'N/A'} (${record.sensor_type || 'N/A'})
- Reading: ${record.last_reading || 'N/A'} ${record.unit || ''}

Provide your analysis in the following format:
Root Cause Identification:
[Primary root cause and contributing factors]

Causal Chain Analysis:
[Step-by-step chain of events leading to the issue]

Confidence Assessment:
[Confidence level in the root cause identification, with reasoning]

Impact Assessment:
[Current and potential future impact]

Corrective Actions:
[Immediate corrective actions needed]

Preventive Recommendations:
[Long-term preventive measures]`;

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
    await pool.query('UPDATE root_cause_analyses SET ai_analysis = $1 WHERE id = $2', [aiAnalysis, req.params.id]);

    res.json({ ...record, ai_analysis: aiAnalysis });
  } catch (err) {
    console.error('AI rootcause error:', err);
    res.status(500).json({ error: 'AI analysis failed: ' + (err.response?.data?.error?.message || err.message) });
  }
});

module.exports = router;
