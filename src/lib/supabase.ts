/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Note, TodoTask, WorkLog, UserSession, UserRole, UserProfile } from '../types';
import { INITIAL_NOTES, INITIAL_TODOS, INITIAL_WORKLOGS } from '../data/initialData';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_ADMIN_EMAIL, EMAIL_REDIRECT_URL } from './config';

export { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_ADMIN_EMAIL, EMAIL_REDIRECT_URL };

// Storage keys for custom client config and session
const STORAGE_KEY_URL = 'workspace_supabase_url';
const STORAGE_KEY_KEY = 'workspace_supabase_anon_key';
const STORAGE_KEY_USER = 'workspace_current_user';
const STORAGE_KEY_PROFILES = 'workspace_profiles_list';

// Dynamic & Stored Supabase Config reader
export function getStoredSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  let url = SUPABASE_URL;
  let anonKey = SUPABASE_ANON_KEY;

  try {
    const localUrl = localStorage.getItem(STORAGE_KEY_URL);
    const localKey = localStorage.getItem(STORAGE_KEY_KEY);
    if (localUrl && localUrl.trim() && !localUrl.includes('your-project') && !localUrl.includes('placeholder')) {
      url = localUrl.trim();
    } else if (localUrl && (localUrl.includes('your-project') || localUrl.includes('placeholder'))) {
      localStorage.removeItem(STORAGE_KEY_URL);
    }

    if (localKey && localKey.trim() && !localKey.includes('your-anon') && !localKey.includes('placeholder')) {
      anonKey = localKey.trim();
    } else if (localKey && (localKey.includes('your-anon') || localKey.includes('placeholder'))) {
      localStorage.removeItem(STORAGE_KEY_KEY);
    }
  } catch {
    // Ignore localStorage access issues in iframe/strict modes
  }

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('your-project') &&
    !url.includes('placeholder') &&
    !anonKey.includes('your-anon') &&
    url.startsWith('http')
  );

  return { url, anonKey, isConfigured };
}

// Check if valid live Supabase credentials are configured
export function isSupabaseConfigured(): boolean {
  return getStoredSupabaseConfig().isConfigured;
}

let activeClient: SupabaseClient | null = null;
let activeConfigString = '';

export function getSupabase(): SupabaseClient {
  const { url, anonKey } = getStoredSupabaseConfig();
  const configSignature = `${url}_${anonKey}`;
  if (!activeClient || activeConfigString !== configSignature) {
    activeClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    activeConfigString = configSignature;
  }
  return activeClient;
}

// Direct centralized Supabase client instance
export const supabase: SupabaseClient = getSupabase();

export function saveSupabaseConfig(url: string, anonKey: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  } catch (e) {
    console.warn('Could not persist Supabase config to localStorage', e);
  }
  activeClient = null;
  activeConfigString = '';
}

export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  } catch (e) {
    console.warn('Could not clear Supabase config from localStorage', e);
  }
  activeClient = null;
  activeConfigString = '';
}

// Helper to format friendly connection errors
function formatSupabaseAuthError(err: unknown, defaultMsg: string): string {
  const rawMsg = err instanceof Error ? err.message : String(err || defaultMsg);
  const lower = rawMsg.toLowerCase();

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('err_name_not_resolved') ||
    lower.includes('load failed')
  ) {
    return 'Unable to connect to Supabase backend. Please verify your Supabase URL and Anon Key in config.ts or click "Setup Supabase".';
  }

  return rawMsg;
}

// -----------------------------------------------------------------------------
// Profiles & RBAC Operations (Role Check on Login)
// -----------------------------------------------------------------------------

export async function fetchUserProfile(
  userId: string,
  email?: string,
  fullName?: string
): Promise<{ role: UserRole; profile: UserProfile | null }> {
  const supabase = getSupabase();
  const trimmedEmail = (email || '').trim().toLowerCase();

  // If Supabase is connected, fetch live profile from profiles table
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        const role: UserRole = data.role === 'admin' ? 'admin' : 'user';
        const profile: UserProfile = {
          id: data.id,
          email: data.email || trimmedEmail,
          fullName: data.full_name || fullName,
          role,
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at,
        };
        saveLocalProfile(profile);
        return { role, profile };
      }

      // If profile record was not created yet (e.g. trigger not yet set up), auto-create one
      const defaultRole: UserRole = trimmedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
      const newProfile: UserProfile = {
        id: userId,
        email: trimmedEmail,
        fullName: fullName || trimmedEmail.split('@')[0],
        role: defaultRole,
        createdAt: new Date().toISOString(),
      };

      await supabase.from('profiles').upsert(
        {
          id: userId,
          email: trimmedEmail,
          full_name: newProfile.fullName,
          role: defaultRole,
          created_at: newProfile.createdAt,
        },
        { onConflict: 'id' }
      );

      saveLocalProfile(newProfile);
      return { role: defaultRole, profile: newProfile };
    } catch (err) {
      console.warn('Error fetching profile from Supabase:', err);
    }
  }

  // Fallback to local profiles list
  const localProfiles = getLocalProfiles();
  const existing = localProfiles.find((p) => p.id === userId || p.email === trimmedEmail);

  if (existing) {
    return { role: existing.role, profile: existing };
  }

  const defaultRole: UserRole = trimmedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
  const fallbackProfile: UserProfile = {
    id: userId,
    email: trimmedEmail,
    fullName: fullName || trimmedEmail.split('@')[0],
    role: defaultRole,
    createdAt: new Date().toISOString(),
  };
  saveLocalProfile(fallbackProfile);

  return { role: defaultRole, profile: fallbackProfile };
}

