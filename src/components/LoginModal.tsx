import React, { useState } from 'react';
import { LogIn, X, Shield, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { loginAsTeacher } = useAuth();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    const ok = loginAsTeacher(identifier.trim());
    if (ok) {
      showToast('Berhasil masuk sebagai dewan guru!', 'success');
      onClose();
    } else {
      showToast('NIP atau Nama Guru tidak terdaftar!', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <LogIn className="w-4 h-4 text-blue-600" />
            Masuk Dewan Guru & Petugas
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Masukkan NIP / Nama Guru:
            </label>
            <input
              type="text"
              placeholder="Contoh: Rahmat Hidayat / 1988..."
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Tips: Masukkan nama depan guru terdaftar (misal: Rahmat, Sri, Maman).
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            Masuk ke Sistem
          </button>
        </form>
      </div>
    </div>
  );
};
