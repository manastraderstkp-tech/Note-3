import { Transaction, AccountingSummary, TransactionType, PaymentMethod } from '../types';
import { getSupabase, getStoredSupabaseConfig, isValidUUID } from './supabase';

const STORAGE_KEY_PREFIX = 'ws_transactions_user_';

async function resolveSupabaseUserId(userId: string, supabase: any): Promise<{ primaryId: string; filterIds: string[] }> {
  const effectiveUserId = (userId && userId.trim()) ? userId.trim() : 'demo-user';
  const filterIdsSet = new Set<string>([effectiveUserId, 'demo-user']);

  if (supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        filterIdsSet.add(data.user.id);
        if (isValidUUID(effectiveUserId)) {
          return { primaryId: effectiveUserId, filterIds: Array.from(filterIdsSet) };
        }
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

  // Priority 1: Fetch from Supabase if configured so other browsers get updated records
  const { isConfigured } = getStoredSupabaseConfig();
  if (isConfigured) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { filterIds } = await resolveSupabaseUserId(userId, supabase);

        // Try user_transactions table first
        let utQuery = supabase.from('user_transactions').select('*');
        if (filterIds.length === 1) {
          utQuery = utQuery.eq('user_id', filterIds[0]);
        } else if (filterIds.length > 1) {
          utQuery = utQuery.in('user_id', filterIds);
        }

        const { data: utData, error: utError } = await utQuery;

        if (!utError && utData && utData.length > 0) {
          const mapped: Transaction[] = utData
            .filter((d: any) => !d.is_deleted && !d.id.startsWith('tx-init-'))
            .map((d: any) => {
              const rawType = (d.type || 'payment').toLowerCase();
              const type: TransactionType = rawType === 'receipt' ? 'receipt' : rawType === 'transfer' ? 'transfer' : 'payment';
              return {
                id: d.id,
                userId: d.user_id,
                voucherNo: d.voucher_no || `VCH-${String(d.id).slice(0, 4)}`,
                type,
                date: d.transaction_date || d.date || new Date().toISOString().split('T')[0],
                time: d.time || '12:00',
                amount: Number(d.amount || 0),
                category: d.category || 'General',
                paymentMethod: d.payment_method || 'Cash',
                transferToMethod: d.transfer_to_method,
                partyName: d.party_name || d.description,
                description: d.description || d.note || '',
                receiptUrl: d.receipt_url,
                panVatNumber: d.pan_vat_number,
                hasTaxVat: d.has_tax_vat,
                taxAmount: d.tax_amount ? Number(d.tax_amount) : undefined,
                tags: d.tags || [],
                createdAt: d.created_at,
                updatedAt: d.updated_at || d.created_at,
              };
            });

          try {
            localStorage.setItem(key, JSON.stringify(mapped));
          } catch (storageErr) {
            console.warn('Local storage write warning:', storageErr);
          }

          return mapped;
        }

        // Secondary query: transactions table
        let query = supabase.from('transactions').select('*');

        if (filterIds.length === 1) {
          query = query.eq('user_id', filterIds[0]);
        } else if (filterIds.length > 1) {
          query = query.in('user_id', filterIds);
        }

        query = query.order('date', { ascending: false });

        const { data, error } = await query;

        if (!error && data) {
          const mapped: Transaction[] = data
            .filter((d: any) => !d.is_deleted && !d.id.startsWith('tx-init-'))
            .map((d: any) => ({
              id: d.id,
              userId: d.user_id,
              voucherNo: d.voucher_no || `VCH-${String(d.id).slice(0, 4)}`,
              type: (d.type || 'payment').toLowerCase() as TransactionType,
              date: d.date,
              time: d.time,
              amount: Number(d.amount),
              category: d.category,
              paymentMethod: d.payment_method,
              transferToMethod: d.transfer_to_method,
              partyName: d.party_name,
              description: d.description || '',
              receiptUrl: d.receipt_url,
              panVatNumber: d.pan_vat_number,
              hasTaxVat: d.has_tax_vat,
              taxAmount: d.tax_amount ? Number(d.tax_amount) : undefined,
              tags: d.tags || [],
              createdAt: d.created_at,
              updatedAt: d.updated_at,
            }));
          
          // Cache in local storage for offline fallback
          try {
            localStorage.setItem(key, JSON.stringify(mapped));
          } catch (storageErr) {
            console.warn('Local storage write warning:', storageErr);
          }

          return mapped;
        } else if (error) {
          console.warn('Supabase select transactions error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase fetch transactions exception, falling back to local storage:', err);
      }
    }
  }

  // Priority 2: Fallback to localStorage if offline or Supabase fails
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed: Transaction[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((t) => !t.isDeleted && !t.id.startsWith('tx-init-'));
        return filtered;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local transactions:', e);
  }

  return [];
}

