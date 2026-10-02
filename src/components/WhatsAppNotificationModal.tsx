import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  Sparkles, 
  User, 
  Phone, 
  AlertCircle,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolConfig, WhatsAppTemplate } from '../types';
import { DatabaseService, buildWhatsAppLink, formatWhatsAppPhone, DEFAULT_WA_TEMPLATES } from '../services/db';
import { AiService } from '../services/ai';

interface WhatsAppNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStudent?: Student | null;
  targetRecord?: AttendanceRecord | null;
  schoolConfig: SchoolConfig;
  allStudents?: Student[];
  allTodayRecords?: AttendanceRecord[];
}

export const WhatsAppNotificationModal: React.FC<WhatsAppNotificationModalProps> = ({
  isOpen,
  onClose,
  targetStudent,
  targetRecord,
  schoolConfig,
  allStudents = [],
  allTodayRecords = [],
}) => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl_hadir');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [studentClass, setStudentClass] = useState<string>('');
  const [attendanceStatus, setAttendanceStatus] = useState<string>('Hadir');
  const [messageText, setMessageText] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Multi-target tab
  const [mode, setMode] = useState<'single' | 'batch_tardy' | 'batch_alpa'>('single');

  useEffect(() => {
    const list = DatabaseService.getWhatsAppTemplates();
    setTemplates(list);
  }, []);

  useEffect(() => {
    if (targetStudent) {
      setStudentName(targetStudent.nama);
      setStudentClass(targetStudent.kelas);
      setRecipientPhone(targetStudent.nomorTeleponOrtu || '');
    } else if (allStudents.length > 0) {
      setStudentName(allStudents[0].nama);
      setStudentClass(allStudents[0].kelas);
      setRecipientPhone(allStudents[0].nomorTeleponOrtu || '');
    }

    if (targetRecord) {
      setAttendanceStatus(targetRecord.status);
      if (targetRecord.status === 'Terlambat') {
        setSelectedTemplateId('tpl_terlambat');
      } else if (targetRecord.status === 'Alpa') {
        setSelectedTemplateId('tpl_alpa');
      } else if (targetRecord.status === 'Izin' || targetRecord.status === 'Sakit') {
        setSelectedTemplateId('tpl_izin_sakit');
      } else {
        setSelectedTemplateId('tpl_hadir');
      }
    }
  }, [targetStudent, targetRecord, allStudents]);

  // Generate dynamic message content based on current template
  useEffect(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId) || DEFAULT_WA_TEMPLATES[0];
    if (!tpl) return;

    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const nowTime = targetRecord?.waktu || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const sesi = targetRecord?.sesi || 'Pagi';
    const catatan = targetRecord?.catatan || 'Terlambat hadir melebihi batas jam apel';
    const batasWaktu = schoolConfig.jadwal?.pagiBatasTepatWaktu || '07:15';

    let filled = tpl.template
      .replace(/{NAMA_SISWA}/g, studentName || 'Siswa')
      .replace(/{KELAS}/g, studentClass || '-')
      .replace(/{TANGGAL}/g, todayStr)
      .replace(/{WAKTU}/g, nowTime)
      .replace(/{SESI}/g, sesi)
      .replace(/{STATUS}/g, attendanceStatus.toUpperCase())
      .replace(/{CATATAN}/g, catatan)
      .replace(/{BATAS_WAKTU}/g, batasWaktu)
      .replace(/{ALASAN}/g, catatan)
      .replace(/{PETUGAS}/g, schoolConfig.namaPetugasPiket || 'Guru Piket');

    setMessageText(filled);
  }, [selectedTemplateId, templates, studentName, studentClass, attendanceStatus, targetRecord, schoolConfig]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSendSingle = () => {
    if (!recipientPhone) {
      alert('Mohon masukkan nomor WhatsApp tujuan orang tua/wali.');
      return;
    }
    const url = buildWhatsAppLink(recipientPhone, messageText);
    window.open(url, '_blank');
  };

  const handleAiRefine = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const generated = await AiService.generateCustomWhatsApp(
        studentName,
        studentClass,
        attendanceStatus,
        targetRecord?.catatan || 'Presensi Harian',
        schoolConfig.namaSekolah
      );
      if (generated) {
        setMessageText(generated);
      }
    } catch (e: any) {
      setAiError(e?.message || 'Gagal memanggil AI');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Find tardy and alpa students for batch lists
  const tardyRecords = allTodayRecords.filter((r) => r.status === 'Terlambat');
  const studentNisnsWithRecord = new Set(allTodayRecords.map((r) => r.nisn));
  const alpaStudents = allStudents.filter((s) => !studentNisnsWithRecord.has(s.nisn));

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="bg-emerald-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                Notifikasi WhatsApp Orang Tua
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-400/40">
                  Resmi
                </span>
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                Kirim informasi presensi langsung ke WhatsApp orang tua murid
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

        {/* Mode Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-4 py-2.5 rounded-t-xl cursor-pointer transition-all border-b-2 ${
              mode === 'single'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Kirim Perorangan
          </button>
          <button
            type="button"
            onClick={() => setMode('batch_tardy')}
            className={`px-4 py-2.5 rounded-t-xl cursor-pointer transition-all border-b-2 flex items-center gap-1.5 ${
              mode === 'batch_tardy'
                ? 'border-amber-500 text-amber-800 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Siswa Terlambat Hari Ini</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full">
              {tardyRecords.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('batch_alpa')}
            className={`px-4 py-2.5 rounded-t-xl cursor-pointer transition-all border-b-2 flex items-center gap-1.5 ${
              mode === 'batch_alpa'
                ? 'border-rose-500 text-rose-800 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Siswa Belum Hadir (Alpa)</span>
            <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.5 rounded-full">
              {alpaStudents.length}
            </span>
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {mode === 'single' ? (
            <>
              {/* Recipient info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Nama Siswa & Kelas
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Nama Siswa"
                      className="w-full text-xs font-bold px-3 py-2 bg-white rounded-xl border border-slate-300 focus:outline-emerald-500"
                    />
                    <input
                      type="text"
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      placeholder="Kelas"
                      className="w-20 text-xs font-bold px-2 py-2 bg-white rounded-xl border border-slate-300 text-center focus:outline-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Nomor WhatsApp Ortu
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full text-xs font-bold pl-8 pr-3 py-2 bg-white rounded-xl border border-slate-300 focus:outline-emerald-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Format otomatis disesuaikan dengan kode negara +62
                  </span>
                </div>
              </div>

              {/* Template pills */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Pilih Template Notifikasi:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        selectedTemplateId === t.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {t.nama}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message text area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    Isi Pesan WhatsApp
                  </label>
                  <button
                    type="button"
                    onClick={handleAiRefine}
                    disabled={isGeneratingAi}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isGeneratingAi ? 'Menulis via AI...' : 'Tulis Ulang dengan AI'}</span>
                  </button>
                </div>
                {aiError && (
                  <p className="text-[11px] text-rose-600 mb-1 font-medium">{aiError}</p>
                )}
                <textarea
                  rows={8}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-emerald-500 transition-colors leading-relaxed"
                />
              </div>
            </>
          ) : mode === 'batch_tardy' ? (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Daftar Siswa Terlambat Hari Ini ({tardyRecords.length} Siswa)</p>
                  <p className="text-[11px] text-amber-700">
                    Klik tombol "Kirim WA" pada masing-masing siswa untuk membuka percakapan WhatsApp ke orang tua secara instan.
                  </p>
                </div>
              </div>

              {tardyRecords.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Tidak ada siswa yang tercatat terlambat hari ini. Semua tepat waktu! 🎉
                </div>
              ) : (
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {tardyRecords.map((rec) => {
                    const student = allStudents.find((s) => s.nisn === rec.nisn);
                    const phone = student?.nomorTeleponOrtu || '';
                    const customMsg = `*PEMBERITAHUAN KETERLAMBATAN SISWA*\n*SMP PGRI 1 CIKADU*\n\nYth. Orang Tua/Wali dari ananda *${rec.nama}* (Kelas ${rec.kelas}).\n\nKami menginformasikan bahwa ananda tiba di sekolah pada pukul *${rec.waktu} WIB* dengan status *TERLAMBAT* (${rec.catatan || 'Melebihi batas jam apel'}).\n\nMohon bantuannya untuk membimbing ananda agar tiba tepat waktu esok hari.\n\n_Guru Piket SMP PGRI 1 Cikadu_`;

                    return (
                      <div key={rec.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between hover:border-amber-400 transition-colors">
                        <div>
                          <p className="font-bold text-xs text-slate-900">{rec.nama}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Kelas {rec.kelas} • Tiba: {rec.waktu} WIB {rec.catatan ? `(${rec.catatan})` : ''}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-mono">
                            WA Ortu: {phone || 'Belum diisi'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!phone) {
                              alert('Nomor telepon orang tua belum diinputkan untuk siswa ini.');
                              return;
                            }
                            window.open(buildWhatsAppLink(phone, customMsg), '_blank');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim WA</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Daftar Siswa Belum Hadir / Tanpa Keterangan ({alpaStudents.length} Siswa)</p>
                  <p className="text-[11px] text-rose-700">
                    Kirimkan pesan konfirmasi ke orang tua untuk memastikan siswa aman dan mengetahui alasan ketidakhadiran.
                  </p>
                </div>
              </div>

              {alpaStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Semua siswa sudah tercatat presensi atau memiliki izin resmi! 👏
                </div>
              ) : (
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {alpaStudents.map((stu) => {
                    const phone = stu.nomorTeleponOrtu || '';
                    const customMsg = `*KONFIRMASI KETIDAKHADIRAN SISWA*\n*SMP PGRI 1 CIKADU*\n\nYth. Orang Tua/Wali dari ananda *${stu.nama}* (Kelas ${stu.kelas}).\n\nHingga saat ini ananda belum tercatat hadir di sekolah tanpa surat izin/keterangan.\n\nMohon konfirmasi status ananda melalui WhatsApp ini atau mengajukan izin di aplikasi Pantau Anak.\n\n_Guru Piket SMP PGRI 1 Cikadu_`;

                    return (
                      <div key={stu.nisn} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between hover:border-rose-400 transition-colors">
                        <div>
                          <p className="font-bold text-xs text-slate-900">{stu.nama}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Kelas {stu.kelas} • NISN: {stu.nisn}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-mono">
                            WA Ortu: {phone || 'Belum diisi'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!phone) {
                              alert('Nomor telepon orang tua belum diinputkan untuk siswa ini.');
                              return;
                            }
                            window.open(buildWhatsAppLink(phone, customMsg), '_blank');
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Konfirmasi WA</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {mode === 'single' ? (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Tersalin!' : 'Salin Teks Pesan'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSendSingle}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Buka WhatsApp Web / Aplikasi</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Selesai
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
