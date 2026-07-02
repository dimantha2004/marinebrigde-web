import { supabase } from '@/lib/supabase';
import { stopHeartbeat, removeActiveSession } from '@/lib/heartbeat';
import type { Profile, UserRole } from '@/types/database';

/**
 * Maps each role to the home route it should land on after sign-in.
 * Web routes (react-router). Mirrors the mobile ROLE_HOME table.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  captain: '/captain/dashboard',
  charter_party: '/charter-party/dashboard',
  ship_agent: '/ship-agent/hub',
  port_authority: '/port-authority/dashboard',
  supplier: '/supplier/dashboard',
  admin: '/admin/users',
};

export interface SignUpParams {
  email: string;
  username: string;
  password: string;
  full_name: string;
  role: UserRole;
  company_name?: string | null;
  phone?: string | null;
  [key: string]: unknown;
}

/** Remove any stale supabase auth keys from localStorage. */
function clearStoredSession(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('sb-')) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

/**
 * Create a new auth user. The signup metadata (full_name, role, company_name,
 * phone, username) is carried in options.data so the DB trigger can read it from
 * raw_user_meta_data and seed the profiles row.
 */
export async function signUp({
  email,
  username,
  password,
  full_name,
  role,
  company_name,
  phone,
  ...rest
}: SignUpParams): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role,
        username,
        company_name: company_name ?? null,
        phone: phone ?? null,
        ...rest,
      },
    },
  });
  return { error };
}

/**
 * Look up the email associated with a username, then sign in with that email.
 * Preserves the Supabase auth architecture (email-based) while exposing a
 * username-based login UX. The lookup uses a SECURITY DEFINER RPC.
 */
export async function signIn(
  username: string,
  password: string
): Promise<{ error: Error | null }> {
  await supabase.auth.signOut({ scope: 'local' });
  clearStoredSession();

  const { data: email, error: lookupError } = await supabase.rpc('get_email_by_username', {
    p_username: username,
  });

  if (lookupError) {
    return { error: new Error(`Login lookup failed: ${lookupError.message}`) };
  }
  if (!email) {
    return { error: new Error('No account found with that username.') };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

/** Attempt sign-in directly with email (legacy/fallback path). */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error: Error | null }> {
  await supabase.auth.signOut({ scope: 'local' });
  clearStoredSession();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signOut(): Promise<{ error: Error | null }> {
  await removeActiveSession();
  stopHeartbeat();

  const { error } = await supabase.auth.signOut({ scope: 'global' });
  clearStoredSession();
  return { error };
}

/** Force-clear all auth state locally without a server round-trip. */
export async function forceClearAuth(): Promise<void> {
  stopHeartbeat();
  await removeActiveSession();
  await supabase.auth.signOut({ scope: 'local' });
  clearStoredSession();
}

/** Fetch the profile row for a user id. */
export async function getProfile(
  userId: string
): Promise<{ data: Profile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data: data ?? null, error };
}
