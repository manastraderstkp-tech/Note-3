import React from 'react';
import {
  FileText,
  ListTodo,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  Check,
  Flame,
  Calendar,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
  Tag,
  FileDown,
  Search,
  X
} from 'lucide-react';
import { Note, TodoTask, WorkLog, MetricStats, NavSection, TaskStatus } from '../types';
import { MetricCards } from './MetricCards';
import { WorkHoursChart } from './WorkHoursChart';

interface DashboardViewProps {
  stats: MetricStats;
  notes: Note[];
  tasks: TodoTask[];
  worklogs: WorkLog[];
  onNavigate: (section: NavSection) => void;
  onOpenNewModal: (type: 'note' | 'todo' | 'worklog') => void;
  onToggleTaskStatus: (id: string, newStatus: TaskStatus) => void;
  onEditNote: (note: Note) => void;
  onEditTask: (task: TodoTask) => void;
  onEditWorkLog?: (log: WorkLog) => void;
  searchQuery?: string;
  isDark?: boolean;
  onOpenExportModal?: (initialType?: 'all' | 'tasks' | 'worklogs' | 'notes') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  notes,
  tasks,
  worklogs,
  onNavigate,
  onOpenNewModal,
  onToggleTaskStatus,
  onEditNote,
  onEditTask,
  onEditWorkLog,
  searchQuery = '',
  isDark = false,
  onOpenExportModal,
}) => {
  const query = searchQuery.trim().toLowerCase();

  // Apply real-time search filter to tasks
  const filteredTasks = query
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query)) ||
          t.category.toLowerCase().includes(query) ||
          t.priority.toLowerCase().includes(query)
      )
    : tasks;

  // Apply real-time search filter to notes
  const filteredNotes = query
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query) ||
          n.category.toLowerCase().includes(query) ||
          n.tags?.some((t) => t.toLowerCase().includes(query))
      )
    : notes;

  // Apply real-time search filter to worklogs
  const filteredWorkLogs = query
    ? worklogs.filter(
        (l) =>
          l.projectName.toLowerCase().includes(query) ||
          l.taskDescription.toLowerCase().includes(query) ||
          l.category.toLowerCase().includes(query)
      )
    : worklogs;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = filteredWorkLogs.filter((l) => l.date === todayStr);

  const pendingAndInProgress = filteredTasks.filter((t) => t.status !== 'completed');

  const recentNotes = [...filteredNotes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Search Active Indicator if filtering */}
      {query && (
        <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs font-medium text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              Real-time Global Filter active for "<strong>{searchQuery}</strong>": found{' '}
              <strong>{filteredNotes.length}</strong> note{filteredNotes.length === 1 ? '' : 's'},{' '}
              <strong>{filteredTasks.length}</strong> task{filteredTasks.length === 1 ? '' : 's'},{' '}
              <strong>{filteredWorkLogs.length}</strong> work log{filteredWorkLogs.length === 1 ? '' : 's'}.
            </span>
          </div>
          <span className="rounded-lg bg-indigo-200/60 px-2 py-0.5 text-[10px] font-bold dark:bg-indigo-900">
            Live Search
          </span>
        </div>
      )}

      {/* Welcome Banner & Quick Action Launcher */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:p-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-xs">
              Welcome back
            </span>
            <span className="text-xs text-indigo-200">Productivity Executive Hub</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Productivity & Activity Hub
          </h2>
          <p className="max-w-xl text-xs text-indigo-100/80 sm:text-sm">
            Manage your documentation, track active sprint tasks, and log daily project hours seamlessly.
          </p>
        </div>

        {/* Quick Action & Export Buttons in Hero */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenExportModal && (
            <button
              id="btn-hero-export-modal"
              onClick={() => onOpenExportModal('all')}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 sm:text-sm"
            >
              <FileDown className="h-4 w-4 text-emerald-300" />
              <span>Export Data</span>
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
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 sm:text-sm"
          >
            <ListTodo className="h-4 w-4 text-indigo-300" />
            <span>+ Task</span>
          </button>

          <button
            onClick={() => onOpenNewModal('worklog')}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition hover:bg-emerald-600 active:scale-95 sm:text-sm"
          >
            <Clock className="h-4 w-4" />
            <span>+ Log Time</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Top Row */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Overview Metrics
          </h3>
          <span className="text-xs text-slate-400">Real-time sync</span>
        </div>
        <MetricCards stats={stats} onNavigate={onNavigate} />
      </section>

      {/* Analytics Visuals: Chart.js 7-Day Work Hours Breakdown */}
      <section className="space-y-3">
        <WorkHoursChart worklogs={worklogs} isDark={isDark} />
      </section>

      {/* Two Column Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Tasks & Recent Notes (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Active / High Priority Tasks */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <ListTodo className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Priority Todo Tasks
                  </h4>
                  <p className="text-xs text-slate-400">
                    {pendingAndInProgress.length} active tasks remaining
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
              {pendingAndInProgress.slice(0, 4).map((task) => (
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

              {pendingAndInProgress.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  <CheckCircle2 className="mx-auto mb-1 h-6 w-6 text-emerald-500" />
                  All caught up! No active tasks.
                </div>
              )}
            </div>
          </div>

          {/* Recent Notes Preview */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Recent Notes
                  </h4>
                  <p className="text-xs text-slate-400">Latest specs & documents</p>
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

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                    <p className="mt-1.5 line-clamp-3 text-[11px] text-slate-500 dark:text-slate-400">
                      {note.content}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{note.tags[0] ? `#${note.tags[0]}` : ''}</span>
                    <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Work Log Timeline & Analytics (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Today's Logged Hours Timeline */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Today's Work Logs
                  </h4>
                  <p className="text-xs text-slate-400">
                    {stats.hoursLoggedToday.toFixed(1)} hrs tracked today
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('worklogs')}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                <span>Full log</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {todayLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => onEditWorkLog && onEditWorkLog(log)}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 transition hover:bg-slate-100/60 dark:border-slate-800/70 dark:bg-slate-800/30 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-black text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                    {log.hoursSpent}h
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {log.projectName}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {log.taskDescription}
                    </p>
                  </div>
                </div>
              ))}

              {todayLogs.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Clock className="mx-auto mb-2 h-6 w-6 text-slate-300 dark:text-slate-700" />
                  No time logged yet today.
                </div>
              )}

              <button
                onClick={() => onOpenNewModal('worklog')}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-300 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Time Entry</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Card */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-6 dark:border-slate-800 dark:from-slate-900 dark:to-indigo-950/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Weekly Summary
            </h4>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/80">
                <span className="text-[11px] text-slate-400">Week Total</span>
                <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
                  {stats.totalHoursWeek.toFixed(1)} <span className="text-xs font-normal">hrs</span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/80">
                <span className="text-[11px] text-slate-400">Completion Rate</span>
                <p className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {tasks.length > 0
                    ? Math.round((stats.completedTasks / tasks.length) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

