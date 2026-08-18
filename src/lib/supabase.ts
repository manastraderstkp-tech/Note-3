/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Note,
  TodoTask,
  WorkLog,
  Folder,
  UserFile,
  UserSession,
  UserRole,
  UserProfile,
} from '../types';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  DEFAULT_ADMIN_EMAIL,
  EMAIL_REDIRECT_URL,
} from './config';

export { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_ADMIN_EMAIL, EMAIL_REDIRECT_URL };

// LocalStorage Persistence Keys
const STORAGE_KEY_URL = 'workspace_supabase_url';
const STORAGE_KEY_KEY = 'workspace_supabase_anon_key';
const STORAGE_KEY_USER = 'workspace_current_user';
const STORAGE_KEY_PROFILES = 'workspace_profiles_list';

// -----------------------------------------------------------------------------
// Configuration & Client Initialization
// -----------------------------------------------------------------------------

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
    // Ignore localStorage read errors
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

export function isSupabaseConfigured(): boolean {
  return getStoredSupabaseConfig().isConfigured;
}

let activeClient: SupabaseClient | null = null;
let activeConfigSignature = '';

export function getSupabase(): SupabaseClient {
  const { url, anonKey } = getStoredSupabaseConfig();
  const configSignature = `${url}_${anonKey}`;
  if (!activeClient || activeConfigSignature !== configSignature) {
    activeClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    activeConfigSignature = configSignature;
  }
  return activeClient;
}

export const supabase: SupabaseClient = getSupabase();

export function saveSupabaseConfig(url: string, anonKey: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  } catch (e) {
    console.warn('Could not persist Supabase config to localStorage', e);
  }
  activeClient = null;
  activeConfigSignature = '';
}

export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  } catch (e) {
    console.warn('Could not clear Supabase config from localStorage', e);
  }
  activeClient = null;
  activeConfigSignature = '';
}

export function formatSupabaseAuthError(err: unknown, defaultMsg: string): string {
  const rawMsg = err instanceof Error ? err.message : String(err || defaultMsg);
  const lower = rawMsg.toLowerCase();

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('err_name_not_resolved') ||
    lower.includes('load failed')
  ) {
    return 'Unable to connect to Supabase backend. Please verify your internet connection or Supabase URL and Anon Key.';
  }

  return rawMsg;
}

export function isValidUUID(str: string | undefined | null): boolean {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// -----------------------------------------------------------------------------
// Profiles & RBAC Operations
// -----------------------------------------------------------------------------

function getLocalProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) return JSON.parse(raw);
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
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(defaults));
  } catch {
    // Ignore storage write error
  }
  return defaults;
}

function saveLocalProfile(profile: UserProfile): void {
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

export async function fetchUserProfile(
  userId: string,
  email?: string,
  fullName?: string
): Promise<{ role: UserRole; profile: UserProfile | null }> {
  const client = getSupabase();
  const trimmedEmail = (email || '').trim().toLowerCase();

  if (client) {
    try {
      const { data, error } = await client
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

      await client.from('profiles').upsert(
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
  const client = getSupabase();

  if (client) {
    try {
      const { data, error } = await client
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
        try {
          localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(mapped));
        } catch {
          // ignore
        }
        return mapped;
      }
    } catch (e) {
      console.warn('Error fetching all profiles:', e);
    }
  }

  return getLocalProfiles();
}

export async function updateUserRoleInDb(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();

  if (client) {
    try {
      const { error } = await client
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
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
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(localProfiles));
    } catch {
      // ignore
    }
  }

  const currentUser = getCurrentStoredUser();
  if (currentUser && currentUser.id === userId) {
    currentUser.role = newRole;
    storeLocalUser(currentUser);
  }

  return { success: true };
}

// -----------------------------------------------------------------------------
// Authentication Operations
// -----------------------------------------------------------------------------

export function getCurrentStoredUser(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored session', e);
  }
  return null;
}

