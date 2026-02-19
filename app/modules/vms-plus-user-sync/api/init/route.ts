import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createClient } from '@/utils/supabase/server';
import { initializeVMSTables } from '../../db/utils';

export async function POST(request: NextRequest) {
  try {

    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize VMS tables (will fetch config from Supabase automatically if not provided)
    await initializeVMSTables();

    return NextResponse.json(
      {
        success: true,
        message: 'Database schema initialized successfully',
      },
      { status: 200 }
    );

  } catch (error: any) {

    console.error('[v0] Init API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize schema',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );

  }
}
