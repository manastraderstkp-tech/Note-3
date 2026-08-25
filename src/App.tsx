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
import { NoteModal } from './components/NoteModal';
import { TodoModal } from './components/TodoModal';
import { AuthModal } from './components/AuthModal';
import { AuthScreen } from './components/AuthScreen';
import { SqlSchemaModal } from './components/SqlSchemaModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { DeployGuideModal } from './components/DeployGuideModal';
import { ExportModal } from './components/ExportModal';
import { UserRoleManagementModal } from './components/UserRoleManagementModal';
import { PersonalSpaceView } from './components/PersonalSpaceView';
import { FileManager } from './components/FileManager';
import { TransactionsView } from './components/TransactionsView';
import { TransactionModal } from './components/TransactionModal';
import { ReminderModal } from './components/ReminderModal';
import { TrashSection } from './components/TrashSection';
import { AccountView } from './components/AccountView';
import { NotificationToastContainer } from './components/NotificationToastContainer';
import { Note, TodoTask, Folder, UserFile, UserTransaction, TransactionReminder, TransactionType, NavSection, MetricStats, TaskStatus, UserSession, ActiveReminderAlert, SoundProfile, UserRole, TrashItem, TrashItemType } from './types';
import { INITIAL_NOTES, INITIAL_TODOS } from './data/initialData';
import {
  getCurrentStoredUser,
  getInitialSupabaseSession,
  signOutUser,
  getSupabase,
  getStoredSupabaseConfig,
  fetchUserProfile,
  storeLocalUser,
  updateUserProfileData,
  updateUserPassword,
  deleteUserAccount,
  syncFetchNotes,
  syncSaveNote,
  syncDeleteNote,
  syncFetchTodos,
  syncSaveTodo,
  syncDeleteTodo,
  syncFetchFolders,
  syncCreateFolder,
  syncUpdateFolder,
  syncDeleteFolder,
  syncUploadFile,
  syncFetchFiles,
  syncDeleteFile,
  syncFetchTransactions,
  syncSaveTransaction,
  syncDeleteTransaction,
  syncSoftDeleteTransaction,
  syncRestoreTransaction,
  syncPermanentDeleteTransaction,
  subscribeToTransactions,
  syncFetchReminders,
  syncSaveReminder,
  syncDeleteReminder,
  syncSoftDeleteReminder,
  syncRestoreReminder,
  syncPermanentDeleteReminder,
  subscribeToReminders,
  calculateNextDueDate,
} from './lib/supabase';
import {
  playAlertSound,
  getStoredNotificationSettings,
  unlockAudioContext,
} from './lib/soundAlerts';
import {
  triggerNotificationAlert,
  hasNotificationPermission,
} from './lib/notifications';
import { Database, ShieldCheck, Sparkles, CheckCircle2, User, KeyRound, Volume2, Github, Crown, UserCheck, AlertCircle, X as CloseIcon } from 'lucide-react';

