import React, { useState, useEffect } from 'react';
import { PlusCircle, Clock, Save, RotateCcw } from 'lucide-react';
import { DTREntry, DraftEntry } from '../types';
import { calculateHours } from '../utils/helpers';

interface EntryFormProps {
  onAdd: (entry: DTREntry) => void;
  initialData?: Partial<DTREntry>;
}

export const EntryForm: React.FC<EntryFormProps> = ({ onAdd, initialData }) => {
  const [formData, setFormData] = useState<Partial<DTREntry>>({
    date: new Date().toISOString().split('T')[0],
    timeIn: '07:00',
    timeOut: '17:00',
    breakMinutes: 60,
    isOvertime: false,
    overtimeReason: '',
    remarks: '',
    type: 'regular',
    ...initialData
  });

  const [lastDraft, setLastDraft] = useState<DraftEntry | null>(null);

  useEffect(() => {
    const savedDraft = localStorage.getItem('dtr_draft');
    if (savedDraft) {
      setLastDraft(JSON.parse(savedDraft));
    }

    const interval = setInterval(() => {
      saveDraft();
    }, 30000);

    return () => clearInterval(interval);
  }, [formData]);

  const saveDraft = () => {
    const draft: DraftEntry = { ...formData, lastSaved: Date.now() };
    localStorage.setItem('dtr_draft', JSON.stringify(draft));
    setLastDraft(draft);
  };

  const loadDraft = () => {
    if (lastDraft) {
      const { lastSaved, ...data } = lastDraft;
      setFormData(data);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = calculateHours(formData.timeIn!, formData.timeOut!, formData.breakMinutes!);
    
    if (hours > 16) {
      alert("Maximum 16 hours per day allowed.");
      return;
    }

    onAdd({
      ...formData as DTREntry,
      id: crypto.randomUUID(),
      totalHours: hours,
    });
    
    // Reset but keep some defaults
    setFormData(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0],
      remarks: '',
      isOvertime: false,
      overtimeReason: '',
    }));
    localStorage.removeItem('dtr_draft');
    setLastDraft(null);
  };

  const setPreset = (inTime: string, outTime: string) => {
    setFormData(prev => ({ ...prev, timeIn: inTime, timeOut: outTime }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <PlusCircle className="text-blue-500" size={20} />
          New Entry
        </h3>
        <div className="flex gap-2">
          {lastDraft && (
            <button
              type="button"
              onClick={loadDraft}
              className="text-xs flex items-center gap-1 text-slate-500 hover:text-blue-500 transition-colors"
            >
              <RotateCcw size={14} /> Load Draft
            </button>
          )}
          <button
            type="button"
            onClick={saveDraft}
            className="text-xs flex items-center gap-1 text-slate-500 hover:text-blue-500 transition-colors"
          >
            <Save size={14} /> Save Draft
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Date</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Type</label>
          <select
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="regular">Regular Work</option>
            <option value="holiday">Holiday</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Time In</label>
          <input
            type="time"
            required
            value={formData.timeIn}
            onChange={e => setFormData({ ...formData, timeIn: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Time Out</label>
          <input
            type="time"
            required
            value={formData.timeOut}
            onChange={e => setFormData({ ...formData, timeOut: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Break (minutes)</label>
          <input
            type="number"
            required
            min="0"
            max="360"
            value={formData.breakMinutes}
            onChange={e => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-end gap-2 pb-1">
          <button type="button" onClick={() => setPreset('07:00', '17:00')} className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors">7-5</button>
          <button type="button" onClick={() => setPreset('08:00', '17:00')} className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors">8-5</button>
          <button type="button" onClick={() => setPreset('09:00', '18:00')} className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors">9-6</button>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ot"
              checked={formData.isOvertime}
              onChange={e => setFormData({ ...formData, isOvertime: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="ot" className="text-sm font-medium text-slate-600 dark:text-slate-400">Overtime</label>
          </div>
          
          {formData.isOvertime && (
            <input
              type="text"
              placeholder="Reason for overtime..."
              value={formData.overtimeReason}
              onChange={e => setFormData({ ...formData, overtimeReason: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Remarks / Location</label>
            <textarea
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
              placeholder="e.g. IT Department, Office Work..."
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
      >
        <PlusCircle size={20} />
        Add Record
      </button>
    </form>
  );
};
