import { executeQuery, executeTransaction, sql } from '@/lib/db';
import { VMS_INITIALIZATION_QUERIES, EXPECTED_CSV_HEADERS } from './schema';
import crypto from 'crypto';

export interface VMSUserData {
  Email: string;
  FirstName: string;
  LastName: string;
  Department: string;
  Status: string;
}

export interface SyncResult {
  syncId: number;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ row: number; message: string; data: string }>;
  batchId: string;
}

/**
 * Initialize VMS User Sync tables in the database
 */
export async function initializeVMSTables(): Promise<void> {
  for (const query of VMS_INITIALIZATION_QUERIES) {
    try {
      await executeQuery(query);
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
export async function checkVMSTablesExist(): Promise<boolean> {
  try {
    const result = await executeQuery(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'VMS_Users'`
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

/**
 * Sync user data to database
 */
export async function syncUserData(
  users: VMSUserData[],
  fileName: string,
  uploadedBy: string
): Promise<SyncResult> {
  const batchId = crypto.randomBytes(8).toString('hex');
  const errors: Array<{ row: number; message: string; data: string }> = [];
  let successCount = 0;
  let syncId = 0;

  await executeTransaction(async (request) => {
    // Insert sync history record
    const historyInsert = await request.query(
      `INSERT INTO VMS_SyncHistory (FileName, TotalRecords, SuccessCount, FailureCount, Status, UploadedByUser, SyncBatchID)
       VALUES (@fileName, @total, @success, @failure, 'In Progress', @uploadedBy, @batchId);
       SELECT @@IDENTITY as SyncID`
    );

    request.input('fileName', sql.NVarChar(255), fileName);
    request.input('total', sql.Int, users.length);
    request.input('success', sql.Int, 0);
    request.input('failure', sql.Int, 0);
    request.input('uploadedBy', sql.NVarChar(255), uploadedBy);
    request.input('batchId', sql.NVarChar(50), batchId);

    const syncResult = await request.query(
      `INSERT INTO VMS_SyncHistory (FileName, TotalRecords, SuccessCount, FailureCount, Status, UploadedByUser, SyncBatchID)
       VALUES (@fileName, @total, 0, 0, @status, @uploadedBy, @batchId);
       SELECT @@IDENTITY as SyncID`
    );

    syncId = syncResult.recordset[0]?.SyncID || 0;

    // Insert user records
    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      try {
        request.input(`email_${i}`, sql.NVarChar(255), user.Email);
        request.input(`firstName_${i}`, sql.NVarChar(100), user.FirstName || '');
        request.input(`lastName_${i}`, sql.NVarChar(100), user.LastName || '');
        request.input(`department_${i}`, sql.NVarChar(100), user.Department || '');
        request.input(`status_${i}`, sql.NVarChar(50), user.Status || 'Active');
        request.input(`batchId_${i}`, sql.Int, syncId);

        await request.query(
          `INSERT INTO VMS_Users (Email, FirstName, LastName, Department, Status, SyncedFromFile, SyncBatchID)
           VALUES (@email_${i}, @firstName_${i}, @lastName_${i}, @department_${i}, @status_${i}, @fileName, @batchId_${i})`
        );

        successCount++;
      } catch (error: any) {
        errors.push({
          row: i + 1,
          message: error.message || 'Failed to insert record',
          data: JSON.stringify(user),
        });

        // Insert error log
        try {
          request.input(`errorRow_${i}`, sql.Int, i + 1);
          request.input(`errorMsg_${i}`, sql.NVarChar(sql.MAX), error.message || 'Unknown error');
          request.input(`errorData_${i}`, sql.NVarChar(sql.MAX), JSON.stringify(user));
          request.input(`syncId_${i}`, sql.Int, syncId);

          await request.query(
            `INSERT INTO VMS_SyncErrorLog (SyncID, RowNumber, ErrorMessage, ProblematicData)
             VALUES (@syncId_${i}, @errorRow_${i}, @errorMsg_${i}, @errorData_${i})`
          );
        } catch (logError) {
          console.error('[v0] Error logging sync error:', logError);
        }
      }
    }

    // Update sync history with final counts
    const failureCount = errors.length;
    request.input('finalSuccess', sql.Int, successCount);
    request.input('finalFailure', sql.Int, failureCount);
    request.input('finalStatus', sql.NVarChar(50), failureCount === 0 ? 'Success' : 'Partial');
    request.input('finalSyncId', sql.Int, syncId);

    await request.query(
      `UPDATE VMS_SyncHistory
       SET SuccessCount = @finalSuccess, FailureCount = @finalFailure, Status = @finalStatus
       WHERE SyncID = @finalSyncId`
    );
  });

  return {
    syncId,
    totalRecords: users.length,
    successCount,
    failureCount: errors.length,
    errors,
    batchId,
  };
}

/**
 * Get sync history for the module
 */
export async function getSyncHistory(limit: number = 10): Promise<any[]> {
  return executeQuery(
    `SELECT TOP ${limit} * FROM VMS_SyncHistory ORDER BY UploadedAt DESC`
  );
}

/**
 * Get sync details including errors
 */
export async function getSyncDetails(syncId: number): Promise<any> {
  const sync = await executeQuery(
    `SELECT * FROM VMS_SyncHistory WHERE SyncID = @syncId`,
    { syncId }
  );

  if (sync.length === 0) {
    return null;
  }

  const errors = await executeQuery(
    `SELECT * FROM VMS_SyncErrorLog WHERE SyncID = @syncId`,
    { syncId }
  );

  return { ...sync[0], errors };
}
