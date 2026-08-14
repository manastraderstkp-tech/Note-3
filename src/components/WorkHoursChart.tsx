/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Calendar,
  Sparkles,
  Clock,
  Award,
  Zap
} from 'lucide-react';
import { WorkLog } from '../types';

declare global {
  interface Window {
    Chart?: any;
  }
}

interface WorkHoursChartProps {
  worklogs: WorkLog[];
  isDark?: boolean;
}

export const WorkHoursChart: React.FC<WorkHoursChartProps> = ({ worklogs, isDark = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<any>(null);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [isChartJsReady, setIsChartJsReady] = useState(false);

  // Poll for window.Chart if loading asynchronously via CDN
  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (typeof window !== 'undefined' && window.Chart) {
        setIsChartJsReady(true);
        clearInterval(interval);
      } else if (attempts > 20) {
        // Fallback: Dynamically inject if CDN script was somehow blocked
        if (!document.getElementById('chartjs-dynamic-cdn')) {
          const script = document.createElement('script');
          script.id = 'chartjs-dynamic-cdn';
          script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
          script.onload = () => setIsChartJsReady(true);
          document.head.appendChild(script);
        }
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  // Compute 7-day data sequence from 6 days ago up to today
  const { labels, dataPoints, dayDetails, total7Days, avgPerDay, maxDay } = useMemo(() => {
    const dates: string[] = [];
    const formattedLabels: string[] = [];
    const points: number[] = [];
    const details: { date: string; label: string; hours: number; projects: string[] }[] = [];

    const now = new Date();
    // 7 days window (from 6 days ago to today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      dates.push(isoDate);

      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      const label = `${dayName} (${monthDay})`;
      formattedLabels.push(label);

      // Find work logs for this date
      const matchingLogs = worklogs.filter((l) => l.date === isoDate);
      const dayHours = matchingLogs.reduce((acc, curr) => acc + curr.hoursSpent, 0);
      const roundedHours = Number(dayHours.toFixed(1));
      points.push(roundedHours);

      const projs: string[] = Array.from(new Set(matchingLogs.map((l) => l.projectName)));
      details.push({ date: isoDate, label, hours: roundedHours, projects: projs });
    }

    const total = points.reduce((a, b) => a + b, 0);
    const avg = Number((total / 7).toFixed(1));

    let maxVal = -1;
    let peakDay = details[0];
    details.forEach((item) => {
      if (item.hours > maxVal) {
        maxVal = item.hours;
        peakDay = item;
      }
    });

    return {
      labels: formattedLabels,
      dataPoints: points,
      dayDetails: details,
      total7Days: total,
      avgPerDay: avg,
      maxDay: peakDay,
    };
  }, [worklogs]);

  // Render / Update Chart.js Instance
  useEffect(() => {
    if (!isChartJsReady || !canvasRef.current || !window.Chart) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy prior instance if exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(226, 232, 240, 0.8)';
    const primaryBarColor = isDark ? '#6366f1' : '#4f46e5';
    const primaryBarHover = isDark ? '#818cf8' : '#4338ca';

    // Create gradient fill for bar/line
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    if (chartType === 'bar') {
      gradient.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.9)' : 'rgba(79, 70, 229, 0.9)');
      gradient.addColorStop(1, isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(79, 70, 229, 0.2)');
    } else {
      gradient.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(79, 70, 229, 0.35)');
      gradient.addColorStop(1, isDark ? 'rgba(99, 102, 241, 0.0)' : 'rgba(79, 70, 229, 0.0)');
    }

    chartInstanceRef.current = new window.Chart(ctx, {
      type: chartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Hours Logged',
            data: dataPoints,
            backgroundColor: gradient,
            borderColor: primaryBarColor,
            borderWidth: chartType === 'line' ? 3 : 1,
            borderRadius: chartType === 'bar' ? 8 : 0,
            borderSkipped: false,
            hoverBackgroundColor: primaryBarHover,
            fill: chartType === 'line',
            tension: 0.35,
            pointBackgroundColor: primaryBarColor,
            pointRadius: chartType === 'line' ? 5 : 0,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: isDark ? '#0f172a' : '#1e293b',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            padding: 10,
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              label: (context: any) => {
                const hours = context.parsed.y;
                return ` ${hours} hour${hours === 1 ? '' : 's'} logged`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: textColor,
              font: {
                size: 11,
                weight: '600',
                family: 'Plus Jakarta Sans, sans-serif',
              },
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: Math.max(...dataPoints, 4) + 1,
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
              stepSize: 2,
              font: {
                size: 10,
                family: 'Plus Jakarta Sans, sans-serif',
              },
              callback: (value: any) => `${value}h`,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isChartJsReady, labels, dataPoints, chartType, isDark]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Chart Top Header & Mode Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Work Hours (Past 7 Days)
              </h4>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Chart.js Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Work activity breakdown from the last 7 calendar days
            </p>
          </div>
        </div>

        {/* Bar / Line chart toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              chartType === 'bar'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Bars</span>
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              chartType === 'line'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <LineChartIcon className="h-3.5 w-3.5" />
            <span>Trend</span>
          </button>
        </div>
      </div>

      {/* 3 Analytics Insight Mini-Pills */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
          <span className="text-[11px] font-medium text-slate-400">7-Day Total</span>
          <p className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-white">
            {total7Days.toFixed(1)} <span className="text-xs font-medium text-slate-400">hrs</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
          <span className="text-[11px] font-medium text-slate-400">Daily Average</span>
          <p className="mt-0.5 text-base font-extrabold text-indigo-600 dark:text-indigo-400">
            {avgPerDay.toFixed(1)} <span className="text-xs font-medium text-slate-400">hrs/day</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
          <span className="text-[11px] font-medium text-slate-400">Peak Day</span>
          <p className="mt-0.5 truncate text-base font-extrabold text-emerald-600 dark:text-emerald-400">
            {maxDay.hours > 0 ? `${maxDay.hours}h (${maxDay.label.split(' ')[0]})` : '0h'}
          </p>
        </div>
      </div>

      {/* Canvas container for Chart.js */}
      <div className="mt-5 h-64 w-full relative">
        <canvas ref={canvasRef} id="canvas-work-hours-chart" />
        {!isChartJsReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Clock className="h-4 w-4 animate-spin text-indigo-600" />
              <span>Loading visual chart engine...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
