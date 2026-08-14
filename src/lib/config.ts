/**
 * Global Configuration for WorkSpace Pro (pdcc.com.np)
 * 
 * Single fixed Supabase Project credentials used by all users and browsers.
 * You can set your actual Supabase credentials below or configure them in your
 * environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) or through the in-app
 * "Setup Supabase" / "Backend API" settings dialog.
 */

// Central Global Supabase Configuration
export const SUPABASE_URL: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_URL ||
  'https://kzlhrpcddsbbzcydowdr.supabase.co';

export const SUPABASE_ANON_KEY: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bGhycGNkZHNiYnpjeWRvd2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNzQzNzgsImV4cCI6MjEwMTY1MDM3OH0.hv8IaNDVKnRPT_BRGfdKzwwgAi_JIiUO0BYRSKhJSLs';

// Designated default admin email for automatic RBAC bootstrap
export const DEFAULT_ADMIN_EMAIL: string = 'manastraderstkp@gmail.com';

// Standard Email Redirect URL for Supabase Auth verification
export const EMAIL_REDIRECT_URL: string = 'https://pdcc.com.np';

