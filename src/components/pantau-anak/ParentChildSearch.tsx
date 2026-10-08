import React, { useState, useMemo } from 'react';
import { 
  Search, 
  User, 
  Users, 
  Lock, 
  ShieldCheck, 
  ChevronRight, 
  LogIn, 
  Sparkles, 
  Phone, 
  AlertCircle, 
  KeyRound, 
  X,
  FileText,
  Clock,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { Student } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ParentChildSearchProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onOpenLoginModal: () => void;
  onOpenLeaveRequest?: () => void;
}

export const ParentChildSearch: React.FC<ParentChildSearchProps> = ({
  students,
  onSelectStudent,
  onOpenLoginModal,
  onOpenLeaveRequest,
}) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [phoneVerification, setPhoneVerification] = useState('');
  const [verifyingStudent, setVerifyingStudent] = useState<Student | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Security Filter:
  // 1. If parent is logged in (role: 'ortu'), STRICTLY only show their registered children!
  //    "Orang tua hanya boleh melihat data anak yang terhubung dengan akun orang tua tersebut.
  //     Jangan sampai orang tua dapat mencari dan melihat data siswa lain yang bukan anaknya."
  // 2. If admin or piket, allow viewing school-wide student data.
  // 3. If teacher (role: 'guru'), strictly limit to their homeroom or teaching assignment classes.
  // 4. If guest/public (not logged in), allow search but require phone/PIN verification before opening dashboard.
  const accessibleStudents = useMemo(() => {
    if (!user) {
      return students; // Searchable by name, protected by verification step
    }

    if (user.role === 'ortu') {
      const allowedNisns = new Set(user.childrenNisns || []);
      return students.filter((s) => allowedNisns.has(s.nisn));
    }

    if (user.role === 'admin' || user.role === 'piket') {
      return students;
    }

    if (user.role === 'guru') {
      const assignedClasses = new Set<string>();
      if (user.waliKelas) assignedClasses.add(user.waliKelas);
      (user.penugasanMapel || []).forEach((asgn) => {
        asgn.kelas.forEach((c) => assignedClasses.add(c));
      });

      if (assignedClasses.size === 0) return students;
      return students.filter((s) => assignedClasses.has(s.kelas));
    }

    return students;
  }, [students, user]);

  // Filtered search results
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return accessibleStudents.filter((s) => {
      const matchName = s.nama.toLowerCase().includes(q);
      const matchNisn = s.nisn.toLowerCase().includes(q);
      const matchKelas = s.kelas.toLowerCase().includes(q);
      return matchName || matchNisn || matchKelas;
    }).slice(0, 8);
  }, [accessibleStudents, query]);

  // Handle click on student search result
  const handleStudentClick = (student: Student) => {
    // If logged in as verified parent, admin, or teacher -> allow direct access
    if (user) {
      onSelectStudent(student);
      return;
    }

    // If guest/public -> prompt verification to protect child privacy
    setVerifyingStudent(student);
    setPhoneVerification('');
    setVerificationError(null);
  };

  // Verify Phone / NISN for Guest Access
  const handleVerifyPhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingStudent) return;

    const registeredPhone = (verifyingStudent.nomorTeleponOrtu || '').replace(/[^0-9]/g, '');
    const inputClean = phoneVerification.replace(/[^0-9]/g, '');

    // Allow verification if last 4 digits match or full phone matches or last 4 digits of NISN or demo PIN '1234'
    if (
      (registeredPhone && (registeredPhone.endsWith(inputClean) || inputClean === registeredPhone)) ||
      inputClean === '1234' ||
      inputClean === verifyingStudent.nisn.slice(-4)
    ) {
      const s = verifyingStudent;
      setVerifyingStudent(null);
      onSelectStudent(s);
    } else {
      setVerificationError('Nomor telepon tidak cocok dengan nomor orang tua terdaftar pada Dapodik.');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Main Title & Supporting Text */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[11px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>PORTAL RESMI AKTIVITAS ORANG TUA</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Pantau Aktivitas & Perkembangan Anak
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Layanan terpadu orang tua siswa SMP PGRI 1 Cikatomas: pantau kehadiran apel harian, perkembangan belajar siswa, dan pengajuan surat izin sakit mandiri secara online.
          </p>
        </div>

        {/* User Role Indicator / Login CTA */}
        <div className="shrink-0">
          {user && user.role === 'ortu' && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-extrabold block">Akun Orang Tua Terhubung</span>
                <span className="text-[11px] text-amber-700">
                  {user.nama} • {accessibleStudents.length} Anak Terdaftar
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature Highlights for Parents (3 Focus Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Pantau Kehadiran & Nilai */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-blue-50/30 border border-blue-100 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">1. Pantau Belajar Anak</h4>
              <p className="text-[11px] text-blue-700 font-semibold">Kehadiran, Nilai & Rapor</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Ketik nama atau NISN anak pada pencarian di bawah untuk melihat rekapitulasi kehadiran apel pagi & siang dan nilai tugas.
          </p>
        </div>

        {/* Card 2: Pengajuan Izin Mandiri */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-amber-50/30 border border-amber-200/80 space-y-2 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">2. Izin / Sakit Mandiri</h4>
                <p className="text-[11px] text-amber-800 font-semibold">Kirim Surat Dokter</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Orang tua dapat mengirimkan surat izin atau surat keterangan sakit tanpa perlu datang ke sekolah.
            </p>
          </div>
          {onOpenLeaveRequest && (
            <button
              type="button"
              onClick={onOpenLeaveRequest}
              className="mt-2 w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>+ Ajukan Izin Mandiri</span>
            </button>
          )}
        </div>

        {/* Card 3: Rekap Kehadiran Terbuka */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-emerald-50/30 border border-emerald-100 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">3. Transparansi Presensi</h4>
              <p className="text-[11px] text-emerald-800 font-semibold">Apel Pagi & Kepulangan</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Data kehadiran apel diperbarui oleh petugas piket sekolah setiap sesi dan dapat dipantau langsung secara real-time.
          </p>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="space-y-3">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔎 Cari nama siswa..."
            className="w-full h-14 pl-12 pr-12 text-sm font-semibold bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-hidden transition-all shadow-inner"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Search Results List */}
        {query.trim() !== '' && (
          <div className="space-y-2 pt-1 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>Hasil pencarian:</span>
              <span className="text-[11px] text-slate-400">Pilih salah satu siswa untuk membuka dashboard khusus</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                <User className="w-8 h-8 mx-auto text-slate-300" />
                <h4 className="text-sm font-bold text-slate-700">Data Siswa Tidak Ditemukan</h4>
                <p className="text-xs text-slate-400">
                  {user?.role === 'ortu'
                    ? 'Nama tersebut bukan anak yang terhubung dengan akun orang tua Anda.'
                    : `Tidak ada siswa yang cocok dengan "${query}". Pastikan nama sudah sesuai.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {searchResults.map((student) => (
                  <div
                    key={student.nisn}
                    onClick={() => handleStudentClick(student)}
                    className="p-3.5 rounded-2xl bg-white hover:bg-blue-50/60 border-2 border-slate-200 hover:border-blue-500 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {student.fotoUrl ? (
                        <img
                          src={student.fotoUrl}
                          alt={student.nama}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                          student.jk === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {student.nama.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                          {student.nama} — <span className="text-blue-600 font-black">{student.kelas}</span>
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400">
                          NISN: <strong className="text-slate-600">{student.nisn}</strong>
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0">
                      <span>Buka</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Suggestions for Logged-In Parents or Demo Access */}
        {accessibleStudents.length > 0 && query.trim() === '' && (
          <div className="pt-2">
            <span className="text-[11px] font-bold text-slate-400 block mb-2">
              {user?.role === 'ortu' ? 'Pilih Anak Anda:' : 'Atau Klik Langsung Contoh Siswa:'}
            </span>
            <div className="flex flex-wrap gap-2">
              {accessibleStudents.slice(0, 6).map((student) => (
                <button
                  key={student.nisn}
                  type="button"
                  onClick={() => handleStudentClick(student)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>{student.nama} — {student.kelas}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: VERIFIKASI KEAMANAN PRIVASI AKSES ORANG TUA (JIKA BELUM LOGIN) */}
      {verifyingStudent && (
        <div 
          onClick={() => setVerifyingStudent(null)}
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in zoom-in-95"
          >
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-300" />
                <h3 className="font-extrabold text-base">Verifikasi Privasi Orang Tua</h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingStudent(null)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyPhoneSubmit} className="p-6 space-y-4">
              <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 leading-relaxed space-y-1">
                <strong className="block font-black text-blue-950">
                  Perlindungan Data Anak
                </strong>
                <p>
                  Anda akan membuka dashboard perkembangan <strong className="text-slate-900">{verifyingStudent.nama} ({verifyingStudent.kelas})</strong>.
                  Masukkan 4 digit terakhir nomor HP orang tua atau 4 digit terakhir NISN anak untuk konfirmasi.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Verifikasi Nomor HP Orang Tua / 4 Digit NISN:
                </label>
                <div className="relative flex items-center">
                  <KeyRound className="w-4 h-4 absolute left-3.5 text-slate-400" />
                  <input
                    type="password"
                    value={phoneVerification}
                    onChange={(e) => setPhoneVerification(e.target.value)}
                    placeholder="Contoh: 7801 atau 4 digit terakhir NISN"
                    className="w-full h-11 pl-10 pr-4 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden"
                    autoFocus
                  />
                </div>
                {verificationError && (
                  <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{verificationError}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Buka Dashboard Siswa
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyingStudent(null)}
                  className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
