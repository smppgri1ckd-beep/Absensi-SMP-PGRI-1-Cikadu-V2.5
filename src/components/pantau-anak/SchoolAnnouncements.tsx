import React, { useState } from 'react';
import { Megaphone, ChevronRight, X, Calendar } from 'lucide-react';
import { SchoolAnnouncementItem } from '../../types';

interface SchoolAnnouncementsProps {
  announcements: SchoolAnnouncementItem[];
}

export const SchoolAnnouncements: React.FC<SchoolAnnouncementsProps> = ({
  announcements,
}) => {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<SchoolAnnouncementItem | null>(null);

  // Formatted date helper (e.g. 5 Oktober 2026)
  const formatIndoDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${parseInt(parts[2])} ${monthNames[parseInt(parts[1])] || parts[1]} ${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Pengumuman
            </h3>
            <p className="text-xs text-slate-500">
              Informasi kegiatan, agenda ujian, dan surat edaran sekolah
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-slate-400">
          {announcements.length} Informasi
        </span>
      </div>

      {/* Announcements List with exact format */}
      <div className="space-y-2.5">
        {announcements.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedAnnouncement(item)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-xs flex items-center justify-between gap-3 ${
              item.isPenting
                ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
                : 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
            }`}
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base shrink-0">📢</span>
                <h4 className="font-black text-sm text-slate-900 hover:text-blue-700 transition-colors">
                  {item.judul}
                </h4>
                {item.isPenting && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white shadow-2xs">
                    Penting
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 font-medium pl-6">
                {formatIndoDate(item.tanggal)}
              </p>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        ))}
      </div>

      {/* MODAL: DETAIL PENGUMUMAN */}
      {selectedAnnouncement && (
        <div 
          onClick={() => setSelectedAnnouncement(null)}
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] my-auto animate-in zoom-in-95"
          >
            <div className="bg-gradient-to-r from-blue-800 to-indigo-900 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <span className="font-extrabold text-sm">Detail Pengumuman Sekolah</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedAnnouncement.isPenting && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-rose-600 text-white">
                    Penting
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                  Kategori: {selectedAnnouncement.kategori}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {formatIndoDate(selectedAnnouncement.tanggal)}
                </span>
              </div>

              <h3 className="text-lg font-black text-slate-900 leading-snug">
                {selectedAnnouncement.judul}
              </h3>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedAnnouncement.konten}
              </div>

              <div className="text-[11px] text-slate-400 italic">
                * Diterbitkan secara resmi oleh Bagian Kurikulum & Kesiswaan Sekolah.
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
