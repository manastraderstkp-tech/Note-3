/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Note, TodoTask, WorkLog, UserSession, UserRole, UserProfile } from '../types';
import { INITIAL_NOTES, INITIAL_TODOS, INITIAL_WORKLOGS } from '../data/initialData';

// Storage keys for custom client config
const STORAGE_KEY_URL = 'workspace_supabase_url';
const STORAGE_KEY_KEY = 'workspace_supabase_anon_key';
const STORAGE_KEY_USER = 'workspace_current_user';
const STORAGE_KEY_PROFILES = 'workspace_profiles_list';

// Default designated Admin email
export const DEFAULT_ADMIN_EMAIL = 'manastraderstkp@gmail.com';

// Get current credentials (from env or localStorage)
export function getStoredSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  let url = '';
  let anonKey = '';

  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const envUrl = metaEnv?.VITE_SUPABASE_URL;
    const envKey = metaEnv?.VITE_SUPABASE_ANON_KEY;
    const localUrl = localStorage.getItem(STORAGE_KEY_URL);
    const localKey = localStorage.getItem(STORAGE_KEY_KEY);

    url = (localUrl || envUrl || '').trim();
    anonKey = (localKey || envKey || '').trim();
  } catch (e) {
    console.warn('Unable to read environment or storage for Supabase credentials', e);
  }

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('your-project-ref') &&
    !anonKey.includes('your-anon-public-key') &&
    url.startsWith('http')
  );

  return { url, anonKey, isConfigured };
}

// Global Supabase client instance
let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getStoredSupabaseConfig();

  if (!isConfigured) {
    return null;
  }

  if (!supabaseClientInstance) {
    try {
      supabaseClientInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseClientInstance;
}

// Update configuration dynamically
export function saveSupabaseConfig(url: string, anonKey: string) {
  try {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    supabaseClientInstance = null; // reset client to re-initialize
  } catch (err) {
    console.error('Failed to save Supabase credentials to storage', err);
  }
}

export function clearSupabaseConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    supabaseClientInstance = null;
  } catch (err) {
    console.error('Failed to clear Supabase config', err);
  }
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
// Authentication Helper Operations
// -----------------------------------------------------------------------------

export async function signUpUser(
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: UserSession | null; error: string | null }> {
  const supabase = getSupabase();
  const trimmedEmail = email.trim().toLowerCase();

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: fullName || trimmedEmail.split('@')[0],
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Fetch role from profiles table (trigger creates row with role 'user')
        const { role } = await fetchUserProfile(
          data.user.id,
          trimmedEmail,
          data.user.user_metadata?.full_name || fullName
        );

        const sessionUser: UserSession = {
          id: data.user.id,
          email: data.user.email || trimmedEmail,
          fullName: data.user.user_metadata?.full_name || fullName || trimmedEmail.split('@')[0],
          role,
          isDemo: false,
          createdAt: data.user.created_at,
        };
        storeLocalUser(sessionUser);
        return { user: sessionUser, error: null };
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error communicating with Supabase auth';
      return { user: null, error: errorMessage };
    }
  }

  // Fallback / Offline local user registration if Supabase keys are not yet configured
  const userId = `usr_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  const defaultRole: UserRole = trimmedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
  const localUser: UserSession = {
    id: userId,
    email: trimmedEmail,
    fullName: fullName || trimmedEmail.split('@')[0],
    role: defaultRole,
    isDemo: false,
    createdAt: new Date().toISOString(),
  };
  storeLocalUser(localUser);
  saveLocalProfile({
    id: userId,
    email: trimmedEmail,
    fullName: localUser.fullName,
    role: defaultRole,
    createdAt: localUser.createdAt!,
  });
  return { user: localUser, error: null };
}

export async function signInUser(
  email: string,
  password: string
): Promise<{ user: UserSession | null; error: string | null }> {
  const supabase = getSupabase();
  const trimmedEmail = email.trim().toLowerCase();

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Fetch role from profiles table
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
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error logging into Supabase';
      return { user: null, error: errorMessage };
    }
  }

  // Local fallback account authentication
  const existingUsers = getLocalRegisteredUsers();
  const matched = existingUsers.find((u) => u.email === trimmedEmail);
  const defaultRole: UserRole = trimmedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';

  const sessionUser: UserSession = matched
    ? { ...matched, role: matched.role || defaultRole }
    : {
        id: `usr_${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: trimmedEmail,
        fullName: trimmedEmail.split('@')[0],
        role: defaultRole,
        isDemo: false,
        createdAt: new Date().toISOString(),
      };

  storeLocalUser(sessionUser);
  return { user: sessionUser, error: null };
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
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session?.user) {
        const userEmail = session.user.email || '';
        const fullName = session.user.user_metadata?.full_name || userEmail.split('@')[0];
        const { role } = await fetchUserProfile(session.user.id, userEmail, fullName);
        const sessionUser: UserSession = {
          id: session.user.id,
          email: userEmail,
          fullName,
          role,
          isDemo: false,
          createdAt: session.user.created_at,
        };
        storeLocalUser(sessionUser);
        return sessionUser;
      }
    } catch (e) {
      console.warn('Error getting initial Supabase session', e);
    }
  }
  return getCurrentStoredUser();
}

export function getCurrentStoredUser(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.role) {
        parsed.role = parsed.email === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
      }
      return parsed;
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
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedNotes: Note[] = data.map((item: any) => ({
          id: item.id || `note-${Date.now()}`,
          title: item.title || '',
          content: item.content || '',
          tags: Array.isArray(item.tags) ? item.tags : typeof item.tags === 'string' ? JSON.parse(item.tags || '[]') : [],
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
        console.warn('Supabase fetch notes error (will use local user data):', error.message);
      }
    } catch (err) {
      console.warn('Error fetching notes from Supabase:', err);
    }
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      return { notes: JSON.parse(raw), isCloud: false };
    }
  } catch (e) {
    console.error('Error parsing local notes', e);
  }

  // If first time for this user, populate sample initial data
  const initial = INITIAL_NOTES;
  localStorage.setItem(localKey, JSON.stringify(initial));
  return { notes: initial, isCloud: false };
}

