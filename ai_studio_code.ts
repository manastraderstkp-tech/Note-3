// 1. Strict Login Event Handler
export async function signInUser(
  email: string,
  password: string
): Promise<{ user: UserSession | null; error: string | null }> {
  const supabase = getSupabase();
  const trimmedEmail = email.trim().toLowerCase();

  if (!supabase) {
    return {
      user: null,
      error: 'Supabase is not configured. Please click "Backend API" to enter your Supabase Project URL and Anon Key.',
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
      return { user: null, error: error.message };
    }

    if (!data.session || !data.user) {
      return {
        user: null,
        error: 'Authentication failed: No active session returned from Supabase. Please sign up first.',
      };
    }

    // Fetch verified role from the unified profiles table
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
    const errorMessage = err instanceof Error ? err.message : 'Error logging into Supabase';
    return { user: null, error: errorMessage };
  }
}

// 2. Real Account Sign Up Event Handler
export async function signUpUser(
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: UserSession | null; error: string | null }> {
  const supabase = getSupabase();
  const trimmedEmail = email.trim().toLowerCase();

  if (!supabase) {
    return {
      user: null,
      error: 'Supabase is not configured. Please click "Backend API" to enter your Supabase Project URL and Anon Key.',
    };
  }

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

    // Handles existing identities
    if (data.user.identities && data.user.identities.length === 0) {
      return {
        user: null,
        error: 'An account with this email address already exists. Please sign in instead.',
      };
    }

    // Handles instances where Supabase email confirmation is enabled
    if (!data.session) {
      return {
        user: null,
        error: 'Account created! Please check your email inbox to confirm your address before signing in, or disable email confirmations in your Supabase Auth settings.',
      };
    }

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
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error communicating with Supabase auth';
    return { user: null, error: errorMessage };
  }
}

// 3. Server-Verified Session on Page Load
export async function getInitialSupabaseSession(): Promise<UserSession | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
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
      } else {
        localStorage.removeItem('workspace_current_user');
        return null;
      }
    } catch (e) {
      console.warn('Error getting initial Supabase session', e);
      localStorage.removeItem('workspace_current_user');
      return null;
    }
  }
  localStorage.removeItem('workspace_current_user');
  return null;
}