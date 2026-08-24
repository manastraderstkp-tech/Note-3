/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Note,
  TodoTask,
  Folder,
  UserFile,
  UserTransaction,
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
    lower.includes('unsupported provider') ||
    lower.includes('provider is not enabled') ||
    lower.includes('provider_disabled')
  ) {
    return 'Google Provider is currently disabled in your Supabase Dashboard. Please go to Authentication -> Providers -> Google, toggle "Enable Sign in with Google" to ON, enter your Client ID & Secret, and click Save.';
  }

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

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  const localProfiles = getLocalProfiles();
  const localExisting = localProfiles.find((p) => p.id === userId || (trimmedEmail && p.email === trimmedEmail));
  const storedUser = getCurrentStoredUser();

  if (client) {
    try {
      // Check auth metadata for fallback
      let authMeta: Record<string, any> = {};
      let authUserPhone: string | undefined = undefined;
      try {
        const { data: authUserData } = await client.auth.getUser();
        if (authUserData?.user?.id === userId) {
          authUserPhone = authUserData.user.phone;
          if (authUserData.user.user_metadata) {
            authMeta = authUserData.user.user_metadata;
          }
        }
      } catch {
        // ignore
      }

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
          fullName: data.full_name || authMeta.full_name || authMeta.name || localExisting?.fullName || fullName,
          phoneNumber: data.phone_number || authUserPhone || authMeta.phone || authMeta.phone_number || authMeta.phoneNumber || localExisting?.phoneNumber || (storedUser?.id === userId ? storedUser.phoneNumber : undefined),
          avatarUrl: data.avatar_url || authMeta.avatar_url || authMeta.picture || authMeta.avatar || localExisting?.avatarUrl || (storedUser?.id === userId ? storedUser.avatarUrl : undefined),
          role,
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at,
        };
        saveLocalProfile(profile);
        return { role, profile };
      }

      const defaultRole: UserRole = trimmedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
      const resolvedPhone = authUserPhone || authMeta.phone || authMeta.phone_number || authMeta.phoneNumber || localExisting?.phoneNumber || (storedUser?.id === userId ? storedUser.phoneNumber : undefined);
      const resolvedAvatar = authMeta.avatar_url || authMeta.picture || authMeta.avatar || localExisting?.avatarUrl || (storedUser?.id === userId ? storedUser.avatarUrl : undefined);

      const newProfile: UserProfile = {
        id: userId,
        email: trimmedEmail,
        fullName: fullName || authMeta.full_name || authMeta.name || trimmedEmail.split('@')[0],
        phoneNumber: resolvedPhone,
        avatarUrl: resolvedAvatar,
        role: defaultRole,
        createdAt: new Date().toISOString(),
      };

      try {
        const upsertPayload: Record<string, any> = {
          id: userId,
          email: trimmedEmail,
          full_name: newProfile.fullName,
          role: defaultRole,
          created_at: newProfile.createdAt,
          updated_at: new Date().toISOString(),
        };
        if (resolvedPhone) upsertPayload.phone_number = resolvedPhone;
        if (resolvedAvatar) upsertPayload.avatar_url = resolvedAvatar;

        const { error: upsertErr } = await client.from('profiles').upsert(upsertPayload, { onConflict: 'id' });
        if (upsertErr) {
          // If custom columns don't exist yet, retry standard schema
          await client.from('profiles').upsert(
            {
              id: userId,
              email: trimmedEmail,
              full_name: newProfile.fullName,
              role: defaultRole,
              created_at: newProfile.createdAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        }
      } catch (upsertCatch) {
        console.warn('Upsert fallback error:', upsertCatch);
      }

      saveLocalProfile(newProfile);
      return { role: defaultRole, profile: newProfile };
    } catch (err) {
      console.warn('Error fetching profile from Supabase:', err);
    }
  }

  if (localExisting) {
    return { role: localExisting.role, profile: localExisting };
  }

  const defaultRole: UserRole = trimmedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
  const fallbackProfile: UserProfile = {
    id: userId,
    email: trimmedEmail,
    fullName: fullName || trimmedEmail.split('@')[0],
    phoneNumber: storedUser?.id === userId ? storedUser.phoneNumber : undefined,
    avatarUrl: storedUser?.id === userId ? storedUser.avatarUrl : undefined,
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
          phoneNumber: d.phone_number,
          avatarUrl: d.avatar_url,
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

export async function uploadUserAvatar(
  userId: string,
  imageFileOrBlobOrDataUrl: File | Blob | string
): Promise<{ publicUrl: string | null; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { publicUrl: null, error: 'Supabase client is not configured' };
  }

  try {
    let fileBlob: Blob | File;
    let extension = 'jpg';

    if (typeof imageFileOrBlobOrDataUrl === 'string') {
      if (imageFileOrBlobOrDataUrl.startsWith('http://') || imageFileOrBlobOrDataUrl.startsWith('https://')) {
        return { publicUrl: imageFileOrBlobOrDataUrl, error: null };
      }
      if (imageFileOrBlobOrDataUrl.startsWith('data:')) {
        const parts = imageFileOrBlobOrDataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        extension = mimeType.split('/')[1] || 'jpg';
        const byteString = atob(parts[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        fileBlob = new Blob([ab], { type: mimeType });
      } else {
        return { publicUrl: imageFileOrBlobOrDataUrl, error: null };
      }
    } else {
      fileBlob = imageFileOrBlobOrDataUrl;
      if (imageFileOrBlobOrDataUrl instanceof File && imageFileOrBlobOrDataUrl.name) {
        const nameParts = imageFileOrBlobOrDataUrl.name.split('.');
        if (nameParts.length > 1) {
          extension = nameParts.pop() || 'jpg';
        }
      }
    }

    const timestamp = Date.now();
    const fileName = `${userId}/avatar_${timestamp}.${extension}`;
    const fallbackPath = `${userId}/avatar.${extension}`;

    // Try 'avatars' storage bucket
    let bucketName = 'avatars';
    let { data: uploadData, error: uploadErr } = await client.storage
      .from(bucketName)
      .upload(fileName, fileBlob, {
        cacheControl: '3600',
        upsert: true,
      });

    // If 'avatars' bucket is missing or throws error, try 'user_files' bucket
    if (uploadErr) {
      console.warn('Upload to avatars bucket failed, trying user_files bucket:', uploadErr);
      bucketName = 'user_files';
      const resFallback = await client.storage
        .from(bucketName)
        .upload(`avatars/${fileName}`, fileBlob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (resFallback.error) {
        console.warn('Upload to user_files also failed, trying fallback path in avatars:', resFallback.error);
        bucketName = 'avatars';
        const resRetry = await client.storage
          .from(bucketName)
          .upload(fallbackPath, fileBlob, {
            cacheControl: '3600',
            upsert: true,
          });
        if (resRetry.error) {
          return { publicUrl: null, error: resRetry.error.message };
        }
      }
    }

    const finalPath = bucketName === 'user_files' ? `avatars/${fileName}` : fileName;
    const { data: urlData } = client.storage.from(bucketName).getPublicUrl(finalPath);
    const publicUrl = urlData?.publicUrl;

    if (publicUrl) {
      return { publicUrl, error: null };
    }
    return { publicUrl: null, error: 'Could not generate public storage URL' };
  } catch (err: any) {
    console.error('Error uploading avatar to Supabase:', err);
    return { publicUrl: null, error: err?.message || 'Failed to upload avatar image' };
  }
}

export async function updateUserProfileData(
  userId: string,
  updates: { fullName?: string; phoneNumber?: string; avatarUrl?: string }
): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  const client = getSupabase();
  const trimmedName = updates.fullName !== undefined ? updates.fullName.trim() : undefined;
  const trimmedPhone = updates.phoneNumber !== undefined ? updates.phoneNumber.trim() : undefined;
  let finalAvatarUrl = updates.avatarUrl !== undefined ? updates.avatarUrl : undefined;

  let updateError: string | undefined = undefined;

  // If avatarUrl is a local base64/data URL, upload to Supabase storage first to get a permanent public URL
  if (finalAvatarUrl && finalAvatarUrl.startsWith('data:image/') && client) {
    try {
      const uploadRes = await uploadUserAvatar(userId, finalAvatarUrl);
      if (uploadRes.publicUrl) {
        finalAvatarUrl = uploadRes.publicUrl;
      }
    } catch (uploadEx) {
      console.warn('Failed to upload avatar data URL to storage:', uploadEx);
    }
  }

  if (client) {
    try {
      const dbUpdates: Record<string, any> = {
        id: userId,
        updated_at: new Date().toISOString(),
      };
      if (trimmedName !== undefined) dbUpdates.full_name = trimmedName;
      if (trimmedPhone !== undefined) {
        dbUpdates.phone_number = trimmedPhone;
        dbUpdates.phone = trimmedPhone;
      }
      if (finalAvatarUrl !== undefined) {
        dbUpdates.avatar_url = finalAvatarUrl;
      }

      // Upsert into profiles table
      const { error: profileError } = await client
        .from('profiles')
        .upsert(dbUpdates, { onConflict: 'id' });

      if (profileError) {
        console.warn('Profile full upsert error, trying fallback without phone column:', profileError);
        const fallbackUpdates: Record<string, any> = {
          id: userId,
          updated_at: new Date().toISOString(),
        };
        if (trimmedName !== undefined) fallbackUpdates.full_name = trimmedName;
        if (trimmedPhone !== undefined) fallbackUpdates.phone_number = trimmedPhone;
        if (finalAvatarUrl !== undefined) fallbackUpdates.avatar_url = finalAvatarUrl;

        const { error: fallbackErr } = await client
          .from('profiles')
          .upsert(fallbackUpdates, { onConflict: 'id' });

        if (fallbackErr) {
          console.warn('Profile fallback update error:', fallbackErr);
          await client.from('profiles').update({
            full_name: trimmedName,
            updated_at: new Date().toISOString(),
          }).eq('id', userId);
        }
      }

      // Sync with Supabase Auth: update user_metadata AND direct phone field in auth.users
      try {
        const authData: Record<string, any> = {};
        if (trimmedName !== undefined) {
          authData.full_name = trimmedName;
          authData.name = trimmedName;
        }
        if (trimmedPhone !== undefined) {
          authData.phone = trimmedPhone;
          authData.phone_number = trimmedPhone;
          authData.phoneNumber = trimmedPhone;
        }
        if (finalAvatarUrl !== undefined) {
          // Public HTTPS URLs in user_metadata render the user avatar next to UID in Supabase Auth dashboard!
          authData.avatar_url = finalAvatarUrl;
          authData.picture = finalAvatarUrl;
          authData.avatar = finalAvatarUrl;
        }

        // Format phone for auth.users phone column
        let formattedAuthPhone: string | undefined = undefined;
        if (trimmedPhone !== undefined) {
          if (trimmedPhone === '') {
            formattedAuthPhone = '';
          } else {
            const cleanDigits = trimmedPhone.replace(/[\s\-()]/g, '');
            if (cleanDigits.startsWith('+')) {
              formattedAuthPhone = cleanDigits;
            } else if (cleanDigits.length === 10 && /^[987]/.test(cleanDigits)) {
              formattedAuthPhone = `+977${cleanDigits}`;
            } else if (/^\d{8,15}$/.test(cleanDigits)) {
              formattedAuthPhone = `+${cleanDigits}`;
            } else {
              formattedAuthPhone = cleanDigits;
            }
          }
        }

        const authPayload: Record<string, any> = {
          data: authData,
        };
        if (formattedAuthPhone !== undefined && formattedAuthPhone !== '') {
          authPayload.phone = formattedAuthPhone;
        }

        const { error: authErr } = await client.auth.updateUser(authPayload);
        if (authErr) {
          console.warn('Auth updateUser with phone error:', authErr);
          // Retry with raw phone or just metadata if project requires SMS config
          if (trimmedPhone && trimmedPhone !== formattedAuthPhone) {
            const { error: rawErr } = await client.auth.updateUser({
              phone: trimmedPhone,
              data: authData,
            });
            if (rawErr) {
              await client.auth.updateUser({ data: authData });
            }
          } else {
            await client.auth.updateUser({ data: authData });
          }
        }
      } catch (authErr) {
        console.warn('Auth updateUser error:', authErr);
      }
    } catch (err: any) {
      console.warn('Error updating profile in Supabase:', err);
      updateError = err?.message;
    }
  }

  // Update local profiles list
  const localProfiles = getLocalProfiles();
  const index = localProfiles.findIndex((p) => p.id === userId);
  if (index !== -1) {
    if (trimmedName !== undefined) localProfiles[index].fullName = trimmedName;
    if (trimmedPhone !== undefined) localProfiles[index].phoneNumber = trimmedPhone;
    if (finalAvatarUrl !== undefined) localProfiles[index].avatarUrl = finalAvatarUrl;
    localProfiles[index].updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(localProfiles));
    } catch {
      // ignore
    }
  }

  // Update current user session
  const currentUser = getCurrentStoredUser();
  if (currentUser && currentUser.id === userId) {
    if (trimmedName !== undefined) currentUser.fullName = trimmedName;
    if (trimmedPhone !== undefined) currentUser.phoneNumber = trimmedPhone;
    if (finalAvatarUrl !== undefined) currentUser.avatarUrl = finalAvatarUrl;
    storeLocalUser(currentUser);
    return { success: true, user: currentUser };
  }

  return { success: true };
}

