import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Smartphone,
  Download,
  CheckCircle2,
  QrCode,
  Share2,
  Copy,
  Check,
  X,
  WifiOff,
  Wifi,
  Sparkles,
  ExternalLink,
  MoreVertical,
  PlusSquare,
  ShieldCheck,
  BarChart3,
  Users,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { generateQrDataUrl } from '../utils/qr';
import { SchoolLogo } from '../assets/schoolLogo';
import { useAuth } from '../context/AuthContext';
import {
  logPwaInstallClick,
  getLocalPwaAdoptionStats,
  subscribePwaAdoptionStats,
  syncPwaAdoptionStatsFromCloud,
  PwaAdoptionStats,
  PwaPlacementVariant,
} from '../services/pwaInstallTracker';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    typeof window !== 'undefined' && window.__deferredPwaPrompt ? window.__deferredPwaPrompt : null
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };

    checkStandalone();

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));

    if (window.__deferredPwaPrompt) {
      setDeferredPrompt(window.__deferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleCustomPromptReady = () => {
      if (window.__deferredPwaPrompt) {
        setDeferredPrompt(window.__deferredPwaPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__deferredPwaPrompt = null;
      setDeferredPrompt(null);
      logPwaInstallClick({
        action: 'app_installed',
        placement: 'header',
      }).catch(() => {});
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handleCustomPromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsInstalled(true);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handleCustomPromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const triggerNativeInstall = async (
    placement: PwaPlacementVariant = 'header',
    userRole?: string,
    userName?: string
  ): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__deferredPwaPrompt : null);
    if (!promptEvent) return 'unavailable';

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        window.__deferredPwaPrompt = null;
        setDeferredPrompt(null);
        await logPwaInstallClick({
          action: 'prompt_accepted',
          placement,
          userRole,
          userName,
        });
        return 'accepted';
      }
      await logPwaInstallClick({
        action: 'prompt_dismissed',
        placement,
        userRole,
        userName,
      });
      return 'dismissed';
    } catch {
      return 'unavailable';
    }
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isAndroid,
    triggerNativeInstall,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OnlineConnectionBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="sticky top-16 z-40 bg-rose-600 text-white px-4 py-2.5 shadow-lg border-b border-rose-500 animate-in slide-in-from-top-2 duration-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5 font-extrabold">
          <span className="p-1.5 rounded-lg bg-white/15 shrink-0">
            <WifiOff className="w-4 h-4 text-white animate-pulse" />
          </span>
          <span>
            Koneksi Internet Terputus — Aplikasi Android ini memerlukan koneksi internet aktif (Online) agar presensi &amp; jurnal selalu tersinkronisasi secara real-time.
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-rose-800 text-rose-100 text-[10px] font-black uppercase tracking-wider shrink-0">
          Menunggu Jaringan...
        </span>
      </div>
    </div>
  );
};

interface InstallPwaPromptProps {
  variant?: 'header' | 'login-card' | 'dashboard-banner' | 'menu-item';
  schoolName?: string;
  logoUrl?: string;
  className?: string;
}

