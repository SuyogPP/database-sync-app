import { NextRequest, NextResponse } from 'next/server';
import { createSession, validateCredentials } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const isValid = await validateCredentials(username, password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session
    const sessionId = await createSession(username, username);

    return NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Login API error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
