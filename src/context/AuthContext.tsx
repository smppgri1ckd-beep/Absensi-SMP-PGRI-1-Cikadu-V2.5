import React, { createContext, useContext, useState, useEffect } from 'react';
import { Teacher, UserRole } from '../types';
import { DB } from '../services/db';

interface AuthContextType {
  role: UserRole;
  currentUser: Teacher | null;
  selectedChildNisn: string | null;
  setRole: (role: UserRole) => void;
  setSelectedChildNisn: (nisn: string | null) => void;
  loginAsTeacher: (phoneOrNip: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('smp_auth_role') as UserRole) || 'admin';
  });
  const [currentUser, setCurrentUser] = useState<Teacher | null>(() => {
    const raw = localStorage.getItem('smp_auth_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [selectedChildNisn, setSelectedChildNisnState] = useState<string | null>(() => {
    return localStorage.getItem('smp_selected_child') || '0081234561';
  });

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('smp_auth_role', newRole);
  };

  const setSelectedChildNisn = (nisn: string | null) => {
    setSelectedChildNisnState(nisn);
    if (nisn) {
      localStorage.setItem('smp_selected_child', nisn);
    } else {
      localStorage.removeItem('smp_selected_child');
    }
  };

  const loginAsTeacher = (phoneOrNip: string): boolean => {
    const teachers = DB.getTeachers();
    const found = teachers.find(t => t.nip === phoneOrNip || t.phone === phoneOrNip || t.name.toLowerCase().includes(phoneOrNip.toLowerCase()));
    if (found) {
      setCurrentUser(found);
      setRole(found.role);
      localStorage.setItem('smp_auth_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setRole('public');
    localStorage.removeItem('smp_auth_user');
    localStorage.setItem('smp_auth_role', 'public');
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        currentUser,
        selectedChildNisn,
        setRole,
        setSelectedChildNisn,
        loginAsTeacher,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
