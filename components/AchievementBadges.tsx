import React from 'react';
import { Award, Star, Target, TrendingUp, BookOpen, CheckCircle2, Trophy, Medal } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  earned: boolean;
  earnedAt?: string;
}

interface AchievementBadgesProps {
  courseId: string;
  completedTasks: number;
  totalTasks: number;
  certifications: number;
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({
  courseId,
  completedTasks,
  totalTasks,
  certifications,
}) => {
  const badges: Badge[] = [
    {
      id: 'first-step',
      name: 'Первый шаг',
      description: 'Выполнено первое задание',
      icon: <Star size={24} />,
      color: 'yellow',
      earned: completedTasks >= 1,
    },
    {
      id: 'halfway',
      name: 'На полпути',
      description: 'Выполнено 50% заданий',
      icon: <Target size={24} />,
      color: 'blue',
      earned: totalTasks > 0 && (completedTasks / totalTasks) >= 0.5,
    },
    {
      id: 'completion',
      name: 'Завершение',
      description: 'Выполнены все задания',
      icon: <CheckCircle2 size={24} />,
      color: 'green',
      earned: completedTasks === totalTasks && totalTasks > 0,
    },
    {
      id: 'certified',
      name: 'Сертифицирован',
      description: 'Получен сертификат',
      icon: <Award size={24} />,
      color: 'purple',
      earned: certifications > 0,
    },
    {
      id: 'excellence',
      name: 'Отличник',
      description: 'Все задания выполнены на отлично',
      icon: <Trophy size={24} />,
      color: 'gold',
      earned: completedTasks === totalTasks && totalTasks > 0,
    },
  ];

  const earnedBadges = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Medal size={20} className="text-yellow-500" />
        Достижения и бейджи
      </h3>

      {earnedBadges.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-slate-600 mb-3">Полученные бейджи ({earnedBadges.length})</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {earnedBadges.map((badge) => (
              <div
                key={badge.id}
                className="p-4 bg-white rounded-lg border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-${badge.color}-400 to-${badge.color}-600 flex items-center justify-center text-white mb-2 mx-auto shadow-lg`}>
                  {badge.icon}
                </div>
                <h4 className="font-bold text-slate-800 text-sm text-center mb-1">{badge.name}</h4>
                <p className="text-xs text-slate-600 text-center">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-3">Доступные бейджи ({lockedBadges.length})</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {lockedBadges.map((badge) => (
              <div
                key={badge.id}
                className="p-4 bg-white rounded-lg border border-slate-200 opacity-60"
              >
                <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center text-slate-500 mb-2 mx-auto">
                  {badge.icon}
                </div>
                <h4 className="font-bold text-slate-600 text-sm text-center mb-1">{badge.name}</h4>
                <p className="text-xs text-slate-500 text-center">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