export const InstallPwaPrompt: React.FC<InstallPwaPromptProps> = ({
  variant = 'header',
  schoolName = 'SMP PGRI 1 Cikidang',
  logoUrl,
  className = '',
}) => {
  const { user } = useAuth();
  const isAdminOrKepsek = user?.role === 'admin' || user?.role === 'kepsek';

  const { isInstallable, isInstalled, isIOS, triggerNativeInstall } = usePWAInstall();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'steps' | 'qr' | 'stats'>('steps');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [installSuccessToast, setInstallSuccessToast] = useState(false);
  const [adoptionStats, setAdoptionStats] = useState<PwaAdoptionStats>(() =>
    getLocalPwaAdoptionStats()
  );
  const [isSyncingStats, setIsSyncingStats] = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    const unsubscribe = subscribePwaAdoptionStats((updated) => {
      setAdoptionStats(updated);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if ((isGuideOpen && activeGuideTab === 'stats') || (isAdminOrKepsek && variant === 'dashboard-banner')) {
      setIsSyncingStats(true);
      syncPwaAdoptionStatsFromCloud()
        .then((res) => setAdoptionStats(res))
        .finally(() => setIsSyncingStats(false));
    }
  }, [isGuideOpen, activeGuideTab, isAdminOrKepsek, variant]);

  useEffect(() => {
    if (isGuideOpen && appUrl) {
      generateQrDataUrl(appUrl, 320)
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [isGuideOpen, appUrl]);

  // Jika aplikasi sudah terinstal & dibuka dalam mode standalone Android/iOS, sembunyikan tombol instalasi biasa
  // (Kecuali untuk Admin di dashboard-banner yang tetap dapat memantau adopsi aplikasi jika belum ditutup)
  if (isInstalled && !(isAdminOrKepsek && variant === 'dashboard-banner')) {
    return null;
  }

  const handleInstallClick = async () => {
    await logPwaInstallClick({
      action: 'install_clicked',
      placement: variant,
      userRole: user?.role || 'publik',
      userName: user?.nama,
    });

    if (isInstallable) {
      const outcome = await triggerNativeInstall(variant, user?.role, user?.nama);
      if (outcome === 'accepted') {
        setInstallSuccessToast(true);
        setTimeout(() => setInstallSuccessToast(false), 4000);
        return;
      }
      if (outcome === 'dismissed') {
        return;
      }
    }
    // Jika browser belum memicu native prompt (misal di iOS, iframe preview, atau browser in-app), tampilkan modal panduan & QR
    setActiveGuideTab('steps');
    setIsGuideOpen(true);
  };

  const handleOpenQrModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    logPwaInstallClick({
      action: 'qr_opened',
      placement: variant,
      userRole: user?.role || 'publik',
      userName: user?.nama,
    }).catch(() => {});
    setActiveGuideTab('qr');
    setIsGuideOpen(true);
  };

  const handleOpenStatsModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveGuideTab('stats');
    setIsGuideOpen(true);
  };

  const handleCopyLink = async () => {
    if (!appUrl) return;
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleShareWhatsApp = () => {
    logPwaInstallClick({
      action: 'whatsapp_shared',
      placement: 'guide-modal',
      userRole: user?.role || 'publik',
      userName: user?.nama,
    }).catch(() => {});

    const text = encodeURIComponent(
      `*Aplikasi Android Resmi ${schoolName}*\n\n` +
      `Instal secara *GRATIS* di HP Android (Tanpa Play Store) untuk kemudahan Presensi Siswa, Jurnal Mengajar Guru, dan Portal Pantau Anak:\n\n` +
      `👉 ${appUrl}\n\n` +
      `_Buka tautan di atas menggunakan browser Chrome di HP Android lalu ketuk tombol "Instal Aplikasi Android"._`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const conversionRate =
    adoptionStats.totalInstallClicks > 0
      ? Math.min(
          100,
          Math.round(
            (adoptionStats.totalAcceptedInstalls / adoptionStats.totalInstallClicks) * 100
          )
        )
      : 0;

  const formatActionBadge = (aksi: string) => {
    switch (aksi) {
      case 'prompt_accepted':
      case 'app_installed':
        return {
          label: 'Terinstal di HP',
          cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'install_clicked':
        return {
          label: 'Klik Tombol Instal',
          cls: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'whatsapp_shared':
        return {
          label: 'Bagikan ke WA',
          cls: 'bg-teal-100 text-teal-800 border-teal-200',
        };
      case 'qr_opened':
        return {
          label: 'Buka QR Instal',
          cls: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        };
      default:
        return {
          label: 'Batal Prompt',
          cls: 'bg-slate-100 text-slate-600 border-slate-200',
        };
    }
  };

  const guideModal = isGuideOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsGuideOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[92dvh] overflow-y-auto shadow-2xl border border-slate-200 p-5 sm:p-6 text-slate-900 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-1.5 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <SchoolLogo src={logoUrl} className="w-9 h-9 bg-white rounded-xl p-1" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>100% Gratis • Tanpa Play Store</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Instal Aplikasi Android
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {schoolName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div
              className={`grid ${
                isAdminOrKepsek ? 'grid-cols-3' : 'grid-cols-2'
              } gap-1.5 p-1 bg-slate-100 rounded-2xl mt-4`}
            >
              <button
                type="button"
                onClick={() => setActiveGuideTab('steps')}
                className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeGuideTab === 'steps'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Cara Instal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveGuideTab('qr');
                  logPwaInstallClick({
                    action: 'qr_opened',
                    placement: 'guide-modal',
                    userRole: user?.role || 'publik',
                    userName: user?.nama,
                  }).catch(() => {});
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeGuideTab === 'qr'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">QR &amp; Bagikan</span>
              </button>
              {isAdminOrKepsek && (
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('stats')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeGuideTab === 'stats'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Adopsi ({adoptionStats.totalInstallClicks})</span>
                </button>
              )}
            </div>

            {activeGuideTab === 'steps' && (
              <div className="mt-4 space-y-4">
                {/* Native Direct Install Callout if available */}
                {isInstallable && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                          Instalasi Instan Siap
                        </span>
                        <h4 className="font-black text-sm mt-1">
                          Pasang Langsung Sekarang
                        </h4>
                        <p className="text-[11px] text-blue-100 mt-0.5">
                          Perangkat Anda mendukung pemasangan aplikasi otomatis 1-klik.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await logPwaInstallClick({
                            action: 'install_clicked',
                            placement: 'guide-modal',
                            userRole: user?.role || 'publik',
                            userName: user?.nama,
                          });
                          const res = await triggerNativeInstall('guide-modal', user?.role, user?.nama);
                          if (res === 'accepted') setIsGuideOpen(false);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 shadow-sm cursor-pointer transition-transform hover:scale-105"
                      >
                        Instal Sekarang
                      </button>
                    </div>
                  </div>
                )}

                {/* Langkah Instalasi di Android Chrome */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span>Panduan Instal di HP Android (Chrome)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                      2 Langkah Mudah
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-800 flex items-center gap-1 flex-wrap">
                          <span>Ketuk ikon menu titik tiga</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700">
                            <MoreVertical className="w-3 h-3" />
                          </span>
                          <span>di pojok kanan atas browser Chrome.</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Pastikan Anda membuka halaman ini langsung di aplikasi Google Chrome pada HP Android.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-800 flex items-center gap-1 flex-wrap">
                          <span>Pilih menu</span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-black">
                            Instal aplikasi
                          </span>
                          <span>atau</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-bold">
                            Tambahkan ke layar utama
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Konfirmasi dengan menekan <strong>Instal</strong>. Ikon aplikasi <strong>Absensi PGRI</strong> akan langsung muncul di layar utama HP Anda!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Jika pengguna membuka dari iPhone/iPad (iOS Safari) */}
                {isIOS && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5 text-xs">
                    <p className="font-black text-amber-950 flex items-center gap-1.5">
                      <PlusSquare className="w-4 h-4 text-amber-700" />
                      <span>Pengguna iPhone / iPad (Safari):</span>
                    </p>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      1. Ketuk tombol <strong>Bagikan (Share)</strong> di bagian bawah Safari.<br />
                      2. Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                    </p>
                  </div>
                )}

                {/* Keunggulan Aplikasi */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <span className="block text-[10px] font-black text-emerald-950">100% Gratis</span>
                    <span className="block text-[9px] text-emerald-700">Tanpa biaya langganan</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <Smartphone className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                    <span className="block text-[10px] font-black text-blue-950">Layar Penuh</span>
                    <span className="block text-[9px] text-blue-700">Ikon di Home Screen</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                    <Wifi className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                    <span className="block text-[10px] font-black text-indigo-950">Real-Time Online</span>
                    <span className="block text-[9px] text-indigo-700">Data selalu akurat</span>
                  </div>
                </div>
              </div>
            )}

            {activeGuideTab === 'qr' && (
              <div className="mt-4 space-y-4 text-center">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                  <span className="text-[11px] font-extrabold text-slate-600 mb-2">
                    Scan Kode QR ini menggunakan kamera HP Android:
                  </span>
                  {qrDataUrl ? (
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                      <img
                        src={qrDataUrl}
                        alt="QR Code Instal Aplikasi Android"
                        className="w-44 h-44 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-44 h-44 rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400">
                      Memuat QR...
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 mt-2.5 max-w-xs leading-relaxed">
                    Arahkan kamera HP atau pemindai QR ke kode di atas untuk membuka dan menginstal aplikasi di HP Android Guru, Siswa, atau Orang Tua.
                  </p>
                </div>

                {/* Copy URL & Share to WhatsApp */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Tautan Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-600" />
                        <span>Salin Link Aplikasi</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Bagikan ke WhatsApp</span>
                  </button>
                </div>

                {appUrl && (
                  <a
                    href={appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka di Tab Browser Penuh (Rekomendasi jika di dalam pratinjau)</span>
                  </a>
                )}
              </div>
            )}

            {activeGuideTab === 'stats' && isAdminOrKepsek && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                      <span>Metrik Adopsi Aplikasi Android (PWA)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Rekam jejak klik tombol instalasi &amp; konversi perangkat secara real-time
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSyncingStats(true);
                      syncPwaAdoptionStatsFromCloud()
                        .then((res) => setAdoptionStats(res))
                        .finally(() => setIsSyncingStats(false));
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    title="Segarkan Data Statistik dari Cloud"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStats ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                </div>

                {/* 3 KPI Summary Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200">
                    <span className="text-[10px] font-bold text-blue-700 block">Klik Tombol Instal</span>
                    <span className="text-xl font-black text-blue-950 font-mono">
                      {adoptionStats.totalInstallClicks}
                    </span>
                    <span className="text-[9px] text-blue-600 font-semibold block mt-0.5">
                      Total minat instal
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-700 block">Prompt Diterima</span>
                    <span className="text-xl font-black text-emerald-950 font-mono">
                      {adoptionStats.totalAcceptedInstalls}
                    </span>
                    <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5">
                      Konversi: {conversionRate}%
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200">
                    <span className="text-[10px] font-bold text-indigo-700 block">Buka QR &amp; WA</span>
                    <span className="text-xl font-black text-indigo-950 font-mono">
                      {adoptionStats.totalQrAndShares}
                    </span>
                    <span className="text-[9px] text-indigo-600 font-semibold block mt-0.5">
                      Distribusi tautan
                    </span>
                  </div>
                </div>

                {/* Breakdown Perangkat & Peran */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Perangkat Pengguna</span>
                    </span>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">HP Android</span>
                      <span className="font-mono font-black text-emerald-700">
                        {adoptionStats.byPlatform.Android}x
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">iOS (iPhone/iPad)</span>
                      <span className="font-mono font-black text-slate-700">
                        {adoptionStats.byPlatform.iOS}x
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">Desktop / Laptop</span>
                      <span className="font-mono font-black text-blue-700">
                        {adoptionStats.byPlatform.Desktop}x
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Peran Pengguna</span>
                    </span>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">Dewan Guru &amp; Piket</span>
                      <span className="font-mono font-black text-indigo-700">
                        {(adoptionStats.byRole.guru || 0) + (adoptionStats.byRole.piket || 0)}x
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">Orang Tua / Wali</span>
                      <span className="font-mono font-black text-amber-700">
                        {adoptionStats.byRole.ortu || 0}x
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">Publik / Siswa / Admin</span>
                      <span className="font-mono font-black text-slate-700">
                        {(adoptionStats.byRole.publik || 0) + (adoptionStats.byRole.admin || 0)}x
                      </span>
                    </div>
                  </div>
                </div>

                {/* Log Aktivitas Instalasi Terbaru */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-600" />
                      <span>Log Aktivitas Klik Instalasi Terbaru</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Format 24 Jam (WIB)
                    </span>
                  </div>

                  {adoptionStats.recentLogs.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-400">
                      Belum ada rekaman klik instalasi. Log akan tercatat otomatis saat pengguna menekan tombol Instal Aplikasi.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {adoptionStats.recentLogs.slice(0, 15).map((log) => {
                        const badge = formatActionBadge(log.aksi);
                        return (
                          <div
                            key={log.id}
                            className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-[11px] bg-white hover:bg-slate-50/80"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-slate-800 truncate">
                                  {log.namaPengguna}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[9px] uppercase">
                                  {log.peran}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded border font-bold text-[9px] ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {log.browserInfo} • Sumber: {log.lokasiTombol}
                              </p>
                            </div>
                            <div className="text-right shrink-0 font-mono">
                              <span className="font-bold text-slate-800 block">{log.waktu} WIB</span>
                              <span className="text-[9px] text-slate-400 block">{log.tanggal}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Modal */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Aman &amp; Resmi • Mode Online
              </span>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  // Variant 1: Tombol Header (di Navbar utama untuk semua peran)
  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          title="Instal Aplikasi Android Gratis di HP Anda"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xs transition-all cursor-pointer shrink-0 ring-1 ring-emerald-400/40 ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">Instal Aplikasi</span>
          <span className="md:hidden text-[11px] whitespace-nowrap">Instal APK/Web</span>
        </button>
        {guideModal}
      </>
    );
  }

  // Variant 2: Item di dalam Menu Dropdown Profil
  if (variant === 'menu-item') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Instal Aplikasi Android (Gratis)</span>
        </button>
        {guideModal}
      </>
    );
  }

  // Variant 3: Kartu di Halaman Login (LoginModal)
  if (variant === 'login-card') {
    return (
      <>
        <div className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/90 shadow-2xs ${className}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-900">
                    Aplikasi Android Resmi
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider">
                    Gratis
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  Pasang di layar utama HP Android untuk akses cepat 1-klik tanpa Play Store (Mode Online Real-Time).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isInstallable ? 'Instal Sekarang' : 'Instal Aplikasi'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenQrModal}
                title="Tampilkan QR Code untuk HP Android"
                className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>

          {installSuccessToast && (
            <div className="mt-2.5 pt-2 border-t border-emerald-200/70 flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Aplikasi sedang dipasang ke layar utama HP Android Anda!</span>
            </div>
          )}
        </div>
        {guideModal}
      </>
    );
  }

  // Variant 4: Banner di Dashboard Utama
  if (isBannerDismissed) return null;

  return (
    <>
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-4 sm:p-5 text-white shadow-md border border-emerald-700/60 ${className}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300 shadow-inner">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Aplikasi Android Gratis
                </span>
                <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  <span>Sinkronisasi Online Real-Time</span>
                </span>
                {isAdminOrKepsek && (
                  <button
                    type="button"
                    onClick={handleOpenStatsModal}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold border border-white/20 transition-colors cursor-pointer"
                    title="Lihat Statistik Adopsi Aplikasi Android (Khusus Admin)"
                  >
                    <BarChart3 className="w-3 h-3 text-amber-300" />
                    <span>
                      Adopsi: {adoptionStats.totalInstallClicks} Klik • {adoptionStats.totalAcceptedInstalls} Terinstal
                    </span>
                  </button>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-black text-white leading-snug">
                Instal Aplikasi {schoolName} di HP Android Anda
              </h3>
              <p className="text-xs text-emerald-100/85 mt-0.5">
                Akses absensi apel, jurnal mengajar guru, dan pantau anak langsung dari layar utama HP layaknya aplikasi Android asli tanpa biaya Play Store.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Download className="w-4 h-4" />
                <span>{isInstallable ? 'Instal Aplikasi Sekarang' : 'Instal di HP Android'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenQrModal}
              className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Scan QR dari HP Android"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">QR HP</span>
            </button>
            {isAdminOrKepsek && (
              <button
                type="button"
                onClick={handleOpenStatsModal}
                className="px-3 py-2.5 rounded-xl bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Pantau Statistik Adopsi Aplikasi Android"
              >
                <BarChart3 className="w-4 h-4 text-emerald-200" />
                <span className="hidden sm:inline">Statistik Adopsi</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsBannerDismissed(true)}
              className="p-2 rounded-xl text-emerald-200/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Sembunyikan banner sementara"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {guideModal}
    </>
  );
};
