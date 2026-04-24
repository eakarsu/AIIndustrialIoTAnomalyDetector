const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/stats', auth, async (req, res) => {
  try {
    const [sensors, equipment, alerts, anomalies, maintenance, predictive, health, energy] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM sensors'),
      pool.query('SELECT COUNT(*) as count FROM equipment'),
      pool.query("SELECT COUNT(*) as count FROM alerts WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) as count FROM anomalies WHERE status != 'resolved'"),
      pool.query("SELECT COUNT(*) as count FROM maintenance_schedules WHERE status = 'scheduled'"),
      pool.query("SELECT COUNT(*) as count FROM predictive_maintenance WHERE status = 'pending'"),
      pool.query('SELECT ROUND(AVG(score), 1) as avg_score FROM health_scores'),
      pool.query('SELECT ROUND(SUM(savings_potential), 2) as total_savings FROM energy_records WHERE savings_potential IS NOT NULL'),
    ]);

    res.json({
      totalSensors: parseInt(sensors.rows[0].count),
      totalEquipment: parseInt(equipment.rows[0].count),
      activeAlerts: parseInt(alerts.rows[0].count),
      anomalies: parseInt(anomalies.rows[0].count),
      scheduledMaintenance: parseInt(maintenance.rows[0].count),
      pendingPredictions: parseInt(predictive.rows[0].count),
      avgHealthScore: parseFloat(health.rows[0].avg_score) || 0,
      totalSavingsPotential: parseFloat(energy.rows[0].total_savings) || 0,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
