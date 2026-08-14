import React, { useState, useEffect } from 'react';
import { X, Pin, Tag, Bell, Clock, Sparkles } from 'lucide-react';
import { Note } from '../types';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => void;
  initialNote?: Note | null;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [category, setCategory] = useState('Engineering');
  const [colorScheme, setColorScheme] = useState<Note['colorScheme']>('default');
  const [isPinned, setIsPinned] = useState(false);
  const [notifyAt, setNotifyAt] = useState<string>('');
  const [hasReminder, setHasReminder] = useState(false);

  useEffect(() => {
    if (initialNote) {
      setTitle(initialNote.title);
      setContent(initialNote.content);
      setTagsInput(initialNote.tags.join(', '));
      setCategory(initialNote.category || 'Engineering');
      setColorScheme(initialNote.colorScheme || 'default');
      setIsPinned(initialNote.isPinned || false);
      if (initialNote.notifyAt) {
        // Convert to datetime-local format YYYY-MM-DDTHH:mm
        const dateObj = new Date(initialNote.notifyAt);
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
      setContent('');
      setTagsInput('');
      setCategory('Engineering');
      setColorScheme('default');
      setIsPinned(false);
      setNotifyAt('');
      setHasReminder(false);
    }
  }, [initialNote, isOpen]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    onSave(
      {
        title: title.trim(),
        content: content.trim(),
        tags,
        category: category.trim() || 'General',
        colorScheme,
        isPinned,
        notifyAt: hasReminder && notifyAt ? new Date(notifyAt).toISOString() : undefined,
        notified: false,
      },
      initialNote ? initialNote.id : undefined
    );
    onClose();
  };

  const colorOptions: { id: Note['colorScheme']; label: string; bg: string }[] = [
    { id: 'default', label: 'Default', bg: 'bg-slate-200 dark:bg-slate-700' },
    { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-400' },
    { id: 'amber', label: 'Amber', bg: 'bg-amber-400' },
    { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-400' },
    { id: 'sky', label: 'Sky', bg: 'bg-sky-400' },
    { id: 'rose', label: 'Rose', bg: 'bg-rose-400' },
  ];

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
            {initialNote ? 'Edit Note' : 'Create New Note'}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Note Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., API Architecture & Design Token Matrix"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-amber-400 dark:focus:bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Content & Documentation
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note body, specs, meeting notes or ideas here..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-amber-400 dark:focus:bg-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Engineering, Design, Personal..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Frontend, React, Architecture"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-900"
              />
            </div>
          </div>

          {/* Sound & Time Notification Reminder Box */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Sound Alert & Reminder (notify_at)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!hasReminder && !notifyAt) {
                    handleApplyPreset(60); // default 1 hour
                  } else {
                    setHasReminder(!hasReminder);
                  }
                }}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${
                  hasReminder
                    ? 'bg-amber-500 text-white'
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
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400">Quick set:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(15)}
                    className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-800 shadow-xs hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-300"
                  >
                    +15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(60)}
                    className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-800 shadow-xs hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-300"
                  >
                    +1h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(180)}
                    className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-800 shadow-xs hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-300"
                  >
                    +3h
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyTomorrowMorning}
                    className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-800 shadow-xs hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-300"
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

          {/* Color & Pin Options */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Color:</span>
              <div className="flex items-center gap-1.5">
                {colorOptions.map((co) => (
                  <button
                    key={co.id}
                    type="button"
                    onClick={() => setColorScheme(co.id)}
                    className={`h-6 w-6 rounded-full ${co.bg} transition-all ${
                      colorScheme === co.id ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                    }`}
                    title={co.label}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                isPinned
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current' : ''}`} />
              <span>{isPinned ? 'Pinned Note' : 'Pin to Top'}</span>
            </button>
          </div>

          {/* Footer buttons */}
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
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 active:scale-95 transition"
            >
              {initialNote ? 'Save Changes' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
