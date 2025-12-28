import React, { useState, useEffect, useRef, useCallback } from 'react'; // Добавлен useCallback
import { ORGANIZATION_STRUCTURE, ROLE_STAT_TEMPLATES, HANDBOOK_STATISTICS } from '../constants';
import { X, Save, Upload, FileText, Trash2, Plus, TrendingUp, TrendingDown, CheckCircle2, Printer, Download, Link as LinkIcon, Image as ImageIcon, Calendar, Info, HelpCircle, ArrowDownUp, AlertCircle, Phone, User, HeartPulse, File, Lock, DownloadCloud, Link2, Unlink, Sparkles, Copy, Edit2, Layers, Loader2, Minus, Wallet, CreditCard, Landmark, Globe, List, Check, FolderOpen, Clock, GraduationCap, BookOpen, ArrowUp, ArrowDown, Lock as LockIcon } from 'lucide-react';
import { Employee as EmployeeType, Attachment, EmergencyContact, StatisticDefinition, StatisticValue, WiseCondition, DevelopmentPlan, DevelopmentCourse } from '../types';
import { supabase } from '../supabaseClient';
import StatsChart from './StatsChart';
import { format, subDays, getDay } from 'date-fns';
import ConfirmationModal from './ConfirmationModal';
import { validateEmail, validatePhone, validateDate, validateBirthDate, validateTelegram, getValidationError } from '../utils/validation';
import { analyzeTrend, getFilteredValues } from '../utils/statistics';
import { useToast } from './Toast';
import { useErrorHandler } from '../utils/errorHandler';
import { useSwipe } from '../hooks/useSwipe';
import { validateFile, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES, formatFileSize } from '../utils/fileValidation';
import { TraineeCheckpoints } from './TraineeCheckpoints';
import { getTraineeProgress } from '../utils/traineeTransition';

interface EmployeeModalProps {
    isOpen: boolean;
    isReadOnly?: boolean;
    onClose: () => void;
    onSave: (employee: EmployeeType) => void;
    initialData: EmployeeType | null;
    onOpenHatFolder?: (employee: EmployeeType) => void; // Callback для открытия шляпной папки
}

const DEFAULT_EMPLOYEE: EmployeeType = {
    id: '',
    created_at: '',
    updated_at: '',
    full_name: '',
    position: '',
    nickname: '',
    email: '',
    email2: '',
    phone: '',
    whatsapp: '',
    telegram: '',
    birth_date: '',
    join_date: '',
    actual_address: '',
    registration_address: '',
    inn: '',
    passport_number: '',
    passport_date: '',
    passport_issuer: '',
    foreign_passport: '',
    foreign_passport_date: '',
    foreign_passport_issuer: '',
    bank_name: '',
    bank_details: '',
    crypto_wallet: '',
    crypto_network: '',
    crypto_currency: '',
    additional_info: '',
    emergency_contacts: [],
    custom_fields: [],
    attachments: [],
    department: [],
    subdepartment: []
};

// Demo Data Generator
const generateDemoPersonalStats = () => {
    const generateHistory = (base: number) => Array.from({ length: 52 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - ((51 - i) * 7)); // Weekly points for a year
        return {
            id: `demo-${i}`,
            definition_id: 'demo',
            date: d.toISOString().split('T')[0],
            value: Math.max(0, Math.floor(base + Math.sin(i / 5) * 20 + Math.random() * 10 - 5))
        };
    });
    return [
        {
            def: { id: 'p1', title: 'Личная Продуктивность (Баллы)', type: 'employee', owner_id: 'demo', description: 'Суммарный объем выполненных задач в баллах' },
            vals: generateHistory(100)
        },
        {
            def: { id: 'p2', title: 'Завершенные циклы действий', type: 'employee', owner_id: 'demo', description: 'Количество полностью закрытых задач без возврата' },
            vals: generateHistory(45)
        }
    ];
};

const PERIODS = [
    { id: '1w', label: '1 Нед.' },
    { id: '3w', label: '3 Нед.' },
    { id: '1m', label: 'Месяц' },
    { id: '3m', label: '3 Мес.' },
    { id: '6m', label: 'Полгода' },
    { id: '1y', label: 'Год' },
    { id: 'all', label: 'Все' },
];

// analyzeTrend и getFilteredValues теперь импортируются из utils/statistics

// Helper to get nearest previous Thursday (Start of Fiscal Week)
const getNearestThursday = () => {
    const d = new Date();
    const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 4 = Thu
    const diff = (day + 7 - 4) % 7; // Distance to Thursday
    d.setDate(d.getDate() - diff);
    return d.toISOString().split('T')[0];
};

