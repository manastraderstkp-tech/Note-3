import React from 'react';
import {
  FileText,
  FolderOpen,
  CheckCircle2,
  ListTodo,
  ArrowUpRight,
} from 'lucide-react';
import { MetricStats, NavSection } from '../types';

interface MetricCardsProps {
  stats: MetricStats;
  onNavigate: (section: NavSection) => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats, onNavigate }) => {
  const cards = [
    {
      id: 'metric-notes',
      title: 'Total Notes',
      value: stats.totalNotes,
      suffix: 'docs',
      icon: FileText,
      color: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50 dark:bg-amber-950/30',
      textAccent: 'text-amber-600 dark:text-amber-400',
      borderAccent: 'border-amber-200/70 dark:border-amber-900/40',
      targetSection: 'notes' as NavSection,
      subtext: 'Organized by tags',
      trend: '+2 this week',
    },
    {
      id: 'metric-pending-tasks',
      title: 'Pending Tasks',
      value: stats.pendingTasks + stats.inProgressTasks,
      suffix: 'active',
      icon: ListTodo,
      color: 'from-indigo-500 to-blue-500',
      bgLight: 'bg-indigo-50 dark:bg-indigo-950/30',
      textAccent: 'text-indigo-600 dark:text-indigo-400',
      borderAccent: 'border-indigo-200/70 dark:border-indigo-900/40',
      targetSection: 'todos' as NavSection,
      subtext: `${stats.inProgressTasks} in progress`,
      trend: '3 high priority',
    },
    {
      id: 'metric-completed-tasks',
      title: 'Completed Tasks',
      value: stats.completedTasks,
      suffix: 'done',
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-500',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
      textAccent: 'text-emerald-600 dark:text-emerald-400',
      borderAccent: 'border-emerald-200/70 dark:border-emerald-900/40',
      targetSection: 'todos' as NavSection,
      subtext: 'Marked completed',
      trend: '100% velocity',
    },
    {
      id: 'metric-files-drive',
      title: 'File Drive',
      value: stats.totalFiles || 0,
      suffix: 'files',
      icon: FolderOpen,
      color: 'from-sky-500 to-cyan-500',
      bgLight: 'bg-sky-50 dark:bg-sky-950/30',
      textAccent: 'text-sky-600 dark:text-sky-400',
      borderAccent: 'border-sky-200/70 dark:border-sky-900/40',
      targetSection: 'files' as NavSection,
      subtext: 'Cloud & local storage',
      trend: 'Protected files',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            id={card.id}
            onClick={() => onNavigate(card.targetSection)}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border ${card.borderAccent} ${card.bgLight} p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-slate-900/60`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm transition-transform duration-200 group-hover:scale-110 dark:bg-slate-800 ${card.textAccent}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            {/* Metric Value */}
            <div className="my-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {card.value}
              </span>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {card.suffix}
              </span>
            </div>

            {/* Footer row with subtext and navigate indicator */}
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{card.subtext}</span>
              <div className="flex items-center gap-0.5 font-medium text-slate-700 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-200">
                <span>View</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
