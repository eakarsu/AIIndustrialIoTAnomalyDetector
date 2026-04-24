const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT er.*, e.name as equipment_name, e.type as equipment_type
      FROM energy_records er
      LEFT JOIN equipment e ON er.equipment_id = e.id
      ORDER BY er.period_end DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get energy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT er.*, e.name as equipment_name, e.type as equipment_type
      FROM energy_records er
      LEFT JOIN equipment e ON er.equipment_id = e.id
      WHERE er.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get energy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { equipment_id, consumption_kwh, cost, period_start, period_end, savings_potential } = req.body;
    if (!equipment_id || !consumption_kwh || !period_start || !period_end) {
      return res.status(400).json({ error: 'Equipment ID, consumption, period start and end are required' });
    }
    const result = await pool.query(
      `INSERT INTO energy_records (equipment_id, consumption_kwh, cost, period_start, period_end, savings_potential)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [equipment_id, consumption_kwh, cost || null, period_start, period_end, savings_potential || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create energy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { equipment_id, consumption_kwh, cost, period_start, period_end, savings_potential } = req.body;
    const result = await pool.query(
      `UPDATE energy_records SET equipment_id = COALESCE($1, equipment_id), consumption_kwh = COALESCE($2, consumption_kwh),
       cost = COALESCE($3, cost), period_start = COALESCE($4, period_start), period_end = COALESCE($5, period_end),
       savings_potential = COALESCE($6, savings_potential) WHERE id = $7 RETURNING *`,
      [equipment_id, consumption_kwh, cost, period_start, period_end, savings_potential, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update energy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM energy_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    console.error('Delete energy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/optimize', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT er.*, e.name as equipment_name, e.type as equipment_type, e.manufacturer, e.model,
             e.status as equipment_status
      FROM energy_records er
      LEFT JOIN equipment e ON er.equipment_id = e.id
      WHERE er.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

    const record = result.rows[0];

    const prompt = `You are an energy optimization AI expert for industrial equipment. Analyze energy consumption and provide optimization recommendations.

Equipment:
- Name: ${record.equipment_name} (${record.equipment_type})
- Manufacturer: ${record.manufacturer || 'N/A'}, Model: ${record.model || 'N/A'}
- Status: ${record.equipment_status}

Energy Data:
- Consumption: ${record.consumption_kwh} kWh
- Cost: $${record.cost || 'N/A'}
- Period: ${record.period_start} to ${record.period_end}
- Current Savings Potential: ${record.savings_potential || 'Not calculated'} kWh

Provide your analysis in the following format:
Energy Consumption Analysis:
[Analysis of current energy usage patterns]

Efficiency Assessment:
[How efficient is the equipment compared to benchmarks]

Optimization Opportunities:
[Specific areas where energy can be saved]

Recommended Actions:
[Prioritized actions with estimated savings]

Estimated Savings:
[Projected kWh and cost savings]

Implementation Priority:
[Which optimizations to implement first]`;

    const aiResponse = await axios.post(process.env.OPENROUTER_BASE_URL + '/chat/completions', {
      model: process.env.OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const aiOptimization = aiResponse.data.choices[0].message.content;
    await pool.query('UPDATE energy_records SET ai_optimization = $1 WHERE id = $2', [aiOptimization, req.params.id]);

    res.json({ ...record, ai_optimization: aiOptimization });
  } catch (err) {
    console.error('AI energy error:', err);
    res.status(500).json({ error: 'AI optimization failed: ' + (err.response?.data?.error?.message || err.message) });
  }
});

module.exports = router;
