import React from 'react';
import { Edit2, Trash2, Clock, MapPin, Calendar } from 'lucide-react';
import { DTREntry } from '../types';
import { formatDate, getDayName, formatDuration } from '../utils/helpers';

interface DTRTableProps {
  entries: DTREntry[];
  onDelete: (id: string) => void;
  onEdit: (entry: DTREntry) => void;
}

export const DTRTable: React.FC<DTRTableProps> = ({ entries, onDelete, onEdit }) => {
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let runningTotal = 0;
  const entriesWithRunningTotal = [...sortedEntries].reverse().map(entry => {
    runningTotal += entry.totalHours;
    return { ...entry, runningTotal };
  }).reverse();

  const getRowClass = (entry: DTREntry) => {
    const date = new Date(entry.date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    if (entry.type === 'absent') return 'bg-red-50 dark:bg-red-900/20';
    if (entry.type === 'holiday') return 'bg-amber-50 dark:bg-amber-900/20';
    if (isWeekend) return 'bg-blue-50/50 dark:bg-blue-900/10';
    return 'hover:bg-slate-50 dark:hover:bg-slate-800/50';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th className="p-4">Date & Day</th>
              <th className="p-4">Time In/Out</th>
              <th className="p-4 text-center">Break</th>
              <th className="p-4 text-center">Hours</th>
              <th className="p-4 text-center">Running Total</th>
              <th className="p-4">Remarks</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {entriesWithRunningTotal.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar size={48} className="opacity-20" />
                    <p>No records found. Start by adding your first entry!</p>
                  </div>
                </td>
              </tr>
            ) : (
              entriesWithRunningTotal.map((entry) => (
                <tr key={entry.id} className={`transition-colors ${getRowClass(entry)}`}>
                  <td className="p-4">
                    <div className="font-semibold text-sm">{formatDate(entry.date)}</div>
                    <div className="text-xs text-slate-500">{getDayName(entry.date)}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className="text-slate-400" />
                      <span className="font-mono">{entry.timeIn}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-mono">{entry.timeOut}</span>
                    </div>
                    {entry.isOvertime && (
                      <span className="mt-1 inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">
                        OT: {entry.overtimeReason || 'Yes'}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center text-sm font-medium text-slate-500">
                    {entry.breakMinutes}m
                  </td>
                  <td className="p-4 text-center">
                    <div className="font-bold text-blue-600">{entry.totalHours.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-400">({formatDuration(entry.totalHours)})</div>
                  </td>
                  <td className="p-4 text-center font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
                    {entry.runningTotal.toFixed(1)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-start gap-2 max-w-[200px]">
                      <MapPin size={14} className="text-slate-400 mt-1 shrink-0" />
                      <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {entry.remarks || '---'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(entry)}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this record?')) {
                            onDelete(entry.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {entriesWithRunningTotal.length > 0 && (
            <tfoot className="bg-slate-50 dark:bg-slate-800/30">
              <tr>
                <td colSpan={3} className="p-4 text-right font-bold text-slate-500 uppercase text-xs">Total Completed Hours:</td>
                <td className="p-4 text-center font-black text-xl text-blue-600">{runningTotal.toFixed(1)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
