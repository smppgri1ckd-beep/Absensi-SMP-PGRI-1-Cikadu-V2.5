import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, Download, Calendar, Filter, Printer, CheckCircle2 } from 'lucide-react';
import { DB } from '../services/db';
import { AttendanceRecord } from '../types';
import { exportAttendanceToExcel } from '../utils/exportExcel';
import { exportAttendanceToPdf } from '../utils/exportPdf';
import { useToast } from '../context/ToastContext';

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setRecords(DB.getAttendance());
  }, []);

  const filtered = records.filter((r) => {
    const matchClass = selectedClass === 'all' || r.className === selectedClass;
    const matchDate = !selectedDate || r.date === selectedDate;
    return matchClass && matchDate;
  });

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'error');
      return;
    }
    exportAttendanceToExcel(filtered, `Rekap_Presensi_${selectedClass}_${selectedDate}`);
    showToast('Laporan Excel berhasil diunduh', 'success');
  };

  const handleExportPdf = () => {
    if (filtered.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'error');
      return;
    }
    exportAttendanceToPdf(filtered, `Laporan Presensi Siswa Kelas ${selectedClass === 'all' ? 'Seluruh' : selectedClass}`);
    showToast('Laporan PDF resmi berhasil dibuat', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Rekap & Laporan Presensi Resmi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cetak rekap kehadiran berkala format Excel dan PDF siap cetak dengan kop sekolah
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Cetak PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tanggal Rekap:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pilih Kelas:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
          >
            <option value="all">Semua Kelas</option>
            <option value="7A">Kelas 7A</option>
            <option value="7B">Kelas 7B</option>
            <option value="8A">Kelas 8A</option>
            <option value="8B">Kelas 8B</option>
            <option value="9A">Kelas 9A</option>
            <option value="9B">Kelas 9B</option>
          </select>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Preview Data Terpilih: {filtered.length} Catatan
          </span>
          <span className="text-xs text-slate-500">
            Hadir: {filtered.filter(r => r.status === 'hadir').length} • Terlambat: {filtered.filter(r => r.status === 'terlambat').length}
          </span>
        </div>

        <div className="overflow-x-auto smooth-touch-scroll">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Tanggal</th>
                <th className="py-2.5 px-4">Jam</th>
                <th className="py-2.5 px-4">NISN</th>
                <th className="py-2.5 px-4">Nama Siswa</th>
                <th className="py-2.5 px-4">Kelas</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Metode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-4 font-mono">{r.date}</td>
                    <td className="py-2.5 px-4 font-mono font-bold">{r.time}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{r.nisn}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{r.studentName}</td>
                    <td className="py-2.5 px-4 font-bold">{r.className}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 uppercase">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 uppercase text-[10px] text-slate-500">{r.method}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada data pada tanggal / kelas yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
