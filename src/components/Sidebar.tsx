import React from 'react';
import {
  LayoutDashboard,
  QrCode,
  Users,
  GraduationCap,
  BookOpen,
  FileSpreadsheet,
  HeartHandshake,
  Bot,
  CalendarCheck,
  CreditCard,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAiAnalysis: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAiAnalysis
}) => {
  const { role } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Statistik', icon: LayoutDashboard },
    { id: 'kiosk', label: 'Scan Presensi QR', icon: QrCode },
    { id: 'pantau-anak', label: 'Pantau Anak (Ortu)', icon: HeartHandshake },
    { id: 'journal', label: 'Jurnal Mengajar Guru', icon: BookOpen },
    { id: 'students', label: 'Data Siswa & Kartu', icon: Users, adminOnly: true },
    { id: 'teachers', label: 'Dewan Guru & Piket', icon: GraduationCap, adminOnly: true },
    { id: 'reports', label: 'Rekap & Cetak Laporan', icon: FileSpreadsheet },
    { id: 'public-info', label: 'Pengumuman & Agenda', icon: Bell },
  ];

  const filteredItems = navItems.filter(item => {
    if (item.adminOnly && role !== 'admin' && role !== 'kepala_sekolah') {
      return false;
    }
    return true;
  });

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 select-none">
      <div className="p-4 flex-1 mobile-scroll-container">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Menu Utama
        </div>
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* AI Attendance Analysis quick action */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Kecerdasan Sekolah
          </div>
          <button
            onClick={onOpenAiAnalysis}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-50 to-indigo-50 text-indigo-900 border border-indigo-100 hover:from-purple-100 hover:to-indigo-100 transition shadow-xs text-left group"
          >
            <div className="p-1 rounded-lg bg-indigo-600 text-white group-hover:scale-105 transition-transform">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-indigo-950">Analisis AI Presensi</p>
              <p className="text-[10px] text-indigo-600">Evaluasi kedisiplinan otomatis</p>
            </div>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <p className="text-[11px] font-semibold text-slate-700">SMP PGRI 1 CIKADU</p>
        <p className="text-[10px] text-slate-400">NPSN: 20203874 • Cianjur, Jabar</p>
      </div>
    </aside>
  );
};
