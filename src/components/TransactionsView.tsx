import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Search,
  Calendar,
  Download,
  Printer,
  Trash2,
  Edit3,
  Receipt,
  Wallet,
  Building,
  Smartphone,
  ChevronDown,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod, AccountingSummary } from '../types';
import {
  fetchUserTransactions,
  saveUserTransaction,
  deleteUserTransaction,
  clearAllUserTransactions,
  calculateAccountingSummary,
  formatCurrencyNPR,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS
} from '../lib/transactionDb';
import { TransactionModal } from './TransactionModal';
import { TransactionVoucherModal } from './TransactionVoucherModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface TransactionsViewProps {
  userId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  searchQuery?: string;
}

type TabType = 'all' | 'payments' | 'receipts' | 'transfers' | 'daybook';
type DateFilterType = 'all' | 'today' | 'yesterday' | 'month';

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  userId,
  onShowToast,
  searchQuery = '',
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('payment');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [voucherTx, setVoucherTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // Load Transactions
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchUserTransactions(userId);
      setTransactions(data);
    } catch (e) {
      console.error('Error loading transactions:', e);
      onShowToast('Failed to load transaction records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Sync external search query from header
  useEffect(() => {
    if (searchQuery) {
      setLocalSearch(searchQuery);
    }
  }, [searchQuery]);

  // Compute Accounting Summary
  const summary: AccountingSummary = useMemo(() => {
    return calculateAccountingSummary(transactions);
  }, [transactions]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const thisMonthPrefix = todayStr.slice(0, 7);

    return transactions.filter((tx) => {
      // Tab filter
      if (activeTab === 'payments' && tx.type !== 'payment') return false;
      if (activeTab === 'receipts' && tx.type !== 'receipt') return false;
      if (activeTab === 'transfers' && tx.type !== 'transfer') return false;

      // Date filter
      if (dateFilter === 'today' && tx.date !== todayStr) return false;
      if (dateFilter === 'yesterday' && tx.date !== yesterday) return false;
      if (dateFilter === 'month' && !tx.date.startsWith(thisMonthPrefix)) return false;

      // Search filter
      const query = localSearch.toLowerCase().trim();
      if (query) {
        const matchTitle = (tx.description || '').toLowerCase().includes(query);
        const matchParty = (tx.partyName || '').toLowerCase().includes(query);
        const matchVoucher = (tx.voucherNo || '').toLowerCase().includes(query);
        const matchCat = (tx.category || '').toLowerCase().includes(query);
        const matchAmount = String(tx.amount).includes(query);
        if (!matchTitle && !matchParty && !matchVoucher && !matchCat && !matchAmount) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      return b.date !== a.date ? b.date.localeCompare(a.date) : (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [transactions, activeTab, dateFilter, localSearch]);

  // Daybook Grouping
  const daybookGroups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    filteredTransactions.forEach((tx) => {
      const list = map.get(tx.date) || [];
      list.push(tx);
      map.set(tx.date, list);
    });

    const groups: { date: string; items: Transaction[]; totalReceipt: number; totalPayment: number; net: number }[] = [];
    map.forEach((items, date) => {
      let r = 0;
      let p = 0;
      items.forEach((item) => {
        if (item.type === 'receipt') r += item.amount;
        if (item.type === 'payment') p += item.amount;
      });
      groups.push({
        date,
        items,
        totalReceipt: r,
        totalPayment: p,
        net: r - p,
      });
    });

    return groups.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTransactions]);

  // Handlers
  const handleOpenAddModal = (defaultTxType: TransactionType = 'payment') => {
    setEditingTransaction(null);
    setModalDefaultType(defaultTxType);
    setIsModalOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setModalDefaultType(tx.type);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (
    txData: Omit<Transaction, 'id' | 'createdAt' | 'userId'>,
    id?: string
  ) => {
    const res = await saveUserTransaction(userId, txData, id);
    if (res.success) {
      onShowToast(id ? 'Transaction updated successfully.' : 'Transaction recorded successfully.', 'success');
      loadData();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTx) return;
    const res = await deleteUserTransaction(userId, deletingTx.id);
    if (res.success) {
      onShowToast('Transaction deleted.', 'info');
      setDeletingTx(null);
      loadData();
    } else {
      onShowToast('Failed to delete transaction.', 'error');
    }
  };

  const handleClearAllConfirm = async () => {
    const res = await clearAllUserTransactions(userId);
    if (res.success) {
      onShowToast('All transactions deleted. Balance reset to Rs. 0', 'info');
      setIsClearAllModalOpen(false);
      loadData();
    } else {
      onShowToast('Failed to clear transactions.', 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      onShowToast('No transactions to export.', 'info');
      return;
    }

    const headers = ['Voucher No', 'Date', 'Type', 'Category', 'Description/Party', 'Payment Method', 'Amount (NPR)'];
    const rows = filteredTransactions.map((tx) => [
      `"${tx.voucherNo || ''}"`,
      `"${tx.date}"`,
      `"${tx.type.toUpperCase()}"`,
      `"${tx.category}"`,
      `"${tx.description || tx.partyName || ''}"`,
      `"${tx.paymentMethod}"`,
      tx.amount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('CSV exported successfully.', 'success');
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <Receipt className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              My Transactions (मेरो हिसाब-किताब)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            दैनिक खर्च, आम्दानी र खाता ट्रान्सफर सरल व्यवस्थापन
          </p>
        </div>

        {/* 3 Main Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => handleOpenAddModal('payment')}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>+ Record Expense (खर्च)</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('receipt')}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95"
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            <span>+ Record Receipt (आम्दानी)</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('transfer')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-500" />
            <span>Transfer (सार्नुहोस्)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">CSV</span>
          </button>

          {transactions.length > 0 && (
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 transition dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
              title="Delete all transactions & reset balance to 0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Concise KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Net Balance */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Net Balance (खुद बचत)
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3
              className={`text-2xl font-black tracking-tight ${
                summary.netBalance >= 0
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrencyNPR(summary.netBalance)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              कुल {summary.transactionCount} कारोबार रेकर्ड
            </p>
          </div>
        </div>

        {/* Total Income / Receipts */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Receipts (कुल आम्दानी)
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <ArrowDownLeft className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrencyNPR(summary.totalReceipts)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              यस महिना: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrencyNPR(summary.thisMonthReceipts)}</span>
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Expenses (कुल खर्च)
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
              {formatCurrencyNPR(summary.totalPayments)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              यस महिना: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrencyNPR(summary.thisMonthPayments)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Account Balances Inline Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 px-4 text-xs dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
          <Wallet className="h-3.5 w-3.5 text-slate-400" />
          <span>खाता मौज्दात:</span>
        </div>

        <div className="flex items-center flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">नगद (Cash):</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatCurrencyNPR(summary.cashBalance)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">बैंक (Bank):</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatCurrencyNPR(summary.bankBalance)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">डिजिटल (eSewa/Khalti):</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatCurrencyNPR(summary.digitalWalletBalance)}</span>
          </div>
        </div>
      </div>

      {/* Main Ledger Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        
        {/* Navigation Tabs & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              सबै (All) ({transactions.length})
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              खर्च (Expenses)
            </button>

            <button
              onClick={() => setActiveTab('receipts')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'receipts'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              आम्दानी (Income)
            </button>

            <button
              onClick={() => setActiveTab('transfers')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'transfers'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              ट्रान्सफर (Transfer)
            </button>

            <button
              onClick={() => setActiveTab('daybook')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'daybook'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              दैनिक हिसाब (Daybook)
            </button>
          </div>

          {/* Quick Search & Date Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="खोज्नुहोस्..."
                className="w-36 sm:w-44 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs font-medium outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2 text-xs font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">सबै मिति</option>
              <option value="today">आज (Today)</option>
              <option value="yesterday">हिजो (Yesterday)</option>
              <option value="month">यस महिना (This Month)</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium">
            लोड हुँदैछ...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Receipt className="h-6 w-6" />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              कुनै कारोबार भेटिएन
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              नयाँ खर्च वा आम्दानी दर्ता गर्न माथिका बटनहरू प्रयोग गर्नुहोस्
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => handleOpenAddModal('payment')}
                className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs"
              >
                + Record Expense
              </button>
              <button
                onClick={() => handleOpenAddModal('receipt')}
                className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs"
              >
                + Record Receipt
              </button>
            </div>
          </div>
        ) : activeTab === 'daybook' ? (
          /* Daybook Grouped View */
          <div className="divide-y divide-slate-100 dark:divide-y dark:divide-slate-800">
            {daybookGroups.map((group) => (
              <div key={group.date} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between bg-slate-50/80 px-3 py-1.5 rounded-xl dark:bg-slate-800/60">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    📅 {group.date}
                  </span>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{formatCurrencyNPR(group.totalReceipt)}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">
                      -{formatCurrencyNPR(group.totalPayment)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] ${
                      group.net >= 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      Net: {formatCurrencyNPR(group.net)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pl-2">
                  {group.items.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50/60 rounded-lg transition dark:hover:bg-slate-800/40 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                            tx.type === 'receipt'
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                              : tx.type === 'payment'
                              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                              : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                          }`}
                        >
                          {tx.type === 'receipt' ? (
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                          ) : tx.type === 'payment' ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {tx.description || tx.partyName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {tx.category} • {tx.paymentMethod}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`font-black ${
                            tx.type === 'receipt'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : tx.type === 'payment'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {tx.type === 'receipt' ? '+' : tx.type === 'payment' ? '-' : ''}
                          {formatCurrencyNPR(tx.amount)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setVoucherTx(tx)}
                            title="View Voucher"
                            className="p-1 text-slate-400 hover:text-indigo-600 transition"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(tx)}
                            title="Edit"
                            className="p-1 text-slate-400 hover:text-indigo-600 transition"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingTx(tx)}
                            title="Delete"
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Standard List View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">मिति (Date)</th>
                  <th className="py-3 px-4">विवरण (Description)</th>
                  <th className="py-3 px-4">शीर्षक (Category)</th>
                  <th className="py-3 px-4">माध्यम (Mode)</th>
                  <th className="py-3 px-4 text-right">रकम (Amount)</th>
                  <th className="py-3 px-4 text-right">कार्य (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                  >
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                      {tx.date}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                            tx.type === 'receipt'
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                              : tx.type === 'payment'
                              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                              : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                          }`}
                        >
                          {tx.type === 'receipt' ? (
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                          ) : tx.type === 'payment' ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {tx.description || tx.partyName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {tx.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {tx.type === 'transfer' && tx.transferToMethod
                        ? `${tx.paymentMethod} ➔ ${tx.transferToMethod}`
                        : tx.paymentMethod}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right font-black">
                      <span
                        className={
                          tx.type === 'receipt'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'payment'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-indigo-600 dark:text-indigo-400'
                        }
                      >
                        {tx.type === 'receipt' ? '+' : tx.type === 'payment' ? '-' : ''}
                        {formatCurrencyNPR(tx.amount)}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setVoucherTx(tx)}
                          title="View Official Voucher"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(tx)}
                          title="Edit"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingTx(tx)}
                          title="Delete"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entry Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        initialTransaction={editingTransaction}
        defaultType={modalDefaultType}
      />

      {/* Official Voucher Preview Modal */}
      <TransactionVoucherModal
        isOpen={!!voucherTx}
        onClose={() => setVoucherTx(null)}
        transaction={voucherTx}
      />

      {/* Delete Single Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingTx}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction?"
        message={`Are you sure you want to delete "${deletingTx?.description || deletingTx?.partyName || 'this record'}" of ${deletingTx ? formatCurrencyNPR(deletingTx.amount) : ''}?`}
      />

      {/* Clear All Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirm={handleClearAllConfirm}
        title="Delete All Transactions?"
        message="Are you sure you want to delete all transaction records and reset your balance to Rs. 0? This action cannot be undone."
      />
    </div>
  );
};
