import { executeQuery, executeTransaction, sql, DBConfig } from '@/lib/db';
import { VMS_INITIALIZATION_QUERIES, EXPECTED_CSV_HEADERS } from './schema';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';

export interface VMSUserData {
  User_Name: string;
  Full_name: string;
  Password?: string;
  Email_Id: string;
  Phone?: string;
  Role_ID?: number;
  Company_ID?: number;
  Status: string | number;
  UserType?: string;
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
export async function getVMSConfig(supabaseClient?: any): Promise<DBConfig> {
  const supabase = supabaseClient || await createClient();
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
export async function initializeVMSTables(config?: DBConfig, supabaseClient?: any): Promise<void> {
  const finalConfig = config || await getVMSConfig(supabaseClient);
  for (const query of VMS_INITIALIZATION_QUERIES) {
    try {
      await executeQuery(query, {}, finalConfig);
      console.log('[v0] VMS schema initialized');
    } catch (error: any) {
      // Table might already exist, continue
    }
  }

  // Ensure SyncBatchID column exists (Migration)
  try {
    const columns = await executeQuery(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserMaster' AND COLUMN_NAME = 'SyncBatchID'`,
      {},
      finalConfig
    );
    if (columns.length === 0) {
      await executeQuery(`ALTER TABLE UserMaster ADD SyncBatchID INT`, {}, finalConfig);
      console.log('[v0] Added SyncBatchID column to UserMaster');
    }
  } catch (error: any) {
    console.error('[v0] Error migrating SyncBatchID column:', error);
  }
}



/**
 * Check if VMS tables exist
 */
export async function checkVMSTablesExist(config?: DBConfig, supabaseClient?: any): Promise<boolean> {
  try {
    const finalConfig = config || await getVMSConfig(supabaseClient);
    const result = await executeQuery(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserMaster'`,
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
    if (!row.Email_Id || typeof row.Email_Id !== 'string') {
      errors.push(`Row ${index + 1}: Email_Id is required and must be a string`);
    }

    if (row.Email_Id && !isValidEmail(row.Email_Id)) {
      errors.push(`Row ${index + 1}: Invalid email format`);
    }

    // Status in template can be numeric or string
    if (row.Status === undefined || row.Status === null) {
      errors.push(`Row ${index + 1}: Status is required`);
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
  config?: DBConfig,
  supabaseClient?: any
): Promise<SyncResult> {
  const batchId = crypto.randomBytes(8).toString('hex');
  let successCount = 0;
  let syncId = '';

  const finalConfig = config || await getVMSConfig(supabaseClient);

  // Create Supabase client
  const supabase = supabaseClient || await createClient();

  // Insert sync history record into Supabase (public.sync_history)
  const { data: historyData, error: historyError } = await supabase
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

  if (historyError) {
    console.error('[v0] Error creating sync history in Supabase:', historyError);
    // Continue anyway, but syncId will be empty
  }

  syncId = historyData?.id || '';

  const current_errors: Array<{ row: number; message: string; data: string }> = [];

  await executeTransaction(async (request) => {
    for (let i = 0; i < users.length; i++) {
      // ... (UserDB insertion logic remains same, but we need to ensure batchId fits if it's used in SQL)
      // SQL Server UserMaster has SyncBatchID (INT). Our batchId is hex string.
      // Original code: parseInt(batchId, 16) % 2147483647

      const user = users[i];

      try {
        request.input(`userName`, sql.NVarChar(255), user.User_Name || '');
        request.input(`email`, sql.NVarChar(255), user.Email_Id);
        request.input(`fullName`, sql.NVarChar(255), user.Full_name || '');
        request.input(`password`, sql.NVarChar(255), user.Password || '');
        request.input(`phone`, sql.NVarChar(50), user.Phone || '');
        request.input(`roleId`, sql.Int, user.Role_ID || 0);
        request.input(`companyId`, sql.Int, user.Company_ID || 0);
        request.input(`status`, sql.Int, typeof user.Status === 'number' ? user.Status : (user.Status === 'Active' ? 1 : 0));
        request.input(`userType`, sql.NVarChar(100), user.UserType || '');

        await request.query(
          `INSERT INTO UserMaster (User_Name, Email_Id, Full_name, Password, Phone, Role_ID, Company_ID, Status, UserType)
           VALUES (@email, @email, @fullName, @password, @phone, @roleId, @companyId, @status, @userType)`
        );

        successCount++;
      } catch (error: any) {


        console.log("🚀 ~ syncUserData ~ error:", error)

        const errorDetail = {
          row: i + 1,
          message: error.message || 'Failed to insert record',
          data: JSON.stringify(user),
        };
        current_errors.push(errorDetail);

        // Insert error log into Supabase
        // TODO: Update error log schema to support UUID SyncID from public.sync_history
        /*
        if (syncId) {
          await supabase.from('VMS_SyncErrorLog').insert({
            SyncID: syncId, // Type mismatch: syncId is UUID, VMS_SyncErrorLog expects INT
            RowNumber: i + 1,
            ErrorMessage: error.message || 'Unknown error',
            ProblematicData: JSON.stringify(user),
          });
        }
        */
      }
    }
  }, finalConfig);


  const failureCount = current_errors.length;

  // Update sync history in Supabase with final counts
  if (syncId) {
    await supabase
      .from('sync_history')
      .update({
        success_count: successCount,
        failure_count: failureCount,
        status: failureCount === 0 ? 'Success' : 'Partial',
      })
      .eq('id', syncId);
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


export async function getSyncHistory(limit: number = 10, supabaseClient?: any): Promise<any[]> {
  try {
    const supabase = supabaseClient || await createClient();
    const { data, error } = await supabase
      .from('sync_history')
      .select('*')
      .eq('module_id', 'vms-plus-user-sync')
      .order('created_at', { ascending: false })
      .limit(limit);


    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching sync history from Supabase:', error);
    return [];
  }
}


/**
 * Get sync details including errors
 */
export async function getSyncDetails(syncId: string, supabaseClient?: any): Promise<any> {
  try {
    const supabase = supabaseClient || await createClient();

    // Fetch main sync record
    const { data: sync, error: syncError } = await supabase
      .from('sync_history')
      .select('*')
      .eq('id', syncId)
      .single();

    if (syncError || !sync) return null;

    // TODO: Fetch related errors from new error log table
    // const { data: errors, error: errorsError } = await supabase
    //   .from('VMS_SyncErrorLog')
    //   .select('*')
    //   .eq('SyncID', syncId);


    return {
      ...sync,
      errors: [], // Return empty errors for now
    };
  } catch (error) {
    console.error('[v0] Error fetching sync details from Supabase:', error);
    return null;
  }
}


