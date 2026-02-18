import { getConnection, executeQuery, sql } from '@/lib/db';
import { checkVMSTablesExist, initializeVMSTables } from './utils';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

export async function testDatabaseConnection(): Promise<TestResult> {
  const start = Date.now();
  try {
    const pool = await getConnection();
    const duration = Date.now() - start;
    return {
      name: 'Database Connection',
      passed: true,
      message: 'Successfully connected to SQL Server',
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'Database Connection',
      passed: false,
      message: `Connection failed: ${error.message}`,
      duration,
    };
  }
}

export async function testVMSTables(): Promise<TestResult> {
  const start = Date.now();
  try {
    const exists = await checkVMSTablesExist();
    const duration = Date.now() - start;

    if (!exists) {
      return {
        name: 'VMS Tables Check',
        passed: false,
        message: 'VMS tables do not exist. Click "Initialize Schema" to create them.',
        duration,
      };
    }

    return {
      name: 'VMS Tables Check',
      passed: true,
      message: 'VMS tables exist and are accessible',
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'VMS Tables Check',
      passed: false,
      message: `Failed to check tables: ${error.message}`,
      duration,
    };
  }
}

export async function testTableRecordCount(): Promise<TestResult> {
  const start = Date.now();
  try {
    const result = await executeQuery(
      'SELECT COUNT(*) as RecordCount FROM VMS_Users'
    );
    const count = result[0]?.RecordCount || 0;
    const duration = Date.now() - start;

    return {
      name: 'VMS Users Table Record Count',
      passed: true,
      message: `Table contains ${count} records`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'VMS Users Table Record Count',
      passed: false,
      message: `Failed to count records: ${error.message}`,
      duration,
    };
  }
}

export async function testInsertSampleData(): Promise<TestResult> {
  const start = Date.now();
  const timestamp = Date.now();
  const testEmail = `test_${timestamp}@example.com`;

  try {
    await executeQuery(
      `INSERT INTO VMS_Users (Email, FirstName, LastName, Department, Status, SyncedFromFile)
       VALUES (@email, @firstName, @lastName, @department, @status, @fileName)`,
      {
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        department: 'Testing',
        status: 'Active',
        fileName: 'Test Run',
      }
    );

    const duration = Date.now() - start;

    return {
      name: 'Insert Sample Data',
      passed: true,
      message: `Successfully inserted test record: ${testEmail}`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'Insert Sample Data',
      passed: false,
      message: `Failed to insert test data: ${error.message}`,
      duration,
    };
  }
}

export async function testTableSchema(): Promise<TestResult> {
  const start = Date.now();
  try {
    const columns = await executeQuery(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'VMS_Users' ORDER BY ORDINAL_POSITION`
    );

    const duration = Date.now() - start;

    if (columns.length === 0) {
      return {
        name: 'Table Schema Verification',
        passed: false,
        message: 'VMS_Users table not found',
        duration,
      };
    }

    const expectedColumns = ['UserID', 'Email', 'FirstName', 'LastName', 'Department', 'Status'];
    const foundColumns = columns.map((c: any) => c.COLUMN_NAME);
    const missingColumns = expectedColumns.filter((col) => !foundColumns.includes(col));

    if (missingColumns.length > 0) {
      return {
        name: 'Table Schema Verification',
        passed: false,
        message: `Missing columns: ${missingColumns.join(', ')}`,
        duration,
      };
    }

    return {
      name: 'Table Schema Verification',
      passed: true,
      message: `Schema verified. Found ${columns.length} columns`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'Table Schema Verification',
      passed: false,
      message: `Failed to verify schema: ${error.message}`,
      duration,
    };
  }
}

export async function runAllTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(await testDatabaseConnection());
  results.push(await testVMSTables());

  if (results[1].passed) {
    results.push(await testTableSchema());
    results.push(await testTableRecordCount());
    results.push(await testInsertSampleData());
  }

  return results;
}
