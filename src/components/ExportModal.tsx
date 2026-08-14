/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  X,
  Calendar,
  Clock,
  CheckSquare,
  FileText,
  Layers,
  Sparkles,
  Download
} from 'lucide-react';
import { Note, TodoTask, WorkLog, UserSession } from '../types';
import {
  exportWorkLogsToCSV,
  exportTasksToCSV,
  exportNotesToCSV,
  exportWorkLogsToPDF,
  exportTasksToPDF,
  exportFullReportToPDF,
} from '../lib/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TodoTask[];
  worklogs: WorkLog[];
  notes: Note[];
  currentUser: UserSession | null;
  initialType?: 'all' | 'tasks' | 'worklogs' | 'notes';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  worklogs,
  notes,
  currentUser,
  initialType = 'all',
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'all' | 'worklogs' | 'tasks' | 'notes'>(initialType);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalHours = worklogs.reduce((acc, curr) => acc + curr.hoursSpent, 0);

  const handleExportCSV = () => {
    if (selectedTarget === 'worklogs') {
      exportWorkLogsToCSV(worklogs);
      setExportSuccess(`Exported ${worklogs.length} work logs to CSV`);
    } else if (selectedTarget === 'tasks') {
      exportTasksToCSV(tasks);
      setExportSuccess(`Exported ${tasks.length} tasks to CSV`);
    } else if (selectedTarget === 'notes') {
      exportNotesToCSV(notes);
      setExportSuccess(`Exported ${notes.length} notes to CSV`);
    } else {
      // Export both worklogs and tasks
      exportWorkLogsToCSV(worklogs);
      setTimeout(() => {
        exportTasksToCSV(tasks);
      }, 300);
      setExportSuccess(`Exported Work Logs & Tasks CSV files`);
    }

    setTimeout(() => {
      setExportSuccess(null);
    }, 4000);
  };

  const handleExportPDF = () => {
    if (selectedTarget === 'worklogs') {
      exportWorkLogsToPDF(worklogs, currentUser);
      setExportSuccess(`Generated printable PDF report for ${worklogs.length} work logs`);
    } else if (selectedTarget === 'tasks') {
      exportTasksToPDF(tasks, currentUser);
      setExportSuccess(`Generated printable PDF report for ${tasks.length} tasks`);
    } else {
      exportFullReportToPDF(notes, tasks, worklogs, currentUser);
      setExportSuccess(`Generated executive workspace summary PDF`);
    }

    setTimeout(() => {
      setExportSuccess(null);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <FileDown className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Export Workspace Data
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download your records in standard CSV spreadsheet or print-ready PDF format.
            </p>
          </div>
        </div>

        {/* Success toast inside modal */}
        {exportSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {/* Step 1: Select Data Entity */}
        <div className="mt-5 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Select Data to Export
          </label>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <button
              onClick={() => setSelectedTarget('worklogs')}
              className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                selectedTarget === 'worklogs'
                  ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/30'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Clock className="h-4 w-4" />
              </div>
              <span className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                Work Logs
              </span>
              <span className="text-[10px] text-slate-400">
                {worklogs.length} entries ({totalHours.toFixed(1)}h)
              </span>
            </button>

            <button
              onClick={() => setSelectedTarget('tasks')}
              className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                selectedTarget === 'tasks'
                  ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/30'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                <CheckSquare className="h-4 w-4" />
              </div>
              <span className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                Todo Tasks
              </span>
              <span className="text-[10px] text-slate-400">
                {tasks.length} total tasks
              </span>
            </button>

            <button
              onClick={() => setSelectedTarget('all')}
              className={`col-span-2 sm:col-span-1 flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                selectedTarget === 'all'
                  ? 'border-violet-500 bg-violet-50/50 ring-2 ring-violet-500/20 dark:border-violet-500 dark:bg-violet-950/30'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <Layers className="h-4 w-4" />
              </div>
              <span className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                All Workspace
              </span>
              <span className="text-[10px] text-slate-400">
                Logs, Tasks & Notes
              </span>
            </button>
          </div>
        </div>

        {/* Step 2: Choose Export Formats */}
        <div className="mt-6 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Export Format & Method
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* CSV Export Option */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    CSV Spreadsheet
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Universal comma-separated format for Excel, Google Sheets, or data analysis.
                </p>
              </div>

              <button
                id="btn-export-csv-action"
                onClick={handleExportCSV}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span>Download .CSV</span>
              </button>
            </div>

            {/* PDF Report Option */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div>
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    PDF / Print Report
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Formatted executive printable layout with styled summaries & metrics.
                </p>
              </div>

              <button
                id="btn-export-pdf-action"
                onClick={handleExportPDF}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
              >
                <Printer className="h-4 w-4" />
                <span>Save / Print PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400 dark:border-slate-800">
          <span>User: {currentUser?.email || 'Local User Space'}</span>
          <button
            onClick={onClose}
            className="font-semibold text-slate-600 hover:underline dark:text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
