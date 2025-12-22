import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { X, Send, Save, Download, FileText, User } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { generateZRSPDF } from '../utils/zrsPdfGenerator';

interface ZRSFormProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  currentEmployee?: Employee;
  onSave?: (zrs: ZRSData) => void;
}

export interface ZRSData {
  id?: string;
  to_whom: string; // Кому (должность и ФИО)
  from_whom: string; // От кого (должность и ФИО)
  situation: string; // Ситуация
  data: string; // Данные
  solution: string; // Решение
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
}

export const ZRSForm: React.FC<ZRSFormProps> = ({
  isOpen,
  onClose,
  employees,
  currentEmployee,
  onSave,
}) => {
  const [toWhomEmployee, setToWhomEmployee] = useState<Employee | null>(null);
  const [toWhomCustom, setToWhomCustom] = useState('');
  const [useCustomToWhom, setUseCustomToWhom] = useState(false);
  const [fromWhom, setFromWhom] = useState(
    currentEmployee
      ? `${currentEmployee.position || ''} ${currentEmployee.full_name || ''}`.trim()
      : ''
  );
  const [situation, setSituation] = useState('');
  const [data, setData] = useState('');
  const [solution, setSolution] = useState('');

  useEffect(() => {
    if (currentEmployee) {
      setFromWhom(`${currentEmployee.position || ''} ${currentEmployee.full_name || ''}`.trim());
    }
  }, [currentEmployee]);

  // Получаем финальное значение "Кому"
  const getToWhom = (): string => {
    if (useCustomToWhom) {
      return toWhomCustom.trim();
    }
    if (toWhomEmployee) {
      return `${toWhomEmployee.position || ''} ${toWhomEmployee.full_name || ''}`.trim();
    }
    return '';
  };

  const handleSave = () => {
    const toWhomValue = getToWhom();
    if (!toWhomValue || !fromWhom.trim() || !situation.trim() || !data.trim() || !solution.trim()) {
      alert('Заполните все обязательные поля');
      return;
    }

    const zrsData: ZRSData = {
      to_whom: toWhomValue,
      from_whom: fromWhom.trim(),
      situation: situation.trim(),
      data: data.trim(),
      solution: solution.trim(),
      status: 'draft',
      created_at: new Date().toISOString(),
    };

    if (onSave) {
      onSave(zrsData);
    }

    // Сбрасываем форму
    setToWhomEmployee(null);
    setToWhomCustom('');
    setUseCustomToWhom(false);
    setSituation('');
    setData('');
    setSolution('');
    onClose();
  };

  const handleGeneratePDF = () => {
    const toWhomValue = getToWhom();
    if (!toWhomValue || !fromWhom.trim() || !situation.trim() || !data.trim() || !solution.trim()) {
      alert('Заполните все обязательные поля перед генерацией PDF');
      return;
    }

    const zrsData: ZRSData = {
      to_whom: toWhomValue,
      from_whom: fromWhom.trim(),
      situation: situation.trim(),
      data: data.trim(),
      solution: solution.trim(),
      created_at: new Date().toISOString(),
    };

    generateZRSPDF(zrsData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200/50 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Создание ЗРС</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Завершенная Работа Сотрудника
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white to-amber-50/20">
          {/* Информационный блок */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-5 rounded-xl shadow-sm">
            <div className="flex items-start gap-3">
              <FileText className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-bold text-blue-900 mb-1">
                  Законченная Работа Сотрудника
                </p>
                <p className="text-xs text-blue-700">
                  Структурированный формат представления проблем и решений в виде: Ситуация → Данные → Решение.
                </p>
              </div>
            </div>
          </div>

          {/* Поля формы */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-2">
                <User size={14} className="text-amber-600" />
                Кому (должность и ФИО) *
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="useCustomToWhom"
                    checked={useCustomToWhom}
                    onChange={e => setUseCustomToWhom(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <label htmlFor="useCustomToWhom" className="text-xs text-slate-600 cursor-pointer">
                    Указать вручную
                  </label>
                </div>
                {useCustomToWhom ? (
                  <input
                    type="text"
                    value={toWhomCustom}
                    onChange={e => setToWhomCustom(e.target.value)}
                    placeholder="Например: Исполнительному директору Куртову М.А."
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white hover:border-slate-300"
                  />
                ) : (
                  <select
                    value={toWhomEmployee?.id || ''}
                    onChange={e => {
                      const emp = employees.find(emp => emp.id === e.target.value);
                      setToWhomEmployee(emp || null);
                    }}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white hover:border-slate-300"
                  >
                    <option value="">-- Выберите сотрудника --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.position || 'Без должности'} - {emp.full_name}
                      </option>
                    ))}
                  </select>
                )}
                {toWhomEmployee && !useCustomToWhom && (
                  <div className="text-xs text-slate-500 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    Выбрано: <span className="font-bold text-amber-700">{toWhomEmployee.position || 'Без должности'} {toWhomEmployee.full_name}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-2">
                <User size={14} className="text-amber-600" />
                От кого (должность и ФИО) *
              </label>
              <input
                type="text"
                value={fromWhom}
                onChange={e => setFromWhom(e.target.value)}
                placeholder="Например: Менеджер по продажам Иванов С.П."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white hover:border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-xs font-black shadow-md">
                  1
                </span>
                Ситуация *
              </label>
              <textarea
                value={situation}
                onChange={e => setSituation(e.target.value)}
                placeholder="Кратко опишите проблему или ситуацию..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none transition-all bg-white hover:border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-xs font-black shadow-md">
                  2
                </span>
                Данные *
              </label>
              <textarea
                value={data}
                onChange={e => setData(e.target.value)}
                placeholder="Предоставьте всю необходимую информацию для принятия решения (цифры, факты, ссылки, статистика)..."
                rows={6}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none transition-all bg-white hover:border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-xs font-black shadow-md">
                  3
                </span>
                Решение *
              </label>
              <textarea
                value={solution}
                onChange={e => setSolution(e.target.value)}
                placeholder="Предложите наилучший, по вашему мнению, вариант решения..."
                rows={6}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none transition-all bg-white hover:border-slate-300"
              />
            </div>

            <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
              Ваша подпись будет добавлена автоматически при отправке.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-gradient-to-r from-amber-50/50 to-white flex items-center justify-end gap-3 flex-wrap">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-700 font-bold bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Отмена
          </button>
          <button
            onClick={handleGeneratePDF}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Download size={18} />
            Скачать PDF
          </button>
          <button
            onClick={async () => {
              const toWhomValue = getToWhom();
              if (!toWhomValue || !fromWhom.trim() || !situation.trim() || !data.trim() || !solution.trim()) {
                alert('Заполните все обязательные поля');
                return;
              }

              const zrsData: ZRSData = {
                to_whom: toWhomValue,
                from_whom: fromWhom.trim(),
                situation: situation.trim(),
                data: data.trim(),
                solution: solution.trim(),
                status: 'draft', // Сохраняем как черновик
                created_at: new Date().toISOString(),
              };

              if (onSave) {
                try {
                  await onSave(zrsData);
                  // Сбрасываем форму только после успешного сохранения
                  setToWhomEmployee(null);
                  setToWhomCustom('');
                  setUseCustomToWhom(false);
                  setSituation('');
                  setData('');
                  setSolution('');
                  onClose();
                } catch (error) {
                  console.error('Ошибка сохранения ЗРС:', error);
                  // Не закрываем форму при ошибке
                }
              } else {
                // Если onSave не передан, просто закрываем
                onClose();
              }
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Save size={18} />
            Сохранить как черновик
          </button>
          <button
            onClick={async () => {
              const toWhomValue = getToWhom();
              if (!toWhomValue || !fromWhom.trim() || !situation.trim() || !data.trim() || !solution.trim()) {
                alert('Заполните все обязательные поля');
                return;
              }

              const zrsData: ZRSData = {
                to_whom: toWhomValue,
                from_whom: fromWhom.trim(),
                situation: situation.trim(),
                data: data.trim(),
                solution: solution.trim(),
                status: 'pending_approval', // Отправляем на одобрение
                created_at: new Date().toISOString(),
              };

              if (onSave) {
                try {
                  await onSave(zrsData);
                  // Сбрасываем форму только после успешного сохранения
                  setToWhomEmployee(null);
                  setToWhomCustom('');
                  setUseCustomToWhom(false);
                  setSituation('');
                  setData('');
                  setSolution('');
                  onClose();
                } catch (error) {
                  console.error('Ошибка сохранения ЗРС:', error);
                  // Не закрываем форму при ошибке
                }
              } else {
                // Если onSave не передан, просто закрываем
                onClose();
              }
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-200 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Send size={18} />
            Отправить на одобрение
          </button>
        </div>
      </div>
    </div>
  );
};

