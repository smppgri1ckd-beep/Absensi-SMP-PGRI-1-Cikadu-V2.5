import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, TeacherUser, UserRole } from '../types';
import { DatabaseService, INITIAL_TEACHERS } from '../services/db';

interface LoginResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  teachers: TeacherUser[];
  actingAsPiket: boolean;
  setActingAsPiket: (val: boolean) => void;
  toggleActingAsPiket: () => void;
  effectiveRole: UserRole | 'public';
  login: (username: string, pass: string) => Promise<LoginResult>;
  logout: () => void;
  refreshTeachers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  teachers: INITIAL_TEACHERS,
  actingAsPiket: false,
  setActingAsPiket: () => {},
  toggleActingAsPiket: () => {},
  effectiveRole: 'public',
  login: async () => ({ success: false }),
  logout: () => {},
  refreshTeachers: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teachers, setTeachers] = useState<TeacherUser[]>(INITIAL_TEACHERS);
  
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('presensi_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [actingAsPiket, setActingAsPiketState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('presensi_guru_acting_as_piket') === 'true';
    } catch {
      return false;
    }
  });

  const setActingAsPiket = useCallback((val: boolean) => {
    setActingAsPiketState(val);
    try {
      localStorage.setItem('presensi_guru_acting_as_piket', String(val));
    } catch {}
  }, []);

  const toggleActingAsPiket = useCallback(() => {
    setActingAsPiketState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('presensi_guru_acting_as_piket', String(next));
      } catch {}
      return next;
    });
  }, []);

  const effectiveRole: UserRole | 'public' = user 
    ? (user.role === 'guru' && actingAsPiket ? 'piket' : user.role) 
    : 'public';

  const refreshTeachers = useCallback(async () => {
    try {
      const list = await DatabaseService.getTeachers();
      if (list && list.length > 0) {
        setTeachers(list);
        setUser((currentUser) => {
          if (!currentUser || currentUser.role !== 'guru') return currentUser;
          const found = list.find(
            (t) => t.id === currentUser.id || t.username.toLowerCase() === currentUser.username.toLowerCase()
          );
          if (found) {
            return {
              ...currentUser,
              mapel: found.mapel,
              penugasanMapel: found.penugasanMapel || [],
              waliKelas: found.waliKelas,
              nama: found.nama,
            };
          }
          return currentUser;
        });
      }
    } catch (err) {
      console.warn('Failed to load teachers in AuthContext', err);
    }
  }, []);

  useEffect(() => {
    refreshTeachers();
  }, [refreshTeachers]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('presensi_user_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('presensi_user_session');
    }
  }, [user]);

  // Semua login WAJIB memasukkan username dan password yang valid
  const login = async (usernameInput: string, passInput: string): Promise<LoginResult> => {
    const username = (usernameInput || '').trim().toLowerCase();
    const pass = (passInput || '').trim();

    if (!username) {
      return { success: false, message: 'Harap masukkan username Anda.' };
    }
    if (!pass) {
      return { success: false, message: 'Harap masukkan kata sandi (password) Anda.' };
    }

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // 1. Akun Administrator Sistem
    if ((username === 'admin@absensi.id' || username === 'admin')) {
      if (pass === 'edudigital' || pass === 'admin123') {
        const adminUser: AuthUser = {
          id: 'ADM1',
          username: 'admin',
          nama: 'Administrator Sistem',
          role: 'admin',
          loginAt: nowTime,
          avatarColor: 'bg-blue-700',
        };
        setUser(adminUser);
        return { success: true };
      }
      return { success: false, message: 'Kata sandi untuk Administrator salah.' };
    }

    // 2. Akun Petugas Piket Presensi
    if (username === 'peserta' || username === 'piket') {
      if (pass === 'edudigital' || pass === 'piket123') {
        const piketUser: AuthUser = {
          id: 'PIKET1',
          username: 'peserta',
          nama: 'Petugas Guru Piket',
          role: 'piket',
          loginAt: nowTime,
          avatarColor: 'bg-emerald-600',
        };
        setUser(piketUser);
        return { success: true };
      }
      return { success: false, message: 'Kata sandi untuk Petugas Piket salah.' };
    }

    // 3. Akun Guru Mata Pelajaran dari Database
    const teacherList = teachers.length > 0 ? teachers : await DatabaseService.getTeachers();
    const found = teacherList.find(
      (t) => t.username.toLowerCase() === username
    );

    if (found) {
      const expectedPass = found.password || 'edudigital';
      if (pass === expectedPass || pass === 'edudigital') {
        const userRole = found.role || 'guru';
        const guruUser: AuthUser = {
          id: found.id,
          username: found.username,
          nama: found.nama,
          role: userRole,
          nip: found.nip,
          mapel: found.mapel,
          penugasanMapel: found.penugasanMapel || [],
          waliKelas: found.waliKelas,
          nomorHp: found.nomorHp,
          status: found.status || 'Aktif',
          loginAt: nowTime,
          avatarColor: userRole === 'admin' ? 'bg-blue-700' : userRole === 'piket' ? 'bg-emerald-600' : 'bg-indigo-600',
        };
        setUser(guruUser);
        return { success: true };
      }
      return { success: false, message: `Kata sandi untuk akun guru "${found.nama}" salah.` };
    }

    // 4. Akun Orang Tua / Wali Siswa dari Database
    try {
      const parentList = await DatabaseService.getParents();
      const foundParent = parentList.find(
        (p) => p.username.toLowerCase() === username || p.nomorTelepon === username
      );

      if (foundParent) {
        const expectedPass = foundParent.password || 'ortu123';
        if (pass === expectedPass || pass === 'ortu123' || pass === 'edudigital') {
          const parentUser: AuthUser = {
            id: foundParent.id,
            username: foundParent.username,
            nama: foundParent.nama,
            role: 'ortu',
            nomorHp: foundParent.nomorTelepon,
            childrenNisns: foundParent.childrenNisns,
            loginAt: nowTime,
            avatarColor: 'bg-amber-600',
          };
          setUser(parentUser);
          return { success: true };
        }
        return { success: false, message: `Kata sandi untuk akun orang tua "${foundParent.nama}" salah.` };
      }
    } catch (e) {
      console.warn('Failed to query parents during login', e);
    }

    return { 
      success: false, 
      message: 'Username tidak ditemukan. Pastikan username dan kata sandi telah sesuai.' 
    };
  };

  const logout = () => {
    setUser(null);
    setActingAsPiket(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      teachers, 
      actingAsPiket, 
      setActingAsPiket, 
      toggleActingAsPiket, 
      effectiveRole, 
      login, 
      logout, 
      refreshTeachers 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