export function storeLocalUser(user: UserSession): void {
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
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

export async function signInWithGoogle(): Promise<{ data: any; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Supabase client is not available.' };
  }

  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : EMAIL_REDIRECT_URL;
    const { data, error } = await client.auth.signInWithOAuth({
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
  const client = getSupabase();
  const trimmedEmail = email.trim().toLowerCase();

  if (!client) {
    return { user: null, error: 'Supabase client is not available.' };
  }

  try {
    const { data, error } = await client.auth.signUp({
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
        return { user: null, error: 'This email is already registered. Please sign in.' };
      }
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'Failed to create user account.' };
    }

    // Sign out to enforce email verification
    await client.auth.signOut();
    localStorage.removeItem(STORAGE_KEY_USER);

    return { user: null, error: null, needsVerification: true };
  } catch (err: unknown) {
    return { user: null, error: formatSupabaseAuthError(err, 'Error communicating with Supabase auth') };
  }
}

export async function signInUser(
  email: string,
  password: string
): Promise<{ user: UserSession | null; error: string | null; unverified?: boolean }> {
  const client = getSupabase();
  const trimmedEmail = email.trim().toLowerCase();

  if (!client) {
    return { user: null, error: 'Supabase client is not available.' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        return { user: null, error: 'Invalid email or password.' };
      }
      return { user: null, error: formatSupabaseAuthError(error, error.message) };
    }

    if (!data.user) {
      return { user: null, error: 'Authentication failed.' };
    }

    const { role } = await fetchUserProfile(data.user.id, trimmedEmail, data.user.user_metadata?.full_name);

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
    return { user: null, error: formatSupabaseAuthError(err, 'Error logging into Supabase') };
  }
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabase();
  const trimmedEmail = email.trim().toLowerCase();

  if (!client) {
    return { success: false, error: 'Supabase client is not available.' };
  }

  try {
    const { error } = await client.auth.resend({
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
  const client = getSupabase();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Error signing out:', e);
    }
  }
  localStorage.removeItem(STORAGE_KEY_USER);
}

export async function getInitialSupabaseSession(): Promise<UserSession | null> {
  const client = getSupabase();
  if (client) {
    try {
      const {
        data: { user },
        error,
      } = await client.auth.getUser();
      if (!error && user) {
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
        return sessionUser;
      }
    } catch (e) {
      console.warn('Error getting initial session:', e);
    }
  }
  localStorage.removeItem(STORAGE_KEY_USER);
  return null;
}

// -----------------------------------------------------------------------------
// Notes Operations
// -----------------------------------------------------------------------------

export async function syncFetchNotes(userId: string): Promise<{ notes: Note[]; isCloud: boolean }> {
  const client = getSupabase();
  const localKey = `ws_notes_${userId}`;

  if (client) {
    try {
      const { data, error } = await client
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedNotes: Note[] = data.map((item: any) => ({
          id: item.id || `note-${Date.now()}`,
          title: item.title || '',
          content: item.content || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          category: item.category || 'General',
          colorScheme: item.color_scheme || 'default',
          isPinned: Boolean(item.is_pinned),
          notifyAt: item.notify_at || undefined,
          notified: Boolean(item.notified),
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at || new Date().toISOString(),
        }));

        try {
          localStorage.setItem(localKey, JSON.stringify(mappedNotes));
        } catch {
          // ignore
        }
        return { notes: mappedNotes, isCloud: true };
      }
    } catch (err) {
      console.warn('Error fetching notes from Supabase:', err);
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) return { notes: JSON.parse(raw), isCloud: false };
  } catch (e) {
    console.error('Error parsing local notes', e);
  }

  return { notes: [], isCloud: false };
}

