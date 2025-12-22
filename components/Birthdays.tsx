import React, { useMemo, useState, useCallback } from 'react'; // Добавлен useCallback
import { ORGANIZATION_STRUCTURE } from '../constants';
import { Employee as EmployeeType } from '../types';
import { differenceInDays, format, isToday, addYears, isSameDay } from 'date-fns';
import { Gift, Calendar, User, Bell, Sparkles, Mail, FileText } from 'lucide-react';
import { openBirthdayEmail, getTodayBirthdays, getUpcomingBirthdays } from '../utils/notifications';
import { exportEmployeesToCSV } from '../utils/exportUtils';

interface BirthdaysProps {
  employees: EmployeeType[];
}

const MONTH_COLORS = [
    'bg-blue-50 border-blue-100 text-blue-800', // Jan (Winter)
    'bg-blue-50 border-blue-100 text-blue-800', // Feb (Winter)
    'bg-emerald-50 border-emerald-100 text-emerald-800', // Mar (Spring)
    'bg-emerald-50 border-emerald-100 text-emerald-800', // Apr (Spring)
    'bg-emerald-50 border-emerald-100 text-emerald-800', // May (Spring)
    'bg-amber-50 border-amber-100 text-amber-800', // Jun (Summer)
    'bg-amber-50 border-amber-100 text-amber-800', // Jul (Summer)
    'bg-amber-50 border-amber-100 text-amber-800', // Aug (Summer)
    'bg-rose-50 border-rose-100 text-rose-800', // Sep (Autumn)
    'bg-rose-50 border-rose-100 text-rose-800', // Oct (Autumn)
    'bg-rose-50 border-rose-100 text-rose-800', // Nov (Autumn)
    'bg-blue-50 border-blue-100 text-blue-800', // Dec (Winter)
];

