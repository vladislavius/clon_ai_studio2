import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Users, Briefcase, Cake, FileDown, Plus, Search, Menu, LayoutGrid, Database, Settings as SettingsIcon, Loader2, LogOut, TrendingUp, WifiOff, Network, List, ChevronLeft, ChevronRight, X, Shield, Edit3, Lock, Filter, UserCheck, FileText, Upload } from 'lucide-react';
import EmployeeList from './components/EmployeeList';
import EmployeeModal from './components/EmployeeModal';
import Birthdays from './components/Birthdays';
import Settings from './components/Settings';
import StatisticsTab from './components/StatisticsTab';
import OrgChart from './components/OrgChart';
import Auth from './components/Auth';
import ConfirmationModal from './components/ConfirmationModal';
import ErrorBoundary from './components/ErrorBoundary';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OnboardingDashboard } from './components/OnboardingDashboard';
import { DocumentsDashboard } from './components/DocumentsDashboard';
import { ReceivedDocumentsDashboard } from './components/ReceivedDocumentsDashboard';
import { ORGANIZATION_STRUCTURE, ADMIN_EMAILS, DEPT_SORT_ORDER } from './constants';
import { Employee, ViewMode, Department, EmployeeSubView, DocumentsSubView } from './types';
import { useAuth } from './hooks/useAuth';
import { useEmployees } from './hooks/useEmployees';
import { useOrgStructure } from './hooks/useOrgStructure';
import { useEmployeeFilters } from './hooks/useEmployeeFilters';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useDebounce } from './hooks/useDebounce';

const DEMO_EMPLOYEES: Employee[] = [
  {
    id: 'demo-1',
    full_name: 'Alexandra Volkov',
    position: 'HR Director',
    department: ['dept1'],
    email: 'alex.v@company.com',
    phone: '+1 (555) 012-3456',
    photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    emergency_contacts: [],
    custom_fields: [],
    attachments: [],
    join_date: '2022-03-15',
    birth_date: '1988-07-21',
    subdepartment: []
  },
  {
    id: 'demo-2',
    full_name: 'Dmitry Sokolov',
    position: 'Senior Developer',
    department: ['dept4', 'dept4_12'],
    email: 'd.sokolov@company.com',
    phone: '+1 (555) 098-7654',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    emergency_contacts: [],
    custom_fields: [],
    attachments: [],
    join_date: '2023-01-10',
    birth_date: '1995-12-05',
    subdepartment: []
  },
  {
    id: 'demo-3',
    full_name: 'Elena Petrova',
    position: 'Marketing Manager',
    department: ['dept2', 'dept2_4'],
    email: 'e.petrova@company.com',
    phone: '+1 (555) 111-2233',
    photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    emergency_contacts: [],
    custom_fields: [],
    attachments: [],
    join_date: '2021-11-05',
    birth_date: '1992-04-12',
    subdepartment: []
  }
];

