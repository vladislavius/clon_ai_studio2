import React, { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check, AlertCircle, Loader2, Upload, Calendar, DollarSign, Users, Shield, Laptop, BookOpen, FileCheck, ArrowRight, CheckCircle2, Plus as PlusIcon, User, Phone, FileText, HeartPulse, Landmark, CreditCard, Globe, Mail, Bell, FolderOpen, CheckCircle } from 'lucide-react';
import { EmployeeWizardData, PostInfo, EmploymentType, WorkSchedule, EmployeeStatus, PostReadinessStatus, EmergencyContact } from '../types';
import { Department } from '../types';
import { ORGANIZATION_STRUCTURE } from '../constants';
import { useToast } from './Toast';

interface AddEmployeeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: EmployeeWizardData) => Promise<void>;
  employees: any[];
  departments: Record<string, Department>;
}

const TOTAL_STEPS = 7;

const AddEmployeeWizard: React.FC<AddEmployeeWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  employees,
  departments
}) => {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStep7Confirmed, setIsStep7Confirmed] = useState(false);
  
  const [wizardData, setWizardData] = useState<EmployeeWizardData>({
    // Step 1
    post_id: undefined,
    post_info: undefined,
    
    // Step 2 - все поля из Employee
    last_name: '',
    first_name: '',
    middle_name: '',
    birth_date: '',
    nickname: '',
    email: '',
    email2: '',
    phone: '',
    work_phone: '',
    telegram: '',
    whatsapp: '',
    actual_address: '',
    registration_address: '',
    inn: '',
    passport_series: '',
    passport_number: '',
    passport_date: '',
    passport_issuer: '',
    foreign_passport: '',
    foreign_passport_date: '',
    foreign_passport_issuer: '',
    bank_name: '',
    bank_details: '',
    crypto_wallet: '',
    crypto_currency: '',
    crypto_network: '',
    emergency_contacts: [],
    
    // Step 3
    employment_type: 'full_time',
    start_date: '',
    status: 'trainee',
    salary: undefined,
    has_bonus: false,
    work_schedule: 'full_day',
    
    // Step 4
    manager_id: undefined,
    mentor_id: undefined,
    hr_manager_id: undefined,
    
    // Step 5
    equipment_needed: [],
    software_needed: [],
    equipment_notes: '',
    office_location: '',
    office_floor: '',
    office_room: '',
    workplace_number: '',
    work_format: 'office',
    create_it_request: true,
    
    // Step 6
    onboarding_type: 'standard',
  });

  // Reset wizard when closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setWizardData({
        post_id: undefined,
        post_info: undefined,
        last_name: '',
        first_name: '',
        middle_name: '',
        birth_date: '',
        nickname: '',
        email: '',
        email2: '',
        phone: '',
        work_phone: '',
        telegram: '',
        whatsapp: '',
        actual_address: '',
        registration_address: '',
        inn: '',
        passport_series: '',
        passport_number: '',
        passport_date: '',
        passport_issuer: '',
        foreign_passport: '',
        foreign_passport_date: '',
        foreign_passport_issuer: '',
        bank_name: '',
        bank_details: '',
        crypto_wallet: '',
        crypto_currency: '',
        crypto_network: '',
        emergency_contacts: [],
        employment_type: 'full_time',
        start_date: '',
        status: 'trainee',
        salary: undefined,
        has_bonus: false,
        work_schedule: 'full_day',
        manager_id: undefined,
        mentor_id: undefined,
        hr_manager_id: undefined,
        equipment_needed: [],
        software_needed: [],
        equipment_notes: '',
        office_location: '',
        office_floor: '',
        office_room: '',
        workplace_number: '',
        work_format: 'office',
        create_it_request: true,
        onboarding_type: 'standard',
      });
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      // Validate current step before proceeding
      if (validateStep(currentStep)) {
        setCurrentStep(prev => prev + 1);
      }
    }
  }, [currentStep, wizardData]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!wizardData.post_id || !wizardData.post_info) {
          toast.error('Выберите пост на оргсхеме');
          return false;
        }
        if (wizardData.post_info.readiness_status === 'not_ready') {
          const proceed = window.confirm(
            '⚠️ Пост не готов к найму (нет описания, продукта или материалов).\n\n' +
            'Согласно административной технологии, рекомендуется сначала подготовить пост.\n\n' +
            'Продолжить все равно?'
          );
          if (!proceed) {
            return false;
          }
        }
        return true;
      case 2:
        if (!wizardData.last_name || !wizardData.first_name) {
          toast.error('Заполните обязательные поля: Фамилия и Имя');
          return false;
        }
        if (!wizardData.email) {
          toast.error('Укажите email сотрудника');
          return false;
        }
        return true;
      case 3:
        if (!wizardData.start_date) {
          toast.error('Укажите дату начала работы');
          return false;
        }
        return true;
      case 4:
        if (!wizardData.manager_id || !wizardData.mentor_id) {
          toast.error('Назначьте руководителя и наставника');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    // Проверка подтверждения на шаге 7
    if (currentStep === 7 && !isStep7Confirmed) {
      toast.error('Пожалуйста, подтвердите корректность данных');
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete(wizardData);
      toast.success('Сотрудник успешно создан!');
      onClose();
    } catch (error) {
      console.error('Ошибка при создании сотрудника:', error);
      toast.error('Ошибка при создании сотрудника');
    } finally {
      setIsSubmitting(false);
    }
  }, [wizardData, onComplete, onClose, toast, currentStep, isStep7Confirmed]);

  const updateWizardData = useCallback((updates: Partial<EmployeeWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Добавление нового сотрудника</h2>
            <p className="text-sm text-slate-500 mt-1">Шаг {currentStep} из {TOTAL_STEPS}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
              const stepNum = index + 1;
              const isCompleted = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;
              
              return (
                <React.Fragment key={stepNum}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isCompleted ? <Check size={16} /> : stepNum}
                    </div>
                    {stepNum < TOTAL_STEPS && (
                      <div
                        className={`h-1 w-12 transition-all ${
                          isCompleted ? 'bg-green-500' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <Step1PostSelection
              wizardData={wizardData}
              updateWizardData={updateWizardData}
              departments={departments}
              employees={employees}
            />
          )}
          {currentStep === 2 && (
            <Step2PersonalData
              wizardData={wizardData}
              updateWizardData={updateWizardData}
            />
          )}
          {currentStep === 3 && (
            <Step3EmploymentConditions
              wizardData={wizardData}
              updateWizardData={updateWizardData}
            />
          )}
          {currentStep === 4 && (
            <Step4ResponsiblePersons
              wizardData={wizardData}
              updateWizardData={updateWizardData}
              employees={employees}
            />
          )}
          {currentStep === 5 && (
            <Step5AccessResources
              wizardData={wizardData}
              updateWizardData={updateWizardData}
            />
          )}
          {currentStep === 6 && (
            <Step6OnboardingPlan
              wizardData={wizardData}
              updateWizardData={updateWizardData}
            />
          )}
          {currentStep === 7 && (
            <Step7ReviewConfirmation
              wizardData={wizardData}
              employees={employees}
              departments={departments}
              onConfirmedChange={setIsStep7Confirmed}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1 || isSubmitting}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Назад
          </button>
          
          <div className="flex items-center gap-3">
            {currentStep < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                Продолжить
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (currentStep === 7 && !isStep7Confirmed)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Сохранить и создать сотрудника
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Step 1: Post Selection
const Step1PostSelection: React.FC<{
  wizardData: EmployeeWizardData;
  updateWizardData: (updates: Partial<EmployeeWizardData>) => void;
  departments: Record<string, Department>;
  employees: any[];
}> = ({ wizardData, updateWizardData, departments, employees }) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(
    wizardData.post_info?.department_id || null
  );
  const [selectedSubDeptId, setSelectedSubDeptId] = useState<string | null>(
    wizardData.post_id || null
  );

  // Синхронизация состояния при изменении wizardData
  useEffect(() => {
    if (wizardData.post_info?.department_id) {
      setSelectedDeptId(wizardData.post_info.department_id);
    }
    if (wizardData.post_id) {
      setSelectedSubDeptId(wizardData.post_id);
    }
  }, [wizardData.post_id, wizardData.post_info?.department_id]);

  // Проверка готовности поста
  const checkPostReadiness = useCallback((deptId: string, subDeptId: string): PostReadinessStatus => {
    const dept = ORGANIZATION_STRUCTURE[deptId];
    if (!dept) return 'not_ready';
    
    const subDept = dept.departments?.[subDeptId];
    if (!subDept) return 'not_ready';

    // Проверяем наличие описания (шляпы)
    const hasHat = subDept.description && subDept.description.length > 0;
    const hasVFP = subDept.vfp && subDept.vfp.length > 0;
    
    // TODO: Проверить наличие обучающих материалов (можно добавить в структуру)
    const hasMaterials = true; // Временно всегда true

    if (hasHat && hasVFP && hasMaterials) {
      return 'ready';
    } else if (hasHat || hasVFP) {
      return 'needs_improvement';
    } else {
      return 'not_ready';
    }
  }, []);

  // Проверка занятости поста
  const isPostOccupied = useCallback((subDeptId: string): boolean => {
    return employees.some(emp => 
      emp.subdepartment?.includes(subDeptId)
    );
  }, [employees]);

  const handleDeptSelect = (deptId: string) => {
    if (selectedDeptId === deptId) {
      setSelectedDeptId(null);
      setSelectedSubDeptId(null);
      updateWizardData({ 
        post_id: undefined, 
        post_info: undefined 
      });
    } else {
      setSelectedDeptId(deptId);
      setSelectedSubDeptId(null);
      updateWizardData({ 
        post_id: undefined, 
        post_info: undefined 
      });
    }
  };

  const handleSubDeptSelect = (deptId: string, subDeptId: string) => {
    const dept = ORGANIZATION_STRUCTURE[deptId];
    const subDept = dept?.departments?.[subDeptId];
    
    if (!dept || !subDept) return;

    const readiness = checkPostReadiness(deptId, subDeptId);
    const occupied = isPostOccupied(subDeptId);

    if (occupied) {
      // Можно все равно выбрать, но показать предупреждение
      // TODO: Показать toast предупреждение
    }

    setSelectedSubDeptId(subDeptId);
    
    const postInfo: PostInfo = {
      id: subDeptId,
      name: subDept.name,
      department_id: deptId,
      department_name: dept.name,
      manager_id: undefined, // TODO: Найти ID менеджера по имени
      manager_name: subDept.manager,
      vfp: subDept.vfp,
      statistics: [], // TODO: Получить статистики поста
      hat_written: !!subDept.description,
      materials_ready: true, // TODO: Проверить реально
      readiness_status: readiness,
    };

    updateWizardData({ 
      post_id: subDeptId,
      post_info: postInfo 
    });
  };

  const getReadinessBadge = (status: PostReadinessStatus) => {
    switch (status) {
      case 'ready':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">✅ Готов</span>;
      case 'needs_improvement':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">⚠ Требует доработки</span>;
      case 'not_ready':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">🔴 Не готов</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Выбор поста на оргсхеме</h3>
        <p className="text-slate-600">Для какого поста нанимается сотрудник?</p>
      </div>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-amber-800 mb-1">Важно!</p>
            <p className="text-sm text-amber-700">
              Согласно административной технологии, нельзя нанимать на неподготовленный пост. 
              Убедитесь, что пост имеет описание (шляпу), определен продукт (VFP) и статистики.
            </p>
          </div>
        </div>
      </div>

      {/* Выбор департамента */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <label className="block text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">
          Департамент (Владелец)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(ORGANIZATION_STRUCTURE)
            .filter(d => d.id !== 'owner') // Исключаем учредителя
            .map(d => {
              const isSelected = selectedDeptId === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => handleDeptSelect(d.id)}
                  className={`cursor-pointer p-3 rounded-2xl border-2 transition-all flex items-center gap-3 relative overflow-hidden group ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-md ring-0'
                      : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm font-bold text-sm transition-transform group-hover:scale-105"
                    style={{ backgroundColor: d.color }}
                  >
                    {d.name.substring(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0 z-10">
                    <div className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                      {d.name.split(':')[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate font-medium">
                      {d.manager}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 text-blue-500">
                      <CheckCircle2 size={18} fill="currentColor" className="text-white" />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Выбор отдела/поста */}
      {selectedDeptId && (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">
            Отдел / Секция (Функциональная роль)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(() => {
              const dept = ORGANIZATION_STRUCTURE[selectedDeptId];
              if (!dept?.departments) return null;
              
              return Object.values(dept.departments).map(sub => {
                const isSelected = selectedSubDeptId === sub.id;
                const occupied = isPostOccupied(sub.id);
                const readiness = checkPostReadiness(selectedDeptId, sub.id);
                
                return (
                  <div
                    key={sub.id}
                    onClick={() => handleSubDeptSelect(selectedDeptId, sub.id)}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 group relative ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 shadow-md'
                        : readiness === 'not_ready'
                        ? 'border-red-200 bg-red-50/30 opacity-60'
                        : 'border-slate-100 hover:border-amber-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className={`text-sm font-bold ${isSelected ? 'text-amber-900' : 'text-slate-700'}`}>
                          {sub.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {dept.name.split('.')[0]} • {sub.manager}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={20} className="text-amber-500" fill="#fff" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {occupied ? (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-xs font-medium">
                          📍 Занят
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          🔲 Вакансия
                        </span>
                      )}
                      {getReadinessBadge(readiness)}
                    </div>

                    {sub.vfp && (
                      <div className="text-xs text-slate-500 mt-1">
                        <span className="font-semibold">Продукт:</span> {sub.vfp}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Информация о выбранном посте */}
      {wizardData.post_info && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
          <h4 className="font-semibold text-blue-800 mb-3">Информация о выбранном посте:</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold text-blue-700">Пост:</span>{' '}
              <span className="text-blue-600">{wizardData.post_info.name}</span>
            </div>
            <div>
              <span className="font-semibold text-blue-700">Отдел:</span>{' '}
              <span className="text-blue-600">{wizardData.post_info.department_name}</span>
            </div>
            {wizardData.post_info.manager_name && (
              <div>
                <span className="font-semibold text-blue-700">Руководитель:</span>{' '}
                <span className="text-blue-600">{wizardData.post_info.manager_name}</span>
              </div>
            )}
            {wizardData.post_info.vfp && (
              <div>
                <span className="font-semibold text-blue-700">Продукт поста (VFP):</span>{' '}
                <span className="text-blue-600">{wizardData.post_info.vfp}</span>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-700">Статус готовности:</span>
                {getReadinessBadge(wizardData.post_info.readiness_status)}
              </div>
              {wizardData.post_info.readiness_status === 'not_ready' && (
                <p className="text-xs text-red-600 mt-2">
                  ⚠ Пост не готов к найму. Сначала подготовьте описание поста, определите продукт и статистики.
                </p>
              )}
              {wizardData.post_info.readiness_status === 'needs_improvement' && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠ Пост требует доработки. Рекомендуется заполнить все данные перед наймом.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Кнопка создания нового поста */}
      {selectedDeptId && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              // TODO: Открыть модальное окно создания нового поста
              alert('Функция создания нового поста будет реализована');
            }}
            className="px-4 py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center gap-2"
          >
            <PlusIcon size={18} />
            <span>Создать новый пост на оргсхеме</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Step 2: Personal Data (расширенная версия со всеми полями)
const Step2PersonalData: React.FC<{
  wizardData: EmployeeWizardData;
  updateWizardData: (updates: Partial<EmployeeWizardData>) => void;
}> = ({ wizardData, updateWizardData }) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'contacts' | 'passport' | 'finance' | 'emergency'>('personal');
  const docInputRef = React.useRef<HTMLInputElement>(null);

  // Генерация NIK на основе имени
  const generateNickname = useCallback(() => {
    if (!wizardData.first_name && !wizardData.last_name) return;
    
    const first = (wizardData.first_name || '').toLowerCase();
    const last = (wizardData.last_name || '').toLowerCase();
    
    // Берем первые 3-4 буквы имени и первые 2-3 буквы фамилии
    let nik = '';
    if (first.length > 0) {
      nik += first.substring(0, Math.min(4, first.length));
    }
    if (last.length > 0) {
      nik += last.substring(0, Math.min(3, last.length));
    }
    
    // Убираем спецсимволы, оставляем только латиницу и цифры
    nik = nik.replace(/[^a-z0-9]/g, '');
    
    if (nik.length > 0) {
      updateWizardData({ nickname: nik.toUpperCase() });
    }
  }, [wizardData.first_name, wizardData.last_name, updateWizardData]);

  // Автогенерация NIK при изменении имени/фамилии
  useEffect(() => {
    if (!wizardData.nickname && wizardData.first_name && wizardData.last_name) {
      generateNickname();
    }
  }, [wizardData.first_name, wizardData.last_name, wizardData.nickname, generateNickname]);

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      updateWizardData({ documents: [...(wizardData.documents || []), ...files] });
    }
  };

  const addEmergencyContact = () => {
    const contacts = wizardData.emergency_contacts || [];
    updateWizardData({
      emergency_contacts: [...contacts, { name: '', relation: '', phone: '' }]
    });
  };

  const removeEmergencyContact = (index: number) => {
    const contacts = wizardData.emergency_contacts || [];
    updateWizardData({
      emergency_contacts: contacts.filter((_, i) => i !== index)
    });
  };

  const updateEmergencyContact = (index: number, field: 'name' | 'relation' | 'phone', value: string) => {
    const contacts = [...(wizardData.emergency_contacts || [])];
    contacts[index] = { ...contacts[index], [field]: value };
    updateWizardData({ emergency_contacts: contacts });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Личные данные сотрудника</h3>
        <p className="text-slate-600">Заполните информацию о сотруднике</p>
      </div>

      {/* Табы */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'personal', label: 'Личные данные', icon: User },
          { id: 'contacts', label: 'Контакты', icon: Phone },
          { id: 'passport', label: 'Паспорт', icon: FileText },
          { id: 'finance', label: 'Финансы', icon: DollarSign },
          { id: 'emergency', label: 'Экстренные', icon: HeartPulse },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Секция: Личные данные */}
      {activeTab === 'personal' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Фамилия <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={wizardData.last_name}
                onChange={(e) => updateWizardData({ last_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Иванов"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Имя <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={wizardData.first_name}
                onChange={(e) => updateWizardData({ first_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Иван"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Отчество</label>
              <input
                type="text"
                value={wizardData.middle_name || ''}
                onChange={(e) => updateWizardData({ middle_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Иванович"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Дата рождения</label>
              <input
                type="date"
                value={wizardData.birth_date || ''}
                onChange={(e) => updateWizardData({ birth_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Системный NIK
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wizardData.nickname || ''}
                  onChange={(e) => updateWizardData({ nickname: e.target.value.toUpperCase() })}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="IVAN_HR"
                />
                <button
                  type="button"
                  onClick={generateNickname}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-semibold"
                  title="Сгенерировать NIK автоматически"
                >
                  Авто
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">NIK генерируется автоматически на основе имени и фамилии</p>
            </div>
          </div>
        </div>
      )}

      {/* Секция: Контакты */}
      {activeTab === 'contacts' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Email (рабочий) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={wizardData.email || ''}
                onChange={(e) => updateWizardData({ email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ivanov@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email (личный)</label>
              <input
                type="email"
                value={wizardData.email2 || ''}
                onChange={(e) => updateWizardData({ email2: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ivanov@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Телефон (личный) <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={wizardData.phone || ''}
                onChange={(e) => updateWizardData({ phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Телефон (рабочий)</label>
              <input
                type="tel"
                value={wizardData.work_phone || ''}
                onChange={(e) => updateWizardData({ work_phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Telegram</label>
              <input
                type="text"
                value={wizardData.telegram || ''}
                onChange={(e) => updateWizardData({ telegram: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">WhatsApp</label>
              <input
                type="tel"
                value={wizardData.whatsapp || ''}
                onChange={(e) => updateWizardData({ whatsapp: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Фактический адрес</label>
              <input
                type="text"
                value={wizardData.actual_address || ''}
                onChange={(e) => updateWizardData({ actual_address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Город, улица, дом, квартира"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Адрес регистрации</label>
              <input
                type="text"
                value={wizardData.registration_address || ''}
                onChange={(e) => updateWizardData({ registration_address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Город, улица, дом, квартира"
              />
            </div>
          </div>
        </div>
      )}

      {/* Секция: Паспортные данные */}
      {activeTab === 'passport' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">ИНН</label>
              <input
                type="text"
                value={wizardData.inn || ''}
                onChange={(e) => updateWizardData({ inn: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123456789012"
              />
            </div>
            
            <div className="md:col-span-2 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-bold text-slate-800 uppercase mb-4">Внутренний паспорт</h4>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Серия и номер</label>
              <input
                type="text"
                value={wizardData.passport_series && wizardData.passport_number 
                  ? `${wizardData.passport_series} ${wizardData.passport_number}`
                  : ''}
                onChange={(e) => {
                  const parts = e.target.value.split(' ');
                  if (parts.length === 2) {
                    updateWizardData({ passport_series: parts[0], passport_number: parts[1] });
                  } else {
                    updateWizardData({ passport_series: e.target.value, passport_number: '' });
                  }
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1234 567890"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Дата выдачи</label>
              <input
                type="date"
                value={wizardData.passport_date || ''}
                onChange={(e) => updateWizardData({ passport_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Кем выдан</label>
              <input
                type="text"
                value={wizardData.passport_issuer || ''}
                onChange={(e) => updateWizardData({ passport_issuer: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="УФМС России"
              />
            </div>

            <div className="md:col-span-2 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-bold text-slate-800 uppercase mb-4">Заграничный паспорт</h4>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Номер</label>
              <input
                type="text"
                value={wizardData.foreign_passport || ''}
                onChange={(e) => updateWizardData({ foreign_passport: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Срок действия</label>
              <input
                type="date"
                value={wizardData.foreign_passport_date || ''}
                onChange={(e) => updateWizardData({ foreign_passport_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Кем выдан / Орган</label>
              <input
                type="text"
                value={wizardData.foreign_passport_issuer || ''}
                onChange={(e) => updateWizardData({ foreign_passport_issuer: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Консульство РФ"
              />
            </div>
          </div>

          {/* Загрузка документов */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-800">Документы</h4>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-semibold flex items-center gap-2"
              >
                <Upload size={14} />
                Загрузить документы
              </button>
              <input
                type="file"
                ref={docInputRef}
                onChange={handleDocumentUpload}
                multiple
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
            </div>
            {wizardData.documents && wizardData.documents.length > 0 && (
              <div className="space-y-2">
                {wizardData.documents.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const docs = wizardData.documents || [];
                        updateWizardData({ documents: docs.filter((_, i) => i !== index) });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Секция: Финансовые реквизиты */}
      {activeTab === 'finance' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Банк</label>
              <div className="relative">
                <Landmark className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  value={wizardData.bank_name || ''}
                  onChange={(e) => updateWizardData({ bank_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Kasikorn Bank"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Номер счета / Карты</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  value={wizardData.bank_details || ''}
                  onChange={(e) => updateWizardData({ bank_details: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1234 5678 9012 3456"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm mb-4">
              <Globe size={16} />
              Крипто-кошелек
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Адрес кошелька</label>
                <input
                  type="text"
                  value={wizardData.crypto_wallet || ''}
                  onChange={(e) => updateWizardData({ crypto_wallet: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0x..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Сеть (Network)</label>
                <input
                  type="text"
                  value={wizardData.crypto_network || ''}
                  onChange={(e) => updateWizardData({ crypto_network: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="TRC20, BEP20..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Валюта</label>
                <input
                  type="text"
                  value={wizardData.crypto_currency || ''}
                  onChange={(e) => updateWizardData({ crypto_currency: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="USDT"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Секция: Экстренные контакты */}
      {activeTab === 'emergency' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">Экстренные контакты</h4>
            <button
              type="button"
              onClick={addEmergencyContact}
              className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 text-sm font-semibold flex items-center gap-2"
            >
              <PlusIcon size={14} />
              Добавить
            </button>
          </div>
          
          {(wizardData.emergency_contacts || []).length === 0 ? (
            <div className="text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
              Нет экстренных контактов
            </div>
          ) : (
            <div className="space-y-3">
              {(wizardData.emergency_contacts || []).map((contact, index) => (
                <div key={index} className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-end md:items-center">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Имя</label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Иван Иванов"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Кем приходится</label>
                    <input
                      type="text"
                      value={contact.relation}
                      onChange={(e) => updateEmergencyContact(index, 'relation', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Супруг/а, Родитель..."
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Телефон</label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEmergencyContact(index)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Step 3: Employment Conditions
const Step3EmploymentConditions: React.FC<{
  wizardData: EmployeeWizardData;
  updateWizardData: (updates: Partial<EmployeeWizardData>) => void;
}> = ({ wizardData, updateWizardData }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Условия найма и трудоустройства</h3>
        <p className="text-slate-600">Укажите условия работы сотрудника</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Дата начала работы <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={wizardData.start_date}
            onChange={(e) => updateWizardData({ start_date: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Статус сотрудника</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="trainee"
                checked={wizardData.status === 'trainee'}
                onChange={() => updateWizardData({ status: 'trainee' })}
                className="w-4 h-4 text-blue-600"
              />
              <span>Стажер (испытательный срок 3 месяца)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="employee"
                checked={wizardData.status === 'employee'}
                onChange={() => updateWizardData({ status: 'employee' })}
                className="w-4 h-4 text-blue-600"
              />
              <span>Сотрудник (принят сразу, без испытательного срока)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Оклад/ставка (руб/мес)</label>
          <input
            type="number"
            value={wizardData.salary || ''}
            onChange={(e) => updateWizardData({ salary: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="80000"
          />
        </div>
      </div>
    </div>
  );
};

// Step 4: Responsible Persons
const Step4ResponsiblePersons: React.FC<{
  wizardData: EmployeeWizardData;
  updateWizardData: (updates: Partial<EmployeeWizardData>) => void;
  employees: any[];
}> = ({ wizardData, updateWizardData, employees }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Ответственные за онбординг</h3>
        <p className="text-slate-600">Назначьте людей, которые будут помогать новому сотруднику</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Непосредственный руководитель <span className="text-red-500">*</span>
          </label>
          <select
            value={wizardData.manager_id || ''}
            onChange={(e) => updateWizardData({ manager_id: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Выберите руководителя</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} - {emp.position}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Наставник (Buddy) <span className="text-red-500">*</span>
          </label>
          <select
            value={wizardData.mentor_id || ''}
            onChange={(e) => updateWizardData({ mentor_id: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Выберите наставника</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} - {emp.position}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Наставник - это коллега с того же или близкого поста, который будет помогать новичку в первые 3 месяца
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            HR-менеджер
          </label>
          <select
            value={wizardData.hr_manager_id || ''}
            onChange={(e) => updateWizardData({ hr_manager_id: e.target.value || undefined })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Выберите HR-менеджера (необязательно)</option>
            {employees.filter(emp => emp.position?.toLowerCase().includes('hr')).map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} - {emp.position}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

// Step 5: Access and Resources
const Step5AccessResources: React.FC<{
  wizardData: EmployeeWizardData;
  updateWizardData: (updates: Partial<EmployeeWizardData>) => void;
}> = ({ wizardData, updateWizardData }) => {
  const [newSoftware, setNewSoftware] = useState('');

  // Стандартный список оборудования
  const standardEquipment = [
    'Компьютер (ноутбук/ПК)',
    'Монитор',
    'Клавиатура и мышь',
    'Гарнитура/наушники',
    'Телефон (рабочий)',
    'Канцелярия',
    'Визитки',
    'Бейдж/пропуск',
  ];

  // Автоматические программы на основе поста
  const automaticSoftware = [
    'Email (создать корпоративный)',
    'CRM система (доступ)',
    'Внутренний портал (доступ)',
    'Мессенджеры (Slack/Telegram корп)',
    'Облачное хранилище (Google Drive/OneDrive)',
  ];

  const toggleEquipment = (equipment: string) => {
    const current = wizardData.equipment_needed || [];
    if (current.includes(equipment)) {
      updateWizardData({ equipment_needed: current.filter(e => e !== equipment) });
    } else {
      updateWizardData({ equipment_needed: [...current, equipment] });
    }
  };

  const addSoftware = () => {
    if (newSoftware.trim()) {
      const current = wizardData.software_needed || [];
      if (!current.includes(newSoftware.trim())) {
        updateWizardData({ software_needed: [...current, newSoftware.trim()] });
        setNewSoftware('');
      }
    }
  };

  const removeSoftware = (software: string) => {
    const current = wizardData.software_needed || [];
    updateWizardData({ software_needed: current.filter(s => s !== software) });
  };

  // Список офисов (можно расширить)
  const offices = [
    'Москва, ул. Примерная, 1',
    'Санкт-Петербург, Невский пр., 1',
    'Удаленная работа',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Необходимые доступы и ресурсы</h3>
        <p className="text-slate-600">Что нужно подготовить к первому дню работы</p>
      </div>

      {/* ОБОРУДОВАНИЕ */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Laptop size={20} className="text-blue-500" />
          Оборудование
        </h4>
        <p className="text-sm text-slate-600 mb-4">Что нужно подготовить к первому дню:</p>
        
        <div className="space-y-2 mb-4">
          {standardEquipment.map((equipment) => {
            const isChecked = (wizardData.equipment_needed || []).includes(equipment);
            return (
              <label
                key={equipment}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleEquipment(equipment)}
                  className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">{equipment}</span>
              </label>
            );
          })}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Примечания:</label>
          <textarea
            value={wizardData.equipment_notes || ''}
            onChange={(e) => updateWizardData({ equipment_notes: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            placeholder="Дополнительные требования к оборудованию..."
          />
        </div>
      </div>

      {/* ПРОГРАММНОЕ ОБЕСПЕЧЕНИЕ И ДОСТУПЫ */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Shield size={20} className="text-purple-500" />
          Программное обеспечение и доступы
        </h4>
        
        <div className="mb-4">
          <p className="text-sm text-slate-600 mb-3">
            Автоматически на основе поста система запросит:
          </p>
          <div className="space-y-2">
            {automaticSoftware.map((software) => (
              <div
                key={software}
                className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200"
              >
                <Check size={18} className="text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700">{software}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Дополнительные программы для поста:</p>
          
          {(wizardData.software_needed || []).length > 0 && (
            <div className="space-y-2 mb-3">
              {wizardData.software_needed.map((software) => (
                <div
                  key={software}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <span className="text-sm font-medium text-slate-700">{software}</span>
                  <button
                    type="button"
                    onClick={() => removeSoftware(software)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newSoftware}
              onChange={(e) => setNewSoftware(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSoftware();
                }
              }}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Название программы"
            />
            <button
              type="button"
              onClick={addSoftware}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
            >
              <PlusIcon size={16} />
              Добавить
            </button>
          </div>
        </div>
      </div>

      {/* РАБОЧЕЕ МЕСТО */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users size={20} className="text-amber-500" />
          Рабочее место
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Офис:</label>
            <select
              value={wizardData.office_location || ''}
              onChange={(e) => updateWizardData({ office_location: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Выбрать офис</option>
              {offices.map((office) => (
                <option key={office} value={office}>
                  {office}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Этаж:</label>
            <input
              type="text"
              value={wizardData.office_floor || ''}
              onChange={(e) => updateWizardData({ office_floor: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Комната:</label>
            <input
              type="text"
              value={wizardData.office_room || ''}
              onChange={(e) => updateWizardData({ office_room: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="101"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Рабочее место №:</label>
            <input
              type="text"
              value={wizardData.workplace_number || ''}
              onChange={(e) => updateWizardData({ workplace_number: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Формат работы:</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
              <input
                type="radio"
                name="work_format"
                value="office"
                checked={wizardData.work_format === 'office'}
                onChange={() => updateWizardData({ work_format: 'office' })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-slate-700">Работает в офисе</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
              <input
                type="radio"
                name="work_format"
                value="remote"
                checked={wizardData.work_format === 'remote'}
                onChange={() => updateWizardData({ work_format: 'remote' })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-slate-700">Работает удаленно</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
              <input
                type="radio"
                name="work_format"
                value="hybrid"
                checked={wizardData.work_format === 'hybrid'}
                onChange={() => updateWizardData({ work_format: 'hybrid' })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-slate-700">Гибрид</span>
            </label>
          </div>
        </div>
      </div>

      {/* АВТОМАТИЧЕСКАЯ ЗАЯВКА В IT */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Shield size={20} className="text-indigo-500" />
          Автоматическая заявка в IT
        </h4>
        
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={wizardData.create_it_request}
            onChange={(e) => updateWizardData({ create_it_request: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500 mt-0.5"
          />
          <div className="flex-1">
            <span className="text-sm font-semibold text-slate-700 block mb-1">
              Создать задачу для IT-отдела:
            </span>
            <p className="text-sm text-slate-600">
              "Подготовить рабочее место и выдать доступы к {wizardData.start_date || 'дате выхода'}"
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

// Step 6: Onboarding Plan
const Step6OnboardingPlan: React.FC<{
  wizardData: EmployeeWizardData;
  updateWizardData: (updates: Partial<EmployeeWizardData>) => void;
}> = ({ wizardData, updateWizardData }) => {
  const [showTimeline, setShowTimeline] = useState(false);

  // Вычисляем даты на основе start_date
  const getStartDate = () => {
    if (!wizardData.start_date) return null;
    return new Date(wizardData.start_date);
  };

  const formatDate = (date: Date, daysOffset: number = 0) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + daysOffset);
    return newDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const startDate = getStartDate();
  const isTrainee = wizardData.status === 'trainee';

  // Генерируем timeline для стандартного онбординга
  const getStandardTimeline = () => {
    if (!startDate) return [];
    
    return [
      {
        day: 0,
        title: 'День 1: Первый рабочий день',
        date: formatDate(startDate, 0),
        tasks: [
          'Welcome-письмо сотруднику',
          'Инструктаж по безопасности',
          'Экскурсия по офису',
          'Знакомство с командой',
          'Встреча с руководителем (30 мин)',
        ]
      },
      {
        day: 1,
        title: 'Неделя 1: Погружение',
        date: `${formatDate(startDate, 0)} - ${formatDate(startDate, 4)}`,
        tasks: [
          'Курс "О компании" [2ч]',
          'Курс "Оргсхема" [1ч]',
          'Изучение шляпы поста',
          'Наблюдение за работой коллег',
          'Встреча с наставником (день 3)',
        ]
      },
      {
        day: 30,
        title: 'Месяц 1: Обучение',
        date: `${formatDate(startDate, 0)} - ${formatDate(startDate, 30)}`,
        tasks: [
          'Профильные курсы (40ч)',
          'Hat Check Out',
          'Практика под контролем',
          'Еженедельные встречи с наставником',
          'Чек-поинт HR на 30-й день',
        ]
      },
      {
        day: 60,
        title: 'Месяц 2-3: Практика',
        date: `${formatDate(startDate, 30)} - ${formatDate(startDate, 90)}`,
        tasks: [
          'Самостоятельная работа',
          'Ведение статистик',
          'Участие в проектах',
          'Подготовка к аттестации',
        ]
      },
      {
        day: 90,
        title: 'День 90: Финальная аттестация',
        date: formatDate(startDate, 90),
        tasks: [
          'Теоретический экзамен',
          'Практический экзамен',
          'Проверка статистик',
          'Отзыв наставника',
          'Решение комиссии: Стажер → Сотрудник',
        ]
      }
    ];
  };

  const getAcceleratedTimeline = () => {
    if (!startDate) return [];
    
    return [
      {
        day: 0,
        title: 'День 1: Знакомство',
        date: formatDate(startDate, 0),
        tasks: ['Welcome-встреча', 'Экскурсия', 'Базовые инструктажи']
      },
      {
        day: 7,
        title: 'Неделя 1: Быстрое погружение',
        date: `${formatDate(startDate, 0)} - ${formatDate(startDate, 7)}`,
        tasks: ['Ключевые курсы', 'Знакомство с процессами', 'Первые задачи']
      },
      {
        day: 30,
        title: 'День 30: Финальная проверка',
        date: formatDate(startDate, 30),
        tasks: ['Проверка адаптации', 'Обратная связь', 'Переход в штат']
      }
    ];
  };

  const timeline = wizardData.onboarding_type === 'standard' 
    ? getStandardTimeline() 
    : wizardData.onboarding_type === 'accelerated'
    ? getAcceleratedTimeline()
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">План онбординга</h3>
        <p className="text-slate-600">Выберите программу адаптации для нового сотрудника</p>
      </div>

      <div className="space-y-3">
        <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
          wizardData.onboarding_type === 'standard' 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-200 hover:border-blue-300'
        }`}>
          <input
            type="radio"
            name="onboarding_type"
            value="standard"
            checked={wizardData.onboarding_type === 'standard'}
            onChange={() => updateWizardData({ onboarding_type: 'standard' })}
            className="w-4 h-4 text-blue-600 mt-1"
          />
          <div className="flex-1">
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              Стандартный онбординг для стажера (3 месяца)
              {isTrainee && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Рекомендуется</span>}
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Полная программа адаптации с финальной аттестацией на 90-й день
            </p>
          </div>
        </label>

        <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
          wizardData.onboarding_type === 'accelerated' 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-200 hover:border-blue-300'
        }`}>
          <input
            type="radio"
            name="onboarding_type"
            value="accelerated"
            checked={wizardData.onboarding_type === 'accelerated'}
            onChange={() => updateWizardData({ onboarding_type: 'accelerated' })}
            className="w-4 h-4 text-blue-600 mt-1"
          />
          <div className="flex-1">
            <div className="font-semibold text-slate-800">Ускоренный онбординг для опытного специалиста (1 месяц)</div>
            <p className="text-sm text-slate-600 mt-1">
              Только знакомство с компанией и процессами, без полной программы
            </p>
          </div>
        </label>

        <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
          wizardData.onboarding_type === 'custom' 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-200 hover:border-blue-300'
        }`}>
          <input
            type="radio"
            name="onboarding_type"
            value="custom"
            checked={wizardData.onboarding_type === 'custom'}
            onChange={() => updateWizardData({ onboarding_type: 'custom' })}
            className="w-4 h-4 text-blue-600 mt-1"
          />
          <div className="flex-1">
            <div className="font-semibold text-slate-800">Индивидуальный план</div>
            <p className="text-sm text-slate-600 mt-1">
              Настроить программу онбординга вручную
            </p>
          </div>
        </label>
      </div>

      {/* Превью выбранного плана */}
      {wizardData.onboarding_type && wizardData.start_date && timeline.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-slate-800">
              Превью плана онбординга
            </h4>
            <button
              type="button"
              onClick={() => setShowTimeline(!showTimeline)}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
            >
              {showTimeline ? 'Скрыть детали' : 'Показать детали'}
              {showTimeline ? <ChevronRight className="rotate-90" size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          <div className="space-y-4">
            {timeline.map((milestone, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={16} className="text-blue-500" />
                  <span className="font-semibold text-slate-800">{milestone.title}</span>
                  <span className="text-xs text-slate-500">({milestone.date})</span>
                </div>
                {showTimeline && (
                  <ul className="mt-2 space-y-1 ml-6">
                    {milestone.tasks.map((task, taskIndex) => (
                      <li key={taskIndex} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {wizardData.onboarding_type === 'standard' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                ⚠ После 90 дней будет проведена финальная аттестация. При успешном прохождении статус изменится с "Стажер" на "Сотрудник".
              </p>
            </div>
          )}
        </div>
      )}

      {wizardData.onboarding_type === 'custom' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-slate-600">
            Индивидуальный план можно настроить после создания сотрудника в разделе "Шляпная папка" → "Маршрутная карта".
          </p>
        </div>
      )}
    </div>
  );
};

// Step 7: Review and Confirmation
const Step7ReviewConfirmation: React.FC<{
  wizardData: EmployeeWizardData;
  employees: any[];
  departments: Record<string, Department>;
  onConfirmedChange?: (confirmed: boolean) => void;
}> = ({ wizardData, employees, departments, onConfirmedChange }) => {
  const [confirmed, setConfirmed] = useState(false);
  
  useEffect(() => {
    if (onConfirmedChange) {
      onConfirmedChange(confirmed);
    }
  }, [confirmed, onConfirmedChange]);
  
  const manager = employees.find(e => e.id === wizardData.manager_id);
  const mentor = employees.find(e => e.id === wizardData.mentor_id);
  const hr = employees.find(e => e.id === wizardData.hr_manager_id);
  
  const postInfo = wizardData.post_info;
  const departmentName = postInfo?.department_id 
    ? ORGANIZATION_STRUCTURE[postInfo.department_id]?.name 
    : 'Не указан';

  // Вычисляем дату welcome-письма (за 3 дня до выхода)
  const getWelcomeDate = () => {
    if (!wizardData.start_date) return null;
    const startDate = new Date(wizardData.start_date);
    startDate.setDate(startDate.getDate() - 3);
    return startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const welcomeDate = getWelcomeDate();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Проверка данных и подтверждение</h3>
        <p className="text-slate-600">Проверьте все данные перед сохранением</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Карточка: Сотрудник */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <User size={20} className="text-blue-500" />
            <h4 className="font-bold text-slate-800">Сотрудник</h4>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-slate-700">
              <span className="font-semibold">ФИО:</span>{' '}
              {wizardData.last_name} {wizardData.first_name} {wizardData.middle_name || ''}
            </p>
            {wizardData.nickname && (
              <p className="text-slate-700">
                <span className="font-semibold">Системный NIK:</span> {wizardData.nickname}
              </p>
            )}
            <p className="text-slate-700">
              <span className="font-semibold">Email:</span> {wizardData.email || 'Не указан'}
            </p>
            <p className="text-slate-700">
              <span className="font-semibold">Телефон:</span> {wizardData.phone || 'Не указан'}
            </p>
            {wizardData.birth_date && (
              <p className="text-slate-700">
                <span className="font-semibold">Дата рождения:</span> {wizardData.birth_date}
              </p>
            )}
          </div>
        </div>

        {/* Карточка: Пост */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen size={20} className="text-amber-500" />
            <h4 className="font-bold text-slate-800">Пост</h4>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-slate-700">
              <span className="font-semibold">Название:</span> {postInfo?.name || 'Не выбран'}
            </p>
            <p className="text-slate-700">
              <span className="font-semibold">Отдел:</span> {departmentName}
            </p>
            {postInfo?.vfp && (
              <p className="text-slate-700">
                <span className="font-semibold">Продукт (VFP):</span> {postInfo.vfp}
              </p>
            )}
            {postInfo?.statistics && postInfo.statistics.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold text-slate-700 mb-1">Статистики поста:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  {postInfo.statistics.slice(0, 3).map((stat, idx) => (
                    <li key={idx} className="text-xs">{stat}</li>
                  ))}
                  {postInfo.statistics.length > 3 && (
                    <li className="text-xs text-slate-500">+{postInfo.statistics.length - 3} еще</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Карточка: Условия найма */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={20} className="text-green-500" />
            <h4 className="font-bold text-slate-800">Условия найма</h4>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-slate-700">
              <span className="font-semibold">Дата выхода:</span> {wizardData.start_date || 'Не указана'}
            </p>
            <p className="text-slate-700">
              <span className="font-semibold">Статус:</span>{' '}
              {wizardData.status === 'trainee' ? (
                <span className="inline-flex items-center gap-1">
                  Стажер (3 месяца)
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Испытательный срок</span>
                </span>
              ) : (
                'Сотрудник'
              )}
            </p>
            {wizardData.salary && (
              <p className="text-slate-700">
                <span className="font-semibold">Оклад:</span> {wizardData.salary.toLocaleString('ru-RU')} руб/мес
              </p>
            )}
            {wizardData.work_format && (
              <p className="text-slate-700">
                <span className="font-semibold">Формат работы:</span>{' '}
                {wizardData.work_format === 'office' ? 'Офис' : 
                 wizardData.work_format === 'remote' ? 'Удаленно' : 'Гибрид'}
              </p>
            )}
          </div>
        </div>

        {/* Карточка: Ответственные */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={20} className="text-purple-500" />
            <h4 className="font-bold text-slate-800">Ответственные</h4>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-slate-700">
              <span className="font-semibold">Руководитель:</span>{' '}
              {manager?.full_name || <span className="text-red-500">Не назначен</span>}
            </p>
            <p className="text-slate-700">
              <span className="font-semibold">Наставник:</span>{' '}
              {mentor?.full_name || <span className="text-red-500">Не назначен</span>}
            </p>
            <p className="text-slate-700">
              <span className="font-semibold">HR-менеджер:</span>{' '}
              {hr?.full_name || <span className="text-red-500">Не назначен</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Автоматические действия */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={24} className="text-blue-600" />
          <h4 className="font-bold text-blue-900 text-lg">Что произойдет после сохранения:</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg">
            <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Создана карточка сотрудника</p>
              <p className="text-xs text-slate-600">Со статусом "Ожидает выхода"</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg">
            <FolderOpen size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Создана Шляпная папка поста</p>
              <p className="text-xs text-slate-600">8 разделов, автозаполнение из шаблона</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg">
            <BookOpen size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Назначен план онбординга</p>
              <p className="text-xs text-slate-600">
                {wizardData.onboarding_type === 'standard' ? '90 дней с аттестацией' :
                 wizardData.onboarding_type === 'accelerated' ? '30 дней ускоренный' :
                 'Индивидуальный план'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg">
            <Bell size={18} className="text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Отправлены уведомления</p>
              <p className="text-xs text-slate-600">Руководителю, наставнику, HR, IT</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg">
            <Laptop size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">
                {wizardData.create_it_request ? 'Создана заявка в IT' : 'Заявка в IT не создана'}
              </p>
              <p className="text-xs text-slate-600">Подготовка оборудования и доступов</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg">
            <Calendar size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Запланированы встречи</p>
              <p className="text-xs text-slate-600">Чек-поинты на дни 3, 7, 30, 60, 90</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg">
            <Mail size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Welcome-письмо</p>
              <p className="text-xs text-slate-600">
                {welcomeDate ? `Отправка: ${welcomeDate}` : 'Запланировано'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg">
            <CheckCircle size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Регистрация на оргсхеме</p>
              <p className="text-xs text-slate-600">Пост отмечен как занятый</p>
            </div>
          </div>
        </div>
      </div>

      {/* Чекбокс подтверждения */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded border-amber-300 focus:ring-2 focus:ring-amber-500 mt-0.5"
          />
          <div>
            <p className="font-semibold text-amber-900">
              Я проверил все данные и подтверждаю их корректность
            </p>
            <p className="text-sm text-amber-700 mt-1">
              После сохранения будут выполнены автоматические действия, указанные выше
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default AddEmployeeWizard;
