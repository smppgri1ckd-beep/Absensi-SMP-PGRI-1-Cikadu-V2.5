import React from 'react';
import { 
  QrCode, 
  LayoutDashboard, 
  Baby, 
  FileCheck, 
  Menu,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSidebar: () => void;
  onOpenLeaveModal: () => void;
  pendingLeaveCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSidebar,
  onOpenLeaveModal,
  pendingLeaveCount,
}) => {
  const { user, effectiveRole } = useAuth();

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 py-1.5 md:hidden no-print">
      <div className="flex items-center justify-around">
        
        {/* Tab 1: Role-tailored Attendance Action */}
        {effectiveRole === 'guru' ? (
          <button
            type="button"
            onClick={() => setActiveTab('journal')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'journal'
                ? 'text-indigo-600 font-extrabold scale-105'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'journal' ? 'bg-indigo-50' : ''}`}>
              <GraduationCap className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-[10px] mt-0.5">KBM Guru</span>
          </button>
        ) : effectiveRole === 'piket' ? (
          <button
            type="button"
            onClick={() => setActiveTab('apel-attendance')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'apel-attendance'
                ? 'text-emerald-600 font-extrabold scale-105'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'apel-attendance' ? 'bg-emerald-50' : ''}`}>
              <QrCode className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] mt-0.5">Apel Piket</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('kiosk')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'kiosk'
                ? 'text-blue-600 font-extrabold scale-105'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'kiosk' ? 'bg-blue-50' : ''}`}>
              <QrCode className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Pindai QR</span>
          </button>
        )}

        {/* Tab 2: Pantau Anak */}
        <button
          type="button"
          onClick={() => setActiveTab('pantau-anak')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'pantau-anak'
              ? 'text-blue-600 font-extrabold scale-105'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeTab === 'pantau-anak' ? 'bg-blue-50' : ''}`}>
            <Baby className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Pantau</span>
        </button>

        {/* Tab 3: Izin / Sakit Mandiri (With Badge) */}
        <button
          type="button"
          onClick={onOpenLeaveModal}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all cursor-pointer text-slate-500 hover:text-blue-600 relative group"
        >
          <div className="p-1 rounded-xl group-hover:bg-amber-50 text-amber-600 relative">
            <FileCheck className="w-5 h-5" />
            {pendingLeaveCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                {pendingLeaveCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 text-amber-800 font-bold">Izin/Sakit</span>
        </button>

        {/* Tab 4: Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-blue-600 font-extrabold scale-105'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeTab === 'dashboard' ? 'bg-blue-50' : ''}`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Statistik</span>
        </button>

        {/* Tab 5: Menu / Drawer */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all cursor-pointer text-slate-500 hover:text-slate-900"
        >
          <div className="p-1 rounded-xl">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 font-medium">Menu</span>
        </button>

      </div>
    </div>
  );
};
