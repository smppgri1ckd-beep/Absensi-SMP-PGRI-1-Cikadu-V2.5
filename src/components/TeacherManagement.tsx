import React, { useState, useEffect } from 'react';
import { GraduationCap, ShieldCheck, Phone, User, CheckCircle2 } from 'lucide-react';
import { DB } from '../services/db';
import { Teacher } from '../types';

export const TeacherManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    setTeachers(DB.getTeachers());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          Dewan Guru & Petugas Piket Sekolah
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Daftar pengajar, wali kelas, serta pembagian jadwal piket ketertiban sekolah
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((t) => (
          <div
            key={t.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-black text-lg flex items-center justify-center shrink-0">
                {t.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{t.name}</h3>
                <p className="text-[11px] text-blue-600 font-semibold">{t.subject}</p>
                <p className="text-[10px] text-slate-400 font-mono">NIP: {t.nip}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {t.phone}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                {t.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
