import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Database,
  Shield,
  FileCode,
  ExternalLink,
  Table,
  CheckCircle2,
  Terminal,
  UserCheck,
  Crown
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabase';

interface SqlSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlSchemaModal: React.FC<SqlSchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'profiles' | 'rbac' | 'notes' | 'todos' | 'worklogs'>('all');

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sqlSnippets = {
    profiles: `-- 1. PROFILES TABLE & ROLE-BASED ACCESS CONTROL (RBAC)
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

-- Security Definer Function to Check if Current User is Admin
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
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'phone_number',
        NEW.raw_user_meta_data->>'avatar_url',
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

-- Ensure designated admin account is active:
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE email = 'manastraderstkp@gmail.com';`,

    rbac: `-- 2. UNIFIED ROLE-BASED ROW LEVEL SECURITY (RLS) POLICIES
-- Standard users: Can ONLY access and mutate rows where user_id = auth.uid()
-- Admins: Have full system-wide permissions across all rows regardless of user_id

-- PROFILES POLICIES
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

-- NOTES POLICIES
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

-- TODOS POLICIES
DROP POLICY IF EXISTS "Todos select policy" ON public.todos;
DROP POLICY IF EXISTS "Todos insert policy" ON public.todos;
DROP POLICY IF EXISTS "Todos update policy" ON public.todos;
DROP POLICY IF EXISTS "Todos delete policy" ON public.todos;

CREATE POLICY "Todos select policy" ON public.todos FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Todos insert policy" ON public.todos FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Todos update policy" ON public.todos FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Todos delete policy" ON public.todos FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- WORK_LOGS POLICIES
DROP POLICY IF EXISTS "WorkLogs select policy" ON public.work_logs;
DROP POLICY IF EXISTS "WorkLogs insert policy" ON public.work_logs;
DROP POLICY IF EXISTS "WorkLogs update policy" ON public.work_logs;
DROP POLICY IF EXISTS "WorkLogs delete policy" ON public.work_logs;

CREATE POLICY "WorkLogs select policy" ON public.work_logs FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "WorkLogs insert policy" ON public.work_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "WorkLogs update policy" ON public.work_logs FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "WorkLogs delete policy" ON public.work_logs FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());`,

    notes: `-- NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    color TEXT DEFAULT 'default',
    color_scheme TEXT DEFAULT 'default',
    category TEXT DEFAULT 'General',
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
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;`,

    todos: `-- TODOS TABLE
CREATE TABLE IF NOT EXISTS public.todos (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    task_name TEXT,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    due_date TEXT,
    due_time TEXT,
    tags TEXT[] DEFAULT '{}',
    notify_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT FALSE,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);`,

    worklogs: `-- WORK_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.work_logs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    duration_minutes INTEGER DEFAULT 0,
    log_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);`,
  };

  const getActiveCode = () => {
    if (activeTab === 'all') return SUPABASE_SQL_SCHEMA;
    return sqlSnippets[activeTab] || SUPABASE_SQL_SCHEMA;
  };

  return (
    <div
      id="modal-sql-schema-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm transition-all"
    >
      <div
        id="modal-sql-schema-container"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Supabase Schema & RBAC RLS Policies
                </h2>
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  Admin & Standard Roles
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PostgreSQL schema, signup triggers, role management & Row Level Security
              </p>
            </div>
          </div>

          <button
            id="btn-close-sql-modal"
            onClick={onClose}
            aria-label="Close SQL Schema Modal"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-2.5 dark:border-slate-800">
          <div className="flex gap-1.5 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Full Script (All Tables & RBAC)
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'profiles'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>profiles & Trigger</span>
            </button>
            <button
              onClick={() => setActiveTab('rbac')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'rbac'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>RBAC RLS Policies</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              notes table
            </button>
            <button
              onClick={() => setActiveTab('todos')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === 'todos'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              todos table
            </button>
            <button
              onClick={() => setActiveTab('worklogs')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === 'worklogs'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              work_logs table
            </button>
          </div>

          <button
            id="btn-copy-sql"
            onClick={() => handleCopy(getActiveCode())}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 shrink-0 ml-2"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy SQL Query</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-5 text-slate-200">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">postgresql / supabase sql (RBAC Enabled)</span>
            <span>UTF-8 • SQL Script</span>
          </div>
          <pre className="font-mono text-xs leading-relaxed text-emerald-400 whitespace-pre-wrap selection:bg-emerald-500/30 selection:text-white">
            <code>{getActiveCode()}</code>
          </pre>
        </div>

        {/* Setup Steps Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                How to run this in Supabase:
              </p>
              <ol className="list-inside list-decimal space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                <li>Log into Supabase (<span className="font-mono text-[11px]">supabase.com/dashboard</span>) &gt; <strong>SQL Editor</strong>.</li>
                <li>Click <strong>New Query</strong>, paste the script above, and click <strong>Run</strong>.</li>
                <li>Every new signup receives the default role <strong>'user'</strong> via trigger; designated admin account has full system access.</li>
              </ol>
            </div>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0"
            >
              <span>Open Supabase</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
