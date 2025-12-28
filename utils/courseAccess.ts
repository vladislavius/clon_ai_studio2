import { Employee, DevelopmentPlan, DevelopmentCourse } from '../types';

export interface CourseAccessStatus {
  hasAccess: boolean;
  isLocked: boolean;
  reason?: string;
  previousCourseId?: string;
  previousCourseTitle?: string;
}

/**
 * Проверяет доступ сотрудника к курсу на основе его карты развития
 * @param employee - Сотрудник
 * @param courseId - ID курса
 * @param allCourses - Все доступные курсы (для проверки предыдущих)
 * @returns Статус доступа к курсу
 */
export function checkCourseAccess(
  employee: Employee | undefined,
  courseId: string,
  allCourses: Array<{ id: string; title: string }>
): CourseAccessStatus {
  // Администраторы имеют доступ ко всем курсам
  // (проверка isAdmin должна быть выполнена на уровне компонента)

  // Если у сотрудника нет карты развития, доступ запрещен
  if (!employee?.development_plan?.courses || employee.development_plan.courses.length === 0) {
    return {
      hasAccess: false,
      isLocked: true,
      reason: 'Курс не назначен в вашей карте развития'
    };
  }

  const developmentCourses = employee.development_plan.courses;
  
  // Находим курс в карте развития
  const courseInPlan = developmentCourses.find(dc => dc.courseId === courseId);
  
  if (!courseInPlan) {
    return {
      hasAccess: false,
      isLocked: true,
      reason: 'Курс не назначен в вашей карте развития'
    };
  }

  // Проверяем последовательность: все предыдущие курсы должны быть аттестованы
  const courseOrder = courseInPlan.order;
  const previousCourses = developmentCourses
    .filter(dc => dc.order < courseOrder)
    .sort((a, b) => a.order - b.order);

  // Проверяем, все ли предыдущие курсы аттестованы
  for (const prevCourse of previousCourses) {
    if (!prevCourse.isCertified) {
      const prevCourseInfo = allCourses.find(c => c.id === prevCourse.courseId);
      return {
        hasAccess: false,
        isLocked: true,
        reason: `Сначала необходимо пройти аттестацию по предыдущему курсу`,
        previousCourseId: prevCourse.courseId,
        previousCourseTitle: prevCourseInfo?.title || 'Предыдущий курс'
      };
    }
  }

  // Если все предыдущие курсы аттестованы, доступ разрешен
  return {
    hasAccess: true,
    isLocked: false
  };
}

/**
 * Получает список доступных курсов для сотрудника
 * @param employee - Сотрудник
 * @param allCourses - Все курсы
 * @returns Массив курсов с информацией о доступе
 */
export function getAccessibleCourses(
  employee: Employee | undefined,
  allCourses: Array<{ id: string; title: string; description: string; coverImage?: string }>
): Array<{
  course: { id: string; title: string; description: string; coverImage?: string };
  accessStatus: CourseAccessStatus;
  progress?: number;
  isCertified?: boolean;
}> {
  if (!employee?.development_plan?.courses || employee.development_plan.courses.length === 0) {
    return [];
  }

  const developmentCourses = employee.development_plan.courses;
  
  return developmentCourses
    .map(dc => {
      const course = allCourses.find(c => c.id === dc.courseId);
      if (!course) return null;

      const accessStatus = checkCourseAccess(employee, dc.courseId, allCourses);
      
      return {
        course,
        accessStatus,
        progress: dc.progress,
        isCertified: dc.isCertified
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      const orderA = developmentCourses.find(dc => dc.courseId === a.course.id)?.order || 0;
      const orderB = developmentCourses.find(dc => dc.courseId === b.course.id)?.order || 0;
      return orderA - orderB;
    });
}

/**
 * Обновляет прогресс курса в карте развития сотрудника
 * @param employee - Сотрудник
 * @param courseId - ID курса
 * @param updates - Обновления (progress, completedAt, certifiedAt, isCertified)
 * @returns Обновленный сотрудник
 */
export function updateCourseProgress(
  employee: Employee,
  courseId: string,
  updates: {
    progress?: number;
    completedAt?: string;
    certifiedAt?: string;
    isCertified?: boolean;
    startedAt?: string;
  }
): Employee {
  if (!employee.development_plan) {
    employee.development_plan = { courses: [] };
  }

  const developmentCourses = employee.development_plan.courses;
  const courseIndex = developmentCourses.findIndex(dc => dc.courseId === courseId);

  if (courseIndex === -1) {
    // Если курса нет в плане, не обновляем
    return employee;
  }

  const updatedCourses = [...developmentCourses];
  updatedCourses[courseIndex] = {
    ...updatedCourses[courseIndex],
    ...updates
  };

  return {
    ...employee,
    development_plan: {
      ...employee.development_plan,
      courses: updatedCourses
    }
  };
}