export async function updateUserPassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is not available.' };
  }

  try {
    const { error } = await client.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: formatSupabaseAuthError(error, error.message) };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: formatSupabaseAuthError(err, 'Failed to change password.') };
  }
}

export async function deleteUserAccount(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();

  if (client) {
    try {
      // Delete user data from all tables
      await client.from('notes').delete().eq('user_id', userId);
      await client.from('todos').delete().eq('user_id', userId);
      await client.from('files').delete().eq('user_id', userId);
      await client.from('folders').delete().eq('user_id', userId);
      await client.from('profiles').delete().eq('id', userId);

      // Attempt to sign out
      await client.auth.signOut();
    } catch (err: any) {
      console.warn('Error deleting user records in Supabase:', err);
    }
  }

  // Clear user-specific localStorage keys
  try {
    localStorage.removeItem(`ws_notes_${userId}`);
    localStorage.removeItem(`ws_todos_${userId}`);
    localStorage.removeItem(`ws_folders_${userId}`);
    localStorage.removeItem(`ws_files_${userId}`);
    localStorage.removeItem(`ws_trash_${userId}`);
    localStorage.removeItem(STORAGE_KEY_USER);

    // Remove from local profiles
    const profiles = getLocalProfiles().filter((p) => p.id !== userId);
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.warn('Error clearing local user cache:', e);
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
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt || new Date().toISOString(),
    });
  } catch (e) {
    console.error('Error saving local user', e);
  }
}

