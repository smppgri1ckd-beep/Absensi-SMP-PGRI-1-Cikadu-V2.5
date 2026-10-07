import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'banner' | 'icon';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled && !showIOSGuide) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 3000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={handleInstallClick}
          title="Install Aplikasi PWA di HP"
          className={`relative p-2 rounded-xl text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition shadow-xs ${className}`}
        >
          <Download className="w-5 h-5 animate-bounce" />
          <span className="sr-only">Install Aplikasi</span>
        </button>
      ) : variant === 'banner' ? (
        <div className={`p-3.5 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20">
              <Smartphone className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                Install Aplikasi SMP PGRI 1
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md">PWA</span>
              </h4>
              <p className="text-xs text-blue-100">Pasang di layar utama HP agar cepat dibuka tanpa mengetik URL</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            Install Sekarang
          </button>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer active:scale-95 border border-blue-400/30 ${className}`}
        >
          <Download className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Install Aplikasi HP</span>
        </button>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Install di iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-600">
              <p className="font-medium text-slate-700">
                Ikuti 2 langkah mudah untuk memasang di layar utama:
              </p>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block mb-0.5">1. Tekan tombol 'Bagikan' (Share)</span>
                  <span>Ketuk ikon bagikan di bilah menu bawah browser Safari.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block mb-0.5">2. Pilih 'Tambah ke Layar Utama'</span>
                  <span>Gulir ke bawah dan ketuk opsi <strong>"Add to Home Screen"</strong> (Tambah ke Layar Utama).</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Mengerti & Tutup
            </button>
          </div>
        </div>
      )}

      {/* Success alert */}
      {justInstalled && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-xl">
          <Check className="w-4 h-4" />
          Aplikasi berhasil diinstal di perangkat Anda!
        </div>
      )}
    </>
  );
};
