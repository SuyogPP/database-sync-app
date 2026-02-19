import { executeQuery, executeTransaction, sql, DBConfig } from '@/lib/db';
import { VMS_INITIALIZATION_QUERIES, EXPECTED_CSV_HEADERS } from './schema';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';

export interface VMSUserData {
  Email: string;
  FirstName: string;
  LastName: string;
  Department: string;
  Status: string;
}

export interface SyncResult {
  syncId: string;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ row: number; message: string; data: string }>;
  batchId: string;
}

/**
 * Fetch module configuration from Supabase
 */
export async function getVMSConfig(): Promise<DBConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('module_configs')
    .select('config')
    .eq('module_id', 'vms-plus-user-sync')
    .single();

  if (error) {
    console.error('[v0] Error fetching module config:', error);
    throw new Error('Failed to fetch module configuration from Supabase. Please ensure the database is configured in the module settings.');
  }

  if (!data?.config) {
    throw new Error('Module configuration not found in Supabase.');
  }

  return data.config as DBConfig;
}

/**
 * Initialize VMS User Sync tables in the database
 */
export async function initializeVMSTables(config?: DBConfig): Promise<void> {
  const finalConfig = config || await getVMSConfig();
  for (const query of VMS_INITIALIZATION_QUERIES) {
    try {
      await executeQuery(query, {}, finalConfig);
      console.log('[v0] VMS schema initialized');
    } catch (error: any) {
      // Table might already exist, continue
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
  }
}

/**
 * Check if VMS tables exist
 */
export async function checkVMSTablesExist(config?: DBConfig): Promise<boolean> {
  try {
    const finalConfig = config || await getVMSConfig();
    const result = await executeQuery(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'VMS_Users'`,
      {},
      finalConfig
    );
    return result.length > 0;
  } catch (error) {
    console.error('[v0] Error checking VMS tables:', error);
    return false;
  }
}

/**
 * Validate CSV data against expected format
 */
export function validateCSVData(data: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(data) || data.length === 0) {
    errors.push('CSV file is empty');
    return { valid: false, errors };
  }

  // Check headers
  const firstRow = data[0];
  const headers = Object.keys(firstRow);
  const missingHeaders = EXPECTED_CSV_HEADERS.filter((h) => !headers.includes(h));

  if (missingHeaders.length > 0) {
    errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
  }

  // Validate each row
  data.forEach((row, index) => {
    if (!row.Email || typeof row.Email !== 'string') {
      errors.push(`Row ${index + 1}: Email is required and must be a string`);
    }

    if (row.Email && !isValidEmail(row.Email)) {
      errors.push(`Row ${index + 1}: Invalid email format`);
    }

    if (!row.Status || !['Active', 'Inactive', 'Pending'].includes(row.Status)) {
      errors.push(`Row ${index + 1}: Status must be Active, Inactive, or Pending`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function syncUserData(
  users: VMSUserData[],
  fileName: string,
  uploadedBy: string,
  config?: DBConfig
): Promise<SyncResult> {
  const batchId = crypto.randomBytes(8).toString('hex');
  let successCount = 0;
  let syncId = '';

  const supabase = await createClient();

  // Insert sync history record into Supabase
  const { data: syncEntry, error: syncError } = await supabase
    .from('sync_history')
    .insert({
      module_id: 'vms-plus-user-sync',
      file_name: fileName,
      total_records: users.length,
      status: 'In Progress',
      uploaded_by: uploadedBy,
      batch_id: batchId,
    })
    .select()
    .single();

  if (syncError) {
    console.error('[v0] Error creating sync history in Supabase:', syncError);
    throw new Error('Failed to initialize sync history in Supabase');
  }

  syncId = syncEntry.id;

  const current_errors: Array<{ row: number; message: string; data: string }> = [];
  const finalConfig = config || await getVMSConfig();

  await executeTransaction(async (request) => {
    // We still keep SQL Server logic for user data indexing
    // but we use the Supabase UUID as a reference if needed, 
    // though SQL Server expects INT for SyncBatchID in VMS_Users schema.
    // Let's check schema again. VMS_Users has SyncBatchID INT.
    // Wait, VMS_SyncHistory in SQL Server has SyncBatchID INT UNIQUE.
    // In current code: request.input('batchId', sql.NVarChar(50), batchId); 
    // And batchId is hex string. So schema says INT but code uses NVarChar(50).

    // Insert user records into SQL Server
    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      try {
        request.clear();
        request.input(`email`, sql.NVarChar(255), user.Email);
        request.input(`firstName`, sql.NVarChar(100), user.FirstName || '');
        request.input(`lastName`, sql.NVarChar(100), user.LastName || '');
        request.input(`department`, sql.NVarChar(100), user.Department || '');
        request.input(`status`, sql.NVarChar(50), user.Status || 'Active');
        request.input(`fileName`, sql.NVarChar(255), fileName);
        // We use a numeric hash or something for SQL Server if it really needs INT,
        // but the current code uses the hex string.
        // Actually, let's just stick to the current SQL Server logic for users 
        // but use the Supabase syncId for history.

        await request.query(
          `INSERT INTO VMS_Users (Email, FirstName, LastName, Department, Status, SyncedFromFile)
           VALUES (@email, @firstName, @lastName, @department, @status, @fileName)`
        );

        successCount++;
      } catch (error: any) {
        const errorDetail = {
          row: i + 1,
          message: error.message || 'Failed to insert record',
          data: JSON.stringify(user),
        };
        current_errors.push(errorDetail);

        // Insert error log into Supabase
        await supabase.from('sync_error_log').insert({
          sync_id: syncId,
          row_number: i + 1,
          error_message: error.message || 'Unknown error',
          problematic_data: user,
        });
      }
    }
  }, finalConfig);

  // Update sync history in Supabase with final counts
  const failureCount = current_errors.length;
  const { error: updateError } = await supabase
    .from('sync_history')
    .update({
      success_count: successCount,
      failure_count: failureCount,
      status: failureCount === 0 ? 'Success' : 'Partial',
    })
    .eq('id', syncId);

  if (updateError) {
    console.error('[v0] Error updating sync history in Supabase:', updateError);
  }

  return {
    syncId,
    totalRecords: users.length,
    successCount,
    failureCount,
    errors: current_errors,
    batchId,
  };
}

export async function getSyncHistory(limit: number = 10, _config?: DBConfig): Promise<any[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sync_history')
    .select('*')
    .eq('module_id', 'vms-plus-user-sync')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[v0] Error fetching sync history from Supabase:', error);
    return [];
  }

  return data;
}

/**
 * Get sync details including errors
 */
export async function getSyncDetails(syncId: string, _config?: DBConfig): Promise<any> {
  const supabase = await createClient();
  const { data: sync, error: syncError } = await supabase
    .from('sync_history')
    .select('*')
    .eq('id', syncId)
    .single();

  if (syncError || !sync) {
    console.error('[v0] Error fetching sync details from Supabase:', syncError);
    return null;
  }

  const { data: errors, error: errorLogError } = await supabase
    .from('sync_error_log')
    .select('*')
    .eq('sync_id', syncId);

  if (errorLogError) {
    console.error('[v0] Error fetching sync error logs from Supabase:', errorLogError);
  }

  return { ...sync, errors: errors || [] };
}