interface AppToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

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

  // Global App Action Toast notifications
  const [appToasts, setAppToasts] = useState<AppToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setAppToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setAppToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

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

  // Unlock AudioContext on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      unlockAudioContext();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Primary navigation state
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('');

  // Core Data Collections (User-Isolated)
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [reminders, setReminders] = useState<TransactionReminder[]>([]);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<UserTransaction | null>(null);
  const [transactionDefaultType, setTransactionDefaultType] = useState<TransactionType>('RECEIPT');

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<TransactionReminder | null>(null);

  // Trash State
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => {
    try {
      const raw = localStorage.getItem('ws_trash_items');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('ws_trash_items', JSON.stringify(trashItems));
  }, [trashItems]);

  // Active filters (hide trashed items)
  const activeNotes = notes.filter(n => !trashItems.some(t => t.originalId === n.id));
  const activeTasks = tasks.filter(task => !trashItems.some(t => t.originalId === task.id));
  const activeFolders = folders.filter(f => !trashItems.some(t => t.originalId === f.id));
  const activeFiles = files.filter(f => !trashItems.some(t => t.originalId === f.id));

  // Active Reminder In-App Toasts
  const [activeAlerts, setActiveAlerts] = useState<ActiveReminderAlert[]>([]);

  // Modal dialog states
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TodoTask | null>(null);

  // Automatically open Sign Up modal on first visit if no user is logged in
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    return !getCurrentStoredUser();
  });
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUserRolesModalOpen, setIsUserRolesModalOpen] = useState(false);
  const [exportModalType, setExportModalType] = useState<'all' | 'tasks' | 'notes'>('all');

  const handleOpenExportModal = (type: 'all' | 'tasks' | 'notes' = 'all') => {
    setExportModalType(type);
    setIsExportModalOpen(true);
  };

  // Supabase Auth listener and Initial Session Check
  useEffect(() => {
    let isMounted = true;

    // Check initial Supabase session on mount (route guard)
    const initAuth = async () => {
      try {
        const sessionUser = await getInitialSupabaseSession();
        if (isMounted) {
          setCurrentUser(sessionUser);
        }
      } catch (err) {
        console.warn('Error verifying session:', err);
      } finally {
        if (isMounted) {
          setAuthChecking(false);
        }
      }
    };

    initAuth();

    // Listen to real-time auth state changes without needing manual page refresh
    const client = getSupabase();
    let authListener: any = null;

    if (client) {
      const { data } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setCurrentUser(null);
            setAuthChecking(false);
          }
        } else if (session?.user) {
          const userEmail = session.user.email || '';
          const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || userEmail.split('@')[0];
          // Fetch role and profile dynamically from profiles table
          const { role, profile } = await fetchUserProfile(session.user.id, userEmail, fullName);
          const sessionUser: UserSession = {
            id: session.user.id,
            email: userEmail,
            fullName: profile?.fullName || fullName,
            phoneNumber: profile?.phoneNumber || session.user.user_metadata?.phone_number,
            avatarUrl: profile?.avatarUrl || session.user.user_metadata?.avatar_url,
            role,
            isDemo: false,
            createdAt: session.user.created_at,
          };
          storeLocalUser(sessionUser);
          if (isMounted) {
            setCurrentUser(sessionUser);
            setAuthChecking(false);
          }
        }
      });
      authListener = data;
    } else {
      setAuthChecking(false);
    }

    // Listen to cross-window popup OAuth success events
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_OAUTH_SUCCESS' && event.data?.user) {
        if (isMounted) {
          setCurrentUser(event.data.user);
          setAuthChecking(false);
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);

    return () => {
      isMounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, []);

  // Fetch data whenever currentUser changes
  const loadUserData = useCallback(async (user: UserSession) => {
    setIsSyncing(true);
    try {
      const [notesRes, todosRes, foldersRes, filesRes, txRes, remRes] = await Promise.all([
        syncFetchNotes(user.id),
        syncFetchTodos(user.id),
        syncFetchFolders(user.id),
        syncFetchFiles(user.id),
        syncFetchTransactions(user.id),
        syncFetchReminders(user.id),
      ]);

      setNotes(notesRes.notes);
      setTasks(todosRes.todos);
      setFolders(foldersRes.folders);
      setFiles(filesRes.files);
      setTransactions(txRes.transactions);
      setReminders(remRes.reminders);

      if (notesRes.isCloud || todosRes.isCloud || foldersRes.isCloud || filesRes.isCloud || txRes.isCloud || remRes.isCloud) {
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
      setIsAuthModalOpen(false);
      loadUserData(currentUser);
    } else {
      setNotes([]);
      setTasks([]);
      setFolders([]);
      setFiles([]);
      setTransactions([]);
      setReminders([]);
    }
  }, [currentUser, loadUserData]);

  // Supabase Realtime Subscription for Transactions
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToTransactions(
      currentUser.id,
      (newTx) => {
        setTransactions((prev) => {
          if (prev.some((t) => t.id === newTx.id)) return prev;
          return [newTx, ...prev];
        });
      },
      (updatedTx) => {
        setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));
      },
      (deletedId) => {
        setTransactions((prev) => prev.filter((t) => t.id !== deletedId));
      }
    );
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Supabase Realtime Subscription for Reminders
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToReminders(
      currentUser.id,
      (newRem) => {
        setReminders((prev) => {
          if (prev.some((r) => r.id === newRem.id)) return prev;
          return [newRem, ...prev];
        });
      },
      (updatedRem) => {
        setReminders((prev) => prev.map((r) => (r.id === updatedRem.id ? updatedRem : r)));
      },
      (deletedId) => {
        setReminders((prev) => prev.filter((r) => r.id !== deletedId));
      }
    );
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

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
    const totalNotes = activeNotes.length;
    const pendingTasks = activeTasks.filter((t) => t.status === 'pending').length;
    const inProgressTasks = activeTasks.filter((t) => t.status === 'in_progress').length;
    const completedTasks = activeTasks.filter((t) => t.status === 'completed').length;
    const totalFolders = activeFolders.length;
    const totalFiles = activeFiles.length;

    return {
      totalNotes,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      totalFolders,
      totalFiles,
    };
  }, [activeNotes, activeTasks, activeFolders, activeFiles]);

  // Unique categories aggregated across all entities
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    activeNotes.forEach((n) => n.category && cats.add(n.category));
    activeTasks.forEach((t) => t.category && cats.add(t.category));
    return Array.from(cats);
  }, [activeNotes, activeTasks]);

  // Handler for "+ Create" quick-launcher
  const handleOpenNewModal = (type: 'note' | 'todo') => {
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
    }
  };

  // Auth Handlers
  const handleAuthSuccess = (user: UserSession) => {
    setCurrentUser(user);
    setAuthChecking(false);
    setIsAuthModalOpen(false);
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
  };

  const handleUpdateProfile = async (updated: { fullName?: string; phoneNumber?: string; avatarUrl?: string }) => {
    if (!currentUser) return { success: false, error: 'No active user session found.' };
    const res = await updateUserProfileData(currentUser.id, updated);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    } else if (res.success) {
      setCurrentUser({
        ...currentUser,
        ...(updated.fullName !== undefined ? { fullName: updated.fullName } : {}),
        ...(updated.phoneNumber !== undefined ? { phoneNumber: updated.phoneNumber } : {}),
        ...(updated.avatarUrl !== undefined ? { avatarUrl: updated.avatarUrl } : {}),
      });
    }
    return res;
  };

  const handleChangePassword = async (newPassword: string) => {
    return await updateUserPassword(newPassword);
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return { success: false, error: 'No active user session found.' };
    const res = await deleteUserAccount(currentUser.id);
    if (res.success) {
      setNotes([]);
      setTasks([]);
      setFolders([]);
      setFiles([]);
      setTrashItems([]);
      setCurrentUser(null);
      setActiveSection('dashboard');
    }
    return res;
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Note CRUD Operations with Supabase Sync
  const handleSaveNote = async (
    noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      showToast('You must be signed in to save notes.', 'error');
      return { success: false, error: 'User session not found' };
    }

    const nowIso = new Date().toISOString();
    const existing = id ? notes.find((n) => n.id === id) : null;
    const noteToSave: Note = {
      id: id || `note-${Date.now()}`,
      ...noteData,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const res = await syncSaveNote(currentUser.id, noteToSave);
    if (res.error) {
      showToast(`Failed to save Note: ${res.error}`, 'error');
      return { success: false, error: res.error };
    }

    const finalNote = res.data || noteToSave;
    // Optimistic State Persistence: directly update local React state with the returned Supabase row
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === finalNote.id || (id ? n.id === id : false));
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = finalNote;
        return copy;
      }
      return [finalNote, ...prev];
    });

    showToast(id ? 'Note updated successfully' : 'Note created successfully', 'success');
    return { success: true };
  };

  const handleMoveToTrash = (originalId: string, type: TrashItemType, title: string, data: any) => {
    const item: TrashItem = {
      id: `trash-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
      originalId,
      type,
      title,
      deletedAt: new Date().toISOString(),
      data,
    };
    setTrashItems(prev => [item, ...prev]);
  };

  const handleDeleteNote = async (id: string) => {
    if (!currentUser) return;
    const note = notes.find(n => n.id === id);
    if (note) {
      // Execute the actual Supabase delete query and remove from state
      setNotes((prev) => prev.filter((n) => n.id !== id));
      await syncDeleteNote(currentUser.id, id);
      
      handleMoveToTrash(id, 'note', note.title, note);
      showToast('Note deleted and moved to trash', 'info');
    }
  };

  const handleTogglePin = async (id: string) => {
    if (!currentUser) return;
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const updated: Note = { ...target, isPinned: !target.isPinned };
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
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      showToast('You must be signed in to save tasks.', 'error');
      return { success: false, error: 'User session not found' };
    }

    const nowIso = new Date().toISOString();
    const existing = id ? tasks.find((t) => t.id === id) : null;
    const taskToSave: TodoTask = {
      id: id || `todo-${Date.now()}`,
      ...taskData,
      createdAt: existing?.createdAt || nowIso,
    };

    const res = await syncSaveTodo(currentUser.id, taskToSave);
    if (res.error) {
      showToast(`Failed to save Todo: ${res.error}`, 'error');
      return { success: false, error: res.error };
    }

    const finalTask = res.data || taskToSave;
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === finalTask.id || (id ? t.id === id : false));
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = finalTask;
        return copy;
      }
      return [finalTask, ...prev];
    });

    showToast(id ? 'Task updated successfully' : 'Task added successfully', 'success');
    return { success: true };
  };

  const handleDeleteTask = async (id: string) => {
    if (!currentUser) return;
    const task = tasks.find(t => t.id === id);
    if (task) {
      // Execute the actual Supabase delete query and remove from state
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await syncDeleteTodo(currentUser.id, id);

      handleMoveToTrash(id, 'todo', task.title, task);
      showToast('Task deleted and moved to trash', 'info');
    }
  };

  const handleToggleTaskStatus = async (id: string, newStatus: TaskStatus) => {
    if (!currentUser) return;
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const updated: TodoTask = { ...target, status: newStatus };
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    await syncSaveTodo(currentUser.id, updated);
  };

  const handleEditTask = (task: TodoTask) => {
    setEditingTask(task);
    setIsTodoModalOpen(true);
  };

  // Transaction CRUD Operations with Supabase Sync
  const handleSaveTransaction = async (txData: Omit<UserTransaction, 'id' | 'createdAt' | 'userId'>, id?: string) => {
    if (!currentUser) {
      showToast('You must be signed in to save transactions.', 'error');
      return { success: false, error: 'User session not found' };
    }

    const nowIso = new Date().toISOString();
    const existing = id ? transactions.find((t) => t.id === id) : null;
    const txToSave: UserTransaction = {
      id: id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      ...txData,
      createdAt: existing?.createdAt || nowIso,
    };

    const res = await syncSaveTransaction(currentUser.id, txToSave);
    if (res.error) {
      showToast(`Failed to save transaction: ${res.error}`, 'error');
      return { success: false, error: res.error };
    }

    const finalTx = res.data || txToSave;
    setTransactions((prev) => {
      const idx = prev.findIndex((t) => t.id === finalTx.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = finalTx;
        return copy;
      }
      return [finalTx, ...prev];
    });

    showToast(id ? 'Transaction updated successfully' : 'Transaction added successfully', 'success');
    return { success: true };
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!currentUser) return;
    const tx = transactions.find((t) => t.id === id);
    if (tx) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      await syncSoftDeleteTransaction(currentUser.id, id);
      const title = tx.description ? `${tx.description} (Rs. ${tx.amount})` : `${tx.category} - Rs. ${tx.amount}`;
      handleMoveToTrash(id, 'transaction', title, tx);
      showToast('Transaction moved to trash', 'info');
    }
  };

  const handleOpenTransactionModal = (type: TransactionType = 'RECEIPT', tx: UserTransaction | null = null) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setTransactionDefaultType(type);
    setEditingTransaction(tx);
    setIsTransactionModalOpen(true);
  };

  // Reminder CRUD & Mark as Paid Operations
  const handleSaveReminder = async (remData: TransactionReminder) => {
    if (!currentUser) {
      showToast('You must be signed in to save reminders.', 'error');
      return { success: false, error: 'User session not found' };
    }

    const res = await syncSaveReminder(currentUser.id, remData);
    if (res.error) {
      showToast(`Failed to save reminder: ${res.error}`, 'error');
      return { success: false, error: res.error };
    }

    const saved = res.data || remData;
    setReminders((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });

    showToast('Recurring reminder saved successfully', 'success');
    return { success: true };
  };

  const handleDeleteReminder = async (id: string) => {
    if (!currentUser) return;
    const rem = reminders.find((r) => r.id === id);
    if (rem) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
      await syncSoftDeleteReminder(currentUser.id, id);
      handleMoveToTrash(id, 'reminder', rem.title, rem);
      showToast('Recurring reminder moved to trash', 'info');
    }
  };

  const handleOpenReminderModal = (rem: TransactionReminder | null = null) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setEditingReminder(rem);
    setIsReminderModalOpen(true);
  };

  const handleMarkReminderAsPaid = async (rem: TransactionReminder) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const txResult = await handleSaveTransaction({
      type: 'PAYMENT',
      category: rem.category || 'Rent',
      amount: rem.amount,
      paymentMethod: rem.paymentMethod || 'Bank Transfer',
      description: `Paid: ${rem.title} (${rem.frequency})`,
      transactionDate: todayStr,
    });

    if (!txResult.success) {
      showToast('Failed to record transaction payment', 'error');
      return;
    }

    const nextDue = calculateNextDueDate(rem.nextDueDate, rem.frequency);
    const updatedReminder: TransactionReminder = {
      ...rem,
      nextDueDate: nextDue,
    };

    await handleSaveReminder(updatedReminder);
    showToast(`Marked "${rem.title}" as paid! Next due date: ${nextDue}`, 'success');
  };

  // Folder & File CRUD Operations with Supabase Sync
  const handleCreateFolder = async (
    name: string,
    parentId?: string | null
  ): Promise<{ success: boolean; error?: string; folder?: Folder }> => {
    if (!currentUser) {
      showToast('You must be signed in to create folders.', 'error');
      return { success: false, error: 'User session not found' };
    }

    const res = await syncCreateFolder(currentUser.id, name, parentId);
    if (res.error) {
      return { success: false, error: res.error };
    }

    if (res.data) {
      setFolders((prev) => {
        const exists = prev.some((f) => f.id === res.data!.id);
        if (exists) return prev.map((f) => (f.id === res.data!.id ? res.data! : f));
        return [...prev, res.data!];
      });
      return { success: true, folder: res.data };
    }
    return { success: true };
  };

  const handleRenameFolder = async (
    folderId: string,
    newName: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      showToast('You must be signed in to rename folders.', 'error');
      return { success: false, error: 'User session not found' };
    }

    const res = await syncUpdateFolder(currentUser.id, folderId, newName);
    if (res.error) {
      showToast(res.error, 'error');
      return { success: false, error: res.error };
    }

    if (res.data) {
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, name: res.data!.name, updatedAt: res.data!.updatedAt } : f))
      );
      showToast(`Folder renamed to "${res.data.name}"`, 'success');
    }
    return { success: true };
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!currentUser) return;
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      const childFiles = files.filter(f => f.folderId === folderId);
      setFiles((prev) => prev.filter((f) => f.folderId !== folderId));
      await syncDeleteFolder(currentUser.id, folderId);

      handleMoveToTrash(folderId, 'folder', folder.name, folder);
      // Also move child files to trash
      childFiles.forEach(f => handleMoveToTrash(f.id, 'file', f.name, f));
      showToast('Folder and its files deleted and moved to trash', 'info');
    }
  };

  const handleUploadFile = async (
    folderId: string | null,
    file: File
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      showToast('You must be signed in to upload files.', 'error');
      return { success: false, error: 'User session not found' };
    }

    const res = await syncUploadFile(currentUser.id, folderId, file);
    if (res.error) {
      return { success: false, error: res.error };
    }

    if (res.data) {
      setFiles((prev) => [res.data!, ...prev]);
    }
    return { success: true };
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    if (!currentUser) return;
    const file = files.find(f => f.id === fileId);
    if (file) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      await syncDeleteFile(currentUser.id, fileId, filePath);

      handleMoveToTrash(fileId, 'file', file.name, file);
      showToast('File deleted and moved to trash', 'info');
    }
  };

  const handleRestoreItem = async (item: TrashItem) => {
    if (!currentUser) return;

    setTrashItems(prev => prev.filter(t => t.id !== item.id));

    if (item.type === 'note') {
      const data = item.data as Note;
      setNotes(prev => [data, ...prev]);
      await syncSaveNote(currentUser.id, data);
    } else if (item.type === 'todo') {
      const data = item.data as TodoTask;
      setTasks(prev => [data, ...prev]);
      await syncSaveTodo(currentUser.id, data);
    } else if (item.type === 'folder') {
      const data = item.data as Folder;
      setFolders(prev => [data, ...prev]);
      await syncCreateFolder(currentUser.id, data.name, data.parentId, data.id);
    } else if (item.type === 'file') {
      const data = item.data as UserFile;
      setFiles(prev => [data, ...prev]);
    } else if (item.type === 'transaction') {
      const data = item.data as UserTransaction;
      setTransactions(prev => [data, ...prev]);
      await syncRestoreTransaction(currentUser.id, data.id);
    } else if (item.type === 'reminder') {
      const data = item.data as TransactionReminder;
      setReminders(prev => [data, ...prev]);
      await syncRestoreReminder(currentUser.id, data.id);
    }

    showToast(`${item.title} restored`, 'success');
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    if (!currentUser) return;
    setTrashItems(prev => prev.filter(t => t.id !== item.id));
    if (item.type === 'transaction') {
      await syncPermanentDeleteTransaction(currentUser.id, item.originalId);
    } else if (item.type === 'reminder') {
      await syncPermanentDeleteReminder(currentUser.id, item.originalId);
    }
    showToast('Item permanently deleted', 'info');
  };

  const handleEmptyTrash = async () => {
    if (!currentUser) return;
    // Items are already deleted from Supabase during the main delete action,
    // so we just clear the trash state.
    setTrashItems([]);
    showToast('Trash emptied completely', 'success');
  };

  // Reset sample data
  const handleResetData = async () => {
    if (!currentUser) return;
    if (
      window.confirm(
        `Reset all Notes and Todos for user "${currentUser.email}" back to initial sample items?`
      )
    ) {
      setNotes(INITIAL_NOTES);
      setTasks(INITIAL_TODOS);
      setSelectedCategory(null);
      setSearchQuery('');

      for (const n of INITIAL_NOTES) await syncSaveNote(currentUser.id, n);
      for (const t of INITIAL_TODOS) await syncSaveTodo(currentUser.id, t);
    }
  };

  const { isConfigured } = getStoredSupabaseConfig();

  // Authentication First Route Guard:
  // If verifying session status, show initial loader
  if (authChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-200">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 animate-pulse">
          <Database className="h-6 w-6" />
        </div>
        <div className="mb-2.5 h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Checking Workspace Authentication...
        </p>
      </div>
    );
  }

  // If user is NOT logged in, hide dashboard & navigation completely and display modern Sign In / Sign Up Screen
  if (!currentUser) {
    return (
      <AuthScreen
        onSuccess={handleAuthSuccess}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />
    );
  }

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
        onOpenSoundSettingsModal={() => setIsSoundSettingsOpen(true)}
        onOpenDeployGuideModal={() => setIsDeployGuideOpen(true)}
        onOpenExportModal={handleOpenExportModal}
        onOpenUserRolesModal={() => setIsUserRolesModalOpen(true)}
        onSignOut={handleSignOut}
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
          onOpenSoundSettingsModal={() => setIsSoundSettingsOpen(true)}
          onOpenDeployGuideModal={() => setIsDeployGuideOpen(true)}
          onOpenExportModal={handleOpenExportModal}
          onOpenUserRolesModal={() => setIsUserRolesModalOpen(true)}
          notes={notes}
          tasks={tasks}
          onEditNote={handleEditNote}
          onEditTask={handleEditTask}
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
        </div>

        {/* Dynamic Section Views */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {activeSection === 'dashboard' && (
              currentUser?.role === 'admin' ? (
                <DashboardView
                  stats={stats}
                  notes={activeNotes}
                  tasks={activeTasks}
                  onNavigate={(sec) => {
                    setActiveSection(sec);
                    setSearchQuery('');
                  }}
                  onOpenNewModal={handleOpenNewModal}
                  onToggleTaskStatus={handleToggleTaskStatus}
                  onEditNote={handleEditNote}
                  onEditTask={handleEditTask}
                  searchQuery={searchQuery}
                  isDark={isDark}
                  onOpenExportModal={handleOpenExportModal}
                />
              ) : (
                <PersonalSpaceView
                  currentUser={currentUser}
                  notes={activeNotes}
                  tasks={activeTasks}
                  onNavigate={(sec) => {
                    setActiveSection(sec);
                    setSearchQuery('');
                  }}
                  onOpenNewModal={handleOpenNewModal}
                  onToggleTaskStatus={handleToggleTaskStatus}
                  onEditNote={handleEditNote}
                  onEditTask={handleEditTask}
                  searchQuery={searchQuery}
                  onOpenExportModal={handleOpenExportModal}
                />
              )
            )}

            {activeSection === 'notes' && (
              <NotesSection
                notes={activeNotes}
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
                tasks={activeTasks}
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

            {activeSection === 'files' && (
              <FileManager
                folders={activeFolders}
                files={activeFiles}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onUploadFile={handleUploadFile}
                onDeleteFile={handleDeleteFile}
                onShowToast={showToast}
                searchQuery={searchQuery}
              />
            )}

            {activeSection === 'transactions' && (
              <TransactionsView
                transactions={transactions}
                reminders={reminders}
                onOpenModal={handleOpenTransactionModal}
                onDeleteTransaction={handleDeleteTransaction}
                onOpenReminderModal={handleOpenReminderModal}
                onDeleteReminder={handleDeleteReminder}
                onMarkReminderAsPaid={handleMarkReminderAsPaid}
                syncStatusText={syncStatusText}
              />
            )}

            {activeSection === 'trash' && (
              <TrashSection
                trashItems={trashItems}
                onRestore={handleRestoreItem}
                onPermanentDelete={handlePermanentDelete}
                onEmptyTrash={handleEmptyTrash}
              />
            )}

            {activeSection === 'account' && (
              <AccountView
                currentUser={currentUser}
                stats={stats}
                onUpdateProfile={handleUpdateProfile}
                onChangePassword={handleChangePassword}
                onDeleteAccount={handleDeleteAccount}
                onSignOut={handleSignOut}
                onOpenAuth={handleOpenAuth}
                onOpenSqlModal={() => setIsSqlModalOpen(true)}
                onShowToast={showToast}
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

      {/* Global App Action Feedback Toasts (Save success, Errors, Network events) */}
      {appToasts.length > 0 && (
        <div className="fixed top-5 right-5 z-50 flex max-w-sm w-full flex-col gap-2 pointer-events-none">
          {appToasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
                toast.type === 'error'
                  ? 'border border-rose-200 bg-rose-50/95 text-rose-900 dark:border-rose-800 dark:bg-rose-950/95 dark:text-rose-200'
                  : toast.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-200'
                  : 'border border-slate-200 bg-white/95 text-slate-800 dark:border-slate-800 dark:bg-slate-900/95 dark:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'error' ? (
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                ) : toast.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Sparkles className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                )}
                <span className="text-xs font-semibold">{toast.message}</span>
              </div>
              <button
                onClick={() => setAppToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="rounded-lg p-1 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

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
      />

      {/* SQL Schema & RLS Policies Modal */}
      <SqlSchemaModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
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

      {/* Transaction Form Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        initialTransaction={editingTransaction}
        defaultType={transactionDefaultType}
      />

      {/* Reminder Form Modal */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setEditingReminder(null);
        }}
        onSave={handleSaveReminder}
        initialReminder={editingReminder}
        userId={currentUser?.id || 'demo-user'}
      />
    </div>
  );
}
