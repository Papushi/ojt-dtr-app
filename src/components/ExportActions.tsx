import React from 'react';
import { FileText, Download, Printer, Table } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DTREntry, UserProfile, AppConfig } from '../types';
import { formatDate, getDayName } from '../utils/helpers';

interface ExportActionsProps {
  entries: DTREntry[];
  user: UserProfile | null;
  config: AppConfig;
}

export const ExportActions: React.FC<ExportActionsProps> = ({ entries, user, config }) => {
  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Daily Time Record (DTR)', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Student: ${user?.name || 'N/A'}`, 20, 35);
    doc.text(`Email: ${user?.email || 'N/A'}`, 20, 42);
    doc.text(`Supervisor: ${user?.supervisorName || '____________________'}`, 20, 49);
    doc.text(`Target Hours: ${config.targetHours} hrs`, 140, 35);
    doc.text(`Total Completed: ${entries.reduce((a, b) => a + b.totalHours, 0).toFixed(1)} hrs`, 140, 42);

    const tableData = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(e => [
      formatDate(e.date),
      getDayName(e.date),
      e.timeIn,
      e.timeOut,
      `${e.breakMinutes}m`,
      e.totalHours.toFixed(1),
      e.remarks
    ]);

    (doc as any).autoTable({
      startY: 60,
      head: [['Date', 'Day', 'In', 'Out', 'Break', 'Hours', 'Remarks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: [59, 130, 246] }
    });

    // Signature lines
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.text('__________________________', 40, finalY);
    doc.text('Student Signature', 45, finalY + 7);
    
    doc.text('__________________________', 130, finalY);
    doc.text('Supervisor Signature', 135, finalY + 7);

    doc.save(`DTR_${user?.name || 'OJT'}.pdf`);
  };

  const exportExcel = () => {
    const data = entries.map(e => ({
      Date: e.date,
      Day: getDayName(e.date),
      'Time In': e.timeIn,
      'Time Out': e.timeOut,
      'Break (min)': e.breakMinutes,
      'Total Hours': e.totalHours,
      Remarks: e.remarks
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DTR Records");
    XLSX.writeFile(wb, `DTR_${user?.name || 'OJT'}.xlsx`);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Day', 'Time In', 'Time Out', 'Break', 'Hours', 'Remarks'];
    const rows = entries.map(e => [
      e.date,
      getDayName(e.date),
      e.timeIn,
      e.timeOut,
      e.breakMinutes,
      e.totalHours,
      `"${e.remarks.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `DTR_${user?.name || 'OJT'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={exportPDF}
        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-md shadow-red-100"
      >
        <FileText size={18} /> Export PDF
      </button>
      <button
        onClick={exportExcel}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-100"
      >
        <Table size={18} /> Excel
      </button>
      <button
        onClick={exportCSV}
        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-md shadow-slate-200"
      >
        <Download size={18} /> CSV
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-all shadow-sm"
      >
        <Printer size={18} /> Print
      </button>
    </div>
  );
};
