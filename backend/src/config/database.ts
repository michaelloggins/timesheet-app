import sql, { ConnectionPool, config as SqlConfig } from 'mssql';
import { logger } from '../utils/logger';

let pool: ConnectionPool | null = null;

const dbConfig: SqlConfig = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
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

export const connectDatabase = async (): Promise<ConnectionPool> => {
  try {
    if (pool && pool.connected) {
      return pool;
    }

    logger.info('Connecting to database...');
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
