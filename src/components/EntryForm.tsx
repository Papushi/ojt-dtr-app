import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle,
  Save,
  RotateCcw,
  Clock,
  AlertTriangle,
  Moon,
  Check,
  X,
} from 'lucide-react';
import { DTREntry, DraftEntry, AppConfig, EntryType } from '../types';
import {
  calculateHours,
  formatDuration,
  isMidnightCrossing,
  toLocalDateString,
} from '../utils/helpers';

interface EntryFormProps {
  onAdd: (entry: DTREntry) => void;
  onCancelEdit?: () => void;
  initialData?: DTREntry | null;
  existingDates: string[];
  config: AppConfig;
  userId?: string;
  onNotify: (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => void;
}

const DRAFTS_LIMIT = 5;

export const EntryForm: React.FC<EntryFormProps> = ({
  onAdd,
  onCancelEdit,
  initialData,
  existingDates,
  config,
  userId = 'guest',
  onNotify,
}) => {
  const draftsKey = `dtr_drafts_${userId}`;

  const defaultFormState = (): Partial<DTREntry> => ({
    date: toLocalDateString(new Date()),
    timeIn: '07:00',
    timeOut: '17:00',
    breakMinutes: 60,
    isOvertime: false,
    overtimeReason: '',
    remarks: '',
    type: 'regular',
  });

  const [formData, setFormData] = useState<Partial<DTREntry>>(() =>
    initialData ? { ...initialData } : defaultFormState()
  );

  const [drafts, setDrafts] = useState<DraftEntry[]>(() => {
    try {
      const saved = localStorage.getItem(draftsKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<number | null>(null);

  // Sync when switching into/out of edit mode
  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData(defaultFormState());
    }
  }, [initialData]);

  // Reload user drafts when userId changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftsKey);
      setDrafts(saved ? JSON.parse(saved) : []);
    } catch {
      setDrafts([]);
    }
  }, [draftsKey]);

  const persistDraft = (showToast = false) => {
    if (initialData) return; // Don't overwrite drafts while editing a saved record
    const draft: DraftEntry = {
      ...formData,
      draftId: crypto.randomUUID(),
      lastSaved: Date.now(),
      label: `${formData.date || 'No date'} · ${formData.timeIn || ''}-${formData.timeOut || ''}`,
    };
    setDrafts((prev) => {
      const updated = [draft, ...prev].slice(0, DRAFTS_LIMIT);
      localStorage.setItem(draftsKey, JSON.stringify(updated));
      return updated;
    });
    setLastAutoSavedAt(draft.lastSaved);
    if (showToast) {
      onNotify('info', 'Draft saved', 'Your current entry has been saved locally.');
    }
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (initialData) return;
    const interval = setInterval(() => {
      const autoDraft: DraftEntry = {
        ...formData,
        draftId: 'autosave',
        lastSaved: Date.now(),
        label: `Auto-saved · ${formData.date || ''}`,
      };
      setDrafts((prev) => {
        const withoutOldAuto = prev.filter((d) => d.draftId !== 'autosave');
        const updated = [autoDraft, ...withoutOldAuto].slice(0, DRAFTS_LIMIT);
        localStorage.setItem(draftsKey, JSON.stringify(updated));
        return updated;
      });
      setLastAutoSavedAt(autoDraft.lastSaved);
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, initialData, draftsKey]);

  const loadDraft = (draft: DraftEntry) => {
    const { draftId, lastSaved, label, ...rest } = draft;
    setFormData(rest);
    onNotify('info', 'Draft restored', `Loaded draft from ${new Date(lastSaved).toLocaleTimeString()}`);
  };

  const calculatedHours = useMemo(() => {
    return calculateHours(
      formData.timeIn || '',
      formData.timeOut || '',
      Number(formData.breakMinutes || 0),
      (formData.type as EntryType) || 'regular',
      config.roundTo15Min
    );
  }, [formData.timeIn, formData.timeOut, formData.breakMinutes, formData.type, config.roundTo15Min]);

  const crossesMidnight = useMemo(
    () => isMidnightCrossing(formData.timeIn || '', formData.timeOut || ''),
    [formData.timeIn, formData.timeOut]
  );

  const isDuplicateDate = useMemo(() => {
    if (!formData.date) return false;
    if (initialData && initialData.date === formData.date) return false;
    return existingDates.includes(formData.date);
  }, [formData.date, existingDates, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date) {
      onNotify('error', 'Missing date', 'Please select a valid date.');
      return;
    }

    const breakMin = Number(formData.breakMinutes || 0);
    if (breakMin < 0 || breakMin > 360) {
      onNotify('error', 'Invalid break duration', 'Break time must be between 0 and 360 minutes (6 hours).');
      return;
    }

    if (formData.type !== 'absent' && calculatedHours > 16) {
      onNotify('error', 'Exceeds daily maximum', 'Maximum 16 net hours per day is allowed.');
      return;
    }

    if (formData.type === 'regular' && calculatedHours < 1) {
      onNotify(
        'warning',
        'Less than 1 hour logged',
        'Regular shifts under 1 hour should usually be marked as Absent or adjusted.'
      );
    }

    onAdd({
      id: initialData?.id || crypto.randomUUID(),
      date: formData.date,
      timeIn: formData.timeIn || '07:00',
      timeOut: formData.timeOut || '17:00',
      breakMinutes: breakMin,
      isOvertime: Boolean(formData.isOvertime),
      overtimeReason: formData.isOvertime ? formData.overtimeReason || '' : '',
      remarks: formData.remarks || '',
      type: (formData.type as EntryType) || 'regular',
      totalHours: calculatedHours,
    });

    if (!initialData) {
      setFormData(defaultFormState());
    }
  };

  const setPreset = (timeIn: string, timeOut: string, breakMinutes = 60) => {
    setFormData((prev) => ({ ...prev, timeIn, timeOut, breakMinutes }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6"
    >
      {/* Form Header & Draft Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {initialData ? 'Edit Time Record' : 'Log Daily Time Record'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lastAutoSavedAt
              ? `Auto-saved at ${new Date(lastAutoSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Net hours calculate automatically after break deduction'}
          </p>
        </div>

        {!initialData && (
          <div className="flex items-center gap-2">
            {drafts.length > 0 && (
              <div className="relative">
                <select
                  aria-label="Load saved draft"
                  defaultValue=""
                  onChange={(e) => {
                    const selected = drafts.find((d) => d.draftId === e.target.value);
                    if (selected) loadDraft(selected);
                    e.target.value = '';
                  }}
                  className="pl-3 pr-7 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Load Draft ({drafts.length})
                  </option>
                  {drafts.map((d) => (
                    <option key={d.draftId} value={d.draftId}>
                      {d.label || new Date(d.lastSaved).toLocaleTimeString()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={() => persistDraft(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Save size={14} />
              Save Draft
            </button>
          </div>
        )}
      </div>

      {/* Duplicate date notice */}
      {isDuplicateDate && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            An entry already exists for <strong>{formData.date}</strong>. You can still save if
            recording a split shift, or edit the existing entry from the ledger.
          </span>
        </div>
      )}

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Quick Shift Presets
        </span>
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          {[
            { label: '7 AM – 5 PM', in: '07:00', out: '17:00' },
            { label: '8 AM – 5 PM', in: '08:00', out: '17:00' },
            { label: '9 AM – 6 PM', in: '09:00', out: '18:00' },
            { label: '10 PM – 6 AM', in: '22:00', out: '06:00' },
          ].map((preset) => {
            const active =
              formData.timeIn === preset.in && formData.timeOut === preset.out;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setPreset(preset.in, preset.out)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Date
          </label>
          <input
            type="date"
            required
            value={formData.date || ''}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Entry Type
          </label>
          <select
            value={formData.type || 'regular'}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as EntryType })
            }
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value="regular">Regular Work</option>
            <option value="holiday">Holiday</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Time In
          </label>
          <input
            type="time"
            required
            disabled={formData.type === 'absent'}
            value={formData.timeIn || ''}
            onChange={(e) => setFormData({ ...formData, timeIn: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Time Out
          </label>
          <input
            type="time"
            required
            disabled={formData.type === 'absent'}
            value={formData.timeOut || ''}
            onChange={(e) => setFormData({ ...formData, timeOut: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Break Duration (minutes)
          </label>
          <input
            type="number"
            required
            min="0"
            max="360"
            disabled={formData.type === 'absent'}
            value={formData.breakMinutes ?? 60}
            onChange={(e) =>
              setFormData({
                ...formData,
                breakMinutes: e.target.value === '' ? 0 : parseInt(e.target.value, 10),
              })
            }
            className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
          />
        </div>

        {/* Live Net Hours Calculation Summary */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Calculated Net Hours
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {crossesMidnight && formData.type !== 'absent' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  <Moon size={12} /> Overnight shift
                </span>
              )}
              {!crossesMidnight && (
                <span className="text-[11px] text-slate-400">
                  After {formData.breakMinutes || 0}m break
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p
              className={`font-mono tabular-nums text-lg font-bold ${
                calculatedHours > 16
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {calculatedHours.toFixed(2)} hrs
            </p>
            <p className="font-mono tabular-nums text-[11px] text-slate-400">
              {formatDuration(calculatedHours)}
            </p>
          </div>
        </div>
      </div>

      {/* Overtime & Remarks */}
      <div className="space-y-4 pt-2">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(formData.isOvertime)}
            onChange={(e) =>
              setFormData({ ...formData, isOvertime: e.target.checked })
            }
            className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Include Overtime
          </span>
        </label>

        {formData.isOvertime && (
          <input
            type="text"
            placeholder="Reason for overtime (e.g., System deployment, inventory audit)"
            value={formData.overtimeReason || ''}
            onChange={(e) =>
              setFormData({ ...formData, overtimeReason: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Location / Task Notes
          </label>
          <textarea
            value={formData.remarks || ''}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all h-24 resize-none"
            placeholder="e.g., IT Department — Frontend dashboard development & QA testing"
          />
        </div>
      </div>

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          type="submit"
          className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
        >
          {initialData ? <Check size={18} /> : <PlusCircle size={18} />}
          {initialData ? 'Save Changes' : 'Add Time Record'}
        </button>

        {initialData && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={18} />
            Cancel
          </button>
        )}

        {!initialData && (
          <button
            type="button"
            onClick={() => setFormData(defaultFormState())}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        )}
      </div>
    </form>
  );
};
