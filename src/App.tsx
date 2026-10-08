import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Dashboard } from './components/Dashboard';
import { KioskScanner } from './components/KioskScanner';
import { PantauAnakDashboard } from './components/pantau-anak/PantauAnakDashboard';
import { TeachingJournal } from './components/TeachingJournal';
import { StudentManagement } from './components/StudentManagement';
import { TeacherManagement } from './components/TeacherManagement';
import { Reports } from './components/Reports';
import { PublicInfo } from './components/PublicInfo';
import { LoginModal } from './components/LoginModal';
import { AiAttendanceAnalysisModal } from './components/AiAttendanceAnalysisModal';
import { X, Bot, ShieldCheck, HeartHandshake, BookOpen, Users, GraduationCap, FileSpreadsheet, Bell, QrCode, LayoutDashboard } from 'lucide-react';

function MainLayout() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onOpenKiosk={() => setActiveTab('kiosk')}
            onOpenAiAnalysis={() => setShowAiModal(true)}
            onNavigateToStudents={() => setActiveTab('students')}
            onNavigateToReports={() => setActiveTab('reports')}
          />
        );
      case 'kiosk':
        return <KioskScanner />;
      case 'pantau-anak':
        return <PantauAnakDashboard />;
      case 'journal':
        return <TeachingJournal />;
      case 'students':
        return <StudentManagement />;
      case 'teachers':
        return <TeacherManagement />;
      case 'reports':
        return <Reports />;
      case 'public-info':
        return <PublicInfo />;
      default:
        return (
          <Dashboard
            onOpenKiosk={() => setActiveTab('kiosk')}
            onOpenAiAnalysis={() => setShowAiModal(true)}
            onNavigateToStudents={() => setActiveTab('students')}
            onNavigateToReports={() => setActiveTab('reports')}
          />
        );
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogin={() => setShowLoginModal(true)}
        onOpenSettings={() => {}}
      />

      {/* Main Body Area: Flex Layout with Sidebar and Responsive Scroll Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAiAnalysis={() => setShowAiModal(true)}
        />

        {/* Core Content Viewport: using mobile-scroll-container with smooth touch scroll */}
        <main className="flex-1 overflow-y-auto mobile-scroll-container p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-12 overscroll-contain">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMobileMenu={() => setShowMobileMenu(true)}
      />

      {/* Mobile Drawer Menu (Accessible from mobile bottom bar) */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-slate-900 max-h-[85vh] overflow-y-auto mobile-scroll-container">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-sm text-slate-800">Menu Navigasi Aplikasi</h3>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-semibold">
              <button
                onClick={() => { setActiveTab('dashboard'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition text-left"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-600" />
                <span>Dashboard & Grafik Tren</span>
              </button>
              <button
                onClick={() => { setActiveTab('kiosk'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition text-left"
              >
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>Scan Presensi QR</span>
              </button>
              <button
                onClick={() => { setActiveTab('pantau-anak'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition text-left"
              >
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
                <span>Portal Pantau Anak (Ortu)</span>
              </button>
              <button
                onClick={() => { setActiveTab('journal'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition text-left"
              >
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Jurnal Mengajar Guru</span>
              </button>
              <button
                onClick={() => { setActiveTab('students'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition text-left"
              >
                <Users className="w-4 h-4 text-amber-600" />
                <span>Data Siswa & Cetak Kartu</span>
              </button>
              <button
                onClick={() => { setActiveTab('teachers'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition text-left"
              >
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span>Dewan Guru & Piket</span>
              </button>
              <button
                onClick={() => { setActiveTab('reports'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition text-left"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Rekap & Laporan (Excel / PDF)</span>
              </button>
              <button
                onClick={() => { setActiveTab('public-info'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition text-left"
              >
                <Bell className="w-4 h-4 text-rose-600" />
                <span>Pengumuman & Agenda</span>
              </button>
              <button
                onClick={() => { setShowAiModal(true); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 transition text-left"
              >
                <Bot className="w-4 h-4 text-purple-700" />
                <span>Analisis AI Presensi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <AiAttendanceAnalysisModal isOpen={showAiModal} onClose={() => setShowAiModal(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </AuthProvider>
  );
}
