import React from 'react';
import {
  FileText,
  ListTodo,
  FolderOpen,
  Plus,
  ArrowRight,
  CheckCircle2,
  Check,
  ChevronRight,
  User,
  ShieldCheck,
  FileDown,
  Search,
} from 'lucide-react';
import { Note, TodoTask, MetricStats, NavSection, TaskStatus, UserSession } from '../types';
import { getNotePreviewText, stripHtmlToText } from '../lib/textUtils';

interface PersonalSpaceViewProps {
  currentUser: UserSession | null;
  notes: Note[];
  tasks: TodoTask[];
  onNavigate: (section: NavSection) => void;
  onOpenNewModal: (type: 'note' | 'todo') => void;
  onToggleTaskStatus: (id: string, newStatus: TaskStatus) => void;
  onEditNote: (note: Note) => void;
  onEditTask: (task: TodoTask) => void;
  searchQuery?: string;
  onOpenExportModal?: (initialType?: 'all' | 'tasks' | 'notes') => void;
}

export const PersonalSpaceView: React.FC<PersonalSpaceViewProps> = ({
  currentUser,
  notes,
  tasks,
  onNavigate,
  onOpenNewModal,
  onToggleTaskStatus,
  onEditNote,
  onEditTask,
  searchQuery = '',
  onOpenExportModal,
}) => {
  const query = searchQuery.trim().toLowerCase();

  const filteredTasks = query
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query)) ||
          t.category.toLowerCase().includes(query) ||
          t.priority.toLowerCase().includes(query)
      )
    : tasks;

  const filteredNotes = query
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          stripHtmlToText(n.content || '').toLowerCase().includes(query) ||
          n.category.toLowerCase().includes(query) ||
          n.tags?.some((t) => t.toLowerCase().includes(query))
      )
    : notes;

  const pendingTasks = filteredTasks.filter((t) => t.status !== 'completed');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  const recentNotes = [...filteredNotes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Search active notification */}
      {query && (
        <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs font-medium text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              Personal Space Filter active for "<strong>{searchQuery}</strong>": found{' '}
              <strong>{filteredNotes.length}</strong> note{filteredNotes.length === 1 ? '' : 's'},{' '}
              <strong>{filteredTasks.length}</strong> task{filteredTasks.length === 1 ? '' : 's'}.
            </span>
          </div>
        </div>
      )}

      {/* Standard User Personal Hero Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:p-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3 py-0.5 text-xs font-semibold text-indigo-200">
              <User className="h-3 w-3" />
              <span>Personal Workspace • Standard User</span>
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            {currentUser?.fullName ? `Welcome, ${currentUser.fullName}` : 'Your Personal Space'}
          </h2>
          <p className="max-w-xl text-xs text-indigo-100/80 sm:text-sm">
            Focus purely on your personal notes and sprint tasks with isolated Row Level Security.
          </p>
        </div>

        {/* Quick Personal Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenExportModal && (
            <button
              onClick={() => onOpenExportModal('all')}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 sm:text-sm"
            >
              <FileDown className="h-4 w-4 text-emerald-300" />
              <span>Export Mine</span>
            </button>
          )}

          <button
            onClick={() => onOpenNewModal('note')}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 sm:text-sm"
          >
            <FileText className="h-4 w-4 text-amber-300" />
            <span>+ Note</span>
          </button>

          <button
            onClick={() => onOpenNewModal('todo')}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-600 active:scale-95 sm:text-sm"
          >
            <ListTodo className="h-4 w-4" />
            <span>+ Task</span>
          </button>
        </div>
      </div>

      {/* Personal Quick Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          onClick={() => onNavigate('notes')}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-400/50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">My Notes</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
            {notes.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Private documents created</p>
        </div>

        <div
          onClick={() => onNavigate('todos')}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-400/50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">My Active Tasks</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <ListTodo className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
            {pendingTasks.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {completedTasks.length} completed
          </p>
        </div>

        <div
          onClick={() => onNavigate('files')}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-400/50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">My Files</span>
            <div className="rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
            Cloud Drive
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Files & folders</p>
        </div>
      </div>

      {/* Role-Based Notice Info Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs dark:border-indigo-900/40 dark:bg-indigo-950/20">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400 shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Standard Role Access Scope: Personal Workspace
              </span>
              <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                RLS Protected
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              You are signed in as a Standard User. You have full create, read, and delete rights for your own personal notes, tasks, and files. System-wide administrative analytics and user management are restricted to Admin accounts.
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Content Grid for Standard User */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: My Active Tasks (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <ListTodo className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    My Pending Tasks
                  </h4>
                  <p className="text-xs text-slate-400">
                    {pendingTasks.length} personal tasks remaining
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('todos')}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <span>View all</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {pendingTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-slate-200 hover:bg-white dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleTaskStatus(task.id, 'completed')}
                      className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 bg-white hover:border-emerald-500 dark:border-slate-600 dark:bg-slate-700"
                      title="Mark as completed"
                    >
                      <Check className="h-3 w-3 text-transparent group-hover:text-slate-400" />
                    </button>
                    <div>
                      <p
                        onClick={() => onEditTask(task)}
                        className="cursor-pointer text-xs font-bold text-slate-800 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400"
                      >
                        {task.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {task.category}
                        </span>
                        <span>•</span>
                        <span>Due: {task.dueDate || 'No due date'}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      task.priority === 'high'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        : task.priority === 'medium'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}

              {pendingTasks.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  <CheckCircle2 className="mx-auto mb-1 h-6 w-6 text-emerald-500" />
                  All caught up! No pending tasks.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Notes (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    My Recent Notes
                  </h4>
                  <p className="text-xs text-slate-400">Latest personal documents</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('notes')}
                className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
              >
                <span>All Notes</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onEditNote(note)}
                  className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition hover:-translate-y-0.5 hover:border-amber-400/50 hover:bg-amber-50/20 hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-amber-500/30"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {note.category}
                    </span>
                    <h5 className="mt-1 line-clamp-2 text-xs font-bold text-slate-900 group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400">
                      {note.title}
                    </h5>
                    <p className="mt-1.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {getNotePreviewText(note.content, 100)}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{note.tags[0] ? `#${note.tags[0]}` : ''}</span>
                    <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              ))}

              {recentNotes.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  <FileText className="mx-auto mb-1 h-6 w-6 text-slate-300 dark:text-slate-700" />
                  No personal notes yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
