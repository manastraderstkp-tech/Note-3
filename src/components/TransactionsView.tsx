import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  Calendar,
  Download,
  Printer,
  Trash2,
  Edit3,
  Copy,
  Receipt,
  FileText,
  DollarSign,
  PieChart,
  Wallet,
  Building,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  HelpCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod, AccountingSummary } from '../types';
import {
  fetchUserTransactions,
  saveUserTransaction,
  deleteUserTransaction,
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

type TabType = 'all' | 'receipts' | 'payments' | 'transfers' | 'daybook' | 'analytics';
type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

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
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('payment');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [voucherTx, setVoucherTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

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
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const thisMonthPrefix = todayStr.slice(0, 7);

    return transactions.filter((tx) => {
      // Tab filter
      if (activeTab === 'receipts' && tx.type !== 'receipt') return false;
      if (activeTab === 'payments' && tx.type !== 'payment') return false;
      if (activeTab === 'transfers' && tx.type !== 'transfer') return false;

      // Date filter
      if (dateFilter === 'today' && tx.date !== todayStr) return false;
      if (dateFilter === 'yesterday' && tx.date !== yesterday) return false;
      if (dateFilter === 'week' && tx.date < oneWeekAgo) return false;
      if (dateFilter === 'month' && !tx.date.startsWith(thisMonthPrefix)) return false;
      if (dateFilter === 'custom') {
        if (customStartDate && tx.date < customStartDate) return false;
        if (customEndDate && tx.date > customEndDate) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;

      // Payment method filter
      if (selectedPaymentMethod !== 'all' && tx.paymentMethod !== selectedPaymentMethod) return false;

      // Search filter
      const query = localSearch.toLowerCase().trim();
      if (query) {
        const matchTitle = tx.description.toLowerCase().includes(query);
        const matchParty = (tx.partyName || '').toLowerCase().includes(query);
        const matchVoucher = tx.voucherNo.toLowerCase().includes(query);
        const matchCat = tx.category.toLowerCase().includes(query);
        const matchTags = (tx.tags || []).some((t) => t.toLowerCase().includes(query));
        const matchAmount = String(tx.amount).includes(query);
        if (!matchTitle && !matchParty && !matchVoucher && !matchCat && !matchTags && !matchAmount) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') {
        return b.date !== a.date ? b.date.localeCompare(a.date) : (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (sortBy === 'date_asc') {
        return a.date !== b.date ? a.date.localeCompare(b.date) : (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      if (sortBy === 'amount_desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount_asc') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [
    transactions,
    activeTab,
    dateFilter,
    customStartDate,
    customEndDate,
    selectedCategory,
    selectedPaymentMethod,
    localSearch,
    sortBy,
  ]);

  // Daybook Grouping: Group filtered transactions by date for the Daybook tab
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

  // Expense Category Analytics Breakdown
  const categoryAnalytics = useMemo(() => {
    const expenseMap = new Map<string, number>();
    let totalExp = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'payment') {
        totalExp += tx.amount;
        const cur = expenseMap.get(tx.category) || 0;
        expenseMap.set(tx.category, cur + tx.amount);
      }
    });

    const list: { category: string; amount: number; percentage: number }[] = [];
    expenseMap.forEach((amt, cat) => {
      list.push({
        category: cat,
        amount: amt,
        percentage: totalExp > 0 ? (amt / totalExp) * 100 : 0,
      });
    });

    return {
      totalExp,
      categories: list.sort((a, b) => b.amount - a.amount),
    };
  }, [transactions]);

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

  const handleDuplicate = async (tx: Transaction) => {
    const copyPayload: Omit<Transaction, 'id' | 'createdAt' | 'userId'> = {
      voucherNo: `${tx.type.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      type: tx.type,
      date: new Date().toISOString().split('T')[0],
      time: tx.time,
      amount: tx.amount,
      category: tx.category,
      paymentMethod: tx.paymentMethod,
      transferToMethod: tx.transferToMethod,
      partyName: tx.partyName,
      description: `${tx.description} (Copy)`,
      hasTaxVat: tx.hasTaxVat,
      taxAmount: tx.taxAmount,
      panVatNumber: tx.panVatNumber,
      tags: tx.tags,
    };

    const res = await saveUserTransaction(userId, copyPayload);
    if (res.success) {
      onShowToast('Transaction duplicated successfully!', 'success');
      loadData();
    } else {
      onShowToast(res.error || 'Failed to duplicate transaction', 'error');
    }
  };

  const handleSave = async (
    payload: Omit<Transaction, 'id' | 'createdAt' | 'userId'>,
    id?: string
  ) => {
    const res = await saveUserTransaction(userId, payload, id);
    if (res.success) {
      onShowToast(id ? 'Transaction updated successfully!' : 'New transaction recorded!', 'success');
      loadData();
      return { success: true };
    } else {
      return { success: false, error: res.error };
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTx) return;
    const res = await deleteUserTransaction(userId, deletingTx.id);
    if (res.success) {
      onShowToast('Transaction deleted.', 'info');
      setDeletingTx(null);
      loadData();
    } else {
      onShowToast(res.error || 'Failed to delete transaction.', 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      onShowToast('No transactions to export.', 'info');
      return;
    }

    const headers = ['Voucher No', 'Type', 'Date', 'Time', 'Category', 'Amount (NPR)', 'Payment Method', 'Party Name', 'Description', 'PAN/VAT'];
    const rows = filteredTransactions.map((t) => [
      `"${t.voucherNo}"`,
      `"${t.type.toUpperCase()}"`,
      `"${t.date}"`,
      `"${t.time || ''}"`,
      `"${t.category}"`,
      t.amount,
      `"${t.paymentMethod}"`,
      `"${t.partyName || ''}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.panVatNumber || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Transactions_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Transactions exported to CSV successfully!', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header & Fast Action Launchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                My Transactions (मेरो हिसाब-किताब)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receipts, Payments, Daily Expenses & Accounting Daybook
              </p>
            </div>
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAddModal('payment')}
            className="flex items-center gap-1.5 rounded-2xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-rose-600/20 transition active:scale-95"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>+ Record Expense (खर्च)</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('receipt')}
            className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition active:scale-95"
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>+ Record Receipt (आम्दानी)</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('transfer')}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-500" />
            <span>Transfer (सार्नुहोस्)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Export CSV"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Accounting KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Balance */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Net Balance (खुद बचत/मौज्दात)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3
              className={`text-2xl font-black tracking-tight ${
                summary.netBalance >= 0
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrencyNPR(summary.netBalance)}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              Total {summary.transactionCount} transactions recorded
            </p>
          </div>
        </div>

        {/* Total Income / Receipts */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Receipts (कुल आम्दानी)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrencyNPR(summary.totalReceipts)}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              This Month: <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrencyNPR(summary.thisMonthReceipts)}</span>
            </p>
          </div>
        </div>

        {/* Total Expenses / Payments */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Expenses (कुल भुक्तानी/खर्च)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
              {formatCurrencyNPR(summary.totalPayments)}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              This Month: <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrencyNPR(summary.thisMonthPayments)}</span>
            </p>
          </div>
        </div>

        {/* Today's Daybook Snapshot */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Today's Daybook (आजको हिसाब)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ArrowDownLeft className="h-3.5 w-3.5" /> In:
              </span>
              <span className="text-slate-800 dark:text-slate-200">{formatCurrencyNPR(summary.todayReceipts)}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" /> Out:
              </span>
              <span className="text-slate-800 dark:text-slate-200">{formatCurrencyNPR(summary.todayPayments)}</span>
            </div>
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400">Today Net:</span>
              <span className={summary.todayReceipts - summary.todayPayments >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {formatCurrencyNPR(summary.todayReceipts - summary.todayPayments)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account / Wallet Balances Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-white">Cash in Hand (नगद)</p>
              <p className="text-[10px] text-slate-400">Petty cash drawer</p>
            </div>
          </div>
          <span className="text-sm font-black text-slate-900 dark:text-slate-100">
            {formatCurrencyNPR(summary.cashBalance)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-white">Bank Accounts (बैंक)</p>
              <p className="text-[10px] text-slate-400">Bank transfers & cheques</p>
            </div>
          </div>
          <span className="text-sm font-black text-slate-900 dark:text-slate-100">
            {formatCurrencyNPR(summary.bankBalance)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-white">Digital Wallets (डिजिटल)</p>
              <p className="text-[10px] text-slate-400">eSewa, Khalti, ConnectIPS</p>
            </div>
          </div>
          <span className="text-sm font-black text-slate-900 dark:text-slate-100">
            {formatCurrencyNPR(summary.digitalWalletBalance)}
          </span>
        </div>
      </div>

      {/* Main Container: Tabs, Search Filters & Views */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 pt-4 border-b border-slate-100 dark:border-slate-800/80 overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                activeTab === 'all'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All Transactions ({transactions.length})
            </button>

            <button
              onClick={() => setActiveTab('receipts')}
              className={`pb-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                activeTab === 'receipts'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Receipts / Income (आम्दानी)
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Payments / Expenses (खर्च)
            </button>

            <button
              onClick={() => setActiveTab('transfers')}
              className={`pb-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                activeTab === 'transfers'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Transfers (ट्रान्सफर)
            </button>

            <button
              onClick={() => setActiveTab('daybook')}
              className={`pb-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                activeTab === 'daybook'
                  ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Daily Daybook (दैनिक हिसाब डायरी)
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Expense Analysis (खर्च विश्लेषण)
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search description, party name, voucher no..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-medium outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Date Filter Segment */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition ${
                dateFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition ${
                dateFilter === 'today'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition ${
                dateFilter === 'yesterday'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition ${
                dateFilter === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              This Month
            </button>
          </div>

          {/* Payment Method Filter */}
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">All Payment Methods</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>

          {/* Sort Order */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-2xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="date_desc">Date: Newest First</option>
            <option value="date_asc">Date: Oldest First</option>
            <option value="amount_desc">Amount: Highest First</option>
            <option value="amount_asc">Amount: Lowest First</option>
          </select>
        </div>

        {/* Tab 1: Transactions Table / List View */}
        {(activeTab === 'all' || activeTab === 'receipts' || activeTab === 'payments' || activeTab === 'transfers') && (
          <div className="overflow-x-auto">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="h-12 w-12 text-slate-300 mx-auto dark:text-slate-600" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-3">
                  No transactions found
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No transactions match the selected filters or none have been recorded yet.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleOpenAddModal('payment')}
                    className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm"
                  >
                    + Record Expense
                  </button>
                  <button
                    onClick={() => handleOpenAddModal('receipt')}
                    className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm"
                  >
                    + Record Receipt
                  </button>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                    <th className="py-3 px-4 sm:px-6">Type & Voucher</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Particulars / Party</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4 text-right">Amount (NPR)</th>
                    <th className="py-3 px-4 text-center">Bill</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredTransactions.map((tx) => {
                    const isReceipt = tx.type === 'receipt';
                    const isPayment = tx.type === 'payment';
                    const isTransfer = tx.type === 'transfer';

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                      >
                        {/* Type & Voucher */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                isReceipt
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : isPayment
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                              }`}
                            >
                              {isReceipt ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : isPayment ? (
                                <ArrowUpRight className="h-4 w-4" />
                              ) : (
                                <ArrowLeftRight className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <span className="font-mono text-xs font-bold text-slate-800 dark:text-white">
                                {tx.voucherNo}
                              </span>
                              <span
                                className={`block text-[10px] font-semibold uppercase ${
                                  isReceipt ? 'text-emerald-600' : isPayment ? 'text-rose-600' : 'text-indigo-600'
                                }`}
                              >
                                {isReceipt ? 'Receipt' : isPayment ? 'Payment' : 'Transfer'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{tx.date}</p>
                          {tx.time && <p className="text-[11px] text-slate-400">{tx.time}</p>}
                        </td>

                        {/* Particulars & Party */}
                        <td className="py-3.5 px-4 max-w-[240px]">
                          <p className="font-bold text-slate-900 dark:text-white truncate" title={tx.description}>
                            {tx.description}
                          </p>
                          {tx.partyName && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              Party: <span className="font-semibold text-slate-700 dark:text-slate-300">{tx.partyName}</span>
                            </p>
                          )}
                          {tx.tags && tx.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tx.tags.map((t) => (
                                <span
                                  key={t}
                                  className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-block rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {tx.category}
                          </span>
                        </td>

                        {/* Payment Mode */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {tx.paymentMethod}
                          </span>
                          {tx.transferToMethod && (
                            <span className="text-[11px] text-indigo-500 block">➔ {tx.transferToMethod}</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`text-sm font-black ${
                              isReceipt
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isPayment
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            {isReceipt ? '+' : isPayment ? '-' : ''}
                            {formatCurrencyNPR(tx.amount)}
                          </span>
                          {tx.hasTaxVat && (
                            <span className="block text-[10px] text-slate-400">Incl. VAT</span>
                          )}
                        </td>

                        {/* Bill Attachment Preview */}
                        <td className="py-3.5 px-4 text-center">
                          {tx.receiptUrl ? (
                            <button
                              onClick={() => setPreviewImageUrl(tx.receiptUrl || null)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition dark:bg-indigo-950/60 dark:text-indigo-400"
                              title="View Attached Receipt"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setVoucherTx(tx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                              title="View / Print Voucher"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(tx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition dark:hover:bg-slate-800 dark:hover:text-amber-400"
                              title="Duplicate Record"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleEdit(tx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              title="Edit Record"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingTx(tx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition dark:hover:bg-slate-800 dark:hover:text-rose-400"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Daily Daybook View (दैनिक हिसाब-किताब) */}
        {activeTab === 'daybook' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Accounting Daybook (दैनिक हिसाब डायरी)
                </h3>
                <p className="text-xs text-slate-500">
                  Transactions grouped by date with day-wise income, expense and net balance calculations.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Printer className="h-4 w-4" />
                <span>Print Daybook</span>
              </button>
            </div>

            {daybookGroups.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                No daybook records found for this period.
              </div>
            ) : (
              <div className="space-y-6">
                {daybookGroups.map((group) => (
                  <div
                    key={group.date}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Day Header Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 px-5 py-3 border-b border-slate-200 dark:bg-slate-800/60 dark:border-slate-800 gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {new Date(group.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          ({group.date})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          • {group.items.length} records
                        </span>
                      </div>

                      {/* Day summary badges */}
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          In: +{formatCurrencyNPR(group.totalReceipt)}
                        </span>
                        <span className="text-rose-600 dark:text-rose-400">
                          Out: -{formatCurrencyNPR(group.totalPayment)}
                        </span>
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[11px] ${
                            group.net >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          Day Net: {formatCurrencyNPR(group.net)}
                        </span>
                      </div>
                    </div>

                    {/* Day Records List */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${
                                item.type === 'receipt'
                                  ? 'bg-emerald-500'
                                  : item.type === 'payment'
                                  ? 'bg-rose-500'
                                  : 'bg-indigo-500'
                              }`}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-slate-500">
                                  {item.voucherNo}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {item.description}
                                </span>
                                {item.partyName && (
                                  <span className="text-slate-400">({item.partyName})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span>{item.category}</span>
                                <span>•</span>
                                <span>{item.paymentMethod}</span>
                                {item.time && (
                                  <>
                                    <span>•</span>
                                    <span>{item.time}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-xs font-black ${
                                item.type === 'receipt'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : item.type === 'payment'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-indigo-600'
                              }`}
                            >
                              {item.type === 'receipt' ? '+' : item.type === 'payment' ? '-' : ''}
                              {formatCurrencyNPR(item.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Category Expense Analysis & Progress Breakdown */}
        {activeTab === 'analytics' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Expense Category Breakdown (खर्च विश्लेषण)
              </h3>
              <p className="text-xs text-slate-500">
                Visual analysis of total money spent across various expense heads and categories.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Breakdown Bars */}
              <div className="lg:col-span-2 space-y-4">
                {categoryAnalytics.categories.map((cat, idx) => (
                  <div
                    key={cat.category}
                    className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-bold text-[11px] dark:bg-rose-950 dark:text-rose-300">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white">
                          {cat.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-rose-600 dark:text-rose-400">
                          {formatCurrencyNPR(cat.amount)}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1.5">
                          ({cat.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Expense Summary Card */}
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-800/40 flex flex-col justify-between h-fit space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total Outflow (जम्मा खर्च रकम)
                  </span>
                  <h4 className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
                    {formatCurrencyNPR(categoryAnalytics.totalExp)}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Distributed across {categoryAnalytics.categories.length} expense heads
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Highest Category:</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {categoryAnalytics.categories[0]?.category.split(' (')[0] || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Highest Amount:</span>
                    <span className="font-bold text-rose-600">
                      {categoryAnalytics.categories[0]
                        ? formatCurrencyNPR(categoryAnalytics.categories[0].amount)
                        : 'Rs. 0'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAddModal('payment')}
                  className="w-full rounded-2xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 transition"
                >
                  + Record New Expense
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Entry/Edit Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSave}
        initialTransaction={editingTransaction}
        defaultType={modalDefaultType}
      />

      {/* Official Voucher Printable Modal */}
      <TransactionVoucherModal
        isOpen={!!voucherTx}
        onClose={() => setVoucherTx(null)}
        transaction={voucherTx}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingTx}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction Record?"
        message={`Are you sure you want to delete voucher "${deletingTx?.voucherNo}" (${deletingTx?.description})? This will update your accounting balances.`}
      />

      {/* Attached Image Preview Lightbox */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-white">Receipt / Bill Attachment</span>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950">
              <img
                src={previewImageUrl}
                alt="Receipt Preview"
                className="max-h-[70vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
