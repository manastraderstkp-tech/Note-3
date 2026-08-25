import React, { useState, useEffect, useMemo } from 'react';
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
  Paperclip,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('notes_view_mode');
      return saved === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('notes_view_mode', mode);
    } catch {
      // ignore
    }
  };

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedTag, pageSize]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    return Array.from(new Set(notes.flatMap((n) => n.tags || [])));
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const plainContent = stripHtmlToText(note.content || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        note.title.toLowerCase().includes(query) ||
        plainContent.includes(query) ||
        note.tags?.some((t) => t.toLowerCase().includes(query));

      const matchesCategory = !selectedCategory || note.category === selectedCategory;
      const matchesTag = !selectedTag || note.tags?.includes(selectedTag);

      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [notes, searchQuery, selectedCategory, selectedTag]);

  // Sort pinned notes to top
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredNotes]);

  // Pagination calculations
  const totalNotes = sortedNotes.length;
  const totalPages = Math.max(1, Math.ceil(totalNotes / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedNotes = sortedNotes.slice(startIndex, startIndex + pageSize);

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

  const getAccentBorder = (scheme?: Note['colorScheme']) => {
    switch (scheme) {
      case 'amber':
        return 'border-l-amber-500';
      case 'indigo':
        return 'border-l-indigo-500';
      case 'emerald':
        return 'border-l-emerald-500';
      case 'rose':
        return 'border-l-rose-500';
      case 'sky':
        return 'border-l-sky-500';
      default:
        return 'border-l-slate-300 dark:border-l-slate-700';
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
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Notes & Documentation
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {totalNotes} {totalNotes === 1 ? 'note' : 'notes'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quick capture ideas, specifications, meeting notes, and knowledge base
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher Toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              id="btn-notes-view-grid"
              onClick={() => handleToggleViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              id="btn-notes-view-list"
              onClick={() => handleToggleViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Compact List View"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          <button
            id="btn-add-note-main"
            onClick={onAddNote}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs shadow-amber-500/20 transition hover:bg-amber-600 active:scale-95 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Filter Tag Bar */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2.5 text-xs dark:border-slate-800">
          <span className="mr-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            Tags:
          </span>
          <button
            onClick={() => setSelectedTag(null)}
            className={`rounded-lg px-2.5 py-0.5 font-medium text-xs transition ${
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
              className={`flex items-center gap-1 rounded-lg px-2.5 py-0.5 font-medium text-xs transition ${
                selectedTag === tag
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span>#{tag}</span>
            </button>
          ))}
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {/* Compact Create Note Card (Only on Page 1) */}
          {currentPage === 1 && (
            <button
              id="btn-card-create-note"
              onClick={onAddNote}
              className="group flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 text-center transition-all duration-200 hover:border-amber-400 hover:bg-amber-50/30 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-amber-500/50 dark:hover:bg-amber-950/10"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-transform group-hover:scale-110 dark:bg-amber-500/20 dark:text-amber-400">
                <Plus className="h-5 w-5" />
              </div>
              <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                Create a Note
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Quick capture thoughts & docs
              </p>
            </button>
          )}

          {/* Note Cards */}
          {paginatedNotes.map((note) => {
            const colorClass = getColorClasses(note.colorScheme);
            return (
              <div
                key={note.id}
                id={`note-card-${note.id}`}
                className={`group relative flex min-h-[140px] flex-col justify-between rounded-xl border p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${colorClass}`}
              >
                <div>
                  {/* Card Top: Category, Reminder & Pin */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="rounded bg-slate-100/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
                        {note.category}
                      </span>

                      {note.notifyAt && (
                        <span
                          className="flex items-center gap-0.5 rounded bg-amber-100/90 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                          title={`Reminder: ${formatReminder(note.notifyAt)}`}
                        >
                          <Bell className="h-2.5 w-2.5" />
                        </span>
                      )}

                      {note.attachments && note.attachments.length > 0 && (
                        <span
                          className="flex items-center gap-0.5 rounded bg-indigo-100/90 px-1.5 py-0.5 text-[9px] font-bold text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300"
                          title={`${note.attachments.length} attachment(s)`}
                        >
                          <Paperclip className="h-2.5 w-2.5" />
                          <span>{note.attachments.length}</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(note.id);
                      }}
                      className={`rounded p-1 transition ${
                        note.isPinned
                          ? 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400'
                          : 'text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                      }`}
                      title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                    >
                      <Pin className={`h-3 w-3 ${note.isPinned ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => onEditNote(note)}
                    className="mt-1.5 cursor-pointer text-sm font-bold text-slate-900 hover:text-amber-600 dark:text-white dark:hover:text-amber-400 line-clamp-1"
                    title={note.title}
                  >
                    {note.title}
                  </h3>

                  {/* Optional Image */}
                  {note.imageUrl && (
                    <div
                      onClick={() => onEditNote(note)}
                      className="mt-1.5 relative h-20 w-full overflow-hidden rounded-lg border border-slate-200/50 dark:border-slate-800 cursor-pointer"
                    >
                      <img
                        src={note.imageUrl}
                        alt="Note attached"
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://placehold.co/600x400/1e293b/475569?text=Image';
                        }}
                      />
                    </div>
                  )}

                  {/* Content excerpt */}
                  <p
                    onClick={() => onEditNote(note)}
                    className="mt-1 cursor-pointer line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
                  >
                    {getNotePreviewText(note.content, 120)}
                  </p>
                </div>

                {/* Card Footer: Tags & Action bar */}
                <div className="mt-2.5 border-t border-slate-200/60 pt-2 dark:border-slate-800/60">
                  {note.tags && note.tags.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-white/80 px-1 py-0.2 text-[9px] font-medium text-slate-500 shadow-2xs dark:bg-slate-800 dark:text-slate-400"
                        >
                          #{t}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="text-[9px] text-slate-400">+{note.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{formatDate(note.updatedAt)}</span>

                    <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => onEditNote(note)}
                        className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        title="Edit note"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModalState({
                            isOpen: true,
                            id: note.id,
                            name: note.title || 'Untitled Note',
                          });
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                        title="Delete note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMPACT LIST VIEW */}
      {viewMode === 'list' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th scope="col" className="w-10 px-3 py-2 text-center">
                    <Pin className="mx-auto h-3 w-3 text-slate-400" />
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Title & Preview
                  </th>
                  <th scope="col" className="w-28 px-3 py-2">
                    Category
                  </th>
                  <th scope="col" className="hidden w-36 px-3 py-2 md:table-cell">
                    Tags
                  </th>
                  <th scope="col" className="w-28 px-3 py-2 text-right">
                    Last Modified
                  </th>
                  <th scope="col" className="w-20 px-3 py-2 text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedNotes.map((note) => {
                  const borderClass = getAccentBorder(note.colorScheme);
                  return (
                    <tr
                      key={note.id}
                      id={`note-row-${note.id}`}
                      className={`group border-l-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${borderClass}`}
                    >
                      {/* Pin Toggle */}
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => onTogglePin(note.id)}
                          className={`rounded p-1 transition ${
                            note.isPinned
                              ? 'text-amber-500'
                              : 'text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400'
                          }`}
                          title={note.isPinned ? 'Unpin' : 'Pin to top'}
                        >
                          <Pin className={`h-3.5 w-3.5 ${note.isPinned ? 'fill-amber-500' : ''}`} />
                        </button>
                      </td>

                      {/* Title & Preview */}
                      <td
                        onClick={() => onEditNote(note)}
                        className="cursor-pointer px-4 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400 line-clamp-1">
                            {note.title}
                          </span>

                          {note.notifyAt && (
                            <span
                              className="flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              title={`Reminder: ${formatReminder(note.notifyAt)}`}
                            >
                              <Bell className="h-2.5 w-2.5" />
                            </span>
                          )}

                          {note.attachments && note.attachments.length > 0 && (
                            <span
                              className="flex items-center gap-0.5 rounded bg-indigo-100 px-1 py-0.2 text-[9px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              title={`${note.attachments.length} attachment(s)`}
                            >
                              <Paperclip className="h-2.5 w-2.5" />
                              <span>{note.attachments.length}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {getNotePreviewText(note.content, 90)}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {note.category}
                        </span>
                      </td>

                      {/* Tags */}
                      <td className="hidden px-3 py-2 md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {note.tags && note.tags.length > 0 ? (
                            note.tags.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              >
                                #{t}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>
                          )}
                          {note.tags && note.tags.length > 2 && (
                            <span className="text-[9px] text-slate-400">+{note.tags.length - 2}</span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-2 text-right text-[11px] text-slate-400 whitespace-nowrap">
                        {formatDate(note.updatedAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditNote(note)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white transition"
                            title="Edit note"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalState({
                                isOpen: true,
                                id: note.id,
                                name: note.title || 'Untitled Note',
                              });
                            }}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition"
                            title="Delete note"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalNotes === 0 && (
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

      {/* Pagination Controls */}
      {totalNotes > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/80 pt-3 text-xs text-slate-500 sm:flex-row dark:border-slate-800/80 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing{' '}
              <strong className="font-semibold text-slate-700 dark:text-slate-200">
                {startIndex + 1}–{Math.min(startIndex + pageSize, totalNotes)}
              </strong>{' '}
              of{' '}
              <strong className="font-semibold text-slate-700 dark:text-slate-200">
                {totalNotes}
              </strong>{' '}
              notes
            </span>

            {/* Page Size selector */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 focus:outline-hidden"
              aria-label="Notes per page"
            >
              <option value={10}>10 per page</option>
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center px-2 font-medium">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
        onConfirm={async () => {
          await onDeleteNote(deleteModalState.id);
        }}
        itemName={deleteModalState.name}
        title="Move to Trash?"
        message="Are you sure you want to move this note to Trash?"
        confirmButtonText="Move to Trash"
      />
    </div>
  );
};
