import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, Archive, Trash2, ArchiveRestore, Edit2, Lock } from 'lucide-react';
import { CourseViewer } from './CourseViewer';
import { CourseEditor } from './CourseEditor';
import { useToast } from './Toast';
import { Employee } from '../types';
import { checkCourseAccess } from '../utils/courseAccess';

interface CourseSection {
  id: string;
  type: 'text' | 'image' | 'heading' | 'list' | 'quote';
  content: string;
  order: number;
  imageUrl?: string;
  listItems?: string[];
}

interface CourseTask {
  id: string;
  sequenceNumber: number;
  text: string;
  type: 'reading' | 'practical' | 'theoretical' | 'essay' | 'training' | 'other';
  description?: string;
  checked: boolean;
  checkedAt?: string;
  submission?: {
    content?: string;
    fileUrl?: string;
    submittedAt: string;
  };
  curatorNotes?: string;
  requiresRevision?: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  sections: CourseSection[];
  tasks: CourseTask[];
  createdAt: string;
  updatedAt: string;
  coverImage?: string; // URL обложки курса
  archived?: boolean; // Архивный курс (скрыт из основного списка)
}

interface CoursesSectionProps {
  isAdmin?: boolean;
  employees?: Employee[]; // Список сотрудников для получения текущего пользователя
}