export async function clearAllUserTransactions(userId: string): Promise<{ success: boolean }> {
  const effectiveUserId = (userId && userId.trim()) ? userId.trim() : 'demo-user';
  const key = `${STORAGE_KEY_PREFIX}${effectiveUserId}`;

  localStorage.setItem(key, JSON.stringify([]));

  const { isConfigured } = getStoredSupabaseConfig();
  if (isConfigured) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { filterIds } = await resolveSupabaseUserId(userId, supabase);
        await supabase
          .from('transactions')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .in('user_id', filterIds);
      } catch (err) {
        console.warn('Supabase clear transactions error:', err);
      }
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

  let targetTx: Transaction;

  if (id) {
    // Updating existing
    const existingIndex = currentList.findIndex((t) => t.id === id);
    targetTx = {
      ...tx,
      id,
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
    // Creating new
    const newId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const prefix = tx.type === 'receipt' ? 'RCP' : tx.type === 'payment' ? 'PYM' : 'TRF';
    const autoVoucher = tx.voucherNo?.trim() || `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

    targetTx = {
      ...tx,
      id: newId,
      userId: effectiveUserId,
      voucherNo: autoVoucher,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(targetTx);
  }

  // Sort by date desc then createdAt desc
  currentList.sort((a, b) => {
    if (b.date !== a.date) {
      return b.date.localeCompare(a.date);
    }
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  localStorage.setItem(key, JSON.stringify(currentList));

  // Sync to Supabase if configured
  const { isConfigured } = getStoredSupabaseConfig();
  let syncErrorMsg: string | undefined = undefined;

  if (isConfigured) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { primaryId } = await resolveSupabaseUserId(userId, supabase);

        // Safely upload image if base64 to avoid POST payload overflow
        const finalReceiptUrl = await uploadReceiptToSupabaseStorage(
          targetTx.receiptUrl,
          primaryId,
          supabase
        );

        if (finalReceiptUrl) {
          targetTx.receiptUrl = finalReceiptUrl;
        }

        // Write to user_transactions table (primary user table requested)
        const utPayload = {
          id: targetTx.id,
          user_id: primaryId,
          type: targetTx.type.toUpperCase(), // 'RECEIPT', 'PAYMENT', 'TRANSFER'
          category: targetTx.category || 'General',
          amount: targetTx.amount,
          payment_method: targetTx.paymentMethod || 'Cash',
          description: targetTx.description || targetTx.partyName || '',
          transaction_date: targetTx.date,
          created_at: targetTx.createdAt,
        };

        const { error: utErr } = await supabase
          .from('user_transactions')
          .upsert(utPayload, { onConflict: 'id' });

        if (utErr) {
          console.warn('user_transactions upsert note:', utErr.message);
        }

        // Also write to transactions table for legacy compatibility
        const { error } = await supabase.from('transactions').upsert(
          {
            id: targetTx.id,
            user_id: primaryId,
            voucher_no: targetTx.voucherNo,
            type: targetTx.type,
            date: targetTx.date,
            time: targetTx.time || null,
            amount: targetTx.amount,
            category: targetTx.category,
            payment_method: targetTx.paymentMethod,
            transfer_to_method: targetTx.transferToMethod || null,
            party_name: targetTx.partyName || null,
            description: targetTx.description || '',
            receipt_url: targetTx.receiptUrl || null,
            pan_vat_number: targetTx.panVatNumber || null,
            has_tax_vat: targetTx.hasTaxVat || false,
            tax_amount: targetTx.taxAmount || null,
            tags: targetTx.tags || [],
            is_deleted: false,
            updated_at: targetTx.updatedAt,
            created_at: targetTx.createdAt,
          },
          { onConflict: 'id' }
        );

        if (error && utErr) {
          console.error('Supabase transaction upsert error:', error);
          syncErrorMsg = utErr.message || error.message;
        }
      } catch (err: any) {
        console.warn('Supabase sync transaction exception:', err);
        syncErrorMsg = err?.message || 'Failed to sync with Supabase';
      }
    }
  }

  return { success: true, transaction: targetTx, error: syncErrorMsg };
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
  let errorMsg: string | undefined;

  if (isConfigured) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('user_transactions')
          .delete()
          .eq('id', txId);

        const { error } = await supabase
          .from('transactions')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('id', txId);

        if (error) {
          console.error('Supabase delete transaction error:', error);
          errorMsg = error.message;
        }
      } catch (err: any) {
        console.warn('Supabase delete transaction failed:', err);
        errorMsg = err?.message;
      }
    }
  }

  return { success: true, deletedItem: target, error: errorMsg };
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
    const effectiveUserId = userId || 'demo-user';
    const channelName = `user_transactions_changes_${effectiveUserId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_transactions',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        () => onDataChange()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_transactions',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        () => onDataChange()
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_transactions',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        () => onDataChange()
      )
      // Fallback unfiltered listener for user_transactions in case user_id isn't matched
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_transactions' },
        () => onDataChange()
      )
      // Legacy transactions table fallback
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => onDataChange()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Supabase Realtime] Subscribed to channel ${channelName}`);
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
