/**
 * Migration Runner for 007_add_cascading_approvals
 * Run with: node run-migration-007.js
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
  server: 'sql-miravista-prod.database.windows.net',
  database: 'TimesheetDB',
  user: 'sqladmin',
  password: 'MiraVista2026!Secure#DB',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 60000,
};

async function runMigration() {
  let pool = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully to TimesheetDB');

    // Read the migration file
    const migrationPath = path.join(__dirname, '007_add_cascading_approvals.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Split by GO statements and execute each batch
    const batches = migrationSql
      .split(/^GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    console.log(`Found ${batches.length} batches to execute`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\nExecuting batch ${i + 1}/${batches.length}...`);

      try {
        await pool.request().query(batch);
        console.log(`Batch ${i + 1} completed successfully`);
      } catch (batchError) {
        console.error(`Error in batch ${i + 1}:`, batchError.message);
        // Continue with other batches unless it's a critical error
        if (batchError.message.includes('already exists')) {
          console.log('  (Object already exists - continuing)');
        } else {
          throw batchError;
        }
      }
    }

    console.log('\n========================================');
    console.log('Migration 007 completed successfully!');
    console.log('========================================');

    // Verify the changes
    console.log('\nVerifying migration results...');

    // Check ApprovalDelegation table exists
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM sys.tables WHERE name = 'ApprovalDelegation'
    `);
    console.log(`ApprovalDelegation table exists: ${tableCheck.recordset[0].count > 0 ? 'YES' : 'NO'}`);

    // Check new columns in TimesheetHistory
    const columnCheck = await pool.request().query(`
      SELECT
        SUM(CASE WHEN name = 'ApprovalType' THEN 1 ELSE 0 END) as hasApprovalType,
        SUM(CASE WHEN name = 'OnBehalfOfUserID' THEN 1 ELSE 0 END) as hasOnBehalfOfUserID
      FROM sys.columns
      WHERE object_id = OBJECT_ID('TimesheetHistory')
    `);
    console.log(`TimesheetHistory.ApprovalType column exists: ${columnCheck.recordset[0].hasApprovalType > 0 ? 'YES' : 'NO'}`);
    console.log(`TimesheetHistory.OnBehalfOfUserID column exists: ${columnCheck.recordset[0].hasOnBehalfOfUserID > 0 ? 'YES' : 'NO'}`);

    // Check index on ManagerEntraID
    const indexCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM sys.indexes WHERE name = 'IX_Users_ManagerEntraID'
    `);
    console.log(`IX_Users_ManagerEntraID index exists: ${indexCheck.recordset[0].count > 0 ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

runMigration();
