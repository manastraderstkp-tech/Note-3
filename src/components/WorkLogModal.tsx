import React, { useState, useEffect } from 'react';
import { X, Clock, Briefcase, Calendar } from 'lucide-react';
import { WorkLog } from '../types';

interface WorkLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Omit<WorkLog, 'id' | 'createdAt'>, id?: string) => void;
  initialLog?: WorkLog | null;
  prefilledHours?: number;
}

export const WorkLogModal: React.FC<WorkLogModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLog,
  prefilledHours,
}) => {
  const [projectName, setProjectName] = useState('WorkSpace Core App');
  const [taskDescription, setTaskDescription] = useState('');
  const [hoursSpent, setHoursSpent] = useState<number>(2.0);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState('Development');

  useEffect(() => {
    if (initialLog) {
      setProjectName(initialLog.projectName);
      setTaskDescription(initialLog.taskDescription);
      setHoursSpent(initialLog.hoursSpent);
      setDate(initialLog.date);
      setStartTime(initialLog.startTime || '');
      setEndTime(initialLog.endTime || '');
      setCategory(initialLog.category || 'Development');
    } else {
      setProjectName('WorkSpace Core App');
      setTaskDescription('');
      setHoursSpent(prefilledHours !== undefined ? prefilledHours : 1.5);
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setStartTime('');
      setEndTime('');
      setCategory('Development');
    }
  }, [initialLog, prefilledHours, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !taskDescription.trim()) return;

    onSave(
      {
        projectName: projectName.trim(),
        taskDescription: taskDescription.trim(),
        hoursSpent: Number(hoursSpent) || 0.5,
        date: date || new Date().toISOString().split('T')[0],
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        category: category.trim() || 'General',
      },
      initialLog ? initialLog.id : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {initialLog ? 'Edit Work Log' : 'Record Work Hours'}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Project Name
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., WorkSpace Core App, Design System, API Services"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-emerald-400 dark:focus:bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Summary of Work Done
            </label>
            <textarea
              rows={3}
              required
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Detailed description of accomplishments, fixes, or meetings during this session..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-emerald-400 dark:focus:bg-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Time Spent (Hours)
              </label>
              <input
                type="number"
                step="0.25"
                min="0.1"
                required
                value={hoursSpent}
                onChange={(e) => setHoursSpent(parseFloat(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Log Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Development, QA..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Start Time (opt)
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="09:00 AM"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                End Time (opt)
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="11:30 AM"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-900"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition"
            >
              {initialLog ? 'Save Work Log' : 'Save Time Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
