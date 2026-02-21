import { createClient } from '@/utils/supabase/server';

export interface Session {
  userId: string;
  email: string | undefined;
}

export async function createSession(userId: string, email: string) {
  // Supabase handles session creation via signIn methods
  return;
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
  };
}

export async function destroySession(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function validateCredentials(
  username: string,
  password: string
): Promise<boolean> {
  // Deprecated: use supabase.auth.signInWithPassword instead
  return false;
}
