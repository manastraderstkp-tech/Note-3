import React, { useState, useEffect, useRef } from 'react';
import { requestBrowserNotificationPermission } from "../lib/notifications";
import { X, Calendar, CheckCircle, Tag, AlertCircle, Bell, Clock, Loader2, ChevronDown, Trash2 } from 'lucide-react';
import { TodoTask, TaskStatus, TaskPriority } from '../types';

interface TodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    task: Omit<TodoTask, 'id' | 'createdAt'>,
    id?: string
  ) => Promise<{ success: boolean; error?: string }> | void;
  initialTask?: TodoTask | null;
}

export const TodoModal: React.FC<TodoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('Engineering');
  const [notifyAt, setNotifyAt] = useState<string>('');
  const [hasReminder, setHasReminder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manage custom category dropdown list with LocalStorage caching
  const DEFAULT_CATEGORIES = ['Engineering', 'Design', 'QA', 'Marketing', 'Management', 'Finance', 'Personal'];
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('ws_todo_categories');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return DEFAULT_CATEGORIES;
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ws_todo_categories', JSON.stringify(categoriesList));
  }, [categoriesList]);

  // Click outside listener for dropdown close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRemoveCategory = (catToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = categoriesList.filter(cat => cat !== catToRemove);
    setCategoriesList(updated);
    if (category === catToRemove) {
      setCategory(updated[0] || 'Personal');
    }
  };

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setStatus(initialTask.status);
      setPriority(initialTask.priority);
      setDueDate(initialTask.dueDate || '');
      setCategory(initialTask.category || 'Engineering');
      setErrorMessage(null);
      if (initialTask.notifyAt) {
        const dateObj = new Date(initialTask.notifyAt);
        const localIso = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setNotifyAt(localIso);
        setHasReminder(true);
      } else {
        setNotifyAt('');
        setHasReminder(false);
      }
    } else {
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority('medium');
      const today = new Date().toISOString().split('T')[0];
      setDueDate(today);
      setCategory('Engineering');
      setNotifyAt('');
      setHasReminder(false);
      setErrorMessage(null);
    }
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (minutesFromNow: number) => {
    const target = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const localIso = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setNotifyAt(localIso);
    setHasReminder(true);
  };

  const handleApplyTomorrowMorning = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setNotifyAt(localIso);
    setHasReminder(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    const taskPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      category: category.trim() || 'General',
      notifyAt: hasReminder && notifyAt ? new Date(notifyAt).toISOString() : undefined,
      notified: false,
    };

    try {
      const result = await onSave(taskPayload, initialTask ? initialTask.id : undefined);
      if (result && typeof result === 'object' && result.success === false) {
        setErrorMessage(result.error || 'Failed to save task.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while saving.');
      setIsSubmitting(false);
    }
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
            {initialTask ? 'Edit Task' : 'Create New Task'}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Task Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Audit responsive viewport layout on mobile"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed criteria, acceptance notes, or subtasks..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
              >
                <option value="pending" className="dark:bg-slate-900 dark:text-white">Pending</option>
                <option value="in_progress" className="dark:bg-slate-900 dark:text-white">In Progress</option>
                <option value="completed" className="dark:bg-slate-900 dark:text-white">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
              >
                <option value="high" className="dark:bg-slate-900 dark:text-white">High Priority</option>
                <option value="medium" className="dark:bg-slate-900 dark:text-white">Medium Priority</option>
                <option value="low" className="dark:bg-slate-900 dark:text-white">Low Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
              />
            </div>

            <div ref={dropdownRef} className="relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Category
              </label>
              
              <div className="relative mt-1.5">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <span>{category}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {categoriesList.map((cat) => (
                        <div
                          key={cat}
                          onClick={() => {
                            setCategory(cat);
                            setIsDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-bold cursor-pointer transition ${
                            category === cat
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                              : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                          }`}
                        >
                          <span>{cat}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveCategory(cat, e)}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                            title="Remove category"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-2">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Add custom..."
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newCategoryInput.trim();
                            if (!trimmed) return;
                            if (categoriesList.some(cat => cat.toLowerCase() === trimmed.toLowerCase())) {
                              setNewCategoryInput('');
                              return;
                            }
                            const updated = [...categoriesList, trimmed];
                            setCategoriesList(updated);
                            setCategory(trimmed);
                            setNewCategoryInput('');
                          }}
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sound & Time Notification Reminder Box */}
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Sound Alert & Reminder (notify_at)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!hasReminder && !notifyAt) {
                    handleApplyPreset(60);
                    requestBrowserNotificationPermission();
                  } else {
                    setHasReminder(!hasReminder);
                    if (!hasReminder) requestBrowserNotificationPermission();
                  }
                }}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${
                  hasReminder
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {hasReminder ? 'Active' : 'Off'}
              </button>
            </div>

            {hasReminder && (
              <div className="mt-3 space-y-2">
                <input
                  type="datetime-local"
                  value={notifyAt}
                  onChange={(e) => setNotifyAt(e.target.value)}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400">Quick set:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(15)}
                    className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-800 shadow-xs hover:bg-indigo-100 dark:bg-slate-800 dark:text-indigo-300"
                  >
                    +15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(60)}
                    className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-800 shadow-xs hover:bg-indigo-100 dark:bg-slate-800 dark:text-indigo-300"
                  >
                    +1h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(180)}
                    className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-800 shadow-xs hover:bg-indigo-100 dark:bg-slate-800 dark:text-indigo-300"
                  >
                    +3h
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyTomorrowMorning}
                    className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-800 shadow-xs hover:bg-indigo-100 dark:bg-slate-800 dark:text-indigo-300"
                  >
                    Tomorrow 9 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifyAt('');
                      setHasReminder(false);
                    }}
                    className="rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
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
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{initialTask ? 'Save Task' : 'Add Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
