import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sun,
  Moon,
  Plus,
  CheckCircle2,
  FileText,
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
import { NavSection, UserSession, Note, TodoTask } from '../types';
import { getStoredSupabaseConfig } from '../lib/supabase';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeSection: NavSection;
  onOpenNewModal: (type: 'note' | 'todo') => void;
  onNavigate: (section: NavSection) => void;
  onOpenMobileMenu: () => void;
  currentUser: UserSession | null;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onSignOut: () => void;
  onOpenSqlModal: () => void;
  onOpenConfigModal?: () => void;
  onOpenSoundSettingsModal: () => void;
  onOpenDeployGuideModal: () => void;
  onOpenExportModal: (initialType?: 'all' | 'tasks' | 'notes') => void;
  onOpenUserRolesModal?: () => void;
  notes: Note[];
  tasks: TodoTask[];
  onEditNote: (note: Note) => void;
  onEditTask: (task: TodoTask) => void;
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
  onEditNote,
  onEditTask,
}) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
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
    if (!query) return { matchingNotes: [], matchingTasks: [], totalCount: 0 };

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

    const totalCount = matchingNotes.length + matchingTasks.length;

    return {
      matchingNotes: matchingNotes.slice(0, 3),
      matchingTasks: matchingTasks.slice(0, 3),
      totalCount,
    };
  }, [searchQuery, notes, tasks]);

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
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Quick Add, Theme Toggle, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Add Dropdown */}
        <div className="relative">
          <button
            id="btn-quick-add"
            onClick={() => {
              setShowQuickAdd(!showQuickAdd);
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

        {/* User Profile / Auth Button */}
        {currentUser ? (
          <div className="relative">
            <button
              id="btn-user-profile"
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowQuickAdd(false);
              }}
              className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="User Profile menu"
            >
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800 overflow-hidden">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName || 'User'}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-xs">{getInitials(currentUser.fullName, currentUser.email)}</span>
                )}
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
                  {isConfigured ? 'Supabase Synced' : 'Active Session'}
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
                  <button
                    id="btn-menu-my-account"
                    onClick={() => {
                      onNavigate('account');
                      setShowProfileMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <User className="h-3.5 w-3.5 text-purple-500" />
                    <span>My Account & Profile</span>
                  </button>

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

                  {onOpenConfigModal && (
                    <button
                      id="btn-menu-supabase-keys"
                      onClick={() => {
                        onOpenConfigModal();
                        setShowProfileMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Supabase Project Settings</span>
                    </button>
                  )}

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
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition active:scale-95"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
            <button
              id="btn-header-signup"
              onClick={() => onOpenAuth('signup')}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-700 transition active:scale-95"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Sign Up</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
