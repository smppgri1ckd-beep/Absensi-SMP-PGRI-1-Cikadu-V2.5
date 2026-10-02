import { Student, AttendanceRecord, LeaveRequest, StudentGradeItem, TeachingAssignment, UserRole, AuthUser, TeacherUser } from '../types';

/**
 * Normalizes a class name to a standard format (e.g., 'IX A', 'IX-A', '9A', '9 A' -> '9A')
 */
export function normalizeClassName(rawClass?: string): string {
  if (!rawClass) return '';
  let str = rawClass.trim().toUpperCase();
  
  // Remove prefix 'KELAS ' or 'ROMBEL '
  str = str.replace(/^(KELAS|ROMBEL)\s+/i, '');
  
  // Strip whitespace and hyphen between grade level and section
  str = str.replace(/[\s\-_]+/g, '');

  // Convert Roman numerals to Arabic
  // e.g. IXA -> 9A, VIIIA -> 8A, VIIA -> 7A
  if (str.startsWith('IX')) {
    str = '9' + str.slice(2);
  } else if (str.startsWith('VIII')) {
    str = '8' + str.slice(4);
  } else if (str.startsWith('VII')) {
    str = '7' + str.slice(3);
  }

  return str;
}

/**
 * Checks if two class strings match (accounting for 'IX A' vs '9A' vs '9-A')
 */
export function isClassMatch(classA?: string, classB?: string): boolean {
  if (!classA || !classB) return false;
  return normalizeClassName(classA) === normalizeClassName(classB);
}

/**
 * Resolves all distinct classes assigned to a teacher, including:
 * 1. Classes from teaching assignments (penugasanMapel)
 * 2. Homeroom class (waliKelas)
 */
export function getTeacherAccessibleClasses(
  teacher?: { 
    penugasanMapel?: TeachingAssignment[]; 
    waliKelas?: string; 
    mapel?: string 
  } | null
): string[] {
  if (!teacher) return [];
  const classSet = new Set<string>();

  // 1. From teaching assignments
  if (teacher.penugasanMapel && Array.isArray(teacher.penugasanMapel)) {
    teacher.penugasanMapel.forEach((asgn) => {
      if (Array.isArray(asgn.kelas)) {
        asgn.kelas.forEach((cls) => {
          const norm = normalizeClassName(cls);
          if (norm) classSet.add(norm);
        });
      }
    });
  }

  // 2. From waliKelas
  if (teacher.waliKelas) {
    const normWali = normalizeClassName(teacher.waliKelas);
    if (normWali) classSet.add(normWali);
  }

  return Array.from(classSet).sort();
}

/**
 * Checks whether a teacher is the designated homeroom teacher (wali kelas) for a given class
 */
export function isTeacherWaliKelas(
  teacher?: { waliKelas?: string } | null,
  kelas?: string
): boolean {
  if (!teacher?.waliKelas || !kelas) return false;
  return isClassMatch(teacher.waliKelas, kelas);
}

/**
 * Filters the master student list according to the teacher's assigned classes and homeroom duties.
 * If the user is an admin or is currently acting as piket, returns all students.
 */
export function filterStudentsForTeacher(
  students: Student[],
  user?: AuthUser | null,
  actingAsPiket: boolean = false
): Student[] {
  if (!user || user.role === 'admin' || actingAsPiket) {
    return students;
  }

  if (user.role === 'guru') {
    const assignedClasses = getTeacherAccessibleClasses(user);
    if (assignedClasses.length === 0) {
      // If no assignments configured, fallback to all to prevent blank lock
      return students;
    }

    return students.filter((s) => {
      const studentClassNorm = normalizeClassName(s.kelas);
      return assignedClasses.includes(studentClassNorm);
    });
  }

  // For parent ('ortu')
  if (user.role === 'ortu' && user.childrenNisns && user.childrenNisns.length > 0) {
    const allowedNisns = new Set(user.childrenNisns);
    return students.filter((s) => allowedNisns.has(s.nisn));
  }

  return students;
}

/**
 * Filters attendance records for a teacher based on their assigned classes
 */
export function filterRecordsForTeacher(
  records: AttendanceRecord[],
  user?: AuthUser | null,
  actingAsPiket: boolean = false
): AttendanceRecord[] {
  if (!user || user.role === 'admin' || actingAsPiket) {
    return records;
  }

  if (user.role === 'guru') {
    const assignedClasses = getTeacherAccessibleClasses(user);
    if (assignedClasses.length === 0) return records;

    return records.filter((r) => {
      const recordClassNorm = normalizeClassName(r.kelas);
      return assignedClasses.includes(recordClassNorm);
    });
  }

  return records;
}

/**
 * Filters leave requests for a teacher based on their assigned classes
 */
export function filterLeaveRequestsForTeacher(
  requests: LeaveRequest[],
  user?: AuthUser | null,
  actingAsPiket: boolean = false
): LeaveRequest[] {
  if (!user || user.role === 'admin' || actingAsPiket) {
    return requests;
  }

  if (user.role === 'guru') {
    const assignedClasses = getTeacherAccessibleClasses(user);
    if (assignedClasses.length === 0) return requests;

    return requests.filter((req) => {
      const reqClassNorm = normalizeClassName(req.kelas);
      return assignedClasses.includes(reqClassNorm);
    });
  }

  return requests;
}
