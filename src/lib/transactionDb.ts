import { Transaction, AccountingSummary, TransactionType, PaymentMethod } from '../types';
import {
  getSupabase,
  getStoredSupabaseConfig,
  isValidUUID,
  generateUUID,
  syncFetchUserTransactions,
  syncSaveUserTransaction,
  syncDeleteUserTransaction,
  syncClearUserTransactions
} from './supabase';

const STORAGE_KEY_PREFIX = 'ws_transactions_user_';

async function resolveSupabaseUserId(userId: string, supabase: any): Promise<{ primaryId: string; filterIds: string[] }> {
  const effectiveUserId = (userId && userId.trim()) ? userId.trim() : 'demo-user';
  const filterIdsSet = new Set<string>([effectiveUserId, 'demo-user']);

  if (supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        filterIdsSet.add(data.user.id);
        return { primaryId: data.user.id, filterIds: Array.from(filterIdsSet) };
      }
    } catch {
      // Ignore auth getUser error
    }
  }

  return { primaryId: effectiveUserId, filterIds: Array.from(filterIdsSet) };
}

async function uploadReceiptToSupabaseStorage(
  receiptUrl: string | undefined,
  userId: string,
  supabase: any
): Promise<string | null> {
  if (!receiptUrl) return null;
  if (!receiptUrl.startsWith('data:image/')) return receiptUrl;

  try {
    const parts = receiptUrl.split(',');
    if (parts.length < 2) return receiptUrl;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    const ext = mime.split('/')[1] || 'jpg';
    const filePath = `receipts/${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('user_files')
      .upload(filePath, blob, { upsert: true });

    if (!uploadErr) {
      const { data: urlData } = supabase.storage
        .from('user_files')
        .getPublicUrl(filePath);
      if (urlData?.publicUrl) return urlData.publicUrl;
    }

    const { error: fallbackErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, { upsert: true });

    if (!fallbackErr) {
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      if (urlData?.publicUrl) return urlData.publicUrl;
    }
  } catch (err) {
    console.warn('Error uploading receipt image to storage:', err);
  }

  return receiptUrl;
}

export const EXPENSE_CATEGORIES = [
  { id: 'food_tea', name: 'Food, Tea & Snacks (चिया/खाजा)', icon: 'Utensils' },
  { id: 'travel_fuel', name: 'Travel & Fuel (यातायात/इन्धन)', icon: 'Car' },
  { id: 'office_supplies', name: 'Office Supplies & Stationery (कार्यालय सामग्री)', icon: 'Paperclip' },
  { id: 'rent', name: 'Rent (घर / कार्यालय भाडा)', icon: 'Home' },
  { id: 'utilities', name: 'Electricity, Water & Internet (विद्युत/इन्टरनेट)', icon: 'Zap' },
  { id: 'salary_wages', name: 'Salary & Daily Wages (तलब तथा ज्याला)', icon: 'Users' },
  { id: 'purchases', name: 'Goods & Inventory Purchases (सामग्री खरिद)', icon: 'ShoppingBag' },
  { id: 'repairs', name: 'Maintenance & Repairs (मर्मत तथा सम्भार)', icon: 'Wrench' },
  { id: 'marketing', name: 'Marketing & Advertising (विज्ञापन खर्च)', icon: 'Megaphone' },
  { id: 'mobile_recharge', name: 'Mobile Recharge & Communication (मोबाइल/फोन)', icon: 'Phone' },
  { id: 'personal_drawings', name: 'Personal Expenses / Drawings (व्यक्तिगत खर्च)', icon: 'User' },
  { id: 'bank_charges', name: 'Bank Charges & Tax (बैंक शुल्क/कर)', icon: 'Percent' },
  { id: 'miscellaneous', name: 'Miscellaneous (अन्य विविध खर्च)', icon: 'HelpCircle' },
];

export const INCOME_CATEGORIES = [
  { id: 'sales_revenue', name: 'Sales Revenue (बिक्री आम्दानी)', icon: 'ShoppingBag' },
  { id: 'service_fee', name: 'Service / Consulting Fee (सेवा शुल्क)', icon: 'Briefcase' },
  { id: 'client_payment', name: 'Client Payment Received (ग्राहकबाट भुक्तानी)', icon: 'CheckCircle2' },
  { id: 'salary_received', name: 'Salary / Wage Income (तलब/पारिश्रमिक प्राप्ति)', icon: 'DollarSign' },
  { id: 'rent_income', name: 'Rental Income (भाडा आम्दानी)', icon: 'Home' },
  { id: 'commission', name: 'Commission & Bonus (कमिशन तथा बोनस)', icon: 'Award' },
  { id: 'interest_dividend', name: 'Interest & Investment (ब्याज तथा लाभांश)', icon: 'TrendingUp' },
  { id: 'capital_deposit', name: 'Capital Deposit / Loan (पुँजी/ऋण प्राप्ति)', icon: 'PlusCircle' },
  { id: 'other_income', name: 'Other Income (अन्य आम्दानी)', icon: 'HelpCircle' },
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Bank Transfer',
  'eSewa',
  'Khalti',
  'ConnectIPS',
  'Cheque',
  'Credit Card',
  'Other',
];

export async function fetchUserTransactions(userId: string): Promise<Transaction[]> {
  const effectiveUserId = (userId && userId.trim()) ? userId.trim() : 'demo-user';
  const key = `${STORAGE_KEY_PREFIX}${effectiveUserId}`;

  // Priority 1: Direct fetch from Supabase user_transactions table
  const { isConfigured } = getStoredSupabaseConfig();
  if (isConfigured) {
    try {
      const result = await syncFetchUserTransactions(userId);
      if (!result.error && result.data && result.data.length > 0) {
        try {
          localStorage.setItem(key, JSON.stringify(result.data));
        } catch {
          // ignore
        }
        return result.data;
      } else if (result.error) {
        console.warn('[fetchUserTransactions] Supabase fetch error:', result.error);
      }
    } catch (err) {
      console.warn('[fetchUserTransactions] Exception querying Supabase:', err);
    }
  }

  // Priority 2: Fallback to localStorage
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed: Transaction[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((t) => !t.isDeleted && !t.id.startsWith('tx-init-'));
      }
    }
  } catch (e) {
    console.warn('Failed to parse local transactions:', e);
  }

  return [];
}

export async function clearAllUserTransactions(userId: string): Promise<{ success: boolean; error?: string }> {
  const effectiveUserId = (userId && userId.trim()) ? userId.trim() : 'demo-user';
  const key = `${STORAGE_KEY_PREFIX}${effectiveUserId}`;

  localStorage.setItem(key, JSON.stringify([]));

  const { isConfigured } = getStoredSupabaseConfig();
  if (isConfigured) {
    try {
      const res = await syncClearUserTransactions(userId);
      if (res.error) {
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      console.error('[clearAllUserTransactions] Supabase clear error:', err);
      return { success: false, error: err?.message };
    }
  }

  return { success: true };
}

export async function saveUserTransaction(
  userId: string,
  tx: Omit<Transaction, 'id' | 'createdAt' | 'userId'>,
  id?: string
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  const effectiveUserId = (userId && userId.trim()) ? userId.trim() : 'demo-user';
  const key = `${STORAGE_KEY_PREFIX}${effectiveUserId}`;

  const currentList = await fetchUserTransactions(effectiveUserId);
  const now = new Date().toISOString();

  // Resolve valid ID (UUID for database compatibility)
  let targetId = id;
  if (!targetId || !isValidUUID(targetId)) {
    targetId = generateUUID();
  }

  let targetTx: Transaction;

  if (id) {
    const existingIndex = currentList.findIndex((t) => t.id === id);
    targetTx = {
      ...tx,
      id: targetId,
      userId: effectiveUserId,
      createdAt: existingIndex >= 0 ? currentList[existingIndex].createdAt : now,
      updatedAt: now,
    };
    if (existingIndex >= 0) {
      currentList[existingIndex] = targetTx;
    } else {
      currentList.unshift(targetTx);
    }
  } else {
    const prefix = tx.type === 'receipt' ? 'RCP' : tx.type === 'payment' ? 'PYM' : 'TRF';
    const autoVoucher = tx.voucherNo?.trim() || `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

    targetTx = {
      ...tx,
      id: targetId,
      userId: effectiveUserId,
      voucherNo: autoVoucher,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(targetTx);
  }

  // Sort list
  currentList.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  // Local cache update
  localStorage.setItem(key, JSON.stringify(currentList));

  // Direct Supabase Persistence
  const { isConfigured } = getStoredSupabaseConfig();
  if (isConfigured) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { primaryId } = await resolveSupabaseUserId(userId, supabase);

        // Upload receipt if base64
        const finalReceiptUrl = await uploadReceiptToSupabaseStorage(
          targetTx.receiptUrl,
          primaryId,
          supabase
        );

        if (finalReceiptUrl) {
          targetTx.receiptUrl = finalReceiptUrl;
        }

        const syncResult = await syncSaveUserTransaction(userId, targetTx);
        if (syncResult.error) {
          console.error('[saveUserTransaction] Supabase sync failure:', syncResult.error);
          return { success: false, error: syncResult.error, transaction: targetTx };
        }

        if (syncResult.data) {
          targetTx = syncResult.data;
        }
      } catch (err: any) {
        console.error('[saveUserTransaction] Exception syncing with Supabase:', err);
        return { success: false, error: err?.message || 'Failed to sync with Supabase', transaction: targetTx };
      }
    }
  }

  return { success: true, transaction: targetTx };
}