export async function syncSaveNote(userId: string, note: Note): Promise<boolean> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const payload = {
        id: note.id,
        user_id: userId,
        title: note.title,
        content: note.content,
        tags: note.tags,
        category: note.category,
        color_scheme: note.colorScheme || 'default',
        is_pinned: note.isPinned,
        notify_at: note.notifyAt || null,
        notified: Boolean(note.notified),
        created_at: note.createdAt,
        updated_at: note.updatedAt,
      };

      const { error } = await supabase.from('notes').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase save note warning:', error.message);
      }
    } catch (e) {
      console.warn('Error syncing note to Supabase:', e);
    }
  }

  return true;
}

export async function syncDeleteNote(userId: string, noteId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
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
      const { data, error } = await supabase
        .from('todos')
        .select('*')
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
      return { todos: JSON.parse(raw), isCloud: false };
    }
  } catch (e) {
    console.error('Error reading local todos', e);
  }

  const initial = INITIAL_TODOS;
  localStorage.setItem(localKey, JSON.stringify(initial));
  return { todos: initial, isCloud: false };
}

export async function syncSaveTodo(userId: string, todo: TodoTask): Promise<boolean> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const payload = {
        id: todo.id,
        user_id: userId,
        task_name: todo.title,
        description: todo.description || '',
        status: todo.status,
        priority: todo.priority,
        due_time: todo.dueDate,
        notify_at: todo.notifyAt || null,
        notified: Boolean(todo.notified),
        category: todo.category,
        created_at: todo.createdAt,
      };

      const { error } = await supabase.from('todos').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase save todo warning:', error.message);
      }
    } catch (e) {
      console.warn('Error syncing todo to Supabase:', e);
    }
  }
  return true;
}

export async function syncDeleteTodo(userId: string, todoId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('todos').delete().eq('id', todoId);
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
      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedLogs: WorkLog[] = data.map((item: any) => ({
          id: item.id || `worklog-${Date.now()}`,
          projectName: item.project_name || '',
          taskDescription: item.description || '',
          hoursSpent: (item.duration_minutes ? item.duration_minutes / 60 : 0) || Number(item.hours_spent || 0),
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
      return { worklogs: JSON.parse(raw), isCloud: false };
    }
  } catch (e) {
    console.error('Error reading local worklogs', e);
  }

  const initial = INITIAL_WORKLOGS;
  localStorage.setItem(localKey, JSON.stringify(initial));
  return { worklogs: initial, isCloud: false };
}

export async function syncSaveWorkLog(userId: string, log: WorkLog): Promise<boolean> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const durationMinutes = Math.round(log.hoursSpent * 60);
      const payload = {
        id: log.id,
        user_id: userId,
        project_name: log.projectName,
        description: log.taskDescription,
        duration_minutes: durationMinutes,
        log_date: log.date,
        start_time: log.startTime || null,
        end_time: log.endTime || null,
        category: log.category,
        created_at: log.createdAt,
      };

      const { error } = await supabase.from('work_logs').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase save work log warning:', error.message);
      }
    } catch (e) {
      console.warn('Error syncing work log to Supabase:', e);
    }
  }
  return true;
}

export async function syncDeleteWorkLog(userId: string, logId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('work_logs').delete().eq('id', logId);
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
-- WORKSPACE PRODUCTIVITY APP - ROLE-BASED ACCESS CONTROL (RBAC) & SUPABASE SCHEMA
-- Roles: 'admin' (Full System Access & Analytics) | 'user' (Personal Space Only)
-- Run this in your Supabase Project: Dashboard > SQL Editor > New Query
-- =========================================================================

-- 1. Create PROFILES Table for User Roles & Profiles
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
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Automatic Trigger to Create a Profile with Role 'user' on New Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'user', -- Default role for all new signups
        TIMEZONE('utc'::text, NOW()),
        TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Set Specific Account as Admin in Database
-- Modify this email or run this update whenever you want to designate an admin account:
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE email = 'manastraderstkp@gmail.com';

-- 5. Create NOTES Table
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    category TEXT DEFAULT 'General',
    color_scheme TEXT DEFAULT 'default',
    is_pinned BOOLEAN DEFAULT FALSE,
    notify_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Create TODOS Table
CREATE TABLE IF NOT EXISTS public.todos (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    due_time TEXT,
    notify_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT FALSE,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Create WORK_LOGS Table
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
-- ROW LEVEL SECURITY (RLS) POLICIES WITH ROLE-BASED ACCESS CONTROL (RBAC)
-- • Standard Users: Can ONLY Create, View, Update, and Delete rows where user_id = auth.uid()
-- • Admins: Have full system-wide permissions across all rows regardless of user_id
-- -------------------------------------------------------------------------

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
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

-- PROFILES Policies
-- Users can view their own profile; Admins can view all profiles
CREATE POLICY "Profiles read policy"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

-- Users can update their own name; Admins can update any profile/role
CREATE POLICY "Profiles update policy"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- Admins full management on profiles
CREATE POLICY "Profiles admin all policy"
    ON public.profiles FOR ALL
    USING (public.is_admin());

-- NOTES Policies
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

-- TODOS Policies
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

-- WORK_LOGS Policies
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

-- Performance & Query Optimization Indexes
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS todos_user_id_idx ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS work_logs_user_id_idx ON public.work_logs(user_id);
`;
