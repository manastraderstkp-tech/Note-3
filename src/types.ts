export type NavSection = 'dashboard' | 'notes' | 'todos' | 'worklogs' | 'files' | 'sharemarket' | 'transactions' | 'chat' | 'trash' | 'account';

export type UserRole = 'admin' | 'user';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

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

export interface WorkLog {
  id: string;
  projectName: string;
  taskDescription: string;
  hoursSpent: number; // in decimal hours e.g. 2.5
  date: string; // YYYY-MM-DD
  startTime?: string; // e.g. "09:30 AM"
  endTime?: string; // e.g. "12:00 PM"
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
  hoursLoggedToday: number;
  totalHoursWeek: number;
  totalFolders?: number;
  totalFiles?: number;
}

export interface StockHoldings {
  id: string;
  symbol: string;
  units: number;
  buyPrice: number;
  purchaseDate: string;
  wacc: number;
  totalDividends: number;
  createdAt: string;
}

export interface TradeLog {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  units: number;
  price: number;
  tradeDate: string;
  strategy: string;
  psychologyNotes: string;
  createdAt: string;
}

export interface WatchlistStock {
  id: string;
  symbol: string;
  createdAt: string;
}

export interface ShareMarketState {
  portfolio: StockHoldings[];
  trades: TradeLog[];
  watchlist: string[];
}

export type TrashItemType = 'note' | 'todo' | 'worklog' | 'file' | 'folder' | 'transaction';

export interface TrashItem {
  id: string;
  originalId: string;
  type: TrashItemType;
  title: string; // Used for display in the trash list
  deletedAt: string;
  data: any; // The original serialized object
}

export type TransactionType = 'payment' | 'receipt' | 'transfer';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'eSewa' | 'Khalti' | 'ConnectIPS' | 'Cheque' | 'Credit Card' | 'Other';

export interface Transaction {
  id: string;
  userId: string;
  voucherNo: string; // e.g. RCP-001, PYM-001, TRF-001
  type: TransactionType; // payment = expense, receipt = income, transfer = contra
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  amount: number;
  category: string; // e.g. "Office Rent", "Food & Tea", "Sales", "Utilities", etc.
  paymentMethod: PaymentMethod;
  transferToMethod?: PaymentMethod; // When type === 'transfer'
  partyName?: string; // Customer, Vendor, Employee, Payee or Payer
  description: string;
  receiptUrl?: string; // Attachment / Bill preview URL
  panVatNumber?: string;
  hasTaxVat?: boolean;
  taxAmount?: number;
  tags?: string[];
  isRecurring?: boolean;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface AccountingSummary {
  totalReceipts: number;
  totalPayments: number;
  netBalance: number;
  todayReceipts: number;
  todayPayments: number;
  thisMonthReceipts: number;
  thisMonthPayments: number;
  cashBalance: number;
  bankBalance: number;
  digitalWalletBalance: number;
  transactionCount: number;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderAvatar?: string;
  senderRole?: UserRole;
  receiverId?: string | null; // 'general' or null for public team chat, or target user ID for 1-on-1 private chat
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'file';
  replyToId?: string | null;
  replyToSnippet?: string | null;
  replyToSender?: string | null;
  reactions?: MessageReaction[];
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface ChatUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: UserRole;
  isOnline?: boolean;
  lastSeen?: string;
  unreadCount?: number;
}

