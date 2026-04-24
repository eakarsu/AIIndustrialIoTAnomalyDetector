const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/alerts
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, e.name as equipment_name, s.name as sensor_name
      FROM alerts a
      LEFT JOIN equipment e ON a.equipment_id = e.id
      LEFT JOIN sensors s ON a.sensor_id = s.id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/alerts/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, e.name as equipment_name, s.name as sensor_name
      FROM alerts a
      LEFT JOIN equipment e ON a.equipment_id = e.id
      LEFT JOIN sensors s ON a.sensor_id = s.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get alert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/alerts
router.post('/', auth, async (req, res) => {
  try {
    const { type, severity, message, source, equipment_id, sensor_id, status } = req.body;
    if (!type || !severity || !message) {
      return res.status(400).json({ error: 'Type, severity, and message are required' });
    }
    const result = await pool.query(
      `INSERT INTO alerts (type, severity, message, source, equipment_id, sensor_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [type, severity, message, source || null, equipment_id || null, sensor_id || null, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create alert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/alerts/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { type, severity, message, source, equipment_id, sensor_id, status, acknowledged_by } = req.body;
    const result = await pool.query(
      `UPDATE alerts SET type = COALESCE($1, type), severity = COALESCE($2, severity),
       message = COALESCE($3, message), source = COALESCE($4, source),
       equipment_id = COALESCE($5, equipment_id), sensor_id = COALESCE($6, sensor_id),
       status = COALESCE($7, status), acknowledged_by = COALESCE($8, acknowledged_by)
       WHERE id = $9 RETURNING *`,
      [type, severity, message, source, equipment_id, sensor_id, status, acknowledged_by, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update alert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/alerts/:id/acknowledge
router.patch('/:id/acknowledge', auth, async (req, res) => {
  try {
    const { acknowledged_by } = req.body;
    const result = await pool.query(
      `UPDATE alerts SET status = 'acknowledged', acknowledged_by = $1, acknowledged_at = NOW()
       WHERE id = $2 RETURNING *`,
      [acknowledged_by || req.user.email, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Acknowledge alert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM alerts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ message: 'Alert deleted', alert: result.rows[0] });
  } catch (err) {
    console.error('Delete alert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
