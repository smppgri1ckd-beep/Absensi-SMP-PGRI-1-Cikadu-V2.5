import React from 'react';
import { SchoolLogo } from '../assets/schoolLogo';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { UserCheck, LogIn, LogOut, ShieldCheck, User } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogin: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLogin,
  onOpenSettings
}) => {
  const { role, currentUser, logout, setRole } = useAuth();

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return { label: 'Admin Sekolah', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
      case 'guru_piket':
        return { label: 'Guru Piket', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'guru':
        return { label: 'Dewan Guru', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'kepala_sekolah':
        return { label: 'Kepala Sekolah', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'orang_tua':
        return { label: 'Wali Murid', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      default:
        return { label: 'Publik / Tamu', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const badge = getRoleBadge();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand & School Logo */}
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <SchoolLogo className="w-9 h-9 sm:w-10 sm:h-10 transition-transform group-hover:scale-105" />
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                SMP PGRI 1 CIKADU
              </span>
              <span className="hidden md:inline-block text-[10px] uppercase font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                V2.5
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate max-w-[170px] sm:max-w-none">
              Presensi Digital & Pantau Anak
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button */}
          <div className="hidden sm:block">
            <PWAInstallButton />
          </div>

          {/* Role selector / indicator */}
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border appearance-none pr-7 cursor-pointer transition focus:ring-2 focus:ring-blue-500 focus:outline-none ${badge.color}`}
              title="Ganti Mode Peran Pengguna"
            >
              <option value="admin">Mode Admin</option>
              <option value="guru_piket">Mode Guru Piket</option>
              <option value="guru">Mode Guru</option>
              <option value="kepala_sekolah">Mode Kepala Sekolah</option>
              <option value="orang_tua">Mode Orang Tua (Pantau Anak)</option>
              <option value="public">Mode Publik</option>
            </select>
            <ShieldCheck className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
          </div>

          {/* User Status / Login */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:block text-right leading-none">
                <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500">{currentUser.subject}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Keluar Akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Masuk Guru</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
