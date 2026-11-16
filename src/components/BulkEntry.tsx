import React, { useState, useMemo } from 'react';
import { Layers, Check, Trash2, AlertTriangle, CalendarRange } from 'lucide-react';
import { DTREntry, AppConfig, EntryType } from '../types';
import {
  calculateHours,
  getDayName,
  parseLocalDate,
  toLocalDateString,
} from '../utils/helpers';

interface BulkEntryProps {
  onAddMultiple: (entries: DTREntry[]) => void;
  existingDates: string[];
  config: AppConfig;
  onNotify: (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => void;
}

export const BulkEntry: React.FC<BulkEntryProps> = ({
  onAddMultiple,
  existingDates,
  config,
  onNotify,
}) => {
  const [range, setRange] = useState({
    from: '',
    to: '',
    timeIn: '07:00',
    timeOut: '17:00',
    breakMinutes: 60,
    skipWeekends: true,
    skipDuplicates: true,
    holidaysText: '',
    remarks: 'Regular OJT Work',
  });

  const [preview, setPreview] = useState<DTREntry[]>([]);

  const generatePreview = () => {
    if (!range.from || !range.to) {
      onNotify('error', 'Select date range', 'Please choose both a start date and an end date.');
      return;
    }

    const start = parseLocalDate(range.from);
    const end = parseLocalDate(range.to);

    if (start > end) {
      onNotify('error', 'Invalid date range', 'Start date must be before or equal to end date.');
      return;
    }

    const holidaySet = new Set(
      range.holidaysText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );

    const existingSet = new Set(existingDates);
    const entries: DTREntry[] = [];
    let skippedDupes = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (range.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

      const dateStr = toLocalDateString(d);
      if (range.skipDuplicates && existingSet.has(dateStr)) {
        skippedDupes++;
        continue;
      }

      const isHoliday = holidaySet.has(dateStr);
      const type: EntryType = isHoliday ? 'holiday' : 'regular';
      const hours = isHoliday
        ? 0
        : calculateHours(
            range.timeIn,
            range.timeOut,
            range.breakMinutes,
            type,
            config.roundTo15Min
          );

      entries.push({
        id: crypto.randomUUID(),
        date: dateStr,
        timeIn: range.timeIn,
        timeOut: range.timeOut,
        breakMinutes: range.breakMinutes,
        isOvertime: false,
        overtimeReason: '',
        remarks: isHoliday ? 'Holiday' : range.remarks,
        type,
        totalHours: hours,
      });
    }

    if (entries.length === 0) {
      onNotify(
        'warning',
        'No entries generated',
        skippedDupes > 0
          ? `All ${skippedDupes} matching dates already exist in your ledger.`
          : 'No matching weekdays found in the selected range.'
      );
      setPreview([]);
      return;
    }

    setPreview(entries);
    if (skippedDupes > 0) {
      onNotify(
        'info',
        `Generated ${entries.length} entries`,
        `Skipped ${skippedDupes} date(s) already present in your DTR.`
      );
    }
  };

  const updatePreviewRow = (
    idx: number,
    patch: Partial<Pick<DTREntry, 'timeIn' | 'timeOut' | 'breakMinutes' | 'type' | 'remarks'>>
  ) => {
    setPreview((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, ...patch };
        const hours = calculateHours(
          next.timeIn,
          next.timeOut,
          next.breakMinutes,
          next.type,
          config.roundTo15Min
        );
        return { ...next, totalHours: hours };
      })
    );
  };

  const totalPreviewHours = useMemo(
    () => preview.reduce((sum, e) => sum + e.totalHours, 0),
    [preview]
  );

  const handleSave = () => {
    if (preview.length === 0) return;
    onAddMultiple(preview);
    setPreview([]);
    setRange((prev) => ({ ...prev, from: '', to: '' }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarRange size={19} className="text-blue-600 dark:text-blue-400" />
              Bulk Date Range Generator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generate multiple DTR rows at once, then customize individual days before saving.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              From Date
            </label>
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              To Date
            </label>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Default Break (min)
            </label>
            <input
              type="number"
              min="0"
              max="360"
              value={range.breakMinutes}
              onChange={(e) =>
                setRange({
                  ...range,
                  breakMinutes: e.target.value === '' ? 0 : parseInt(e.target.value, 10),
                })
              }
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Default Time In
            </label>
            <input
              type="time"
              value={range.timeIn}
              onChange={(e) => setRange({ ...range, timeIn: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Default Time Out
            </label>
            <input
              type="time"
              value={range.timeOut}
              onChange={(e) => setRange({ ...range, timeOut: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Default Remarks
            </label>
            <input
              type="text"
              value={range.remarks}
              onChange={(e) => setRange({ ...range, remarks: e.target.value })}
              placeholder="e.g., Office OJT Work"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Holiday Dates (optional, comma-separated YYYY-MM-DD)
            </label>
            <input
              type="text"
              value={range.holidaysText}
              onChange={(e) => setRange({ ...range, holidaysText: e.target.value })}
              placeholder="e.g., 2026-11-30, 2026-12-25"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-5 pt-4 md:pt-5">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={range.skipWeekends}
                onChange={(e) => setRange({ ...range, skipWeekends: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700"
              />
              <span>Skip Weekends</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={range.skipDuplicates}
                onChange={(e) => setRange({ ...range, skipDuplicates: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700"
              />
              <span>Skip Existing Dates</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={generatePreview}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
        >
          <Layers size={17} />
          Generate Preview Entries
        </button>
      </div>

      {/* Inline-Editable Preview Table */}
      {preview.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Preview &amp; Override ({preview.length} days ·{' '}
                <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400">
                  {totalPreviewHours.toFixed(1)} hrs total
                </span>
                )
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Adjust individual shift times, break minutes, or mark specific days as Holiday or
                Absent before saving.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <Check size={15} />
              Confirm &amp; Save All
            </button>
          </div>

          <div className="max-h-96 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Time In</th>
                  <th className="py-2.5 px-3 font-semibold">Time Out</th>
                  <th className="py-2.5 px-3 font-semibold">Break (m)</th>
                  <th className="py-2.5 px-3 font-semibold">Remarks</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Hours</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {preview.map((entry, idx) => {
                  const isDupe = existingDates.includes(entry.date);
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {entry.date}
                          {isDupe && (
                            <span title="Date already exists in DTR">
                              <AlertTriangle size={13} className="text-amber-500" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {getDayName(entry.date, true)}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={entry.type}
                          onChange={(e) =>
                            updatePreviewRow(idx, { type: e.target.value as EntryType })
                          }
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                        >
                          <option value="regular">Regular</option>
                          <option value="holiday">Holiday</option>
                          <option value="absent">Absent</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="time"
                          disabled={entry.type === 'absent'}
                          value={entry.timeIn}
                          onChange={(e) => updatePreviewRow(idx, { timeIn: e.target.value })}
                          className="px-2 py-1 font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 disabled:opacity-40"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="time"
                          disabled={entry.type === 'absent'}
                          value={entry.timeOut}
                          onChange={(e) => updatePreviewRow(idx, { timeOut: e.target.value })}
                          className="px-2 py-1 font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 disabled:opacity-40"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          max="360"
                          disabled={entry.type === 'absent'}
                          value={entry.breakMinutes}
                          onChange={(e) =>
                            updatePreviewRow(idx, {
                              breakMinutes:
                                e.target.value === '' ? 0 : parseInt(e.target.value, 10),
                            })
                          }
                          className="w-16 px-2 py-1 font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 disabled:opacity-40"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={entry.remarks}
                          onChange={(e) => updatePreviewRow(idx, { remarks: e.target.value })}
                          className="w-36 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                        {entry.totalHours.toFixed(1)}h
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setPreview(preview.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                          aria-label={`Remove ${entry.date}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
