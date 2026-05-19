const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

// GET /api/sensors (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM sensors');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM sensors ORDER BY id ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
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

// POST /api/sensors/:id/reading — no auth required for IoT devices
router.post('/:id/reading', async (req, res) => {
  try {
    const { value, timestamp } = req.body;
    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'value is required' });
    }

    const sensorResult = await pool.query('SELECT * FROM sensors WHERE id = $1', [req.params.id]);
    if (sensorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const sensor = sensorResult.rows[0];
    const readingTime = timestamp || new Date().toISOString();

    // Update sensor's last reading
    await pool.query(
      'UPDATE sensors SET last_reading = $1, last_reading_at = $2 WHERE id = $3',
      [value, readingTime, sensor.id]
    );

    // Check if out of range
    const outOfRange =
      (sensor.min_value !== null && value < sensor.min_value) ||
      (sensor.max_value !== null && value > sensor.max_value);

    let anomaly_created = false;

    if (outOfRange) {
      const anomalyResult = await pool.query(
        `INSERT INTO anomalies (sensor_id, equipment_id, type, severity, description, status)
         VALUES ($1, NULL, 'out_of_range', 'high', $2, 'open') RETURNING *`,
        [
          sensor.id,
          `Sensor ${sensor.name} reading ${value} ${sensor.unit || ''} is outside normal range [${sensor.min_value ?? '-'}, ${sensor.max_value ?? '-'}] ${sensor.unit || ''}`,
        ]
      );
      anomaly_created = true;

      // Fire-and-forget AI analyze call
      const anomalyId = anomalyResult.rows[0].id;
      setImmediate(async () => {
        try {
          await axios.post(
            `http://localhost:${process.env.BACKEND_PORT || 3001}/api/anomalies/${anomalyId}/analyze`,
            {},
            { headers: { Authorization: `Bearer ${process.env.INTERNAL_TOKEN || ''}` } }
          );
        } catch (e) {
          // fire-and-forget, ignore errors
        }
      });
    }

    res.json({ received: true, anomaly_created });
  } catch (err) {
    console.error('Sensor reading error:', err);
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
