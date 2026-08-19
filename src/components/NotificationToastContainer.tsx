/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, Volume2, X, Clock, ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { ActiveReminderAlert, NavSection } from '../types';

interface NotificationToastContainerProps {
  alerts: ActiveReminderAlert[];
  onDismiss: (alertId: string) => void;
  onSnooze: (alert: ActiveReminderAlert, minutes: number) => void;
  onNavigateItem: (section: NavSection, itemId: string) => void;
}

export const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
  alerts,
  onDismiss,
  onSnooze,
  onNavigateItem,
}) => {
  if (alerts.length === 0) return null;

  return (
    <div
      id="notification-toast-container"
      className="fixed bottom-5 right-5 z-50 flex max-w-sm w-full flex-col gap-3 pointer-events-none"
    >
      {alerts.map((alert) => {
        const isTodo = alert.type === 'todo';
        return (
          <div
            key={alert.id}
            id={`reminder-toast-${alert.id}`}
            className="pointer-events-auto relative overflow-hidden rounded-2xl border border-indigo-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 dark:border-indigo-800/80 dark:bg-slate-900/95"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isTodo
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400'
                  }`}
                >
                  {isTodo ? <CheckCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {isTodo ? 'Task Reminder' : 'Note Reminder'}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                      <Volume2 className="h-3 w-3 text-emerald-500 animate-pulse" />
                      Alert Sound Played
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1 dark:text-white">
                    {alert.title}
                  </h4>
                </div>
              </div>

              <button
                onClick={() => onDismiss(alert.id)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {alert.description && (
              <p className="mt-2 text-xs text-slate-600 line-clamp-2 dark:text-slate-300">
                {alert.description}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Scheduled for {new Date(alert.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="flex items-center gap-1.5 pointer-events-auto relative z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSnooze(alert, 5);
                  }}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Snooze 5m
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(alert.id);
                    onNavigateItem(isTodo ? 'todos' : 'notes', alert.itemId);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  <span>View</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
