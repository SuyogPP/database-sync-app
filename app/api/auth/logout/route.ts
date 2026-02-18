import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    await destroySession();

    return NextResponse.json(
      { success: true, message: 'Logout successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Logout API error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