export const CoursesSection: React.FC<CoursesSectionProps> = ({ isAdmin, employees }) => {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'student' | 'curator'; message: string; timestamp: string; attachments?: Array<{ id: string; name: string; url: string; type: string; size: number }> }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | undefined>(undefined);

  // Получаем текущего сотрудника из сессии
  useEffect(() => {
    const getCurrentEmployee = async () => {
      try {
        const { supabase } = await import('../supabaseClient');
        if (!supabase || !employees || employees.length === 0) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const emp = employees.find(e => e.email === user.email);
          setCurrentEmployee(emp);
        }
      } catch (err) {
        // Игнорируем ошибки
      }
    };
    if (employees && employees.length > 0) {
      getCurrentEmployee();
    }
  }, [employees]);

  // Загружаем курсы из localStorage при монтировании
  useEffect(() => {
    const savedCourses = localStorage.getItem('courses');
    const savedArchived = localStorage.getItem('archivedCourses');
    if (savedCourses) {
      try {
        const parsed = JSON.parse(savedCourses);
        const archived = savedArchived ? JSON.parse(savedArchived) : [];
        setCourses([...parsed, ...archived]);
      } catch (err) {
        console.error('Ошибка при загрузке курсов:', err);
      }
    } else {
      // Если курсов нет, добавляем демо-курс
      import('../data/demoCourse').then(({ demoCourse }) => {
        setCourses([demoCourse]);
        localStorage.setItem('courses', JSON.stringify([demoCourse]));
      });
    }
  }, []);

  // Сохраняем курсы в localStorage
  const saveCourses = (newCourses: Course[]) => {
    setCourses(newCourses);
    const activeCourses = newCourses.filter(c => !c.archived);
    const archivedCourses = newCourses.filter(c => c.archived);
    localStorage.setItem('courses', JSON.stringify(activeCourses));
    if (archivedCourses.length > 0) {
      localStorage.setItem('archivedCourses', JSON.stringify(archivedCourses));
    } else {
      localStorage.removeItem('archivedCourses');
    }
  };

  const handleArchiveCourse = (courseId: string) => {
    const updated = courses.map(c => 
      c.id === courseId ? { ...c, archived: true } : c
    );
    saveCourses(updated);
    if (selectedCourse?.id === courseId) {
      setSelectedCourse(null);
    }
    toast.success('Курс отправлен в архив');
  };

  const handleUnarchiveCourse = (courseId: string) => {
    const updated = courses.map(c => 
      c.id === courseId ? { ...c, archived: false } : c
    );
    saveCourses(updated);
    toast.success('Курс восстановлен из архива');
  };

  const handleDeleteCourse = (courseId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот курс? Это действие нельзя отменить.')) {
      const filtered = courses.filter(c => c.id !== courseId);
      saveCourses(filtered);
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
      }
      toast.success('Курс удален');
    }
  };


  const handleTaskToggle = (taskId: string) => {
    if (!selectedCourse) return;
    const updatedTasks = selectedCourse.tasks.map(task =>
      task.id === taskId
        ? { ...task, checked: !task.checked, checkedAt: !task.checked ? new Date().toISOString() : undefined }
        : task
    );
    const updatedCourse = { ...selectedCourse, tasks: updatedTasks };
    setSelectedCourse(updatedCourse);
    
    // Сохраняем изменения
    const updatedCourses = courses.map(c => c.id === updatedCourse.id ? updatedCourse : c);
    saveCourses(updatedCourses);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<CourseTask>) => {
    if (!selectedCourse) return;
    const updatedTasks = selectedCourse.tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    );
    const updatedCourse = { ...selectedCourse, tasks: updatedTasks };
    setSelectedCourse(updatedCourse);
    
    // Сохраняем изменения
    const updatedCourses = courses.map(c => c.id === updatedCourse.id ? updatedCourse : c);
    saveCourses(updatedCourses);
  };

  const handleSendMessage = (attachments?: Array<{ id: string; name: string; url: string; type: string; size: number }>) => {
    if (!newMessage.trim() && (!attachments || attachments.length === 0)) return;
    const message = {
      id: Date.now().toString(),
      sender: 'student' as const,
      message: newMessage,
      timestamp: new Date().toISOString(),
      attachments: attachments || undefined,
    };
    setChatMessages([...chatMessages, message]);
    setNewMessage('');
  };

  const handleSaveCourse = (courseData: Course) => {
    const updated = courses.map(c => c.id === courseData.id ? { ...courseData, updatedAt: new Date().toISOString() } : c);
    saveCourses(updated);
    setEditingCourse(null);
    toast.success('Курс обновлен');
  };

  // Если открыт редактор
  if (editingCourse && isAdmin) {
    return (
      <CourseEditor
        course={editingCourse}
        onSave={handleSaveCourse}
        onCancel={() => setEditingCourse(null)}
        isAdmin={isAdmin}
      />
    );
  }

  // Если выбран курс для просмотра
  if (selectedCourse) {
    return (
      <CourseViewer
        course={selectedCourse}
        onBack={() => setSelectedCourse(null)}
        onTaskToggle={handleTaskToggle}
        onTaskExpand={setExpandedTaskId}
        expandedTaskId={expandedTaskId}
        showChat={showChat}
        showVideo={showVideo}
        onToggleChat={() => setShowChat(!showChat)}
        onToggleVideo={() => setShowVideo(!showVideo)}
        chatMessages={chatMessages}
        newMessage={newMessage}
        onMessageChange={setNewMessage}
        onSendMessage={(attachments) => handleSendMessage(attachments)}
        isAdmin={isAdmin}
        studentName="Сотрудник"
        onTaskUpdate={handleTaskUpdate}
      />
    );
  }

  const activeCourses = courses.filter(c => !c.archived);
  const archivedCourses = courses.filter(c => c.archived);
  const displayedCourses = showArchived ? archivedCourses : activeCourses;

  // Список курсов
  return (
    <div className="flex flex-col h-full animate-in fade-in space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {showArchived ? 'Архивные курсы' : 'Курсы'}
            </h2>
            <p className="text-slate-600">
              {showArchived 
                ? 'Архивные курсы скрыты из основного списка' 
                : 'Изучайте материалы и выполняйте задания'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                showArchived
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Archive size={18} />
              {showArchived ? 'Показать активные' : 'Показать архив'}
            </button>
          )}
        </div>
        {isAdmin && !showArchived && (
          <div className="text-sm text-slate-500">
            Активных курсов: {activeCourses.length} {archivedCourses.length > 0 && `• В архиве: ${archivedCourses.length}`}
          </div>
        )}
      </div>

      {/* Courses Grid */}
      {displayedCourses.length === 0 ? (
        <div className="bg-white p-16 rounded-xl border border-slate-200 shadow-sm text-center">
          <BookOpen className="mx-auto text-slate-300 mb-6" size={64} />
          <h3 className="text-xl font-bold text-slate-700 mb-2">
            {showArchived ? 'Архив пуст' : 'Курсы не найдены'}
          </h3>
          <p className="text-slate-500 mb-6">
            {showArchived
              ? 'В архиве пока нет курсов'
              : isAdmin 
                ? 'Перейдите в "Конструктор курсов" для создания первого курса' 
                : 'Курсы появятся здесь'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedCourses.map((course) => {
            const completedTasks = course.tasks.filter(t => t.checked).length;
            const totalTasks = course.tasks.length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Проверяем доступ к курсу (только для не-админов)
            const accessStatus = !isAdmin && currentEmployee 
              ? checkCourseAccess(currentEmployee, course.id, courses.map(c => ({ id: c.id, title: c.title })))
              : { hasAccess: true, isLocked: false };

            const isLocked = !isAdmin && accessStatus.isLocked;

            return (
              <div
                key={course.id}
                className={`bg-white rounded-xl border-2 ${
                  isLocked 
                    ? 'border-slate-300 opacity-60 cursor-not-allowed' 
                    : 'border-slate-200 shadow-sm hover:shadow-xl cursor-pointer transform hover:-translate-y-1'
                } transition-all overflow-hidden group relative`}
                onClick={() => {
                  if (!isLocked) {
                    setSelectedCourse(course);
                  } else {
                    toast.error(accessStatus.reason || 'Курс недоступен');
                  }
                }}
              >
                {/* Course Cover */}
                <div className="h-56 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center relative overflow-hidden">
                  {course.coverImage ? (
                    <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="text-white" size={64} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/70 transition-colors" />
                  {isLocked && (
                    <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
                      <div className="bg-white/95 backdrop-blur-sm px-6 py-4 rounded-xl shadow-xl text-center">
                        <Lock className="mx-auto mb-2 text-slate-600" size={32} />
                        <p className="text-sm font-bold text-slate-700 mb-1">Курс заблокирован</p>
                        {accessStatus.reason && (
                          <p className="text-xs text-slate-500 max-w-xs">{accessStatus.reason}</p>
                        )}
                        {accessStatus.previousCourseTitle && (
                          <p className="text-xs text-blue-600 mt-2 font-semibold">
                            Сначала: {accessStatus.previousCourseTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {totalTasks > 0 && !isLocked && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                      <span className="text-sm font-bold text-blue-600">{progress}%</span>
                    </div>
                  )}
                  {isLocked && (
                    <div className="absolute top-4 right-4 bg-red-500/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                      <Lock className="text-white" size={18} />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-bold text-xl mb-1 drop-shadow-lg line-clamp-2">{course.title}</h3>
                  </div>
                </div>

                {/* Course Info */}
                <div className="p-6">
                  <p className="text-sm text-slate-600 mb-4 line-clamp-3">{course.description}</p>

                  {totalTasks > 0 && (
                    <div className="mb-4">
                      <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        {completedTasks} из {totalTasks} заданий выполнено
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{course.sections.length} секций</span>
                      <span>•</span>
                      <span>{course.tasks.length} заданий</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCourse(course);
                          }}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Редактировать курс"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCourse(course);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all text-sm flex items-center gap-2"
                      >
                        Начать обучение <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
