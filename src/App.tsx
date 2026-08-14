/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { NotesSection } from './components/NotesSection';
import { TodoSection } from './components/TodoSection';
import { WorkLogSection } from './components/WorkLogSection';
import { NoteModal } from './components/NoteModal';
import { TodoModal } from './components/TodoModal';
import { WorkLogModal } from './components/WorkLogModal';
import { AuthModal } from './components/AuthModal';
import { SqlSchemaModal } from './components/SqlSchemaModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { DeployGuideModal } from './components/DeployGuideModal';
import { ExportModal } from './components/ExportModal';
import { UserRoleManagementModal } from './components/UserRoleManagementModal';
import { PersonalSpaceView } from './components/PersonalSpaceView';
import { NotificationToastContainer } from './components/NotificationToastContainer';
import { Note, TodoTask, WorkLog, NavSection, MetricStats, TaskStatus, UserSession, ActiveReminderAlert, SoundProfile, UserRole } from './types';
import { INITIAL_NOTES, INITIAL_TODOS, INITIAL_WORKLOGS } from './data/initialData';
import {
  getCurrentStoredUser,
  createDemoUserSession,
  createStandardDemoUserSession,
  signOutUser,
  getSupabase,
  getStoredSupabaseConfig,
  fetchUserProfile,
  syncFetchNotes,
  syncSaveNote,
  syncDeleteNote,
  syncFetchTodos,
  syncSaveTodo,
  syncDeleteTodo,
  syncFetchWorkLogs,
  syncSaveWorkLog,
  syncDeleteWorkLog,
} from './lib/supabase';
import {
  playAlertSound,
  getStoredNotificationSettings,
} from './lib/soundAlerts';
import {
  triggerNotificationAlert,
  hasNotificationPermission,
} from './lib/notifications';
import { Database, ShieldCheck, Sparkles, CheckCircle2, User, KeyRound, Volume2, Github, Crown, UserCheck } from 'lucide-react';

