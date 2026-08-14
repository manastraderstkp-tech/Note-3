/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TodoTask, WorkLog, Note, UserSession } from '../types';

/**
 * Escapes fields for CSV compliance (RFC 4180)
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Initiates download of a generated text blob as a file in browser
 */
function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------------
// CSV EXPORT FUNCTIONS
// ----------------------------------------------------------------------

/**
 * Export Work Logs to CSV
 */
export function exportWorkLogsToCSV(logs: WorkLog[], customFilename?: string) {
  const headers = [
    'Log ID',
    'Date',
    'Project Name',
    'Category',
    'Hours Spent',
    'Start Time',
    'End Time',
    'Task Description',
    'Created At',
  ];

  const rows = logs.map((log) => [
    log.id,
    log.date,
    log.projectName,
    log.category,
    log.hoursSpent,
    log.startTime || '',
    log.endTime || '',
    log.taskDescription,
    log.createdAt,
  ]);

  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map((r) => r.map(escapeCSVField).join(',')),
  ].join('\r\n');

  const filename = customFilename || `workspace-worklogs-${new Date().toISOString().split('T')[0]}.csv`;
  triggerFileDownload(csvContent, filename);
}

/**
 * Export Todo Tasks to CSV
 */
export function exportTasksToCSV(tasks: TodoTask[], customFilename?: string) {
  const headers = [
    'Task ID',
    'Title',
    'Status',
    'Priority',
    'Category',
    'Due Date',
    'Scheduled Reminder (notify_at)',
    'Description',
    'Created At',
  ];

  const rows = tasks.map((task) => [
    task.id,
    task.title,
    task.status,
    task.priority,
    task.category,
    task.dueDate || '',
    task.notifyAt || '',
    task.description || '',
    task.createdAt,
  ]);

  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map((r) => r.map(escapeCSVField).join(',')),
  ].join('\r\n');

  const filename = customFilename || `workspace-tasks-${new Date().toISOString().split('T')[0]}.csv`;
  triggerFileDownload(csvContent, filename);
}

/**
 * Export Notes to CSV
 */
export function exportNotesToCSV(notes: Note[], customFilename?: string) {
  const headers = [
    'Note ID',
    'Title',
    'Category',
    'Is Pinned',
    'Tags',
    'Scheduled Reminder (notify_at)',
    'Content',
    'Created At',
    'Updated At',
  ];

  const rows = notes.map((note) => [
    note.id,
    note.title,
    note.category,
    note.isPinned ? 'Yes' : 'No',
    (note.tags || []).join('; '),
    note.notifyAt || '',
    note.content,
    note.createdAt,
    note.updatedAt,
  ]);

  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map((r) => r.map(escapeCSVField).join(',')),
  ].join('\r\n');

  const filename = customFilename || `workspace-notes-${new Date().toISOString().split('T')[0]}.csv`;
  triggerFileDownload(csvContent, filename);
}

// ----------------------------------------------------------------------
// PDF / PRINTABLE REPORT EXPORT FUNCTIONS
// ----------------------------------------------------------------------

/**
 * Helper to open a stylized, print-ready document window for PDF rendering
 */