export async function fetchAllProfiles(): Promise<UserProfile[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: UserProfile[] = data.map((d: any) => ({
          id: d.id,
          email: d.email || '',
          fullName: d.full_name || '',
          role: (d.role === 'admin' ? 'admin' : 'user') as UserRole,
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at,
        }));
        // Update local cache
        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(mapped));
        return mapped;
      }
    } catch (e) {
      console.warn('Error fetching all profiles from Supabase:', e);
    }
  }

  return getLocalProfiles();
}

export async function updateUserRoleInDb(userId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.warn('Supabase update user role error:', error.message);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update role in Supabase' };
    }
  }

  // Update local profiles cache
  const localProfiles = getLocalProfiles();
  const index = localProfiles.findIndex((p) => p.id === userId);
  if (index !== -1) {
    localProfiles[index].role = newRole;
    localProfiles[index].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(localProfiles));
  }

  // If currently active user was updated, refresh stored user
  const currentUser = getCurrentStoredUser();
  if (currentUser && currentUser.id === userId) {
    currentUser.role = newRole;
    storeLocalUser(currentUser);
  }

  return { success: true };
}

function getLocalProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading local profiles', e);
  }

  // Initial administrator profile
  const defaults: UserProfile[] = [
    {
      id: 'admin_workspace_owner',
      email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
      fullName: 'Manas Traders (Admin)',
      role: 'admin',
      createdAt: '2026-08-01T10:00:00Z',
    },
  ];
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(defaults));
  return defaults;
}

function saveLocalProfile(profile: UserProfile) {
  try {
    const profiles = getLocalProfiles();
    const index = profiles.findIndex((p) => p.id === profile.id || p.email === profile.email);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...profile };
    } else {
      profiles.push(profile);
    }
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.error('Error saving local profile', e);
  }
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Authentication Operations (Strict Supabase Auth with RLS)
// -----------------------------------------------------------------------------

export async function signUpUser(
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: UserSession | null; error: string | null; needsVerification?: boolean }> {
  const supabase = getSupabase();
  const trimmedEmail = email.trim().toLowerCase();

  if (!supabase) {
    return {
      user: null,
      error: 'Supabase client is not available.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: EMAIL_REDIRECT_URL,
        data: {
          full_name: fullName || trimmedEmail.split('@')[0],
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return {
          user: null,
          error: 'This email is already registered. Please switch to the Sign In tab to log in.',
        };
      }
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'Failed to create user account in Supabase.' };
    }

    // Check if account already existed (Supabase returns empty identities array when email is already taken)
    if (data.user.identities && data.user.identities.length === 0) {
      return {
        user: null,
        error: 'An account with this email address already exists. Please sign in instead.',
      };
    }

    // Ensure user is signed out immediately so they cannot enter workspace until verified
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEY_USER);

    // Return success indicating verification link has been sent
    return {
      user: null,
      error: null,
      needsVerification: true,
    };
  } catch (err: unknown) {
    const errorMessage = formatSupabaseAuthError(err, 'Error communicating with Supabase auth');
    return { user: null, error: errorMessage };
  }
}