export async function syncSaveNote(
  userId: string,
  note: Note
): Promise<{ data: Note | null; error: string | null }> {
  const client = getSupabase();
  const localKey = `ws_notes_${userId}`;

  if (client) {
    try {
      const hasValidUuid = isValidUUID(note.id);
      const payload: Record<string, any> = {
        user_id: userId,
        title: note.title,
        content: note.content || '',
        tags: Array.isArray(note.tags) ? note.tags : [],
        is_pinned: Boolean(note.isPinned),
        color_scheme: note.colorScheme || 'default',
        category: note.category || 'General',
        notify_at: note.notifyAt || null,
        notified: Boolean(note.notified),
        created_at: note.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (hasValidUuid) payload.id = note.id;

      const res = hasValidUuid
        ? await client.from('notes').upsert(payload, { onConflict: 'id' }).select().single()
        : await client.from('notes').insert(payload).select().single();

      if (!res.error && res.data) {
        const savedNote: Note = {
          id: res.data.id,
          title: res.data.title || '',
          content: res.data.content || '',
          tags: Array.isArray(res.data.tags) ? res.data.tags : [],
          category: res.data.category || 'General',
          colorScheme: res.data.color_scheme || 'default',
          isPinned: Boolean(res.data.is_pinned),
          notifyAt: res.data.notify_at || undefined,
          notified: Boolean(res.data.notified),
          createdAt: res.data.created_at || note.createdAt,
          updatedAt: res.data.updated_at || note.updatedAt,
        };

        try {
          const raw = localStorage.getItem(localKey);
          const list: Note[] = raw ? JSON.parse(raw) : [];
          const idx = list.findIndex((n) => n.id === savedNote.id || n.id === note.id);
          if (idx !== -1) list[idx] = savedNote;
          else list.unshift(savedNote);
          localStorage.setItem(localKey, JSON.stringify(list));
        } catch (e) {
          console.warn('Error caching note locally', e);
        }

        return { data: savedNote, error: null };
      }
    } catch (e: any) {
      console.error('Error saving note in Supabase:', e);
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    const list: Note[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((n) => n.id === note.id);
    if (idx !== -1) list[idx] = note;
    else list.unshift(note);
    localStorage.setItem(localKey, JSON.stringify(list));
    return { data: note, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to save note locally' };
  }
}

export async function syncDeleteNote(userId: string, noteId: string): Promise<boolean> {
  const client = getSupabase();
  const localKey = `ws_notes_${userId}`;

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: Note[] = JSON.parse(raw);
      localStorage.setItem(localKey, JSON.stringify(list.filter((n) => n.id !== noteId)));
    }
  } catch (e) {
    console.warn('Error removing note from local cache', e);
  }

  if (client) {
    try {
      await client.from('notes').delete().eq('id', noteId).eq('user_id', userId);
    } catch (e) {
      console.warn('Error deleting note from Supabase:', e);
    }
  }
  return true;
}

// -----------------------------------------------------------------------------
// Todos Operations
// -----------------------------------------------------------------------------

export async function syncFetchTodos(userId: string): Promise<{ todos: TodoTask[]; isCloud: boolean }> {
  const client = getSupabase();
  const localKey = `ws_todos_${userId}`;

  if (client) {
    try {
      const { data, error } = await client
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedTodos: TodoTask[] = data.map((item: any) => ({
          id: item.id || `todo-${Date.now()}`,
          title: item.task_name || item.title || '',
          description: item.description || '',
          status: item.status || 'pending',
          priority: item.priority || 'medium',
          dueDate: item.due_date || new Date().toISOString().split('T')[0],
          category: item.category || 'General',
          createdAt: item.created_at || new Date().toISOString(),
        }));

        try {
          localStorage.setItem(localKey, JSON.stringify(mappedTodos));
        } catch {
          // ignore
        }
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
  const client = getSupabase();
  const localKey = `ws_todos_${userId}`;

  if (client) {
    try {
      const hasValidUuid = isValidUUID(todo.id);
      const payload: Record<string, any> = {
        user_id: userId,
        task_name: todo.title,
        description: todo.description || '',
        status: todo.status || 'pending',
        priority: todo.priority || 'medium',
        due_date: todo.dueDate || null,
        category: todo.category || 'General',
        created_at: todo.createdAt || new Date().toISOString(),
      };

      if (hasValidUuid) payload.id = todo.id;

      const res = hasValidUuid
        ? await client.from('todos').upsert(payload, { onConflict: 'id' }).select().single()
        : await client.from('todos').insert(payload).select().single();

      if (!res.error && res.data) {
        const savedTodo: TodoTask = {
          id: res.data.id,
          title: res.data.task_name || res.data.title || '',
          description: res.data.description || '',
          status: res.data.status || 'pending',
          priority: res.data.priority || 'medium',
          dueDate: res.data.due_date || todo.dueDate,
          category: res.data.category || 'General',
          createdAt: res.data.created_at || todo.createdAt,
        };

        try {
          const raw = localStorage.getItem(localKey);
          const list: TodoTask[] = raw ? JSON.parse(raw) : [];
          const idx = list.findIndex((t) => t.id === savedTodo.id || t.id === todo.id);
          if (idx !== -1) list[idx] = savedTodo;
          else list.unshift(savedTodo);
          localStorage.setItem(localKey, JSON.stringify(list));
        } catch (e) {
          console.warn('Error caching todo locally', e);
        }

        return { data: savedTodo, error: null };
      }
    } catch (e: any) {
      console.error('Error saving todo in Supabase:', e);
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    const list: TodoTask[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((t) => t.id === todo.id);
    if (idx !== -1) list[idx] = todo;
    else list.unshift(todo);
    localStorage.setItem(localKey, JSON.stringify(list));
    return { data: todo, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to save todo locally' };
  }
}

export async function syncDeleteTodo(userId: string, todoId: string): Promise<boolean> {
  const client = getSupabase();
  const localKey = `ws_todos_${userId}`;

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: TodoTask[] = JSON.parse(raw);
      localStorage.setItem(localKey, JSON.stringify(list.filter((t) => t.id !== todoId)));
    }
  } catch (e) {
    console.warn('Error removing todo from local cache', e);
  }

  if (client) {
    try {
      await client.from('todos').delete().eq('id', todoId).eq('user_id', userId);
    } catch (e) {
      console.warn('Error deleting todo from Supabase:', e);
    }
  }
  return true;
}

// Aliases for convenient imports
export const fetchNotes = syncFetchNotes;
export const fetchTodos = syncFetchTodos;

// -----------------------------------------------------------------------------
// Work Logs Sync Operations
// -----------------------------------------------------------------------------

export async function syncFetchWorkLogs(userId: string): Promise<{ worklogs: WorkLog[]; isCloud: boolean }> {
  const client = getSupabase();
  const localKey = `ws_worklogs_${userId}`;

  if (client) {
    try {
      const { data, error } = await client
        .from('work_logs')
        .select('*')
        .eq('user_id', userId)
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

        try {
          localStorage.setItem(localKey, JSON.stringify(mappedLogs));
        } catch {
          // ignore
        }
        return { worklogs: mappedLogs, isCloud: true };
      }
    } catch (err) {
      console.warn('Error fetching work logs from Supabase:', err);
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) return { worklogs: JSON.parse(raw), isCloud: false };
  } catch (e) {
    console.error('Error reading worklogs', e);
  }

  return { worklogs: [], isCloud: false };
}

export async function syncSaveWorkLog(
  userId: string,
  log: WorkLog
): Promise<{ data: WorkLog | null; error: string | null }> {
  const client = getSupabase();
  const localKey = `ws_worklogs_${userId}`;

  if (client) {
    try {
      const hasValidUuid = isValidUUID(log.id);
      const durationMinutes = Math.round(log.hoursSpent * 60);
      const payload: Record<string, any> = {
        user_id: userId,
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

      if (hasValidUuid) payload.id = log.id;

      const res = hasValidUuid
        ? await client.from('work_logs').upsert(payload, { onConflict: 'id' }).select().single()
        : await client.from('work_logs').insert(payload).select().single();

      if (!res.error && res.data) {
        const savedLog: WorkLog = {
          id: res.data.id,
          projectName: res.data.project_name || '',
          taskDescription: res.data.description || '',
          hoursSpent:
            (res.data.duration_minutes ? res.data.duration_minutes / 60 : 0) || Number(res.data.hours_spent || 0),
          date: res.data.log_date || res.data.date || new Date().toISOString().split('T')[0],
          startTime: res.data.start_time || undefined,
          endTime: res.data.end_time || undefined,
          category: res.data.category || 'General',
          createdAt: res.data.created_at || log.createdAt,
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
      console.error('Error saving work log in Supabase:', e);
    }
  }

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
  const client = getSupabase();
  const localKey = `ws_worklogs_${userId}`;

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const currentList: WorkLog[] = JSON.parse(raw);
      localStorage.setItem(localKey, JSON.stringify(currentList.filter((w) => w.id !== logId)));
    }
  } catch (e) {
    console.warn('Error deleting worklog from local cache', e);
  }

  if (client) {
    try {
      await client.from('work_logs').delete().eq('id', logId).eq('user_id', userId);
    } catch (e) {
      console.warn('Error deleting work log from Supabase:', e);
    }
  }
  return true;
}

// -----------------------------------------------------------------------------
// Folders & Files Operations
// -----------------------------------------------------------------------------

export const getUserFoldersKey = (userId: string) => `ws_folders_${userId}`;
export const getUserFilesKey = (userId: string) => `ws_files_${userId}`;

export async function syncFetchFolders(
  userId: string
): Promise<{ folders: Folder[]; isCloud: boolean }> {
  const client = getSupabase();
  const localKey = getUserFoldersKey(userId);

  if (client) {
    try {
      const { data, error } = await client
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (!error && data) {
        const mappedFolders: Folder[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id || userId,
          name: row.name || 'Untitled Folder',
          parentId: row.parent_id || null,
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || row.created_at,
        }));

        try {
          localStorage.setItem(localKey, JSON.stringify(mappedFolders));
        } catch (e) {
          console.warn('Failed to cache folders locally', e);
        }

        return { folders: mappedFolders, isCloud: true };
      }
    } catch (e) {
      console.warn('Exception during syncFetchFolders, falling back to local:', e);
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      return { folders: JSON.parse(raw), isCloud: false };
    }
  } catch (e) {
    console.error('Error parsing local folders', e);
  }

  return { folders: [], isCloud: false };
}

export async function syncCreateFolder(
  userId: string,
  name: string,
  parentId?: string | null
): Promise<{ data: Folder | null; error: string | null }> {
  const client = getSupabase();
  const localKey = getUserFoldersKey(userId);

  if (client) {
    try {
      const validParentId = parentId && isValidUUID(parentId) ? parentId : null;
      const payload = {
        user_id: userId,
        name: name.trim() || 'New Folder',
        parent_id: validParentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await client
        .from('folders')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Supabase create folder error:', error);
        return { data: null, error: error.message };
      }

      if (data) {
        const newFolder: Folder = {
          id: data.id,
          userId: data.user_id || userId,
          name: data.name,
          parentId: data.parent_id || null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        try {
          const raw = localStorage.getItem(localKey);
          const currentList: Folder[] = raw ? JSON.parse(raw) : [];
          currentList.push(newFolder);
          localStorage.setItem(localKey, JSON.stringify(currentList));
        } catch (e) {
          console.warn('Error caching created folder locally', e);
        }

        return { data: newFolder, error: null };
      }
    } catch (e: any) {
      console.error('Unexpected error in syncCreateFolder:', e);
      return { data: null, error: e?.message || 'Error communicating with Supabase' };
    }
  }

  const localFolder: Folder = {
    id: `folder-${Date.now()}`,
    userId,
    name: name.trim() || 'New Folder',
    parentId: parentId || null,
    createdAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(localKey);
    const currentList: Folder[] = raw ? JSON.parse(raw) : [];
    currentList.push(localFolder);
    localStorage.setItem(localKey, JSON.stringify(currentList));
    return { data: localFolder, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to save folder locally' };
  }
}

export async function syncDeleteFolder(userId: string, folderId: string): Promise<boolean> {
  const client = getSupabase();
  const localKey = getUserFoldersKey(userId);
  const localFilesKey = getUserFilesKey(userId);

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const currentList: Folder[] = JSON.parse(raw);
      localStorage.setItem(localKey, JSON.stringify(currentList.filter((f) => f.id !== folderId)));
    }
    const rawFiles = localStorage.getItem(localFilesKey);
    if (rawFiles) {
      const currentFiles: UserFile[] = JSON.parse(rawFiles);
      localStorage.setItem(localFilesKey, JSON.stringify(currentFiles.filter((f) => f.folderId !== folderId)));
    }
  } catch (e) {
    console.warn('Error deleting folder from local cache', e);
  }

  if (client) {
    try {
      await client
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', userId);
    } catch (e) {
      console.warn('Error deleting folder from Supabase:', e);
    }
  }
  return true;
}

export async function syncUploadFile(
  userId: string,
  folderId: string | null | undefined,
  file: File
): Promise<{ data: UserFile | null; error: string | null }> {
  const client = getSupabase();
  const localKey = getUserFilesKey(userId);

  if (client) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const targetFolder = folderId && isValidUUID(folderId) ? folderId : 'root';
      const storagePath = `${userId}/${targetFolder}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await client.storage
        .from('user_files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      let publicUrl = '';
      if (!uploadError) {
        const { data: urlData } = client.storage
          .from('user_files')
          .getPublicUrl(storagePath);
        publicUrl = urlData?.publicUrl || '';
      }

      if (!publicUrl) {
        try {
          publicUrl = URL.createObjectURL(file);
        } catch {
          publicUrl = '';
        }
      }

      const validFolderId = folderId && isValidUUID(folderId) ? folderId : null;
      const filePayload = {
        user_id: userId,
        folder_id: validFolderId,
        name: file.name,
        file_path: storagePath,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        storage_url: publicUrl,
        created_at: new Date().toISOString(),
      };

      const { data, error: dbError } = await client
        .from('files')
        .insert(filePayload)
        .select()
        .single();

      if (dbError) {
        const fallbackFile: UserFile = {
          id: `file-${Date.now()}`,
          userId,
          folderId: folderId || null,
          name: file.name,
          filePath: storagePath,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          storageUrl: publicUrl,
          createdAt: new Date().toISOString(),
        };

        try {
          const raw = localStorage.getItem(localKey);
          const currentList: UserFile[] = raw ? JSON.parse(raw) : [];
          currentList.unshift(fallbackFile);
          localStorage.setItem(localKey, JSON.stringify(currentList));
        } catch (e) {
          console.warn('Error caching uploaded file locally', e);
        }

        return { data: fallbackFile, error: null };
      }

      if (data) {
        const savedFile: UserFile = {
          id: data.id,
          userId: data.user_id || userId,
          folderId: data.folder_id || null,
          name: data.name,
          filePath: data.file_path,
          fileType: data.file_type || 'application/octet-stream',
          fileSize: Number(data.file_size || 0),
          storageUrl: data.storage_url || publicUrl,
          createdAt: data.created_at,
        };

        try {
          const raw = localStorage.getItem(localKey);
          const currentList: UserFile[] = raw ? JSON.parse(raw) : [];
          currentList.unshift(savedFile);
          localStorage.setItem(localKey, JSON.stringify(currentList));
        } catch (e) {
          console.warn('Error caching uploaded file locally', e);
        }

        return { data: savedFile, error: null };
      }
    } catch (e: any) {
      console.error('Unexpected error in syncUploadFile:', e);
      return { data: null, error: e?.message || 'Error communicating with Supabase' };
    }
  }

  const localFile: UserFile = {
    id: `file-${Date.now()}`,
    userId,
    folderId: folderId || null,
    name: file.name,
    filePath: `local/${file.name}`,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    storageUrl: URL.createObjectURL(file),
    createdAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(localKey);
    const currentList: UserFile[] = raw ? JSON.parse(raw) : [];
    currentList.unshift(localFile);
    localStorage.setItem(localKey, JSON.stringify(currentList));
    return { data: localFile, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to save file locally' };
  }
}

export async function syncFetchFiles(
  userId: string,
  folderId?: string | null
): Promise<{ files: UserFile[]; isCloud: boolean }> {
  const client = getSupabase();
  const localKey = getUserFilesKey(userId);

  if (client) {
    try {
      let query = client
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (folderId !== undefined) {
        if (folderId && isValidUUID(folderId)) {
          query = query.eq('folder_id', folderId);
        } else if (folderId === null || folderId === '') {
          query = query.is('folder_id', null);
        }
      }

      const { data, error } = await query;

      if (!error && data) {
        const mappedFiles: UserFile[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id || userId,
          folderId: row.folder_id || null,
          name: row.name || 'Unnamed File',
          filePath: row.file_path || '',
          fileType: row.file_type || 'application/octet-stream',
          fileSize: Number(row.file_size || 0),
          storageUrl: row.storage_url || '',
          createdAt: row.created_at || new Date().toISOString(),
        }));

        try {
          if (folderId === undefined) {
            localStorage.setItem(localKey, JSON.stringify(mappedFiles));
          }
        } catch (e) {
          console.warn('Failed to cache files locally', e);
        }

        return { files: mappedFiles, isCloud: true };
      }
    } catch (e) {
      console.warn('Exception during syncFetchFiles:', e);
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const allFiles: UserFile[] = JSON.parse(raw);
      if (folderId !== undefined) {
        return {
          files: allFiles.filter((f) => (folderId ? f.folderId === folderId : !f.folderId)),
          isCloud: false,
        };
      }
      return { files: allFiles, isCloud: false };
    }
  } catch (e) {
    console.error('Error parsing local files', e);
  }

  return { files: [], isCloud: false };
}

export async function syncDeleteFile(
  userId: string,
  fileId: string,
  filePath: string
): Promise<boolean> {
  const client = getSupabase();
  const localKey = getUserFilesKey(userId);

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const currentList: UserFile[] = JSON.parse(raw);
      localStorage.setItem(localKey, JSON.stringify(currentList.filter((f) => f.id !== fileId)));
    }
  } catch (e) {
    console.warn('Error deleting file from local cache', e);
  }

  if (client) {
    try {
      if (filePath) {
        await client.storage.from('user_files').remove([filePath]);
      }
      await client
        .from('files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', userId);
    } catch (e) {
      console.warn('Error deleting file from Supabase:', e);
    }
  }
  return true;
}

export async function syncDownloadFile(file: {
  name: string;
  storageUrl?: string;
  filePath?: string;
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();

  if (client && file.filePath && !file.filePath.startsWith('local/')) {
    try {
      const { data, error } = await client.storage.from('user_files').download(file.filePath);
      if (!error && data) {
        const blobUrl = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500);
        return { success: true };
      }
    } catch (err) {
      console.warn('Supabase Storage download failed:', err);
    }
  }

  if (file.storageUrl) {
    try {
      const a = document.createElement('a');
      a.href = file.storageUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true };
    } catch {
      window.open(file.storageUrl, '_blank');
      return { success: true };
    }
  }

  return { success: false, error: 'No download source found for this file.' };
}

// -----------------------------------------------------------------------------
// Unified SQL Schema & RLS Policies
// -----------------------------------------------------------------------------

export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- WORKSPACE PRO - UNIFIED SINGLE SUPABASE BACKEND (RBAC & RLS POLICIES)
-- =========================================================================

-- 1. PROFILES TABLE & ROLE-BASED ACCESS CONTROL (RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Profiles view policy" ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Profiles update policy" ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Profiles insert policy" ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- 2. NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    color_scheme TEXT DEFAULT 'default',
    category TEXT DEFAULT 'General',
    is_pinned BOOLEAN DEFAULT FALSE,
    notify_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notes select policy" ON public.notes FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Notes insert policy" ON public.notes FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Notes update policy" ON public.notes FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Notes delete policy" ON public.notes FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- 3. TODOS TABLE
CREATE TABLE IF NOT EXISTS public.todos (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_name TEXT,
    title TEXT,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    due_date TEXT,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos select policy" ON public.todos FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Todos insert policy" ON public.todos FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Todos update policy" ON public.todos FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Todos delete policy" ON public.todos FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- 4. WORK_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.work_logs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    duration_minutes INTEGER DEFAULT 0,
    hours_spent NUMERIC DEFAULT 0,
    log_date TEXT NOT NULL,
    date TEXT,
    start_time TEXT,
    end_time TEXT,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WorkLogs select policy" ON public.work_logs FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "WorkLogs insert policy" ON public.work_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "WorkLogs update policy" ON public.work_logs FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "WorkLogs delete policy" ON public.work_logs FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- 5. FOLDERS & FILES TABLES
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Folders select policy" ON public.folders FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Folders insert policy" ON public.folders FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Folders update policy" ON public.folders FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Folders delete policy" ON public.folders FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    storage_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Files select policy" ON public.files FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Files insert policy" ON public.files FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Files update policy" ON public.files FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Files delete policy" ON public.files FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());
`;
