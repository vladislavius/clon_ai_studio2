import React, { useState, useCallback } from 'react'; // Добавлен useCallback
import ImportExport from './ImportExport';
import IntegrationsPanel from './IntegrationsPanel';
import { Employee } from '../types';
import { Database, Settings as SettingsIcon, Globe, Save, Plug, Download, X, Bell, BellOff } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useToast } from './Toast';

interface SettingsProps {
    employees: Employee[];
    onImport: (data: Employee[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ employees, onImport }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'database' | 'integrations'>('general');
    const toast = useToast();
    const { showPrompt, isInstalled, handleInstall, dismissPrompt } = useInstallPrompt();
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
        'Notification' in window ? Notification.permission : 'denied'
    );
    
    // Mock settings state
    const [companyName, setCompanyName] = useState('Остров Сокровищ');
    const [currency, setCurrency] = useState('THB');

    const handleRequestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            toast.error('Ваш браузер не поддерживает уведомления');
            return;
        }

        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
            toast.success('Уведомления включены');
        } else {
            toast.warning('Разрешение на уведомления отклонено');
        }
    };

    const handleInstallClick = async () => {
        const installed = await handleInstall();
        if (installed) {
            toast.success('Приложение установлено!');
        } else {
            toast.error('Не удалось установить приложение');
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in space-y-4">
            
            {/* Header / Tabs Container (Matches Stats Header Style) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-3 px-1">
                    <div className="p-2 bg-slate-800 text-white rounded-lg shadow-sm">
                        <SettingsIcon size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Настройки</h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Система и данные</p>
                    </div>
                </div>

                <div className="relative">
                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1">
                        <button 
                            onClick={() => setActiveTab('general')}
                            className={`flex-shrink-0 px-4 py-2 text-xs font-bold rounded-lg transition-all border flex items-center gap-2 ${activeTab === 'general' ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                        >
                            <Globe size={14} />
                            Профиль
                        </button>
                        <button 
                            onClick={() => setActiveTab('database')}
                            className={`flex-shrink-0 px-4 py-2 text-xs font-bold rounded-lg transition-all border flex items-center gap-2 ${activeTab === 'database' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                        >
                            <Database size={14} />
                            База Данных
                        </button>
                        <button 
                            onClick={() => setActiveTab('integrations')}
                            className={`flex-shrink-0 px-4 py-2 text-xs font-bold rounded-lg transition-all border flex items-center gap-2 ${activeTab === 'integrations' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                        >
                            <Plug size={14} />
                            Интеграции
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                {activeTab === 'general' && (
                    <div className="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar animate-in fade-in">
                        <div className="max-w-xl mx-auto space-y-6">
                            
                            {/* Card Style Input Group */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Название Организации</label>
                                    <input 
                                        value={companyName} 
                                        onChange={e => setCompanyName(e.target.value)} 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 text-sm shadow-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Основная Валюта</label>
                                        <select 
                                            value={currency}
                                            onChange={e => setCurrency(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 text-sm shadow-sm appearance-none cursor-pointer"
                                        >
                                            <option value="THB">THB (Тайский Бат)</option>
                                            <option value="USD">USD (Доллар США)</option>
                                            <option value="RUB">RUB (Рубль)</option>
                                            <option value="EUR">EUR (Евро)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Часовой пояс</label>
                                        <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500 text-sm flex items-center justify-between opacity-70">
                                            <span>Asia/Bangkok (GMT+7)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PWA Install Prompt */}
                            {showPrompt && !isInstalled && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Download className="text-blue-600" size={20} />
                                            <h3 className="font-bold text-slate-800 text-sm">Установить приложение</h3>
                                        </div>
                                        <button 
                                            onClick={dismissPrompt}
                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-600 mb-4">
                                        Установите HR System Pro на ваше устройство для быстрого доступа и работы в офлайн режиме.
                                    </p>
                                    <button
                                        onClick={handleInstallClick}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all text-sm"
                                    >
                                        <Download size={16} />
                                        Установить приложение
                                    </button>
                                </div>
                            )}

                            {/* Push Notifications */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {notificationPermission === 'granted' ? (
                                            <Bell className="text-emerald-600" size={20} />
                                        ) : (
                                            <BellOff className="text-slate-400" size={20} />
                                        )}
                                        <h3 className="font-bold text-slate-800 text-sm">Push-уведомления</h3>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                                        notificationPermission === 'granted' 
                                            ? 'bg-emerald-100 text-emerald-700' 
                                            : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {notificationPermission === 'granted' ? 'Включено' : 'Выключено'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 mb-4">
                                    Получайте уведомления о днях рождения, важных событиях и обновлениях.
                                </p>
                                {notificationPermission !== 'granted' && (
                                    <button
                                        onClick={handleRequestNotificationPermission}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-all text-sm"
                                    >
                                        <Bell size={16} />
                                        Включить уведомления
                                    </button>
                                )}
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex justify-end">
                                <button className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 text-sm">
                                    <Save size={16} />
                                    Сохранить настройки
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'database' && (
                    <div className="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar">
                        <ImportExport employees={employees} onImport={onImport} />
                    </div>
                )}
                {activeTab === 'integrations' && (
                    <div className="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar">
                        <IntegrationsPanel employees={employees} isAdmin={true} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
