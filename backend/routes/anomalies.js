const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, s.name as sensor_name, e.name as equipment_name
      FROM anomalies a
      LEFT JOIN sensors s ON a.sensor_id = s.id
      LEFT JOIN equipment e ON a.equipment_id = e.id
      ORDER BY a.detected_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get anomalies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, s.name as sensor_name, e.name as equipment_name
      FROM anomalies a
      LEFT JOIN sensors s ON a.sensor_id = s.id
      LEFT JOIN equipment e ON a.equipment_id = e.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Anomaly not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get anomaly error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { sensor_id, equipment_id, type, severity, description, status } = req.body;
    if (!type || !severity) return res.status(400).json({ error: 'Type and severity are required' });
    const result = await pool.query(
      `INSERT INTO anomalies (sensor_id, equipment_id, type, severity, description, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [sensor_id || null, equipment_id || null, type, severity, description || null, status || 'open']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create anomaly error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { sensor_id, equipment_id, type, severity, description, status } = req.body;
    const result = await pool.query(
      `UPDATE anomalies SET sensor_id = COALESCE($1, sensor_id), equipment_id = COALESCE($2, equipment_id),
       type = COALESCE($3, type), severity = COALESCE($4, severity), description = COALESCE($5, description),
       status = COALESCE($6, status) WHERE id = $7 RETURNING *`,
      [sensor_id, equipment_id, type, severity, description, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Anomaly not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update anomaly error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM anomalies WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Anomaly not found' });
    res.json({ message: 'Anomaly deleted' });
  } catch (err) {
    console.error('Delete anomaly error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/analyze', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, s.name as sensor_name, s.type as sensor_type, s.location as sensor_location,
             s.last_reading, s.min_value, s.max_value, s.unit,
             e.name as equipment_name, e.type as equipment_type, e.status as equipment_status
      FROM anomalies a
      LEFT JOIN sensors s ON a.sensor_id = s.id
      LEFT JOIN equipment e ON a.equipment_id = e.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Anomaly not found' });

    const anomaly = result.rows[0];
    const prompt = `You are an expert industrial IoT anomaly detection engineer. Analyze the following anomaly detected in an industrial facility and provide a detailed analysis.

Anomaly Details:
- Type: ${anomaly.type}
- Severity: ${anomaly.severity}
- Description: ${anomaly.description || 'N/A'}
- Detected At: ${anomaly.detected_at}
- Status: ${anomaly.status}

Sensor Information:
- Sensor: ${anomaly.sensor_name || 'N/A'} (${anomaly.sensor_type || 'N/A'})
- Location: ${anomaly.sensor_location || 'N/A'}
- Last Reading: ${anomaly.last_reading || 'N/A'} ${anomaly.unit || ''}
- Normal Range: ${anomaly.min_value || 'N/A'} - ${anomaly.max_value || 'N/A'} ${anomaly.unit || ''}

Equipment Information:
- Equipment: ${anomaly.equipment_name || 'N/A'} (${anomaly.equipment_type || 'N/A'})
- Equipment Status: ${anomaly.equipment_status || 'N/A'}

Provide your analysis in the following format:
Analysis Summary:
[Brief summary of the anomaly]

Root Cause Assessment:
[Likely causes of this anomaly]

Risk Level:
[Assessment of risk and potential impact]

Recommended Actions:
[Specific actions to take]

Prevention Measures:
[How to prevent this in the future]`;

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
    await pool.query('UPDATE anomalies SET ai_analysis = $1 WHERE id = $2', [aiAnalysis, req.params.id]);

    res.json({ ...anomaly, ai_analysis: aiAnalysis });
  } catch (err) {
    console.error('AI analyze error:', err);
    res.status(500).json({ error: 'AI analysis failed: ' + (err.response?.data?.error?.message || err.message) });
  }
});

module.exports = router;
