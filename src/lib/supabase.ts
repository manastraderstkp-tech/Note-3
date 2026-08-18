/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Note, TodoTask, WorkLog, Folder, UserFile, UserSession, UserRole, UserProfile } from '../types';
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

  const localProfiles = getLocalProfiles();
  const index = localProfiles.findIndex((p) => p.id === userId);
  if (index !== -1) {
    localProfiles[index].role = newRole;
    localProfiles[index].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(localProfiles));
  }

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
// Authentication Operations (Strict Supabase Auth with RLS & Google OAuth)
// -----------------------------------------------------------------------------

// *** Google OAuth Sign-In Function ***
export async function signInWithGoogle(): Promise<{ data: any; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: 'Supabase client is not available.' };
  }

  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : EMAIL_REDIRECT_URL;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return { data: null, error: formatSupabaseAuthError(error, error.message) };
    }

    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: formatSupabaseAuthError(err, 'Failed to sign in with Google.') };
  }
}

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

    if (data.user.identities && data.user.identities.length === 0) {
      return {
        user: null,
        error: 'An account with this email address already exists. Please sign in instead.',
      };
    }

    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEY_USER);

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

    const isEmailConfirmed = Boolean(data.user.email_confirmed_at || (data.user as unknown as { confirmed_at?: string }).confirmed_at);
    if (!isEmailConfirmed) {
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
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const search = typeof window !== 'undefined' ? window.location.search : '';

      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
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

        if (typeof window !== 'undefined' && (hash.includes('access_token=') || search.includes('code='))) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        return sessionUser;
      } else {
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
    const users = getLocalRegisteredUsers();
    const existingIndex = users.findIndex((u) => u.id === user.id || u.email === user.email);
    if (existingIndex !== -1) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem('workspace_registered_users', JSON.stringify(users));

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

const getUserNotesKey = (userId: string) => `ws_notes_${userId}`;
const getUserTodosKey = (userId: string) => `ws_todos_${userId}`;
const getUserWorkLogsKey = (userId: string) => `ws_worklogs_${userId}`;

export function isValidUUID(str: string | undefined | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// 1. NOTES DATA OPERATIONS
export async function syncFetchNotes(userId: string): Promise<{ notes: Note[]; isCloud: boolean }> {
  const supabase = getSupabase();
  const localKey = getUserNotesKey(userId);

  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const effectiveUserId = authData?.user?.id || userId;

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

        localStorage.setItem(localKey, JSON.stringify(mappedNotes));
        return { notes: mappedNotes, isCloud: true };
      }
    } catch (err) {
      console.warn('Error fetching notes from Supabase:', err);
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      return { notes: JSON.parse(raw), isCloud: false };
    }
  } catch (e) {
    console.error('Error parsing local notes', e);
  }

  return { notes: [], isCloud: false };
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
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) activeUserId = authData.user.id;

      const hasValidUuid = isValidUUID(note.id);

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

      if (hasValidUuid) payload.id = note.id;

      let data: any = null;
      let error: any = null;

      if (hasValidUuid) {
        const res = await supabase.from('notes').upsert(payload, { onConflict: 'id' }).select().single();
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase.from('notes').insert(payload).select().single();
        data = res.data;
        error = res.error;
      }

      if (!error && data) {
        const savedNote: Note = {
          id: data.id,
          title: data.title || '',
          content: data.content || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          category: data.category || 'General',
          colorScheme: data.color_scheme || 'default',
          isPinned: Boolean(data.is_pinned),
          notifyAt: data.notify_at || undefined,
          notified: Boolean(data.notified),
          createdAt: data.created_at || note.createdAt,
          updatedAt: data.updated_at || note.updatedAt,
        };

        return { data: savedNote, error: null };
      }
    } catch (e: any) {
      console.error('Error saving note:', e);
    }
  }

  return { data: note, error: null };
}

export async function syncDeleteNote(userId: string, noteId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const effectiveUserId = authData?.user?.id || userId;
      await supabase.from('notes').delete().eq('id', noteId).eq('user_id', effectiveUserId);
    } catch (e) {
      console.warn('Error deleting note:', e);
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
      }
    } catch (err) {
      console.warn('Error fetching todos from Supabase:', err);
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) return { todos: JSON.parse(raw), isCloud: false };
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
  let activeUserId = userId;

  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) activeUserId = authData.user.id;

      const hasValidUuid = isValidUUID(todo.id);

      const payload: Record<string, any> = {
        user_id: activeUserId,
        task_name: todo.title,
        title: todo.title,
        description: todo.description || '',
        status: todo.status || 'pending',
        priority: todo.priority || 'medium',
        due_date: todo.dueDate || null,
        due_time: todo.dueDate || null,
        category: todo.category || 'General',
        created_at: todo.createdAt || new Date().toISOString(),
      };

      if (hasValidUuid) payload.id = todo.id;

      let data: any = null;
      let error: any = null;

      if (hasValidUuid) {
        const res = await supabase.from('todos').upsert(payload, { onConflict: 'id' }).select().single();
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase.from('todos').insert(payload).select().single();
        data = res.data;
        error = res.error;
      }

      if (!error && data) {
        const savedTodo: TodoTask = {
          id: data.id,
          title: data.task_name || data.title || '',
          description: data.description || '',
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          dueDate: data.due_date || data.due_time || todo.dueDate,
          category: data.category || 'General',
          createdAt: data.created_at || todo.createdAt,
        };

        return { data: savedTodo, error: null };
      }
    } catch (e: any) {
      console.error('Error saving todo:', e);
    }
  }

  return { data: todo, error: null };
}

export async function syncDeleteTodo(userId: string, todoId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const effectiveUserId = authData?.user?.id || userId;
      await supabase.from('todos').delete().eq('id', todoId).eq('user_id', effectiveUserId);
    } catch (e) {
      console.warn('Error deleting todo:', e);
    }
  }
  return true;
}
