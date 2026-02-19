import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { getSession } from '@/lib/session';
import {
  validateCSVData,
  syncUserData,
  checkVMSTablesExist,
  initializeVMSTables,
  VMSUserData,
} from '../../db/utils';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if VMS tables exist, initialize if not (will fetch config from Supabase automatically if not provided)
    const tablesExist = await checkVMSTablesExist();
    if (!tablesExist) {
      console.log('[v0] VMS tables do not exist, initializing...');
      await initializeVMSTables();
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');

    if (!isExcel && !isCSV) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload an Excel or CSV file.' },
        { status: 400 }
      );
    }

    // Read file content
    const buffer = await file.arrayBuffer();

    let users: VMSUserData[] = [];

    if (isExcel) {
      // Parse Excel file
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      users = jsonData.map((row: any) => ({
        Email: row.Email || '',
        FirstName: row.FirstName || '',
        LastName: row.LastName || '',
        Department: row.Department || '',
        Status: row.Status || 'Active',
      }));
    } else if (isCSV) {
      // Parse CSV file
      const text = new TextDecoder().decode(buffer);
      const parseResult = await new Promise<any>((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results: any) => resolve(results),
          error: (error: any) => reject(error),
        });
      });

      users = parseResult.data.map((row: any) => ({
        Email: row.Email || '',
        FirstName: row.FirstName || '',
        LastName: row.LastName || '',
        Department: row.Department || '',
        Status: row.Status || 'Active',
      }));
    }

    // Validate CSV data
    const validation = validateCSVData(users);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Sync data to database
    const result = await syncUserData(users, file.name, session.email || 'Anonymous');

    return NextResponse.json(
      {
        success: true,
        message: 'File processed successfully',
        data: {
          syncId: result.syncId,
          batchId: result.batchId,
          totalRecords: result.totalRecords,
          successCount: result.successCount,
          failureCount: result.failureCount,
          errors: result.errors,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[v0] Upload API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process file',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
