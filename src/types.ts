export type NavSection = 'dashboard' | 'notes' | 'todos' | 'files' | 'transactions' | 'trash' | 'account';

export type UserRole = 'admin' | 'user';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

export type TransactionType = 'RECEIPT' | 'PAYMENT' | 'TRANSFER';

export type ReminderFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface UserTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  category: string;
  amount: number;
  paymentMethod: string;
  description?: string;
  transactionDate: string; // YYYY-MM-DD
  createdAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface TransactionReminder {
  id: string;
  userId: string;
  title: string;
  amount: number;
  frequency: ReminderFrequency;
  nextDueDate: string; // YYYY-MM-DD
  remindDaysBefore: number;
  category: string;
  paymentMethod: string;
  isActive: boolean;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export type SoundProfile = 'chime' | 'pulse' | 'fanfare' | 'marimba';

export interface NotificationSettings {
  soundEnabled: boolean;
  soundProfile: SoundProfile;
  volume: number; // 0 to 1
  browserNotificationsEnabled: boolean;
}

export interface ActiveReminderAlert {
  id: string;
  itemId: string;
  type: 'note' | 'todo';
  title: string;
  description?: string;
  category?: string;
  scheduledTime: string;
  triggeredAt: string;
  priority?: TaskPriority;
}

export interface UserSession {
  id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: UserRole; // 'admin' | 'user'
  isDemo?: boolean;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  colorScheme?: 'default' | 'indigo' | 'amber' | 'emerald' | 'rose' | 'sky';
  isPinned: boolean;
  imageUrl?: string; // Optional cover image URL
  attachments?: { id: string; name: string; url: string; size?: number }[]; // Files attached to the note
  notifyAt?: string; // ISO datetime string e.g. 2026-08-14T14:30
  notified?: boolean;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface TodoTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  notifyAt?: string; // ISO datetime string e.g. 2026-08-14T14:30
  notified?: boolean;
  category: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface UserFile {
  id: string;
  userId: string;
  folderId?: string | null;
  name: string;
  filePath: string;
  fileType: string;
  fileSize: number; // in bytes
  storageUrl: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface MetricStats {
  totalNotes: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalFolders?: number;
  totalFiles?: number;
}

export type TrashItemType = 'note' | 'todo' | 'file' | 'folder' | 'transaction' | 'reminder';

export interface TrashItem {
  id: string;
  originalId: string;
  type: TrashItemType;
  title: string; // Used for display in the trash list
  deletedAt: string;
  data: any; // The original serialized object
}

