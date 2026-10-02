import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  X,
  AlertCircle
} from 'lucide-react';
import { AssignmentItem, StudentAssignmentSubmission } from '../../types';

interface AssignmentListProps {
  assignments: AssignmentItem[];
  submissions: StudentAssignmentSubmission[];
}

export const AssignmentList: React.FC<AssignmentListProps> = ({
  assignments,
  submissions,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Map submission by assignmentId
  const subMap = new Map<string, StudentAssignmentSubmission>();
  submissions.forEach((s) => subMap.set(s.assignmentId, s));

  // Split assignments into Pending and Submitted
  const pendingAssignments: Array<{ assignment: AssignmentItem; submission?: StudentAssignmentSubmission }> = [];
  const submittedAssignments: Array<{ assignment: AssignmentItem; submission?: StudentAssignmentSubmission }> = [];

  assignments.forEach((a) => {
    const sub = subMap.get(a.id);
    if (!sub || sub.status === 'Belum Dikerjakan') {
      pendingAssignments.push({ assignment: a, submission: sub });
    } else {
      submittedAssignments.push({ assignment: a, submission: sub });
    }
  });

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Tugas
            </h3>
            <p className="text-xs text-slate-500">
              Pantau pekerjaan rumah, latihan, dan tenggat waktu tugas
            </p>
          </div>
        </div>

        {/* Tab Switcher: Belum Selesai vs Sudah Dikumpulkan */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔴 Belum Selesai ({pendingAssignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('submitted')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'submitted'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🟢 Sudah Dikumpulkan ({submittedAssignments.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Belum Selesai */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingAssignments.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50/60 rounded-2xl border border-emerald-200 text-emerald-900 space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
              <h4 className="text-sm font-black">Luar Biasa!</h4>
              <p className="text-xs text-emerald-700">Belum ada tugas yang perlu dikerjakan saat ini.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingAssignments.map(({ assignment }) => (
                <div
                  key={assignment.id}
                  className="p-4 rounded-2xl bg-rose-50/50 hover:bg-rose-50 border border-rose-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🔴</span>
                      <strong className="text-sm font-black text-slate-900">
                        {assignment.mapel}
                      </strong>
                    </div>

                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 pl-5">
                      {assignment.judul}
                    </h4>

                    <p className="text-xs text-rose-700 font-bold pl-5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Deadline: {assignment.deadline}</span>
                    </p>
                  </div>

                  <div className="pl-5 sm:pl-0 shrink-0">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
                      Belum dikerjakan
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sudah Dikumpulkan */}
      {activeTab === 'submitted' && (
        <div className="space-y-3">
          {submittedAssignments.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-400">Belum ada tugas yang dikumpulkan.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {submittedAssignments.map(({ assignment, submission }) => (
                <div
                  key={assignment.id}
                  className="p-4 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🟢</span>
                      <strong className="text-sm font-black text-slate-900">
                        {assignment.mapel}
                      </strong>
                    </div>

                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 pl-5">
                      {assignment.judul}
                    </h4>

                    {submission?.dikumpulkanPada && (
                      <p className="text-xs text-emerald-800 font-semibold pl-5">
                        Dikumpulkan: {submission.dikumpulkanPada}
                      </p>
                    )}

                    {submission?.catatanGuru && (
                      <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-xl border border-emerald-200 mt-1 ml-5">
                        Komentar guru: "{submission.catatanGuru}"
                      </p>
                    )}
                  </div>

                  <div className="pl-5 sm:pl-0 shrink-0 flex items-center gap-2">
                    {submission?.nilai !== undefined && (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-700 text-white font-mono font-black text-xs">
                        Nilai: {submission.nilai}
                      </span>
                    )}

                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                      submission?.status === 'Sudah Dinilai'
                        ? 'bg-purple-100 text-purple-900 border border-purple-300'
                        : submission?.status === 'Terlambat'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      {submission?.status || 'Sudah dikumpulkan'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Button: "Lihat Semua Tugas" */}
      <div className="pt-1 flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold transition-colors cursor-pointer border border-slate-200"
        >
          <span>Lihat Semua Tugas</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Modal: Semua Tugas */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] my-auto animate-in zoom-in-95"
          >
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-4 text-white flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-base">Seluruh Daftar Tugas Siswa</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {assignments.map((a) => {
                const sub = subMap.get(a.id);
                return (
                  <div key={a.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold text-[10px] uppercase">
                        {a.mapel}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">
                        Deadline: {a.deadline}
                      </span>
                    </div>

                    <h4 className="font-black text-sm text-slate-900">{a.judul}</h4>
                    <p className="text-xs text-slate-600">{a.deskripsi}</p>

                    <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-200/60">
                      <span className="text-slate-400 text-[11px]">Guru: {a.guruNama}</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] ${
                        sub?.status === 'Sudah Dinilai' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : sub?.status === 'Sudah Dikumpulkan'
                          ? 'bg-blue-100 text-blue-800'
                          : sub?.status === 'Terlambat'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {sub?.status || 'Belum dikerjakan'} {sub?.nilai !== undefined ? `(Nilai: ${sub.nilai})` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
