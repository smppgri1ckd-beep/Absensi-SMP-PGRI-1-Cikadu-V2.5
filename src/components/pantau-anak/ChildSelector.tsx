import React from 'react';
import { Users, User, ChevronRight } from 'lucide-react';
import { Student } from '../../types';

interface ChildSelectorProps {
  childrenList: Student[];
  selectedStudent: Student;
  onSelectChild: (student: Student) => void;
}

export const ChildSelector: React.FC<ChildSelectorProps> = ({
  childrenList,
  selectedStudent,
  onSelectChild,
}) => {
  if (childrenList.length <= 1) return null;

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-slate-900 font-black text-sm uppercase tracking-wide">
              Anak Saya
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold">
              {childrenList.length} Anak
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Berpindah dashboard antar anak langsung tanpa pencarian ulang:
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {childrenList.map((child) => {
          const isSelected = child.nisn === selectedStudent.nisn;
          return (
            <button
              key={child.nisn}
              type="button"
              onClick={() => onSelectChild(child)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 border shadow-2xs ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isSelected ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-700'
              }`}>
                {child.nama.charAt(0)}
              </div>
              <span>{child.nama} — {child.kelas}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
