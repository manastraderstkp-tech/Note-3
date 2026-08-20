import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Pin,
  Tag,
  Trash2,
  Edit3,
  Search,
  FolderOpen,
  Calendar,
  Sparkles,
  Check,
  Bell,
  Clock,
  Paperclip
} from 'lucide-react';
import { Note } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { getNotePreviewText, stripHtmlToText } from '../lib/textUtils';

interface NotesSectionProps {
  notes: Note[];
  onAddNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (id: string) => Promise<void> | void;
  onTogglePin: (id: string) => void;
  searchQuery: string;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}

export const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  searchQuery,
  selectedCategory,
  onSelectCategory,
}) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: '', name: '' });

  // Extract all unique tags
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const plainContent = stripHtmlToText(note.content || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(query) ||
      plainContent.includes(query) ||
      note.tags.some((t) => t.toLowerCase().includes(query));

    const matchesCategory = !selectedCategory || note.category === selectedCategory;
    const matchesTag = !selectedTag || note.tags.includes(selectedTag);

    return matchesSearch && matchesCategory && matchesTag;
  });

  // Sort pinned notes to top
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const getColorClasses = (scheme?: Note['colorScheme']) => {
    switch (scheme) {
      case 'amber':
        return 'border-amber-200/80 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20';
      case 'indigo':
        return 'border-indigo-200/80 bg-indigo-50/40 dark:border-indigo-900/40 dark:bg-indigo-950/20';
      case 'emerald':
        return 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20';
      case 'rose':
        return 'border-rose-200/80 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20';
      case 'sky':
        return 'border-sky-200/80 bg-sky-50/40 dark:border-sky-900/40 dark:bg-sky-950/20';
      default:
        return 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const formatReminder = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Notes & Documentation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {notes.length} total note{notes.length === 1 ? '' : 's'} • Quick capture ideas, specs and records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-add-note-main"
            onClick={onAddNote}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition hover:bg-amber-600 active:scale-95 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Filter Tag Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3 text-xs dark:border-slate-800">
        <span className="mr-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          Filter Tags:
        </span>
        <button
          onClick={() => setSelectedTag(null)}
          className={`rounded-lg px-2.5 py-1 font-medium transition ${
            selectedTag === null
              ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition ${
              selectedTag === tag
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <span>#{tag}</span>
          </button>
        ))}
      </div>

      {/* Grid Layout of Notes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder / Quick New Note Card */}
        <button
          id="btn-card-create-note"
          onClick={onAddNote}
          className="group flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center transition-all duration-200 hover:border-amber-400 hover:bg-amber-50/30 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-amber-500/50 dark:hover:bg-amber-950/10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 transition-transform group-hover:scale-110 dark:bg-amber-500/20 dark:text-amber-400">
            <Plus className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            Create a Note
          </p>
          <p className="mt-1 max-w-[200px] text-xs text-slate-400">
            Click here to draft specifications, meeting summaries, or project guidelines
          </p>
        </button>

        {/* Note Cards */}
        {sortedNotes.map((note) => {
          const colorClass = getColorClasses(note.colorScheme);
          return (
            <div
              key={note.id}
              id={`note-card-${note.id}`}
              className={`group relative flex min-h-[220px] flex-col justify-between rounded-2xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${colorClass}`}
            >
              <div>
                {/* Card Top: Category, Reminder & Pin */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-slate-100/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
                      {note.category}
                    </span>

                    {note.notifyAt && (
                      <span className="flex items-center gap-1 rounded-md bg-amber-100/90 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                        <Bell className="h-2.5 w-2.5" />
                        <span>{formatReminder(note.notifyAt)}</span>
                      </span>
                    )}

                    {note.attachments && note.attachments.length > 0 && (
                      <span className="flex items-center gap-1 rounded-md bg-indigo-100/90 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300" title={`${note.attachments.length} attachment(s)`}>
                        <Paperclip className="h-2.5 w-2.5" />
                        <span>{note.attachments.length}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(note.id);
                      }}
                      className={`rounded-lg p-1.5 transition ${
                        note.isPinned
                          ? 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400'
                          : 'text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                      }`}
                      title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                    >
                      <Pin className={`h-3.5 w-3.5 ${note.isPinned ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3
                  onClick={() => onEditNote(note)}
                  className="mt-2.5 cursor-pointer text-base font-bold text-slate-900 hover:text-amber-600 dark:text-white dark:hover:text-amber-400"
                >
                  {note.title}
                </h3>

                {/* Optional Image */}
                {note.imageUrl && (
                  <div 
                    onClick={() => onEditNote(note)}
                    className="mt-2 relative h-32 w-full overflow-hidden rounded-xl border border-slate-200/50 dark:border-slate-800 cursor-pointer"
                  >
                    <img 
                      src={note.imageUrl} 
                      alt="Note attached" 
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105" 
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1e293b/475569?text=Invalid+Image+URL'; }}
                    />
                  </div>
                )}

                {/* Content excerpt */}
                <p
                  onClick={() => onEditNote(note)}
                  className="mt-2 cursor-pointer line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-slate-600 dark:text-slate-300"
                >
                  {getNotePreviewText(note.content, 220)}
                </p>
              </div>

              {/* Card Footer: Tags & Action bar */}
              <div className="mt-4 border-t border-slate-200/60 pt-3 dark:border-slate-800/60">
                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="mb-2.5 flex flex-wrap gap-1">
                    {note.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 shadow-2xs dark:bg-slate-800 dark:text-slate-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{formatDate(note.updatedAt)}</span>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => onEditNote(note)}
                      className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      title="Edit note"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModalState({ isOpen: true, id: note.id, name: note.title || 'Untitled Note' });
                      }}
                      className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedNotes.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-800">
          <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            No matching notes found
          </p>
          <p className="text-xs text-slate-400">
            Try adjusting your search query or clear the tag filters.
          </p>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
        onConfirm={async () => {
          await onDeleteNote(deleteModalState.id);
        }}
        itemName={deleteModalState.name}
      />
    </div>
  );
};