export default function App() {
  // Theme state with localStorage sync
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('workspace_theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Apply theme class to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('workspace_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('workspace_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const stored = getCurrentStoredUser();
    if (stored) return stored;
    return createDemoUserSession('manastraderstkp@gmail.com', 'Manas Traders');
  });

  // Primary navigation state
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('');

  // Core Data Collections (User-Isolated)
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [tasks, setTasks] = useState<TodoTask[]>(INITIAL_TODOS);
  const [worklogs, setWorklogs] = useState<WorkLog[]>(INITIAL_WORKLOGS);

  // Active Reminder In-App Toasts
  const [activeAlerts, setActiveAlerts] = useState<ActiveReminderAlert[]>([]);

  // Modal dialog states
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TodoTask | null>(null);

  const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);
  const [prefilledHours, setPrefilledHours] = useState<number | undefined>(undefined);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUserRolesModalOpen, setIsUserRolesModalOpen] = useState(false);
  const [exportModalType, setExportModalType] = useState<'all' | 'tasks' | 'worklogs' | 'notes'>('all');

  const handleOpenExportModal = (type: 'all' | 'tasks' | 'worklogs' | 'notes' = 'all') => {
    setExportModalType(type);
    setIsExportModalOpen(true);
  };

  // Supabase Auth listener
  useEffect(() => {
    const client = getSupabase();
    if (client) {
      const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const userEmail = session.user.email || '';
          const fullName = session.user.user_metadata?.full_name || userEmail.split('@')[0];
          // Fetch role dynamically from profiles table
          const { role } = await fetchUserProfile(session.user.id, userEmail, fullName);
          const sessionUser: UserSession = {
            id: session.user.id,
            email: userEmail,
            fullName,
            role,
            isDemo: false,
          };
          setCurrentUser(sessionUser);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Fetch data whenever currentUser changes
  const loadUserData = useCallback(async (user: UserSession) => {
    setIsSyncing(true);
    try {
      const [notesRes, todosRes, logsRes] = await Promise.all([
        syncFetchNotes(user.id),
        syncFetchTodos(user.id),
        syncFetchWorkLogs(user.id),
      ]);

      setNotes(notesRes.notes);
      setTasks(todosRes.todos);
      setWorklogs(logsRes.worklogs);

      if (notesRes.isCloud || todosRes.isCloud || logsRes.isCloud) {
        setSyncStatusText('Cloud Connected • Supabase Live Sync');
      } else {
        setSyncStatusText('User-Isolated Local Space');
      }
    } catch (err) {
      console.warn('Error loading user data:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUserData(currentUser);
    } else {
      setNotes([]);
      setTasks([]);
      setWorklogs([]);
    }
  }, [currentUser, loadUserData]);

  // Keep a reference to current notes and tasks for the background monitoring timer
  const notesRef = useRef(notes);
  const tasksRef = useRef(tasks);
  const userRef = useRef(currentUser);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    userRef.current = currentUser;
  }, [currentUser]);

  // -------------------------------------------------------------
  // Background Notification Monitoring System (setInterval check)
  // -------------------------------------------------------------
  useEffect(() => {
    const checkScheduledReminders = async () => {
      const now = new Date().getTime();
      const currentNotes = notesRef.current;
      const currentTasks = tasksRef.current;
      const user = userRef.current;

      const soundSettings = getStoredNotificationSettings();

      // Check Notes with pending reminder
      for (const note of currentNotes) {
        if (note.notifyAt && !note.notified) {
          const triggerTime = new Date(note.notifyAt).getTime();
          if (!isNaN(triggerTime) && triggerTime <= now) {
            // 1. Play Sound
            if (soundSettings.soundEnabled) {
              playAlertSound(soundSettings.soundProfile, soundSettings.volume);
            }

            // 2. Trigger Browser Notification
            triggerNotificationAlert(
              `Note Reminder: ${note.title}`,
              note.content ? note.content.slice(0, 120) : 'Scheduled reminder for your note',
              { tag: `note-${note.id}` }
            );

            // 3. Trigger In-App Visual Alert Toast
            const alertId = `alert-note-${note.id}-${Date.now()}`;
            setActiveAlerts((prev) => [
              ...prev,
              {
                id: alertId,
                itemId: note.id,
                title: note.title,
                description: note.content ? note.content.slice(0, 100) : 'Note reminder alert',
                type: 'note',
                category: note.category,
                scheduledTime: note.notifyAt || new Date().toISOString(),
                triggeredAt: new Date().toISOString(),
              },
            ]);

            // 4. Mark note as notified in state & Supabase
            const updatedNote: Note = { ...note, notified: true };
            setNotes((prev) => prev.map((n) => (n.id === note.id ? updatedNote : n)));
            if (user) {
              await syncSaveNote(user.id, updatedNote);
            }
          }
        }
      }

      // Check Tasks with pending reminder
      for (const task of currentTasks) {
        if (task.notifyAt && !task.notified && task.status !== 'completed') {
          const triggerTime = new Date(task.notifyAt).getTime();
          if (!isNaN(triggerTime) && triggerTime <= now) {
            // 1. Play Sound
            if (soundSettings.soundEnabled) {
              playAlertSound(soundSettings.soundProfile, soundSettings.volume);
            }

            // 2. Trigger Browser Notification
            triggerNotificationAlert(
              `Task Due: ${task.title}`,
              `Priority: ${task.priority.toUpperCase()} | Category: ${task.category}`,
              { tag: `task-${task.id}` }
            );

            // 3. Trigger In-App Visual Alert Toast
            const alertId = `alert-task-${task.id}-${Date.now()}`;
            setActiveAlerts((prev) => [
              ...prev,
              {
                id: alertId,
                itemId: task.id,
                title: task.title,
                description: task.description || `Priority: ${task.priority} • Category: ${task.category}`,
                type: 'todo',
                priority: task.priority,
                category: task.category,
                scheduledTime: task.notifyAt || new Date().toISOString(),
                triggeredAt: new Date().toISOString(),
              },
            ]);

            // 4. Mark task as notified in state & Supabase
            const updatedTask: TodoTask = { ...task, notified: true };
            setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));
            if (user) {
              await syncSaveTodo(user.id, updatedTask);
            }
          }
        }
      }
    };

    // Check immediately on mount, then every 10 seconds
    checkScheduledReminders();
    const timerInterval = setInterval(checkScheduledReminders, 10000);

    return () => clearInterval(timerInterval);
  }, []);

  // In-App Toast Handlers
  const handleDismissAlert = (alertId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleSnoozeAlert = async (alert: ActiveReminderAlert, minutes: number = 5) => {
    handleDismissAlert(alert.id);
    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    if (alert.type === 'note') {
      const target = notes.find((n) => n.id === alert.itemId);
      if (target && currentUser) {
        const updatedNote: Note = { ...target, notifyAt: snoozeTime, notified: false };
        setNotes((prev) => prev.map((n) => (n.id === alert.itemId ? updatedNote : n)));
        await syncSaveNote(currentUser.id, updatedNote);
      }
    } else {
      const target = tasks.find((t) => t.id === alert.itemId);
      if (target && currentUser) {
        const updatedTask: TodoTask = { ...target, notifyAt: snoozeTime, notified: false };
        setTasks((prev) => prev.map((t) => (t.id === alert.itemId ? updatedTask : t)));
        await syncSaveTodo(currentUser.id, updatedTask);
      }
    }
  };

  const handleNavigateAlertItem = (section: NavSection, itemId: string) => {
    setActiveSection(section);
    if (section === 'notes') {
      const target = notes.find((n) => n.id === itemId);
      if (target) {
        setEditingNote(target);
        setIsNoteModalOpen(true);
      }
    } else if (section === 'todos') {
      const target = tasks.find((t) => t.id === itemId);
      if (target) {
        setEditingTask(target);
        setIsTodoModalOpen(true);
      }
    }
  };

  // Calculate Real-time Statistics
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const stats: MetricStats = useMemo(() => {
    const totalNotes = notes.length;
    const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;

    const hoursLoggedToday = worklogs
      .filter((l) => l.date === todayStr)
      .reduce((acc, curr) => acc + curr.hoursSpent, 0);

    const totalHoursWeek = worklogs.reduce((acc, curr) => acc + curr.hoursSpent, 0);

    return {
      totalNotes,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      hoursLoggedToday,
      totalHoursWeek,
    };
  }, [notes, tasks, worklogs, todayStr]);

  // Unique categories aggregated across all entities
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    notes.forEach((n) => n.category && cats.add(n.category));
    tasks.forEach((t) => t.category && cats.add(t.category));
    worklogs.forEach((w) => w.category && cats.add(w.category));
    return Array.from(cats);
  }, [notes, tasks, worklogs]);

  // Handler for "+ Create" quick-launcher
  const handleOpenNewModal = (type: 'note' | 'todo' | 'worklog') => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (type === 'note') {
      setEditingNote(null);
      setIsNoteModalOpen(true);
    } else if (type === 'todo') {
      setEditingTask(null);
      setIsTodoModalOpen(true);
    } else if (type === 'worklog') {
      setEditingWorkLog(null);
      setPrefilledHours(undefined);
      setIsWorkLogModalOpen(true);
    }
  };

  // Auth Handlers
  const handleAuthSuccess = (user: UserSession) => {
    setCurrentUser(user);
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Note CRUD Operations with Supabase Sync
  const handleSaveNote = async (
    noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    let savedNote: Note;

    if (id) {
      savedNote = {
        id,
        ...noteData,
        createdAt: notes.find((n) => n.id === id)?.createdAt || nowIso,
        updatedAt: nowIso,
      };
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? savedNote : n))
      );
    } else {
      savedNote = {
        id: `note-${Date.now()}`,
        ...noteData,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setNotes((prev) => [savedNote, ...prev]);
    }

    await syncSaveNote(currentUser.id, savedNote);
  };

  const handleDeleteNote = async (id: string) => {
    if (!currentUser) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await syncDeleteNote(currentUser.id, id);
  };

  const handleTogglePin = async (id: string) => {
    if (!currentUser) return;
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const updated = { ...target, isPinned: !target.isPinned };
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    await syncSaveNote(currentUser.id, updated);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  // Todo CRUD Operations with Supabase Sync
  const handleSaveTask = async (
    taskData: Omit<TodoTask, 'id' | 'createdAt'>,
    id?: string
  ) => {
    if (!currentUser) return;
    let savedTask: TodoTask;

    if (id) {
      savedTask = {
        id,
        ...taskData,
        createdAt: tasks.find((t) => t.id === id)?.createdAt || new Date().toISOString(),
      };
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? savedTask : t))
      );
    } else {
      savedTask = {
        id: `todo-${Date.now()}`,
        ...taskData,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [savedTask, ...prev]);
    }

    await syncSaveTodo(currentUser.id, savedTask);
  };

  const handleDeleteTask = async (id: string) => {
    if (!currentUser) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await syncDeleteTodo(currentUser.id, id);
  };

  const handleToggleTaskStatus = async (id: string, newStatus: TaskStatus) => {
    if (!currentUser) return;
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const updated = { ...target, status: newStatus };
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    await syncSaveTodo(currentUser.id, updated);
  };

  const handleEditTask = (task: TodoTask) => {
    setEditingTask(task);
    setIsTodoModalOpen(true);
  };

  // Work Log CRUD Operations with Supabase Sync
  const handleSaveWorkLog = async (
    logData: Omit<WorkLog, 'id' | 'createdAt'>,
    id?: string
  ) => {
    if (!currentUser) return;
    let savedLog: WorkLog;

    if (id) {
      savedLog = {
        id,
        ...logData,
        createdAt: worklogs.find((l) => l.id === id)?.createdAt || new Date().toISOString(),
      };
      setWorklogs((prev) =>
        prev.map((l) => (l.id === id ? savedLog : l))
      );
    } else {
      savedLog = {
        id: `worklog-${Date.now()}`,
        ...logData,
        createdAt: new Date().toISOString(),
      };
      setWorklogs((prev) => [savedLog, ...prev]);
    }

    await syncSaveWorkLog(currentUser.id, savedLog);
  };

  const handleDeleteWorkLog = async (id: string) => {
    if (!currentUser) return;
    setWorklogs((prev) => prev.filter((l) => l.id !== id));
    await syncDeleteWorkLog(currentUser.id, id);
  };

  const handleEditWorkLog = (log: WorkLog) => {
    setEditingWorkLog(log);
    setPrefilledHours(undefined);
    setIsWorkLogModalOpen(true);
  };

  const handleAddWorkLogWithHours = (hours?: number) => {
    setEditingWorkLog(null);
    setPrefilledHours(hours);
    setIsWorkLogModalOpen(true);
  };

  // Reset sample data
  const handleResetData = async () => {
    if (!currentUser) return;
    if (
      window.confirm(
        `Reset all Notes, Todos, and Work Logs for user "${currentUser.email}" back to initial sample items?`
      )
    ) {
      setNotes(INITIAL_NOTES);
      setTasks(INITIAL_TODOS);
      setWorklogs(INITIAL_WORKLOGS);
      setSelectedCategory(null);
      setSearchQuery('');

      for (const n of INITIAL_NOTES) await syncSaveNote(currentUser.id, n);
      for (const t of INITIAL_TODOS) await syncSaveTodo(currentUser.id, t);
      for (const w of INITIAL_WORKLOGS) await syncSaveWorkLog(currentUser.id, w);
    }
  };

  const { isConfigured } = getStoredSupabaseConfig();

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased selection:bg-indigo-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          setSearchQuery('');
        }}
        stats={stats}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onResetData={handleResetData}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        availableCategories={availableCategories}
        currentUser={currentUser}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
        onOpenSoundSettingsModal={() => setIsSoundSettingsOpen(true)}
        onOpenDeployGuideModal={() => setIsDeployGuideOpen(true)}
        onOpenExportModal={handleOpenExportModal}
        onOpenUserRolesModal={() => setIsUserRolesModalOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header & Top Navbar */}
        <Header
          isDark={isDark}
          onToggleTheme={toggleTheme}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeSection={activeSection}
          onOpenNewModal={handleOpenNewModal}
          onNavigate={(sec) => {
            setActiveSection(sec);
            setSearchQuery('');
          }}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onSignOut={handleSignOut}
          onOpenSqlModal={() => setIsSqlModalOpen(true)}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
          onOpenSoundSettingsModal={() => setIsSoundSettingsOpen(true)}
          onOpenDeployGuideModal={() => setIsDeployGuideOpen(true)}
          onOpenExportModal={handleOpenExportModal}
          onOpenUserRolesModal={() => setIsUserRolesModalOpen(true)}
          notes={notes}
          tasks={tasks}
          worklogs={worklogs}
          onEditNote={handleEditNote}
          onEditTask={handleEditTask}
          onEditWorkLog={handleEditWorkLog}
        />

        {/* Global Cloud Sync & User Context Sub-Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200/70 bg-white/60 px-4 py-2 text-xs backdrop-blur-xs dark:border-slate-800/70 dark:bg-slate-900/60 sm:px-6">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-medium">
              <span className={`inline-block h-2 w-2 rounded-full ${isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`} />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {currentUser ? currentUser.email : 'Guest / Not Signed In'}
              </span>
              {currentUser && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[9px] font-bold ${
                    currentUser.role === 'admin'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300/60'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200/60'
                  }`}
                >
                  {currentUser.role === 'admin' ? <Crown className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                  <span>{currentUser.role === 'admin' ? 'Admin Access' : 'Standard User'}</span>
                </span>
              )}
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {currentUser?.role === 'admin'
                ? 'Full System Analytics & Role Management Active'
                : 'User-Isolated Storage & Personal Scope Active'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentUser?.role === 'admin' && (
              <>
                <button
                  onClick={() => setIsUserRolesModalOpen(true)}
                  className="flex items-center gap-1 font-bold text-amber-600 hover:underline dark:text-amber-400"
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span>Manage User Roles</span>
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
              </>
            )}
            <button
              onClick={() => handleOpenExportModal('all')}
              className="flex items-center gap-1 font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
            >
              <span>Export CSV / PDF</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={() => setIsSoundSettingsOpen(true)}
              className="flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Sound Alerts</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={() => setIsDeployGuideOpen(true)}
              className="flex items-center gap-1 font-semibold text-slate-700 hover:underline dark:text-slate-300"
            >
              <Github className="h-3.5 w-3.5" />
              <span>Deploy Guide</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              <Database className="h-3.5 w-3.5" />
              <span>SQL Schema</span>
            </button>
          </div>
        </div>

        {/* Dynamic Section Views */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {activeSection === 'dashboard' && (
              currentUser?.role === 'admin' ? (
                <DashboardView
                  stats={stats}
                  notes={notes}
                  tasks={tasks}
                  worklogs={worklogs}
                  onNavigate={(sec) => {
                    setActiveSection(sec);
                    setSearchQuery('');
                  }}
                  onOpenNewModal={handleOpenNewModal}
                  onToggleTaskStatus={handleToggleTaskStatus}
                  onEditNote={handleEditNote}
                  onEditTask={handleEditTask}
                  onEditWorkLog={handleEditWorkLog}
                  searchQuery={searchQuery}
                  isDark={isDark}
                  onOpenExportModal={handleOpenExportModal}
                />
              ) : (
                <PersonalSpaceView
                  currentUser={currentUser}
                  notes={notes}
                  tasks={tasks}
                  worklogs={worklogs}
                  onNavigate={(sec) => {
                    setActiveSection(sec);
                    setSearchQuery('');
                  }}
                  onOpenNewModal={handleOpenNewModal}
                  onToggleTaskStatus={handleToggleTaskStatus}
                  onEditNote={handleEditNote}
                  onEditTask={handleEditTask}
                  onEditWorkLog={handleEditWorkLog}
                  searchQuery={searchQuery}
                  onOpenExportModal={handleOpenExportModal}
                />
              )
            )}

            {activeSection === 'notes' && (
              <NotesSection
                notes={notes}
                onAddNote={() => {
                  setEditingNote(null);
                  setIsNoteModalOpen(true);
                }}
                onEditNote={handleEditNote}
                onDeleteNote={handleDeleteNote}
                onTogglePin={handleTogglePin}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            )}

            {activeSection === 'todos' && (
              <TodoSection
                tasks={tasks}
                onAddTask={() => {
                  setEditingTask(null);
                  setIsTodoModalOpen(true);
                }}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onToggleStatus={handleToggleTaskStatus}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                onOpenExportModal={handleOpenExportModal}
              />
            )}

            {activeSection === 'worklogs' && (
              <WorkLogSection
                logs={worklogs}
                onAddLog={handleAddWorkLogWithHours}
                onEditLog={handleEditWorkLog}
                onDeleteLog={handleDeleteWorkLog}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                onOpenExportModal={handleOpenExportModal}
              />
            )}
          </div>
        </main>
      </div>

      {/* Floating In-App Reminder Alerts */}
      <NotificationToastContainer
        alerts={activeAlerts}
        onDismiss={handleDismissAlert}
        onSnooze={handleSnoozeAlert}
        onNavigateItem={handleNavigateAlertItem}
      />

      {/* User Role Management Modal (RBAC) */}
      <UserRoleManagementModal
        isOpen={isUserRolesModalOpen}
        onClose={() => setIsUserRolesModalOpen(false)}
        currentUser={currentUser}
        onRoleChanged={(targetUserId, newRole) => {
          if (currentUser && currentUser.id === targetUserId) {
            setCurrentUser({ ...currentUser, role: newRole });
          }
        }}
      />

      {/* Export Data CSV / PDF Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tasks={tasks}
        worklogs={worklogs}
        notes={notes}
        currentUser={currentUser}
        initialType={exportModalType}
      />

      {/* Sound & Alert Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={isSoundSettingsOpen}
        onClose={() => setIsSoundSettingsOpen(false)}
      />

      {/* GitHub & Deployment Guide Modal */}
      <DeployGuideModal
        isOpen={isDeployGuideOpen}
        onClose={() => setIsDeployGuideOpen(false)}
      />

      {/* Auth Modal (Sign in, Sign Up, Guest Demo) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authModalMode}
        onOpenConfig={() => setIsConfigModalOpen(true)}
      />

      {/* SQL Schema & RLS Policies Modal */}
      <SqlSchemaModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      {/* Supabase Connection Setup Modal */}
      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfigUpdated={() => {
          if (currentUser) {
            loadUserData(currentUser);
          }
        }}
      />

      {/* Note Form Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        initialNote={editingNote}
      />

      {/* Todo Form Modal */}
      <TodoModal
        isOpen={isTodoModalOpen}
        onClose={() => {
          setIsTodoModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
      />

      {/* Work Log Form Modal */}
      <WorkLogModal
        isOpen={isWorkLogModalOpen}
        onClose={() => {
          setIsWorkLogModalOpen(false);
          setEditingWorkLog(null);
          setPrefilledHours(undefined);
        }}
        onSave={handleSaveWorkLog}
        initialLog={editingWorkLog}
        prefilledHours={prefilledHours}
      />
    </div>
  );
}
