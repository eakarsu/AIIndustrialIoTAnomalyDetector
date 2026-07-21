const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const required = (name) => { const value = process.env[name]; if (!value) throw new Error(`${name} is required`); return value; };

const pool = new Pool({
  host: required('DB_HOST'), port: Number(required('DB_PORT')), database: required('DB_NAME'), user: required('DB_USER'), password: required('DB_PASSWORD'),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
