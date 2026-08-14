import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Briefcase,
  Trash2,
  Edit3,
  CheckCircle,
  Timer,
  ChevronRight,
  TrendingUp,
  Award,
  FileDown
} from 'lucide-react';
import { WorkLog } from '../types';

interface WorkLogSectionProps {
  logs: WorkLog[];
  onAddLog: (prefilledHours?: number) => void;
  onEditLog: (log: WorkLog) => void;
  onDeleteLog: (id: string) => void;
  searchQuery: string;
  selectedCategory: string | null;
  onOpenExportModal?: (initialType?: 'all' | 'tasks' | 'worklogs' | 'notes') => void;
}

export const WorkLogSection: React.FC<WorkLogSectionProps> = ({
  logs,
  onAddLog,
  onEditLog,
  onDeleteLog,
  searchQuery,
  selectedCategory,
  onOpenExportModal,
}) => {
  // Live Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerProject, setTimerProject] = useState('WorkSpace Core App');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string | null>(null);

  // Timer interval effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFinishTimer = () => {
    setIsTimerRunning(false);
    const decimalHours = Math.max(0.1, Number((timerSeconds / 3600).toFixed(2)));
    onAddLog(decimalHours);
    setTimerSeconds(0);
  };

  // Projects list
  const allProjects = Array.from(new Set(logs.map((l) => l.projectName)));

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      log.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.taskDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || log.category === selectedCategory;
    const matchesProject = !selectedProjectFilter || log.projectName === selectedProjectFilter;

    return matchesSearch && matchesCategory && matchesProject;
  });

  // Calculate totals
  const totalHoursLogged = filteredLogs.reduce((acc, curr) => acc + curr.hoursSpent, 0);

  // Group logs by date
  const groupedByDate: { [date: string]: WorkLog[] } = {};
  filteredLogs.forEach((log) => {
    if (!groupedByDate[log.date]) {
      groupedByDate[log.date] = [];
    }
    groupedByDate[log.date].push(log);
  });

  // Sorted dates descending
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const formatHeaderDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === yesterday) return 'Yesterday';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Log Hours CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Work Logs & Time Blocks
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {totalHoursLogged.toFixed(1)} total hours recorded across {filteredLogs.length} entries
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenExportModal && (
            <button
              id="btn-export-worklogs-section"
              onClick={() => onOpenExportModal('worklogs')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
            >
              <FileDown className="h-4 w-4 text-emerald-500" />
              <span>Export Logs</span>
            </button>
          )}
          <button
            id="btn-add-worklog-main"
            onClick={() => onAddLog()}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Log Work Hours</span>
          </button>
        </div>
      </div>

      {/* Live Focus Timer Widget */}
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <Timer className={`h-6 w-6 ${isTimerRunning ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Live Focus Stopwatch
              </span>
              {isTimerRunning && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-400/20 animate-ping" />
              )}
            </div>
            <p className="font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {formatTimer(timerSeconds)}
            </p>
          </div>
        </div>

        {/* Timer Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isTimerRunning ? (
            <button
              onClick={() => setIsTimerRunning(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{timerSeconds === 0 ? 'Start Timer' : 'Resume'}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsTimerRunning(false)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition active:scale-95"
            >
              <Pause className="h-3.5 w-3.5 fill-current" />
              <span>Pause</span>
            </button>
          )}

          {timerSeconds > 0 && (
            <>
              <button
                onClick={handleFinishTimer}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95"
                title="Save time into work log"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Save to Log</span>
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(0);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                title="Reset stopwatch"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Project Filter Pills */}
      {allProjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3 text-xs dark:border-slate-800">
          <span className="mr-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            Project:
          </span>
          <button
            onClick={() => setSelectedProjectFilter(null)}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              selectedProjectFilter === null
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All Projects
          </button>
          {allProjects.map((proj) => (
            <button
              key={proj}
              onClick={() =>
                setSelectedProjectFilter(selectedProjectFilter === proj ? null : proj)
              }
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition ${
                selectedProjectFilter === proj
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Briefcase className="h-3 w-3 opacity-60" />
              <span>{proj}</span>
            </button>
          ))}
        </div>
      )}

      {/* Grouped Time-Block List View */}
      <div className="space-y-6">
        {sortedDates.map((dateKey) => {
          const dayLogs = groupedByDate[dateKey];
          const dayTotalHours = dayLogs.reduce((a, b) => a + b.hoursSpent, 0);

          return (
            <div key={dateKey} className="space-y-3">
              {/* Date Group Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {formatHeaderDate(dateKey)}
                  </span>
                  <span className="text-xs text-slate-400">({dateKey})</span>
                </div>
                <div className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {dayTotalHours.toFixed(1)} hrs total
                </div>
              </div>

              {/* Time Blocks for this Date */}
              <div className="space-y-2.5">
                {dayLogs.map((log) => (
                  <div
                    key={log.id}
                    id={`worklog-row-${log.id}`}
                    className="group relative flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  >
                    {/* Left: Project and description */}
                    <div className="flex items-start gap-3.5">
                      {/* Time Duration Badge */}
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30">
                        <span className="text-sm font-extrabold leading-none">
                          {log.hoursSpent}
                        </span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80">
                          hrs
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {log.projectName}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {log.category}
                          </span>
                          {log.startTime && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Clock className="h-3 w-3" />
                              {log.startTime} {log.endTime ? `– ${log.endTime}` : ''}
                            </span>
                          )}
                        </div>

                        {/* Summary / Task description */}
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {log.taskDescription}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-2 sm:border-t-0 sm:pt-0">
                      <button
                        onClick={() => onEditLog(log)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title="Edit log entry"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteLog(log.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                        title="Delete log entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {sortedDates.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-800">
          <Clock className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            No work logs recorded
          </p>
          <p className="text-xs text-slate-400">
            Start the stopwatch timer or click 'Log Work Hours' to record your sessions.
          </p>
        </div>
      )}
    </div>
  );
};
