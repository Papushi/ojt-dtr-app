import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Clock,
  Target,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  Database,
  Award,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { DTREntry, AppConfig } from '../types';
import { formatDuration, parseLocalDate } from '../utils/helpers';

interface DashboardProps {
  entries: DTREntry[];
  config: AppConfig;
  onQuickAdd: () => void;
  onLoadSample: () => void;
  onUpdateTargetHours: (newTarget: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  entries,
  config,
  onQuickAdd,
  onLoadSample,
  onUpdateTargetHours,
}) => {
  const [editingTarget, setEditingTarget] = React.useState(false);
  const [targetInput, setTargetInput] = React.useState(String(config.targetHours));
  const stats = useMemo(() => {
    const activeEntries = entries.filter((e) => e.type !== 'absent');
    const totalCompleted = entries.reduce((acc, curr) => acc + curr.totalHours, 0);
    const remaining = Math.max(0, config.targetHours - totalCompleted);
    const percentage =
      config.targetHours > 0
        ? Math.min(100, (totalCompleted / config.targetHours) * 100)
        : 0;

    const avgDaily = activeEntries.length > 0 ? totalCompleted / activeEntries.length : 0;
    const daysRemaining = avgDaily > 0 ? Math.ceil(remaining / avgDaily) : Infinity;

    const projectedFinish =
      remaining === 0
        ? 'Completed'
        : daysRemaining !== Infinity
          ? new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString(
              'en-US',
              { month: 'short', day: 'numeric', year: 'numeric' }
            )
          : 'Needs data';

    const isOnTrack = avgDaily >= 6; // Standard >=6 hrs/day OJT pace
    const overtimeCount = entries.filter((e) => e.isOvertime).length;
    const absentCount = entries.filter((e) => e.type === 'absent').length;
    const holidayCount = entries.filter((e) => e.type === 'holiday').length;

    // This week hours (last 7 calendar days relative to latest entry or today)
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const thisWeekHours = entries
      .filter((e) => parseLocalDate(e.date) >= weekAgo)
      .reduce((sum, e) => sum + e.totalHours, 0);

    // Best productive day
    const bestEntry =
      activeEntries.length > 0
        ? activeEntries.reduce((best, curr) =>
            curr.totalHours > best.totalHours ? curr : best
          )
        : null;

    // Last 14 chronological entries for chart
    const chartData = [...entries]
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())
      .slice(-14)
      .map((e) => ({
        dateLabel: parseLocalDate(e.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        hours: Number(e.totalHours.toFixed(2)),
        type: e.type,
        isOvertime: e.isOvertime,
      }));

    return {
      totalCompleted,
      remaining,
      percentage,
      avgDaily,
      daysRemaining,
      projectedFinish,
      isOnTrack,
      overtimeCount,
      absentCount,
      holidayCount,
      thisWeekHours,
      bestEntry,
      chartData,
      workedDays: activeEntries.length,
    };
  }, [entries, config.targetHours]);

  // Empty State
  if (entries.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
          <Target size={24} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Start tracking your {config.targetHours}-hour OJT milestone
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          Log your daily shifts, calculate net hours automatically after breaks, and monitor your
          projected completion date.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onQuickAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap"
          >
            <PlusCircle size={17} />
            Log First Entry
          </button>
          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap"
          >
            <Database size={17} />
            Load Sample OJT Data
          </button>
        </div>
      </div>
    );
  }

  // SVG Ring math
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.percentage / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Target Reached Celebration Banner */}
      {stats.percentage >= 100 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0">
              <Award size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                Target Completed — {stats.totalCompleted.toFixed(1)} of {config.targetHours} Hours
              </h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-300/90 mt-0.5">
                You have fulfilled your required OJT hours. Export your final DTR report for
                supervisor sign-off.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Completed Hours"
          value={`${stats.totalCompleted.toFixed(1)} hrs`}
          detail={`${formatDuration(stats.totalCompleted)} total · Target ${config.targetHours}h`}
          icon={<Clock size={18} className="text-blue-600 dark:text-blue-400" />}
        />
        <KpiCard
          label="Remaining Needed"
          value={`${stats.remaining.toFixed(1)} hrs`}
          detail={
            stats.remaining === 0
              ? 'Requirement met'
              : `${(100 - stats.percentage).toFixed(1)}% left to complete`
          }
          icon={<Target size={18} className="text-slate-600 dark:text-slate-400" />}
        />
        <KpiCard
          label="Daily Average"
          value={`${stats.avgDaily.toFixed(2)} hrs`}
          detail={`Across ${stats.workedDays} active workdays`}
          icon={<TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />}
        />
        <KpiCard
          label="Projected Finish"
          value={stats.projectedFinish}
          detail={
            stats.remaining === 0
              ? 'Ready for clearance'
              : stats.daysRemaining === Infinity
                ? 'Log hours to project'
                : `Approx. ${stats.daysRemaining} workdays left`
          }
          icon={<Calendar size={18} className="text-blue-600 dark:text-blue-400" />}
        />
      </div>

      {/* Main Bento Row: Progress Ring + Daily Velocity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Progress Ring Panel */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Milestone Progress
              </h3>
              {!editingTarget ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {config.targetHours}-hour requirement tracker
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetInput(String(config.targetHours));
                      setEditingTarget(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    title="Change hours target"
                  >
                    <Pencil size={11} />
                    Edit
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    className="w-20 px-2 py-1 text-xs font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Edit target hours"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = Number(targetInput);
                      if (!Number.isNaN(val) && val >= 1 && val <= 5000) {
                        onUpdateTargetHours(Math.round(val * 10) / 10);
                        setEditingTarget(false);
                      }
                    }}
                    className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-md"
                    aria-label="Save target hours"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTarget(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                    aria-label="Cancel editing target hours"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                stats.isOnTrack || stats.percentage >= 100
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {stats.isOnTrack || stats.percentage >= 100 ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>On Track</span>
                </>
              ) : (
                <>
                  <AlertCircle size={15} />
                  <span>Behind Pace</span>
                </>
              )}
            </div>
          </div>

          {/* Crisp SVG Radial Gauge */}
          <div className="my-6 flex items-center justify-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 176 176">
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  strokeWidth="12"
                  fill="none"
                  className="stroke-slate-100 dark:stroke-slate-800"
                />
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={`transition-all duration-500 ease-out ${
                    stats.percentage >= 100 ? 'stroke-emerald-600' : 'stroke-blue-600'
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono tabular-nums text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.percentage.toFixed(1)}%
                </span>
                <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {stats.totalCompleted.toFixed(1)} / {config.targetHours}h
                </span>
              </div>
            </div>
          </div>

          {/* Linear Progress Bar + Sub-metrics */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.percentage >= 100 ? 'bg-emerald-600' : 'bg-blue-600'
                }`}
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Overtime: <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{stats.overtimeCount}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Holidays: <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{stats.holidayCount}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Absent: <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{stats.absentCount}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Daily Hours Bar Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Daily Hours Logged
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Recent {stats.chartData.length} entries compared against an 8-hour benchmark
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Last 7d:{' '}
                <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {stats.thisWeekHours.toFixed(1)}h
                </strong>
              </span>
              {stats.bestEntry && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Peak:{' '}
                    <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                      {stats.bestEntry.totalHours.toFixed(1)}h
                    </strong>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.chartData}
                margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(148, 163, 184, 0.2)"
                />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  unit="h"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-md text-xs">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.dateLabel}
                        </p>
                        <p className="font-mono tabular-nums text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                          {item.hours.toFixed(2)} hrs
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                          {item.isOvertime ? 'Overtime shift' : `${item.type} shift`}
                        </p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={8}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={34}>
                  {stats.chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={
                        entry.type === 'absent'
                          ? '#ef4444'
                          : entry.type === 'holiday'
                            ? '#f59e0b'
                            : entry.isOvertime
                              ? '#16a34a'
                              : '#2563eb'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, detail, icon }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {icon}
    </div>
    <div className="mt-3">
      <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
        {value}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{detail}</p>
    </div>
  </div>
);
