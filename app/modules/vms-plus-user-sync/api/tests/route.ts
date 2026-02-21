import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createClient } from '@/utils/supabase/server';
import { runAllTests } from '../../db/tests';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    // const session = await getSession();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Run all tests (will fetch config from Supabase automatically if not provided)
    const results = await runAllTests();

    return NextResponse.json(
      { success: true, results },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[v0] Tests API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to run tests',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
