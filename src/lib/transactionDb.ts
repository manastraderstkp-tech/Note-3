import { Transaction, AccountingSummary, TransactionType, PaymentMethod } from '../types';
import { getSupabase, getStoredSupabaseConfig } from './supabase';

const STORAGE_KEY_PREFIX = 'ws_transactions_user_';

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
  const effectiveUserId = userId || 'demo-user';
  const key = `${STORAGE_KEY_PREFIX}${effectiveUserId}`;

  // Try fetching from localStorage first
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed: Transaction[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out deleted items and any old demo placeholder transactions
        const filtered = parsed.filter((t) => !t.isDeleted && !t.id.startsWith('tx-init-'));
        if (filtered.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
        }
        return filtered;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local transactions:', e);
  }

  // Check Supabase if configured
  const { isConfigured } = getStoredSupabaseConfig();
  if (isConfigured) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', effectiveUserId)
          .eq('is_deleted', false)
          .order('date', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: Transaction[] = data
            .filter((d: any) => !d.id.startsWith('tx-init-'))
            .map((d: any) => ({
              id: d.id,
              userId: d.user_id,
              voucherNo: d.voucher_no || `VCH-${d.id.slice(0, 4)}`,
              type: d.type,
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
          localStorage.setItem(key, JSON.stringify(mapped));
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase fetch transactions error, falling back to local:', err);
      }
    }
  }

  // Clean slate: 0 transactions, 0 balance
  const initial: Transaction[] = [];
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
}

export async function clearAllUserTransactions(userId: string): Promise<{ success: boolean }> {
  const effectiveUserId = userId || 'demo-user';
  const key = `${STORAGE_KEY_PREFIX}${effectiveUserId}`;

  localStorage.setItem(key, JSON.stringify([]));

  const { isConfigured } = getStoredSupabaseConfig();
  if (isConfigured) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('transactions')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('user_id', effectiveUserId);
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
  const effectiveUserId = userId || 'demo-user';
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
  if (isConfigured) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('transactions').upsert({
          id: targetTx.id,
          user_id: effectiveUserId,
          voucher_no: targetTx.voucherNo,
          type: targetTx.type,
          date: targetTx.date,
          time: targetTx.time,
          amount: targetTx.amount,
          category: targetTx.category,
          payment_method: targetTx.paymentMethod,
          transfer_to_method: targetTx.transferToMethod,
          party_name: targetTx.partyName,
          description: targetTx.description,
          receipt_url: targetTx.receiptUrl,
          pan_vat_number: targetTx.panVatNumber,
          has_tax_vat: targetTx.hasTaxVat,
          tax_amount: targetTx.taxAmount,
          tags: targetTx.tags,
          updated_at: targetTx.updatedAt,
        });
      } catch (err) {
        console.warn('Supabase sync transaction failed:', err);
      }
    }
  }

  return { success: true, transaction: targetTx };
}

export async function deleteUserTransaction(
  userId: string,
  txId: string
): Promise<{ success: boolean; deletedItem?: Transaction; error?: string }> {
  const effectiveUserId = userId || 'demo-user';
  const key = `${STORAGE_KEY_PREFIX}${effectiveUserId}`;

  const currentList = await fetchUserTransactions(effectiveUserId);
  const target = currentList.find((t) => t.id === txId);
  const updatedList = currentList.filter((t) => t.id !== txId);

  localStorage.setItem(key, JSON.stringify(updatedList));

  const { isConfigured } = getStoredSupabaseConfig();
  if (isConfigured) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('transactions')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('id', txId)
          .eq('user_id', effectiveUserId);
      } catch (err) {
        console.warn('Supabase delete transaction failed:', err);
      }
    }
  }

  return { success: true, deletedItem: target };
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