const Birthdays: React.FC<BirthdaysProps> = ({ employees }) => {
  const processedBirthdays = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();

    return employees
      .filter(emp => emp.birth_date)
      .map(emp => {
        const birthDate = new Date(emp.birth_date!);
        let nextBirthday = new Date(birthDate);
        nextBirthday.setFullYear(currentYear);
        
        if (nextBirthday < today && !isToday(nextBirthday)) {
          nextBirthday = addYears(nextBirthday, 1);
        }

        const daysUntil = differenceInDays(nextBirthday, today);
        
        return {
          ...emp,
          nextBirthday,
          daysUntil,
          age: currentYear - birthDate.getFullYear(),
          isToday: isToday(nextBirthday)
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [employees]);

  // CHANGED: 14 days -> 7 days
  const upcoming = processedBirthdays.filter(b => b.daysUntil <= 7);
  
  const allByMonth = useMemo(() => {
    const groups: { [key: number]: typeof processedBirthdays } = {};
    processedBirthdays.forEach(emp => {
      const month = emp.nextBirthday.getMonth();
      if (!groups[month]) groups[month] = [];
      groups[month].push(emp);
    });
    return groups;
  }, [processedBirthdays]);

  const getDeptName = (ids?: string[]) => {
    if (!ids || ids.length === 0) return 'Без отдела';
    return ORGANIZATION_STRUCTURE[ids[0]]?.name.split('.')[1] || 'Unknown';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg shadow-pink-200 transform transition hover:scale-105">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-pink-100 font-bold uppercase text-xs tracking-wider">Сегодня празднуют</p>
              <h3 className="text-5xl font-black mt-2">{processedBirthdays.filter(b => b.isToday).length}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><Gift size={32} className="text-white" /></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-amber-200 transform transition hover:scale-105">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-100 font-bold uppercase text-xs tracking-wider">Ближайшие 7 дней</p>
              <h3 className="text-5xl font-black mt-2">{upcoming.length}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><Bell size={32} className="text-white" /></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 transform transition hover:scale-105">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 font-bold uppercase text-xs tracking-wider">Всего именинников</p>
              <h3 className="text-5xl font-black mt-2">{processedBirthdays.length}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><User size={32} className="text-white" /></div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-600">Действия:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openBirthdayEmail(employees)}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
            title="Открыть почтовый клиент с уведомлением о днях рождения"
          >
            <Mail size={16} /> Email уведомление
          </button>
          <button
            onClick={() => exportEmployeesToCSV(employees)}
            className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2"
            title="Экспортировать список сотрудников в CSV"
          >
            <FileText size={16} /> Экспорт CSV
          </button>
        </div>
      </div>

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <Sparkles className="text-amber-500 fill-amber-500" /> Скоро Празднуем
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map(emp => (
              <div key={emp.id} className={`bg-white p-5 rounded-2xl border transition-all flex items-center gap-5 relative overflow-hidden group ${emp.isToday ? 'border-pink-500 shadow-md ring-2 ring-pink-100' : 'border-amber-200 hover:border-amber-400 hover:shadow-md'}`}>
                {emp.isToday && <div className="absolute top-0 right-0 bg-pink-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">СЕГОДНЯ!</div>}
                
                <div className={`w-16 h-16 rounded-full p-1 ${emp.isToday ? 'bg-gradient-to-tr from-pink-500 to-yellow-500' : 'bg-gray-100'}`}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-white">
                        {emp.photo_url ? (
                            <img 
                                src={emp.photo_url} 
                                className="w-full h-full object-cover" 
                                loading="lazy"
                                decoding="async"
                                alt={emp.full_name}
                                onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${emp.full_name}&background=f1f5f9&color=64748b`)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300"><User size={24} /></div>
                        )}
                    </div>
                </div>
                
                <div className="flex-1">
                  <h4 className={`text-lg leading-tight ${emp.daysUntil === 7 || emp.daysUntil === 3 ? 'font-black text-slate-900' : 'font-bold text-slate-900'}`}>
                    {emp.daysUntil === 7 || emp.daysUntil === 3 ? (
                      <span className="font-black">{emp.full_name}</span>
                    ) : (
                      <>
                        <span>{emp.full_name.split(' ')[0]}</span>
                        {emp.full_name.split(' ').slice(1).join(' ') && (
                          <span className="text-slate-500 font-medium text-sm"> {emp.full_name.split(' ').slice(1).join(' ')}</span>
                        )}
                      </>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{emp.position}</p>
                  <p className="text-xs text-blue-500 font-bold mt-0.5">{getDeptName(emp.department)}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${emp.isToday ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-600'}`}>
                      <Calendar size={12}/> {format(emp.nextBirthday, 'd MMM')}
                    </span>
                    {!emp.isToday && <span className="text-[10px] text-slate-400 font-medium">через {emp.daysUntil} дн.</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Birthdays Calendar Grid */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-2xl font-black text-slate-800">Календарь по Месяцам</h2>
          <p className="text-slate-500 text-sm mt-1">Полный список дней рождений сотрудников на год</p>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 12 }).map((_, monthIndex) => {
              const monthEmps = allByMonth[monthIndex] || [];
              const monthName = format(new Date(2000, monthIndex, 1), 'LLLL'); // LLLL for standalone month name
              const isCurrentMonth = new Date().getMonth() === monthIndex;
              const colorClass = MONTH_COLORS[monthIndex];
              
              return (
                <div key={monthIndex} className={`rounded-2xl p-5 border transition-all ${isCurrentMonth ? 'ring-4 ring-blue-50/50 border-blue-200' : 'border-slate-100 hover:border-slate-200'} ${colorClass} bg-opacity-30`}>
                  <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center justify-between opacity-80`}>
                      {monthName}
                      {monthEmps.length > 0 && <span className="bg-white/50 px-2 py-0.5 rounded-md text-xs border border-white/50 shadow-sm">{monthEmps.length}</span>}
                  </h3>
                  
                  {monthEmps.length === 0 ? (
                      <div className="text-xs opacity-50 italic py-2">Нет именинников</div>
                  ) : (
                      <div className="space-y-3">
                        {monthEmps.map(emp => (
                          <div key={emp.id} className="flex items-center gap-3 group cursor-default bg-white/60 p-2 rounded-xl backdrop-blur-sm shadow-sm border border-white/50">
                            <div className="w-8 h-8 rounded-full bg-white overflow-hidden flex-shrink-0 border border-white shadow-sm">
                              {emp.photo_url ? (
                                <img 
                                    src={emp.photo_url} 
                                    className="w-full h-full object-cover" 
                                    loading="lazy"
                                    decoding="async"
                                    alt={emp.full_name}
                                    onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${emp.full_name}&background=random`)}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs"><User size={14} /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline">
                                  <p className="text-xs font-bold text-slate-700 truncate">{emp.full_name.split(' ')[0]}</p>
                                  <span className="text-[10px] font-bold text-slate-500">{format(new Date(emp.birth_date!), 'd')}</span>
                              </div>
                              <p className="text-[9px] text-slate-400 truncate">{emp.position}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Birthdays;