export async function signInUser(
  email: string,
  password: string
): Promise<{ user: UserSession | null; error: string | null; unverified?: boolean }> {
  const supabase = getSupabase();
  const trimmedEmail = email.trim().toLowerCase();

  if (!supabase) {
    return {
      user: null,
      error: 'Supabase client is not available.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      if (
        error.message.toLowerCase().includes('invalid login credentials') ||
        error.message.toLowerCase().includes('invalid credentials')
      ) {
        return {
          user: null,
          error: 'Invalid email or password. Please verify your credentials or sign up first.',
        };
      }
      if (error.message.toLowerCase().includes('email not confirmed') || error.message.toLowerCase().includes('not verified')) {
        await supabase.auth.signOut();
        localStorage.removeItem(STORAGE_KEY_USER);
        return {
          user: null,
          error: 'Your email is not verified yet. Please check your inbox and confirm your email first.',
          unverified: true,
        };
      }
      return { user: null, error: formatSupabaseAuthError(error, error.message) };
    }

    if (!data.user) {
      return {
        user: null,
        error: 'Authentication failed: No user account found.',
      };
    }

    // Strict Email Verification check
    const isEmailConfirmed = Boolean(data.user.email_confirmed_at || (data.user as unknown as { confirmed_at?: string }).confirmed_at);
    if (!isEmailConfirmed) {
      // Immediately log out unverified user to prevent session hijacking
      await supabase.auth.signOut();
      localStorage.removeItem(STORAGE_KEY_USER);
      return {
        user: null,
        error: 'Your email is not verified yet. Please check your inbox and confirm your email first.',
        unverified: true,
      };
    }

    if (!data.session) {
      return {
        user: null,
        error: 'Authentication failed: No active session returned from Supabase. Please try again.',
      };
    }

    // Fetch verified role from profiles table inside Supabase
    const { role } = await fetchUserProfile(
      data.user.id,
      trimmedEmail,
      data.user.user_metadata?.full_name
    );

    const sessionUser: UserSession = {
      id: data.user.id,
      email: data.user.email || trimmedEmail,
      fullName: data.user.user_metadata?.full_name || trimmedEmail.split('@')[0],
      role,
      isDemo: false,
      createdAt: data.user.created_at,
    };
    storeLocalUser(sessionUser);
    return { user: sessionUser, error: null };
  } catch (err: unknown) {
    const errorMessage = formatSupabaseAuthError(err, 'Error logging into Supabase');
    return { user: null, error: errorMessage };
  }
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = getSupabase();
  const trimmedEmail = email.trim().toLowerCase();

  if (!supabase) {
    return { success: false, error: 'Supabase client is not available.' };
  }

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: trimmedEmail,
      options: {
        emailRedirectTo: EMAIL_REDIRECT_URL,
      },
    });

    if (error) {
      return { success: false, error: formatSupabaseAuthError(error, error.message) };
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = formatSupabaseAuthError(err, 'Failed to resend confirmation email.');
    return { success: false, error: msg };
  }
}

export async function signOutUser(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Error signing out from Supabase', e);
    }
  }
  try {
    localStorage.removeItem(STORAGE_KEY_USER);
  } catch (e) {
    console.error('Error clearing local user session', e);
  }
}

export async function getInitialSupabaseSession(): Promise<UserSession | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      // Check for URL hash token or params from verification link click
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const search = typeof window !== 'undefined' ? window.location.search : '';

      // Strictly verify session against Supabase server via getUser()
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        // Enforce verified status
        const isEmailConfirmed = Boolean(user.email_confirmed_at || (user as unknown as { confirmed_at?: string }).confirmed_at);
        if (!isEmailConfirmed) {
          console.warn('User email is not confirmed yet. Signing out...');
          await supabase.auth.signOut();
          localStorage.removeItem(STORAGE_KEY_USER);
          return null;
        }

        const userEmail = user.email || '';
        const fullName = user.user_metadata?.full_name || userEmail.split('@')[0];
        const { role } = await fetchUserProfile(user.id, userEmail, fullName);
        const sessionUser: UserSession = {
          id: user.id,
          email: userEmail,
          fullName,
          role,
          isDemo: false,
          createdAt: user.created_at,
        };
        storeLocalUser(sessionUser);

        // Clean up hash fragment from url after successful login
        if (typeof window !== 'undefined' && (hash.includes('access_token=') || search.includes('code='))) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        return sessionUser;
      } else {
        // No valid user session in Supabase - purge local cache
        localStorage.removeItem(STORAGE_KEY_USER);
        return null;
      }
    } catch (e) {
      console.warn('Error getting initial Supabase session', e);
      localStorage.removeItem(STORAGE_KEY_USER);
      return null;
    }
  }
  localStorage.removeItem(STORAGE_KEY_USER);
  return null;
}

export function getCurrentStoredUser(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading current user session', e);
  }
  return null;
}

export function storeLocalUser(user: UserSession) {
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    // Also save in registered list for quick switching
    const users = getLocalRegisteredUsers();
    const existingIndex = users.findIndex((u) => u.id === user.id || u.email === user.email);
    if (existingIndex !== -1) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem('workspace_registered_users', JSON.stringify(users));

    // Save profile
    saveLocalProfile({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt || new Date().toISOString(),
    });
  } catch (e) {
    console.error('Error saving local user', e);
  }
}

