import React from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Clock,
  Layers,
  Sparkles,
  X,
  Tag,
  Flame,
  CheckCircle,
  FolderOpen,
  TrendingUp,
  Database,
  KeyRound,
  ShieldCheck,
  UserCheck,
  User,
  Volume2,
  FileDown,
  Crown,
  LogOut,
  Trash2
} from 'lucide-react';
import { NavSection, MetricStats, UserSession } from '../types';
import { getStoredSupabaseConfig } from '../lib/supabase';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  stats: MetricStats;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onResetData: () => void;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  availableCategories: string[];
  currentUser: UserSession | null;
  onOpenSqlModal: () => void;
  onOpenSoundSettingsModal: () => void;
  onOpenDeployGuideModal: () => void;
  onOpenExportModal: (initialType?: 'all' | 'tasks' | 'worklogs' | 'notes') => void;
  onOpenUserRolesModal?: () => void;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  stats,
  isOpenMobile,
  onCloseMobile,
  onResetData,
  selectedCategory,
  onSelectCategory,
  availableCategories,
  currentUser,
  onOpenSqlModal,
  onOpenSoundSettingsModal,
  onOpenDeployGuideModal,
  onOpenExportModal,
  onOpenUserRolesModal,
  onSignOut,
}) => {
  const { isConfigured } = getStoredSupabaseConfig();

  const navItems = [
    {
      id: 'dashboard' as NavSection,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      color: 'text-indigo-500',
    },
    {
      id: 'notes' as NavSection,
      label: 'Notes',
      icon: FileText,
      badge: stats.totalNotes,
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      color: 'text-amber-500',
    },
    {
      id: 'todos' as NavSection,
      label: 'Todo Tasks',
      icon: CheckSquare,
      badge: stats.pendingTasks + stats.inProgressTasks,
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
      color: 'text-indigo-500',
    },
    {
      id: 'worklogs' as NavSection,
      label: 'Work Logs',
      icon: Clock,
      badge: `${stats.hoursLoggedToday.toFixed(1)}h`,
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      color: 'text-emerald-500',
    },
    {
      id: 'files' as NavSection,
      label: 'File Drive',
      icon: FolderOpen,
      badge: null,
      color: 'text-sky-500',
    },
    {
      id: 'sharemarket' as NavSection,
      label: 'Share Market',
      icon: TrendingUp,
      badge: null,
      color: 'text-indigo-500',
    },
    {
      id: 'trash' as NavSection,
      label: 'Trash',
      icon: Trash2,
      badge: null,
      color: 'text-slate-500',
    },
    {
      id: 'account' as NavSection,
      label: 'Account',
      icon: User,
      badge: null,
      color: 'text-purple-500',
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4 overflow-y-auto">
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Work<span className="text-indigo-600 dark:text-indigo-400">Space</span>
              </h1>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {isConfigured ? 'Supabase Connected' : 'User-Isolated Space'}
              </p>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : item.color
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Categories / Quick Filters */}
        {availableCategories.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Categories</span>
              {selectedCategory && (
                <button
                  onClick={() => onSelectCategory(null)}
                  className="text-[10px] lowercase text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 px-1">
              <button
                onClick={() => onSelectCategory(null)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  selectedCategory === null
                    ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                All
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(selectedCategory === cat ? null : cat)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Tag className="h-2.5 w-2.5 opacity-60" />
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Audio & Deployment Hub Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-850/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">Tools & Services</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Active
            </span>
          </div>

          <button
            onClick={onOpenSoundSettingsModal}
            className="flex w-full items-center justify-between rounded-lg bg-white p-2 text-left font-semibold text-slate-700 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-755"
          >
            <span className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5 text-indigo-500" />
              <span>Sound & Alerts</span>
            </span>
            <span className="text-[10px] text-slate-400">Settings</span>
          </button>

          {currentUser?.role === 'admin' && onOpenUserRolesModal && (
            <button
              id="btn-sidebar-user-roles"
              onClick={onOpenUserRolesModal}
              className="flex w-full items-center justify-between rounded-lg bg-amber-500/10 p-2 text-left font-bold text-amber-800 shadow-2xs hover:bg-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
            >
              <span className="flex items-center gap-2">
                <Crown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>User Roles (RBAC)</span>
              </span>
              <span className="rounded bg-amber-200/80 px-1 py-0.2 text-[9px] dark:bg-amber-900">
                Admin
              </span>
            </button>
          )}

          <button
            id="btn-sidebar-export-data"
            onClick={() => onOpenExportModal('all')}
            className="flex w-full items-center justify-between rounded-lg bg-white p-2 text-left font-semibold text-slate-700 shadow-2xs hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 dark:hover:text-emerald-300"
          >
            <span className="flex items-center gap-2">
              <FileDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV / PDF</span>
            </span>
            <span className="text-[10px] text-slate-400">Data</span>
          </button>
        </div>



        {/* Productivity streak card */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-violet-50/70 p-3.5 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-violet-950/20">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
            <Flame className="h-4 w-4 text-amber-500" />
            <span>Productivity Velocity</span>
          </div>
          <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-300/80">
            {stats.completedTasks} tasks done • {stats.hoursLoggedToday.toFixed(1)}h logged today
          </p>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-indigo-200/60 dark:bg-indigo-900/60">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-400"
              style={{
                width: `${Math.min(
                  100,
                  ((stats.completedTasks + stats.hoursLoggedToday) / 10) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Sign Out Button */}
        {onSignOut && (
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <button
              id="btn-sidebar-signout"
              onClick={() => {
                if (isOpenMobile) onCloseMobile();
                onSignOut();
              }}
              className="flex w-full items-center justify-between rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 dark:hover:text-rose-300 shadow-2xs"
            >
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                <span>Sign Out</span>
              </span>
              {currentUser?.email && (
                <span className="max-w-[100px] truncate text-[10px] font-normal text-rose-400 dark:text-rose-400/70">
                  {currentUser.email}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 border-r border-slate-200/80 bg-white/70 backdrop-blur-md md:flex md:flex-col dark:border-slate-800/80 dark:bg-slate-900/70">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 flex h-full w-4/5 max-w-xs flex-col bg-white shadow-2xl dark:bg-slate-900">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
