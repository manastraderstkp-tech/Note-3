/**

 * @license

 * SPDX-License-Identifier: Apache-2.0

 */



import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { Note, TodoTask, WorkLog, Folder, UserFile, UserSession, UserRole, UserProfile } from '../types';

import { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_ADMIN_EMAIL, EMAIL_REDIRECT_URL } from './config';



export { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_ADMIN_EMAIL, EMAIL_REDIRECT_URL };



const STORAGE_KEY_URL = 'workspace_supabase_url';

const STORAGE_KEY_KEY = 'workspace_supabase_anon_key';

const STORAGE_KEY_USER = 'workspace_current_user';

const STORAGE_KEY_PROFILES = 'workspace_profiles_list';



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

    // Ignore localStorage errors

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

    return 'Unable to connect to Supabase backend. Please verify your Supabase URL and Anon Key.';

  }



  return rawMsg;

}



// -----------------------------------------------------------------------------

// Profiles Operations

// -----------------------------------------------------------------------------



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

        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(mapped));

        return mapped;

      }

    } catch (e) {

      console.warn('Error fetching all profiles:', e);

    }

  }



  return getLocalProfiles();

}



export async function updateUserRoleInDb(userId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> {

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

// Authentication Operations

// -----------------------------------------------------------------------------



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

      const { data: { user }, error } = await client.auth.getUser();

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



export function getCurrentStoredUser(): UserSession | null {

  try {

    const raw = localStorage.getItem(STORAGE_KEY_USER);

    if (raw) return JSON.parse(raw);

  } catch (e) {

    console.error('Error reading session', e);

  }

  return null;

}



export function storeLocalUser(user: UserSession) {

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



// -----------------------------------------------------------------------------

// Database Sync Operations

// -----------------------------------------------------------------------------



export function isValidUUID(str: string | undefined | null): boolean {

  if (!str || typeof str !== 'string') return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

}



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



        localStorage.setItem(localKey, JSON.stringify(mappedNotes));

        return { notes: mappedNotes, isCloud: true };

      }

    } catch (err) {

      console.warn('Error fetching notes:', err);

    }

  }



  try {

    const raw = localStorage.getItem(localKey);

    if (raw) return { notes: JSON.parse(raw), isCloud: false };

  } catch (e) {

    console.error('Error parsing notes', e);

  }



  return { notes: [], isCloud: false };

}



export async function syncSaveNote(

  userId: string,

  note: Note

): Promise<{ data: Note | null; error: string | null }> {

  const client = getSupabase();



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

        return {

          data: {

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

          },

          error: null,

        };

      }

    } catch (e: any) {

      console.error('Error saving note:', e);

    }

  }



  return { data: note, error: null };

}



export async function syncDeleteNote(userId: string, noteId: string): Promise<boolean> {

  const client = getSupabase();

  if (client) {

    try {

      await client.from('notes').delete().eq('id', noteId).eq('user_id', userId);

    } catch (e) {

      console.warn('Error deleting note:', e);

    }

  }

  return true;

}



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



        localStorage.setItem(localKey, JSON.stringify(mappedTodos));

        return { todos: mappedTodos, isCloud: true };

      }

    } catch (err) {

      console.warn('Error fetching todos:', err);

    }

  }



  try {

    const raw = localStorage.getItem(localKey);

    if (raw) return { todos: JSON.parse(raw), isCloud: false };

  } catch (e) {

    console.error('Error reading todos', e);

  }



  return { todos: [], isCloud: false };

}



export async function syncSaveTodo(

  userId: string,

  todo: TodoTask

): Promise<{ data: TodoTask | null; error: string | null }> {

  const client = getSupabase();



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

        return {

          data: {

            id: res.data.id,

            title: res.data.task_name || res.data.title || '',

            description: res.data.description || '',

            status: res.data.status || 'pending',

            priority: res.data.priority || 'medium',

            dueDate: res.data.due_date || todo.dueDate,

            category: res.data.category || 'General',

            createdAt: res.data.created_at || todo.createdAt,

          },

          error: null,

        };

      }

    } catch (e: any) {

      console.error('Error saving todo:', e);

    }

  }



  return { data: todo, error: null };

}



export async function syncDeleteTodo(userId: string, todoId: string): Promise<boolean> {

  const client = getSupabase();

  if (client) {

    try {

      await client.from('todos').delete().eq('id', todoId).eq('user_id', userId);

    } catch (e) {

      console.warn('Error deleting todo:', e);

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



        localStorage.setItem(localKey, JSON.stringify(mappedLogs));

        return { worklogs: mappedLogs, isCloud: true };

      }

    } catch (err) {

      console.warn('Error fetching work logs:', err);

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

      console.error('Error saving work log:', e);

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

      console.warn('Error deleting work log:', e);

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

    localStorage.setItem(localKey, JSON.stringify 

