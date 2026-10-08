import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  UploadCloud, 
  Trash2, 
  X 
} from 'lucide-react';
import { soundService } from '../utils/audio';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'upload' | 'delete';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (options: { type?: ToastType; title: string; message?: string; duration?: number; playSound?: boolean }) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    upload: (title: string, message?: string, duration?: number) => void;
    delete: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timeoutsRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ 
    type = 'success', 
    title, 
    message, 
    duration = 4000,
    playSound = true 
  }: { 
    type?: ToastType; 
    title: string; 
    message?: string; 
    duration?: number;
    playSound?: boolean;
  }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastItem = {
      id,
      type,
      title,
      message,
      duration,
      timestamp: Date.now(),
    };

    // Play appropriate notification sound
    if (playSound) {
      if (type === 'error') {
        soundService.playError();
      } else if (type === 'warning') {
        soundService.playLate();
      } else {
        soundService.playSaveNotification();
      }
    }

    setToasts((prev) => {
      // Keep at most 4 simultaneous toasts to avoid cluttering screen
      const next = [newToast, ...prev];
      return next.slice(0, 4);
    });

    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      timeoutsRef.current.set(id, timer);
    }
  }, [removeToast]);

  const toast = {
    success: (title: string, message?: string, duration = 3800) => {
      showToast({ type: 'success', title, message, duration });
    },
    upload: (title: string, message?: string, duration = 4000) => {
      showToast({ type: 'upload', title, message, duration });
    },
    delete: (title: string, message?: string, duration = 3500) => {
      showToast({ type: 'delete', title, message, duration });
    },
    error: (title: string, message?: string, duration = 5000) => {
      showToast({ type: 'error', title, message, duration });
    },
    warning: (title: string, message?: string, duration = 4500) => {
      showToast({ type: 'warning', title, message, duration });
    },
    info: (title: string, message?: string, duration = 3800) => {
      showToast({ type: 'info', title, message, duration });
    },
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

// Rendered Toast Container & Animated Items
const ToastContainer: React.FC<{ toasts: ToastItem[]; onRemove: (id: string) => void }> = ({
  toasts,
  onRemove,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div 
      aria-live="polite" 
      className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={() => onRemove(t.id)} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const getTheme = () => {
    switch (toast.type) {
      case 'upload':
        return {
          icon: <UploadCloud className="w-5 h-5 text-blue-600 animate-pulse" />,
          bgBadge: 'bg-blue-50 text-blue-700 border-blue-200',
          border: 'border-blue-200/90 hover:border-blue-300',
          progressBg: 'bg-blue-500',
          accent: 'text-blue-900',
        };
      case 'delete':
        return {
          icon: <Trash2 className="w-5 h-5 text-rose-600" />,
          bgBadge: 'bg-rose-50 text-rose-700 border-rose-200',
          border: 'border-rose-200/90 hover:border-rose-300',
          progressBg: 'bg-rose-500',
          accent: 'text-rose-900',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
          bgBadge: 'bg-rose-50 text-rose-700 border-rose-200',
          border: 'border-rose-200/90 hover:border-rose-300',
          progressBg: 'bg-rose-500',
          accent: 'text-rose-900',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          bgBadge: 'bg-amber-50 text-amber-800 border-amber-200',
          border: 'border-amber-200/90 hover:border-amber-300',
          progressBg: 'bg-amber-500',
          accent: 'text-amber-950',
        };
      case 'info':
        return {
          icon: <Info className="w-5 h-5 text-sky-600" />,
          bgBadge: 'bg-sky-50 text-sky-700 border-sky-200',
          border: 'border-sky-200/90 hover:border-sky-300',
          progressBg: 'bg-sky-500',
          accent: 'text-sky-950',
        };
      case 'success':
      default:
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
          bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          border: 'border-emerald-200/90 hover:border-emerald-300',
          progressBg: 'bg-emerald-500',
          accent: 'text-emerald-950',
        };
    }
  };

  const theme = getTheme();
  const duration = toast.duration || 4000;

  return (
    <div 
      className={`pointer-events-auto relative overflow-hidden bg-white/95 backdrop-blur-md border ${theme.border} rounded-2xl shadow-xl p-3.5 flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-top-3 fade-in group`}
      role="alert"
    >
      {/* Icon Icon Badge */}
      <div className={`p-2 rounded-xl shrink-0 border ${theme.bgBadge} flex items-center justify-center shadow-2xs`}>
        {theme.icon}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0 pr-1">
        <h4 className={`text-xs font-black tracking-tight leading-snug ${theme.accent}`}>
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-[11px] font-medium text-slate-500 leading-relaxed mt-0.5 break-words">
            {toast.message}
          </p>
        )}
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        aria-label="Tutup notifikasi"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress Bar Animation */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100/80 overflow-hidden">
          <div 
            className={`h-full ${theme.progressBg} transition-all duration-linear`}
            style={{
              animation: `toast-progress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};
