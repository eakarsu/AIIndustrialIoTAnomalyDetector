const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/equipment
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get equipment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/equipment/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get equipment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/equipment
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, location, manufacturer, model, serial_number, status, install_date, last_maintenance } = req.body;
    if (!name || !type || !location) {
      return res.status(400).json({ error: 'Name, type, and location are required' });
    }
    const result = await pool.query(
      `INSERT INTO equipment (name, type, location, manufacturer, model, serial_number, status, install_date, last_maintenance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, type, location, manufacturer || null, model || null, serial_number || null, status || 'operational', install_date || null, last_maintenance || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create equipment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/equipment/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, type, location, manufacturer, model, serial_number, status, install_date, last_maintenance } = req.body;
    const result = await pool.query(
      `UPDATE equipment SET name = COALESCE($1, name), type = COALESCE($2, type), location = COALESCE($3, location),
       manufacturer = COALESCE($4, manufacturer), model = COALESCE($5, model), serial_number = COALESCE($6, serial_number),
       status = COALESCE($7, status), install_date = COALESCE($8, install_date), last_maintenance = COALESCE($9, last_maintenance)
       WHERE id = $10 RETURNING *`,
      [name, type, location, manufacturer, model, serial_number, status, install_date, last_maintenance, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update equipment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/equipment/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM equipment WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json({ message: 'Equipment deleted', equipment: result.rows[0] });
  } catch (err) {
    console.error('Delete equipment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