export async function deleteUserTransaction(
  userId: string,
  txId: string
): Promise<{ success: boolean; deletedItem?: Transaction; error?: string }> {
  const effectiveUserId = (userId && userId.trim()) ? userId.trim() : 'demo-user';
  const key = `${STORAGE_KEY_PREFIX}${effectiveUserId}`;

  const currentList = await fetchUserTransactions(effectiveUserId);
  const target = currentList.find((t) => t.id === txId);
  const updatedList = currentList.filter((t) => t.id !== txId);

  localStorage.setItem(key, JSON.stringify(updatedList));

  const { isConfigured } = getStoredSupabaseConfig();
  if (isConfigured) {
    try {
      const res = await syncDeleteUserTransaction(userId, txId);
      if (res.error) {
        console.error('[deleteUserTransaction] Supabase delete error:', res.error);
        return { success: false, error: res.error, deletedItem: target };
      }
    } catch (err: any) {
      console.error('[deleteUserTransaction] Exception during Supabase delete:', err);
      return { success: false, error: err?.message, deletedItem: target };
    }
  }

  return { success: true, deletedItem: target };
}

export function subscribeToUserTransactions(
  userId: string,
  onDataChange: () => void
): () => void {
  const { isConfigured } = getStoredSupabaseConfig();
  if (!isConfigured) return () => {};

  const supabase = getSupabase();
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel('public:user_transactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_transactions' },
        () => onDataChange()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_transactions' },
        () => onDataChange()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'user_transactions' },
        () => onDataChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_transactions' },
        () => onDataChange()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Subscribed to public:user_transactions channel');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Error setting up user_transactions realtime channel:', err);
    return () => {};
  }
}

