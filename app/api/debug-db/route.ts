import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
    try {
        const envKeys = Object.keys(process.env);

        const columns = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'UserMaster'
    `);

        return NextResponse.json({
            success: true,
            envKeys,
            columns
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            envKeys: Object.keys(process.env),
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
