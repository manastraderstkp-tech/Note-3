import React, { useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, FileText, CheckSquare, Clock, FolderOpen, File } from 'lucide-react';
import { TrashItem } from '../types';

interface TrashSectionProps {
  trashItems: TrashItem[];
  onRestore: (item: TrashItem) => void;
  onPermanentDelete: (item: TrashItem) => void;
  onEmptyTrash: () => void;
}

export const TrashSection: React.FC<TrashSectionProps> = ({
  trashItems,
  onRestore,
  onPermanentDelete,
  onEmptyTrash
}) => {
  const [isConfirmEmptyOpen, setIsConfirmEmptyOpen] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'note': return <FileText className="h-5 w-5 text-amber-500" />;
      case 'todo': return <CheckSquare className="h-5 w-5 text-indigo-500" />;
      case 'worklog': return <Clock className="h-5 w-5 text-emerald-500" />;
      case 'folder': return <FolderOpen className="h-5 w-5 text-yellow-500" />;
      case 'file': return <File className="h-5 w-5 text-sky-500" />;
      default: return <Trash2 className="h-5 w-5 text-slate-500" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'note': return 'Note';
      case 'todo': return 'Task';
      case 'worklog': return 'Work Log';
      case 'folder': return 'Folder';
      case 'file': return 'File';
      default: return 'Item';
    }
  };

  if (trashItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 py-20 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
          <Trash2 className="h-10 w-10 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white">Trash is Empty</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Deleted items will appear here and can be recovered.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-rose-500" />
            Recycle Bin
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {trashItems.length} {trashItems.length === 1 ? 'item' : 'items'} in trash. You can restore them or delete them permanently.
          </p>
        </div>
        <button
          onClick={() => setIsConfirmEmptyOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/40"
        >
          <Trash2 className="h-4 w-4" />
          Empty Trash
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {trashItems.map((item) => (
            <li key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  {getIcon(item.type)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                    {item.title || 'Untitled'}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{getLabel(item.type)}</span>
                    <span>•</span>
                    <span>Deleted {new Date(item.deletedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => onRestore(item)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30 dark:hover:border-indigo-800"
                  title="Restore Item"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </button>
                <button
                  onClick={() => onPermanentDelete(item)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-50 hover:border-rose-200 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-900/30 dark:hover:border-rose-800"
                  title="Permanently Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isConfirmEmptyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-500" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Empty Trash?</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Are you sure you want to permanently delete all items in the trash? This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsConfirmEmptyOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onEmptyTrash();
                  setIsConfirmEmptyOpen(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500"
              >
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
