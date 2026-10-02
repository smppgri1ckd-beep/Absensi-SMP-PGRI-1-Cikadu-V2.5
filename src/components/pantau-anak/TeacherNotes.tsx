import React, { useState } from 'react';
import { MessageSquare, Calendar, X, ChevronRight, User } from 'lucide-react';
import { TeacherNoteItem } from '../../types';

interface TeacherNotesProps {
  notes: TeacherNoteItem[];
}

export const TeacherNotes: React.FC<TeacherNotesProps> = ({ notes }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'Semua' | 'Wali Kelas' | 'Guru Mapel' | 'Guru BK'>('Semua');

  const filteredNotes = roleFilter === 'Semua' 
    ? notes 
    : notes.filter((n) => n.peranGuru === roleFilter);

  // Formatted date helper (e.g. 30 September 2026)
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
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Catatan Guru
            </h3>
            <p className="text-xs text-slate-500">
              Umpan balik dari wali kelas, guru mapel, dan guru BK
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-black transition-colors cursor-pointer border border-purple-200"
        >
          <span>Lihat Semua Catatan</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Notes Cards with exact format */}
      {notes.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-xs text-slate-400">Belum ada catatan dari guru untuk saat ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.slice(0, 2).map((note) => (
            <div
              key={note.id}
              className="p-4 rounded-2xl bg-slate-50/80 hover:bg-purple-50/40 border border-slate-200 transition-all space-y-2"
            >
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">👨‍🏫</span>
                  <strong className="text-sm font-black text-slate-900">
                    {note.guruNama} — <span className="text-purple-700 font-extrabold">{note.mapel ? `Guru ${note.mapel}` : note.peranGuru}</span>
                  </strong>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  note.peranGuru === 'Wali Kelas'
                    ? 'bg-purple-100 text-purple-900 border border-purple-200'
                    : note.peranGuru === 'Guru BK'
                    ? 'bg-teal-100 text-teal-900 border border-teal-200'
                    : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                }`}>
                  {note.peranGuru}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed italic bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                "{note.catatan}"
              </p>

              <div className="text-[11px] text-slate-500 font-medium pt-0.5">
                Tanggal: <strong className="text-slate-700">{formatIndoDate(note.tanggal)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: LIHAT SEMUA CATATAN */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] my-auto animate-in zoom-in-95"
          >
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-4 text-white flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-base">Seluruh Catatan dari Guru</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Peran Guru: Wali kelas, Guru mata pelajaran, Guru BK */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs">
              <span className="font-bold text-slate-500 mr-1">Filter Pengirim:</span>
              {[
                { id: 'Semua', label: 'Semua' },
                { id: 'Wali Kelas', label: 'Wali Kelas' },
                { id: 'Guru Mapel', label: 'Guru Mata Pelajaran' },
                { id: 'Guru BK', label: 'Guru BK (Bimbingan Konseling)' },
              ].map((rf) => (
                <button
                  key={rf.id}
                  type="button"
                  onClick={() => setRoleFilter(rf.id as any)}
                  className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                    roleFilter === rf.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>

            {/* Notes List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {filteredNotes.map((n) => (
                <div key={n.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-black text-xs text-purple-900">
                      👨‍🏫 {n.guruNama} — {n.mapel ? `Guru ${n.mapel}` : n.peranGuru}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                      {n.peranGuru}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                    "{n.catatan}"
                  </p>

                  <div className="text-[11px] text-slate-500 font-medium">
                    Tanggal: <strong className="text-slate-700">{formatIndoDate(n.tanggal)}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
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
