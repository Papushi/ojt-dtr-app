import React, { useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  Table as TableIcon,
  Upload,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DTREntry, UserProfile, AppConfig } from '../types';
import {
  formatDate,
  getDayName,
  formatTimeDisplay,
  parseLocalDate,
  parseCSVEntries,
} from '../utils/helpers';

interface ExportActionsProps {
  entries: DTREntry[];
  user: UserProfile | null;
  config: AppConfig;
  showBackupControls?: boolean;
  onImportEntries?: (imported: DTREntry[]) => void;
  onNotify: (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => void;
}

export const ExportActions: React.FC<ExportActionsProps> = ({
  entries,
  user,
  config,
  showBackupControls = false,
  onImportEntries,
  onNotify,
}) => {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const sortedAscending = [...entries].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  );

  const exportPDF = () => {
    if (entries.length === 0) {
      onNotify('warning', 'No records to export', 'Add at least one DTR entry before exporting.');
      return;
    }

    const doc = new jsPDF();
    const totalHours = entries.reduce((a, b) => a + b.totalHours, 0);

    doc.setFontSize(18);
    doc.text('Daily Time Record (DTR)', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Student: ${user?.name || 'OJT Student'}`, 16, 30);
    doc.text(`Email: ${user?.email || 'N/A'}`, 16, 36);
    doc.text(`Department: ${user?.department || 'N/A'}`, 16, 42);
    doc.text(`Supervisor: ${user?.supervisorName || '____________________'}`, 16, 48);

    doc.text(`Required Hours: ${config.targetHours} hrs`, 135, 30);
    doc.text(`Completed Hours: ${totalHours.toFixed(1)} hrs`, 135, 36);
    doc.text(
      `Completion: ${Math.min(100, (totalHours / config.targetHours) * 100).toFixed(1)}%`,
      135,
      42
    );
    doc.text(`Category: ${user?.trainingCategory || 'N/A'}`, 135, 48);

    let running = 0;
    const tableData = sortedAscending.map((e) => {
      running += e.totalHours;
      return [
        formatDate(e.date),
        getDayName(e.date, true),
        e.type === 'absent' ? 'ABSENT' : formatTimeDisplay(e.timeIn, config.timeFormat),
        e.type === 'absent' ? 'ABSENT' : formatTimeDisplay(e.timeOut, config.timeFormat),
        e.type === 'absent' ? '0m' : `${e.breakMinutes}m`,
        e.totalHours.toFixed(1),
        running.toFixed(1),
        e.remarks || '—',
      ];
    });

    autoTable(doc, {
      startY: 56,
      head: [['Date', 'Day', 'In', 'Out', 'Break', 'Hours', 'Total', 'Remarks']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    const finalY = ((doc as any).lastAutoTable?.finalY || 120) + 24;
    const pageHeight = doc.internal.pageSize.getHeight();
    const sigY = finalY > pageHeight - 25 ? pageHeight - 25 : finalY;

    doc.setFontSize(10);
    doc.text('______________________________', 24, sigY);
    doc.text('Student Signature', 36, sigY + 6);

    doc.text('______________________________', 126, sigY);
    doc.text('Supervisor Signature', 136, sigY + 6);

    doc.save(`DTR_${(user?.name || 'OJT').replace(/\s+/g, '_')}.pdf`);
    onNotify('success', 'PDF downloaded', 'Supervisor-ready DTR report exported.');
  };

  const exportExcel = () => {
    if (entries.length === 0) {
      onNotify('warning', 'No records to export', 'Add at least one DTR entry before exporting.');
      return;
    }

    const data = sortedAscending.map((e) => ({
      Date: e.date,
      Day: getDayName(e.date),
      'Time In': e.type === 'absent' ? 'ABSENT' : formatTimeDisplay(e.timeIn, config.timeFormat),
      'Time Out': e.type === 'absent' ? 'ABSENT' : formatTimeDisplay(e.timeOut, config.timeFormat),
      'Break (min)': e.breakMinutes,
      'Total Hours': e.totalHours,
      Type: e.type,
      Overtime: e.isOvertime ? 'Yes' : 'No',
      Remarks: e.remarks,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DTR Records');
    XLSX.writeFile(wb, `DTR_${(user?.name || 'OJT').replace(/\s+/g, '_')}.xlsx`);
    onNotify('success', 'Excel workbook exported');
  };

  const exportCSV = () => {
    if (entries.length === 0) {
      onNotify('warning', 'No records to export', 'Add at least one DTR entry before exporting.');
      return;
    }

    const headers = ['Date', 'Day', 'Time In', 'Time Out', 'Break', 'Hours', 'Remarks', 'Type'];
    const rows = sortedAscending.map((e) => [
      e.date,
      getDayName(e.date),
      e.timeIn,
      e.timeOut,
      e.breakMinutes,
      e.totalHours,
      `"${(e.remarks || '').replace(/"/g, '""')}"`,
      e.type,
    ]);

    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    downloadTextFile(csvContent, `DTR_${(user?.name || 'OJT').replace(/\s+/g, '_')}.csv`, 'text/csv;charset=utf-8;');
    onNotify('success', 'CSV exported');
  };

  const downloadCSVTemplate = () => {
    const sample = [
      'Date,Day,Time In,Time Out,Break,Hours,Remarks,Type',
      '2026-11-02,Monday,07:00,17:00,60,9.0,"IT Department Orientation",regular',
      '2026-11-03,Tuesday,08:00,17:00,60,8.0,"Frontend Dashboard Tasks",regular',
    ].join('\n');
    downloadTextFile(sample, 'DTR_Import_Template.csv', 'text/csv;charset=utf-8;');
    onNotify('info', 'Template downloaded', 'Fill in your dates and re-import via Import CSV.');
  };

  const exportJSONBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      config,
      entries,
    };
    downloadTextFile(
      JSON.stringify(payload, null, 2),
      `DTR_Backup_${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
    onNotify('success', 'JSON backup downloaded');
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportEntries) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCSVEntries(text);
      if (parsed.length === 0) {
        onNotify('error', 'Import failed', 'Could not detect valid DTR rows in that CSV.');
      } else {
        onImportEntries(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleJSONUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportEntries) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const list: DTREntry[] = Array.isArray(parsed) ? parsed : parsed.entries;
        if (!Array.isArray(list) || list.length === 0) {
          onNotify('error', 'Invalid backup file', 'No DTR entries were found in the JSON file.');
          return;
        }
        onImportEntries(list);
      } catch {
        onNotify('error', 'Invalid JSON file', 'Could not parse the selected backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <button
        type="button"
        onClick={exportPDF}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
      >
        <FileText size={15} />
        Export PDF
      </button>
      <button
        type="button"
        onClick={exportExcel}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
      >
        <TableIcon size={15} className="text-emerald-600 dark:text-emerald-400" />
        Excel
      </button>
      <button
        type="button"
        onClick={exportCSV}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
      >
        <Download size={15} />
        CSV
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
      >
        <Printer size={15} />
        Print
      </button>

      {showBackupControls && onImportEntries && (
        <>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleJSONUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Upload size={15} />
            Import CSV
          </button>
          <button
            type="button"
            onClick={downloadCSVTemplate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet size={15} />
            CSV Template
          </button>
          <button
            type="button"
            onClick={exportJSONBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <FileJson size={15} />
            Backup JSON
          </button>
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Upload size={15} />
            Restore JSON
          </button>
        </>
      )}
    </div>
  );
};

function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
