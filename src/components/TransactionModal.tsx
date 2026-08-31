import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Tag, CreditCard, FileText, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import { UserTransaction, TransactionType } from '../types';
import { generateUUID } from '../lib/supabase';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: UserTransaction) => Promise<void>;
  initialTransaction?: UserTransaction | null;
  defaultType?: TransactionType;
  userId: string;
}

const INCOME_CATEGORIES = ['Sales', 'Salary', 'Investment Returns', 'Freelance', 'Consulting', 'Refund', 'Other Income'];
const EXPENSE_CATEGORIES = ['Goods Purchase', 'Rent', 'Utilities', 'Grocery', 'Food & Snacks', 'Transport', 'Supplies', 'Marketing', 'Salary Paid', 'Software', 'Other Expense'];
const TRANSFER_CATEGORIES = ['Bank Transfer', 'ATM Withdrawal', 'Internal Transfer', 'Owner Draw', 'Other Transfer'];

const PAYMENT_METHODS = ['Cash', 'eSewa', 'Khalti', 'connectIPS', 'Bank Transfer', 'Debit / Credit Card', 'Mobile Banking', 'Other'];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTransaction,
  defaultType = 'RECEIPT',
  userId,
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Sales');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [description, setDescription] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toString());
      const catList = initialTransaction.type === 'RECEIPT' ? INCOME_CATEGORIES : initialTransaction.type === 'PAYMENT' ? EXPENSE_CATEGORIES : TRANSFER_CATEGORIES;
      if (catList.includes(initialTransaction.category)) {
        setCategory(initialTransaction.category);
        setCustomCategory('');
      } else {
        setCategory('__custom__');
        setCustomCategory(initialTransaction.category);
      }
      setPaymentMethod(initialTransaction.paymentMethod || 'Cash');
      setDescription(initialTransaction.description || '');
      setTransactionDate(initialTransaction.transactionDate || new Date().toISOString().split('T')[0]);
    } else {
      setType(defaultType);
      setAmount('');
      setCategory(defaultType === 'RECEIPT' ? 'Sales' : defaultType === 'PAYMENT' ? 'Rent' : 'Bank Transfer');
      setCustomCategory('');
      setPaymentMethod('Cash');
      setDescription('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
    }
    setErrorMsg(null);
  }, [isOpen, initialTransaction, defaultType]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'RECEIPT') {
      setCategory('Sales');
    } else if (newType === 'PAYMENT') {
      setCategory('Rent');
    } else {
      setCategory('Bank Transfer');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid positive amount.');
      return;
    }

    const finalCategory = category === '__custom__' ? (customCategory.trim() || 'General') : category;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const tx: UserTransaction = {
        id: initialTransaction ? initialTransaction.id : generateUUID(),
        userId: userId,
        type: type,
        category: finalCategory,
        amount: numericAmount,
        paymentMethod: paymentMethod,
        description: description.trim(),
        transactionDate: transactionDate,
        createdAt: initialTransaction?.createdAt || new Date().toISOString(),
      };

      await onSave(tx);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to save transaction');
    }
  };

  const currentCategories = type === 'RECEIPT' ? INCOME_CATEGORIES : type === 'PAYMENT' ? EXPENSE_CATEGORIES : TRANSFER_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              type === 'RECEIPT' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' :
              type === 'PAYMENT' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' :
              'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
            }`}>
              {type === 'RECEIPT' ? <ArrowDownLeft className="h-5 w-5" /> : type === 'PAYMENT' ? <ArrowUpRight className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialTransaction ? 'Edit Transaction' : 'New Transaction'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Record income, expense or account transfer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-600 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900">
              {errorMsg}
            </div>
          )}

          {/* Type Toggle Tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('RECEIPT')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  type === 'RECEIPT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownLeft className="h-3.5 w-3.5" />
                Income
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('PAYMENT')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  type === 'PAYMENT'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Expense
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('TRANSFER')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  type === 'TRANSFER'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Transfer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Amount (Rs.) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <DollarSign className="h-4 w-4" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Date *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <input
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Category *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Tag className="h-4 w-4" />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium appearance-none"
                >
                  {currentCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">+ Custom Category...</option>
                </select>
              </div>
              {category === '__custom__' && (
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category name"
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Payment Method *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium appearance-none"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Description / Party Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Description / Party Name (Optional)
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                <FileText className="h-4 w-4" />
              </div>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Client payment from ABC Corp or Monthly Store Rent"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {initialTransaction ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
