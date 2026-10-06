import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  KeyRound, 
  ShieldCheck, 
  BookOpen, 
  X,
  UserCheck,
  CheckCircle2,
  Lock,
  Phone,
  Clock,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Upload,
  Download,
  ArrowDownToLine,
  Info,
  Check
} from 'lucide-react';
import { TeacherUser, SchoolConfig, TeachingAssignment, UserRole, JadwalPiketHarian, DayOfWeek } from '../types';
import { DatabaseService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from '../assets/schoolLogo';
import { generateTeacherListPdf } from '../utils/exportPdf';
import { exportTeacherTemplateExcel, exportTeacherListExcel } from '../utils/exportExcel';
import { useToast } from '../context/ToastContext';

interface TeacherManagementProps {
  teachers: TeacherUser[];
  onSaveTeacher: (teacher: TeacherUser) => Promise<void>;
  onDeleteTeacher: (id: string) => Promise<void>;
  onBulkDeleteTeachers?: (ids: string[]) => Promise<void>;
  onBulkSaveTeachers?: (newTeachers: TeacherUser[]) => Promise<void>;
  schoolConfig: SchoolConfig;
  jadwalPiket?: JadwalPiketHarian[];
  setActiveTab?: (tab: string) => void;
}

const STANDARD_MAPEL_LIST = [
  'Pendidikan Agama Islam (PAI)',
  'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Seni Budaya',
  'Pendidikan Jasmani & Olahraga (PJOK)',
  'Prakarya & Kewirausahaan',
  'Informatika',
  'Bahasa Sunda (Mulok)',
  'Bahasa Arab (Mulok)',
  'Bimbingan Konseling (BK)',
];

const AVAILABLE_CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B'];
const ALL_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const ASSIGNMENT_PALETTE = [
  'bg-indigo-50/70 border-indigo-200/80 text-indigo-950',
  'bg-amber-50/70 border-amber-200/80 text-amber-950',
  'bg-emerald-50/70 border-emerald-200/80 text-emerald-950',
  'bg-sky-50/70 border-sky-200/80 text-sky-950',
  'bg-violet-50/70 border-violet-200/80 text-violet-950',
  'bg-rose-50/70 border-rose-200/80 text-rose-950',
  'bg-teal-50/70 border-teal-200/80 text-teal-950',
  'bg-orange-50/70 border-orange-200/80 text-orange-950',
  'bg-cyan-50/70 border-cyan-200/80 text-cyan-950',
  'bg-fuchsia-50/70 border-fuchsia-200/80 text-fuchsia-950',
];

export const TeacherManagement: React.FC<TeacherManagementProps> = ({
  teachers,
  onSaveTeacher,
  onDeleteTeacher,
  onBulkDeleteTeachers,
  onBulkSaveTeachers,
  schoolConfig,
  jadwalPiket = [],
  setActiveTab,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'Semua' | 'guru_mapel' | 'wali_kelas' | 'guru_piket' | 'tiga_peran'>('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Bulk Excel Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedTeachersPreview, setParsedTeachersPreview] = useState<TeacherUser[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to get piket duties for a teacher
  const getTeacherPiketDuties = useCallback((t: TeacherUser) => {
    if (!jadwalPiket || jadwalPiket.length === 0) return [];
    const duties: { hari: string; peran: string; jam: string }[] = [];
    jadwalPiket.forEach((j) => {
      j.petugas.forEach((p) => {
        if (
          (p.teacherId && p.teacherId === t.id) ||
          (p.nama && t.nama && p.nama.toLowerCase().trim() === t.nama.toLowerCase().trim()) ||
          (p.nip && t.nip && p.nip.trim() === t.nip.trim())
        ) {
          duties.push({
            hari: j.hari,
            peran: p.peran || 'Petugas Piket',
            jam: `${p.jamMulai || '06:30'} - ${p.jamSelesai || '14:30'}`,
          });
        }
      });
    });
    return duties;
  }, [jadwalPiket]);

  // Form State
  const [teacherId, setTeacherId] = useState('');
  const [teacherNip, setTeacherNip] = useState('');
  const [teacherNama, setTeacherNama] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('edudigital');
  const [teacherRole, setTeacherRole] = useState<UserRole>('guru');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherStatus, setTeacherStatus] = useState<'Aktif' | 'Non-Aktif'>('Aktif');

  // 3 Fokus Peran Utama
  const [isGuruMapel, setIsGuruMapel] = useState<boolean>(true);
  const [isWaliKelas, setIsWaliKelas] = useState<boolean>(false);
  const [teacherWaliKelas, setTeacherWaliKelas] = useState<string>('7A');
  const [isGuruPiket, setIsGuruPiket] = useState<boolean>(false);
  const [piketDays, setPiketDays] = useState<DayOfWeek[]>(['Senin']);
  const [piketRole, setPiketRole] = useState<string>('Koordinator Piket & Scanner Gerbang');

  // Penugasan Mapel (Hingga 10 Mapel dengan kelas berbeda)
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([
    { id: 'asgn_1', mapel: 'Ilmu Pengetahuan Alam (IPA)', kelas: ['7A', '7B'], bebanJam: 8 },
  ]);

  const canManage = user?.role === 'admin';

  // Stats calculation
  const totalGuruMapel = teachers.filter(
    (t) => t.isGuruMapel !== false && (Boolean(t.mapel) || (t.penugasanMapel && t.penugasanMapel.length > 0))
  ).length;

  const totalWaliKelas = teachers.filter(
    (t) => Boolean(t.isWaliKelas) && Boolean(t.waliKelas && t.waliKelas !== '-' && t.waliKelas !== '')
  ).length;

  const totalPiket = teachers.filter(
    (t) => Boolean(t.isGuruPiket) || t.role === 'piket' || getTeacherPiketDuties(t).length > 0
  ).length;

  const totalTigaPeran = teachers.filter((t) => {
    const hasMapel = t.isGuruMapel !== false && (Boolean(t.mapel) || (t.penugasanMapel && t.penugasanMapel.length > 0));
    const hasWali = Boolean(t.isWaliKelas) && Boolean(t.waliKelas && t.waliKelas !== '-' && t.waliKelas !== '');
    const hasPiket = Boolean(t.isGuruPiket) || t.role === 'piket' || getTeacherPiketDuties(t).length > 0;
    return hasMapel && hasWali && hasPiket;
  }).length;

  const totalBebanJamSemua = teachers.reduce((acc, t) => {
    const sumJam = t.penugasanMapel?.reduce((s, a) => s + (a.bebanJam || 0), 0) || t.totalJamMengajar || 0;
    return acc + sumJam;
  }, 0);

  // Filtered teachers list
  const filteredTeachers = teachers.filter((t) => {
    const hasMapel = t.isGuruMapel !== false && (Boolean(t.mapel) || (t.penugasanMapel && t.penugasanMapel.length > 0));
    const hasWali = Boolean(t.isWaliKelas) && Boolean(t.waliKelas && t.waliKelas !== '-' && t.waliKelas !== '');
    const hasPiket = Boolean(t.isGuruPiket) || t.role === 'piket' || getTeacherPiketDuties(t).length > 0;

    if (filterRole === 'guru_mapel' && !hasMapel) return false;
    if (filterRole === 'wali_kelas' && !hasWali) return false;
    if (filterRole === 'guru_piket' && !hasPiket) return false;
    if (filterRole === 'tiga_peran' && !(hasMapel && hasWali && hasPiket)) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    
    // Check in penugasanMapel
    const hasMapelMatch = t.penugasanMapel?.some(
      (asgn) => asgn.mapel.toLowerCase().includes(q) || asgn.kelas.some((k) => k.toLowerCase().includes(q))
    );

    return (
      t.nama.toLowerCase().includes(q) ||
      t.mapel?.toLowerCase().includes(q) ||
      t.username.toLowerCase().includes(q) ||
      (t.nip && t.nip.includes(q)) ||
      (t.waliKelas && t.waliKelas.toLowerCase().includes(q)) ||
      hasMapelMatch
    );
  });

  const handleOpenAdd = () => {
    setIsEditing(false);
    setTeacherId(`T${Date.now()}`);
    setTeacherNip('');
    setTeacherNama('');
    setTeacherUsername('');
    setTeacherPassword('edudigital');
    setTeacherRole('guru');
    setTeacherPhone('');
    setTeacherStatus('Aktif');

    // 3 Penugasan Default
    setIsGuruMapel(true);
    setIsWaliKelas(false);
    setTeacherWaliKelas('7A');
    setIsGuruPiket(false);
    setPiketDays(['Senin']);
    setPiketRole('Koordinator Piket & Scanner Gerbang');

    setAssignments([
      { id: `asgn_${Date.now()}_1`, mapel: 'Ilmu Pengetahuan Alam (IPA)', kelas: ['7A'], bebanJam: 4 },
    ]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: TeacherUser) => {
    setIsEditing(true);
    setTeacherId(t.id);
    setTeacherNip(t.nip || '');
    setTeacherNama(t.nama);
    setTeacherUsername(t.username);
    setTeacherPassword(t.password || 'edudigital');
    setTeacherRole((t.role as UserRole) || 'guru');
    setTeacherPhone(t.nomorHp || '');
    setTeacherStatus((t.status as 'Aktif' | 'Non-Aktif') || 'Aktif');

    // Resolve 3 Penugasan
    const hasMapel = Boolean(t.isGuruMapel ?? (t.role === 'guru' || !!t.mapel || (t.penugasanMapel && t.penugasanMapel.length > 0)));
    const hasWali = Boolean(t.isWaliKelas ?? (!!t.waliKelas && t.waliKelas !== '-' && t.waliKelas !== ''));
    const duties = getTeacherPiketDuties(t);
    const hasPiket = Boolean((t.isGuruPiket ?? (t.role === 'piket')) || duties.length > 0);

    setIsGuruMapel(hasMapel);
    setIsWaliKelas(hasWali);
    setTeacherWaliKelas(t.waliKelas || '7A');
    setIsGuruPiket(hasPiket);
    setPiketDays(t.piketDays && t.piketDays.length > 0 
      ? t.piketDays 
      : (duties.length > 0 ? duties.map((d) => d.hari as DayOfWeek) : ['Senin']));
    setPiketRole(t.piketRole || (duties.length > 0 ? duties[0].peran : 'Koordinator Piket & Scanner Gerbang'));

    if (t.penugasanMapel && t.penugasanMapel.length > 0) {
      setAssignments(JSON.parse(JSON.stringify(t.penugasanMapel)));
    } else {
      setAssignments([
        { id: `asgn_${Date.now()}`, mapel: t.mapel || 'Ilmu Pengetahuan Alam (IPA)', kelas: t.waliKelas ? [t.waliKelas] : ['7A'], bebanJam: 4 },
      ]);
    }

    setModalError(null);
    setIsModalOpen(true);
  };

  // Toggle Day in Piket Penugasan
  const handleTogglePiketDay = (day: DayOfWeek) => {
    setPiketDays((prev) => 
      prev.includes(day) 
        ? prev.filter((d) => d !== day) 
        : [...prev, day]
    );
  };

  // Assignment helpers
  const handleAddAssignmentSlot = () => {
    if (assignments.length >= 10) {
      setModalError('Maksimal 10 penugasan mata pelajaran & rombel kelas untuk setiap guru.');
      return;
    }
    setModalError(null);
    const nextSlotNum = assignments.length + 1;
    setAssignments([
      ...assignments,
      {
        id: `asgn_${Date.now()}_${nextSlotNum}`,
        mapel: STANDARD_MAPEL_LIST[(nextSlotNum + 2) % STANDARD_MAPEL_LIST.length] || 'Informatika',
        kelas: ['8A'],
        bebanJam: 4,
      },
    ]);
  };

  const handleRemoveAssignmentSlot = (idx: number) => {
    if (assignments.length <= 1) {
      setModalError('Guru Mapel harus memiliki minimal 1 mata pelajaran yang diampu.');
      return;
    }
    setModalError(null);
    setAssignments(assignments.filter((_, i) => i !== idx));
  };

  const handleToggleClassInAssignment = (asgnIdx: number, kelasName: string) => {
    setModalError(null);
    setAssignments((prev) =>
      prev.map((item, idx) => {
        if (idx !== asgnIdx) return item;
        const exists = item.kelas.includes(kelasName);
        const updatedKelas = exists
          ? item.kelas.filter((k) => k !== kelasName)
          : [...item.kelas, kelasName];
        return {
          ...item,
          kelas: updatedKelas,
        };
      })
    );
  };

  const handleUpdateAssignmentField = (
    asgnIdx: number,
    field: keyof TeachingAssignment,
    value: string | number
  ) => {
    setAssignments((prev) =>
      prev.map((item, idx) => (idx === asgnIdx ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherNama.trim() || !teacherUsername.trim()) return;

    if (!isGuruMapel && !isWaliKelas && !isGuruPiket) {
      setModalError('Guru harus diberikan minimal 1 penugasan (Guru Mapel, Wali Kelas, atau Guru Piket).');
      return;
    }

    if (isGuruMapel) {
      if (assignments.length === 0) {
        setModalError('Harap tentukan minimal 1 mata pelajaran yang diampu untuk Guru Mapel.');
        return;
      }
      for (let i = 0; i < assignments.length; i++) {
        if (!assignments[i].mapel.trim()) {
          setModalError(`Nama mata pelajaran ke-${i + 1} tidak boleh kosong.`);
          return;
        }
        if (assignments[i].kelas.length === 0) {
          setModalError(`Harap pilih minimal 1 kelas yang diajar untuk Mata Pelajaran ke-${i + 1} (${assignments[i].mapel}).`);
          return;
        }
      }
    }

    if (isWaliKelas && !teacherWaliKelas) {
      setModalError('Harap pilih kelas binaan untuk penugasan Wali Kelas.');
      return;
    }

    if (isGuruPiket && piketDays.length === 0) {
      setModalError('Harap pilih minimal 1 hari piket untuk penugasan Guru Piket.');
      return;
    }

    const calculatedTotalJam = isGuruMapel 
      ? assignments.reduce((acc, a) => acc + (Number(a.bebanJam) || 0), 0)
      : 0;
    const primaryMapel = isGuruMapel && assignments.length > 0 ? assignments[0].mapel : '';

    const resolvedRole: UserRole = teacherRole === 'admin' 
      ? 'admin' 
      : (!isGuruMapel && !isWaliKelas && isGuruPiket) 
        ? 'piket' 
        : 'guru';

    const teacherObj: TeacherUser = {
      id: teacherId,
      nip: teacherNip.trim() || undefined,
      nama: teacherNama.trim(),
      username: teacherUsername.trim().toLowerCase(),
      password: teacherPassword.trim() || 'edudigital',
      role: resolvedRole,
      mapel: primaryMapel,
      penugasanMapel: isGuruMapel ? assignments : [],
      waliKelas: isWaliKelas ? teacherWaliKelas.trim().toUpperCase() : undefined,
      nomorHp: teacherPhone.trim() || undefined,
      status: teacherStatus,
      totalJamMengajar: calculatedTotalJam,
      isGuruMapel,
      isWaliKelas,
      isGuruPiket,
      piketDays: isGuruPiket ? piketDays : [],
      piketRole: isGuruPiket ? piketRole : undefined,
    };

    await onSaveTeacher(teacherObj);
    setIsModalOpen(false);
    toast.success('Data Guru Disimpan', `Pengaturan penugasan peran guru "${teacherNama}" berhasil disimpan!`);
    
    const roleDescriptions = [
      isGuruMapel ? 'Guru Mapel' : null,
      isWaliKelas ? `Wali Kelas ${teacherWaliKelas}` : null,
      isGuruPiket ? `Guru Piket (${piketDays.join(', ')})` : null
    ].filter(Boolean).join(' • ');

    setFeedbackBanner(`Data guru "${teacherNama}" berhasil disimpan dengan penugasan: ${roleDescriptions}`);
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  const handleDelete = async (id: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus akun guru "${nama}"?`)) {
      await onDeleteTeacher(id);
      setSelectedTeacherIds((prev) => prev.filter((tId) => tId !== id));
      setFeedbackBanner(`Akun guru "${nama}" telah dihapus dari sistem.`);
      setTimeout(() => setFeedbackBanner(null), 4000);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTeacherIds.length === 0) return;
    const count = selectedTeacherIds.length;
    if (!confirm(`YAKIN INGIN MENGHAPUS ${count} AKUN GURU TERPILIH?\n\nSetiap data yang dihapus akan benar-benar hilang dari database sekolah (Firestore & Penyimpanan Lokal). Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      if (onBulkDeleteTeachers) {
        await onBulkDeleteTeachers(selectedTeacherIds);
      } else {
        await DatabaseService.bulkDeleteTeachers(selectedTeacherIds);
      }
      setSelectedTeacherIds([]);
      setFeedbackBanner(`${count} akun guru berhasil dihapus permanen dari database.`);
      setTimeout(() => setFeedbackBanner(null), 4000);
    } catch (err) {
      console.error('Failed to bulk delete teachers', err);
      alert('Gagal menghapus akun guru. Silakan coba lagi.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleQuickResetPassword = async (t: TeacherUser) => {
    if (confirm(`Reset kata sandi akun guru "${t.nama}" kembali ke default "edudigital"?`)) {
      const updated: TeacherUser = {
        ...t,
        password: 'edudigital',
      };
      await onSaveTeacher(updated);
      toast.info('Kata Sandi Direset', `Kata sandi akun @${t.username} berhasil direset ke "edudigital".`);
      setFeedbackBanner(`Kata sandi akun @${t.username} berhasil direset ke "edudigital".`);
      setTimeout(() => setFeedbackBanner(null), 4000);
    }
  };

  const handleToggleStatus = async (t: TeacherUser) => {
    const nextStatus = t.status === 'Non-Aktif' ? 'Aktif' : 'Non-Aktif';
    const updated: TeacherUser = {
      ...t,
      status: nextStatus,
    };
    await onSaveTeacher(updated);
    toast.info('Status Akun Diubah', `Status akun @${t.username} diubah menjadi ${nextStatus}.`);
    setFeedbackBanner(`Status akun @${t.username} diubah menjadi ${nextStatus}.`);
    setTimeout(() => setFeedbackBanner(null), 3000);
  };

  const handlePrintScheduleMatrix = () => {
    window.print();
  };

  // 1. Download Excel Template for Teachers
  const handleDownloadTemplate = () => {
    exportTeacherTemplateExcel();
    toast.success('Template Diunduh', 'Berkas template Excel data guru & mapel siap diisi.');
  };

  // 2. Export Current Teachers to Excel
  const handleExportExcelList = () => {
    exportTeacherListExcel(filteredTeachers, schoolConfig);
    toast.success('Ekspor Excel Berhasil', 'Data seluruh guru berhasil diunduh ke Excel.');
  };

  // 3. Parse and Read Excel File for Teacher Bulk Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.upload('Membaca Berkas Excel Guru', 'Memproses dan memvalidasi baris data guru...');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const parsedList: TeacherUser[] = [];

        rawData.forEach((row, idx) => {
          const nama = String(
            row['Nama Lengkap Guru'] || 
            row['Nama Lengkap & Gelar'] || 
            row['Nama Guru'] || 
            row['Nama'] || 
            row['NAMA'] || ''
          ).trim();

          if (!nama) return;

          const nuptk = String(
            row['NUPTK'] || 
            row['Nuptk'] || 
            row['nuptk'] || 
            row['NIP'] || 
            row['nip'] || ''
          ).trim();

          // 1. Penugasan Guru Mapel
          const mapelFlag = String(
            row['Penugasan Guru Mapel (Y/T)'] || 
            row['Penugasan Guru Mapel'] || 
            row['Guru Mapel'] || 'Y'
          ).trim().toUpperCase();
          const isGuruMapel = mapelFlag.startsWith('Y') || mapelFlag === '1' || mapelFlag === 'TRUE' || mapelFlag === 'YA';

          const mapelUtama = String(
            row['Mata Pelajaran Utama'] || 
            row['Mata Pelajaran'] || 
            row['Mapel'] || 
            row['MAPEL'] || 'Pendidikan Agama Islam (PAI)'
          ).trim();

          const rombelRaw = String(
            row['Rombel / Kelas Ajar'] || 
            row['Rombel Kelas'] || 
            row['Kelas Ajar'] || 
            row['Kelas'] || 
            row['Rombel'] || '7A'
          ).trim();

          // Parse classes: e.g. "7A, 7B, 8A" -> ['7A', '7B', '8A']
          let parsedClasses = rombelRaw
            .split(/[,;\/]+/)
            .map((c) => c.trim().toUpperCase())
            .filter((c) => c.length > 0);

          if (parsedClasses.length === 0) {
            parsedClasses = ['7A'];
          }

          const bebanJamRaw = Number(
            row['Beban Jam (JP/Minggu)'] || 
            row['Beban Jam'] || 
            row['JP'] || 
            row['Beban Jam Tatap Muka (JP)'] || 24
          );
          const bebanJam = isNaN(bebanJamRaw) || bebanJamRaw <= 0 ? 24 : bebanJamRaw;

          // 2. Penugasan Wali Kelas
          const waliKelasRaw = String(
            row['Kelas Binaan (Wali Kelas)'] ||
            row['Wali Kelas (Opsional)'] || 
            row['Wali Kelas'] || 
            row['Wali'] || ''
          ).trim().toUpperCase();

          const waliFlag = String(
            row['Penugasan Wali Kelas (Y/T)'] || 
            row['Penugasan Wali Kelas'] || 
            row['Wali Kelas (Y/T)'] || ''
          ).trim().toUpperCase();

          const isWaliKelas = (waliFlag.startsWith('Y') || waliFlag === '1' || waliFlag === 'TRUE' || waliFlag === 'YA') || 
            (waliKelasRaw !== '' && waliKelasRaw !== '-' && waliKelasRaw !== 'TIDAK' && waliKelasRaw !== 'T');
          
          const waliKelas = (isWaliKelas && waliKelasRaw && waliKelasRaw !== '-' && waliKelasRaw !== 'TIDAK' && waliKelasRaw !== 'T') 
            ? waliKelasRaw 
            : undefined;

          // 3. Penugasan Guru Piket
          const piketFlag = String(
            row['Penugasan Guru Piket (Y/T)'] || 
            row['Penugasan Guru Piket'] || 
            row['Guru Piket (Y/T)'] || 
            row['Guru Piket'] || ''
          ).trim().toUpperCase();

          const piketDaysRaw = String(
            row['Hari Penugasan Piket'] || 
            row['Hari Piket'] || 
            row['Piket'] || ''
          ).trim();

          let parsedPiketDays: DayOfWeek[] = [];
          if (piketDaysRaw && piketDaysRaw !== '-') {
            const rawDays = piketDaysRaw.split(/[,;\/]+/).map(d => d.trim().toLowerCase());
            rawDays.forEach(d => {
              if (d.includes('senin')) parsedPiketDays.push('Senin');
              else if (d.includes('selasa')) parsedPiketDays.push('Selasa');
              else if (d.includes('rabu')) parsedPiketDays.push('Rabu');
              else if (d.includes('kamis')) parsedPiketDays.push('Kamis');
              else if (d.includes('jumat') || d.includes("jum'at")) parsedPiketDays.push('Jumat');
              else if (d.includes('sabtu')) parsedPiketDays.push('Sabtu');
            });
          }

          const isGuruPiket = (piketFlag.startsWith('Y') || piketFlag === '1' || piketFlag === 'TRUE' || piketFlag === 'YA') || 
            parsedPiketDays.length > 0;

          if (isGuruPiket && parsedPiketDays.length === 0) {
            parsedPiketDays = ['Senin'];
          }

          const phone = String(
            row['Nomor WhatsApp'] || 
            row['Nomor WhatsApp / HP'] || 
            row['No WA'] || 
            row['No HP'] || 
            row['Telepon'] || ''
          ).trim();

          const roleRaw = String(
            row['Hak Akses (Role)'] || 
            row['Hak Akses'] || 
            row['Role'] || 'guru'
          ).toLowerCase().trim();

          let role: UserRole = 'guru';
          if (roleRaw.includes('admin')) role = 'admin';
          else if (roleRaw.includes('piket') && !isGuruMapel) role = 'piket';

          // Username generation
          let username = String(
            row['Username Akun'] || 
            row['Username'] || ''
          ).trim().toLowerCase();

          if (!username) {
            const cleanName = nama
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .slice(0, 10);
            username = `${cleanName || 'guru'}.${Math.floor(100 + Math.random() * 900)}`;
          }

          const password = String(
            row['Password Akun'] || 
            row['Password'] || 'edudigital'
          ).trim() || 'edudigital';

          const status = String(
            row['Status Kepegawaian'] || 
            row['Status'] || 'Aktif'
          ).trim() || 'Aktif';

          // Check if teacher with same NUPTK or username already exists
          const existingTeacher = teachers.find((t) => 
            (nuptk && t.nip && t.nip === nuptk) || 
            (t.username && t.username === username) ||
            (t.nama && t.nama.toLowerCase().trim() === nama.toLowerCase().trim())
          );

          const teacherId = existingTeacher ? existingTeacher.id : `T_${Date.now()}_${idx + 1}`;

          const newAssignments: TeachingAssignment[] = isGuruMapel ? [
            {
              id: `asgn_${Date.now()}_${idx + 1}`,
              mapel: mapelUtama,
              kelas: parsedClasses,
              bebanJam: bebanJam,
            },
          ] : [];

          parsedList.push({
            id: teacherId,
            nama,
            nip: nuptk || undefined,
            isGuruMapel,
            isWaliKelas,
            isGuruPiket,
            piketDays: isGuruPiket ? parsedPiketDays : undefined,
            mapel: isGuruMapel ? mapelUtama : '',
            penugasanMapel: newAssignments,
            waliKelas: isWaliKelas ? waliKelas : undefined,
            nomorHp: phone || undefined,
            role,
            username,
            password,
            status: status as any,
            totalJamMengajar: isGuruMapel ? bebanJam : 0,
          });
        });

        if (parsedList.length > 0) {
          setParsedTeachersPreview(parsedList);
          setIsImportModalOpen(true);
          toast.success('Berkas Excel Terbaca', `Ditemukan ${parsedList.length} data guru siap diimpor.`);
        } else {
          toast.warning('Berkas Kosong', 'Tidak ada baris data guru yang valid pada file Excel.');
        }
      } catch (err) {
        console.error('Error importing teacher file:', err);
        toast.error('Gagal Membaca File', 'Pastikan format kolom Excel sesuai dengan template.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // 4. Confirm and Bulk Save Imported Teachers
  const handleConfirmImport = async () => {
    if (parsedTeachersPreview.length === 0) return;
    setIsProcessingImport(true);
    try {
      if (onBulkSaveTeachers) {
        await onBulkSaveTeachers(parsedTeachersPreview);
      } else {
        await DatabaseService.bulkSaveTeachers(parsedTeachersPreview);
      }
      setFeedbackBanner(`Berhasil mengimpor ${parsedTeachersPreview.length} data guru baru ke database!`);
      setTimeout(() => setFeedbackBanner(null), 6000);
      setIsImportModalOpen(false);
      setParsedTeachersPreview([]);
    } catch (err) {
      console.error('Failed to save imported teachers:', err);
      toast.error('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data guru ke database.');
    } finally {
      setIsProcessingImport(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Header & Controls Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <SchoolLogo src={schoolConfig?.logoUrl} className="w-12 h-12 shrink-0 drop-shadow-xs bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Data Guru & Penugasan Mapel ({teachers.length} Guru)</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
                Multi-Mapel & Kelas
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {schoolConfig.namaSekolah} • Kelola data guru, kredensial login, peran operasional, penugasan mata pelajaran, dan beban jam tatap muka.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Template Excel */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl border border-emerald-200 transition-all cursor-pointer shadow-2xs"
            title="Unduh Format Template Excel untuk Pengisian Data Guru"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Unduh Template Excel</span>
          </button>

          {/* Import Excel */}
          {canManage && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-xl border border-indigo-200 transition-all cursor-pointer shadow-2xs"
              title="Unggah berkas spreadsheet Excel data guru"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Import Excel Guru</span>
            </button>
          )}

          {/* Export Excel Data Guru */}
          <button
            type="button"
            onClick={handleExportExcelList}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
            title="Ekspor Seluruh Data Guru ke Berkas Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          {/* Print PDF */}
          <button
            type="button"
            onClick={() => {
              generateTeacherListPdf(filteredTeachers, schoolConfig);
              toast.success('Dokumen PDF Disiapkan', 'Daftar nama tenaga pendidik resmi siap dicetak.');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer"
            title="Cetak Berkas PDF Resmi Daftar Tenaga Pendidik"
          >
            <Printer className="w-4 h-4 text-rose-600" />
            <span>Cetak PDF</span>
          </button>

          {/* SK Pembagian Tugas */}
          <button
            type="button"
            onClick={handlePrintScheduleMatrix}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
            title="Cetak Matriks Penugasan KBM"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>SK Tugas</span>
          </button>

          {/* Tambah Guru Manual */}
          {canManage && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner Notification */}
      {feedbackBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackBanner}</span>
        </div>
      )}

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Guru</span>
          <span className="text-lg font-black text-slate-800 mt-1 block">
            {teachers.length} Guru
          </span>
          <span className="text-[10px] text-slate-400 font-medium">SMP PGRI 1 CIKADU</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">1. Guru Mapel</span>
          <span className="text-lg font-black text-indigo-700 mt-1 block">
            {totalGuruMapel} Guru
          </span>
          <span className="text-[10px] text-indigo-600/80 font-medium">{totalBebanJamSemua} Jam KBM/Mgg</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">2. Wali Kelas</span>
          <span className="text-lg font-black text-amber-700 mt-1 block">
            {totalWaliKelas} Guru
          </span>
          <span className="text-[10px] text-amber-700/80 font-medium">Kelas 7, 8, dan 9</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">3. Guru Piket</span>
          <span className="text-lg font-black text-emerald-700 mt-1 block">
            {totalPiket} Petugas
          </span>
          <span className="text-[10px] text-emerald-700/80 font-medium">Gerbang & Scanner</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">3 Peran Sekaligus</span>
          <span className="text-lg font-black text-purple-700 mt-1 block">
            {totalTigaPeran} Guru
          </span>
          <span className="text-[10px] text-purple-700/80 font-medium">Mapel + Wali + Piket</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NUPTK, mapel, atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 3 Focused Role Filter Tabs */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
            <button
              onClick={() => setFilterRole('Semua')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterRole === 'Semua' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({teachers.length})
            </button>
            <button
              onClick={() => setFilterRole('guru_mapel')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterRole === 'guru_mapel' ? 'bg-white text-indigo-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Guru Mapel ({totalGuruMapel})</span>
            </button>
            <button
              onClick={() => setFilterRole('wali_kelas')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterRole === 'wali_kelas' ? 'bg-white text-amber-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Wali Kelas ({totalWaliKelas})</span>
            </button>
            <button
              onClick={() => setFilterRole('guru_piket')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterRole === 'guru_piket' ? 'bg-white text-emerald-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Guru Piket ({totalPiket})</span>
            </button>
            <button
              onClick={() => setFilterRole('tiga_peran')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterRole === 'tiga_peran' ? 'bg-white text-purple-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>3 Peran ({totalTigaPeran})</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-bold self-end lg:self-center">
          Menampilkan <strong className="text-slate-900">{filteredTeachers.length}</strong> dari <strong className="text-slate-900">{teachers.length}</strong> guru terdaftar
        </div>
      </div>

      {/* Bulk Delete Floating/Action Bar */}
      {selectedTeacherIds.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-rose-950 font-bold text-xs sm:text-sm">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse shrink-0"></span>
            <span>
              <strong>{selectedTeacherIds.length}</strong> guru dipilih untuk tindakan massal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTeacherIds([])}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer transition-colors"
            >
              Batalkan Pilihan
            </button>
            {canManage && (
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-rose-600/25 cursor-pointer transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isBulkDeleting ? 'Menghapus dari Database...' : `Hapus (${selectedTeacherIds.length}) Guru Terpilih`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Teachers List Table with 3 Distinct Role Badges */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                {canManage && (
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredTeachers.length > 0 && selectedTeacherIds.length === filteredTeachers.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeacherIds(filteredTeachers.map((t) => t.id));
                        } else {
                          setSelectedTeacherIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Pilih Semua Guru yang Tampil"
                    />
                  </th>
                )}
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4 min-w-[200px]">Nama Guru & NUPTK</th>
                <th className="py-3.5 px-4 min-w-[240px]">1. Penugasan Guru Mapel</th>
                <th className="py-3.5 px-4 min-w-[130px]">2. Wali Kelas</th>
                <th className="py-3.5 px-4 min-w-[160px]">3. Guru Piket</th>
                <th className="py-3.5 px-4">Akun Login</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                {canManage && <th className="py-3.5 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="py-12 text-center text-slate-400">
                    Tidak ada data guru yang cocok dengan filter atau pencarian.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, idx) => {
                  const isMapel = t.isGuruMapel !== false && (Boolean(t.mapel) || (t.penugasanMapel && t.penugasanMapel.length > 0));
                  const isWali = Boolean(t.isWaliKelas) && Boolean(t.waliKelas && t.waliKelas !== '-' && t.waliKelas !== '');
                  const duties = getTeacherPiketDuties(t);
                  const isPiket = Boolean(t.isGuruPiket) || t.role === 'piket' || duties.length > 0;
                  const piketDayList = t.piketDays && t.piketDays.length > 0 
                    ? t.piketDays 
                    : (duties.length > 0 ? duties.map((d) => d.hari) : []);

                  const teacherAssignments = t.penugasanMapel && t.penugasanMapel.length > 0 
                    ? t.penugasanMapel 
                    : (isMapel && t.mapel ? [{ id: 'legacy', mapel: t.mapel, kelas: t.waliKelas ? [t.waliKelas] : ['7A'], bebanJam: t.totalJamMengajar || 4 }] : []);

                  const totalJam = teacherAssignments.reduce((acc, a) => acc + (a.bebanJam || 0), 0) || t.totalJamMengajar || 0;

                  return (
                    <tr 
                      key={t.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        selectedTeacherIds.includes(t.id) ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      {canManage && (
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedTeacherIds.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTeacherIds((prev) => [...prev, t.id]);
                              } else {
                                setSelectedTeacherIds((prev) => prev.filter((id) => id !== t.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3.5 px-4 font-medium text-slate-400">{idx + 1}</td>
                      
                      {/* Name & NUPTK */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {t.nama}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          NUPTK: {t.nip || 'Belum diisi'}
                        </div>
                        {t.nomorHp && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{t.nomorHp}</span>
                          </div>
                        )}
                        {t.role === 'admin' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md bg-blue-100 text-blue-900 font-black text-[9px] uppercase">
                            <ShieldCheck className="w-2.5 h-2.5 text-blue-700" />
                            <span>Admin Sistem</span>
                          </span>
                        )}
                      </td>

                      {/* 1. Penugasan Guru Mapel */}
                      <td className="py-3.5 px-4">
                        {isMapel && teacherAssignments.length > 0 ? (
                          <div className="space-y-1.5">
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                              {teacherAssignments.map((asgn, asgnIdx) => (
                                <div 
                                  key={asgn.id || asgnIdx} 
                                  className="p-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/60 flex flex-col gap-0.5"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-extrabold text-[11px] text-indigo-950 truncate flex items-center gap-1">
                                      <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                                      <span className="truncate">{asgn.mapel}</span>
                                    </span>
                                    {asgn.bebanJam && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-white text-indigo-900 border border-indigo-200 shrink-0">
                                        {asgn.bebanJam} JP
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                    <span className="text-[9px] text-slate-500 font-medium">Kelas:</span>
                                    {asgn.kelas && asgn.kelas.length > 0 ? (
                                      asgn.kelas.map((k) => (
                                        <span 
                                          key={k} 
                                          className="px-1.5 py-0.2 rounded bg-white text-indigo-900 font-mono font-bold text-[9px] border border-indigo-200"
                                        >
                                          {k}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[9px] text-rose-500 font-bold">Belum ada kelas</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between pt-0.5">
                              <span>Total: <strong className="text-slate-800">{totalJam} JP</strong>/mgg</span>
                              <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold text-[9px]">
                                {teacherAssignments.length} Mapel
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 text-slate-500 text-[11px] font-semibold">
                            <span>- Tidak Mengampu -</span>
                          </span>
                        )}
                      </td>

                      {/* 2. Penugasan Wali Kelas */}
                      <td className="py-3.5 px-4">
                        {isWali ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs shadow-2xs">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Wali Kelas {t.waliKelas}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">-</span>
                        )}
                      </td>

                      {/* 3. Penugasan Guru Piket */}
                      <td className="py-3.5 px-4">
                        {isPiket ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300 font-black text-[11px] shadow-2xs">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Petugas Piket</span>
                            </span>
                            {piketDayList.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {piketDayList.map((day, didx) => (
                                  <span
                                    key={didx}
                                    className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold"
                                  >
                                    {day}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[10px] text-emerald-700 font-medium">Piket Terdaftar</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">-</span>
                        )}
                      </td>

                      {/* Login Credentials */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900 text-xs">
                          @{t.username}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Sandi terenkripsi</span>
                        </div>
                      </td>

                      {/* Status Aktif */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => canManage && handleToggleStatus(t)}
                          disabled={!canManage}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-colors ${
                            t.status === 'Non-Aktif'
                              ? 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          } ${canManage ? 'cursor-pointer' : 'cursor-default'}`}
                          title="Klik untuk ubah status aktif/non-aktif"
                        >
                          <CheckCircle2 className={`w-3 h-3 ${t.status === 'Non-Aktif' ? 'text-slate-400' : 'text-emerald-600'}`} />
                          <span>{t.status || 'Aktif'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleQuickResetPassword(t)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Reset Kata Sandi Akun ke 'edudigital'"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            {setActiveTab && (
                              <button
                                onClick={() => setActiveTab('guru-piket')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Lihat / Kelola Penugasan Guru Piket"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEdit(t)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit Data & 3 Penugasan Guru"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id, t.nama)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Akun Guru"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher Add/Edit Modal (Fokus 3 Penugasan Utama: Guru Mapel, Wali Kelas, Guru Piket) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {isEditing ? 'Edit Data & Penugasan Guru' : 'Tambah Guru & Penugasan Peran'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur 3 penugasan utama: Guru Mapel, Wali Kelas, dan Guru Piket dengan mudah
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between gap-2">
                <span>{modalError}</span>
                <button
                  type="button"
                  onClick={() => setModalError(null)}
                  className="text-rose-500 hover:text-rose-800 font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              
              {/* SECTION 1: IDENTITAS GURU & KREDENSIAL LOGIN */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                  Identitas & Kredensial Akun Guru:
                </span>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Guru & Gelar Akademik <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dra. Hj. Siti Maryam, M.Pd."
                    value={teacherNama}
                    onChange={(e) => setTeacherNama(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      NUPTK (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="16 Digit NUPTK"
                      value={teacherNip}
                      onChange={(e) => setTeacherNip(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. WhatsApp / HP
                    </label>
                    <input
                      type="text"
                      placeholder="08123456789"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Username Login <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="guru.mapel"
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="edudigital"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Status Akun
                    </label>
                    <select
                      value={teacherStatus}
                      onChange={(e) => setTeacherStatus(e.target.value as 'Aktif' | 'Non-Aktif')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Non-Aktif">Non-Aktif</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: 3 FOKUS PENUGASAN GURU */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Konfigurasi 3 Penugasan Guru:</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Dapat memilih 1, 2, atau ke-3 peran sekaligus)
                  </span>
                </div>

                {/* 1. PENUGASAN GURU MAPEL */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isGuruMapel 
                    ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-200' 
                    : 'bg-slate-50/60 border-slate-200 opacity-75'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        isGuruMapel ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                      }`}>
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900">
                          1. Penugasan Sebagai Guru Mapel
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Mengisi Jurnal Pembelajaran KBM, Jadwal Pelajaran, dan Nilai Siswa
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsGuruMapel(!isGuruMapel)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        isGuruMapel 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {isGuruMapel ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      <span>{isGuruMapel ? 'Aktif' : 'Non-Aktif'}</span>
                    </button>
                  </div>

                  {/* Isi Penugasan Mapel Saat Aktif */}
                  {isGuruMapel && (
                    <div className="mt-3.5 space-y-3 pt-3 border-t border-indigo-100 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-indigo-950 uppercase tracking-wider">
                          Daftar Mata Pelajaran yang Diampu ({assignments.length} dari maks. 10):
                        </span>
                        {assignments.length < 10 && (
                          <button
                            type="button"
                            onClick={handleAddAssignmentSlot}
                            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah Mapel Lain</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        {assignments.map((asgn, idx) => (
                          <div 
                            key={asgn.id || idx}
                            className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-black text-[10px] uppercase">
                                Mapel #{idx + 1}
                              </span>
                              {assignments.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssignmentSlot(idx)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Hapus Penugasan Mapel Ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Nama Mata Pelajaran
                                </label>
                                <input
                                  type="text"
                                  required
                                  list="standard-mapel-options-form"
                                  placeholder="Pilih atau ketik mapel..."
                                  value={asgn.mapel}
                                  onChange={(e) => handleUpdateAssignmentField(idx, 'mapel', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Beban Jam / Minggu
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    max="40"
                                    value={asgn.bebanJam || 4}
                                    onChange={(e) => handleUpdateAssignmentField(idx, 'bebanJam', Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                  />
                                  <span className="text-xs text-slate-500 font-semibold shrink-0">JP</span>
                                </div>
                              </div>
                            </div>

                            {/* Rombel Kelas Selection */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Pilih Rombel Kelas yang Diajar:
                              </label>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {AVAILABLE_CLASSES.map((kelasName) => {
                                  const isSelected = asgn.kelas.includes(kelasName);
                                  return (
                                    <button
                                      key={kelasName}
                                      type="button"
                                      onClick={() => handleToggleClassInAssignment(idx, kelasName)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white shadow-xs'
                                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      Kelas {kelasName}
                                    </button>
                                  );
                                })}
                              </div>
                              {asgn.kelas.length === 0 && (
                                <p className="text-[10px] text-rose-500 font-bold mt-1">
                                  * Harap pilih minimal 1 kelas yang diajar.
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <datalist id="standard-mapel-options-form">
                        {STANDARD_MAPEL_LIST.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>
                  )}
                </div>

                {/* 2. PENUGASAN WALI KELAS */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isWaliKelas 
                    ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-200' 
                    : 'bg-slate-50/60 border-slate-200 opacity-75'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        isWaliKelas ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                      }`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900">
                          2. Penugasan Sebagai Wali Kelas
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Mengakses Data Siswa Kelas Binaan, Pantau Siswa Binaan, dan Verifikasi Surat Izin
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsWaliKelas(!isWaliKelas)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        isWaliKelas 
                          ? 'bg-amber-600 text-white shadow-xs' 
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {isWaliKelas ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      <span>{isWaliKelas ? 'Aktif' : 'Non-Aktif'}</span>
                    </button>
                  </div>

                  {/* Pilih Kelas Binaan */}
                  {isWaliKelas && (
                    <div className="mt-3.5 space-y-2 pt-3 border-t border-amber-100 animate-in fade-in">
                      <label className="block text-[11px] font-black text-amber-950 uppercase tracking-wider">
                        Pilih Rombel Kelas Binaan (Wali Kelas):
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {AVAILABLE_CLASSES.map((c) => {
                          const isSelected = teacherWaliKelas === c;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setTeacherWaliKelas(c)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-amber-600 text-white shadow-xs scale-105'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                              <span>Wali Kelas {c}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. PENUGASAN GURU PIKET */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isGuruPiket 
                    ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200' 
                    : 'bg-slate-50/60 border-slate-200 opacity-75'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        isGuruPiket ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                      }`}>
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900">
                          3. Penugasan Sebagai Guru Piket
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Mengoperasikan Scanner Kiosk Gerbang, Absensi Apel Petugas, dan Rekap Apel
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsGuruPiket(!isGuruPiket)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        isGuruPiket 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {isGuruPiket ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      <span>{isGuruPiket ? 'Aktif' : 'Non-Aktif'}</span>
                    </button>
                  </div>

                  {/* Pengaturan Hari & Peran Piket */}
                  {isGuruPiket && (
                    <div className="mt-3.5 space-y-3 pt-3 border-t border-emerald-100 animate-in fade-in">
                      <div>
                        <label className="block text-[11px] font-black text-emerald-950 uppercase tracking-wider mb-1.5">
                          Pilih Hari Tugas Piket Mingguan (Bisa Lebih Dari 1 Hari):
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {ALL_DAYS.map((day) => {
                            const isSelected = piketDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleTogglePiketDay(day)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                                <span>{day}</span>
                              </button>
                            );
                          })}
                        </div>
                        {piketDays.length === 0 && (
                          <p className="text-[10px] text-rose-500 font-bold mt-1">
                            * Harap pilih minimal 1 hari jadwal piket.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Peran / Posisi Piket (Opsional)
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Koordinator Piket & Scanner Gerbang"
                          value={piketRole}
                          onChange={(e) => setPiketRole(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {isEditing ? 'Simpan Penugasan Guru' : 'Daftarkan Guru & 3 Penugasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PRATINJAU & KONFIRMASI IMPOR EXCEL DATA GURU      */}
      {/* ======================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 my-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Pratinjau Impor Data Guru dari Excel
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ditemukan <strong className="text-emerald-700">{parsedTeachersPreview.length} data guru</strong> siap dimasukkan ke database sistem.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Guru</span>
                <strong className="text-base text-slate-900 font-black">{parsedTeachersPreview.length} Orang</strong>
              </div>
              <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-200 text-xs">
                <span className="text-[10px] text-indigo-700 font-bold block uppercase">Guru Mapel</span>
                <strong className="text-base text-indigo-900 font-black">
                  {parsedTeachersPreview.filter((t) => t.role === 'guru').length} Orang
                </strong>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-xs">
                <span className="text-[10px] text-emerald-700 font-bold block uppercase">Petugas Piket</span>
                <strong className="text-base text-emerald-900 font-black">
                  {parsedTeachersPreview.filter((t) => t.role === 'piket').length} Orang
                </strong>
              </div>
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs">
                <span className="text-[10px] text-amber-700 font-bold block uppercase">Wali Kelas</span>
                <strong className="text-base text-amber-900 font-black">
                  {parsedTeachersPreview.filter((t) => t.waliKelas).length} Orang
                </strong>
              </div>
            </div>

            {/* Instruction / Format Note */}
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-[11px] leading-relaxed">
                <p>
                  <strong>Catatan Sinkronisasi:</strong> Data yang diimpor akan otomatis dibuatkan akun login serta penugasan mata pelajaran dan kelas ajar. Guru dengan NUPTK atau Username yang telah terdaftar akan diperbarui (*update*).
                </p>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">No</th>
                    <th className="py-2.5 px-3">Nama & NUPTK</th>
                    <th className="py-2.5 px-3">Mata Pelajaran & Rombel</th>
                    <th className="py-2.5 px-3 text-center">Beban JP</th>
                    <th className="py-2.5 px-3">Wali Kelas</th>
                    <th className="py-2.5 px-3">Akun Login</th>
                    <th className="py-2.5 px-3 text-center">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {parsedTeachersPreview.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{item.nama}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          NUPTK: {item.nip || '-'}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-indigo-900">{item.mapel}</div>
                        <div className="text-[10px] text-slate-500">
                          Kelas: {item.penugasanMapel?.[0]?.kelas.join(', ') || '-'}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">
                        {item.penugasanMapel?.[0]?.bebanJam || 24} JP
                      </td>
                      <td className="py-2 px-3">
                        {item.waliKelas ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                            Kelas {item.waliKelas}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px]">
                        <div className="text-indigo-700 font-bold">@{item.username}</div>
                        <div className="text-[10px] text-slate-400">Pass: {item.password}</div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          item.role === 'admin'
                            ? 'bg-purple-100 text-purple-900'
                            : item.role === 'piket'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-indigo-100 text-indigo-900'
                        }`}>
                          {item.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batalkan
              </button>

              <button
                type="button"
                disabled={isProcessingImport}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2"
              >
                {isProcessingImport ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan & Masukkan ke Database ({parsedTeachersPreview.length} Guru)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
