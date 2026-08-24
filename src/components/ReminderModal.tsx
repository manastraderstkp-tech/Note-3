import React, { useState, useEffect } from 'react';
import { X, Bell, DollarSign, Calendar, Tag, CreditCard, RefreshCw } from 'lucide-react';
import { TransactionReminder, ReminderFrequency } from '../types';
import { generateUUID } from '../lib/supabase';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminder: TransactionReminder) => Promise<void>;
  initialReminder?: TransactionReminder | null;
  userId: string;
}

const CATEGORIES = ['Rent', 'Utilities', 'Subscription', 'Insurance', 'Loan', 'Internet / Phone', 'Salary', 'Maintenance', 'Other'];
const PAYMENT_METHODS = ['Cash', 'eSewa', 'Khalti', 'connectIPS', 'Bank Transfer', 'Debit / Credit Card', 'Mobile Banking', 'Auto-Debit', 'Other'];

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialReminder,
  userId,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<ReminderFrequency>('MONTHLY');
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [remindDaysBefore, setRemindDaysBefore] = useState('3');
  const [category, setCategory] = useState('Rent');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialReminder) {
      setTitle(initialReminder.title);
      setAmount(initialReminder.amount.toString());
      setFrequency(initialReminder.frequency);
      setNextDueDate(initialReminder.nextDueDate);
      setRemindDaysBefore(String(initialReminder.remindDaysBefore ?? 3));
      setCategory(initialReminder.category || 'Rent');
      setPaymentMethod(initialReminder.paymentMethod || 'Bank Transfer');
      setIsActive(initialReminder.isActive ?? true);
    } else {
      setTitle('');
      setAmount('');
      setFrequency('MONTHLY');
      setNextDueDate(new Date().toISOString().split('T')[0]);
      setRemindDaysBefore('3');
      setCategory('Rent');
      setPaymentMethod('Bank Transfer');
      setIsActive(true);
    }
    setErrorMsg(null);
  }, [initialReminder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a reminder title');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const reminder: TransactionReminder = {
      id: initialReminder ? initialReminder.id : generateUUID(),
      userId: userId || 'demo-user',
      title: title.trim(),
      amount: numAmount,
      frequency,
      nextDueDate,
      remindDaysBefore: parseInt(remindDaysBefore, 10) || 3,
      category,
      paymentMethod,
      isActive,
      createdAt: initialReminder?.createdAt || new Date().toISOString(),
    };

    const res = await onSave(reminder);
    setIsSubmitting(false);
    if (!res || (res as any).error) {
      setErrorMsg((res as any)?.error || 'Failed to save reminder');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {initialReminder ? 'Edit Recurring Reminder' : 'New Recurring Reminder / Subscription'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900">
              {errorMsg}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Reminder / Subscription Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Office Rent, Internet Bill, Netflix"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
          </div>

          {/* Amount & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Amount (Rs.) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-medium">
                  Rs.
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          </div>

          {/* Next Due Date & Remind Days Before */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Next Due Date *
              </label>
              <input
                type="date"
                required
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Remind Days Before
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={remindDaysBefore}
                onChange={(e) => setRemindDaysBefore(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active status */}
          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="isActiveCheck" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Active Reminder (Notify when due)
            </label>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{initialReminder ? 'Update Reminder' : 'Save Reminder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
