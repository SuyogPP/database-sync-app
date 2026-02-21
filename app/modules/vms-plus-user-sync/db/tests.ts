import { getConnection, executeQuery, sql, DBConfig } from '@/lib/db';
import { checkVMSTablesExist, initializeVMSTables, getVMSConfig, syncUserData, VMSUserData } from './utils';
import { createClient } from '@/utils/supabase/server';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

export async function testSupabaseConnection(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('module_configs').select('id', { count: 'exact', head: true }).limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found", which is fine for connection test
      throw error;
    }

    const duration = Date.now() - start;
    return {
      name: 'Supabase Connection',
      passed: true,
      message: 'Successfully connected to Supabase',
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'Supabase Connection',
      passed: false,
      message: `Supabase connection failed: ${error.message}`,
      duration,
    };
  }
}

export async function testSupabaseTables(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabase = await createClient();

    // Check required tables
    const tables = ['module_configs', 'sync_history'];

    const missing = [];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true }).limit(1);
      if (error && error.code !== 'PGRST116') {
        missing.push(table);
      }
    }

    const duration = Date.now() - start;
    if (missing.length > 0) {
      return {
        name: 'Supabase Tables Check',
        passed: false,
        message: `Required tables missing or inaccessible: ${missing.join(', ')}`,
        duration,
      };
    }

    return {
      name: 'Supabase Tables Check',
      passed: true,
      message: 'All required Supabase tables are accessible',
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'Supabase Tables Check',
      passed: false,
      message: `Failed to check Supabase tables: ${error.message}`,
      duration,
    };
  }
}

export async function testDatabaseConnection(config?: DBConfig): Promise<TestResult> {
  const start = Date.now();
  try {
    const finalConfig = config || await getVMSConfig();
    await getConnection(finalConfig);
    const duration = Date.now() - start;
    return {
      name: 'SQL Server Connection',
      passed: true,
      message: 'Successfully connected to SQL Server (via Supabase config)',
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'SQL Server Connection',
      passed: false,
      message: `Connection failed: ${error.message}`,
      duration,
    };
  }
}

export async function testVMSTables(config?: DBConfig): Promise<TestResult> {
  const start = Date.now();
  try {
    const finalConfig = config || await getVMSConfig();
    const exists = await checkVMSTablesExist(finalConfig);
    const duration = Date.now() - start;

    if (!exists) {
      return {
        name: 'VMS Tables Check (SQL Server)',
        passed: false,
        message: 'VMS tables do not exist in SQL Server. Click "Initialize Schema" to create them.',
        duration,
      };
    }

    return {
      name: 'VMS Tables Check (SQL Server)',
      passed: true,
      message: 'VMS tables exist and are accessible in SQL Server',
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'VMS Tables Check (SQL Server)',
      passed: false,
      message: `Failed to check tables: ${error.message}`,
      duration,
    };
  }
}

export async function testTableRecordCount(config?: DBConfig): Promise<TestResult> {
  const start = Date.now();
  try {
    const finalConfig = config || await getVMSConfig();
    const result = await executeQuery(
      'SELECT COUNT(*) as RecordCount FROM UserMaster',
      {},
      finalConfig
    );
    const count = result[0]?.RecordCount || 0;
    const duration = Date.now() - start;

    return {
      name: 'VMS Users Record Count',
      passed: true,
      message: `SQL Server table contains ${count} records`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'VMS Users Record Count',
      passed: false,
      message: `Failed to count records: ${error.message}`,
      duration,
    };
  }
}

export async function testInsertSampleData(config?: DBConfig): Promise<TestResult> {
  const start = Date.now();
  const timestamp = Date.now();
  const testEmail = `test_${timestamp}@example.com`;

  try {
    const finalConfig = config || await getVMSConfig();
    await executeQuery(
      `INSERT INTO UserMaster (Email_Id, Full_name, Dept_Name, Status)
           VALUES (@email, @name, @department, @status)`,
      {
        email: testEmail,
        name: 'Test User',
        department: 'Testing',
        status: 1,
      },
      finalConfig
    );

    const duration = Date.now() - start;

    return {
      name: 'Insert Sample Data (SQL Server)',
      passed: true,
      message: `Successfully inserted test record: ${testEmail}`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'Insert Sample Data (SQL Server)',
      passed: false,
      message: `Failed to insert test data: ${error.message}`,
      duration,
    };
  }
}