export async function signInWithGoogle(customRedirectTo?: string): Promise<{ data: any; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Supabase client is not available. Please verify your Supabase URL & Anon Key in settings.' };
  }

  try {
    const redirectUrl = customRedirectTo || (typeof window !== 'undefined' ? window.location.origin : EMAIL_REDIRECT_URL);
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: isIframe,
        scopes: 'email profile',
      },
    });

    if (error) {
      return { data: null, error: formatSupabaseAuthError(error, error.message) };
    }

    if (data?.url && typeof window !== 'undefined') {
      if (isIframe) {
        // In iframe preview panel, attempt top window navigation or open full tab
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
            return { data, error: null };
          }
        } catch {
          // If cross-origin security prevents top navigation, open in new tab
        }
        window.open(data.url, '_blank');
      } else {
        window.location.href = data.url;
      }
    }

    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: formatSupabaseAuthError(err, 'Failed to initiate Google authentication.') };
  }
}

export async function signInWithGitHub(customRedirectTo?: string): Promise<{ data: any; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: 'Supabase client is not available.' };
  }

  try {
    const redirectUrl = customRedirectTo || (typeof window !== 'undefined' ? window.location.origin : EMAIL_REDIRECT_URL);
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: isIframe,
      },
    });

    if (error) {
      return { data: null, error: formatSupabaseAuthError(error, error.message) };
    }

    if (data?.url && typeof window !== 'undefined') {
      if (isIframe) {
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
            return { data, error: null };
          }
        } catch {
          // ignore
        }
        window.open(data.url, '_blank');
      } else {
        window.location.href = data.url;
      }
    }

    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: formatSupabaseAuthError(err, 'Failed to initiate GitHub authentication.') };
  }
}

