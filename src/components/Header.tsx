import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sun,
  Moon,
  Plus,
  Bell,
  CheckCircle2,
  FileText,
  Clock,
  User,
  ChevronDown,
  Sparkles,
  X,
  Database,
  KeyRound,
  LogOut,
  LogIn,
  ShieldCheck,
  UserPlus,
  Volume2,
  Github,
  FileDown,
  ArrowRight,
  Tag,
  Crown,
  UserCheck
} from 'lucide-react';
import { NavSection, UserSession, Note, TodoTask, WorkLog } from '../types';
import { getStoredSupabaseConfig } from '../lib/supabase';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeSection: NavSection;
  onOpenNewModal: (type: 'note' | 'todo' | 'worklog') => void;
  onNavigate: (section: NavSection) => void;
  onOpenMobileMenu: () => void;
  currentUser: UserSession | null;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onSignOut: () => void;
  onOpenSqlModal: () => void;
  onOpenConfigModal: () => void;
  onOpenSoundSettingsModal: () => void;
  onOpenDeployGuideModal: () => void;
  onOpenExportModal: (initialType?: 'all' | 'tasks' | 'worklogs' | 'notes') => void;
  onOpenUserRolesModal?: () => void;
  notes: Note[];
  tasks: TodoTask[];
  worklogs: WorkLog[];
  onEditNote: (note: Note) => void;
  onEditTask: (task: TodoTask) => void;
  onEditWorkLog: (log: WorkLog) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  activeSection,
  onOpenNewModal,
  onNavigate,
  onOpenMobileMenu,
  currentUser,
  onOpenAuth,
  onSignOut,
  onOpenSqlModal,
  onOpenConfigModal,
  onOpenSoundSettingsModal,
  onOpenDeployGuideModal,
  onOpenExportModal,
  onOpenUserRolesModal,
  notes,
  tasks,
  worklogs,
  onEditNote,
  onEditTask,
  onEditWorkLog,
}) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { isConfigured } = getStoredSupabaseConfig();

  // Close search preview on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live global search preview results
  const searchResults = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return { matchingNotes: [], matchingTasks: [], matchingLogs: [], totalCount: 0 };

    const matchingNotes = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query) ||
        n.category.toLowerCase().includes(query) ||
        n.tags?.some((t) => t.toLowerCase().includes(query))
    );

    const matchingTasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        t.category.toLowerCase().includes(query) ||
        t.priority.toLowerCase().includes(query)
    );

    const matchingLogs = worklogs.filter(
      (l) =>
        l.projectName.toLowerCase().includes(query) ||
        l.taskDescription.toLowerCase().includes(query) ||
        l.category.toLowerCase().includes(query)
    );

    const totalCount = matchingNotes.length + matchingTasks.length + matchingLogs.length;

    return {
      matchingNotes: matchingNotes.slice(0, 3),
      matchingTasks: matchingTasks.slice(0, 3),
      matchingLogs: matchingLogs.slice(0, 3),
      totalCount,
    };
  }, [searchQuery, notes, tasks, worklogs]);

  const notifications = [
    { id: 1, title: 'Sound Notification Engine', desc: 'Synthesized Web Audio & background scheduler active', time: 'Live', icon: Volume2, color: 'text-indigo-500' },
    { id: 2, title: 'Supabase RLS Active', desc: 'Row Level Security guarantees your data is isolated', time: 'Active', icon: ShieldCheck, color: 'text-emerald-500' },
    { id: 3, title: 'GitHub & Deploy Ready', desc: '1-click deployment guide for Vercel & Netlify', time: 'Guide', icon: Github, color: 'text-amber-500' },
  ];

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return 'WS';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 backdrop-blur-md transition-colors dark:border-slate-800/80 dark:bg-slate-900/90">
      {/* Left side: Mobile Hamburger & Search */}
      <div className="flex flex-1 items-center gap-3 md:gap-4">
        {/* Mobile menu trigger */}
        <button
          id="btn-mobile-menu-toggle"
          onClick={onOpenMobileMenu}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 md:hidden dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Open Navigation Menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Global Search Bar with Live Overlay Dropdown */}
        <div ref={searchContainerRef} className="relative w-full max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsSearchFocused(true);
            }}
            placeholder="Search notes, tasks, projects & logs in real-time..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-800"
          />
          {searchQuery && (
            <button
              onClick={() => {
                onSearchChange('');
                setIsSearchFocused(false);
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Real-time Search Results Floating Dropdown */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div
              id="dropdown-global-search-results"
              className="absolute left-0 right-0 top-full mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl transition-all dark:border-slate-700 dark:bg-slate-850 z-50"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-700">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Global Search Results ({searchResults.totalCount} matches)
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  Real-time Filter Active
                </span>
              </div>

              {searchResults.totalCount === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No items found matching "{searchQuery}"
                </div>
              ) : (
                <div className="mt-2 space-y-3">
                  {/* Matching Tasks */}
                  {searchResults.matchingTasks.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        <span>Tasks</span>
                        <button
                          onClick={() => {
                            onNavigate('todos');
                            setIsSearchFocused(false);
                          }}
                          className="hover:underline"
                        >
                          View in Tasks →
                        </button>
                      </div>
                      {searchResults.matchingTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            onNavigate('todos');
                            onEditTask(t);
                            setIsSearchFocused(false);
                          }}
                          className="flex cursor-pointer items-center justify-between rounded-xl p-2 transition hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                            <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {t.title}
                            </span>
                          </div>
                          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Matching Notes */}
                  {searchResults.matchingNotes.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <span>Notes</span>
                        <button
                          onClick={() => {
                            onNavigate('notes');
                            setIsSearchFocused(false);
                          }}
                          className="hover:underline"
                        >
                          View in Notes →
                        </button>
                      </div>
                      {searchResults.matchingNotes.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            onNavigate('notes');
                            onEditNote(n);
                            setIsSearchFocused(false);
                          }}
                          className="flex cursor-pointer items-center justify-between rounded-xl p-2 transition hover:bg-amber-50/60 dark:hover:bg-amber-950/40"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {n.title}
                            </span>
                          </div>
                          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {n.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Matching Work Logs */}
                  {searchResults.matchingLogs.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <span>Work Logs</span>
                        <button
                          onClick={() => {
                            onNavigate('worklogs');
                            setIsSearchFocused(false);
                          }}
                          className="hover:underline"
                        >
                          View in Work Logs →
                        </button>
                      </div>
                      {searchResults.matchingLogs.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => {
                            onNavigate('worklogs');
                            onEditWorkLog(l);
                            setIsSearchFocused(false);
                          }}
                          className="flex cursor-pointer items-center justify-between rounded-xl p-2 transition hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {l.projectName} – {l.taskDescription}
                            </span>
                          </div>
                          <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {l.hoursSpent}h
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Export, Deploy Guide, Audio Sound, SQL Schema, Quick Add, Theme Toggle, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Export Data Button */}
        <button
          id="btn-header-export-data"
          onClick={() => onOpenExportModal('all')}
          title="Export Tasks & Work Logs to CSV or PDF"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 sm:px-3 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-750 dark:hover:text-indigo-300"
        >
          <FileDown className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* GitHub & Deploy Guide trigger */}
        <button
          id="btn-header-deploy-guide"
          onClick={onOpenDeployGuideModal}
          title="GitHub & Production Deployment Guide"
          className="hidden xl:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-750 dark:hover:text-indigo-300"
        >
          <Github className="h-3.5 w-3.5 text-slate-800 dark:text-slate-200" />
          <span>Deploy to GitHub</span>
        </button>

        {/* Audio Sound Settings Trigger */}
        <button
          id="btn-header-sound-settings"
          onClick={onOpenSoundSettingsModal}
          title="Configure Audio Alerts & Reminders"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 sm:h-10 sm:w-10 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          aria-label="Sound Notification Settings"
        >
          <Volume2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </button>

        {/* SQL Schema trigger button */}
        <button
          id="btn-header-sql-schema"
          onClick={onOpenSqlModal}
          title="View Supabase SQL Schema & RLS Policies"
          className="hidden lg:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-750"
        >
          <Database className="h-3.5 w-3.5 text-emerald-500" />
          <span>SQL Schema</span>
        </button>

        {/* Quick Add Dropdown */}
        <div className="relative">
          <button
            id="btn-quick-add"
            onClick={() => {
              setShowQuickAdd(!showQuickAdd);
              setShowNotifications(false);
              setShowProfileMenu(false);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] sm:px-4 sm:py-2 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
            <ChevronDown className="h-3 w-3 opacity-80" />
          </button>

          {showQuickAdd && (
            <div
              id="dropdown-quick-add"
              className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl transition-all dark:border-slate-700 dark:bg-slate-800 z-50"
            >
              <button
                onClick={() => {
                  onOpenNewModal('note');
                  setShowQuickAdd(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">New Note</p>
                  <p className="text-[10px] text-slate-400">Capture thoughts & docs</p>
                </div>
              </button>

              <button
                onClick={() => {
                  onOpenNewModal('todo');
                  setShowQuickAdd(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">New Task</p>
                  <p className="text-[10px] text-slate-400">Track todo with priority</p>
                </div>
              </button>

              <button
                onClick={() => {
                  onOpenNewModal('worklog');
                  setShowQuickAdd(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">Log Hours</p>
                  <p className="text-[10px] text-slate-400">Record project time</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Light / Dark Mode Toggle */}
        <button
          id="btn-theme-toggle"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95 sm:h-10 sm:w-10 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700 transition-transform duration-300 hover:-rotate-12" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="btn-notifications-toggle"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowQuickAdd(false);
              setShowProfileMenu(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:h-10 sm:w-10 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label="View recent activity"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {showNotifications && (
            <div
              id="dropdown-notifications"
              className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl transition-all dark:border-slate-700 dark:bg-slate-800 z-50"
            >
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Notification Center
                </span>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    onOpenSoundSettingsModal();
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Configure Audio
                </button>
              </div>
              <div className="space-y-1.5">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-2.5 rounded-lg p-2 transition hover:bg-slate-50 dark:hover:bg-slate-750/50"
                    >
                      <div className="mt-0.5">
                        <Icon className={`h-4 w-4 ${n.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{n.desc}</p>
                        <span className="text-[10px] text-slate-400">{n.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Profile / Auth Button */}
        {currentUser ? (
          <div className="relative">
            <button
              id="btn-user-profile"
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowQuickAdd(false);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="User Profile menu"
            >
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
                <span className="text-xs">{getInitials(currentUser.fullName, currentUser.email)}</span>
                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${isConfigured ? 'bg-emerald-500' : 'bg-indigo-400'}`} />
              </div>
              <div className="hidden text-left sm:block">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {currentUser.fullName || currentUser.email.split('@')[0]}
                  </p>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-bold ${
                      currentUser.role === 'admin'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    }`}
                  >
                    {currentUser.role === 'admin' ? (
                      <>
                        <Crown className="h-2.5 w-2.5" />
                        <span>Admin</span>
                      </>
                    ) : (
                      <>
                        <User className="h-2.5 w-2.5" />
                        <span>User</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {currentUser.isDemo ? 'Demo Mode' : isConfigured ? 'Supabase Synced' : 'Local User'}
                </p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            </button>

            {showProfileMenu && (
              <div
                id="dropdown-user-profile"
                className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl transition-all dark:border-slate-700 dark:bg-slate-800 z-50"
              >
                <div className="border-b border-slate-100 p-2.5 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {currentUser.fullName || 'Workspace User'}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        currentUser.role === 'admin'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300/60'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200/60'
                      }`}
                    >
                      {currentUser.role === 'admin' ? <Crown className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      <span>{currentUser.role === 'admin' ? 'Admin Role' : 'Standard User'}</span>
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-slate-400">{currentUser.email}</p>
                </div>

                <div className="py-1 space-y-0.5">
                  {/* Admin exclusive user role management */}
                  {currentUser.role === 'admin' && onOpenUserRolesModal && (
                    <button
                      id="btn-menu-user-roles"
                      onClick={() => {
                        onOpenUserRolesModal();
                        setShowProfileMenu(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                    >
                      <span className="flex items-center gap-2">
                        <Crown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Manage Users & Roles (RBAC)</span>
                      </span>
                      <span className="rounded bg-amber-200/80 px-1 py-0.2 text-[9px] dark:bg-amber-900">
                        Admin
                      </span>
                    </button>
                  )}

                  <button
                    id="btn-menu-export-data"
                    onClick={() => {
                      onOpenExportModal('all');
                      setShowProfileMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <FileDown className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Export CSV / PDF Reports</span>
                  </button>

                  <button
                    id="btn-menu-sound-settings"
                    onClick={() => {
                      onOpenSoundSettingsModal();
                      setShowProfileMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Sound & Reminder Alerts</span>
                  </button>

                  <button
                    id="btn-menu-deploy-guide"
                    onClick={() => {
                      onOpenDeployGuideModal();
                      setShowProfileMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Github className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                    <span>GitHub & Deploy Guide</span>
                  </button>

                  <button
                    id="btn-menu-sql-schema"
                    onClick={() => {
                      onOpenSqlModal();
                      setShowProfileMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Database className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Supabase SQL & RBAC Schema</span>
                  </button>

                  <button
                    id="btn-menu-supabase-keys"
                    onClick={() => {
                      onOpenConfigModal();
                      setShowProfileMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Supabase API Credentials</span>
                  </button>

                  <button
                    id="btn-menu-switch-account"
                    onClick={() => {
                      onOpenAuth('signin');
                      setShowProfileMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-violet-500" />
                    <span>Switch / Add Account</span>
                  </button>
                </div>

                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                <button
                  id="btn-menu-logout"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onSignOut();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              id="btn-header-signin"
              onClick={() => onOpenAuth('signin')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
            <button
              id="btn-header-signup"
              onClick={() => onOpenAuth('signup')}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
            >
              <span>Get Started</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
