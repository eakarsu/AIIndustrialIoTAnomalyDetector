const express = require('express');

const router = express.Router();

function drift(input = {}) {
  const sensors = input.sensors || [
    { sensor: 'Press-17 vibration', baseline_offset: 0.04, current_offset: 0.22, days_since_calibration: 118 },
    { sensor: 'Boiler temp A', baseline_offset: 0.02, current_offset: 0.05, days_since_calibration: 31 },
  ];
  return {
    sensors: sensors.map((s) => {
      const score = Math.min(100, Math.round(Math.abs(Number(s.current_offset) - Number(s.baseline_offset)) * 220 + Number(s.days_since_calibration) * 0.35));
      return { ...s, drift_score: score, status: score >= 70 ? 'calibrate_now' : score >= 40 ? 'schedule_calibration' : 'stable' };
    }),
  };
}

router.get('/', (req, res) => res.json(drift()));
router.post('/assess', (req, res) => res.json(drift(req.body || {})));

module.exports = router;
