const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');
const { aiRateLimiter, callWithRetry } = require('../middleware/aiHelpers');

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM anomalies');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(`
      SELECT a.*, s.name as sensor_name, e.name as equipment_name
      FROM anomalies a
      LEFT JOIN sensors s ON a.sensor_id = s.id
      LEFT JOIN equipment e ON a.equipment_id = e.id
      ORDER BY a.detected_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
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

router.post('/:id/analyze', auth, aiRateLimiter, async (req, res) => {
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

Return JSON with this exact structure:
{
  "risk_level": "low|medium|high|critical",
  "confidence": <number 0-100>,
  "probable_causes": ["cause1", "cause2"],
  "immediate_actions": ["action1", "action2"],
  "affected_components": ["component1", "component2"],
  "estimated_impact": "description of impact"
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
    await pool.query('UPDATE anomalies SET ai_analysis = $1 WHERE id = $2', [aiAnalysis, req.params.id]);

    // Auto-create alert if high or critical
    let auto_alert_created = false;
    if (structured && (structured.risk_level === 'high' || structured.risk_level === 'critical')) {
      try {
        const alertMsg = (structured.immediate_actions && structured.immediate_actions[0]) || `${structured.risk_level} risk anomaly detected`;
        await pool.query(
          `INSERT INTO alerts (sensor_id, equipment_id, severity, message, status, type, source)
           VALUES ($1, $2, $3, $4, 'active', 'anomaly_ai', 'ai_analyze')`,
          [anomaly.sensor_id || null, anomaly.equipment_id || null, structured.risk_level, alertMsg]
        );
        auto_alert_created = true;
      } catch (alertErr) {
        console.error('Auto-alert creation error:', alertErr);
      }
    }

    res.json({ structured, raw: rawContent, auto_alert_created });
  } catch (err) {
    console.error('AI analyze error:', err);
    res.status(500).json({ error: 'AI analysis failed: ' + (err.response?.data?.error?.message || err.message) });
  }
});

module.exports = router;
