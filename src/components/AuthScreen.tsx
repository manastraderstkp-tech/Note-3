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
import { signInUser, signUpUser, resendVerificationEmail, getStoredSupabaseConfig } from '../lib/supabase';
import { UserSession } from '../types';

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
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const { isConfigured } = getStoredSupabaseConfig();

  // Detect email verification confirmation tokens from URL hash or query params
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
          // 1) Do NOT auto-login
          // 2) Redirect user to Sign In page
          // 3) Keep / pre-fill the email used for signup in the Sign In form
          setMode('signin');
          setEmail(trimmedEmail);
          setPassword('');
          setConfirmPassword('');
          setUnverifiedEmail(trimmedEmail);
          // 4) Display clear success message above the form
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
        setError('Unable to connect to Supabase backend. Please verify your Supabase URL and Anon Key in config.ts.');
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
              {/* Error Message */}
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

              {/* Success Message Above Form */}
              {successMessage && (
                <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 animate-fadeIn">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold leading-relaxed">{successMessage}</span>
                </div>
              )}

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

      {/* Footer */}
      <footer className="relative z-10 mx-auto w-full max-w-6xl px-4 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        WorkSpace Pro • Enterprise-Grade Task, Note & Work Hours Management Platform
      </footer>
    </div>
  );
};
