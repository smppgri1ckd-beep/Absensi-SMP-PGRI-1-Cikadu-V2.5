import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  MapPin, 
  User, 
  Tag, 
  Check,
  AlertCircle
} from 'lucide-react';
import { SchoolEventItem } from '../types';
import { DatabaseService } from '../services/db';
import { useToast } from '../context/ToastContext';

interface AgendaSekolahModalProps {
  isOpen: boolean;
  onClose: () => void;
  canManage?: boolean;
}

export const AgendaSekolahModal: React.FC<AgendaSekolahModalProps> = ({
  isOpen,
  onClose,
  canManage = true,
}) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<SchoolEventItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  // Form states
  const [formJudul, setFormJudul] = useState<string>('');
  const [formTanggalMulai, setFormTanggalMulai] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formTanggalSelesai, setFormTanggalSelesai] = useState<string>('');
  const [formKategori, setFormKategori] = useState<SchoolEventItem['kategori']>('Kegiatan OSIS');
  const [formWaktu, setFormWaktu] = useState<string>('07:30 - Selesai');
  const [formLokasi, setFormLokasi] = useState<string>('SMP PGRI 1 Cikadu');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formPj, setFormPj] = useState<string>('');

  useEffect(() => {
    DatabaseService.getSchoolEvents().then(setEvents);
    const unsub = DatabaseService.subscribeSchoolEvents((data) => setEvents(data));
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const categories = ['Semua', 'Ujian', 'Peringatan Hari Besar', 'Kegiatan OSIS', 'Rapat', 'Libur', 'Lainnya'];

  const filteredEvents = selectedCategory === 'Semua' 
    ? events 
    : events.filter((e) => e.kategori === selectedCategory);

  const resetForm = () => {
    setFormJudul('');
    setFormTanggalMulai(new Date().toISOString().split('T')[0]);
    setFormTanggalSelesai('');
    setFormKategori('Kegiatan OSIS');
    setFormWaktu('07:30 - Selesai');
    setFormLokasi('SMP PGRI 1 Cikadu');
    setFormKeterangan('');
    setFormPj('');
    setIsAdding(false);
    setEditingEventId(null);
  };

  const handleEdit = (ev: SchoolEventItem) => {
    setEditingEventId(ev.id);
    setFormJudul(ev.judul);
    setFormTanggalMulai(ev.tanggalMulai);
    setFormTanggalSelesai(ev.tanggalSelesai || '');
    setFormKategori(ev.kategori);
    setFormWaktu(ev.waktu || '');
    setFormLokasi(ev.lokasi || '');
    setFormKeterangan(ev.keterangan || '');
    setFormPj(ev.penanggungJawab || '');
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus agenda kegiatan sekolah ini?')) {
      await DatabaseService.deleteSchoolEvent(id);
      setSelectedEventIds((prev) => prev.filter((eId) => eId !== id));
      toast.delete('Agenda Dihapus', 'Agenda kegiatan sekolah berhasil dihapus.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEventIds.length === 0) return;
    const count = selectedEventIds.length;
    if (!confirm(`YAKIN INGIN MENGHAPUS ${count} AGENDA KEGIATAN TERPILIH?\n\nAgenda kegiatan terpilih akan benar-benar dihapus permanen dari database (Firestore & Penyimpanan Lokal). Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      await DatabaseService.bulkDeleteSchoolEvents(selectedEventIds);
      setSelectedEventIds([]);
      toast.delete('Agenda Dihapus Massal', `${count} agenda kegiatan terpilih berhasil dihapus.`);
    } catch (err) {
      console.error('Failed to bulk delete school events', err);
      toast.error('Gagal Menghapus', 'Gagal menghapus agenda kegiatan. Silakan coba lagi.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim()) {
      toast.warning('Nama Kosong', 'Nama agenda kegiatan tidak boleh kosong.');
      return;
    }

    const payload: SchoolEventItem = {
      id: editingEventId || `EVT_${Date.now()}`,
      judul: formJudul.trim(),
      tanggalMulai: formTanggalMulai,
      tanggalSelesai: formTanggalSelesai || undefined,
      kategori: formKategori,
      waktu: formWaktu || undefined,
      lokasi: formLokasi || undefined,
      keterangan: formKeterangan || undefined,
      penanggungJawab: formPj || undefined,
    };

    await DatabaseService.saveSchoolEvent(payload);
    toast.success('Agenda Disimpan', `Agenda "${payload.judul}" berhasil disimpan.`);
    resetForm();
  };

  const getCategoryBadgeClass = (kategori: string) => {
    switch (kategori) {
      case 'Ujian':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Peringatan Hari Besar':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Kegiatan OSIS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Rapat':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Libur':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Agenda & Kalender Kegiatan Sekolah
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Jadwal ujian, rapat komite, ekstrakurikuler, dan peringatan hari besar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar & filter */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-1.5 overflow-x-auto text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAdding(!isAdding);
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isAdding ? 'Tutup Form' : 'Tambah Agenda'}</span>
            </button>
          )}
        </div>

        {/* Bulk Delete Floating/Action Bar */}
        {selectedEventIds.length > 0 && canManage && (
          <div className="mx-4 sm:mx-6 mt-4 bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 text-rose-950 font-bold text-xs sm:text-sm">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse shrink-0"></span>
              <span>
                <strong>{selectedEventIds.length}</strong> agenda kegiatan dipilih untuk tindakan massal
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedEventIds([])}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer transition-colors"
              >
                Batalkan Pilihan
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleBulkDelete}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-rose-600/25 cursor-pointer transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isBulkDeleting ? 'Menghapus dari Database...' : `Hapus (${selectedEventIds.length}) Agenda Terpilih`}
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Form Add / Edit */}
          {isAdding && canManage && (
            <form onSubmit={handleSubmit} className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3 animate-in fade-in">
              <h4 className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>{editingEventId ? 'Edit Agenda Kegiatan' : 'Tambah Agenda Kegiatan Baru'}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Nama Agenda / Kegiatan *</label>
                  <input
                    type="text"
                    required
                    value={formJudul}
                    onChange={(e) => setFormJudul(e.target.value)}
                    placeholder="Contoh: Upacara Sumpah Pemuda / Ujian Tengah Semester"
                    className="w-full font-bold px-3 py-2 bg-white rounded-xl border border-slate-300 focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    required
                    value={formTanggalMulai}
                    onChange={(e) => setFormTanggalMulai(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Selesai (Opsional)</label>
                  <input
                    type="date"
                    value={formTanggalSelesai}
                    onChange={(e) => setFormTanggalSelesai(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Kegiatan</label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="Ujian">Ujian</option>
                    <option value="Peringatan Hari Besar">Peringatan Hari Besar</option>
                    <option value="Kegiatan OSIS">Kegiatan OSIS</option>
                    <option value="Rapat">Rapat</option>
                    <option value="Libur">Libur</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Waktu Pelaksanaan</label>
                  <input
                    type="text"
                    value={formWaktu}
                    onChange={(e) => setFormWaktu(e.target.value)}
                    placeholder="07:30 - Selesai"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={formLokasi}
                    onChange={(e) => setFormLokasi(e.target.value)}
                    placeholder="Lapangan Upacara / Aula"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Penanggung Jawab / Panitia</label>
                  <input
                    type="text"
                    value={formPj}
                    onChange={(e) => setFormPj(e.target.value)}
                    placeholder="Waka Kesiswaan / Pembina OSIS"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Keterangan / Perlengkapan</label>
                  <textarea
                    rows={2}
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    placeholder="Catatan seragam dinas, pembagian tugas, dsb."
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Agenda</span>
                </button>
              </div>
            </form>
          )}

          {/* List of events */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2 opacity-50" />
              <p>Belum ada agenda kegiatan untuk kategori ini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Select All Checkbox for Agenda */}
              {canManage && (
                <div className="flex items-center justify-between px-1 pb-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filteredEvents.length > 0 && selectedEventIds.length === filteredEvents.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEventIds(filteredEvents.map((ev) => ev.id));
                        } else {
                          setSelectedEventIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span>Pilih Semua Agenda ({filteredEvents.length})</span>
                  </label>
                </div>
              )}

              {filteredEvents.map((ev) => {
                const isSelected = selectedEventIds.includes(ev.id);

                return (
                  <div 
                    key={ev.id}
                    className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-300' : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {canManage && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEventIds((prev) => [...prev, ev.id]);
                            } else {
                              setSelectedEventIds((prev) => prev.filter((id) => id !== ev.id));
                            }
                          }}
                          className="w-4 h-4 mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                          title="Pilih agenda ini"
                        />
                      )}

                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(ev.kategori)}`}>
                            {ev.kategori}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {ev.tanggalMulai} {ev.tanggalSelesai ? `s.d. ${ev.tanggalSelesai}` : ''}
                          </span>
                          {ev.waktu && (
                            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {ev.waktu}
                            </span>
                          )}
                        </div>

                        <h4 className="font-extrabold text-sm text-slate-900">
                          {ev.judul}
                        </h4>

                        {ev.keterangan && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {ev.keterangan}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-slate-500">
                          {ev.lokasi && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {ev.lokasi}
                            </span>
                          )}
                          {ev.penanggungJawab && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              PJ: {ev.penanggungJawab}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                  {canManage && (
                    <div className="flex items-center gap-1 sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(ev)}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit Agenda"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ev.id)}
                        className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Hapus Agenda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
