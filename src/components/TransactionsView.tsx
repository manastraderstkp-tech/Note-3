import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Download,
  Trash2,
  Edit3,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShieldCheck,
  CheckCircle,
  Bell,
  AlertTriangle,
  Clock,
  Check,
} from 'lucide-react';
import { UserTransaction, TransactionType, TransactionReminder } from '../types';

interface TransactionsViewProps {
  transactions: UserTransaction[];
  reminders: TransactionReminder[];
  onOpenModal: (type?: TransactionType, tx?: UserTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenReminderModal: (rem?: TransactionReminder | null) => void;
  onDeleteReminder: (id: string) => void;
  onMarkReminderAsPaid: (rem: TransactionReminder) => void;
  syncStatusText: string;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  reminders,
  onOpenModal,
  onDeleteTransaction,
  onOpenReminderModal,
  onDeleteReminder,
  onMarkReminderAsPaid,
  syncStatusText,
}) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'reminders'>('transactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEIPT' | 'PAYMENT' | 'TRANSFER'>('ALL');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_month'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Available categories for filter dropdown
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (selectedCategoryFilter !== 'ALL' && tx.category !== selectedCategoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = tx.description?.toLowerCase().includes(q) || false;
        const matchesCat = tx.category.toLowerCase().includes(q);
        const matchesPm = tx.paymentMethod?.toLowerCase().includes(q) || false;
        const matchesAmount = tx.amount.toString().includes(q);
        if (!matchesDesc && !matchesCat && !matchesPm && !matchesAmount) return false;
      }

      if (dateFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (tx.transactionDate !== todayStr) return false;
      } else if (dateFilter === 'this_month') {
        const now = new Date();
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!tx.transactionDate.startsWith(currentYearMonth)) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, selectedCategoryFilter, searchQuery, dateFilter]);

  // Summary calculations
  const { totalIncome, totalExpense, netBalance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach((tx) => {
      if (tx.type === 'RECEIPT') inc += tx.amount;
      else if (tx.type === 'PAYMENT') exp += tx.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netBalance: inc - exp,
    };
  }, [transactions]);

  // Reminders categorization
  const todayStr = new Date().toISOString().split('T')[0];
  const { overdueReminders, dueSoonReminders, upcomingReminders } = useMemo(() => {
    const overdue: TransactionReminder[] = [];
    const dueSoon: TransactionReminder[] = [];
    const upcoming: TransactionReminder[] = [];

    const todayDate = new Date(todayStr);

    reminders.forEach((r) => {
      if (!r.isActive) {
        upcoming.push(r);
        return;
      }
      const dueDate = new Date(r.nextDueDate);
      const diffDays = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      if (r.nextDueDate < todayStr) {
        overdue.push(r);
      } else if (diffDays <= (r.remindDaysBefore ?? 3)) {
        dueSoon.push(r);
      } else {
        upcoming.push(r);
      }
    });

    return {
      overdueReminders: overdue,
      dueSoonReminders: dueSoon,
      upcomingReminders: upcoming,
    };
  }, [reminders, todayStr]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = ['ID', 'Date', 'Type', 'Category', 'Amount (Rs.)', 'Payment Method', 'Description'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.transactionDate,
      tx.type,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      tx.amount,
      `"${(tx.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Accounting Ledger & Subscriptions
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">• {syncStatusText}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transactions & Recurring Reminders
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'transactions' ? (
            <>
              <button
                onClick={() => onOpenModal('RECEIPT')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition"
              >
                <ArrowDownLeft className="h-4 w-4" />
                Add Receipt
              </button>
              <button
                onClick={() => onOpenModal('PAYMENT')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-medium text-sm hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition"
              >
                <ArrowUpRight className="h-4 w-4" />
                Add Payment
              </button>
            </>
          ) : (
            <button
              onClick={() => onOpenReminderModal(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition"
            >
              <Bell className="h-4 w-4" />
              New Recurring Reminder
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'transactions'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Transactions Ledger ({transactions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-colors relative ${
            activeTab === 'reminders'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Recurring Reminders & Subscriptions</span>
          {(overdueReminders.length > 0 || dueSoonReminders.length > 0) && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
              {overdueReminders.length + dueSoonReminders.length}
            </span>
          )}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Total Income (Receipts)
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              Rs. {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Total Expenses (Payments)
            </p>
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              Rs. {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Net Balance
            </p>
            <h3 className={`text-2xl font-bold ${netBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
              Rs. {netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {activeTab === 'transactions' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions by category, note, amount..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="RECEIPT">Receipts Only</option>
                <option value="PAYMENT">Payments Only</option>
                <option value="TRANSFER">Transfers Only</option>
              </select>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="this_month">This Month</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                title="Export Filtered CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          {filteredTransactions.length === 0 ? (
            <div className="py-16 text-center">
              <Wallet className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No transactions found</h3>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or record your first receipt/payment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description / Party</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4 text-right">Amount (Rs.)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'RECEIPT';
                    const isExpense = tx.type === 'PAYMENT';
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isIncome
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : isExpense
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}
                          >
                            {isIncome ? <ArrowDownLeft className="h-3 w-3" /> : isExpense ? <ArrowUpRight className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {tx.transactionDate}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {tx.category}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {tx.description || <span className="text-slate-400 italic">No description</span>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold text-sm whitespace-nowrap ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {isIncome ? '+' : isExpense ? '-' : ''}Rs. {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onOpenModal(tx.type, tx)}
                              title="Edit Transaction"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this transaction?')) {
                                  onDeleteTransaction(tx.id);
                                }
                              }}
                              title="Delete Transaction"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Recurring Reminders Tab */
        <div className="space-y-6">
          {/* Group: Overdue */}
          {overdueReminders.length > 0 && (
            <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4 text-rose-700 dark:text-rose-300 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Overdue ({overdueReminders.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overdueReminders.map((rem) => (
                  <ReminderCard
                    key={rem.id}
                    reminder={rem}
                    statusColor="border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900"
                    onMarkPaid={() => onMarkReminderAsPaid(rem)}
                    onEdit={() => onOpenReminderModal(rem)}
                    onDelete={() => onDeleteReminder(rem.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Group: Due Soon */}
          {dueSoonReminders.length > 0 && (
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-300 font-semibold text-sm">
                <Clock className="w-4 h-4" />
                <span>Due Soon ({dueSoonReminders.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dueSoonReminders.map((rem) => (
                  <ReminderCard
                    key={rem.id}
                    reminder={rem}
                    statusColor="border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900"
                    onMarkPaid={() => onMarkReminderAsPaid(rem)}
                    onEdit={() => onOpenReminderModal(rem)}
                    onDelete={() => onDeleteReminder(rem.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Group: Upcoming / Active */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm">
                <Bell className="w-4 h-4 text-indigo-600" />
                <span>Upcoming & Subscriptions ({upcomingReminders.length})</span>
              </div>
            </div>

            {upcomingReminders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                No upcoming recurring reminders. Click 'New Recurring Reminder' above to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingReminders.map((rem) => (
                  <ReminderCard
                    key={rem.id}
                    reminder={rem}
                    statusColor="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    onMarkPaid={() => onMarkReminderAsPaid(rem)}
                    onEdit={() => onOpenReminderModal(rem)}
                    onDelete={() => onDeleteReminder(rem.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ReminderCardProps {
  reminder: TransactionReminder;
  statusColor: string;
  onMarkPaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  statusColor,
  onMarkPaid,
  onEdit,
  onDelete,
}) => {
  return (
    <div className={`p-4 rounded-xl border ${statusColor} shadow-xs flex flex-col justify-between transition hover:shadow-md`}>
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-bold text-slate-900 dark:text-white text-base">
            {reminder.title}
          </h4>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
            {reminder.frequency}
          </span>
        </div>

        <div className="text-xl font-extrabold text-slate-900 dark:text-white mb-3">
          Rs. {reminder.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mb-4">
          <div className="flex items-center justify-between">
            <span>Next Due Date:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{reminder.nextDueDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Category:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{reminder.category}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Payment Method:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{reminder.paymentMethod}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onMarkPaid}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Mark as Paid</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            title="Edit Reminder"
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this reminder?')) {
                onDelete();
              }
            }}
            title="Delete Reminder"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