function openPrintReportWindow(title: string, htmlBody: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and print PDF reports.');
    return;
  }

  const dateNow = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const fullHTML = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 800;
            color: #1e1b4b;
            margin: 0;
          }
          .brand-accent {
            color: #4f46e5;
          }
          .doc-subtitle {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            margin-top: 4px;
          }
          .meta-info {
            text-align: right;
            font-size: 11px;
            color: #64748b;
          }
          .meta-info strong {
            color: #0f172a;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .metric-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
          }
          .metric-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
          }
          .metric-val {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            margin-bottom: 24px;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            text-align: left;
            padding: 8px 10px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #cbd5e1;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
            vertical-align: top;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-high { background: #fee2e2; color: #991b1b; }
          .badge-medium { background: #fef3c7; color: #92400e; }
          .badge-low { background: #f1f5f9; color: #475569; }
          .badge-completed { background: #dcfce7; color: #166534; }
          .badge-inprogress { background: #dbeafe; color: #1e40af; }
          .badge-pending { background: #fef3c7; color: #92400e; }
          .badge-hours { background: #dcfce7; color: #166534; font-weight: 800; }
          .footer {
            margin-top: 30px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
          .no-print-bar {
            background: #4f46e5;
            color: #ffffff;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .print-btn {
            background: #ffffff;
            color: #4f46e5;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            font-size: 12px;
          }
          @media print {
            .no-print-bar { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div>
            <strong>PDF Generation Preview</strong> — Click "Save / Print PDF" to download or save as PDF.
          </div>
          <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
        </div>

        <div class="header">
          <div>
            <h1 class="brand-title">Work<span class="brand-accent">Space</span></h1>
            <div class="doc-subtitle">${title}</div>
          </div>
          <div class="meta-info">
            <div><strong>Generated:</strong> ${dateNow}</div>
            <div><strong>Executive Report:</strong> Productivity & Activity Hub</div>
          </div>
        </div>

        ${htmlBody}

        <div class="footer">
          <div>WorkSpace Executive Reporting System • Confidential</div>
          <div>Page 1 of 1</div>
        </div>

        <script>
          // Automatically prompt print dialog after content renders
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 400);
          });
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(fullHTML);
  printWindow.document.close();
}

/**
 * Export Work Logs to PDF Report
 */
export function exportWorkLogsToPDF(logs: WorkLog[], user?: UserSession | null) {
  const totalHours = logs.reduce((acc, curr) => acc + curr.hoursSpent, 0);
  const uniqueProjects = Array.from(new Set(logs.map((l) => l.projectName))).length;
  const uniqueCategories = Array.from(new Set(logs.map((l) => l.category))).length;
  const avgHoursPerEntry = logs.length > 0 ? (totalHours / logs.length).toFixed(1) : '0';

  const rowsHTML = logs
    .map(
      (log) => `
      <tr>
        <td><strong>${log.date}</strong></td>
        <td><strong>${log.projectName}</strong></td>
        <td><span class="badge badge-low">${log.category}</span></td>
        <td><span class="badge badge-hours">${log.hoursSpent} hrs</span></td>
        <td>${log.startTime ? `${log.startTime} – ${log.endTime || ''}` : '—'}</td>
        <td>${log.taskDescription || ''}</td>
      </tr>
    `
    )
    .join('');

  const bodyHTML = `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Total Time Tracked</div>
        <div class="metric-val">${totalHours.toFixed(1)} hrs</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Entries</div>
        <div class="metric-val">${logs.length}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Active Projects</div>
        <div class="metric-val">${uniqueProjects}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Hours / Entry</div>
        <div class="metric-val">${avgHoursPerEntry} hrs</div>
      </div>
    </div>

    <h3>Detailed Work Logs & Time Records (${logs.length} Entries)</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 12%;">Date</th>
          <th style="width: 20%;">Project</th>
          <th style="width: 14%;">Category</th>
          <th style="width: 12%;">Duration</th>
          <th style="width: 14%;">Time Range</th>
          <th style="width: 28%;">Task Description</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML || '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">No work logs recorded</td></tr>'}
      </tbody>
    </table>
  `;

  openPrintReportWindow(`Work Logs & Time Tracking Report`, bodyHTML);
}

/**
 * Export Tasks to PDF Report
 */
export function exportTasksToPDF(tasks: TodoTask[], user?: UserSession | null) {
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  const rowsHTML = tasks
    .map((task) => {
      const statusBadge =
        task.status === 'completed'
          ? '<span class="badge badge-completed">Completed</span>'
          : task.status === 'in_progress'
          ? '<span class="badge badge-inprogress">In Progress</span>'
          : '<span class="badge badge-pending">Pending</span>';

      const priorityBadge =
        task.priority === 'high'
          ? '<span class="badge badge-high">High</span>'
          : task.priority === 'medium'
          ? '<span class="badge badge-medium">Medium</span>'
          : '<span class="badge badge-low">Low</span>';

      return `
        <tr>
          <td><strong>${task.title}</strong><br/><small style="color: #64748b;">${task.description || ''}</small></td>
          <td>${statusBadge}</td>
          <td>${priorityBadge}</td>
          <td><span class="badge badge-low">${task.category}</span></td>
          <td>${task.dueDate || '—'}</td>
          <td>${task.notifyAt ? new Date(task.notifyAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
        </tr>
      `;
    })
    .join('');

  const bodyHTML = `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Total Tasks</div>
        <div class="metric-val">${tasks.length}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Completion Rate</div>
        <div class="metric-val" style="color: #16a34a;">${completionRate}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Completed</div>
        <div class="metric-val">${completed}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Active / Pending</div>
        <div class="metric-val">${inProgress + pending}</div>
      </div>
    </div>

    <h3>Todo Tasks & Action Items Status (${tasks.length} Total)</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 35%;">Task & Description</th>
          <th style="width: 14%;">Status</th>
          <th style="width: 12%;">Priority</th>
          <th style="width: 13%;">Category</th>
          <th style="width: 13%;">Due Date</th>
          <th style="width: 13%;">Reminder</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML || '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">No tasks recorded</td></tr>'}
      </tbody>
    </table>
  `;

  openPrintReportWindow(`Todo Tasks & Action Items Report`, bodyHTML);
}

/**
 * Full Workspace Summary PDF Report (Notes, Tasks, and Work Logs)
 */
export function exportFullReportToPDF(
  notes: Note[],
  tasks: TodoTask[],
  logs: WorkLog[],
  user?: UserSession | null
) {
  const totalHours = logs.reduce((acc, curr) => acc + curr.hoursSpent, 0);
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  const tasksHTML = tasks
    .slice(0, 10)
    .map(
      (t) => `
      <tr>
        <td><strong>${t.title}</strong></td>
        <td><span class="badge ${t.status === 'completed' ? 'badge-completed' : 'badge-pending'}">${t.status}</span></td>
        <td><span class="badge ${t.priority === 'high' ? 'badge-high' : 'badge-low'}">${t.priority}</span></td>
        <td>${t.dueDate || '—'}</td>
      </tr>
    `
    )
    .join('');

  const logsHTML = logs
    .slice(0, 8)
    .map(
      (l) => `
      <tr>
        <td>${l.date}</td>
        <td><strong>${l.projectName}</strong></td>
        <td><span class="badge badge-hours">${l.hoursSpent} hrs</span></td>
        <td>${l.taskDescription}</td>
      </tr>
    `
    )
    .join('');

  const notesHTML = notes
    .slice(0, 6)
    .map(
      (n) => `
      <div style="margin-bottom: 10px; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
        <strong>${n.title}</strong> <span class="badge badge-low">${n.category}</span>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">${n.content ? n.content.slice(0, 140) + '...' : ''}</div>
      </div>
    `
    )
    .join('');

  const bodyHTML = `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Total Notes</div>
        <div class="metric-val">${notes.length}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Active Tasks</div>
        <div class="metric-val">${tasks.length} (${completedTasks} done)</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Hours Logged</div>
        <div class="metric-val">${totalHours.toFixed(1)} hrs</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Work Log Entries</div>
        <div class="metric-val">${logs.length}</div>
      </div>
    </div>

    <h3>Recent Active Tasks</h3>
    <table>
      <thead>
        <tr>
          <th>Task</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Due Date</th>
        </tr>
      </thead>
      <tbody>
        ${tasksHTML || '<tr><td colspan="4">No tasks</td></tr>'}
      </tbody>
    </table>

    <h3 style="margin-top: 20px;">Recent Work Logs</h3>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Project</th>
          <th>Duration</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${logsHTML || '<tr><td colspan="4">No work logs</td></tr>'}
      </tbody>
    </table>

    <h3 style="margin-top: 20px;">Key Documentation & Notes</h3>
    <div>${notesHTML || '<p style="color: #94a3b8;">No notes</p>'}</div>
  `;

  openPrintReportWindow(`WorkSpace Executive Summary Report`, bodyHTML);
}
