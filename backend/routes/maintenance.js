const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

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

module.exports = router;