export function calculateAccountingSummary(transactions: Transaction[]): AccountingSummary {
  const today = new Date().toISOString().split('T')[0];
  const currentYearMonth = today.slice(0, 7); // e.g. "2026-08"

  let totalReceipts = 0;
  let totalPayments = 0;
  let todayReceipts = 0;
  let todayPayments = 0;
  let thisMonthReceipts = 0;
  let thisMonthPayments = 0;

  // Account balances (Starting from 0, tracking net flow)
  let cashBalance = 0;
  let bankBalance = 0;
  let digitalWalletBalance = 0;

  transactions.forEach((tx) => {
    const isToday = tx.date === today;
    const isThisMonth = tx.date.startsWith(currentYearMonth);

    if (tx.type === 'receipt') {
      totalReceipts += tx.amount;
      if (isToday) todayReceipts += tx.amount;
      if (isThisMonth) thisMonthReceipts += tx.amount;

      // Track by payment method
      if (tx.paymentMethod === 'Cash') {
        cashBalance += tx.amount;
      } else if (tx.paymentMethod === 'Bank Transfer' || tx.paymentMethod === 'Cheque') {
        bankBalance += tx.amount;
      } else {
        digitalWalletBalance += tx.amount;
      }
    } else if (tx.type === 'payment') {
      totalPayments += tx.amount;
      if (isToday) todayPayments += tx.amount;
      if (isThisMonth) thisMonthPayments += tx.amount;

      if (tx.paymentMethod === 'Cash') {
        cashBalance -= tx.amount;
      } else if (tx.paymentMethod === 'Bank Transfer' || tx.paymentMethod === 'Cheque') {
        bankBalance -= tx.amount;
      } else {
        digitalWalletBalance -= tx.amount;
      }
    } else if (tx.type === 'transfer') {
      // Contra transfer between accounts
      // Deduct from source
      if (tx.paymentMethod === 'Cash') {
        cashBalance -= tx.amount;
      } else if (tx.paymentMethod === 'Bank Transfer' || tx.paymentMethod === 'Cheque') {
        bankBalance -= tx.amount;
      } else {
        digitalWalletBalance -= tx.amount;
      }

      // Add to destination
      const dest = tx.transferToMethod || 'Bank Transfer';
      if (dest === 'Cash') {
        cashBalance += tx.amount;
      } else if (dest === 'Bank Transfer' || dest === 'Cheque') {
        bankBalance += tx.amount;
      } else {
        digitalWalletBalance += tx.amount;
      }
    }
  });

  return {
    totalReceipts,
    totalPayments,
    netBalance: totalReceipts - totalPayments,
    todayReceipts,
    todayPayments,
    thisMonthReceipts,
    thisMonthPayments,
    cashBalance,
    bankBalance,
    digitalWalletBalance,
    transactionCount: transactions.length,
  };
}

export function formatCurrencyNPR(amount: number): string {
  const isNeg = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(absAmount);
  return `${isNeg ? '-' : ''}Rs. ${formatted}`;
}