export async function handleOAuthCallback(): Promise<{ user: UserSession | null; error: string | null }> {
  const client = getSupabase();
  if (!client) {
    return { user: null, error: 'Supabase client is not configured.' };
  }

  try {
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error) {
      return { user: null, error: formatSupabaseAuthError(error, error.message) };
    }

    if (session?.user) {
      const user = session.user;
      const userEmail = user.email || '';
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split('@')[0];
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

      // Clean OAuth query/hash from the browser URL address bar
      if (typeof window !== 'undefined' && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      return { user: sessionUser, error: null };
    }

    return { user: null, error: null };
  } catch (err: unknown) {
    return { user: null, error: formatSupabaseAuthError(err, 'Error processing OAuth callback.') };
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

    const { role, profile } = await fetchUserProfile(data.user.id, trimmedEmail, data.user.user_metadata?.full_name);

    const sessionUser: UserSession = {
      id: data.user.id,
      email: data.user.email || trimmedEmail,
      fullName: profile?.fullName || data.user.user_metadata?.full_name || data.user.user_metadata?.name || trimmedEmail.split('@')[0],
      phoneNumber: profile?.phoneNumber || data.user.phone || data.user.user_metadata?.phone || data.user.user_metadata?.phone_number || data.user.user_metadata?.phoneNumber,
      avatarUrl: profile?.avatarUrl || data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || data.user.user_metadata?.avatar,
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
      // Check active session (handles OAuth redirects, token exchange, and persisted tokens)
      const {
        data: { session },
      } = await client.auth.getSession();

      let targetUser = session?.user;

      if (!targetUser) {
        const {
          data: { user: fetchedUser },
          error: userError,
        } = await client.auth.getUser();
        if (!userError && fetchedUser) {
          targetUser = fetchedUser;
        }
      }

      if (targetUser) {
        const userEmail = targetUser.email || '';
        const fullName = targetUser.user_metadata?.full_name || targetUser.user_metadata?.name || userEmail.split('@')[0];
        const { role, profile } = await fetchUserProfile(targetUser.id, userEmail, fullName);
        const sessionUser: UserSession = {
          id: targetUser.id,
          email: userEmail,
          fullName: profile?.fullName || fullName,
          phoneNumber: profile?.phoneNumber || targetUser.phone || targetUser.user_metadata?.phone || targetUser.user_metadata?.phone_number || targetUser.user_metadata?.phoneNumber,
          avatarUrl: profile?.avatarUrl || targetUser.user_metadata?.avatar_url || targetUser.user_metadata?.picture || targetUser.user_metadata?.avatar,
          role,
          isDemo: false,
          createdAt: targetUser.created_at,
        };
        storeLocalUser(sessionUser);

        // Clean up URL if access_token or code parameters exist from OAuth redirect
        if (
          typeof window !== 'undefined' &&
          (window.location.hash.includes('access_token') || window.location.search.includes('code='))
        ) {
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch {
            // Ignore history state error
          }
        }

        // If this is an OAuth popup window, notify opener and close
        if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
          try {
            window.opener.postMessage({ type: 'SUPABASE_OAUTH_SUCCESS', user: sessionUser }, '*');
            setTimeout(() => window.close(), 300);
          } catch {
            // ignore
          }
        }

        return sessionUser;
      }
    } catch (e) {
      console.warn('Error getting initial session:', e);
    }
  }

  // Fallback to local stored user session if client or network is initializing
  return getCurrentStoredUser();
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
          notifyAt: item.notify_at || undefined,
          notified: Boolean(item.notified),
          colorScheme: item.color_scheme || 'default',
          imageUrl: item.image_url || undefined,
          attachments: item.attachments || [],
          isPinned: Boolean(item.is_pinned),
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
      const payload: Record<string, any> = {
        id: note.id,
        user_id: userId,
        title: note.title,
        content: note.content || '',
        tags: Array.isArray(note.tags) ? note.tags : [],
        is_pinned: Boolean(note.isPinned),
        color_scheme: note.colorScheme || 'default',
        category: note.category || 'General',
        image_url: note.imageUrl || null,
        attachments: note.attachments || [],
        notify_at: note.notifyAt || null,
        notified: Boolean(note.notified),
        created_at: note.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const res = await client.from('notes').upsert(payload, { onConflict: 'id' }).select().single();

      if (!res.error && res.data) {
        const savedNote: Note = {
          id: res.data.id,
          title: res.data.title || '',
          content: res.data.content || '',
          tags: Array.isArray(res.data.tags) ? res.data.tags : [],
          category: res.data.category || 'General',
          notifyAt: res.data.notify_at || undefined,
          notified: Boolean(res.data.notified),
          colorScheme: res.data.color_scheme || 'default',
          imageUrl: res.data.image_url || undefined,
          attachments: res.data.attachments || [],
          isPinned: Boolean(res.data.is_pinned),
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
          notifyAt: item.notify_at || undefined,
          notified: Boolean(item.notified),
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
      const payload: Record<string, any> = {
        id: todo.id,
        user_id: userId,
        task_name: todo.title,
        description: todo.description || '',
        status: todo.status || 'pending',
        priority: todo.priority || 'medium',
        due_date: todo.dueDate || null,
        category: todo.category || 'General',
        notify_at: todo.notifyAt || null,
        notified: Boolean(todo.notified),
        created_at: todo.createdAt || new Date().toISOString(),
      };

      let res = await client.from('todos').upsert(payload, { onConflict: 'id' }).select().single();
      if (res.error && (res.error.message.includes('notify_at') || res.error.code === '42703')) {
        delete payload.notify_at;
        delete payload.notified;
        res = await client.from('todos').upsert(payload, { onConflict: 'id' }).select().single();
      }

      if (!res.error && res.data) {
        const savedTodo: TodoTask = {
          id: res.data.id,
          title: res.data.task_name || res.data.title || '',
          description: res.data.description || '',
          status: res.data.status || 'pending',
          priority: res.data.priority || 'medium',
          dueDate: res.data.due_date || todo.dueDate,
          category: res.data.category || 'General',
          notifyAt: res.data.notify_at || undefined,
          notified: Boolean(res.data.notified),
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
// Transactions Operations
// -----------------------------------------------------------------------------

export const getUserTransactionsKey = (userId: string) => `ws_transactions_${userId}`;

export async function syncFetchTransactions(
  userId: string
): Promise<{ transactions: UserTransaction[]; isCloud: boolean }> {
  const client = getSupabase();
  const localKey = getUserTransactionsKey(userId);

  if (client) {
    try {
      const { data, error } = await client
        .from('user_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (!error && data) {
        const mapped: UserTransaction[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id || userId,
          type: row.type || 'RECEIPT',
          category: row.category || 'General',
          amount: Number(row.amount) || 0,
          paymentMethod: row.payment_method || 'Cash',
          description: row.description || '',
          transactionDate: row.transaction_date || new Date().toISOString().split('T')[0],
          createdAt: row.created_at || new Date().toISOString(),
        }));

        try {
          localStorage.setItem(localKey, JSON.stringify(mapped));
        } catch (e) {
          console.warn('Failed to cache transactions locally', e);
        }

        return { transactions: mapped, isCloud: true };
      }
    } catch (e) {
      console.warn('Exception during syncFetchTransactions, falling back to local:', e);
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      return { transactions: JSON.parse(raw), isCloud: false };
    }
  } catch (e) {
    console.error('Error parsing local transactions', e);
  }

  return { transactions: [], isCloud: false };
}

export async function syncSaveTransaction(
  userId: string,
  tx: UserTransaction
): Promise<{ data: UserTransaction | null; error: string | null }> {
  const client = getSupabase();
  const localKey = getUserTransactionsKey(userId);

  if (client) {
    try {
      const payload: Record<string, any> = {
        id: tx.id,
        user_id: userId,
        type: tx.type,
        category: tx.category || 'General',
        amount: Number(tx.amount) || 0,
        payment_method: tx.paymentMethod || 'Cash',
        description: tx.description || '',
        transaction_date: tx.transactionDate || new Date().toISOString().split('T')[0],
      };

      const { data, error } = await client
        .from('user_transactions')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (!error && data) {
        const saved: UserTransaction = {
          id: data.id,
          userId: data.user_id || userId,
          type: data.type,
          category: data.category || 'General',
          amount: Number(data.amount) || 0,
          paymentMethod: data.payment_method || 'Cash',
          description: data.description || '',
          transactionDate: data.transaction_date || tx.transactionDate,
          createdAt: data.created_at || tx.createdAt,
        };

        try {
          const raw = localStorage.getItem(localKey);
          const list: UserTransaction[] = raw ? JSON.parse(raw) : [];
          const idx = list.findIndex((t) => t.id === saved.id || t.id === tx.id);
          if (idx !== -1) list[idx] = saved;
          else list.unshift(saved);
          localStorage.setItem(localKey, JSON.stringify(list));
        } catch (e) {
          console.warn('Error caching transaction locally', e);
        }

        return { data: saved, error: null };
      } else if (error) {
        console.warn('Supabase transaction save error:', error.message);
      }
    } catch (e: any) {
      console.warn('Exception saving transaction in Supabase:', e);
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    const list: UserTransaction[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((t) => t.id === tx.id);
    if (idx !== -1) list[idx] = tx;
    else list.unshift(tx);
    localStorage.setItem(localKey, JSON.stringify(list));
    return { data: tx, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to save transaction locally' };
  }
}

export async function syncDeleteTransaction(
  userId: string,
  txId: string
): Promise<boolean> {
  const client = getSupabase();
  const localKey = getUserTransactionsKey(userId);

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: UserTransaction[] = JSON.parse(raw);
      localStorage.setItem(localKey, JSON.stringify(list.filter((t) => t.id !== txId)));
    }
  } catch (e) {
    console.warn('Error removing transaction from local cache', e);
  }

  if (client) {
    try {
      await client.from('user_transactions').delete().eq('id', txId).eq('user_id', userId);
    } catch (e) {
      console.warn('Error deleting transaction from Supabase:', e);
    }
  }
  return true;
}

export function subscribeToTransactions(
  userId: string,
  onInsert: (tx: UserTransaction) => void,
  onUpdate: (tx: UserTransaction) => void,
  onDelete: (txId: string) => void
): () => void {
  const client = getSupabase();
  if (!client) return () => {};

  try {
    const channelName = `user_transactions_channel_${userId}`;
    const channel = client.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_transactions', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          if (payload.new) {
            const row = payload.new;
            const tx: UserTransaction = {
              id: row.id,
              userId: row.user_id,
              type: row.type,
              category: row.category,
              amount: Number(row.amount) || 0,
              paymentMethod: row.payment_method,
              description: row.description,
              transactionDate: row.transaction_date,
              createdAt: row.created_at,
            };
            onInsert(tx);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_transactions', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          if (payload.new) {
            const row = payload.new;
            const tx: UserTransaction = {
              id: row.id,
              userId: row.user_id,
              type: row.type,
              category: row.category,
              amount: Number(row.amount) || 0,
              paymentMethod: row.payment_method,
              description: row.description,
              transactionDate: row.transaction_date,
              createdAt: row.created_at,
            };
            onUpdate(tx);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'user_transactions', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          if (payload.old && payload.old.id) {
            onDelete(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  } catch (err) {
    console.warn('Error setting up transactions realtime subscription:', err);
    return () => {};
  }
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
  parentId?: string | null,
  providedId?: string
): Promise<{ data: Folder | null; error: string | null }> {
  const client = getSupabase();
  const localKey = getUserFoldersKey(userId);

  if (client) {
    try {
      const validParentId = parentId && isValidUUID(parentId) ? parentId : null;
      const payload: any = {
        user_id: userId,
        name: name.trim() || 'New Folder',
        parent_id: validParentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      if (providedId) {
        payload.id = providedId;
      }

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
    phone_number TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure columns exist for existing database instances
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

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

-- Trigger to Automatically Create Profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone_number, avatar_url, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phone_number', NEW.raw_user_meta_data->>'phoneNumber'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NEW.raw_user_meta_data->>'avatar'),
        CASE 
            WHEN LOWER(NEW.email) = 'manastraderstkp@gmail.com' THEN 'admin'
            ELSE 'user'
        END,
        TIMEZONE('utc'::text, NOW()),
        TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles Policies (Idempotent)
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles delete policy" ON public.profiles;

CREATE POLICY "Profiles select policy" ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Profiles insert policy" ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY "Profiles update policy" ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY "Profiles delete policy" ON public.profiles FOR DELETE
    USING (public.is_admin());

-- 2. NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    color_scheme TEXT DEFAULT 'default',
    category TEXT DEFAULT 'General',
    notify_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_pinned BOOLEAN DEFAULT FALSE,
    notify_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure schema updates safely for existing tables
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notes select policy" ON public.notes;
DROP POLICY IF EXISTS "Notes insert policy" ON public.notes;
DROP POLICY IF EXISTS "Notes update policy" ON public.notes;
DROP POLICY IF EXISTS "Notes delete policy" ON public.notes;

CREATE POLICY "Notes select policy" ON public.notes FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Notes insert policy" ON public.notes FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Notes update policy" ON public.notes FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
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
    notify_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos select policy" ON public.todos;

-- Ensure safe migration
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS notify_at TIMESTAMPTZ;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT FALSE;
DROP POLICY IF EXISTS "Todos insert policy" ON public.todos;
DROP POLICY IF EXISTS "Todos update policy" ON public.todos;
DROP POLICY IF EXISTS "Todos delete policy" ON public.todos;

CREATE POLICY "Todos select policy" ON public.todos FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Todos insert policy" ON public.todos FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Todos update policy" ON public.todos FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Todos delete policy" ON public.todos FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- 4. FOLDERS & FILES TABLES
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Folders select policy" ON public.folders;
DROP POLICY IF EXISTS "Folders insert policy" ON public.folders;
DROP POLICY IF EXISTS "Folders update policy" ON public.folders;
DROP POLICY IF EXISTS "Folders delete policy" ON public.folders;

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

DROP POLICY IF EXISTS "Files select policy" ON public.files;
DROP POLICY IF EXISTS "Files insert policy" ON public.files;
DROP POLICY IF EXISTS "Files update policy" ON public.files;
DROP POLICY IF EXISTS "Files delete policy" ON public.files;

CREATE POLICY "Files select policy" ON public.files FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Files insert policy" ON public.files FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Files update policy" ON public.files FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Files delete policy" ON public.files FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- 5. USER TRANSACTIONS TABLE (Accounting Module)
CREATE TABLE IF NOT EXISTS public.user_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('RECEIPT', 'PAYMENT', 'TRANSFER')),
    category TEXT DEFAULT 'General',
    amount NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash',
    description TEXT DEFAULT '',
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User transactions select policy" ON public.user_transactions;
DROP POLICY IF EXISTS "User transactions insert policy" ON public.user_transactions;
DROP POLICY IF EXISTS "User transactions update policy" ON public.user_transactions;
DROP POLICY IF EXISTS "User transactions delete policy" ON public.user_transactions;

CREATE POLICY "User transactions select policy" ON public.user_transactions FOR SELECT
    USING (auth.uid()::text = user_id OR user_id = 'demo-user' OR public.is_admin());
CREATE POLICY "User transactions insert policy" ON public.user_transactions FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR user_id = 'demo-user' OR public.is_admin());
CREATE POLICY "User transactions update policy" ON public.user_transactions FOR UPDATE
    USING (auth.uid()::text = user_id OR user_id = 'demo-user' OR public.is_admin());
CREATE POLICY "User transactions delete policy" ON public.user_transactions FOR DELETE
    USING (auth.uid()::text = user_id OR user_id = 'demo-user' OR public.is_admin());

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_transactions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 6. STORAGE BUCKETS (Avatars & User Files)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('user_files', 'user_files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Avatars & User Files
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar User Insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatar User Update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar User Delete" ON storage.objects;

CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars' OR bucket_id = 'user_files');
CREATE POLICY "Avatar User Insert" ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'avatars' OR bucket_id = 'user_files') AND auth.uid() IS NOT NULL);
CREATE POLICY "Avatar User Update" ON storage.objects FOR UPDATE USING ((bucket_id = 'avatars' OR bucket_id = 'user_files') AND auth.uid() IS NOT NULL);
CREATE POLICY "Avatar User Delete" ON storage.objects FOR DELETE USING ((bucket_id = 'avatars' OR bucket_id = 'user_files') AND auth.uid() IS NOT NULL);

-- 6. Ensure default admin role
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE email = 'manastraderstkp@gmail.com';
`;
