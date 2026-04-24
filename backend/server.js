const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors({ origin: `http://localhost:${process.env.FRONTEND_PORT || 3000}`, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/anomalies', require('./routes/anomalies'));
app.use('/api/predictive', require('./routes/predictive'));
app.use('/api/rootcause', require('./routes/rootcause'));
app.use('/api/health', require('./routes/health'));
app.use('/api/energy', require('./routes/energy'));

app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
