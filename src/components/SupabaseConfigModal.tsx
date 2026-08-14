import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Save,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { getStoredSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, getSupabase } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getStoredSupabaseConfig();
      setUrl(config.url || '');
      setAnonKey(config.anonKey || '');
      setStatus('idle');
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('testing');
    setMessage('Verifying Supabase credentials...');

    if (!url.trim() || !anonKey.trim()) {
      setStatus('error');
      setMessage('Please enter both Supabase Project URL and Anon Public Key.');
      return;
    }

    if (!url.startsWith('https://') || !url.includes('supabase.co')) {
      setStatus('error');
      setMessage('Project URL should typically be in the format: https://<project-ref>.supabase.co');
      return;
    }

    try {
      saveSupabaseConfig(url, anonKey);
      const client = getSupabase();
      if (client) {
        // Quick ping
        const { error } = await client.from('notes').select('id').limit(1);
        // Even if table doesn't exist yet, if auth/network doesn't throw fatal invalid API key, it's valid
        if (error && error.message && error.message.includes('JWT')) {
          setStatus('error');
          setMessage(`Invalid Anon Key: ${error.message}`);
          return;
        }
      }

      setStatus('success');
      setMessage('Supabase configured and connected successfully! Syncing your workspace data...');
      onConfigUpdated();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message || 'Failed to initialize Supabase client with provided credentials.');
    }
  };

  const handleReset = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setStatus('idle');
    setMessage('Cleared custom credentials. App will use user-isolated local persistence or .env defaults.');
    onConfigUpdated();
  };

  return (
    <div
      id="modal-supabase-config-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm transition-all"
    >
      <div
        id="modal-supabase-config-container"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Supabase Credentials Setup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect your live PostgreSQL Supabase database
              </p>
            </div>
          </div>

          <button
            id="btn-close-config-modal"
            onClick={onClose}
            aria-label="Close credentials modal"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {message && (
            <div
              className={`mb-4 flex items-center gap-2.5 rounded-xl border p-3 text-xs ${
                status === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : status === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300'
              }`}
            >
              {status === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : status === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              ) : (
                <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
              )}
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Supabase Project URL (<span className="font-mono">SUPABASE_URL</span>)
              </label>
              <input
                id="input-supabase-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzprojectref.supabase.co"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-mono text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Found in Supabase Dashboard &gt; Project Settings &gt; API
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Supabase Anon Public Key (<span className="font-mono">SUPABASE_ANON_KEY</span>)
              </label>
              <textarea
                id="input-supabase-anon-key"
                rows={3}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-mono text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                The public anon key is safe for client-side queries protected by RLS.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                id="btn-reset-supabase-config"
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>

              <button
                id="btn-save-supabase-config"
                type="submit"
                disabled={status === 'testing'}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {status === 'testing' ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Save & Connect</span>
              </button>
            </div>
          </form>

          {/* Quick tip */}
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              No keys yet? No problem!
            </p>
            <p className="mt-0.5 text-[11px]">
              The app automatically provides user-isolated workspaces per login email locally, with seamless live Supabase cloud sync once credentials and schema tables are added.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
