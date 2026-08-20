import React from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  Clock,
  User,
  CreditCard,
  Building,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrencyNPR } from '../lib/transactionDb';

interface TransactionVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

// Convert amount number to English words for official vouchers
function convertNumberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    let str = '';
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      }
    }
    return str;
  }

  const rounded = Math.round(num);
  return `${inWords(rounded).trim()} Rupees Only`;
}

export const TransactionVoucherModal: React.FC<TransactionVoucherModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  if (!isOpen || !transaction) return null;

  const isReceipt = transaction.type === 'receipt';
  const isPayment = transaction.type === 'payment';
  const isTransfer = transaction.type === 'transfer';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity print:p-0 print:bg-white">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 overflow-hidden print:border-none print:shadow-none print:max-h-full print:rounded-none">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Official Voucher (लेखा भौचर)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Printer className="h-4 w-4" />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 print:p-0 print:overflow-visible text-slate-800 dark:text-slate-200">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-200 pb-5 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  WORKSPACE ENTERPRISES
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                General Ledger & Daily Accounts Management
              </p>
              <p className="text-[11px] text-slate-400">
                Kathmandu, Nepal • PAN: 601249821
              </p>
            </div>

            <div className="mt-4 sm:mt-0 text-left sm:text-right">
              <span
                className={`inline-block rounded-xl px-3 py-1 text-xs font-black uppercase tracking-wider ${
                  isReceipt
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                    : isPayment
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
                }`}
              >
                {isReceipt ? 'RECEIPT VOUCHER (आम्दानी रसिद)' : isPayment ? 'PAYMENT VOUCHER (भुक्तानी भौचर)' : 'CONTRA VOUCHER (ट्रान्सफर)'}
              </span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                Voucher No: <span className="font-mono">{transaction.voucherNo}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Date: {transaction.date} {transaction.time ? `• ${transaction.time}` : ''}
              </p>
            </div>
          </div>

          {/* Core Voucher Body */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-800/40 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {isReceipt ? 'Received From (भुक्तानी दिने)' : 'Paid To (भुक्तानी पाउने)'}
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {transaction.partyName || 'Cash / General Party'}
                </p>
                {transaction.panVatNumber && (
                  <p className="text-xs text-slate-500">Party PAN/VAT: {transaction.panVatNumber}</p>
                )}
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Account Head / Category (शीर्षक)
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {transaction.category}
                </p>
                <p className="text-xs text-slate-500">
                  Payment Mode: <span className="font-semibold text-slate-700 dark:text-slate-300">{transaction.paymentMethod}</span>
                  {transaction.transferToMethod && ` ➔ ${transaction.transferToMethod}`}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Particulars / Narration (विवरण)
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                {transaction.description || 'N/A'}
              </p>
            </div>
          </div>

          {/* Amount Box */}
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl bg-slate-900 text-white p-5 dark:bg-slate-950 shadow-md">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Amount in Words (अक्षरूपी)
              </span>
              <p className="text-xs font-semibold text-slate-200 italic mt-0.5">
                {convertNumberToWords(transaction.amount)}
              </p>
            </div>

            <div className="mt-3 sm:mt-0 text-right">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Total Amount (जम्मा रकम)
              </span>
              <p className="text-2xl font-black text-amber-400 tracking-tight">
                {formatCurrencyNPR(transaction.amount)}
              </p>
            </div>
          </div>

          {/* Attached Receipt Preview */}
          {transaction.receiptUrl && (
            <div className="border border-slate-200 rounded-2xl p-4 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Attached Bill / Invoice (संलग्न रसिद)
              </span>
              <img
                src={transaction.receiptUrl}
                alt="Attached Bill"
                className="max-h-56 rounded-xl object-contain mx-auto border border-slate-200 dark:border-slate-700"
              />
            </div>
          )}

          {/* Signature Footer */}
          <div className="grid grid-cols-3 gap-4 pt-10 border-t border-dashed border-slate-300 dark:border-slate-700 text-center">
            <div>
              <div className="h-10 border-b border-slate-400 mx-auto w-3/4" />
              <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                Prepared By (तयार गर्ने)
              </span>
            </div>
            <div>
              <div className="h-10 border-b border-slate-400 mx-auto w-3/4" />
              <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                Checked By (जाँच गर्ने)
              </span>
            </div>
            <div>
              <div className="h-10 border-b border-slate-400 mx-auto w-3/4" />
              <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                Authorized Signature (स्वीकृत गर्ने)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
