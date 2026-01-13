/**
 * Migration Runner Script
 * Run: node run-migration.js
 * Make sure to run from the database directory or adjust paths
 */

require('dotenv').config({ path: '../backend/.env' });
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

async function runMigration() {
  console.log('Connecting to database...');
  console.log(`Server: ${config.server}`);
  console.log(`Database: ${config.database}`);

  try {
    const pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '002_add_employeeid.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Split by GO statements and execute each batch
    const batches = migrationSql.split(/\nGO\s*\n/i).filter(batch => batch.trim());

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        console.log(`Executing batch ${i + 1}/${batches.length}...`);
        try {
          const result = await pool.request().query(batch);
          console.log('  Success');
        } catch (err) {
          console.error(`  Error: ${err.message}`);
        }
      }
    }

    console.log('\nMigration complete!');
    await pool.close();
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

runMigration();
