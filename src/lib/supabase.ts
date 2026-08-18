export async function signInWithGoogle(): Promise<{ error: string | null; url?: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      error: 'Supabase client is not available. Please configure your Supabase URL and Anon Key.',
    };
  }

  try {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return { error: formatSupabaseAuthError(error, error.message) };
    }

    return { error: null, url: data?.url };
  } catch (err: unknown) {
    const errorMessage = formatSupabaseAuthError(err, 'Error initiating Google Sign In');
    return { error: errorMessage };
  }
}