export function getLocalRegisteredUsers(): UserSession[] {
  try {
    const raw = localStorage.getItem('workspace_registered_users');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function createInitialAdminSession(
  email = DEFAULT_ADMIN_EMAIL,
  name = 'Manas Traders (Admin)'
): UserSession {
  const adminUser: UserSession = {
    id: `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
    email: email.toLowerCase(),
    fullName: name,
    role: 'admin',
    isDemo: false,
    createdAt: '2026-08-01T10:00:00Z',
  };
  storeLocalUser(adminUser);
  return adminUser;
}

// -----------------------------------------------------------------------------
// Database Data Mapping & Synchronisation (User-Isolated)
// -----------------------------------------------------------------------------

// Local storage isolation keys helper
const getUserNotesKey = (userId: string) => `ws_notes_${userId}`;
const getUserTodosKey = (userId: string) => `ws_todos_${userId}`;
const getUserWorkLogsKey = (userId: string) => `ws_worklogs_${userId}`;

// 1. NOTES DATA OPERATIONS
export async function syncFetchNotes(userId: string): Promise<{ notes: Note[]; isCloud: boolean }> {
  const supabase = getSupabase();
  const localKey = getUserNotesKey(userId);

  if (supabase) {
    try {
      // Strict Session Check: Verify active logged-in user
      const { data: authData } = await supabase.auth.getUser();
      const effectiveUserId = authData?.user?.id || userId;

      // Always filter using .eq('user_id', currentUser.id)
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedNotes: Note[] = data.map((item: any) => ({
          id: item.id || `note-${Date.now()}`,
          title: item.title || '',
          content: item.content || '',
          tags: Array.isArray(item.tags)
            ? item.tags
            : typeof item.tags === 'string'
            ? JSON.parse(item.tags || '[]')
            : [],
          category: item.category || 'General',
          colorScheme: item.color_scheme || 'default',
          isPinned: Boolean(item.is_pinned),
          notifyAt: item.notify_at || undefined,
          notified: Boolean(item.notified),
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at || item.created_at || new Date().toISOString(),
        }));

        // Cache locally for offline availability
        localStorage.setItem(localKey, JSON.stringify(mappedNotes));
        return { notes: mappedNotes, isCloud: true };
      } else if (error) {
        console.warn('Supabase fetch notes error (will fallback to local storage):', error.message);
      }
    } catch (err) {
      console.warn('Error fetching notes from Supabase:', err);
    }
  }

  // Local storage fallback for this specific user
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const parsed: Note[] = JSON.parse(raw);
      const cleaned = parsed.filter(
        (n) =>
          !n.id.startsWith('note-1') &&
          !n.id.startsWith('note-2') &&
          !n.id.startsWith('note-3') &&
          !n.id.startsWith('note-4') &&
          !n.id.startsWith('note-5')
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(localKey, JSON.stringify(cleaned));
      }
      return { notes: cleaned, isCloud: false };
    }
  } catch (e) {
    console.error('Error parsing local notes', e);
  }

  return { notes: [], isCloud: false };
}

// UUID format validation helper
export function isValidUUID(str: string | undefined | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function syncSaveNote(
  userId: string,
  note: Note
): Promise<{ data: Note | null; error: string | null }> {
  const supabase = getSupabase();
  const localKey = getUserNotesKey(userId);
  let activeUserId = userId;

  if (supabase) {
    try {
      // 1. Explicit User Session Verification
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user?.id) {
        activeUserId = user.id;
      } else if (authError) {
        console.warn('Supabase auth session fetch warning (Note):', authError.message);
      }

      const hasValidUuid = isValidUUID(note.id);

      // 2. Strict CRUD Payload Construction matching Supabase column specifications
      // If note.id is a temporary client string (e.g. 'note-1740...'), omit id so PostgreSQL generates a valid UUID
      const payload: Record<string, any> = {
        user_id: activeUserId,
        title: note.title,
        content: note.content || '',
        tags: Array.isArray(note.tags) ? note.tags : [],
        is_pinned: Boolean(note.isPinned),
        color: note.colorScheme || 'default',
        color_scheme: note.colorScheme || 'default',
        category: note.category || 'General',
        notify_at: note.notifyAt || null,
        notified: Boolean(note.notified),
        created_at: note.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (hasValidUuid) {
        payload.id = note.id;
      }

      // 3. Perform Insert / Upsert with fallback
      let data: any = null;
      let error: any = null;

      if (hasValidUuid) {
        const res = await supabase
          .from('notes')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();
        data = res.data;
        error = res.error;

        // Fallback to direct insert if upsert encounters constraint issue
        if (error) {
          console.warn('Upsert note fallback to insert:', error.message);
          const insertRes = await supabase
            .from('notes')
            .insert(payload)
            .select()
            .single();
          if (!insertRes.error) {
            data = insertRes.data;
            error = null;
          }
        }
      } else {
        // New item without UUID: execute direct insert so Supabase generates UUID
        const res = await supabase
          .from('notes')
          .insert(payload)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) {
        console.error('Supabase save note error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return { data: null, error: error.message || 'Failed to save note to Supabase' };
      }

      if (data) {
        const savedNote: Note = {
          id: data.id,
          title: data.title || '',
          content: data.content || '',
          tags: Array.isArray(data.tags)
            ? data.tags
            : typeof data.tags === 'string'
            ? JSON.parse(data.tags || '[]')
            : [],
          category: data.category || 'General',
          colorScheme: data.color_scheme || data.color || 'default',
          isPinned: Boolean(data.is_pinned),
          notifyAt: data.notify_at || undefined,
          notified: Boolean(data.notified),
          createdAt: data.created_at || note.createdAt,
          updatedAt: data.updated_at || note.updatedAt,
        };

        // Cache locally for this user
        try {
          const raw = localStorage.getItem(localKey);
          const currentList: Note[] = raw ? JSON.parse(raw) : [];
          const idx = currentList.findIndex((n) => n.id === savedNote.id || n.id === note.id);
          if (idx !== -1) {
            currentList[idx] = savedNote;
          } else {
            currentList.unshift(savedNote);
          }
          localStorage.setItem(localKey, JSON.stringify(currentList));
        } catch (e) {
          console.warn('Error caching note locally', e);
        }

        return { data: savedNote, error: null };
      }
    } catch (e: any) {
      console.error('Unexpected error in syncSaveNote:', e);
      return { data: null, error: e?.message || 'Error communicating with Supabase' };
    }
  }

  // Local storage fallback if offline or unconfigured
  try {
    const raw = localStorage.getItem(localKey);
    const currentList: Note[] = raw ? JSON.parse(raw) : [];
    const idx = currentList.findIndex((n) => n.id === note.id);
    if (idx !== -1) {
      currentList[idx] = note;
    } else {
      currentList.unshift(note);
    }
    localStorage.setItem(localKey, JSON.stringify(currentList));
    return { data: note, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to save note locally' };
  }
}

export async function syncDeleteNote(userId: string, noteId: string): Promise<boolean> {
  const supabase = getSupabase();
  const localKey = getUserNotesKey(userId);

  // Update local cache
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const currentList: Note[] = JSON.parse(raw);
      localStorage.setItem(localKey, JSON.stringify(currentList.filter((n) => n.id !== noteId)));
    }
  } catch (e) {
    console.warn('Error deleting note from local cache', e);
  }

  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const effectiveUserId = authData?.user?.id || userId;
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', effectiveUserId);
      if (error) {
        console.warn('Supabase delete note warning:', error.message);
      }
    } catch (e) {
      console.warn('Error deleting note from Supabase:', e);
    }
  }
  return true;
}

// 2. TODOS DATA OPERATIONS
export async function syncFetchTodos(userId: string): Promise<{ todos: TodoTask[]; isCloud: boolean }> {
  const supabase = getSupabase();
  const localKey = getUserTodosKey(userId);

  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const effectiveUserId = authData?.user?.id || userId;

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedTodos: TodoTask[] = data.map((item: any) => ({
          id: item.id || `todo-${Date.now()}`,
          title: item.task_name || item.title || '',
          description: item.description || '',
          status: item.status || 'pending',
          priority: item.priority || 'medium',
          dueDate: item.due_time || item.due_date || new Date().toISOString().split('T')[0],
          notifyAt: item.notify_at || undefined,
          notified: Boolean(item.notified),
          category: item.category || 'General',
          createdAt: item.created_at || new Date().toISOString(),
        }));

        localStorage.setItem(localKey, JSON.stringify(mappedTodos));
        return { todos: mappedTodos, isCloud: true };
      } else if (error) {
        console.warn('Supabase fetch todos error:', error.message);
      }
    } catch (err) {
      console.warn('Error fetching todos from Supabase:', err);
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const parsed: TodoTask[] = JSON.parse(raw);
      const cleaned = parsed.filter(
        (t) =>
          !t.id.startsWith('todo-1') &&
          !t.id.startsWith('todo-2') &&
          !t.id.startsWith('todo-3') &&
          !t.id.startsWith('todo-4') &&
          !t.id.startsWith('todo-5') &&
          !t.id.startsWith('todo-6')
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(localKey, JSON.stringify(cleaned));
      }
      return { todos: cleaned, isCloud: false };
    }
  } catch (e) {
    console.error('Error reading local todos', e);
  }

  return { todos: [], isCloud: false };
}

export async function syncSaveTodo(
  userId: string,
  todo: TodoTask
): Promise<{ data: TodoTask | null; error: string | null }> {
  const supabase = getSupabase();
  const localKey = getUserTodosKey(userId);
  let activeUserId = userId;

  if (supabase) {
    try {
      // 1. Explicit User Session Verification
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user?.id) {
        activeUserId = user.id;
      } else if (authError) {
        console.warn('Supabase auth session fetch warning (Todo):', authError.message);
      }

      const hasValidUuid = isValidUUID(todo.id);

      // 2. Strict CRUD Payload Construction matching Supabase column specifications
      // If todo.id is a temporary client string (e.g. 'todo-1740...'), omit id so PostgreSQL generates a valid UUID
      const payload: Record<string, any> = {
        user_id: activeUserId,
        title: todo.title,
        task_name: todo.title,
        description: todo.description || '',
        status: todo.status || 'pending',
        priority: todo.priority || 'medium',
        due_date: todo.dueDate || new Date().toISOString().split('T')[0],
        due_time: todo.dueDate || new Date().toISOString().split('T')[0],
        tags: [],
        notify_at: todo.notifyAt || null,
        notified: Boolean(todo.notified),
        category: todo.category || 'General',
        created_at: todo.createdAt || new Date().toISOString(),
      };

      if (hasValidUuid) {
        payload.id = todo.id;
      }

      // 3. Perform Insert / Upsert with fallback
      let data: any = null;
      let error: any = null;

      if (hasValidUuid) {
        const res = await supabase
          .from('todos')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();
        data = res.data;
        error = res.error;

        // Fallback to direct insert if upsert encounters constraint issue
        if (error) {
          console.warn('Upsert todo fallback to insert:', error.message);
          const insertRes = await supabase
            .from('todos')
            .insert(payload)
            .select()
            .single();
          if (!insertRes.error) {
            data = insertRes.data;
            error = null;
          }
        }
      } else {
        // New item without UUID: execute direct insert so Supabase generates UUID
        const res = await supabase
          .from('todos')
          .insert(payload)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) {
        console.error('Supabase save todo error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return { data: null, error: error.message || 'Failed to save todo to Supabase' };
      }

      if (data) {
        const savedTodo: TodoTask = {
          id: data.id,
          title: data.title || data.task_name || '',
          description: data.description || '',
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          dueDate: data.due_date || data.due_time || new Date().toISOString().split('T')[0],
          notifyAt: data.notify_at || undefined,
          notified: Boolean(data.notified),
          category: data.category || 'General',
          createdAt: data.created_at || todo.createdAt,
        };

        try {
          const raw = localStorage.getItem(localKey);
          const currentList: TodoTask[] = raw ? JSON.parse(raw) : [];
          const idx = currentList.findIndex((t) => t.id === savedTodo.id || t.id === todo.id);
          if (idx !== -1) {
            currentList[idx] = savedTodo;
          } else {
            currentList.unshift(savedTodo);
          }
          localStorage.setItem(localKey, JSON.stringify(currentList));
        } catch (e) {
          console.warn('Error caching todo locally', e);
        }

        return { data: savedTodo, error: null };
      }
    } catch (e: any) {
      console.error('Unexpected error in syncSaveTodo:', e);
      return { data: null, error: e?.message || 'Error communicating with Supabase' };
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(localKey);
    const currentList: TodoTask[] = raw ? JSON.parse(raw) : [];
    const idx = currentList.findIndex((t) => t.id === todo.id);
    if (idx !== -1) {
      currentList[idx] = todo;
    } else {
      currentList.unshift(todo);
    }
    localStorage.setItem(localKey, JSON.stringify(currentList));
    return { data: todo, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to save task locally' };
  }
}

// Export aliases for flexible imports
export const fetchNotes = syncFetchNotes;
export const fetchTodos = syncFetchTodos;

export async function syncDeleteTodo(userId: string, todoId: string): Promise<boolean> {
  const supabase = getSupabase();
  const localKey = getUserTodosKey(userId);

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const currentList: TodoTask[] = JSON.parse(raw);
      localStorage.setItem(localKey, JSON.stringify(currentList.filter((t) => t.id !== todoId)));
    }
  } catch (e) {
    console.warn('Error deleting todo from local cache', e);
  }

  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const effectiveUserId = authData?.user?.id || userId;
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todoId)
        .eq('user_id', effectiveUserId);
      if (error) {
        console.warn('Supabase delete todo warning:', error.message);
      }
    } catch (e) {
      console.warn('Error deleting todo from Supabase:', e);
    }
  }
  return true;
}

// 3. WORK LOGS DATA OPERATIONS
export async function syncFetchWorkLogs(userId: string): Promise<{ worklogs: WorkLog[]; isCloud: boolean }> {
  const supabase = getSupabase();
  const localKey = getUserWorkLogsKey(userId);

  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const effectiveUserId = authData?.user?.id || userId;

      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedLogs: WorkLog[] = data.map((item: any) => ({
          id: item.id || `worklog-${Date.now()}`,
          projectName: item.project_name || '',
          taskDescription: item.description || '',
          hoursSpent:
            (item.duration_minutes ? item.duration_minutes / 60 : 0) || Number(item.hours_spent || 0),
          date: item.log_date || item.date || new Date().toISOString().split('T')[0],
          startTime: item.start_time || undefined,
          endTime: item.end_time || undefined,
          category: item.category || 'General',
          createdAt: item.created_at || new Date().toISOString(),
        }));

        localStorage.setItem(localKey, JSON.stringify(mappedLogs));
        return { worklogs: mappedLogs, isCloud: true };
      } else if (error) {
        console.warn('Supabase fetch work logs error:', error.message);
      }
    } catch (err) {
      console.warn('Error fetching work logs from Supabase:', err);
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const parsed: WorkLog[] = JSON.parse(raw);
      const cleaned = parsed.filter(
        (w) =>
          !w.id.startsWith('worklog-1') &&
          !w.id.startsWith('worklog-2') &&
          !w.id.startsWith('worklog-3') &&
          !w.id.startsWith('worklog-4') &&
          !w.id.startsWith('worklog-5')
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(localKey, JSON.stringify(cleaned));
      }
      return { worklogs: cleaned, isCloud: false };
    }
  } catch (e) {
    console.error('Error reading local worklogs', e);
  }

  return { worklogs: [], isCloud: false };
}

export async function syncSaveWorkLog(
  userId: string,
  log: WorkLog
): Promise<{ data: WorkLog | null; error: string | null }> {
  const supabase = getSupabase();
  const localKey = getUserWorkLogsKey(userId);
  let activeUserId = userId;

  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        activeUserId = authData.user.id;
      }

      const hasValidUuid = isValidUUID(log.id);
      const durationMinutes = Math.round(log.hoursSpent * 60);
      const payload: Record<string, any> = {
        user_id: activeUserId,
        project_name: log.projectName,
        description: log.taskDescription,
        duration_minutes: durationMinutes,
        hours_spent: log.hoursSpent,
        log_date: log.date,
        date: log.date,
        start_time: log.startTime || null,
        end_time: log.endTime || null,
        category: log.category || 'General',
        created_at: log.createdAt || new Date().toISOString(),
      };

      if (hasValidUuid) {
        payload.id = log.id;
      }

      let data: any = null;
      let error: any = null;

      if (hasValidUuid) {
        const res = await supabase
          .from('work_logs')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();
        data = res.data;
        error = res.error;

        if (error) {
          console.warn('Upsert work_log fallback to insert:', error.message);
          const insertRes = await supabase
            .from('work_logs')
            .insert(payload)
            .select()
            .single();
          if (!insertRes.error) {
            data = insertRes.data;
            error = null;
          }
        }
      } else {
        const res = await supabase
          .from('work_logs')
          .insert(payload)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) {
        console.error('Supabase save work log error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return { data: null, error: error.message || 'Failed to save work log to Supabase' };
      }

      if (data) {
        const savedLog: WorkLog = {
          id: data.id,
          projectName: data.project_name || '',
          taskDescription: data.description || '',
          hoursSpent:
            (data.duration_minutes ? data.duration_minutes / 60 : 0) || Number(data.hours_spent || 0),
          date: data.log_date || data.date || new Date().toISOString().split('T')[0],
          startTime: data.start_time || undefined,
          endTime: data.end_time || undefined,
          category: data.category || 'General',
          createdAt: data.created_at || log.createdAt,
        };

        try {
          const raw = localStorage.getItem(localKey);
          const currentList: WorkLog[] = raw ? JSON.parse(raw) : [];
          const idx = currentList.findIndex((w) => w.id === savedLog.id || w.id === log.id);
          if (idx !== -1) {
            currentList[idx] = savedLog;
          } else {
            currentList.unshift(savedLog);
          }
          localStorage.setItem(localKey, JSON.stringify(currentList));
        } catch (e) {
          console.warn('Error caching work log locally', e);
        }

        return { data: savedLog, error: null };
      }
    } catch (e: any) {
      console.error('Error syncing work log to Supabase:', e);
      return { data: null, error: e?.message || 'Error communicating with Supabase' };
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(localKey);
    const currentList: WorkLog[] = raw ? JSON.parse(raw) : [];
    const idx = currentList.findIndex((w) => w.id === log.id);
    if (idx !== -1) {
      currentList[idx] = log;
    } else {
      currentList.unshift(log);
    }
    localStorage.setItem(localKey, JSON.stringify(currentList));
    return { data: log, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to save work log locally' };
  }
}

export async function syncDeleteWorkLog(userId: string, logId: string): Promise<boolean> {
  const supabase = getSupabase();
  const localKey = getUserWorkLogsKey(userId);

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const currentList: WorkLog[] = JSON.parse(raw);
      localStorage.setItem(localKey, JSON.stringify(currentList.filter((w) => w.id !== logId)));
    }
  } catch (e) {
    console.warn('Error deleting worklog from local cache', e);
  }

  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const effectiveUserId = authData?.user?.id || userId;
      const { error } = await supabase
        .from('work_logs')
        .delete()
        .eq('id', logId)
        .eq('user_id', effectiveUserId);
      if (error) {
        console.warn('Supabase delete work log warning:', error.message);
      }
    } catch (e) {
      console.warn('Error deleting work log from Supabase:', e);
    }
  }
  return true;
}

// -----------------------------------------------------------------------------
// Clean SQL Schema & RLS Policies (For easy copy & execute in Supabase SQL editor)
// -----------------------------------------------------------------------------

export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- WORKSPACE PRO - UNIFIED SINGLE SUPABASE BACKEND (RBAC & RLS POLICIES)
-- Unified Project: Handles both Admin and Standard Users on single database
-- Run this in your Supabase Project: Dashboard > SQL Editor > New Query
-- =========================================================================

-- 1. Create PROFILES Table (Stores role: 'admin' or 'user')
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Helper Security Definer Function to Check if Current User is Admin
-- (Using SECURITY DEFINER prevents infinite recursion in RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Automatic Trigger to Create a Profile with Role on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN LOWER(NEW.email) = 'manastraderstkp@gmail.com' THEN 'admin'
            ELSE 'user'
        END,
        TIMEZONE('utc'::text, NOW()),
        TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure designated admin role is active
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE email = 'manastraderstkp@gmail.com';

-- 5. Create NOTES Table (Unified storage for all users)
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    color TEXT DEFAULT 'default',
    color_scheme TEXT DEFAULT 'default',
    category TEXT DEFAULT 'General',
    is_pinned BOOLEAN DEFAULT FALSE,
    notify_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Create TODOS Table (Unified storage for all users)
CREATE TABLE IF NOT EXISTS public.todos (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    task_name TEXT,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    due_date TEXT,
    due_time TEXT,
    tags TEXT[] DEFAULT '{}',
    notify_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT FALSE,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Create WORK_LOGS Table (Unified storage for all users)
CREATE TABLE IF NOT EXISTS public.work_logs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    duration_minutes INTEGER DEFAULT 0,
    log_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- -------------------------------------------------------------------------
-- UNIFIED ROW LEVEL SECURITY (RLS) POLICIES
-- • Standard Users: Can ONLY View, Insert, Update, and Delete rows where user_id = auth.uid()
-- • Admin Users: Can View, Insert, Update, and Delete ALL rows across the entire database
-- -------------------------------------------------------------------------

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles delete policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles admin all policy" ON public.profiles;

DROP POLICY IF EXISTS "Notes select policy" ON public.notes;
DROP POLICY IF EXISTS "Notes insert policy" ON public.notes;
DROP POLICY IF EXISTS "Notes update policy" ON public.notes;
DROP POLICY IF EXISTS "Notes delete policy" ON public.notes;

DROP POLICY IF EXISTS "Todos select policy" ON public.todos;
DROP POLICY IF EXISTS "Todos insert policy" ON public.todos;
DROP POLICY IF EXISTS "Todos update policy" ON public.todos;
DROP POLICY IF EXISTS "Todos delete policy" ON public.todos;

DROP POLICY IF EXISTS "WorkLogs select policy" ON public.work_logs;
DROP POLICY IF EXISTS "WorkLogs insert policy" ON public.work_logs;
DROP POLICY IF EXISTS "WorkLogs update policy" ON public.work_logs;
DROP POLICY IF EXISTS "WorkLogs delete policy" ON public.work_logs;

-- PROFILES POLICIES
-- Standard users see their own profile; Admins can see all user profiles
CREATE POLICY "Profiles select policy"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Profiles insert policy"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- Users can update their own name/email; Admins can update any profile or role
CREATE POLICY "Profiles update policy"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Profiles delete policy"
    ON public.profiles FOR DELETE
    USING (public.is_admin());

-- NOTES POLICIES
CREATE POLICY "Notes select policy"
    ON public.notes FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Notes insert policy"
    ON public.notes FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Notes update policy"
    ON public.notes FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Notes delete policy"
    ON public.notes FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- TODOS POLICIES
CREATE POLICY "Todos select policy"
    ON public.todos FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Todos insert policy"
    ON public.todos FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Todos update policy"
    ON public.todos FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Todos delete policy"
    ON public.todos FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- WORK_LOGS POLICIES
CREATE POLICY "WorkLogs select policy"
    ON public.work_logs FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "WorkLogs insert policy"
    ON public.work_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "WorkLogs update policy"
    ON public.work_logs FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "WorkLogs delete policy"
    ON public.work_logs FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- 8. Performance Indexes for Query Scaling
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS todos_user_id_idx ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS work_logs_user_id_idx ON public.work_logs(user_id);
`;
