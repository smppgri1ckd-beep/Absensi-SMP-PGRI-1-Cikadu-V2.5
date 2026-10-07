import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from '../assets/schoolLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { user, login, logout } = useAuth();
  
  // Credentials Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await login(username, password);
      if (res.success) {
        setSuccessMsg('Verifikasi berhasil! Mengalihkan sesi...');
        setTimeout(() => {
          setUsername('');
          setPassword('');
          setSuccessMsg(null);
          setIsSubmitting(false);
          onClose();
        }, 600);
      } else {
        setErrorMsg(res.message || 'Username atau kata sandi tidak sesuai.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat memproses login.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full max-h-[92dvh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col justify-between">
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <SchoolLogo className="w-11 h-11 shrink-0 drop-shadow-xs bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs" />
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Login Sistem
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Silakan masukkan username dan kata sandi Anda
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Session Status Card if user is already logged in */}
          {user ? (
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shadow-inner ring-2 ring-white/20 ${
                    user.role === 'admin'
                      ? 'bg-blue-600 text-white'
                      : user.role === 'guru'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {user.role === 'admin' ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : user.role === 'guru' ? (
                      <GraduationCap className="w-5 h-5" />
                    ) : (
                      <UserCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        user.role === 'admin'
                          ? 'bg-blue-400 text-blue-950'
                          : user.role === 'guru'
                          ? 'bg-indigo-300 text-indigo-950'
                          : 'bg-emerald-300 text-emerald-950'
                      }`}>
                        {user.role === 'admin' ? 'Administrator' : user.role === 'guru' ? 'Guru Mapel' : 'Petugas Piket'}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Sesi Aktif
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-white mt-1 leading-tight">
                      {user.nama}
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                      Username: <span className="font-mono text-white font-bold">{user.username}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 sm:pt-0">
                  <button
                    onClick={() => {
                      logout();
                      setSuccessMsg('Sesi telah diakhiri. Silakan login kembali.');
                      setTimeout(() => setSuccessMsg(null), 1500);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                    title="Keluar Sesi"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Feedback alerts */}
          {successMsg && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Secure Login Form */}
          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="Masukkan username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kata Sandi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk Sesi Pengguna'}</span>
            </button>
          </form>

        </div>

        {/* Modal Footer */}
        <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>SMP PGRI 1 Cikadu</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
          >
            Batal
          </button>
        </div>

      </div>
    </div>
  );
};
