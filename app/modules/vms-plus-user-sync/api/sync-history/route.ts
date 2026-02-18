import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSyncHistory, getSyncDetails } from '../../db/utils';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const syncId = searchParams.get('syncId');

    if (syncId) {
      // Get details for specific sync
      const details = await getSyncDetails(parseInt(syncId));
      if (!details) {
        return NextResponse.json({ error: 'Sync not found' }, { status: 404 });
      }

      return NextResponse.json({ data: details }, { status: 200 });
    }

    // Get sync history
    const history = await getSyncHistory(limit);

    return NextResponse.json({ data: history }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Sync history API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch sync history',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
