import dotenv from 'dotenv';
import sql, { ConnectionPool, config as SqlConfig } from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';
import { logger } from '../utils/logger';

// Load environment variables before database configuration
dotenv.config();

let pool: ConnectionPool | null = null;

// Determine authentication method
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
      max: 50,
      min: 5,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
  };

  if (useAzureAd) {
    // Use Azure AD authentication with DefaultAzureCredential
    logger.info('Using Azure AD authentication for database');
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
    // Use SQL authentication
    logger.info('Using SQL authentication for database');
    return {
      ...baseConfig,
      user: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || '',
    };
  }
};

export const connectDatabase = async (): Promise<ConnectionPool> => {
  try {
    if (pool && pool.connected) {
      return pool;
    }

    logger.info('Connecting to database...');
    const dbConfig = await getDbConfig();
    pool = await sql.connect(dbConfig);
    logger.info('Database connection successful');

    return pool;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

export const getPool = (): ConnectionPool => {
  if (!pool || !pool.connected) {
    throw new Error('Database pool is not initialized. Call connectDatabase first.');
  }
  return pool;
};

export const closeDatabase = async (): Promise<void> => {
  try {
    if (pool) {
      await pool.close();
      logger.info('Database connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

export { sql };
