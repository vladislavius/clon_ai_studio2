import React from 'react';
import { TrendingUp, Award, Clock, Target, Users, BookOpen } from 'lucide-react';

interface LearningAnalyticsProps {
  courses: any[];
  students: any[];
}

export const LearningAnalytics: React.FC<LearningAnalyticsProps> = ({ courses, students }) => {
  const totalCourses = courses.length;
  const totalStudents = students.length;
  const completedCourses = courses.filter(c => 
    c.tasks?.every((t: any) => t.checked && t.curatorChecked)
  ).length;
  
  const averageProgress = courses.reduce((acc, course) => {
    const completed = course.tasks?.filter((t: any) => t.checked && t.curatorChecked).length || 0;
    const total = course.tasks?.length || 1;
    return acc + (completed / total) * 100;
  }, 0) / (totalCourses || 1);

  const stats = [
    {
      label: 'Всего курсов',
      value: totalCourses,
      icon: BookOpen,
      color: 'blue',
    },
    {
      label: 'Завершено курсов',
      value: completedCourses,
      icon: Award,
      color: 'green',
    },
    {
      label: 'Средний прогресс',
      value: `${Math.round(averageProgress)}%`,
      icon: TrendingUp,
      color: 'purple',
    },
    {
      label: 'Активных студентов',
      value: totalStudents,
      icon: Users,
      color: 'orange',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const colorClasses = {
          blue: 'bg-blue-100 text-blue-600',
          green: 'bg-green-100 text-green-600',
          purple: 'bg-purple-100 text-purple-600',
          orange: 'bg-orange-100 text-orange-600',
        };

        return (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]} flex items-center justify-center`}>
                <Icon size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 mb-1">{stat.value}</div>
            <div className="text-sm text-slate-600">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
};

