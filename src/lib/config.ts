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
  'https://your-project.supabase.co';

export const SUPABASE_ANON_KEY: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_ANON_KEY ||
  'your-anon-public-key';

// Designated default admin email for automatic RBAC bootstrap
export const DEFAULT_ADMIN_EMAIL: string = 'manastraderstkp@gmail.com';

// Standard Email Redirect URL for Supabase Auth verification
export const EMAIL_REDIRECT_URL: string = 'https://pdcc.com.np';

