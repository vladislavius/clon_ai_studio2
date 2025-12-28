import React, { useState, useEffect } from 'react';
import { GraduationCap, BookOpen, FileText, FileCheck, ChevronRight, MessageSquare, Video, CheckCircle2, Circle, Wrench, BarChart3 } from 'lucide-react';
import { CoursesSection } from './CoursesSection';
import { KnowledgeBaseSection } from './KnowledgeBaseSection';
import { CourseConstructor } from './CourseConstructor';
import { LearningAnalytics } from './LearningAnalytics';

import { Employee } from '../types';

interface AcademyDashboardProps {
  isAdmin?: boolean;
  employees?: Employee[];
}

export type AcademySubView = 'courses' | 'knowledge_base' | 'constructor' | 'analytics';

export const AcademyDashboard: React.FC<AcademyDashboardProps> = ({ isAdmin, employees }) => {
  const [currentSubView, setCurrentSubView] = useState<AcademySubView>('courses');
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const savedCourses = localStorage.getItem('courses');
    if (savedCourses) {
      try {
        const parsed = JSON.parse(savedCourses);
        setCourses(parsed);
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

  return (
    <div className="flex flex-col animate-in fade-in space-y-4">
      {/* Header with navigation */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <GraduationCap className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Академия</h1>
            <p className="text-xs md:text-sm text-slate-500">Обучение и развитие персонала</p>
          </div>
        </div>

        {/* Sub-navigation */}
        <div className="flex bg-slate-100 p-1.5 rounded-lg gap-1.5 flex-wrap">
          <button
            onClick={() => setCurrentSubView('courses')}
            className={`px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base font-semibold rounded-lg transition-all flex items-center gap-2 ${
              currentSubView === 'courses'
                ? 'bg-white shadow text-purple-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen size={18} className="md:w-5 md:h-5" /> КУРСЫ
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setCurrentSubView('constructor')}
                className={`px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base font-semibold rounded-lg transition-all flex items-center gap-2 ${
                  currentSubView === 'constructor'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Wrench size={18} className="md:w-5 md:h-5" /> КОНСТРУКТОР
              </button>
              <button
                onClick={() => setCurrentSubView('analytics')}
                className={`px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base font-semibold rounded-lg transition-all flex items-center gap-2 ${
                  currentSubView === 'analytics'
                    ? 'bg-white shadow text-emerald-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <BarChart3 size={18} className="md:w-5 md:h-5" /> АНАЛИТИКА
              </button>
            </>
          )}
          <button
            onClick={() => setCurrentSubView('knowledge_base')}
            className={`px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base font-semibold rounded-lg transition-all flex items-center gap-2 ${
              currentSubView === 'knowledge_base'
                ? 'bg-white shadow text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={18} className="md:w-5 md:h-5" /> БАЗА ЗНАНИЯ
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto custom-scrollbar pb-20">
        {currentSubView === 'courses' && <CoursesSection isAdmin={isAdmin} employees={employees} />}
        {currentSubView === 'constructor' && isAdmin && <CourseConstructor />}
        {currentSubView === 'analytics' && isAdmin && (
          <div className="space-y-6">
            <LearningAnalytics courses={courses} students={[]} />
          </div>
        )}
        {currentSubView === 'knowledge_base' && <KnowledgeBaseSection isAdmin={isAdmin} />}
      </div>
    </div>
  );
};

