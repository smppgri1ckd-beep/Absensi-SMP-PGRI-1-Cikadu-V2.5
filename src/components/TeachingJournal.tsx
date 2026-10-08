import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Calendar, Clock, CheckCircle2, User, Filter, Search } from 'lucide-react';
import { DB } from '../services/db';
import { TeachingJournal as ITeachingJournal, Teacher } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const TeachingJournal: React.FC = () => {
  const { currentUser, role } = useAuth();
  const { showToast } = useToast();

  const [journals, setJournals] = useState<ITeachingJournal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterClass, setFilterClass] = useState('all');

  // Form states
  const [className, setClassName] = useState('7A');
  const [subject, setSubject] = useState(currentUser?.subject || 'Matematika');
  const [teacherName, setTeacherName] = useState(currentUser?.name || 'Rahmat Hidayat, S.Pd.');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('07.30 - 09.00 WIB');
  const [topic, setTopic] = useState('');
  const [presentCount, setPresentCount] = useState<number>(30);
  const [absentCount, setAbsentCount] = useState<number>(2);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setJournals(DB.getTeachingJournals());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const newJrn = DB.addTeachingJournal({
      teacherId: currentUser?.id || 'tch-demo',
      teacherName: teacherName,
      className,
      subject,
      date,
      timeSlot,
      topic,
      presentCount: Number(presentCount),
      absentCount: Number(absentCount),
      notes
    });

    setJournals([newJrn, ...journals]);
    showToast('Jurnal mengajar berhasil disimpan!', 'success');
    setShowAddModal(false);
    setTopic('');
    setNotes('');
  };

  const filteredJournals = journals.filter((j) => {
    if (filterClass !== 'all' && j.className !== filterClass) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Jurnal Pembelajaran Guru
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Catatan materi pokok, kehadiran per jam pelajaran, dan perkembangan kelas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Kelas</option>
            <option value="7A">Kelas 7A</option>
            <option value="7B">Kelas 7B</option>
            <option value="8A">Kelas 8A</option>
            <option value="8B">Kelas 8B</option>
            <option value="9A">Kelas 9A</option>
            <option value="9B">Kelas 9B</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jurnal</span>
          </button>
        </div>
      </div>

      {/* Journal Cards Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJournals.map((j) => (
          <div
            key={j.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded mr-2">
                  Kelas {j.className}
                </span>
                <span className="text-xs font-bold text-slate-900">{j.subject}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                {j.date}
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800 mb-1">Materi / Bahasan:</p>
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                {j.topic}
              </p>
            </div>

            {j.notes && (
              <p className="text-[11px] text-slate-500 italic">
                Catatan: {j.notes}
              </p>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {j.timeSlot}
              </span>
              <span className="font-semibold text-slate-700">Guru: {j.teacherName}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Tulis Jurnal Mengajar Harian
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="7A">7A</option>
                    <option value="7B">7B</option>
                    <option value="8A">8A</option>
                    <option value="8B">8B</option>
                    <option value="9A">9A</option>
                    <option value="9B">9B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Pelajaran</label>
                  <input
                    type="text"
                    placeholder="07.30 - 09.00 WIB"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Materi / Topik Bahasan</label>
                <textarea
                  rows={2}
                  placeholder="Ringkasan materi dan kegiatan belajar siswa..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Kelas / Guru</label>
                <input
                  type="text"
                  placeholder="Kondisi kelas, tugas yang diberikan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs"
                >
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
