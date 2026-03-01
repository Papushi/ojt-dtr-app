import React, { useState } from 'react';
import { Layers, Calendar, Check, AlertTriangle } from 'lucide-react';
import { DTREntry } from '../types';
import { calculateHours } from '../utils/helpers';

interface BulkEntryProps {
  onAddMultiple: (entries: DTREntry[]) => void;
}

export const BulkEntry: React.FC<BulkEntryProps> = ({ onAddMultiple }) => {
  const [range, setRange] = useState({
    from: '',
    to: '',
    timeIn: '07:00',
    timeOut: '17:00',
    breakMinutes: 60,
    skipWeekends: true,
    remarks: 'Regular OJT Work',
  });

  const [preview, setPreview] = useState<DTREntry[]>([]);

  const generatePreview = () => {
    if (!range.from || !range.to) return;

    const start = new Date(range.from);
    const end = new Date(range.to);
    const entries: DTREntry[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (range.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

      const dateStr = d.toISOString().split('T')[0];
      const hours = calculateHours(range.timeIn, range.timeOut, range.breakMinutes);

      entries.push({
        id: crypto.randomUUID(),
        date: dateStr,
        timeIn: range.timeIn,
        timeOut: range.timeOut,
        breakMinutes: range.breakMinutes,
        isOvertime: false,
        remarks: range.remarks,
        type: 'regular',
        totalHours: hours,
      });
    }
    setPreview(entries);
  };

  const handleSave = () => {
    onAddMultiple(preview);
    setPreview([]);
    setRange(prev => ({ ...prev, from: '', to: '' }));
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <Layers className="text-indigo-500" size={20} />
        Bulk Import
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600">From Date</label>
          <input
            type="date"
            value={range.from}
            onChange={e => setRange({ ...range, from: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600">To Date</label>
          <input
            type="date"
            value={range.to}
            onChange={e => setRange({ ...range, to: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600">Default Time In</label>
          <input
            type="time"
            value={range.timeIn}
            onChange={e => setRange({ ...range, timeIn: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600">Default Time Out</label>
          <input
            type="time"
            value={range.timeOut}
            onChange={e => setRange({ ...range, timeOut: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="skip"
            checked={range.skipWeekends}
            onChange={e => setRange({ ...range, skipWeekends: e.target.checked })}
            className="w-4 h-4 text-indigo-600"
          />
          <label htmlFor="skip" className="text-sm font-medium text-slate-600">Skip Weekends</label>
        </div>
      </div>

      <button
        onClick={generatePreview}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all mb-6"
      >
        Generate Preview
      </button>

      {preview.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">{preview.length} entries to be added</p>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
            >
              <Check size={16} /> Confirm & Save All
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Hours</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((entry, idx) => (
                  <tr key={idx} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3">{entry.date}</td>
                    <td className="p-3 font-mono">{entry.totalHours.toFixed(1)}</td>
                    <td className="p-3">
                      <button 
                        onClick={() => setPreview(preview.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
