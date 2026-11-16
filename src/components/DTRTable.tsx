import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Calendar, Filter, X } from 'lucide-react';
import { DTREntry, AppConfig } from '../types';
import {
  formatDate,
  getDayName,
  formatDuration,
  formatTimeDisplay,
  parseLocalDate,
} from '../utils/helpers';

interface DTRTableProps {
  entries: DTREntry[];
  config: AppConfig;
  onRequestDelete: (entry: DTREntry) => void;
  onEdit: (entry: DTREntry) => void;
}

type StatusFilter = 'all' | 'regular' | 'overtime' | 'holiday' | 'absent';

export const DTRTable: React.FC<DTRTableProps> = ({
  entries,
  config,
  onRequestDelete,
  onEdit,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Compute running totals chronologically across all entries before filtering,
  // or on filtered entries cleanly (chronological across full set keeps ledger accurate).
  const entriesWithRunningTotal = useMemo(() => {
    const ascending = [...entries].sort(
      (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
    );

    let runningTotal = 0;
    const withTotal = ascending.map((entry) => {
      runningTotal += entry.totalHours;
      return { ...entry, runningTotal };
    });

    const filtered = withTotal.filter((entry) => {
      if (statusFilter === 'overtime' && !entry.isOvertime) return false;
      if (statusFilter === 'regular' && entry.type !== 'regular') return false;
      if (statusFilter === 'holiday' && entry.type !== 'holiday') return false;
      if (statusFilter === 'absent' && entry.type !== 'absent') return false;
      if (fromDate && entry.date < fromDate) return false;
      if (toDate && entry.date > toDate) return false;
      return true;
    });

    return filtered.reverse(); // Newest first
  }, [entries, statusFilter, fromDate, toDate]);

  const filteredSum = useMemo(
    () => entriesWithRunningTotal.reduce((acc, e) => acc + e.totalHours, 0),
    [entriesWithRunningTotal]
  );

  const hasActiveFilters = statusFilter !== 'all' || fromDate !== '' || toDate !== '';

  const getRowClass = (entry: DTREntry) => {
    const date = parseLocalDate(entry.date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    if (entry.type === 'absent') {
      return 'bg-red-50/70 dark:bg-red-950/25 hover:bg-red-50 dark:hover:bg-red-950/40';
    }
    if (entry.type === 'holiday') {
      return 'bg-amber-50/70 dark:bg-amber-950/25 hover:bg-amber-50 dark:hover:bg-amber-950/40';
    }
    if (isWeekend) {
      return 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/35';
    }
    return 'hover:bg-slate-50/90 dark:hover:bg-slate-800/40';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Filter Toolbar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg self-start">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'regular', label: 'Regular' },
              { id: 'overtime', label: 'Overtime' },
              { id: 'holiday', label: 'Holiday' },
              { id: 'absent', label: 'Absent' },
            ] as { id: StatusFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
            <Filter size={13} /> Date Range:
          </span>
          <input
            type="date"
            aria-label="Filter from date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            aria-label="Filter to date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setFromDate('');
                setToDate('');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold">
              <th className="py-3 px-4">Date &amp; Day</th>
              <th className="py-3 px-4">Shift Window</th>
              <th className="py-3 px-4 text-right">Break</th>
              <th className="py-3 px-4 text-right">Net Hours</th>
              <th className="py-3 px-4 text-right">Running Total</th>
              <th className="py-3 px-4">Notes &amp; Status</th>
              <th className="py-3 px-4 text-right no-print">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {entriesWithRunningTotal.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar size={32} className="opacity-30" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {entries.length === 0
                        ? 'No time records logged yet'
                        : 'No records match your current search or filter'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {entries.length === 0
                        ? 'Add a single shift or generate a date range in Bulk Entry.'
                        : 'Try clearing the date range or switching the status filter.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              entriesWithRunningTotal.map((entry) => (
                <tr key={entry.id} className={`transition-colors ${getRowClass(entry)}`}>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-mono tabular-nums font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {formatDate(entry.date)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {getDayName(entry.date)}
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {entry.type === 'absent' ? (
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                        Absent — No shift logged
                      </span>
                    ) : (
                      <div className="font-mono tabular-nums text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                        <span>{formatTimeDisplay(entry.timeIn, config.timeFormat)}</span>
                        <span className="text-slate-400 mx-1.5">→</span>
                        <span>{formatTimeDisplay(entry.timeOut, config.timeFormat)}</span>
                      </div>
                    )}
                    {entry.isOvertime && (
                      <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mt-0.5">
                        Overtime{entry.overtimeReason ? ` · ${entry.overtimeReason}` : ''}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                    {entry.type === 'absent' ? '—' : `${entry.breakMinutes}m`}
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="font-mono tabular-nums font-bold text-sm text-blue-600 dark:text-blue-400">
                      {entry.totalHours.toFixed(1)} hrs
                    </div>
                    <div className="font-mono tabular-nums text-[11px] text-slate-400">
                      {formatDuration(entry.totalHours)}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right font-mono tabular-nums text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {entry.runningTotal.toFixed(1)} hrs
                  </td>

                  <td className="py-3 px-4 max-w-[240px]">
                    <div className="text-xs text-slate-700 dark:text-slate-300 truncate">
                      {entry.remarks || '—'}
                    </div>
                    {entry.type !== 'regular' && (
                      <div
                        className={`text-[11px] font-semibold capitalize mt-0.5 ${
                          entry.type === 'absent'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {entry.type}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right no-print">
                    <div className="inline-flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(entry)}
                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                        title="Edit record"
                        aria-label={`Edit record for ${entry.date}`}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDelete(entry)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        title="Delete record"
                        aria-label={`Delete record for ${entry.date}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {entriesWithRunningTotal.length > 0 && (
            <tfoot className="bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
              <tr>
                <td
                  colSpan={3}
                  className="py-3.5 px-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {hasActiveFilters ? 'Filtered Total:' : 'Total Completed Hours:'}
                </td>
                <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-base text-blue-600 dark:text-blue-400 whitespace-nowrap">
                  {filteredSum.toFixed(1)} hrs
                </td>
                <td colSpan={3} className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                  {entriesWithRunningTotal.length} record(s)
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
