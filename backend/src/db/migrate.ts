import dotenv from 'dotenv';
import sql, { ConnectionPool, config as SqlConfig } from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const useAzureAd = process.env.DB_USE_AZURE_AD === 'true';

const getDbConfig = async (): Promise<SqlConfig> => {
  const baseConfig: SqlConfig = {
    server: process.env.DB_SERVER || '',
    database: process.env.DB_NAME || '',
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      enableArithAbort: true,
    },
    pool: {
      max: 10,
      min: 1,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 30000,
    requestTimeout: 120000, // Longer timeout for migrations
  };

  if (useAzureAd) {
    console.log('Using Azure AD authentication for database');
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://database.windows.net/');
    return {
      ...baseConfig,
      authentication: {
        type: 'azure-active-directory-access-token',
        options: {
          token: tokenResponse.token,
        },
      },
    };
  } else {
    console.log('Using SQL authentication for database');
    return {
      ...baseConfig,
      user: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || '',
    };
  }
};

async function createMigrationsTable(pool: ConnectionPool): Promise<void> {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Migrations')
    BEGIN
      CREATE TABLE Migrations (
        MigrationID INT IDENTITY(1,1) PRIMARY KEY,
        MigrationName VARCHAR(255) NOT NULL UNIQUE,
        AppliedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE()
      );
      PRINT 'Created Migrations tracking table';
    END
  `);
}

async function getAppliedMigrations(pool: ConnectionPool): Promise<Set<string>> {
  const result = await pool.request().query(`
    SELECT MigrationName FROM Migrations ORDER BY MigrationID
  `);
  return new Set(result.recordset.map((r: { MigrationName: string }) => r.MigrationName));
}

async function markMigrationApplied(pool: ConnectionPool, migrationName: string): Promise<void> {
  await pool.request()
    .input('name', sql.VarChar(255), migrationName)
    .query(`INSERT INTO Migrations (MigrationName) VALUES (@name)`);
}

function getMigrationFiles(): string[] {
  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Sort alphabetically (003, 004, 005, etc.)

  return files.map(f => path.join(migrationsDir, f));
}

async function runMigration(pool: ConnectionPool, filePath: string): Promise<void> {
  const sqlContent = fs.readFileSync(filePath, 'utf-8');

  // Split by GO statements (case insensitive, on its own line)
  const batches = sqlContent
    .split(/^\s*GO\s*$/im)
    .map(batch => batch.trim())
    .filter(batch => batch.length > 0);

  console.log(`  Running ${batches.length} batch(es)...`);

  for (let i = 0; i < batches.length; i++) {
    try {
      await pool.request().query(batches[i]);
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`  Error in batch ${i + 1}:`, err.message);
      throw error;
    }
  }
}

async function migrate(): Promise<void> {
  let pool: ConnectionPool | null = null;

  try {
    console.log('='.repeat(60));
    console.log('MiraVista Timesheet - Database Migration Runner');
    console.log('='.repeat(60));
    console.log('');

    const dbConfig = await getDbConfig();
    console.log(`Connecting to ${process.env.DB_SERVER}/${process.env.DB_NAME}...`);
    pool = await sql.connect(dbConfig);
    console.log('Connected successfully.\n');

    // Ensure Migrations table exists
    await createMigrationsTable(pool);

    // Get already applied migrations
    const applied = await getAppliedMigrations(pool);
    console.log(`Found ${applied.size} previously applied migration(s).\n`);

    // Get all migration files
    const migrationFiles = getMigrationFiles();
    console.log(`Found ${migrationFiles.length} migration file(s) in database/migrations/\n`);

    let appliedCount = 0;
    let skippedCount = 0;

    for (const filePath of migrationFiles) {
      const migrationName = path.basename(filePath);

      if (applied.has(migrationName)) {
        console.log(`[SKIP] ${migrationName} (already applied)`);
        skippedCount++;
        continue;
      }

      console.log(`[RUN]  ${migrationName}`);
      try {
        await runMigration(pool, filePath);
        await markMigrationApplied(pool, migrationName);
        console.log(`       ✓ Applied successfully\n`);
        appliedCount++;
      } catch (error: unknown) {
        const err = error as Error;
        console.error(`       ✗ FAILED: ${err.message}\n`);
        throw error;
      }
    }

    console.log('='.repeat(60));
    console.log(`Migration complete: ${appliedCount} applied, ${skippedCount} skipped`);
    console.log('='.repeat(60));

  } catch (error: unknown) {
    const err = error as Error;
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run migrations
migrate();
