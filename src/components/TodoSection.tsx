import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Tag,
  ArrowUpDown,
  Filter,
  Check,
  Bell,
  FileDown
} from 'lucide-react';
import { TodoTask, TaskStatus, TaskPriority } from '../types';

interface TodoSectionProps {
  tasks: TodoTask[];
  onAddTask: () => void;
  onEditTask: (task: TodoTask) => void;
  onDeleteTask: (id: string) => void;
  onToggleStatus: (id: string, newStatus: TaskStatus) => void;
  searchQuery: string;
  selectedCategory: string | null;
  onOpenExportModal?: (initialType?: 'all' | 'tasks' | 'worklogs' | 'notes') => void;
}

export const TodoSection: React.FC<TodoSectionProps> = ({
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleStatus,
  searchQuery,
  selectedCategory,
  onOpenExportModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      task.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesCategory = !selectedCategory || task.category === selectedCategory;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Circle className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-500/30">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/30">
            Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Low
          </span>
        );
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Todo Tasks & Action Items
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tasks.filter((t) => t.status !== 'completed').length} pending/in-progress tasks •{' '}
            {tasks.filter((t) => t.status === 'completed').length} completed
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenExportModal && (
            <button
              id="btn-export-tasks-section"
              onClick={() => onOpenExportModal('tasks')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
            >
              <FileDown className="h-4 w-4 text-indigo-500" />
              <span>Export Tasks</span>
            </button>
          )}
          <button
            id="btn-add-task-main"
            onClick={onAddTask}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        {/* Status filters */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            Status:
          </span>
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((st) => (
            <button
              key={st}
              id={`filter-status-${st}`}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {st === 'in_progress' ? 'In Progress' : st}
            </button>
          ))}
        </div>

        {/* Priority filters */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            Priority:
          </span>
          {(['all', 'high', 'medium', 'low'] as const).map((pr) => (
            <button
              key={pr}
              id={`filter-priority-${pr}`}
              onClick={() => setPriorityFilter(pr)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                priorityFilter === pr
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {pr}
            </button>
          ))}
        </div>
      </div>

      {/* List View of Todo Tasks */}
      <div className="space-y-2.5">
        {filteredTasks.map((task) => {
          const isDone = task.status === 'completed';
          return (
            <div
              key={task.id}
              id={`todo-row-${task.id}`}
              className={`group flex flex-col gap-3 rounded-2xl border bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 ${
                isDone ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/40' : ''
              }`}
            >
              {/* Checkbox and task content */}
              <div className="flex items-start gap-3 sm:items-center">
                {/* Status toggle checkbox */}
                <button
                  onClick={() =>
                    onToggleStatus(
                      task.id,
                      task.status === 'completed' ? 'pending' : 'completed'
                    )
                  }
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all sm:mt-0 ${
                    isDone
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                      : 'border-slate-300 bg-slate-50 hover:border-indigo-500 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                  aria-label={isDone ? 'Mark as pending' : 'Mark as completed'}
                >
                  {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : null}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      onClick={() => onEditTask(task)}
                      className={`cursor-pointer text-sm font-bold transition-colors ${
                        isDone
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400'
                      }`}
                    >
                      {task.title}
                    </p>

                    {task.notifyAt && (
                      <span className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                        <Bell className="h-2.5 w-2.5" />
                        <span>{formatReminder(task.notifyAt)}</span>
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                      {task.description}
                    </p>
                  )}

                  {/* Metadata Row for Mobile */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                    {getStatusBadge(task.status)}
                    {getPriorityBadge(task.priority)}
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge, Priority, Due Date & Actions for Desktop */}
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 sm:border-t-0 sm:pt-0">
                <div className="hidden items-center gap-2.5 sm:flex">
                  {/* Status Dropdown selector */}
                  <select
                    value={task.status}
                    onChange={(e) => onToggleStatus(task.id, e.target.value as TaskStatus)}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 transition focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>

                  {getPriorityBadge(task.priority)}

                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {task.category}
                  </span>

                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />
                      <span>{task.dueDate}</span>
                    </div>
                  )}
                </div>

                {/* Edit / Delete actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditTask(task)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    title="Edit task"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                    title="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-800">
          <CheckCircle2 className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            No tasks match the filter criteria
          </p>
          <p className="text-xs text-slate-400">
            Clear the status or priority filters to see other tasks.
          </p>
        </div>
      )}
    </div>
  );
};
