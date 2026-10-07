import { Student, AttendanceRecord, LeaveRequest, StudentGradeItem, TeachingAssignment, UserRole, AuthUser, TeacherUser, TeachingJournal, ClassScheduleItem } from '../types';

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
 * Normalizes subject names for robust matching (removes symbols, extra spaces)
 */
export function normalizeSubjectName(rawMapel?: string): string {
  if (!rawMapel) return '';
  return rawMapel
    .toLowerCase()
    .replace(/[()&/\\,\-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if two subject names match or if one represents the other
 * (e.g. "PKN" vs "Pendidikan Pancasila & PKN", "IPA" vs "Ilmu Pengetahuan Alam (IPA)")
 */
export function isSubjectMatch(mapelA?: string, mapelB?: string): boolean {
  if (!mapelA || !mapelB) return false;
  if (mapelA === mapelB) return true;
  
  const normA = normalizeSubjectName(mapelA);
  const normB = normalizeSubjectName(mapelB);
  if (normA === normB) return true;

  // Specific common abbreviations
  if ((normA.includes('pkn') || normA.includes('pancasila')) && (normB.includes('pkn') || normB.includes('pancasila'))) return true;
  if ((normA.includes('ipa') || normA.includes('alam')) && (normB.includes('ipa') || normB.includes('alam'))) return true;
  if ((normA.includes('ips') || normA.includes('sosial')) && (normB.includes('ips') || normB.includes('sosial'))) return true;
  if ((normA.includes('pai') || normA.includes('agama islam')) && (normB.includes('pai') || normB.includes('agama islam'))) return true;
  if ((normA.includes('pjok') || normA.includes('olahraga')) && (normB.includes('pjok') || normB.includes('olahraga'))) return true;
  if ((normA.includes('matematika') || normA === 'mtk') && (normB.includes('matematika') || normB === 'mtk')) return true;
  if (normA.includes('inggris') && normB.includes('inggris')) return true;
  if (normA.includes('indonesia') && normB.includes('indonesia')) return true;
  if (normA.includes('sunda') && normB.includes('sunda')) return true;
  if (normA.includes('seni') && normB.includes('seni')) return true;
  if (normA.includes('informatika') && normB.includes('informatika')) return true;
  if (normA.includes('prakarya') && normB.includes('prakarya')) return true;

  return false;
}

/**
 * Checks if two class strings match (accounting for 'IX A' vs '9A' vs '9-A')
 */
export function isClassMatch(classA?: string, classB?: string): boolean {
  if (!classA || !classB) return false;
  return normalizeClassName(classA) === normalizeClassName(classB);
}

/**
 * Resolves all distinct subjects assigned to a teacher.
 * If the teacher is NOT a subject teacher (isGuruMapel === false), returns empty array.
 */
export function getTeacherAssignedSubjects(
  teacher?: {
    isGuruMapel?: boolean;
    penugasanMapel?: TeachingAssignment[];
    mapel?: string;
    role?: string;
  } | null
): string[] {
  if (!teacher) return [];
  if (teacher.isGuruMapel === false) return [];

  const subjectSet = new Set<string>();

  if (teacher.penugasanMapel && Array.isArray(teacher.penugasanMapel)) {
    teacher.penugasanMapel.forEach((asgn) => {
      const clean = asgn.mapel?.trim();
      if (clean) subjectSet.add(clean);
    });
  }

  if (teacher.mapel && teacher.mapel.trim()) {
    subjectSet.add(teacher.mapel.trim());
  }

  return Array.from(subjectSet);
}

/**
 * Resolves all classes assigned specifically to a given subject for the teacher.
 */
export function getTeacherClassesForSubject(
  teacher?: {
    penugasanMapel?: TeachingAssignment[];
    waliKelas?: string;
    mapel?: string;
  } | null,
  subject?: string
): string[] {
  if (!teacher) return [];
  if (!subject) return getTeacherAccessibleClasses(teacher);

  if (teacher.penugasanMapel && Array.isArray(teacher.penugasanMapel)) {
    const matchingAsgn = teacher.penugasanMapel.find((a) => isSubjectMatch(a.mapel, subject));
    if (matchingAsgn && Array.isArray(matchingAsgn.kelas) && matchingAsgn.kelas.length > 0) {
      return Array.from(new Set(matchingAsgn.kelas.map(normalizeClassName))).sort();
    }
  }

  return getTeacherAccessibleClasses(teacher);
}

/**
 * Checks whether a teacher is permitted to view/manage a specific subject.
 */
export function isSubjectAllowedForTeacher(
  teacher?: {
    isGuruMapel?: boolean;
    penugasanMapel?: TeachingAssignment[];
    mapel?: string;
    role?: string;
  } | null,
  subject?: string
): boolean {
  if (!teacher || !subject) return false;
  if (teacher.role === 'admin') return true;
  if (teacher.isGuruMapel === false) return false;

  const allowedSubjects = getTeacherAssignedSubjects(teacher);
  if (allowedSubjects.length === 0) return true; // fallback if unassigned

  return allowedSubjects.some((s) => isSubjectMatch(s, subject));
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
 * Strictly filters teaching journals for a teacher to ensure data isolation.
 * Teachers only see journals matching their assigned subjects and their authored journals.
 */
export function filterJournalsForTeacher(
  journals: TeachingJournal[],
  user?: AuthUser | null,
  actingAsPiket: boolean = false
): TeachingJournal[] {
  if (!user || user.role === 'admin' || actingAsPiket) {
    return journals;
  }

  if (user.role === 'guru') {
    const assignedSubjects = getTeacherAssignedSubjects(user);
    const assignedClasses = getTeacherAccessibleClasses(user);

    return journals.filter((j) => {
      // 1. Direct author match by ID or full name
      const isAuthorMatch = (j.guruId && j.guruId === user.id) ||
        (j.guruNama && user.nama && j.guruNama.toLowerCase().trim() === user.nama.toLowerCase().trim());
      
      if (isAuthorMatch) return true;

      // 2. Subject match (must match one of teacher's assigned subjects)
      if (assignedSubjects.length > 0) {
        const isMapelAssigned = assignedSubjects.some((s) => isSubjectMatch(s, j.mapel));
        if (!isMapelAssigned) return false;
      }

      // 3. Class match
      if (assignedClasses.length > 0 && j.kelas) {
        const isClassAssigned = assignedClasses.includes(normalizeClassName(j.kelas));
        if (!isClassAssigned) return false;
      }

      return true;
    });
  }

  return journals;
}

/**
 * Strictly filters class schedules for a teacher.
 */
export function filterSchedulesForTeacher(
  schedules: ClassScheduleItem[],
  user?: AuthUser | null,
  actingAsPiket: boolean = false
): ClassScheduleItem[] {
  if (!user || user.role === 'admin' || actingAsPiket) {
    return schedules;
  }

  if (user.role === 'guru') {
    const assignedSubjects = getTeacherAssignedSubjects(user);

    return schedules.filter((s) => {
      const isTeacherMatch = (s.guruId && s.guruId === user.id) ||
        (s.guruNama && user.nama && s.guruNama.toLowerCase().includes(user.nama.toLowerCase()));

      if (isTeacherMatch) return true;

      if (assignedSubjects.length > 0) {
        return assignedSubjects.some((subj) => isSubjectMatch(subj, s.mapel));
      }

      return false;
    });
  }

  return schedules;
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
