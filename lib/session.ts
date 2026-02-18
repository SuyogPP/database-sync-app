import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'datasync_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-change-this';

export interface Session {
  userId: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

export async function createSession(userId: string, username: string): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

  const session: Session = {
    userId,
    username,
    createdAt: now,
    expiresAt,
  };

  sessions.set(sessionId, session);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  });

  return sessionId;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    sessions.delete(sessionId);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function validateCredentials(
  username: string,
  password: string
): Promise<boolean> {
  // Simple validation - in production, hash and compare passwords
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  return username === adminUsername && password === adminPassword;
}