const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, isReadOnly = false, onClose, onSave, initialData, onOpenHatFolder }) => {
    const [formData, setFormData] = useState<EmployeeType>(DEFAULT_EMPLOYEE);
    const [activeTab, setActiveTab] = useState('general');
    const [isUploading, setIsUploading] = useState(false);
    const [showDocumentTypeModal, setShowDocumentTypeModal] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [selectedDocumentType, setSelectedDocumentType] = useState<'contract_nda' | 'passport_scan' | 'inn_snils' | 'zrs' | 'other' | null>(null);
    const [previewDocument, setPreviewDocument] = useState<Attachment | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const categoryFileInputRef = useRef<HTMLInputElement>(null);

    // Toast и Error Handler
    const toast = useToast();
    const { handleError } = useErrorHandler();

    // Stats State
    const [statsDefinitions, setStatsDefinitions] = useState<StatisticDefinition[]>([]);
    const [statsValues, setStatsValues] = useState<StatisticValue[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isDemoStats, setIsDemoStats] = useState(false);
    const [statsPeriod, setStatsPeriod] = useState<string>('3w');
    const [newValueInput, setNewValueInput] = useState<Record<string, string>>({}); // {statId: value}
    const [newValueInput2, setNewValueInput2] = useState<Record<string, string>>({}); // {statId: value2}
    const [infoStatId, setInfoStatId] = useState<string | null>(null); // For overlay description
    const [newStatDate, setNewStatDate] = useState<string>(getNearestThursday());

    // Stat Management State (Create/Assign)
    const [showStatManager, setShowStatManager] = useState(false);
    const [newStatData, setNewStatData] = useState({ title: '', description: '', inverted: false, is_double: false, calculation_method: '' });
    
    // Trainee Progress State
    const [isTrainee, setIsTrainee] = useState(false);

    // Editing State
    const [editingStatId, setEditingStatId] = useState<string | null>(null);
    const [historyStatId, setHistoryStatId] = useState<string | null>(null); // NEW: To show history modal

    // Confirm Modal State (Local for statistics actions)
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const isNewEmployee = !initialData;

    useEffect(() => {
        let isMounted = true;

        if (isOpen) {
            if (initialData) {
                setFormData(prev => {
                    if (prev.id === initialData.id && prev.photo_url !== initialData.photo_url) {
                        return { ...DEFAULT_EMPLOYEE, ...initialData, photo_url: prev.photo_url || initialData.photo_url };
                    }
                    return { ...DEFAULT_EMPLOYEE, ...initialData };
                });
                if (isMounted) {
                    fetchPersonalStats(initialData.id);
                    checkTraineeStatus(initialData);
                }
            } else {
                setFormData({ ...DEFAULT_EMPLOYEE, id: crypto.randomUUID(), created_at: new Date().toISOString() });
                setStatsDefinitions([]);
                setStatsValues([]);
            }
            if (isMounted) {
                setActiveTab('general');
                setStatsPeriod('3w');
                setInfoStatId(null);
                setShowStatManager(false);
                setEditingStatId(null);
                setHistoryStatId(null);
                setNewStatDate(getNearestThursday());
            }
        }

        return () => {
            isMounted = false;
        };
    }, [isOpen, initialData?.id]);

    const checkTraineeStatus = async (employee: EmployeeType) => {
        try {
            const progress = await getTraineeProgress(employee.id);
            setIsTrainee(!!progress && progress.status === 'trainee');
        } catch (error) {
            // Игнорируем ошибки, просто не показываем вкладку
            setIsTrainee(false);
        }
    };

    const fetchPersonalStats = async (empId: string) => {
        setIsLoadingStats(true);
        setIsDemoStats(false);

        let foundData = false;
        if (supabase) {
            const { data: defs } = await supabase.from('statistics_definitions').select('*').eq('owner_id', empId);
            if (defs && defs.length > 0) {
                setStatsDefinitions(defs);
                const ids = defs.map(d => d.id);
                const { data: vals } = await supabase.from('statistics_values').select('*').in('definition_id', ids).order('date', { ascending: true });
                setStatsValues(vals || []);
                foundData = true;
            } else {
                setStatsDefinitions([]);
            }
        }

        if (!supabase && !foundData) {
            const demo = generateDemoPersonalStats();
            setStatsDefinitions(demo.map(d => d.def as StatisticDefinition));
            const allVals: StatisticValue[] = [];
            demo.forEach(d => {
                d.vals.forEach(v => allVals.push({ ...v, definition_id: d.def.id }));
            });
            setStatsValues(allVals);
            setIsDemoStats(true);
        }
        setIsLoadingStats(false);
    };

    const handleCreatePersonalStat = async (template?: Partial<StatisticDefinition>) => {
        const titleToUse = template?.title || newStatData.title;
        if (!titleToUse) {
            toast.warning("Введите название статистики");
            return;
        }
        if (!supabase) {
            toast.error('База данных не настроена');
            return;
        }

        const newStat: Partial<StatisticDefinition> = {
            title: titleToUse,
            description: template?.description || newStatData.description || 'Личная статистика',
            owner_id: formData.id,
            type: 'employee',
            inverted: template?.inverted ?? newStatData.inverted,
            is_double: template?.is_double ?? newStatData.is_double,
            calculation_method: template?.calculation_method ?? newStatData.calculation_method
        };

        try {
            const { data, error } = await supabase.from('statistics_definitions').insert([newStat]).select();

            if (error) {
                handleError(error, 'Ошибка создания статистики');
                return;
            }

            if (data && data.length > 0) {
                const createdStat = data[0];
                if (createdStat && createdStat.id) {
                    setStatsDefinitions(prev => [...prev, createdStat]);
                    setShowStatManager(false);
                    setNewStatData({ title: '', description: '', inverted: false, is_double: false, calculation_method: '' });
                    toast.success('Статистика создана');
                }
            }
        } catch (err) {
            handleError(err, 'Ошибка при создании статистики');
        }
    };

    const handleDeleteStatRequest = (statId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Удаление статистики',
            message: 'Вы уверены, что хотите удалить эту статистику и все её данные? Это действие необратимо.',
            onConfirm: () => handleDeleteStat(statId)
        });
    };

    const handleDeleteStat = async (statId: string) => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (!supabase) {
            toast.error('База данных не настроена');
            return;
        }

        try {
            // 1. Delete values
            const { error: valuesError } = await supabase.from('statistics_values').delete().eq('definition_id', statId);
            if (valuesError) {
                handleError(valuesError, 'Ошибка удаления значений статистики');
                return;
            }

            // 2. Delete definition
            const { error } = await supabase.from('statistics_definitions').delete().eq('id', statId);

            if (error) {
                handleError(error, 'Ошибка удаления статистики');
            } else {
                setStatsDefinitions(prev => prev.filter(s => s.id !== statId));
                toast.success('Статистика удалена');
            }
        } catch (err) {
            handleError(err, 'Ошибка при удалении статистики');
        }
    };

    const handleDeleteValue = async (valId: string) => {
        if (!confirm("Удалить это значение?")) return;

        try {
            if (!supabase) {
                setStatsValues(prev => prev.filter(v => v.id !== valId));
                toast.success('Значение удалено');
                return;
            }

            const { error } = await supabase.from('statistics_values').delete().eq('id', valId);
            if (error) {
                handleError(error, 'Ошибка удаления значения');
                return;
            }

            setStatsValues(prev => prev.filter(v => v.id !== valId));
            toast.success('Значение удалено');
        } catch (err) {
            handleError(err, 'Ошибка при удалении значения');
        }
    };

    const handleUpdateStat = async () => {
        if (!editingStatId || !supabase) {
            toast.warning('Выберите статистику для редактирования');
            return;
        }

        if (!newStatData.title) {
            toast.warning('Введите название статистики');
            return;
        }

        try {
            const { error } = await supabase.from('statistics_definitions').update({
                title: newStatData.title,
                description: newStatData.description,
                inverted: newStatData.inverted,
                is_double: newStatData.is_double,
                calculation_method: newStatData.calculation_method
            }).eq('id', editingStatId);

            if (error) {
                handleError(error, 'Ошибка обновления статистики');
            } else {
                setStatsDefinitions(prev => prev.map(s => s.id === editingStatId ? { ...s, ...newStatData } : s));
                setEditingStatId(null);
                setNewStatData({ title: '', description: '', inverted: false, is_double: false, calculation_method: '' });
                toast.success('Статистика обновлена');
            }
        } catch (err) {
            handleError(err, 'Ошибка при обновлении статистики');
        }
    };

    const startEditing = (stat: StatisticDefinition) => {
        setEditingStatId(stat.id);
        setNewStatData({
            title: stat.title,
            description: stat.description || '',
            inverted: stat.inverted || false,
            is_double: stat.is_double || false,
            calculation_method: stat.calculation_method || ''
        });
    };

    // Используем общую утилиту getFilteredValues из utils/statistics
    const getFilteredValuesForStat = (statId: string) => {
        const vals = statsValues.filter(v => v.definition_id === statId);
        return getFilteredValues(vals, statsPeriod as import('../utils/statistics').PeriodType);
    };

    const handleAddValue = async (statId: string, isDouble: boolean) => {
        try {
            const valStr = newValueInput[statId];
            if (!valStr) {
                toast.warning('Введите значение');
                return;
            }

            const val = parseFloat(valStr);
            if (isNaN(val)) {
                toast.error('Неверное числовое значение');
                return;
            }

            let val2 = 0;
            if (isDouble && newValueInput2[statId]) {
                val2 = parseFloat(newValueInput2[statId]);
                if (isNaN(val2)) {
                    toast.error('Неверное значение для второго параметра');
                    return;
                }
            }

            const date = newStatDate;
            if (!validateDate(date)) {
                toast.error('Неверная дата');
                return;
            }

            if (isDemoStats || !supabase) {
                const newVal: StatisticValue = {
                    id: `local-${Date.now()}`,
                    definition_id: statId,
                    date: date,
                    value: val,
                    value2: val2
                };
                setStatsValues(prev => [...prev, newVal]);
                setNewValueInput(prev => ({ ...prev, [statId]: '' }));
                if (isDouble) setNewValueInput2(prev => ({ ...prev, [statId]: '' }));
                toast.success('Значение добавлено');
                return;
            }

            const { data, error } = await supabase.from('statistics_values').insert([{ definition_id: statId, value: val, value2: val2, date: date }]).select();

            if (error) {
                handleError(error, 'Ошибка сохранения значения статистики');
                return;
            }

            if (data && data.length > 0) {
                setStatsValues(prev => [...prev, data[0]]);
                setNewValueInput(prev => ({ ...prev, [statId]: '' }));
                if (isDouble) setNewValueInput2(prev => ({ ...prev, [statId]: '' }));
                toast.success('Значение сохранено');
            }
        } catch (error) {
            handleError(error, 'Ошибка при добавлении значения');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleDepartment = (deptId: string) => {
        if (isReadOnly) return;
        setFormData(prev => {
            const current = prev.department || [];
            const exists = current.includes(deptId);
            let newDepts;
            if (exists) {
                newDepts = current.filter(d => d !== deptId);
                const deptObj = ORGANIZATION_STRUCTURE[deptId];
                const subIdsToRemove = deptObj.departments ? Object.keys(deptObj.departments) : [];
                const newSubs = (prev.subdepartment || []).filter(s => !subIdsToRemove.includes(s));
                return { ...prev, department: newDepts, subdepartment: newSubs };
            } else {
                newDepts = [...current, deptId];
                return { ...prev, department: newDepts };
            }
        });
    };

    const toggleSubDepartment = (subId: string) => {
        if (isReadOnly) return;
        setFormData(prev => {
            const current = prev.subdepartment || [];
            const exists = current.includes(subId);
            const newSubs = exists ? current.filter(s => s !== subId) : [...current, subId];
            return { ...prev, subdepartment: newSubs };
        });
    };

    const handleEmergencyChange = (index: number, field: keyof EmergencyContact, value: string) => {
        const newContacts = [...formData.emergency_contacts];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setFormData(prev => ({ ...prev, emergency_contacts: newContacts }));
    };
    const addEmergencyContact = () => { setFormData(prev => ({ ...prev, emergency_contacts: [...prev.emergency_contacts, { name: '', relation: '', phone: '' }] })); };
    const removeEmergencyContact = (index: number) => { setFormData(prev => ({ ...prev, emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index) })); };
    // --- FILE & PHOTO UPLOAD ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isPhoto: boolean = false) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // Валидация файла перед загрузкой
        const validationResult = await validateFile(file, { isImage: isPhoto });
        if (!validationResult.valid) {
            toast.error(validationResult.error || 'Ошибка валидации файла');
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (docInputRef.current) docInputRef.current.value = '';
            return;
        }

        // Если это фото, загружаем сразу
        if (isPhoto) {
            setIsUploading(true);
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target?.result as string;
                setFormData(prev => ({ ...prev, photo_url: base64 }));

                if (supabase) {
                    const safeFileName = validationResult.safeFileName || file.name;
                    const fileName = `${formData.id}/${Date.now()}_${safeFileName}`;
                    try {
                        const bucket = 'employee-files';
                        const fullPath = `photos/${fileName}`;
                        const { data, error } = await supabase.storage.from(bucket).upload(fullPath, file);

                        if (error) {
                            toast.error('Ошибка загрузки: ' + error.message);
                            setIsUploading(false);
                            return;
                        }

                        if (data) {
                            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
                            setFormData(prev => ({ ...prev, photo_url: urlData.publicUrl }));
                            toast.success('Фото загружено');
                        }
                    } catch (err) {
                        console.error("Upload error", err);
                        toast.error('Ошибка при загрузке файла');
                    }
                }
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Для документов показываем модальное окно выбора типа
        setPendingFile(file);
        setShowDocumentTypeModal(true);
        if (docInputRef.current) docInputRef.current.value = '';
    };

    const handleDocumentTypeConfirm = async () => {
        if (!pendingFile || !selectedDocumentType) {
            toast.error('Выберите тип документа');
            return;
        }

        await uploadFileWithCategory(pendingFile, selectedDocumentType);
        setShowDocumentTypeModal(false);
        setPendingFile(null);
        setSelectedDocumentType(null);
    };

    const uploadFileWithCategory = async (file: File, category: 'contract_nda' | 'passport_scan' | 'inn_snils' | 'zrs' | 'other') => {
        setIsUploading(true);
        const validationResult = await validateFile(file, { isImage: false });
        
        if (!validationResult.valid) {
            toast.error(validationResult.error || 'Ошибка валидации файла');
            setIsUploading(false);
            return;
        }

        // Получаем расширение файла
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
        // Создаем безопасное имя файла только из латиницы, цифр и подчеркиваний (без кириллицы для избежания проблем с кодировкой)
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        // Используем только ASCII символы для избежания проблем с кодировкой в Storage
        // Убираем все не-ASCII символы (включая кириллицу)
        let safeBaseName = file.name
            .replace(/\.[^/.]+$/, '') // Убираем расширение
            .replace(/[^\x00-\x7F]/g, '') // Убираем все не-ASCII символы (включая кириллицу)
            .replace(/[^a-zA-Z0-9\-_\s]/g, '') // Оставляем только латиницу, цифры, дефисы, подчеркивания и пробелы
            .replace(/\s+/g, '_') // Заменяем пробелы на подчеркивания
            .substring(0, 50); // Ограничиваем длину
        
        // Если после очистки имя стало пустым, используем дефолтное
        if (!safeBaseName || safeBaseName.trim().length === 0) {
            safeBaseName = 'document';
        }
        
        // Формируем имя файла: employee_id/timestamp_random_baseName.ext
        const fileName = `${formData.id}/${timestamp}_${randomSuffix}_${safeBaseName}.${fileExt}`;

        if (supabase) {
            try {
                const bucket = 'employee-docs';
                const fullPath = `documents/${fileName}`;
                const { data, error } = await supabase.storage.from(bucket).upload(fullPath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

                if (error) {
                    toast.error('Ошибка загрузки: ' + error.message);
                    setIsUploading(false);
                    return;
                }

                if (data) {
                    // Получаем публичный URL
                    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
                    
                    // Сохраняем оригинальное имя файла для отображения пользователю
                    const originalFileName = file.name;
                    
                    const newAttachment: Attachment = {
                        id: crypto.randomUUID(),
                        employee_id: formData.id,
                        file_name: originalFileName, // Оригинальное имя для отображения
                        file_type: file.type,
                        file_size: file.size,
                        storage_path: data.path, // Путь в storage (с безопасным именем без кириллицы)
                        public_url: urlData.publicUrl,
                        uploaded_at: new Date().toISOString(),
                        document_category: category
                    };
                    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
                    toast.success('Документ загружен');
                }
            } catch (err: any) {
                console.error("Upload error", err);
                const errorMessage = err?.message || err?.error?.message || 'Ошибка при загрузке файла';
                toast.error(`Ошибка загрузки: ${errorMessage}`);
            }
        }

        setIsUploading(false);
    };

    const handleCategoryUpload = (category: 'contract_nda' | 'passport_scan' | 'inn_snils' | 'zrs') => {
        if (categoryFileInputRef.current) {
            categoryFileInputRef.current.setAttribute('data-category', category);
            categoryFileInputRef.current.click();
        }
    };

    const handleCategoryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const category = e.target.getAttribute('data-category') as 'contract_nda' | 'passport_scan' | 'inn_snils' | 'zrs' | null;
        
        if (!category) {
            // Если категория не указана, показываем модальное окно
            setPendingFile(file);
            setShowDocumentTypeModal(true);
        } else {
            // Загружаем сразу с указанной категорией
            await uploadFileWithCategory(file, category);
        }

        if (categoryFileInputRef.current) {
            categoryFileInputRef.current.value = '';
            categoryFileInputRef.current.removeAttribute('data-category');
        }
    };

    const removeAttachment = (id: string) => { setFormData(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== id) })); };

    const handleSubmit = (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        if (isUploading) {
            toast.warning('Дождитесь завершения загрузки файлов');
            return;
        }

        // Валидация обязательных полей
        if (!formData.full_name || formData.full_name.trim().length === 0) {
            toast.error('Введите ФИО сотрудника');
            return;
        }

        // Валидация email если указан
        if (formData.email && !validateEmail(formData.email)) {
            toast.error('Неверный формат email');
            return;
        }

        // Валидация телефона если указан
        if (formData.phone && !validatePhone(formData.phone)) {
            toast.error('Неверный формат телефона');
            return;
        }

        // Валидация даты рождения если указана
        if (formData.birth_date && !validateBirthDate(formData.birth_date)) {
            toast.error('Неверная дата рождения');
            return;
        }

        try {
            onSave({ ...formData, updated_at: new Date().toISOString() });
            toast.success('Сотрудник сохранен');
        } catch (error) {
            handleError(error, 'Ошибка при сохранении сотрудника');
        }
    };

    // Swipe жесты для закрытия модального окна (только на мобильных)
    const swipeHandlers = useSwipe({
        onSwipeDown: () => {
            if (!isReadOnly && window.innerWidth < 768) {
                onClose();
            }
        },
        onSwipeDownThreshold: 100, // Минимальное расстояние для закрытия
    });

    if (!isOpen) return null;

    const inputClass = `w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400 hover:border-slate-300 ${isReadOnly ? 'bg-slate-50 text-slate-600 pointer-events-none' : ''}`;
    const labelClass = "block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1 tracking-wide";

    return (
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4"
            {...swipeHandlers}
        >
            {/* ... (Modal Header & Tabs - Preserved) ... */}
            <div className="bg-white rounded-none md:rounded-3xl shadow-2xl w-full max-w-6xl h-full md:h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="flex justify-between items-center px-4 md:px-8 py-3 md:py-5 border-b border-gray-100 bg-white flex-shrink-0">
                    <div className="min-w-0 pr-2">
                        <h2 className="text-lg md:text-2xl font-bold text-slate-800 truncate leading-tight">{isReadOnly ? 'Сотрудник' : (initialData ? 'Редактирование' : 'Новый')}</h2>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 md:hidden">
                            <span>{formData.id.substring(0, 6)}...</span>
                            {!isReadOnly && (
                                <span className="text-[10px] text-slate-400">• Потяните вниз для закрытия</span>
                            )}
                        </div>
                        <div className="items-center gap-2 text-sm text-slate-500 mt-0.5 hidden md:flex">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono text-slate-600">{formData.id.substring(0, 8)}</span>
                            <span>• Личное дело {isReadOnly && '(Только чтение)'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="px-3 md:px-5 py-2 md:py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{isReadOnly ? 'Закрыть' : 'Отмена'}</button>
                        {!isReadOnly && (
                            <button type="button" onClick={handleSubmit} disabled={isUploading} className={`px-3 md:px-6 py-2 md:py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2 transition-all ${isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700 hover:-translate-y-0.5'}`}>
                                {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                <span className="hidden md:inline">Сохранить</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-slate-50/50">
                    <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-2 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shadow-[0_4px_12px_-6px_rgba(0,0,0,0.1)] md:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10 custom-scrollbar flex-shrink-0 sticky top-0">
                        {[
                            { id: 'general', label: '1. Основное' },
                            { id: 'contacts', label: '2. Контакты' },
                            { id: 'docs', label: '3. Документы', restricted: true },
                            { id: 'finance', label: '4. Финансы', restricted: true },
                            { id: 'files', label: '5. Файлы', restricted: true },
                            { id: 'stats', label: '6. Статистика', icon: <TrendingUp size={14} />, restricted: false },
                            { id: 'development', label: '7. Карта развития', icon: <GraduationCap size={14} />, restricted: false },
                            { id: 'hatfolder', label: '8. Шляпная папка', icon: <FolderOpen size={14} />, restricted: false },
                            ...(isTrainee ? [{ id: 'trainee', label: '9. Чек-поинты стажера', icon: <Clock size={14} />, restricted: false }] : [])
                        ].map(tab => {
                            if (isReadOnly && tab.restricted) return null;
                            return (
                                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex-shrink-0 w-auto md:w-full text-left px-3 md:px-4 py-2 md:py-3.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-between group whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
                                    <span className="flex items-center gap-2">{tab.label}</span>
                                    {tab.icon && <span className={`hidden md:block ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`}>{tab.icon}</span>}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                        <form className="max-w-4xl mx-auto space-y-8 pb-20" onSubmit={(e) => e.preventDefault()}>
                            {/* ... (Other Tabs Hidden for Brevity - They are preserved in real DOM) ... */}
                            {activeTab === 'general' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><div className="w-1.5 h-6 bg-blue-500 rounded-full"></div> Личные Данные</h3>
                                        <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                            <div className="md:col-span-2 flex justify-center mb-4">
                                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-100 shadow-lg overflow-hidden bg-slate-200 relative group">
                                                    {formData.photo_url ? (
                                                        <img
                                                            src={formData.photo_url}
                                                            alt="Avatar"
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                            decoding="async"
                                                            onError={(e) => {
                                                                if (e.currentTarget.src.startsWith('https://ui-avatars.com')) return;
                                                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${formData.full_name}&background=f1f5f9&color=64748b`;
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                                                            <User size={32} />
                                                        </div>
                                                    )}
                                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg"><Upload size={24} /></button>
                                                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, true)} className="hidden" accept="image/*" />
                                                </div>
                                            </div>
                                            <div><label className={labelClass}>ФИО (Полностью)</label><input name="full_name" value={formData.full_name} onChange={handleChange} className={inputClass} placeholder="Иванов Иван Иванович" /></div>
                                            <div><label className={labelClass}>Должность</label><input name="position" value={formData.position} onChange={handleChange} className={inputClass} /></div>
                                            <div><label className={labelClass}>Дата Рождения</label><input type="date" name="birth_date" value={formData.birth_date || ''} onChange={handleChange} className={inputClass} /></div>
                                            <div><label className={labelClass}>Дата Приема</label><input type="date" name="join_date" value={formData.join_date || ''} onChange={handleChange} className={inputClass} /></div>
                                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div><label className={labelClass}>Системный NIK</label><input name="nickname" value={formData.nickname || ''} onChange={handleChange} className={inputClass} placeholder="ivan_hr" /></div>
                                                <div><label className={labelClass}>Telegram (Username)</label><input name="telegram" value={formData.telegram || ''} onChange={handleChange} className={inputClass} placeholder="@username" /></div>
                                            </div>
                                        </div>
                                    </section>
                                    {/* ... Org Structure Section ... */}
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><div className="w-1.5 h-6 bg-amber-500 rounded-full"></div> Организационная Структура</h3>
                                        <div className="space-y-6">
                                            <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Департамент (Владелец)</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {Object.values(ORGANIZATION_STRUCTURE).map(d => {
                                                        const isSelected = formData.department?.includes(d.id);
                                                        return (
                                                            <div key={d.id} onClick={() => toggleDepartment(d.id)} className={`cursor-pointer p-3 rounded-2xl border-2 transition-all flex items-center gap-3 relative overflow-hidden group ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-md ring-0' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}>
                                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm font-bold text-sm transition-transform group-hover:scale-105" style={{ backgroundColor: d.color }}>{d.name.substring(0, 1)}</div>
                                                                <div className="flex-1 min-w-0 z-10"><div className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{d.name.split(':')[0]}</div><div className="text-[10px] text-slate-400 truncate font-medium">{d.manager}</div></div>
                                                                {isSelected && <div className="absolute top-2 right-2 text-blue-500"><CheckCircle2 size={18} fill="currentColor" className="text-white" /></div>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            {formData.department && formData.department.length > 0 && (
                                                <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Отдел / Секция (Функциональная роль)</label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {formData.department.map(deptId => {
                                                            const dept = ORGANIZATION_STRUCTURE[deptId];
                                                            if (!dept?.departments) return null;
                                                            return Object.values(dept.departments).map(sub => {
                                                                const isSelected = formData.subdepartment?.includes(sub.id);
                                                                return (
                                                                    <div key={sub.id} onClick={() => toggleSubDepartment(sub.id)} className={`cursor-pointer p-4 rounded-2xl border transition-all flex justify-between items-center group ${isSelected ? 'border-amber-500 bg-amber-50/50 shadow-md' : 'border-slate-100 hover:border-amber-300 hover:bg-slate-50'}`}>
                                                                        <div><div className={`text-sm font-bold ${isSelected ? 'text-amber-900' : 'text-slate-700'}`}>{sub.name}</div><div className="text-[10px] text-slate-400 font-medium mt-0.5">{dept.name.split('.')[0]} • {sub.manager}</div></div>
                                                                        {isSelected && <CheckCircle2 size={20} className="text-amber-500" fill="#fff" />}
                                                                    </div>
                                                                );
                                                            });
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'contacts' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><Phone className="text-emerald-500" size={20} /> Контактная Информация</h3>
                                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div><label className={labelClass}>Мобильный телефон</label><input name="phone" value={formData.phone} onChange={handleChange} className={inputClass} placeholder="+1 234 567 8900" /></div>
                                            <div><label className={labelClass}>WhatsApp</label><input name="whatsapp" value={formData.whatsapp || ''} onChange={handleChange} className={inputClass} placeholder="+1 234 567 8900" /></div>
                                            <div><label className={labelClass}>Telegram</label><input name="telegram" value={formData.telegram || ''} onChange={handleChange} className={inputClass} placeholder="@username" /></div>
                                            <div><label className={labelClass}>Email (Рабочий)</label><input name="email" value={formData.email || ''} onChange={handleChange} className={inputClass} /></div>
                                            <div><label className={labelClass}>Email (Личный)</label><input name="email2" value={formData.email2 || ''} onChange={handleChange} className={inputClass} /></div>
                                            <div className="md:col-span-2"><label className={labelClass}>Фактический адрес</label><input name="actual_address" value={formData.actual_address || ''} onChange={handleChange} className={inputClass} /></div>
                                            <div className="md:col-span-2"><label className={labelClass}>Адрес регистрации</label><input name="registration_address" value={formData.registration_address || ''} onChange={handleChange} className={inputClass} /></div>
                                        </div>
                                    </section>

                                    <section>
                                        <div className="flex justify-between items-center mb-5">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><HeartPulse className="text-rose-500" size={20} /> Экстренные Контакты</h3>
                                            {!isReadOnly && <button type="button" onClick={addEmergencyContact} className="text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-bold hover:bg-rose-100 transition-colors">+ Добавить</button>}
                                        </div>
                                        <div className="space-y-4">
                                            {formData.emergency_contacts.map((contact, index) => (
                                                <div key={index} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
                                                    <div className="flex-1 w-full"><label className={labelClass}>Имя</label><input value={contact.name} onChange={(e) => handleEmergencyChange(index, 'name', e.target.value)} className={inputClass} /></div>
                                                    <div className="flex-1 w-full"><label className={labelClass}>Кем приходится</label><input value={contact.relation} onChange={(e) => handleEmergencyChange(index, 'relation', e.target.value)} className={inputClass} /></div>
                                                    <div className="flex-1 w-full"><label className={labelClass}>Телефон</label><input value={contact.phone} onChange={(e) => handleEmergencyChange(index, 'phone', e.target.value)} className={inputClass} /></div>
                                                    {!isReadOnly && <button type="button" onClick={() => removeEmergencyContact(index)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>}
                                                </div>
                                            ))}
                                            {formData.emergency_contacts.length === 0 && <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">Нет экстренных контактов</div>}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'docs' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><FileText className="text-blue-500" size={20} /> Паспортные Данные</h3>
                                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2"><label className={labelClass}>ИНН</label><input name="inn" value={formData.inn || ''} onChange={handleChange} className={inputClass} /></div>
                                            <div className="md:col-span-2 border-t border-slate-100 my-2"></div>
                                            <h4 className="md:col-span-2 text-sm font-bold text-slate-800 uppercase tracking-wider">Внутренний паспорт</h4>
                                            <div><label className={labelClass}>Серия и номер</label><input name="passport_number" value={formData.passport_number || ''} onChange={handleChange} className={inputClass} /></div>
                                            <div><label className={labelClass}>Дата выдачи</label><input type="date" name="passport_date" value={formData.passport_date || ''} onChange={handleChange} className={inputClass} /></div>
                                            <div className="md:col-span-2"><label className={labelClass}>Кем выдан</label><input name="passport_issuer" value={formData.passport_issuer || ''} onChange={handleChange} className={inputClass} /></div>

                                            <div className="md:col-span-2 border-t border-slate-100 my-2"></div>
                                            <h4 className="md:col-span-2 text-sm font-bold text-slate-800 uppercase tracking-wider">Заграничный паспорт</h4>
                                            <div><label className={labelClass}>Номер</label><input name="foreign_passport" value={formData.foreign_passport || ''} onChange={handleChange} className={inputClass} /></div>
                                            <div><label className={labelClass}>Срок действия</label><input type="date" name="foreign_passport_date" value={formData.foreign_passport_date || ''} onChange={handleChange} className={inputClass} /></div>
                                            <div className="md:col-span-2"><label className={labelClass}>Кем выдан / Орган</label><input name="foreign_passport_issuer" value={formData.foreign_passport_issuer || ''} onChange={handleChange} className={inputClass} /></div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'finance' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><Wallet className="text-indigo-500" size={20} /> Финансовые Реквизиты</h3>
                                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div><label className={labelClass}>Банк</label><div className="relative"><Landmark className="absolute left-3 top-3 text-slate-400" size={16} /><input name="bank_name" value={formData.bank_name || ''} onChange={handleChange} className={`${inputClass} pl-10`} placeholder="Kasikorn Bank" /></div></div>
                                                <div><label className={labelClass}>Номер счета / Карты</label><div className="relative"><CreditCard className="absolute left-3 top-3 text-slate-400" size={16} /><input name="bank_details" value={formData.bank_details || ''} onChange={handleChange} className={`${inputClass} pl-10`} /></div></div>
                                            </div>
                                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2 flex items-center gap-2 text-indigo-800 font-bold text-sm mb-2"><Globe size={16} /> Крипто-кошелек</div>
                                                <div><label className={labelClass}>Адрес кошелька</label><input name="crypto_wallet" value={formData.crypto_wallet || ''} onChange={handleChange} className={inputClass} placeholder="0x..." /></div>
                                                <div><label className={labelClass}>Сеть (Network)</label><input name="crypto_network" value={formData.crypto_network || ''} onChange={handleChange} className={inputClass} placeholder="TRC20, BEP20..." /></div>
                                                <div><label className={labelClass}>Валюта</label><input name="crypto_currency" value={formData.crypto_currency || ''} onChange={handleChange} className={inputClass} placeholder="USDT" /></div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'files' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                    <section>
                                        <div className="flex justify-between items-center mb-5">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><File className="text-slate-500" size={20} /> Файлы и Документы</h3>
                                            {!isReadOnly && <button type="button" onClick={() => docInputRef.current?.click()} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition-colors flex items-center gap-2"><Upload size={14} /> Загрузить</button>}
                                            <input type="file" ref={docInputRef} onChange={(e) => handleFileUpload(e)} className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
                                            <input type="file" ref={categoryFileInputRef} onChange={handleCategoryFileSelect} className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
                                        </div>

                                        {/* Чекбоксы для типов документов */}
                                        {!isReadOnly && (
                                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-6">
                                                <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Статус документов</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const existing = formData.attachments.find(f => f.document_category === 'contract_nda');
                                                            if (existing) {
                                                                setPreviewDocument(existing);
                                                            } else if (!isReadOnly) {
                                                                handleCategoryUpload('contract_nda');
                                                            }
                                                        }}
                                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all w-full text-left ${
                                                            formData.attachments.some(f => f.document_category === 'contract_nda')
                                                                ? 'border-green-200 bg-green-50/50 hover:bg-green-50'
                                                                : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer'
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                            formData.attachments.some(f => f.document_category === 'contract_nda')
                                                                ? 'bg-green-100 text-green-600'
                                                                : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                            {formData.attachments.some(f => f.document_category === 'contract_nda') ? (
                                                                <Check size={16} />
                                                            ) : (
                                                                <FileText size={16} />
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 flex-1">Договор/NDA</span>
                                                        {formData.attachments.some(f => f.document_category === 'contract_nda') && (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setPreviewDocument(formData.attachments.find(f => f.document_category === 'contract_nda')!);
                                                                    }}
                                                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                                                                    title="Просмотр"
                                                                >
                                                                    <FileText size={16} />
                                                                </button>
                                                                <a
                                                                    href={formData.attachments.find(f => f.document_category === 'contract_nda')?.public_url}
                                                                    download
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                                                                    title="Скачать"
                                                                >
                                                                    <DownloadCloud size={16} />
                                                                </a>
                                                            </div>
                                                        )}
                                                    </button>
                                                    {[
                                                        { category: 'passport_scan', label: 'Скан паспорта' },
                                                        { category: 'inn_snils', label: 'ИНН/СНИЛС' },
                                                        { category: 'zrs', label: 'ЗРС' },
                                                    ].map(({ category, label }) => (
                                                        <button
                                                            key={category}
                                                            type="button"
                                                            onClick={() => {
                                                                const existing = formData.attachments.find(f => f.document_category === category);
                                                                if (existing) {
                                                                    setPreviewDocument(existing);
                                                                } else if (!isReadOnly) {
                                                                    handleCategoryUpload(category as any);
                                                                }
                                                            }}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all w-full text-left ${
                                                                formData.attachments.some(f => f.document_category === category)
                                                                    ? 'border-green-200 bg-green-50/50 hover:bg-green-50'
                                                                    : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer'
                                                            }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                                formData.attachments.some(f => f.document_category === category)
                                                                    ? 'bg-green-100 text-green-600'
                                                                    : 'bg-slate-100 text-slate-400'
                                                            }`}>
                                                                {formData.attachments.some(f => f.document_category === category) ? (
                                                                    <Check size={16} />
                                                                ) : (
                                                                    <FileText size={16} />
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-700 flex-1">{label}</span>
                                                            {formData.attachments.some(f => f.document_category === category) && (
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setPreviewDocument(formData.attachments.find(f => f.document_category === category)!);
                                                                        }}
                                                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                                                                        title="Просмотр"
                                                                    >
                                                                        <FileText size={16} />
                                                                    </button>
                                                                    <a
                                                                        href={formData.attachments.find(f => f.document_category === category)?.public_url}
                                                                        download
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                                                                        title="Скачать"
                                                                    >
                                                                        <DownloadCloud size={16} />
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Список загруженных файлов с категориями */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {formData.attachments.map(file => {
                                                const categoryLabels: Record<string, string> = {
                                                    'contract_nda': 'Договор/NDA',
                                                    'passport_scan': 'Скан паспорта',
                                                    'inn_snils': 'ИНН/СНИЛС',
                                                    'zrs': 'ЗРС',
                                                    'other': 'Другое'
                                                };
                                                const categoryLabel = file.document_category ? categoryLabels[file.document_category] : 'Документ';
                                                
                                                return (
                                                    <div key={file.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 group hover:border-blue-300 transition-all">
                                                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold uppercase text-[10px]">{file.file_type.split('/')[1] || 'FILE'}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-semibold text-blue-600 mb-0.5">{categoryLabel}</div>
                                                            <div className="text-sm font-bold text-slate-800 truncate" title={file.file_name}>{file.file_name}</div>
                                                            <div className="text-[10px] text-slate-400">{format(new Date(file.uploaded_at), 'dd.MM.yyyy')} • {(file.file_size / 1024).toFixed(0)} KB</div>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <a href={file.public_url} target="_blank" rel="noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Скачать"><DownloadCloud size={16} /></a>
                                                            {!isReadOnly && <button type="button" onClick={() => removeAttachment(file.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Удалить"><Trash2 size={16} /></button>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {formData.attachments.length === 0 && <div className="col-span-full text-center p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400"><p className="font-medium">Нет загруженных файлов</p></div>}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {/* TAB: HAT FOLDER */}
                            {activeTab === 'development' && (
                                <DevelopmentPlanTab
                                    employee={formData}
                                    setEmployee={setFormData}
                                    isReadOnly={isReadOnly}
                                />
                            )}
                            {activeTab === 'hatfolder' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                                            <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                                            Шляпная папка сотрудника
                                        </h3>
                                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                            <div className="text-center py-12">
                                                <FolderOpen size={64} className="mx-auto mb-4 text-amber-500 opacity-50" />
                                                <h4 className="text-xl font-bold text-slate-800 mb-2">Шляпная папка поста</h4>
                                                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                                                    Шляпная папка содержит должностную инструкцию, описание обязанностей, контрольные листы и материалы для обучения сотрудника на данном посту.
                                                </p>
                                                {onOpenHatFolder && formData.id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onOpenHatFolder(formData);
                                                        }}
                                                        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-200 flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                                    >
                                                        <FolderOpen size={20} />
                                                        <span>Открыть Шляпную папку</span>
                                                    </button>
                                                )}
                                                {!onOpenHatFolder && (
                                                    <p className="text-sm text-slate-500">Функционал недоступен</p>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {/* TAB: STATS (VISIBLE TO ALL, EDITABLE BY ADMIN) */}
                            {activeTab === 'trainee' && isTrainee && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                    <TraineeCheckpoints
                                        employee={formData}
                                        isAdmin={!isReadOnly}
                                        onUpdate={() => {
                                            checkTraineeStatus(formData);
                                            if (initialData) {
                                                fetchPersonalStats(initialData.id);
                                            }
                                        }}
                                    />
                                </div>
                            )}
                            {activeTab === 'stats' && (
                                isNewEmployee ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 animate-in fade-in">
                                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4"><Save size={32} /></div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">Сохраните сотрудника</h3>
                                        <p className="text-slate-500 max-w-sm mx-auto mb-6 text-sm">Для управления статистикой и KPI необходимо сначала создать карточку сотрудника в базе данных.</p>
                                        <button type="button" onClick={handleSubmit} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"><Save size={18} /> Сохранить и продолжить</button>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 relative">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div> Личная Статистика и KPI</h3>
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto w-full sm:w-auto">
                                                    {PERIODS.map(p => (
                                                        <button key={p.id} type="button" onClick={() => setStatsPeriod(p.id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${statsPeriod === p.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{p.label}</button>
                                                    ))}
                                                </div>
                                                {!isReadOnly && (
                                                    <button type="button" onClick={() => { setShowStatManager(!showStatManager); }} className={`p-2 rounded-xl transition-all border flex-shrink-0 ${showStatManager ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'}`} title="Управление статистиками"><Plus size={20} /></button>
                                                )}
                                            </div>
                                        </div>

                                        {/* --- STAT MANAGER (Assign/Create) --- */}
                                        {showStatManager && !isReadOnly && (
                                            <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-lg mb-6 animate-in slide-in-from-top-4 relative z-10">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Добавление статистики</h4>
                                                    <button type="button" onClick={() => setShowStatManager(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {/* Column 1: Templates */}
                                                    <div className="border-r border-slate-100 pr-8">
                                                        <h5 className="text-xs font-bold text-slate-500 mb-3 uppercase">Быстрый выбор из шаблонов</h5>
                                                        <div className="space-y-2">
                                                            {(() => {
                                                                const subDeptId = formData.subdepartment?.[0];
                                                                const deptId = formData.department?.[0];

                                                                // Priority: Specific Stats from Handbook -> Specific Role Templates -> Generic Fallbacks
                                                                let templates: any[] = [];

                                                                // 1. Try to find actual statistics defined in handbook for this sub-department
                                                                if (subDeptId) {
                                                                    const handbookStats = HANDBOOK_STATISTICS.filter(s => s.owner_id === subDeptId);
                                                                    if (handbookStats.length > 0) {
                                                                        templates = handbookStats.map(s => ({ ...s }));
                                                                    }
                                                                }

                                                                // 2. Fallback to ROLE_STAT_TEMPLATES if handbook is empty for this role
                                                                if (templates.length === 0 && subDeptId && ROLE_STAT_TEMPLATES[subDeptId]) {
                                                                    templates = ROLE_STAT_TEMPLATES[subDeptId];
                                                                }

                                                                // 3. Last resort fallback
                                                                if (templates.length === 0) {
                                                                    templates = [{ title: 'Личная эффективность' }, { title: 'Завершенные задачи' }];
                                                                }

                                                                return templates.map((tmpl, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => handleCreatePersonalStat(tmpl)}
                                                                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-between group"
                                                                    >
                                                                        <div className="flex-1 min-w-0 pr-2">
                                                                            <div className="text-sm font-bold text-slate-700 group-hover:text-blue-700 truncate">{tmpl.title}</div>
                                                                            <div className="text-[10px] text-slate-400 truncate">{tmpl.description || 'Стандартная статистика'}</div>
                                                                        </div>
                                                                        <Plus size={16} className="text-slate-300 group-hover:text-blue-500 flex-shrink-0" />
                                                                    </button>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </div>

                                                    {/* Column 2: Custom */}
                                                    <div>
                                                        <h5 className="text-xs font-bold text-slate-500 mb-3 uppercase">Создать новую</h5>
                                                        <div className="space-y-3">
                                                            <input
                                                                value={newStatData.title}
                                                                onChange={e => setNewStatData({ ...newStatData, title: e.target.value })}
                                                                placeholder="Название статистики"
                                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                                                            />
                                                            <textarea
                                                                value={newStatData.description}
                                                                onChange={e => setNewStatData({ ...newStatData, description: e.target.value })}
                                                                placeholder="Описание и метод подсчета..."
                                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[80px] focus:ring-2 focus:ring-blue-100 outline-none"
                                                            />
                                                            <div className="flex gap-4">
                                                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                                                                    <input type="checkbox" checked={newStatData.inverted} onChange={e => setNewStatData({ ...newStatData, inverted: e.target.checked })} className="rounded text-blue-600" /> Обратная
                                                                </label>
                                                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                                                                    <input type="checkbox" checked={newStatData.is_double} onChange={e => setNewStatData({ ...newStatData, is_double: e.target.checked })} className="rounded text-blue-600" /> Двойная
                                                                </label>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCreatePersonalStat()}
                                                                disabled={!newStatData.title}
                                                                className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all"
                                                            >
                                                                Создать
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* --- EDIT STAT MODAL (INLINE) --- */}
                                        {editingStatId && !isReadOnly && (
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-blue-200 mb-4 animate-in fade-in relative z-20">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="text-xs font-bold text-blue-800 uppercase">Редактирование статистики</h4>
                                                    <button type="button" onClick={() => setEditingStatId(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <input value={newStatData.title} onChange={e => setNewStatData({ ...newStatData, title: e.target.value })} className="p-2 border rounded-lg text-sm font-bold" />
                                                    <input value={newStatData.calculation_method} onChange={e => setNewStatData({ ...newStatData, calculation_method: e.target.value })} className="p-2 border rounded-lg text-sm" placeholder="Ед. измерения" />
                                                    <textarea value={newStatData.description} onChange={e => setNewStatData({ ...newStatData, description: e.target.value })} className="md:col-span-2 p-2 border rounded-lg text-sm" placeholder="Описание" />
                                                    <div className="flex gap-4 md:col-span-2">
                                                        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={newStatData.inverted} onChange={e => setNewStatData({ ...newStatData, inverted: e.target.checked })} /> Обратная</label>
                                                        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={newStatData.is_double} onChange={e => setNewStatData({ ...newStatData, is_double: e.target.checked })} /> Двойная</label>
                                                    </div>
                                                    <button type="button" onClick={handleUpdateStat} className="md:col-span-2 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs">Сохранить изменения</button>
                                                </div>
                                            </div>
                                        )}

                                        {statsDefinitions.length === 0 && !isDemoStats && (
                                            <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                                                <TrendingUp className="mx-auto text-slate-300 mb-2" size={32} />
                                                <p className="text-slate-500 font-medium text-sm">Нет назначенных статистик</p>
                                                {!isReadOnly && <button type="button" onClick={() => setShowStatManager(true)} className="mt-2 text-blue-600 font-bold text-xs hover:underline">Добавить статистику</button>}
                                            </div>
                                        )}

                                        {statsDefinitions.map(stat => {
                                            if (!stat) return null;
                                            const vals = getFilteredValuesForStat(stat.id);
                                            const { direction, percent, current, isGood } = analyzeTrend(vals, stat.inverted);

                                            const trendColorHex = isGood ? "#10b981" : "#f43f5e";
                                            return (
                                                <div key={stat.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group">
                                                    <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-start bg-white">
                                                        <div className="flex-1 pr-4">
                                                            <div className="flex items-start gap-2 mb-1">
                                                                <h4 className="font-bold text-lg text-slate-800 leading-tight">{stat.title}</h4>
                                                                <button type="button" onClick={() => setInfoStatId(infoStatId === stat.id ? null : stat.id)} className="text-slate-300 hover:text-blue-600 transition-colors mt-0.5"><Info size={16} /></button>
                                                            </div>
                                                            {stat.inverted && (<div className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1.5"><ArrowDownUp size={10} /> ОБРАТНАЯ</div>)}
                                                            <p className="text-xs text-slate-500 font-medium line-clamp-2">{stat.description || 'Личный показатель эффективности'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{current.toLocaleString()}</div>
                                                            {vals.length > 1 && (
                                                                <div className={`text-xs font-bold flex items-center justify-end gap-1 mt-1 px-2 py-0.5 rounded-lg ${isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                    {direction === 'up' ? <TrendingUp size={12} /> : (direction === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />)}
                                                                    {Math.abs(percent).toFixed(1)}%
                                                                </div>
                                                            )}
                                                        </div>

                                                        {!isReadOnly && (
                                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHistoryStatId(stat.id); }}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                                    title="История значений"
                                                                >
                                                                    <List size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEditing(stat); }}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                                    title="Редактировать"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteStatRequest(stat.id); }}
                                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                                    title="Удалить статистику"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="px-4 md:px-6 pb-2 pt-4 h-56 md:h-64 bg-white relative z-0">
                                                        <StatsChart key={statsPeriod} values={vals} inverted={stat.inverted} color={trendColorHex} isDouble={stat.is_double} />
                                                    </div>

                                                    {/* Footer - Only if !isReadOnly */}
                                                    {!isReadOnly && (
                                                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-3 relative z-10">
                                                            <div className="flex justify-between items-center">
                                                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ввод данных</div>
                                                                <div className="text-[10px] text-slate-400 font-medium">Посл: {vals.length > 0 ? format(new Date(vals[vals.length - 1].date), 'dd.MM') : '-'}</div>
                                                            </div>
                                                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                                                <div className="flex gap-2 w-full sm:w-auto">
                                                                    <div className="relative flex-1 sm:flex-none">
                                                                        <label className="block text-[8px] font-bold text-slate-400 mb-1 uppercase">Дата (Чт)</label>
                                                                        <input type="date" value={newStatDate} onChange={e => setNewStatDate(e.target.value)} className="h-9 px-2 border border-slate-200 rounded-lg text-xs font-medium bg-white text-slate-700 focus:border-blue-300 outline-none w-full sm:w-28" />
                                                                    </div>
                                                                    <div className="flex-1 sm:min-w-[80px]">
                                                                        <label className="block text-[8px] font-bold text-slate-400 mb-1 uppercase">Значение</label>
                                                                        <input type="number" placeholder="0" value={newValueInput[stat.id] || ''} onChange={e => setNewValueInput({ ...newValueInput, [stat.id]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddValue(stat.id, stat.is_double || false); } }} className="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-300 placeholder:font-normal" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2 flex-1">
                                                                    {stat.is_double && (<div className="flex-1 sm:min-w-[80px]"><label className="block text-[8px] font-bold text-slate-400 mb-1 uppercase">Вал 2</label><input type="number" placeholder="0" value={newValueInput2[stat.id] || ''} onChange={e => setNewValueInput2({ ...newValueInput2, [stat.id]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddValue(stat.id, stat.is_double || false); } }} className="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-300 placeholder:font-normal" /></div>)}
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddValue(stat.id, stat.is_double || false); }}
                                                                        className="h-9 px-4 bg-white border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm flex-1 sm:flex-none mt-auto"
                                                                    >
                                                                        <Plus size={16} /> <span className="sm:inline">Добавить</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </form>
                    </div>
                </div>
            </div>

            {/* HISTORY MODAL (EMPLOYEE SPECIFIC) */}
            {historyStatId && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{statsDefinitions.find(s => s.id === historyStatId)?.title || 'История значений'}</h3>
                            <button onClick={() => setHistoryStatId(null)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            {getFilteredValuesForStat(historyStatId).length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">Нет записей</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-400 font-bold text-xs uppercase sticky top-0">
                                        <tr><th className="px-4 py-3 text-left">Дата</th><th className="px-4 py-3 text-right">Значение</th><th className="px-4 py-3 text-right"></th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {getFilteredValuesForStat(historyStatId).slice().reverse().map(val => (
                                            <tr key={val.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-slate-600 font-medium">{format(new Date(val.date), 'dd.MM.yy')}</td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-800">{val.value.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => handleDeleteValue(val.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно выбора типа документа */}
            {showDocumentTypeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 animate-in slide-in-from-bottom-4">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800">Выберите тип документа</h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDocumentTypeModal(false);
                                        setPendingFile(null);
                                        setSelectedDocumentType(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-2 mb-6">
                                {[
                                    { value: 'contract_nda', label: 'Договор/NDA' },
                                    { value: 'passport_scan', label: 'Скан паспорта' },
                                    { value: 'inn_snils', label: 'ИНН/СНИЛС' },
                                    { value: 'zrs', label: 'ЗРС' },
                                    { value: 'other', label: 'Другое' },
                                ].map((type) => (
                                    <label
                                        key={type.value}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all"
                                    >
                                        <input
                                            type="radio"
                                            name="document_type"
                                            value={type.value}
                                            checked={selectedDocumentType === type.value}
                                            onChange={() => setSelectedDocumentType(type.value as any)}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <span className="text-sm font-medium text-slate-700">{type.label}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDocumentTypeModal(false);
                                        setPendingFile(null);
                                        setSelectedDocumentType(null);
                                    }}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDocumentTypeConfirm}
                                    disabled={!selectedDocumentType || isUploading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Загрузка...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} />
                                            Загрузить
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно предпросмотра документа */}
            {previewDocument && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200/50 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                    <FileText className="text-white" size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">{previewDocument.file_name}</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {format(new Date(previewDocument.uploaded_at), 'dd.MM.yyyy')} • {(previewDocument.file_size / 1024).toFixed(0)} KB
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewDocument.public_url}
                                    download
                                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    title="Скачать"
                                >
                                    <DownloadCloud size={18} />
                                </a>
                                <button
                                    onClick={() => setPreviewDocument(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                            {previewDocument.file_type.startsWith('image/') ? (
                                <div className="flex items-center justify-center min-h-[400px]">
                                    <img
                                        src={previewDocument.public_url}
                                        alt={previewDocument.file_name}
                                        className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                                        onError={(e) => {
                                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f1f5f9" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="Arial" font-size="16"%3EОшибка загрузки изображения%3C/text%3E%3C/svg%3E';
                                        }}
                                    />
                                </div>
                            ) : previewDocument.file_type === 'application/pdf' ? (
                                <div className="w-full h-[70vh]">
                                    <iframe
                                        src={previewDocument.public_url}
                                        className="w-full h-full rounded-lg border border-slate-200 shadow-lg"
                                        title={previewDocument.file_name}
                                    />
                                </div>
                            ) : previewDocument.file_type.includes('word') || previewDocument.file_type.includes('document') ? (
                                <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                                    <FileText size={64} className="text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-600 font-medium mb-4">Предпросмотр DOCX недоступен</p>
                                    <a
                                        href={previewDocument.public_url}
                                        download
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <DownloadCloud size={18} />
                                        Скачать документ
                                    </a>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                                    <FileText size={64} className="text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-600 font-medium mb-4">Предпросмотр недоступен</p>
                                    <a
                                        href={previewDocument.public_url}
                                        download
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <DownloadCloud size={18} />
                                        Скачать файл
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} isDanger={true} confirmLabel="Удалить" />
        </div>
    );
};

// Компонент для управления картой развития сотрудника
const DevelopmentPlanTab: React.FC<{
    employee: EmployeeType;
    setEmployee: React.Dispatch<React.SetStateAction<EmployeeType>>;
    isReadOnly?: boolean;
}> = ({ employee, setEmployee, isReadOnly }) => {
    const toast = useToast();
    const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; title: string; description: string }>>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [loadingCourses, setLoadingCourses] = useState(false);

    // Загружаем доступные курсы
    useEffect(() => {
        const loadCourses = () => {
            setLoadingCourses(true);
            try {
                const savedCourses = localStorage.getItem('courses');
                if (savedCourses) {
                    const parsed = JSON.parse(savedCourses);
                    setAvailableCourses(parsed.map((c: any) => ({ id: c.id, title: c.title, description: c.description || '' })));
                }
            } catch (err) {
                console.error('Ошибка загрузки курсов:', err);
            } finally {
                setLoadingCourses(false);
            }
        };
        loadCourses();
    }, []);

    const developmentPlan = employee.development_plan || { courses: [] };
    const courses = developmentPlan.courses || [];

    const addCourse = () => {
        if (!selectedCourseId) {
            toast.error('Выберите курс');
            return;
        }

        const course = availableCourses.find(c => c.id === selectedCourseId);
        if (!course) {
            toast.error('Курс не найден');
            return;
        }

        // Проверяем, не добавлен ли уже этот курс
        if (courses.some(c => c.courseId === selectedCourseId)) {
            toast.error('Этот курс уже добавлен в карту развития');
            return;
        }

        const newCourse: DevelopmentCourse = {
            courseId: selectedCourseId,
            order: courses.length + 1,
            assignedAt: new Date().toISOString(),
        };

        setEmployee(prev => ({
            ...prev,
            development_plan: {
                courses: [...courses, newCourse]
            }
        }));

        setSelectedCourseId('');
        toast.success('Курс добавлен в карту развития');
    };

    const removeCourse = (courseId: string) => {
        const updatedCourses = courses
            .filter(c => c.courseId !== courseId)
            .map((c, index) => ({ ...c, order: index + 1 }));
        
        setEmployee(prev => ({
            ...prev,
            development_plan: {
                courses: updatedCourses
            }
        }));
        toast.success('Курс удален из карты развития');
    };

    const moveCourse = (courseId: string, direction: 'up' | 'down') => {
        const index = courses.findIndex(c => c.courseId === courseId);
        if (index === -1) return;

        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === courses.length - 1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const updatedCourses = [...courses];
        [updatedCourses[index], updatedCourses[newIndex]] = [updatedCourses[newIndex], updatedCourses[index]];
        
        // Обновляем порядок
        updatedCourses.forEach((c, i) => {
            c.order = i + 1;
        });

        setEmployee(prev => ({
            ...prev,
            development_plan: {
                courses: updatedCourses
            }
        }));
        toast.success('Порядок курса изменен');
    };

    const getCourseInfo = (courseId: string) => {
        return availableCourses.find(c => c.id === courseId);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <section>
                <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <GraduationCap className="text-purple-500" size={20} /> Карта развития сотрудника
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                    Назначьте курсы сотруднику в порядке их прохождения. Следующий курс откроется только после аттестации предыдущего.
                </p>

                {/* Добавление нового курса */}
                {!isReadOnly && (
                    <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700 mb-3">Добавить курс</h4>
                        <div className="flex gap-2">
                            <select
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                <option value="">Выберите курс...</option>
                                {availableCourses
                                    .filter(c => !courses.some(dc => dc.courseId === c.id))
                                    .map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.title}
                                        </option>
                                    ))}
                            </select>
                            <button
                                onClick={addCourse}
                                disabled={!selectedCourseId || loadingCourses}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Plus size={18} /> Добавить
                            </button>
                        </div>
                    </div>
                )}

                {/* Список курсов в карте развития */}
                <div className="space-y-3">
                    {courses.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                            <BookOpen className="mx-auto text-slate-300 mb-3" size={48} />
                            <p className="text-slate-500 font-semibold mb-1">Курсы не назначены</p>
                            <p className="text-sm text-slate-400">
                                {isReadOnly 
                                    ? 'Курсы будут отображаться здесь после назначения' 
                                    : 'Добавьте первый курс выше'}
                            </p>
                        </div>
                    ) : (
                        courses
                            .sort((a, b) => a.order - b.order)
                            .map((dc, index) => {
                                const courseInfo = getCourseInfo(dc.courseId);
                                const isLocked = index > 0 && !courses[index - 1]?.isCertified;
                                
                                return (
                                    <div
                                        key={dc.courseId}
                                        className={`bg-white rounded-xl border-2 p-4 ${
                                            isLocked 
                                                ? 'border-slate-300 opacity-60' 
                                                : 'border-slate-200 hover:border-blue-300'
                                        } transition-all`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                                                    isLocked 
                                                        ? 'bg-slate-300 text-slate-600' 
                                                        : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                    {dc.order}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-slate-800">
                                                            {courseInfo?.title || `Курс ${dc.courseId}`}
                                                        </h4>
                                                        {isLocked && (
                                                            <LockIcon size={16} className="text-slate-400" />
                                                        )}
                                                        {dc.isCertified && (
                                                            <CheckCircle2 size={18} className="text-green-600" />
                                                        )}
                                                    </div>
                                                    {courseInfo?.description && (
                                                        <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                                                            {courseInfo.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                                        {dc.progress !== undefined && (
                                                            <span>Прогресс: {dc.progress}%</span>
                                                        )}
                                                        {dc.assignedAt && (
                                                            <span>Назначен: {new Date(dc.assignedAt).toLocaleDateString('ru-RU')}</span>
                                                        )}
                                                        {dc.isCertified && dc.certifiedAt && (
                                                            <span className="text-green-600 font-semibold">
                                                                Аттестован: {new Date(dc.certifiedAt).toLocaleDateString('ru-RU')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isLocked && (
                                                        <p className="text-xs text-slate-500 mt-2 italic">
                                                            Откроется после аттестации предыдущего курса
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {!isReadOnly && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => moveCourse(dc.courseId, 'up')}
                                                        disabled={index === 0}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                        title="Переместить вверх"
                                                    >
                                                        <ArrowUp size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => moveCourse(dc.courseId, 'down')}
                                                        disabled={index === courses.length - 1}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                        title="Переместить вниз"
                                                    >
                                                        <ArrowDown size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => removeCourse(dc.courseId)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Удалить курс"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>
            </section>
        </div>
    );
};

export default EmployeeModal;