export async function testTableSchema(config?: DBConfig): Promise<TestResult> {
  const start = Date.now();
  try {
    const finalConfig = config || await getVMSConfig();
    const columns = await executeQuery(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserMaster' ORDER BY ORDINAL_POSITION`,
      {},
      finalConfig
    );

    const duration = Date.now() - start;

    if (columns.length === 0) {
      return {
        name: 'Table Schema Verification',
        passed: false,
        message: 'UserMaster table not found',
        duration,
      };
    }

    const expectedColumns = ['User_Id', 'User_Name', 'Email_Id', 'Full_name', 'Company_ID', 'Dept_Name', 'Status'];

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

export async function debugUserTypeSchema(config?: DBConfig, supabaseClient?: any): Promise<TestResult> {
  const start = Date.now();
  try {
    const finalConfig = config || await getVMSConfig(supabaseClient);
    const result = await executeQuery(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserMaster' AND COLUMN_NAME = 'UserType'`,
      {},
      finalConfig
    );

    const duration = Date.now() - start;

    if (result.length > 0) {
      return {
        name: 'Debug UserType Schema',
        passed: true,
        message: `UserType Column Data Type: ${result[0].DATA_TYPE}`,
        duration,
      };
    } else {
      return {
        name: 'Debug UserType Schema',
        passed: false,
        message: 'UserType column not found',
        duration,
      };
    }
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'Debug UserType Schema',
      passed: false,
      message: `Failed to check schema: ${error.message}`,
      duration,
    };
  }
}

export async function testSyncHistoryLogging(config?: DBConfig, supabaseClient?: any): Promise<TestResult> {
  const start = Date.now();
  try {
    const mockUsers: VMSUserData[] = [{
      User_Name: 'Start_Test_User',
      Full_name: 'Start Test User',
      Email_Id: `start_test_${Date.now()}@example.com`,
      Status: 'Active',
      Password: 'password',
      Phone: '1234567890',
      Role_ID: 1,
      Company_ID: 1,
      UserType: 'Test'
    }];

    const result = await syncUserData(mockUsers, 'automated_test.xlsx', 'System Test', config, supabaseClient);

    const duration = Date.now() - start;

    if (result.syncId) {
      return {
        name: 'Sync History Logging (public.sync_history)',
        passed: true,
        message: `Successfully logged sync history. ID: ${result.syncId}`,
        duration,
      };
    } else {
      return {
        name: 'Sync History Logging (public.sync_history)',
        passed: false,
        message: 'SyncUserData executed but returned no syncId',
        duration,
      };
    }
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: 'Sync History Logging (public.sync_history)',
      passed: false,
      message: `Failed to log sync history: ${error.message}`,
      duration,
    };
  }
}

export async function runAllTests(config?: DBConfig): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    const finalConfig = config || await getVMSConfig();

    console.log("🚀 ~ runAllTests ~ finalConfig:", finalConfig)

    // Infrastructure Tests
    results.push(await testSupabaseConnection());
    results.push(await testSupabaseTables());

    // SQL Server Tests (Target Database)
    results.push(await testDatabaseConnection(finalConfig));
    results.push(await testVMSTables(finalConfig));

    if (results[3].passed) {
      results.push(await testTableSchema(finalConfig));
      results.push(await testTableRecordCount(finalConfig));
      results.push(await testInsertSampleData(finalConfig));
      // Add the new test
      results.push(await testSyncHistoryLogging(finalConfig));
    }

  } catch (error: any) {
    results.push({
      name: 'Configuration Check',
      passed: false,
      message: `Failed to fetch module configuration: ${error.message}`,
      duration: 0,
    });
  }

  return results;
}

