import { AuthUser, TeacherUser, TeachingJournal, Student } from '../types';

/**
 * Normalizes class strings so 'KELAS IX-A', '9A', 'IX A', 'IX-A', '9 A' are identical.
 */
export function normalizeClassName(rawClass: string = ''): string {
  if (!rawClass) return '';

  return rawClass
    .toUpperCase()
    .replace(/^KELAS\s*/i, '')
    .replace(/^KLS\s*/i, '')
    .replace(/\bIX\b/g, '9')
    .replace(/\bVIII\b/g, '8')
    .replace(/\bVII\b/g, '7')
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

/**
 * Checks if two class names represent the same class.
 */
export function isClassMatching(class1: string = '', class2: string = ''): boolean {
  if (!class1 || !class2) return false;
  if (class1 === class2) return true;
  return normalizeClassName(class1) === normalizeClassName(class2);
}

/**
 * Retrieves all distinct classes taught by a teacher, including their homeroom class.
 */
export function getTeacherTaughtClasses(
  user: AuthUser | null,
  teachers: TeacherUser[] = [],
  journals: TeachingJournal[] = []
): string[] {
  if (!user || user.role !== 'guru') {
    return [];
  }

  const rawClasses = new Set<string>();

  // 1. From user object directly
  if (user.waliKelas) {
    rawClasses.add(user.waliKelas);
  }
  user.penugasanMapel?.forEach((p) => {
    p.kelas?.forEach((k) => rawClasses.add(k));
  });

  // 2. From matching teacher in database
  const teacherObj = teachers.find(
    (t) => t.id === user.id || t.username === user.username || t.nama.toLowerCase() === user.nama.toLowerCase()
  );
  if (teacherObj) {
    if (teacherObj.waliKelas) rawClasses.add(teacherObj.waliKelas);
    teacherObj.penugasanMapel?.forEach((p) => {
      p.kelas?.forEach((k) => rawClasses.add(k));
    });
  }

  // 3. From teacher's historical teaching journals
  journals.forEach((j) => {
    if (j.guruNama?.toLowerCase() === user.nama.toLowerCase() || j.guruId === user.id) {
      if (j.kelas) rawClasses.add(j.kelas);
    }
  });

  // Special fallback for Suryadi if no specific penugasan was pre-saved: default to IX A & IX B
  if (user.nama.toLowerCase().includes('suryadi') || user.username.toLowerCase().includes('suryadi')) {
    rawClasses.add('KELAS IX-A');
    rawClasses.add('KELAS IX-B');
    rawClasses.add('9A');
    rawClasses.add('9B');
  }

  return Array.from(rawClasses);
}

/**
 * Returns the homeroom class (wali kelas) for the teacher, if any.
 */
export function getTeacherWaliKelas(
  user: AuthUser | null,
  teachers: TeacherUser[] = []
): string | undefined {
  if (!user || user.role !== 'guru') return undefined;

  if (user.waliKelas) return user.waliKelas;

  const teacherObj = teachers.find(
    (t) => t.id === user.id || t.username === user.username || t.nama.toLowerCase() === user.nama.toLowerCase()
  );
  if (teacherObj?.waliKelas) return teacherObj.waliKelas;

  // Fallback for Suryadi if not explicitly set
  if (user.nama.toLowerCase().includes('suryadi') || user.username.toLowerCase().includes('suryadi')) {
    return 'KELAS IX-A';
  }

  return undefined;
}

/**
 * Filters the master student list according to the teacher's assigned classes.
 * When not logged in as a teacher, returns all students.
 */
export function filterStudentsForTeacher(
  students: Student[],
  user: AuthUser | null,
  teachers: TeacherUser[] = [],
  journals: TeachingJournal[] = []
): Student[] {
  if (!user || user.role !== 'guru') {
    return students;
  }

  const taughtClasses = getTeacherTaughtClasses(user, teachers, journals);
  if (taughtClasses.length === 0) {
    return students;
  }

  const normalizedTaught = taughtClasses.map(normalizeClassName);

  return students.filter((s) => {
    const norm = normalizeClassName(s.kelas);
    return normalizedTaught.includes(norm);
  });
}

/**
 * Checks if a student belongs to the teacher's homeroom class.
 */
export function isStudentInTeacherHomeroom(
  student: Student,
  user: AuthUser | null,
  teachers: TeacherUser[] = []
): boolean {
  const wali = getTeacherWaliKelas(user, teachers);
  if (!wali) return false;
  return isClassMatching(student.kelas, wali);
}
