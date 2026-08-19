import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  CheckSquare,
  FileText,
  Clock,
  Database,
  Layers,
  Send,
  RefreshCw,
  Inbox
} from 'lucide-react';
import { signInUser, signUpUser, resendVerificationEmail, getStoredSupabaseConfig, signInWithGoogle, signInWithGitHub } from '../lib/supabase';
import { UserSession } from '../types';

// Google SVG Icon Component
const GoogleIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

// GitHub SVG Icon Component
const GitHubIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface AuthScreenProps {
  onSuccess: (user: UserSession) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenConfig?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  isDark,
  onToggleTheme,
  onOpenConfig,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gitHubLoading, setGitHubLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  const { isConfigured } = getStoredSupabaseConfig();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (
        hash.includes('type=signup') ||
        hash.includes('type=email_change') ||
        hash.includes('type=recovery') ||
        search.includes('type=signup')
      ) {
        setSuccessMessage('Email verified successfully! You can now sign in with your credentials.');
        setMode('signin');
      }
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setGoogleLoading(true);

    try {
      const { error: googleErr } = await signInWithGoogle();
      if (googleErr) {
        setError(googleErr);
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err || '');
      setError(raw || 'Failed to initiate Google sign in.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setGitHubLoading(true);

    try {
      const { error: gitHubErr } = await signInWithGitHub();
      if (gitHubErr) {
        setError(gitHubErr);
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err || '');
      setError(raw || 'Failed to initiate GitHub sign in.');
    } finally {
      setGitHubLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = (unverifiedEmail || email).trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter your email address to resend verification.');
      return;
    }

    setResending(true);
    setError(null);
    try {
      const { success, error: resendErr } = await resendVerificationEmail(targetEmail);
      if (success) {
        setSuccessMessage(`Verification email resent to ${targetEmail}. Please check your inbox and spam folder.`);
      } else {
        setError(resendErr || 'Failed to resend verification email.');
      }
    } catch {
      setError('An error occurred while resending verification email.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsUnverified(false);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup') {
      if (!confirmPassword.trim()) {
        setError('Please verify and confirm your password.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-check both password fields.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: signUpErr } = await signUpUser(trimmedEmail, password, fullName.trim());
        if (signUpErr) {
          setError(signUpErr);
        } else {
          setMode('signin');
          setEmail(trimmedEmail);
          setPassword('');
          setConfirmPassword('');
          setUnverifiedEmail(trimmedEmail);
          setSuccessMessage(
            'Your account has been created. Please check your email and verify your address before logging in.'
          );
        }
      } else {
        const { user, error: signInErr, unverified } = await signInUser(trimmedEmail, password);
        if (unverified) {
          setIsUnverified(true);
          setUnverifiedEmail(trimmedEmail);
          setError('Your email is not verified yet. Please check your inbox and confirm your email first.');
        } else if (signInErr) {
          setError(signInErr);
        } else if (user) {
          setSuccessMessage('Signed in successfully! Loading workspace...');
          setTimeout(() => {
            onSuccess(user);
          }, 350);
        }
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err || '');
      if (
        raw.toLowerCase().includes('failed to fetch') ||
        raw.toLowerCase().includes('network') ||
        raw.toLowerCase().includes('err_name_not_resolved')
      ) {
        setError('Unable to connect to Supabase backend. Please verify your Supabase URL and Anon Key in config.ts or click "Setup Supabase".');
      } else {
        setError(raw || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* Background Decorative Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/15" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl dark:bg-amber-500/10" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/30 text-white font-bold">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                WorkSpace<span className="text-indigo-600 dark:text-indigo-400">Pro</span>
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                Cloud v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Personal Productivity & Task Management System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenConfig && (
            <button
              id="btn-auth-screen-config"
              onClick={onOpenConfig}
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            >
              <Database className="h-3.5 w-3.5 text-emerald-500" />
              <span>{isConfigured ? 'Backend API' : 'Setup Supabase'}</span>
            </button>
          )}

          <button
            id="btn-auth-theme-toggle"
            type="button"
            onClick={onToggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Main Center Auth Container */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          <div
            id="card-auth-container"
            className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 transition-all dark:border-slate-800 dark:bg-slate-900 dark:shadow-2xl dark:shadow-slate-950/80"
          >
            {/* Header Banner */}
            <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-6 py-7 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    {mode === 'signin' ? 'Sign In to Workspace' : 'Create Your Account'}
                  </h1>
                  <p className="text-xs text-indigo-100/90 mt-0.5">
                    {isConfigured
                      ? 'Secure Supabase Auth with Row-Level Security'
                      : 'Private, user-isolated workspace credentials'}
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5 dark:border-slate-800/80 dark:bg-slate-900/60">
              <button
                id="btn-auth-mode-signin"
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                id="btn-auth-mode-signup"
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Create Account (Sign Up)
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 sm:p-7">
              {error && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-medium">{error}</span>
                      {isUnverified && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                          <button
                            id="btn-auth-resend-verification"
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-95 disabled:opacity-50"
                          >
                            {resending ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
                          </button>
                          <span className="text-[11px] text-rose-600/80 dark:text-rose-400">
                            Sent to {unverifiedEmail || email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-fadeIn">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="font-medium">{successMessage}</span>
                </div>
              )}

              {/* Email & Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        id="input-auth-screen-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="input-auth-screen-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@workspace.app"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="input-auth-screen-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Verify Password
                      </label>
                      {confirmPassword && (
                        <span
                          className={`text-[11px] font-semibold ${
                            password === confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                          }`}
                        >
                          {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="input-auth-screen-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        className={`w-full rounded-xl border bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder-slate-400 transition focus:bg-white focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-900 ${
                          confirmPassword && password !== confirmPassword
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-800'
                            : confirmPassword && password === confirmPassword
                            ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-emerald-700'
                            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700 dark:focus:border-indigo-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  id="btn-auth-screen-submit"
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create & Access Workspace'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* OR Divider */}
              <div className="relative my-5 flex items-center justify-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                  or continue with
                </span>
              </div>

              {/* OAuth Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Google OAuth Button */}
                <button
                  id="btn-auth-google-screen"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || gitHubLoading || loading}
                  className="flex items-center justify-center gap-2.5 rounded-2xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-bold text-slate-800 shadow-xs transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:border-slate-600 cursor-pointer"
                >
                  {googleLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
                  ) : (
                    <GoogleIcon className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">
                    {googleLoading ? 'Connecting...' : 'Continue with Google'}
                  </span>
                </button>

                {/* GitHub OAuth Button */}
                <button
                  id="btn-auth-github-screen"
                  type="button"
                  onClick={handleGitHubSignIn}
                  disabled={googleLoading || gitHubLoading || loading}
                  className="flex items-center justify-center gap-2.5 rounded-2xl border border-slate-300 bg-slate-900 py-2.5 px-3 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:border-slate-600 cursor-pointer"
                >
                  {gitHubLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <GitHubIcon className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">
                    {gitHubLoading ? 'Connecting...' : 'Continue with GitHub'}
                  </span>
                </button>
              </div>

              {/* Bottom Feature Badges */}
              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col items-center rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                    <FileText className="h-4 w-4 text-amber-500 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Rich Notes</span>
                  </div>
                  <div className="flex flex-col items-center rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                    <CheckSquare className="h-4 w-4 text-indigo-500 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Task Boards</span>
                  </div>
                  <div className="flex flex-col items-center rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                    <Clock className="h-4 w-4 text-emerald-500 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Work Logs</span>
                  </div>
                </div>

                <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                  Protected by Row Level Security (RLS). Each user's data remains private and isolated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Verification Sent Success Modal / Dialog */}
      {verificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-6 py-6 text-white text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner mb-3">
                <Inbox className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">Verify Your Email</h2>
              <p className="text-xs text-indigo-100/90 mt-1">
                A confirmation link has been dispatched to your inbox
              </p>
            </div>

            <div className="p-6">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-950 dark:bg-indigo-950/40 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  We've sent an activation link to:
                </p>
                <p className="mt-1 font-semibold text-sm text-indigo-700 dark:text-indigo-400 break-all">
                  {unverifiedEmail || email}
                </p>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    1
                  </div>
                  <p>Open your email client and look for the verification email from Supabase.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    2
                  </div>
                  <p>Click the <strong>"Confirm your mail"</strong> link to verify your account.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    3
                  </div>
                  <p>Return here to sign in with your email and password.</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  id="btn-close-verification-modal"
                  type="button"
                  onClick={() => {
                    setVerificationModalOpen(false);
                    setMode('signin');
                  }}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 transition active:scale-[0.99]"
                >
                  Understood, Proceed to Sign In
                </button>

                <button
                  id="btn-modal-resend-verification"
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {resending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>{resending ? 'Sending Email...' : 'Resend Verification Email'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 mx-auto w-full max-w-6xl px-4 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        WorkSpace Pro • Enterprise-Grade Task, Note & Work Hours Management Platform
      </footer>
    </div>
  );
};
