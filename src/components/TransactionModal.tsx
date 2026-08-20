import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  Clock,
  DollarSign,
  Paperclip,
  Tag,
  FileText,
  User,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Receipt,
  Percent,
  Sparkles,
  ChevronDown,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, formatCurrencyNPR } from '../lib/transactionDb';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    tx: Omit<Transaction, 'id' | 'createdAt' | 'userId'>,
    id?: string
  ) => Promise<{ success: boolean; error?: string }>;
  initialTransaction?: Transaction | null;
  defaultType?: TransactionType;
}

const QUICK_EXPENSE_PRESETS = [
  { label: '☕ Office Tea & Snacks (चिया/खाजा)', category: 'Food, Tea & Snacks (चिया/खाजा)', amount: 150 },
  { label: '⛽ Bike/Car Petrol (इन्धन)', category: 'Travel & Fuel (यातायात/इन्धन)', amount: 500 },
  { label: '📄 Stationery & Printing (कागज/प्रिन्ट)', category: 'Office Supplies & Stationery (कार्यालय सामग्री)', amount: 350 },
  { label: '🌐 Internet Recharge (इन्टरनेट)', category: 'Electricity, Water & Internet (विद्युत/इन्टरनेट)', amount: 1200 },
  { label: '📱 Mobile Recharge (रिचार्ज कार्ड)', category: 'Mobile Recharge & Communication (मोबाइल/फोन)', amount: 200 },
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTransaction,
  defaultType = 'payment',
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [voucherNo, setVoucherNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [transferToMethod, setTransferToMethod] = useState<PaymentMethod>('Bank Transfer');
  const [partyName, setPartyName] = useState('');
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [hasTaxVat, setHasTaxVat] = useState(false);
  const [taxAmount, setTaxAmount] = useState<string>('');
  const [panVatNumber, setPanVatNumber] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTransaction) {
        setType(initialTransaction.type);
        setVoucherNo(initialTransaction.voucherNo || '');
        setDate(initialTransaction.date || new Date().toISOString().split('T')[0]);
        setTime(initialTransaction.time || '10:00');
        setAmount(String(initialTransaction.amount || ''));
        setCategory(initialTransaction.category || '');
        setPaymentMethod(initialTransaction.paymentMethod || 'Cash');
        setTransferToMethod(initialTransaction.transferToMethod || 'Bank Transfer');
        setPartyName(initialTransaction.partyName || '');
        setDescription(initialTransaction.description || '');
        setReceiptUrl(initialTransaction.receiptUrl || '');
        setHasTaxVat(!!initialTransaction.hasTaxVat);
        setTaxAmount(initialTransaction.taxAmount ? String(initialTransaction.taxAmount) : '');
        setPanVatNumber(initialTransaction.panVatNumber || '');
        setTags(initialTransaction.tags || []);
        setErrorMessage(null);
      } else {
        setType(defaultType);
        const prefix = defaultType === 'receipt' ? 'RCP' : defaultType === 'payment' ? 'PYM' : 'TRF';
        setVoucherNo(`${prefix}-${Math.floor(100 + Math.random() * 900)}`);
        setDate(new Date().toISOString().split('T')[0]);
        const now = new Date();
        setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        setAmount('');
        if (defaultType === 'payment') {
          setCategory(EXPENSE_CATEGORIES[0].name);
        } else if (defaultType === 'receipt') {
          setCategory(INCOME_CATEGORIES[0].name);
        } else {
          setCategory('Contra / Transfer');
        }
        setPaymentMethod('Cash');
        setTransferToMethod('Bank Transfer');
        setPartyName('');
        setDescription('');
        setReceiptUrl('');
        setHasTaxVat(false);
        setTaxAmount('');
        setPanVatNumber('');
        setTags([]);
        setErrorMessage(null);
      }
    }
  }, [isOpen, initialTransaction, defaultType]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const prefix = newType === 'receipt' ? 'RCP' : newType === 'payment' ? 'PYM' : 'TRF';
    setVoucherNo(`${prefix}-${Math.floor(100 + Math.random() * 900)}`);
    if (newType === 'payment') {
      setCategory(EXPENSE_CATEGORIES[0].name);
    } else if (newType === 'receipt') {
      setCategory(INCOME_CATEGORIES[0].name);
    } else {
      setCategory('Contra / Transfer');
    }
  };

  const handleApplyPreset = (preset: typeof QUICK_EXPENSE_PRESETS[0]) => {
    setType('payment');
    setCategory(preset.category);
    setAmount(String(preset.amount));
    setDescription(preset.label.split(') ')[1] || preset.label);
  };

  const handleAddQuickAmount = (delta: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + delta));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Receipt attachment must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const clean = newTagInput.trim().replace(/^#/, '');
      if (!tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0.');
      return;
    }

    if (!category.trim() && type !== 'transfer') {
      setErrorMessage('Please select or specify a category / account head.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload: Omit<Transaction, 'id' | 'createdAt' | 'userId'> = {
        voucherNo: voucherNo.trim() || `${type.toUpperCase()}-${Date.now().toString().slice(-4)}`,
        type,
        date,
        time,
        amount: numAmount,
        category: type === 'transfer' ? 'Contra / Transfer' : category.trim(),
        paymentMethod,
        transferToMethod: type === 'transfer' ? transferToMethod : undefined,
        partyName: partyName.trim() || undefined,
        description: description.trim() || `${type === 'payment' ? 'Payment for' : 'Receipt from'} ${category}`,
        receiptUrl: receiptUrl || undefined,
        hasTaxVat,
        taxAmount: hasTaxVat && taxAmount ? parseFloat(taxAmount) : undefined,
        panVatNumber: panVatNumber.trim() || undefined,
        tags,
      };

      const res = await onSave(payload, initialTransaction ? initialTransaction.id : undefined);
      if (res && !res.success) {
        setErrorMessage(res.error || 'Failed to save transaction.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error occurred while saving transaction.');
      setIsSubmitting(false);
    }
  };

  const categories = type === 'receipt' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                type === 'receipt'
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : type === 'payment'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
              }`}
            >
              {type === 'receipt' ? (
                <ArrowDownLeft className="h-5 w-5" />
              ) : type === 'payment' ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowLeftRight className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialTransaction ? 'Edit Transaction (कारोबार सम्पादन)' : 'Record Transaction (नयाँ कारोबार दर्ता)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {type === 'receipt'
                  ? 'Record incoming payment, client deposit or sales receipt'
                  : type === 'payment'
                  ? 'Record daily expense, bill payment or purchase'
                  : 'Record transfer between cash and bank accounts'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Transaction Type Segmented Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Transaction Type (कारोबार प्रकार)
            </label>
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/70">
              <button
                type="button"
                onClick={() => handleTypeChange('payment')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                  type === 'payment'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>Payment / Expense (खर्च)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('receipt')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                  type === 'receipt'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span>Receipt / Income (आम्दानी)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('transfer')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                  type === 'transfer'
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span>Transfer / Contra (सार्नुहोस्)</span>
              </button>
            </div>
          </div>

          {/* Quick Expense Presets (Only when type is payment) */}
          {type === 'payment' && !initialTransaction && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                ⚡ Quick Daily Presets (द्रुत दैनिक खर्च)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_EXPENSE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 transition dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-amber-950/30"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount & Voucher No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Amount (रकम रू.) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  Rs.
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-base font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:focus:border-indigo-400"
                />
              </div>

              {/* Quick Amount Step Buttons */}
              <div className="mt-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAddQuickAmount(100)}
                  className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  +100
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickAmount(500)}
                  className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  +500
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickAmount(1000)}
                  className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  +1,000
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickAmount(5000)}
                  className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  +5,000
                </button>
                {amount && parseFloat(amount) > 0 && (
                  <span className="ml-auto text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatCurrencyNPR(parseFloat(amount))}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Voucher / Bill No. (रसिद/भौचर नं)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Receipt className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={voucherNo}
                  onChange={(e) => setVoucherNo(e.target.value)}
                  placeholder="e.g. PYM-101 or Bill #452"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Transaction Date (मिति) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Time (समय)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Clock className="h-4 w-4" />
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Category & Payment Method */}
          {type !== 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category / Head (शीर्षक/खाता) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Payment Mode (भुक्तानी माध्यम) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  From Account (कुन खाताबाट) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  To Destination Account (कुन खातामा) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={transferToMethod}
                  onChange={(e) => setTransferToMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Party Name / Customer / Vendor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Party / Payee / Customer Name (सम्बन्धित व्यक्ति वा फर्मको नाम)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g. Ramesh Stationery, ABC Client, Himalayan Tea House"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
              />
            </div>
          </div>

          {/* Description / Particulars */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Description / Particulars (विवरण तथा कैफियत)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Daily office refreshments, vehicle petrol, invoice payment..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
            />
          </div>

          {/* Tax / VAT / PAN Optional Settings */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-700/80 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Tax / VAT / PAN Details (कर तथा प्यान विवरण)
                </span>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={hasTaxVat}
                  onChange={(e) => setHasTaxVat(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-slate-300 peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all dark:bg-slate-700" />
              </label>
            </div>

            {hasTaxVat && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    VAT / Tax Amount (कर रकम)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    placeholder="e.g. 13% VAT amount"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    PAN / VAT Number
                  </label>
                  <input
                    type="text"
                    value={panVatNumber}
                    onChange={(e) => setPanVatNumber(e.target.value)}
                    placeholder="9-digit PAN Number"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Receipt / Bill Attachment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Bill / Receipt Image (रसिद वा बिलको फोटो)
              </label>
              {receiptUrl && (
                <button
                  type="button"
                  onClick={() => setReceiptUrl('')}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            {receiptUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-40 bg-slate-100 dark:bg-slate-800">
                <img src={receiptUrl} alt="Bill attachment" className="w-full h-40 object-contain" />
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,.pdf"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-3 text-xs font-semibold text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/30 transition dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
                >
                  <Upload className="h-4 w-4 text-indigo-500" />
                  <span>Upload Receipt / Bill Photo (फोटो अपलोड गर्नुहोस्)</span>
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tags (ट्यागहरू)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length === 0 ? "Type tag & press Enter (e.g. #office, #daily)" : "Add tag..."}
                className="flex-1 bg-transparent px-1 text-xs outline-none min-w-[120px] dark:text-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50 active:scale-95 ${
                type === 'receipt'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : type === 'payment'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>{initialTransaction ? 'Update Transaction' : 'Save Transaction (दर्ता गर्नुहोस्)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
