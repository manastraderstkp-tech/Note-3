import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Send,
  RefreshCw
} from 'lucide-react';
import { signInUser, signUpUser, resendVerificationEmail, getStoredSupabaseConfig, signInWithGoogle, signInWithGitHub } from '../lib/supabase';
import { UserSession } from '../types';

// Google Icon Component
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

// GitHub Icon Component
const GitHubIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserSession) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
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

  if (!isOpen) return null;

  const { isConfigured } = getStoredSupabaseConfig();

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
        setSuccessMessage(`Verification email resent to ${targetEmail}. Please check your inbox.`);
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
      setError('Please provide both email and password.');
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
        const { error: signUpErr } = await signUpUser(trimmedEmail, password, fullName);
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
          setSuccessMessage('Signed in successfully!');
          setTimeout(() => {
            onSuccess(user);
            onClose();
          }, 400);
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
        setError(raw || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="modal-auth-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm transition-all"
    >
      <div
        id="modal-auth-container"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header gradient banner */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-6 py-7 text-white">
          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {mode === 'signin' ? 'Welcome Back' : 'Create Workspace Account'}
              </h2>
              <p className="text-xs text-indigo-100/80">
                {isConfigured ? 'Connected to live Supabase Auth & RLS' : 'User-isolated authentication & storage'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            id="tab-auth-signin"
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
              mode === 'signin'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            id="tab-auth-signup"
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
              mode === 'signup'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1">
                  <span className="font-medium">{error}</span>
                  {isUnverified && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                      <button
                        id="btn-modal-auth-resend"
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-95 disabled:opacity-50"
                      >
                        {resending ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        <span>{resending ? 'Sending...' : 'Resend Verification Link'}</span>
                      </button>
                      <span className="text-[11px] text-rose-600/80 dark:text-rose-400">
                        {unverifiedEmail || email}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Google OAuth Button */}
            <button
              id="btn-auth-google-modal"
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
                {googleLoading ? 'Google...' : 'Google'}
              </span>
            </button>

            {/* GitHub OAuth Button */}
            <button
              id="btn-auth-github-modal"
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
                {gitHubLoading ? 'GitHub...' : 'GitHub'}
              </span>
            </button>
          </div>

          {/* OR Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900 dark:text-slate-500">
              or continue with email
            </span>
          </div>

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
                    id="input-auth-name"
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
                  id="input-auth-email"
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
                  id="input-auth-password"
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
                    id="input-auth-confirm-password"
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
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60"
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

          {/* Supabase Connection & Privacy Info */}
          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-center text-[11px] text-slate-400">
              Each user only sees their own isolated notes, todos, and work logs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
