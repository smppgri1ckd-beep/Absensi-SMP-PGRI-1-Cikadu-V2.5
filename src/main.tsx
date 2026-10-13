import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Ensure pure cloud/server-authoritative synchronization with NO stale offline storage:
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const keysToDrop = [
      'students', 'teachers', 'attendance', 'class_schedules', 'jadwal_piket_data',
      'leave_requests', 'activity_logs', 'teaching_journals', 'teacher_attendance',
      'teacher_leave_requests', 'student_grades', 'school_config', 'school_events',
      'presensi_user_session', 'presensi_guru_acting_as_piket'
    ];
    keysToDrop.forEach((k) => localStorage.removeItem(k));
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('pgri_') || k.startsWith('presensi_') || k.startsWith('SCH_') || k.startsWith('LEAVE_'))) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
