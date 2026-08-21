import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  Upload
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

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTransaction,
  defaultType = 'payment',
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [transferToMethod, setTransferToMethod] = useState<PaymentMethod>('Bank Transfer');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Optional extra details (collapsed by default)
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [voucherNo, setVoucherNo] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTransaction) {
        setType(initialTransaction.type);
        setAmount(String(initialTransaction.amount || ''));
        setCategory(initialTransaction.category || '');
        setPaymentMethod(initialTransaction.paymentMethod || 'Cash');
        setTransferToMethod(initialTransaction.transferToMethod || 'Bank Transfer');
        setDescription(initialTransaction.description || initialTransaction.partyName || '');
        setDate(initialTransaction.date || new Date().toISOString().split('T')[0]);
        setVoucherNo(initialTransaction.voucherNo || '');
        setReceiptUrl(initialTransaction.receiptUrl || '');
        setShowMoreDetails(!!initialTransaction.receiptUrl || !!initialTransaction.voucherNo);
        setErrorMessage(null);
      } else {
        setType(defaultType);
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
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        const prefix = defaultType === 'receipt' ? 'RCP' : defaultType === 'payment' ? 'EXP' : 'TRF';
        setVoucherNo(`${prefix}-${Math.floor(100 + Math.random() * 900)}`);
        setReceiptUrl('');
        setShowMoreDetails(false);
        setErrorMessage(null);
      }
    }
  }, [isOpen, initialTransaction, defaultType]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const prefix = newType === 'receipt' ? 'RCP' : newType === 'payment' ? 'EXP' : 'TRF';
    setVoucherNo(`${prefix}-${Math.floor(100 + Math.random() * 900)}`);
    if (newType === 'payment') {
      setCategory(EXPENSE_CATEGORIES[0].name);
    } else if (newType === 'receipt') {
      setCategory(INCOME_CATEGORIES[0].name);
    } else {
      setCategory('Contra / Transfer');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Receipt photo must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('कृपया मान्य रकम (Amount) प्रविष्ट गर्नुहोस्।');
      return;
    }

    if (!category.trim() && type !== 'transfer') {
      setErrorMessage('कृपया खर्च वा आम्दानीको शीर्षक छान्नुहोस्।');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const payload: Omit<Transaction, 'id' | 'createdAt' | 'userId'> = {
        voucherNo: voucherNo.trim() || `${type.toUpperCase()}-${Date.now().toString().slice(-4)}`,
        type,
        date,
        time: timeStr,
        amount: numAmount,
        category: type === 'transfer' ? 'Contra / Transfer' : category.trim(),
        paymentMethod,
        transferToMethod: type === 'transfer' ? transferToMethod : undefined,
        partyName: description.trim() || undefined,
        description: description.trim() || (type === 'payment' ? category : type === 'receipt' ? category : 'Account Transfer'),
        receiptUrl: receiptUrl || undefined,
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
      setErrorMessage(err?.message || 'Error occurred while saving.');
      setIsSubmitting(false);
    }
  };

  const categories = type === 'receipt' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
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
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {initialTransaction
                  ? 'Edit Transaction (कारोबार सम्पादन)'
                  : type === 'payment'
                  ? 'Record Expense (खर्च दर्ता)'
                  : type === 'receipt'
                  ? 'Record Receipt (आम्दानी दर्ता)'
                  : 'Account Transfer (खाता ट्रान्सफर)'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {type === 'payment'
                  ? 'दैनिक खर्च वा भुक्तानी'
                  : type === 'receipt'
                  ? 'प्राप्त आम्दानी वा रकम'
                  : 'नगद वा बैंक खाता सार्नुहोस्'}
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

        {/* Compact Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Clean 3-Type Toggle */}
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => handleTypeChange('payment')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                type === 'payment'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>खर्च (Expense)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('receipt')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                type === 'receipt'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>आम्दानी (Income)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                type === 'transfer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>सार्नुहोस् (Transfer)</span>
            </button>
          </div>

          {/* Focal Hero Amount Input */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Amount (रकम रू.) <span className="text-rose-500">*</span>
              </label>
              {amount && parseFloat(amount) > 0 && (
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCurrencyNPR(parseFloat(amount))}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base">
                Rs.
              </span>
              <input
                type="number"
                step="any"
                min="0"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-11 pr-3 text-lg font-black text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Category & Payment Method (or From/To for Transfer) */}
          {type !== 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    शीर्षक (Category) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(!isCustomCategory);
                      if (!isCustomCategory) {
                        setCustomCategoryInput('');
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {isCustomCategory ? 'Use Preset List' : '+ Custom Category'}
                  </button>
                </div>

                {isCustomCategory ? (
                  <input
                    type="text"
                    required
                    placeholder="Enter Custom Category e.g. Freelance, Office Rent..."
                    value={customCategoryInput}
                    onChange={(e) => {
                      setCustomCategoryInput(e.target.value);
                      setCategory(e.target.value);
                    }}
                    className="w-full rounded-xl border border-indigo-300 bg-white py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-indigo-700 dark:bg-slate-800 dark:text-white"
                  />
                ) : (
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomCategory(true);
                        setCustomCategoryInput('');
                        setCategory('');
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Custom Category...</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  माध्यम (Payment Mode) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  From (कुन खाताबाट) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  To (कुन खातामा) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={transferToMethod}
                  onChange={(e) => setTransferToMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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

          {/* Description & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                विवरण वा कसलाई/कसबाट (Particulars)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === 'payment'
                    ? 'उदा. चिया नास्ता, पेट्रोल, Ramesh Stationary...'
                    : type === 'receipt'
                    ? 'उदा. बिक्री आम्दानी, ABC Client भुक्तानी...'
                    : 'उदा. ATM बाट नगद झिकेको...'
                }
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                मिति (Date) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Optional More Details Collapsible */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`} />
              <span>{showMoreDetails ? 'Hide extra details' : '+ थप विवरण / बिल फोटो (Optional)'}</span>
            </button>

            {showMoreDetails && (
              <div className="mt-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 dark:border-slate-800 dark:bg-slate-800/50 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    भौचर / बिल नं (Bill / Voucher No)
                  </label>
                  <input
                    type="text"
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value)}
                    placeholder="e.g. Bill #124"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    रसिद वा बिलको फोटो (Receipt Photo)
                  </label>
                  {receiptUrl ? (
                    <div className="flex items-center gap-3">
                      <img src={receiptUrl} alt="Receipt" className="h-14 w-14 rounded-lg object-cover border" />
                      <button
                        type="button"
                        onClick={() => setReceiptUrl('')}
                        className="text-xs text-rose-500 hover:underline"
                      >
                        हटाउनुहोस् (Remove)
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-2 text-xs font-semibold text-slate-600 hover:border-indigo-400 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Upload className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Upload Bill Image</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition dark:text-slate-300 dark:hover:bg-slate-800"
            >
              रद्द गर्नुहोस् (Cancel)
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 active:scale-95 ${
                type === 'receipt'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : type === 'payment'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>{initialTransaction ? 'अपडेट गर्नुहोस्' : 'दर्ता गर्नुहोस् (Save)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
