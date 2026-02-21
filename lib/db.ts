let mssql: any = null;
let initError: any = null;

try {
  mssql = require('mssql');
} catch (error) {
  initError = error;
  console.warn('[v0] Warning: mssql module not available. Database operations will fail until configured.');
}

let connectionPool: any = null;
let currentConfigHash: string | null = null;

export interface DBConfig {
  server?: string;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
}

/**
 * Get a connection pool to SQL Server.
 * @param dynamicConfig - Optional configuration object. If provided (e.g., from Supabase), it overrides env vars.
 */
export async function getConnection(dynamicConfig?: DBConfig): Promise<any> {
  if (!mssql) {
    throw new Error(
      'SQL Server driver (mssql) is not properly configured. ' +
      'Please ensure SQL_SERVER environment variables are set.'
    );
  }

  const config = buildConnectionConfig(dynamicConfig);
  const configHash = JSON.stringify(config);

  // If config changed, close old pool
  if (connectionPool && currentConfigHash !== configHash) {
    console.log('[v0] Database configuration changed, closing existing pool');
    await closeConnection();
  }

  if (connectionPool && !connectionPool.closed) {
    return connectionPool;
  }

  try {
    connectionPool = new mssql.ConnectionPool(config);
    currentConfigHash = configHash;
    await connectionPool.connect();
    console.log('[v0] Database connection pool established');
    return connectionPool;
  } catch (error) {
    connectionPool = null;
    currentConfigHash = null;
    console.error('[v0] Database connection error:', error);
    throw new Error('Failed to connect to database. Check your connection configuration.');
  }
}

function buildConnectionConfig(dynamicConfig?: DBConfig): any {
  const connectionString = dynamicConfig?.connectionString || process.env.SQL_SERVER_CONNECTION_STRING;

  if (connectionString) {
    return {
      connectionString: connectionString,
      options: {
        trustServerCertificate: true,
        enableKeepAlive: true,
        connectionTimeout: 15000,
        requestTimeout: 30000,
      },
    };
  }

  // Fallback configuration
  return {
    server: dynamicConfig?.server || process.env.SQL_SERVER || 'localhost',
    database: dynamicConfig?.database || process.env.SQL_DATABASE || 'DataSyncDB',
    authentication: {
      type: 'default',
      options: {
        userName: dynamicConfig?.user || process.env.SQL_USER || 'sa',
        password: dynamicConfig?.password || process.env.SQL_PASSWORD || '',
      },
    },
    options: {
      trustServerCertificate: true,
      enableKeepAlive: true,
      connectionTimeout: 15000,
      requestTimeout: 30000,
    },
  };
}

export async function closeConnection(): Promise<void> {
  if (connectionPool && !connectionPool.closed) {
    try {
      await connectionPool.close();
      connectionPool = null;
      console.log('[v0] Database connection pool closed');
    } catch (error) {
      console.error('[v0] Error closing connection:', error);
    }
  }
}

export async function executeQuery<T = any>(
  query: string,
  params: Record<string, any> = {},
  dynamicConfig?: DBConfig
): Promise<T[]> {
  const pool = await getConnection(dynamicConfig);
  const request = pool.request();

  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });

  try {
    const result = await request.query(query);
    return (result.recordset || []) as T[];
  } catch (error) {
    console.error('[v0] Query execution error:', error);
    throw error;
  }
}

export async function executeTransaction(
  callback: (request: any) => Promise<void>,
  dynamicConfig?: DBConfig
): Promise<void> {
  if (!mssql) {
    throw new Error('SQL Server driver is not available');
  }

  const pool = await getConnection(dynamicConfig);
  const transaction = new mssql.Transaction(pool);

  try {
    await transaction.begin();
    const request = new mssql.Request(transaction);
    await callback(request);
    await transaction.commit();
    console.log('[v0] Transaction committed successfully');
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error('[v0] Error rolling back transaction:', rollbackError);
    }
    console.error('[v0] Transaction error:', error);
    throw error;
  }
}

export function sanitizeInput(input: string): string {
  return input.replace(/'/g, "''");
}

export { mssql as sql };