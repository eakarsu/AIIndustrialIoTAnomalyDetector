const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/sensors
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sensors ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get sensors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sensors/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sensors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get sensor error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sensors
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, location, unit, min_value, max_value, status, installed_date, last_reading, last_reading_at } = req.body;
    if (!name || !type || !location || !unit) {
      return res.status(400).json({ error: 'Name, type, location, and unit are required' });
    }
    const result = await pool.query(
      `INSERT INTO sensors (name, type, location, unit, min_value, max_value, status, installed_date, last_reading, last_reading_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, type, location, unit, min_value || null, max_value || null, status || 'active', installed_date || null, last_reading || null, last_reading_at || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create sensor error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/sensors/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, type, location, unit, min_value, max_value, status, installed_date, last_reading, last_reading_at } = req.body;
    const result = await pool.query(
      `UPDATE sensors SET name = COALESCE($1, name), type = COALESCE($2, type), location = COALESCE($3, location),
       unit = COALESCE($4, unit), min_value = COALESCE($5, min_value), max_value = COALESCE($6, max_value),
       status = COALESCE($7, status), installed_date = COALESCE($8, installed_date),
       last_reading = COALESCE($9, last_reading), last_reading_at = COALESCE($10, last_reading_at)
       WHERE id = $11 RETURNING *`,
      [name, type, location, unit, min_value, max_value, status, installed_date, last_reading, last_reading_at, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update sensor error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/sensors/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sensors WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }
    res.json({ message: 'Sensor deleted', sensor: result.rows[0] });
  } catch (err) {
    console.error('Delete sensor error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
