/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Github,
  Globe,
  Terminal,
  Server,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Bell,
  Cpu,
  Layers
} from 'lucide-react';

interface DeployGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSqlModal: () => void;
}

type GuideTab = 'github' | 'vercel' | 'netlify' | 'env' | 'notifications';

export const DeployGuideModal: React.FC<DeployGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenSqlModal,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('github');
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const gitCommands = `# 1. Initialize git and add all workspace files
git init
git add .
git commit -m "feat: complete workspace productivity app with Supabase RLS & sound notifications"

# 2. Rename branch to main
git branch -M main

# 3. Create a new repository on GitHub (or use https://github.com/new)
# If using GitHub CLI:
gh repo create my-workspace-app --public --source=. --remote=origin --push

# Or link an existing remote repository:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main`;

  const vercelSteps = `// 1. Log in to Vercel (https://vercel.com)
// 2. Click "Add New..." -> "Project"
// 3. Import your GitHub repository "my-workspace-app"
// 4. In "Project Settings", configure Framework Preset: "Vite"
//    - Build Command: npm run build
//    - Output Directory: dist
// 5. Under "Environment Variables", add:
//    - VITE_SUPABASE_URL = https://your-project-ref.supabase.co
//    - VITE_SUPABASE_ANON_KEY = eyJhbGciOi... (your public anon key)
// 6. Click "Deploy"`;

  const netlifySteps = `// 1. Log in to Netlify (https://netlify.com)
// 2. Click "Add new site" -> "Import an existing project" -> "GitHub"
// 3. Select your repository
// 4. Build settings:
//    - Base directory: (leave empty / root)
//    - Build command: npm run build
//    - Publish directory: dist
// 5. Go to "Site configuration" -> "Environment variables" -> "Add a variable":
//    - VITE_SUPABASE_URL = https://your-project-ref.supabase.co
//    - VITE_SUPABASE_ANON_KEY = eyJhbGciOi... (your public anon key)
// 6. Trigger deploy!`;

  const envFileExample = `# .env (Local development)
# Create a .env.local or .env file in your project root:

VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative flex h-[90vh] max-h-[750px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                GitHub & Production Deployment Guide
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Step-by-step instructions for repository hosting, Vercel/Netlify CI/CD, and Supabase config
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 text-xs font-semibold dark:border-slate-800 dark:bg-slate-850/50">
          <button
            onClick={() => setActiveTab('github')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
              activeTab === 'github'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Github className="h-4 w-4" />
            <span>1. Push to GitHub</span>
          </button>

          <button
            onClick={() => setActiveTab('vercel')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
              activeTab === 'vercel'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>2. Deploy to Vercel</span>
          </button>

          <button
            onClick={() => setActiveTab('netlify')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
              activeTab === 'netlify'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Server className="h-4 w-4" />
            <span>3. Deploy to Netlify</span>
          </button>

          <button
            onClick={() => setActiveTab('env')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
              activeTab === 'env'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>4. Environment Variables</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
              activeTab === 'notifications'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>5. Notifications & Sound</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Pushing your codebase to GitHub
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Export or copy this project to your local workstation or terminal and run the following commands:
                </p>
              </div>

              <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-emerald-400 shadow-inner">
                <button
                  onClick={() => copyToClipboard(gitCommands, 1)}
                  className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-sans font-medium text-slate-300 hover:bg-slate-700"
                >
                  {copiedCodeIndex === 1 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCodeIndex === 1 ? 'Copied' : 'Copy'}</span>
                </button>
                <pre className="overflow-x-auto whitespace-pre-wrap">{gitCommands}</pre>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-950 dark:bg-indigo-950/30">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Important Database Step</span>
                </div>
                <p className="mt-1 text-xs text-indigo-700/90 dark:text-indigo-300/90">
                  Before or after deploying, execute the database schema in your Supabase SQL editor to enable the tables and RLS policies.
                </p>
                <button
                  onClick={onOpenSqlModal}
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 underline dark:text-indigo-400"
                >
                  <span>Open Supabase SQL Schema & Copy Script</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Deploying with Vercel (Fastest & Zero Configuration)
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Vercel automatically detects the Vite React application and configures the production build pipeline.
                </p>
              </div>

              <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-emerald-400 shadow-inner">
                <button
                  onClick={() => copyToClipboard(vercelSteps, 2)}
                  className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-sans font-medium text-slate-300 hover:bg-slate-700"
                >
                  {copiedCodeIndex === 2 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCodeIndex === 2 ? 'Copied' : 'Copy'}</span>
                </button>
                <pre className="overflow-x-auto whitespace-pre-wrap">{vercelSteps}</pre>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Build Command:</span>
                  <code className="ml-2 font-mono text-indigo-600 dark:text-indigo-400">npm run build</code>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Output Directory:</span>
                  <code className="ml-2 font-mono text-indigo-600 dark:text-indigo-400">dist</code>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'netlify' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Deploying with Netlify
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Follow these simple instructions to connect your GitHub repo to Netlify:
                </p>
              </div>

              <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-emerald-400 shadow-inner">
                <button
                  onClick={() => copyToClipboard(netlifySteps, 3)}
                  className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-sans font-medium text-slate-300 hover:bg-slate-700"
                >
                  {copiedCodeIndex === 3 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCodeIndex === 3 ? 'Copied' : 'Copy'}</span>
                </button>
                <pre className="overflow-x-auto whitespace-pre-wrap">{netlifySteps}</pre>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Supabase Environment Variables Configuration
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Vite requires public variables to be prefixed with <code className="font-mono text-indigo-600 font-bold dark:text-indigo-400">VITE_</code>.
                </p>
              </div>

              <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-emerald-400 shadow-inner">
                <button
                  onClick={() => copyToClipboard(envFileExample, 4)}
                  className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-sans font-medium text-slate-300 hover:bg-slate-700"
                >
                  {copiedCodeIndex === 4 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCodeIndex === 4 ? 'Copied' : 'Copy'}</span>
                </button>
                <pre className="overflow-x-auto whitespace-pre-wrap">{envFileExample}</pre>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-850/50">
                <h5 className="font-bold text-slate-800 dark:text-slate-200">Where to find these in Supabase:</h5>
                <ol className="mt-2 list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-indigo-600 underline dark:text-indigo-400">supabase.com/dashboard</a> and open your project.</li>
                  <li>In the left sidebar, click <strong>Project Settings</strong> (gear icon) &rarr; <strong>API</strong>.</li>
                  <li>Copy <strong>Project URL</strong> &rarr; <code className="font-mono text-xs">VITE_SUPABASE_URL</code>.</li>
                  <li>Copy <strong>Project API keys</strong> (<code className="font-mono text-xs">anon</code>, <code className="font-mono text-xs">public</code>) &rarr; <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audio & Browser Notification System Guide
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  How reminders, sounds, and background interval checks function:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-850/40">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">1</span>
                    <span>Synthesized Web Audio</span>
                  </div>
                  <p className="mt-2 text-slate-500 dark:text-slate-400 leading-relaxed">
                    Uses zero external audio files. Synthesizes harmonic sine, triangle, and bell frequencies in realtime via standard HTML5 Web Audio API.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-850/40">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">2</span>
                    <span>HTML5 Browser Notifications</span>
                  </div>
                  <p className="mt-2 text-slate-500 dark:text-slate-400 leading-relaxed">
                    Requests system notification permission to pop up alert toasts even if user is looking at another window or desktop app.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-850/40">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">3</span>
                    <span>Background Interval Scheduler</span>
                  </div>
                  <p className="mt-2 text-slate-500 dark:text-slate-400 leading-relaxed">
                    A continuous clock compares <code className="font-mono text-xs">notify_at</code> timestamps with the current client time and dispatches alerts without double-triggering.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-850/40">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">4</span>
                    <span>Edge Case Resilience</span>
                  </div>
                  <p className="mt-2 text-slate-500 dark:text-slate-400 leading-relaxed">
                    If browser notifications are denied or running in a sandboxed iframe, in-app visual floating toasts and audio chimes seamlessly take over.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Ready for 100% production deployments</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