function App() {
  // Custom hooks
  const { session, authChecking, isOffline, isAdmin, setIsOffline, handleBypassAuth, handleLogout } = useAuth();
  const { employees, isLoading, fetchEmployees, handleSaveEmployee, handleDeleteEmployee, handleImportData, setEmployees } = useEmployees();
  const { orgStructure, fetchOrgMetadata, handleUpdateOrgStructure } = useOrgStructure();

  // UI state
  const [currentView, setCurrentView] = useState<ViewMode>('org_chart');
  const [employeeSubView, setEmployeeSubView] = useState<EmployeeSubView>('list');
  const [documentsSubView, setDocumentsSubView] = useState<DocumentsSubView>('sent');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  // Debounce search term для оптимизации производительности
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch data when session is available
  // Используем useRef для отслеживания, чтобы избежать множественных вызовов
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    // Пропускаем если уже загружали или идет проверка аутентификации
    if (authChecking) return;
    
    if (session && !isOffline && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      const loadData = async () => {
        try {
          await Promise.allSettled([
            fetchEmployees(),
            fetchOrgMetadata(isOffline)
          ]);
        } catch (e) {
          // Ошибки обрабатываются внутри хуков
          if (import.meta.env.DEV) {
            console.error('[App] Data fetch failed', e);
          }
        }
      };
      loadData();
    } else if (!session && !isOffline) {
      hasLoadedRef.current = false;
      setEmployees([]);
    }
  }, [session, isOffline, authChecking, fetchEmployees, fetchOrgMetadata, setEmployees]);

  // Employee filters hook (уже мемоизирован внутри)
  // Используем debouncedSearchTerm вместо searchTerm для оптимизации
  const { filteredEmployees } = useEmployeeFilters({ employees, searchTerm: debouncedSearchTerm, deptFilter });

  // Pull-to-refresh для мобильных
  const handleRefresh = useCallback(async () => {
    if (session && !isOffline) {
      await Promise.all([
        fetchEmployees(),
        fetchOrgMetadata(isOffline),
      ]);
    }
  }, [session, isOffline, fetchEmployees, fetchOrgMetadata]);

  const { isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: session !== null && !isOffline && window.innerWidth < 768,
  });

  // Мемоизация вычисляемых значений
  const sidebarWidth = useMemo(() => isSidebarCollapsed ? 'w-20' : 'w-72', [isSidebarCollapsed]);
  const sidebarMobileClasses = useMemo(() => isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full', [isMobileMenuOpen]);

  // Мемоизация списка департаментов для сайдбара
  const departmentList = useMemo(() =>
    Object.values(ORGANIZATION_STRUCTURE).filter(d => d.id !== 'owner'),
    []
  );

  // Оптимизированные обработчики с useCallback
  const handleSaveEmployeeWrapper = useCallback(async (emp: Employee) => {
    await handleSaveEmployee(emp, isAdmin, isOffline);
    setIsModalOpen(false);
    setEditingEmployee(null);
  }, [handleSaveEmployee, isAdmin, isOffline]);

  const handleDeleteEmployeeRequest = useCallback((id: string) => {
    if (!isAdmin) return;
    const empName = employees.find(e => e.id === id)?.full_name || 'этого сотрудника';

    setConfirmModal({
      isOpen: true,
      title: 'Удаление сотрудника',
      message: `Вы собираетесь удалить ${empName}.\nЭто действие удалит карточку, все файлы и личные статистики.\nВосстановить данные будет невозможно.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await handleDeleteEmployee(id, isAdmin, isOffline);
      }
    });
  }, [isAdmin, employees, handleDeleteEmployee, isOffline]);

  const handleUpdateOrgStructureWrapper = useCallback(async (newStruct: Record<string, Department>) => {
    await handleUpdateOrgStructure(newStruct, isAdmin, isOffline);
  }, [handleUpdateOrgStructure, isAdmin, isOffline]);

  const handleImportDataWrapper = useCallback(async (data: Employee[]) => {
    await handleImportData(data, isAdmin, isOffline);
  }, [handleImportData, isAdmin, isOffline]);

  const handleBypassAuthWrapper = useCallback(() => {
    handleBypassAuth();
    setEmployees(DEMO_EMPLOYEES);
  }, [handleBypassAuth, setEmployees]);

  const handleEditClick = useCallback((emp: Employee) => {
    setEditingEmployee(emp);
    setIsModalOpen(true);
  }, []);

  const handleAddClick = useCallback(() => {
    if (!isAdmin) return;
    setEditingEmployee(null);
    setIsModalOpen(true);
  }, [isAdmin]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleCloseConfirmModal = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Обработчики навигации
  const handleViewChange = useCallback((view: ViewMode) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    // При переключении на сотрудников, если была выбрана подвкладка документов, сбрасываем подвкладку документов
    if (view !== 'employees' && employeeSubView === 'documents') {
      setEmployeeSubView('list');
    }
  }, [employeeSubView]);
  
  const handleEmployeeSubViewChange = useCallback((subView: EmployeeSubView) => {
    setEmployeeSubView(subView);
    // При переключении на документы, устанавливаем подвкладку "Отправленные" по умолчанию
    if (subView === 'documents' && documentsSubView !== 'sent' && documentsSubView !== 'received') {
      setDocumentsSubView('sent');
    }
  }, [documentsSubView]);

  const handleStatisticsView = useCallback((deptId: string | null = null) => {
    setSelectedDept(deptId);
    setCurrentView('statistics');
    setIsMobileMenuOpen(false);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  if (authChecking) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  if (!session) return <Auth onBypass={handleBypassAuthWrapper} />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex bg-slate-50 overflow-hidden relative">
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/50 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={handleCloseMobileMenu}></div>
        )}

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={handleCloseConfirmModal}
          isDanger={true}
          confirmLabel="Удалить"
        />

        <aside className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out shadow-lg shadow-slate-200/50 md:relative md:translate-x-0 ${sidebarWidth} ${sidebarMobileClasses}`}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between h-[73px]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-lg transition-all ${isOffline ? 'bg-slate-700 shadow-slate-300' : 'bg-blue-600 shadow-blue-200'}`}>
                {isOffline ? <WifiOff size={20} /> : <Users size={24} />}
              </div>
              <div className={`transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden md:block' : 'opacity-100'}`}>
                <h1 className="font-bold text-lg md:text-xl text-slate-800 whitespace-nowrap">HR System</h1>
                <span className={`text-xs md:text-sm font-bold px-2 py-0.5 rounded ml-1 ${isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {isAdmin ? 'ADMIN' : 'USER'}
                </span>
              </div>
            </div>
            <button onClick={handleCloseMobileMenu} className="md:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            <button onClick={handleToggleSidebar} className="hidden md:block p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors absolute right-[-12px] top-6 bg-white border border-slate-200 shadow-sm z-30">
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          <nav className="p-3 md:p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
            <div className="mb-4 md:mb-6">
              {!isSidebarCollapsed && <p className="px-3 md:px-4 text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 md:mb-3 animate-in fade-in">Основное</p>}
              <button onClick={() => handleViewChange('org_chart')} className={`w-full flex items-center gap-2.5 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-medium group relative text-sm md:text-base ${currentView === 'org_chart' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                <div className="flex-shrink-0"><Network size={18} className="md:w-5 md:h-5" /></div>
                {!isSidebarCollapsed && <span className="whitespace-nowrap">Оргсхема</span>}
              </button>
              {isAdmin && (
                <button onClick={() => handleViewChange('employees')} className={`w-full flex items-center gap-2.5 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-medium group relative text-sm md:text-base ${currentView === 'employees' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <div className="flex-shrink-0"><LayoutGrid size={18} className="md:w-5 md:h-5" /></div>
                  {!isSidebarCollapsed && <span className="whitespace-nowrap">Сотрудники</span>}
                </button>
              )}
            </div>

            <div>
              {!isSidebarCollapsed && <p className="px-3 md:px-4 text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 md:mb-3 animate-in fade-in">Статистики</p>}
              <button onClick={() => handleStatisticsView(null)} className={`w-full flex items-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-sm md:text-base transition-all mb-1 ${currentView === 'statistics' && !selectedDept ? 'bg-slate-800 text-white font-semibold shadow-md' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}>
                <div className="flex-shrink-0"><TrendingUp size={18} className="md:w-5 md:h-5" /></div>
                {!isSidebarCollapsed && <span className="whitespace-nowrap">Дашборд</span>}
              </button>
              <div className="mt-2 space-y-0.5 md:space-y-1">
                {departmentList.map(dept => (
                  <button key={dept.id} onClick={() => handleStatisticsView(dept.id)} className={`w-full flex items-center gap-2 md:gap-2.5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all group ${currentView === 'statistics' && selectedDept === dept.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 font-medium'}`}>
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full flex-shrink-0 ring-1 md:ring-2 ring-white shadow-sm" style={{ backgroundColor: dept.color }} />
                    {!isSidebarCollapsed && <span className="truncate text-xs md:text-sm leading-tight">{dept.name}</span>}
                  </button>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="mt-4 md:mt-6 border-t border-slate-100 pt-3 md:pt-4">
                {!isSidebarCollapsed && <p className="px-3 md:px-4 text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 md:mb-3 animate-in fade-in">Конфигурация</p>}
                <button onClick={() => handleViewChange('settings')} className={`w-full flex items-center gap-2.5 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-medium group relative text-sm md:text-base ${currentView === 'settings' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <div className="flex-shrink-0"><SettingsIcon size={18} className="md:w-5 md:h-5" /></div>
                  {!isSidebarCollapsed && <span className="whitespace-nowrap">Настройки</span>}
                </button>
              </div>
            )}
          </nav>

          <div className="p-3 md:p-4 border-t border-gray-100 space-y-3 md:space-y-4">
            {!isSidebarCollapsed && isAdmin && (
              <div className="bg-slate-50 rounded-lg md:rounded-xl p-3 md:p-4 text-center animate-in fade-in">
                <p className="text-xs md:text-sm text-slate-500 mb-1 md:mb-1.5 font-medium">Сотрудников</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-800">{isLoading ? '...' : employees.length}</p>
              </div>
            )}
            <button onClick={() => handleLogout()} className={`w-full flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors text-sm md:text-base ${isSidebarCollapsed ? 'px-0' : ''}`} title="Выход">
              <LogOut size={18} className="md:w-5 md:h-5" />
              {!isSidebarCollapsed && <span>Выход</span>}
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out h-full overflow-hidden pb-20 md:pb-0 relative">
          {/* Pull-to-refresh индикатор */}
          {isRefreshing && (
            <div className="fixed top-0 left-0 right-0 z-30 flex justify-center items-center py-3 bg-blue-50 border-b border-blue-200 safe-area-top">
              <Loader2 className="animate-spin text-blue-600" size={20} />
              <span className="ml-2 text-xs font-medium text-blue-600">Обновление...</span>
            </div>
          )}
          {pullDistance > 0 && !isRefreshing && (
            <div
              className="fixed top-0 left-0 right-0 z-30 flex justify-center items-center py-3 bg-blue-50/50 border-b border-blue-200/50 safe-area-top transition-opacity"
              style={{ opacity: Math.min(pullProgress, 1) }}
            >
              <div className="text-xs font-medium text-blue-600">
                {pullProgress >= 1 ? 'Отпустите для обновления' : 'Потяните для обновления'}
              </div>
            </div>
          )}
          <header className={`bg-white/80 backdrop-blur-md fixed md:sticky top-0 left-0 right-0 z-20 border-b border-gray-200 px-4 md:px-8 py-4 flex justify-between items-center print:hidden h-[73px] w-full transition-all duration-300 safe-area-top ${isRefreshing ? 'mt-[48px]' : ''}`}>
            <div className="flex items-center gap-4 flex-1">
              <button onClick={handleToggleMobileMenu} className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"><Menu size={24} /></button>
              {currentView !== 'settings' && (
                <div className="relative w-full max-w-xs md:max-w-md animate-in fade-in slide-in-from-left-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" placeholder="Поиск по имени или должности..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl outline-none transition-all text-sm md:text-base" />
                </div>
              )}
              {isAdmin && currentView !== 'settings' && (
                <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50 ml-4 animate-in fade-in">
                  <button onClick={handleAddClick} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all flex items-center gap-1.5" title="Новый сотрудник">
                    <Plus size={14} /> <span>Сотрудник</span>
                  </button>
                  <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  <button onClick={() => handleStatisticsView(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg transition-all flex items-center gap-1.5" title="Перейти к управлению статистиками">
                    <TrendingUp size={14} /> <span>Дашборд</span>
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-800">{session?.user?.email}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Текущая сессия</p>
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm ${isAdmin ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  {isAdmin ? <Shield size={16} /> : <Lock size={16} />}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden p-4 md:p-8 pt-[89px] md:pt-8">
            {/* Show Top Bar Loader if loading, but don't block UI */}
            {isLoading && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100 z-50 overflow-hidden">
                <div className="h-full bg-blue-500 animate-[loading_2s_ease-in-out_infinite] w-full origin-left transform scale-x-0"></div>
              </div>
            )}

            <div className={currentView === 'org_chart' ? 'h-full flex flex-col relative' : 'hidden'}>
              {/* Show spinner inside OrgChart if structure is loading, but keep layout responsive */}
              {Object.keys(orgStructure).length === 0 && isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 backdrop-blur-sm">
                  <Loader2 className="animate-spin text-blue-500 mb-2" size={32} />
                  <p className="text-slate-400 font-medium">Загрузка структуры...</p>
                </div>
              ) : null}
              <div className="flex-1 min-h-0 relative">
                <OrgChart employees={employees} onSelectEmployee={handleEditClick} orgStructure={orgStructure} onUpdateOrg={handleUpdateOrgStructureWrapper} isAdmin={isAdmin} />
              </div>
            </div>

            {currentView === 'settings' && isAdmin && <Settings employees={employees} onImport={handleImportDataWrapper} />}

            <div className={currentView === 'statistics' ? 'h-full flex flex-col relative' : 'hidden'}>
              <StatisticsTab employees={employees} isOffline={isOffline} selectedDeptId={selectedDept} isAdmin={isAdmin} />
            </div>


            <div className={currentView === 'employees' && isAdmin ? 'flex flex-col h-full space-y-4' : 'hidden'}>
              <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex bg-slate-100 p-1.5 rounded-lg self-start sm:self-auto flex-wrap gap-1.5">
                    <button onClick={() => setEmployeeSubView('list')} className={`px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base font-semibold rounded-lg transition-all flex items-center gap-2 ${employeeSubView === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                      <List size={18} className="md:w-5 md:h-5" /> Справочник
                    </button>
                    <button onClick={() => setEmployeeSubView('birthdays')} className={`px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base font-semibold rounded-lg transition-all flex items-center gap-2 ${employeeSubView === 'birthdays' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}>
                      <Cake size={18} className="md:w-5 md:h-5" /> Дни Рождения
                    </button>
                    <button onClick={() => handleEmployeeSubViewChange('onboarding')} className={`px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base font-semibold rounded-lg transition-all flex items-center gap-2 ${employeeSubView === 'onboarding' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                      <UserCheck size={18} className="md:w-5 md:h-5" /> Онбординг
                    </button>
                    <button onClick={() => handleEmployeeSubViewChange('documents')} className={`px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base font-semibold rounded-lg transition-all flex items-center gap-2 ${employeeSubView === 'documents' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>
                      <FileText size={18} className="md:w-5 md:h-5" /> Документы
                    </button>
                  </div>
                  {employeeSubView === 'list' && (
                    <div className="text-xs md:text-sm font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 self-start sm:self-auto">
                      ВСЕГО: <span className="text-slate-800">{filteredEmployees.length}</span>
                    </div>
                  )}
                </div>
                {employeeSubView === 'list' && (
                  <div className="relative">
                    <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base font-semibold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none appearance-none cursor-pointer shadow-sm hover:border-blue-300 transition-colors uppercase tracking-wide"
                    >
                      <option value="all">Все департаменты</option>
                      <option disabled>──────────</option>
                      {DEPT_SORT_ORDER.map(deptId => {
                        const dept = ORGANIZATION_STRUCTURE[deptId];
                        if (!dept) return null;
                        return <option key={deptId} value={deptId}>{dept.name}</option>
                      })}
                    </select>
                    <ChevronRight size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
                  </div>
                )}
                {employeeSubView === 'documents' && (
                  <div className="flex bg-slate-100 p-1.5 rounded-lg gap-1.5">
                    <button onClick={() => setDocumentsSubView('sent')} className={`flex-1 px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${documentsSubView === 'sent' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>
                      <FileText size={18} className="md:w-5 md:h-5" /> Отправленные
                    </button>
                    <button onClick={() => setDocumentsSubView('received')} className={`flex-1 px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${documentsSubView === 'received' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>
                      <Upload size={18} className="md:w-5 md:h-5" /> Полученные
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                {employeeSubView === 'list' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <EmployeeList employees={filteredEmployees} onEdit={handleEditClick} onDelete={handleDeleteEmployeeRequest} />
                  </div>
                )}
                {employeeSubView === 'birthdays' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <Birthdays employees={employees} />
                  </div>
                )}
                {employeeSubView === 'onboarding' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <OnboardingDashboard employees={employees} isAdmin={isAdmin} />
                  </div>
                )}
                {employeeSubView === 'documents' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    {documentsSubView === 'sent' ? (
                      <DocumentsDashboard employees={employees} isAdmin={isAdmin} />
                    ) : (
                      <ReceivedDocumentsDashboard employees={employees} isAdmin={isAdmin} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <MobileBottomNav
          currentView={currentView}
          onViewChange={setCurrentView}
          isAdmin={isAdmin}
        />

        <EmployeeModal
          isOpen={isModalOpen}
          isReadOnly={!isAdmin}
          onClose={handleCloseModal}
          onSave={handleSaveEmployeeWrapper}
          initialData={editingEmployee}
        />
      </div >
    </ErrorBoundary >
  );
}

export default App;
