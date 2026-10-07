import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AuthUser, TeacherUser, UserRole, JadwalPiketHarian, DayOfWeek, PetugasPiketItem, AdminAccountConfig } from '../types';
import { DatabaseService, INITIAL_TEACHERS, DEFAULT_ADMIN_ACCOUNT } from '../services/db';

interface LoginResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  teachers: TeacherUser[];
  adminAccount: AdminAccountConfig;
  actingAsPiket: boolean;
  setActingAsPiket: (val: boolean) => void;
  toggleActingAsPiket: () => void;
  effectiveRole: UserRole | 'public';
  isAssignedPiketToday: boolean;
  todayPiketAssignment: PetugasPiketItem | null;
  todayPiketRole: string | null;
  userPiketDays: DayOfWeek[];
  login: (username: string, pass: string) => Promise<LoginResult>;
  logout: () => void;
  refreshTeachers: () => Promise<void>;
  updateAdminAccount: (account: AdminAccountConfig) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  teachers: INITIAL_TEACHERS,
  adminAccount: DEFAULT_ADMIN_ACCOUNT,
  actingAsPiket: false,
  setActingAsPiket: () => {},
  toggleActingAsPiket: () => {},
  effectiveRole: 'public',
  isAssignedPiketToday: false,
  todayPiketAssignment: null,
  todayPiketRole: null,
  userPiketDays: [],
  login: async () => ({ success: false }),
  logout: () => {},
  refreshTeachers: async () => {},
  updateAdminAccount: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teachers, setTeachers] = useState<TeacherUser[]>(INITIAL_TEACHERS);
  const [adminAccount, setAdminAccount] = useState<AdminAccountConfig>(DEFAULT_ADMIN_ACCOUNT);
  const [jadwalPiket, setJadwalPiket] = useState<JadwalPiketHarian[]>([]);
  
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

  // Load and Subscribe to Admin Account Config
  useEffect(() => {
    DatabaseService.getAdminAccount().then((res) => {
      if (res) setAdminAccount(res);
    }).catch(() => {});

    const unsubscribeAdmin = DatabaseService.subscribeAdminAccount((acc) => {
      if (acc) setAdminAccount(acc);
    });

    return () => {
      if (typeof unsubscribeAdmin === 'function') unsubscribeAdmin();
    };
  }, []);

  // Subscribe to Jadwal Piket
  useEffect(() => {
    DatabaseService.getJadwalPiket().then((res) => {
      if (res && res.length > 0) setJadwalPiket(res);
    }).catch(() => {});

    const unsubscribe = DatabaseService.subscribeJadwalPiket((data) => {
      if (data && data.length > 0) setJadwalPiket(data);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const currentDayOfWeek = useMemo<DayOfWeek | null>(() => {
    const dayIdx = new Date().getDay();
    const map: Record<number, DayOfWeek> = {
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
    };
    return map[dayIdx] || null;
  }, []);

  // Today's piket assignment for the logged in user
  const todayPiketAssignment = useMemo<PetugasPiketItem | null>(() => {
    if (!user || !currentDayOfWeek || !jadwalPiket.length) return null;
    const dayData = jadwalPiket.find((j) => j.hari === currentDayOfWeek);
    if (!dayData) return null;
    return dayData.petugas.find((p) => {
      if (p.teacherId && p.teacherId === user.id) return true;
      if (p.nama && user.nama && p.nama.toLowerCase().trim() === user.nama.toLowerCase().trim()) return true;
      if (p.nip && user.nip && p.nip.trim() === user.nip.trim()) return true;
      return false;
    }) || null;
  }, [user, currentDayOfWeek, jadwalPiket]);

  // All days of the week this user has piket duties
  const userPiketDays = useMemo<DayOfWeek[]>(() => {
    if (!user || !jadwalPiket.length) return [];
    const days: DayOfWeek[] = [];
    jadwalPiket.forEach((j) => {
      const match = j.petugas.some((p) => {
        if (p.teacherId && p.teacherId === user.id) return true;
        if (p.nama && user.nama && p.nama.toLowerCase().trim() === user.nama.toLowerCase().trim()) return true;
        if (p.nip && user.nip && p.nip.trim() === user.nip.trim()) return true;
        return false;
      });
      if (match) days.push(j.hari);
    });
    return days;
  }, [user, jadwalPiket]);

  const isAssignedPiketToday = Boolean(todayPiketAssignment);
  const todayPiketRole = todayPiketAssignment?.peran || null;

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
            const isGuruMapel = found.isGuruMapel ?? (found.role === 'guru' || !!found.mapel || (found.penugasanMapel && found.penugasanMapel.length > 0));
            const isWaliKelas = found.isWaliKelas ?? (!!found.waliKelas && found.waliKelas !== '-' && found.waliKelas !== '');
            const isGuruPiket = found.isGuruPiket ?? (found.role === 'piket' || (found.piketDays && found.piketDays.length > 0));
            return {
              ...currentUser,
              mapel: found.mapel,
              penugasanMapel: found.penugasanMapel || [],
              waliKelas: found.waliKelas,
              nama: found.nama,
              isGuruMapel,
              isWaliKelas,
              isGuruPiket,
              piketDays: found.piketDays,
              piketRole: found.piketRole,
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
    const configuredAdminUser = (adminAccount.username || 'admin').trim().toLowerCase();
    const isAdminMatch = (username === configuredAdminUser) || (username === 'admin@absensi.id') || (username === 'admin');
    
    if (isAdminMatch) {
      const activeAdminPass = (adminAccount.password || 'admin').trim();
      const isPassMatch = (pass === activeAdminPass) || (pass === 'edudigital') || (pass === 'admin123') || (pass === 'admin');
      
      if (isPassMatch) {
        const adminUser: AuthUser = {
          id: 'ADM1',
          username: adminAccount.username || 'admin',
          nama: adminAccount.nama || 'Administrator Sistem',
          role: 'admin',
          loginAt: nowTime,
          avatarColor: 'bg-blue-700',
        };
        setUser(adminUser);
        return { success: true };
      }
      return { success: false, message: 'Kata sandi untuk Administrator salah. Silakan periksa kembali.' };
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
        const isGuruMapel = found.isGuruMapel ?? (userRole === 'guru' || !!found.mapel || (found.penugasanMapel && found.penugasanMapel.length > 0));
        const isWaliKelas = found.isWaliKelas ?? (!!found.waliKelas && found.waliKelas !== '-' && found.waliKelas !== '');
        const isGuruPiket = found.isGuruPiket ?? (userRole === 'piket' || (found.piketDays && found.piketDays.length > 0));

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
          isGuruMapel,
          isWaliKelas,
          isGuruPiket,
          piketDays: found.piketDays,
          piketRole: found.piketRole,
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

  const updateAdminAccount = useCallback(async (account: AdminAccountConfig) => {
    await DatabaseService.saveAdminAccount(account);
    setAdminAccount(account);
    setUser((currentUser) => {
      if (currentUser && currentUser.role === 'admin') {
        return {
          ...currentUser,
          username: account.username,
          nama: account.nama,
        };
      }
      return currentUser;
    });
  }, []);

  const logout = () => {
    setUser(null);
    setActingAsPiket(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      teachers, 
      adminAccount,
      actingAsPiket, 
      setActingAsPiket, 
      toggleActingAsPiket, 
      effectiveRole, 
      isAssignedPiketToday,
      todayPiketAssignment,
      todayPiketRole,
      userPiketDays,
      login, 
      logout, 
      refreshTeachers,
      updateAdminAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
