import React from 'react';
import { Bell, Calendar, MapPin, Phone, Mail, Award, CheckCircle2 } from 'lucide-react';
import { DB } from '../services/db';

export const PublicInfo: React.FC = () => {
  const announcements = DB.getAnnouncements();

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Papan Pengumuman & Agenda Sekolah
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Informasi resmi kegiatan pembelajaran, kalender akademik, dan surat edaran sekolah
        </p>
      </div>

      {/* Announcements Feed */}
      <div className="space-y-4">
        {announcements.map((item) => (
          <div
            key={item.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-blue-200 transition"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                {item.category}
              </span>
              <span className="text-[11px] font-mono text-slate-400">{item.date}</span>
            </div>
            <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
            <p className="text-xs text-slate-600 leading-relaxed">{item.content}</p>
          </div>
        ))}
      </div>

      {/* Contact & School Profile */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-6 text-white text-xs space-y-3">
        <h3 className="text-sm font-bold text-white">Sekretariat SMP PGRI 1 Cikadu</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Jl. Raya Cikadu, Kec. Cikadu, Cianjur - 43284</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Hotline Sekolah: 0812-2233-4455</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Email: smp.pgri1ckd@gmail.com</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Akreditasi: B • NPSN: 20203874</span>
          </div>
        </div>
      </div>
    </div>
  );
};
