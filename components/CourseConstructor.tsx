import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Edit2, Trash2, Eye, Save, X } from 'lucide-react';
import { CourseEditor } from './CourseEditor';
import { CourseViewer } from './CourseViewer';
import { useToast } from './Toast';

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
  archived?: boolean; // Архивный курс
}

export const CourseConstructor: React.FC = () => {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);

  // Загружаем курсы из localStorage
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
    if (editingCourse?.id === courseId) {
      setEditingCourse(null);
    }
    if (previewCourse?.id === courseId) {
      setPreviewCourse(null);
    }
    toast.success('Курс отправлен в архив');
  };

  const handleCreateCourse = () => {
    setEditingCourse(null);
    setPreviewCourse(null);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setPreviewCourse(null);
  };

  const handlePreviewCourse = (course: Course) => {
    setPreviewCourse(course);
    setEditingCourse(null);
  };

  const handleSaveCourse = (courseData: Course) => {
    if (editingCourse) {
      // Обновляем существующий курс
      const updated = courses.map(c => c.id === courseData.id ? courseData : c);
      saveCourses(updated);
      toast.success('Курс обновлен');
    } else {
      // Создаем новый курс
      const newCourse: Course = {
        ...courseData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveCourses([...courses, newCourse]);
      toast.success('Курс создан');
    }
    setEditingCourse(null);
  };

  const handleDeleteCourse = (courseId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот курс? Это действие нельзя отменить.')) {
      const filtered = courses.filter(c => c.id !== courseId);
      saveCourses(filtered);
      if (editingCourse?.id === courseId) {
        setEditingCourse(null);
      }
      if (previewCourse?.id === courseId) {
        setPreviewCourse(null);
      }
      toast.success('Курс удален');
    }
  };

  // Если открыт редактор
  if (editingCourse !== null || (!editingCourse && !previewCourse)) {
    return (
      <CourseEditor
        course={editingCourse}
        onSave={handleSaveCourse}
        onCancel={() => {
          setEditingCourse(null);
          if (courses.length === 0) {
            // Если нет курсов, показываем список
          }
        }}
        isAdmin={true}
      />
    );
  }

  // Если открыт предпросмотр
  if (previewCourse) {
    return (
      <>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
          <button
            onClick={() => setPreviewCourse(null)}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <X size={16} /> Закрыть предпросмотр
          </button>
        </div>
        <CourseViewer
          course={previewCourse}
          onBack={() => setPreviewCourse(null)}
          onTaskToggle={() => {}}
          onTaskExpand={() => {}}
          expandedTaskId={null}
          showChat={false}
          showVideo={false}
          onToggleChat={() => {}}
          onToggleVideo={() => {}}
          chatMessages={[]}
          newMessage=""
          onMessageChange={() => {}}
          onSendMessage={() => {}}
          isAdmin={true}
        />
      </>
    );
  }

  // Список курсов для редактирования
  return (
    <div className="animate-in fade-in space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Конструктор курсов</h2>
            <p className="text-slate-600">Создавайте и редактируйте интерактивные курсы</p>
          </div>
          <button
            onClick={handleCreateCourse}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <Plus size={20} /> Создать новый курс
          </button>
        </div>
      </div>

      {/* Courses List */}
      {courses.filter(c => !c.archived).length === 0 ? (
        <div className="bg-white p-16 rounded-xl border border-slate-200 shadow-sm text-center">
          <BookOpen className="mx-auto text-slate-300 mb-6" size={64} />
          <h3 className="text-xl font-bold text-slate-700 mb-2">Нет созданных курсов</h3>
          <p className="text-slate-500 mb-6">Создайте первый курс для начала работы</p>
          <button
            onClick={handleCreateCourse}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus size={20} /> Создать первый курс
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.filter(c => !c.archived).map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden"
            >
              {/* Course Cover */}
              <div className="h-40 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center relative">
                {course.coverImage ? (
                  <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="text-white" size={48} />
                )}
                <div className="absolute inset-0 bg-black/10" />
              </div>

              {/* Course Info */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2">{course.title}</h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{course.description}</p>

                <div className="flex items-center justify-between text-xs text-slate-400 mb-4 pb-4 border-b border-slate-100">
                  <span>{course.sections.length} секций</span>
                  <span>{course.tasks.length} заданий</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreviewCourse(course)}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye size={16} /> Предпросмотр
                  </button>
                  <button
                    onClick={() => handleEditCourse(course)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

