require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function initDb() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    process.exit(1);
  }
}

initDb();
