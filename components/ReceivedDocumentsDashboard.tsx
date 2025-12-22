/**
 * Дашборд для управления полученными документами
 * HR может загружать документы (ЗРС, договоры, приказы и др.) для хранения в базе данных
 */

import React, { useState, useMemo } from 'react';
import { useReceivedDocuments } from '../hooks/useReceivedDocuments';
import { ReceivedDocument, ReceivedDocumentType, ReceivedDocumentStatus, Employee } from '../types';
import {
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  Edit2,
  X,
  Plus,
  CheckCircle2,
  Clock,
  Archive,
  Search,
  Filter,
  Tag,
  User,
  Calendar,
  Loader2,
  FileCheck,
  FileSignature,
  FileX,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from './Toast';
import ConfirmationModal from './ConfirmationModal';
import { logError, debugLog } from '../utils/logger';
import { formatAbbreviatedName } from '../utils/nameFormatter';

interface ReceivedDocumentsDashboardProps {
  employees: Employee[];
  isAdmin: boolean;
}

export const ReceivedDocumentsDashboard: React.FC<ReceivedDocumentsDashboardProps> = ({
  employees,
  isAdmin,
}) => {
  const {
    documents,
    isLoading,
    error,
    fetchDocuments,
    uploadDocument,
    updateDocument,
    deleteDocument,
    addSignature,
    addApproval,
  } = useReceivedDocuments();

  const { showToast } = useToast();

  // UI State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ReceivedDocument | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ReceivedDocumentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ReceivedDocumentStatus | 'all'>('all');

  // Форма загрузки
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    title: '',
    document_type: 'other' as ReceivedDocumentType,
    employee_id: '',
    sender_name: '',
    sender_email: '',
    received_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    tags: [] as string[],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Получаем текущего пользователя (HR)
  const currentUser = useMemo(() => {
    // В реальном приложении получаем из сессии
    return employees.find(e => e.email === 'hrtisland@gmail.com') || employees[0];
  }, [employees]);

  // Фильтрация документов
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = searchTerm === '' || 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterType === 'all' || doc.document_type === filterType;
      const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [documents, searchTerm, filterType, filterStatus]);

  // Статистика
  const stats = useMemo(() => {
    return {
      total: documents.length,
      received: documents.filter(d => d.status === 'received').length,
      reviewed: documents.filter(d => d.status === 'reviewed').length,
      archived: documents.filter(d => d.status === 'archived').length,
    };
  }, [documents]);

  // Обработчики
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Автоматически заполняем название из имени файла, если оно пустое
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setUploadForm(prev => ({
        ...prev,
        file,
        title: prev.title || fileNameWithoutExt, // Заполняем только если title пустое
      }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !uploadForm.tags.includes(tagInput.trim())) {
      setUploadForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setUploadForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleUpload = async () => {
    if (!uploadForm.file) {
      showToast('error', 'Выберите файл для загрузки');
      return;
    }

    if (!uploadForm.title.trim()) {
      showToast('error', 'Введите название документа');
      return;
    }

    if (!currentUser?.id) {
      showToast('error', 'Не удалось определить текущего пользователя');
      return;
    }

    setIsUploading(true);

    try {
      await uploadDocument(uploadForm.file, {
        title: uploadForm.title.trim(),
        document_type: uploadForm.document_type,
        employee_id: uploadForm.employee_id || undefined,
        sender_name: uploadForm.sender_name || undefined,
        sender_email: uploadForm.sender_email || undefined,
        received_date: uploadForm.received_date,
        description: uploadForm.description || undefined,
        tags: uploadForm.tags,
      }, currentUser.id);

      showToast('success', 'Документ успешно загружен');
      setIsUploadModalOpen(false);
      setUploadForm({
        file: null,
        title: '',
        document_type: 'other',
        employee_id: '',
        sender_name: '',
        sender_email: '',
        received_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        tags: [],
      });
    } catch (err: any) {
      logError('Ошибка загрузки документа:', err);
      showToast('error', err.message || 'Ошибка загрузки документа');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteDocument(deleteConfirm.id);
      showToast('success', 'Документ удален');
      setDeleteConfirm(null);
    } catch (err: any) {
      logError('Ошибка удаления документа:', err);
      showToast('error', err.message || 'Ошибка удаления документа');
    }
  };

  const getDocumentTypeLabel = (type: ReceivedDocumentType): string => {
    const labels: Record<ReceivedDocumentType, string> = {
      zrs: 'ЗРС',
      contract: 'Договор',
      order: 'Приказ',
      certificate: 'Справка',
      other: 'Другое',
    };
    return labels[type];
  };

  const getStatusLabel = (status: ReceivedDocumentStatus): string => {
    const labels: Record<ReceivedDocumentStatus, string> = {
      received: 'Получен',
      reviewed: 'Проверен',
      archived: 'В архиве',
      rejected: 'Отклонен',
    };
    return labels[status];
  };

  const getStatusColor = (status: ReceivedDocumentStatus): string => {
    const colors: Record<ReceivedDocumentStatus, string> = {
      received: 'bg-blue-100 text-blue-700',
      reviewed: 'bg-emerald-100 text-emerald-700',
      archived: 'bg-slate-100 text-slate-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status];
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 font-bold uppercase text-xs mb-2">Всего</p>
              <h3 className="text-4xl font-black">{stats.total}</h3>
            </div>
            <FileText size={32} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 font-bold uppercase text-xs mb-2">Получено</p>
              <h3 className="text-4xl font-black">{stats.received}</h3>
            </div>
            <Clock size={32} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 font-bold uppercase text-xs mb-2">Проверено</p>
              <h3 className="text-4xl font-black">{stats.reviewed}</h3>
            </div>
            <CheckCircle2 size={32} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-100 font-bold uppercase text-xs mb-2">В архиве</p>
              <h3 className="text-4xl font-black">{stats.archived}</h3>
            </div>
            <Archive size={32} className="opacity-80" />
          </div>
        </div>
      </div>

      {/* Действия и фильтры */}
      <div className="bg-gradient-to-r from-white to-slate-50 rounded-2xl border border-slate-200/60 shadow-sm p-5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Upload className="text-blue-600" size={18} />
          </div>
          <span className="text-sm md:text-base font-bold text-slate-700">Полученные документы</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={18} />
            <span>Загрузить документ</span>
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по названию, отправителю, описанию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm flex-1 min-w-[200px]"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ReceivedDocumentType | 'all')}
          className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm"
        >
          <option value="all">Все типы</option>
          <option value="zrs">ЗРС</option>
          <option value="contract">Договор</option>
          <option value="order">Приказ</option>
          <option value="certificate">Справка</option>
          <option value="other">Другое</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ReceivedDocumentStatus | 'all')}
          className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm"
        >
          <option value="all">Все статусы</option>
          <option value="received">Получен</option>
          <option value="reviewed">Проверен</option>
          <option value="archived">В архиве</option>
          <option value="rejected">Отклонен</option>
        </select>
      </div>

      {/* Список документов */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-bold">Ошибка загрузки документов</p>
          <p className="text-red-500 text-sm mt-2">{error}</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-gradient-to-br from-white to-slate-50/20 rounded-xl border-2 border-slate-200 p-8 text-center">
          <div className="p-3 bg-slate-100 rounded-full w-fit mx-auto mb-3">
            <FileText className="text-slate-700" size={32} />
          </div>
          <p className="text-slate-700 font-black text-base">Нет документов</p>
          <p className="text-sm text-slate-500 mt-1">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
              ? 'Попробуйте изменить фильтры'
              : 'Загрузите первый документ, используя кнопку "Загрузить документ"'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(doc => (
            <div
              key={doc.id}
              className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border-2 border-slate-200 p-5 hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedDocument(doc)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 text-base md:text-lg mb-1.5 truncate">
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
                      {getDocumentTypeLabel(doc.document_type)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-bold rounded-lg ${getStatusColor(doc.status)}`}>
                      {getStatusLabel(doc.status)}
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                  <FileText className="text-slate-600" size={18} />
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-500 mb-3">
                {doc.sender_name && (
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span className="truncate">От: {doc.sender_name}</span>
                  </div>
                )}
                {doc.employee && (
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span className="truncate">
                      Сотрудник: {formatAbbreviatedName(doc.employee.full_name)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Получен: {format(new Date(doc.received_date), 'dd.MM.yyyy', { locale: ru })}</span>
                </div>
                {doc.signatures.length > 0 && (
                  <div className="flex items-center gap-1">
                    <FileSignature size={12} />
                    <span>Подписей: {doc.signatures.length}</span>
                  </div>
                )}
                {doc.approvals.length > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Одобрений: {doc.approvals.length}</span>
                  </div>
                )}
              </div>

              {doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {doc.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {doc.tags.length > 3 && (
                    <span className="px-2 py-0.5 text-slate-400 text-[10px] font-medium">
                      +{doc.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400">
                  {format(new Date(doc.created_at), 'd MMM yyyy', { locale: ru })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (doc.file_url) {
                        window.open(doc.file_url, '_blank');
                      }
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Скачать"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ id: doc.id, title: doc.title });
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно загрузки */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200/50 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Upload className="text-white" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Загрузить документ</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Добавьте полученный документ в базу данных</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Файл */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Файл документа *
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-slate-300"
                />
                {uploadForm.file && (
                  <p className="text-xs text-slate-500 mt-1">
                    Выбран: {uploadForm.file.name} ({(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Название */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Название документа *
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Например: Трудовой договор Иванов И.И."
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-slate-300"
                />
              </div>

              {/* Тип документа */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Тип документа *
                  </label>
                  <select
                    value={uploadForm.document_type}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, document_type: e.target.value as ReceivedDocumentType }))}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-slate-300"
                  >
                    <option value="zrs">ЗРС</option>
                    <option value="contract">Договор</option>
                    <option value="order">Приказ</option>
                    <option value="certificate">Справка</option>
                    <option value="other">Другое</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Дата получения *
                  </label>
                  <input
                    type="date"
                    value={uploadForm.received_date}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, received_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-slate-300"
                  />
                </div>
              </div>

              {/* Отправитель */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    От кого (ФИО и должность)
                  </label>
                  <input
                    type="text"
                    value={uploadForm.sender_name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, sender_name: e.target.value }))}
                    placeholder="Например: Иванов Иван Иванович, Менеджер"
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Email отправителя
                  </label>
                  <input
                    type="email"
                    value={uploadForm.sender_email}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, sender_email: e.target.value }))}
                    placeholder="sender@example.com"
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-slate-300"
                  />
                </div>
              </div>

              {/* Связанный сотрудник */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Связанный сотрудник (опционально)
                </label>
                <select
                  value={uploadForm.employee_id}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, employee_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-slate-300"
                >
                  <option value="">Не выбран</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.position}
                    </option>
                  ))}
                </select>
              </div>

              {/* Описание */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Описание
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Дополнительная информация о документе"
                  rows={3}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none transition-all bg-white hover:border-slate-300"
                />
              </div>

              {/* Теги */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Теги
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Введите тег и нажмите Enter"
                    className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-slate-300"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2.5 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {uploadForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadForm.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg flex items-center gap-2"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-blue-700 hover:text-blue-900"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-end gap-3">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-6 py-2.5 text-slate-700 font-bold bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-sm hover:shadow-md"
                disabled={isUploading}
              >
                Отмена
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || !uploadForm.file || !uploadForm.title.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Загрузка...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Загрузить</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра документа */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200/50 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <FileText className="text-white" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">{selectedDocument.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {getDocumentTypeLabel(selectedDocument.document_type)} • {getStatusLabel(selectedDocument.status)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Основная информация */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Дата получения</p>
                  <p className="text-sm font-medium text-slate-800">
                    {format(new Date(selectedDocument.received_date), 'dd.MM.yyyy', { locale: ru })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Размер файла</p>
                  <p className="text-sm font-medium text-slate-800">
                    {selectedDocument.file_size ? `${(selectedDocument.file_size / 1024 / 1024).toFixed(2)} MB` : 'Неизвестно'}
                  </p>
                </div>
                {selectedDocument.sender_name && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">От кого</p>
                    <p className="text-sm font-medium text-slate-800">{selectedDocument.sender_name}</p>
                  </div>
                )}
                {selectedDocument.employee && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Связанный сотрудник</p>
                    <p className="text-sm font-medium text-slate-800">
                      {formatAbbreviatedName(selectedDocument.employee.full_name)}
                    </p>
                  </div>
                )}
              </div>

              {/* Описание */}
              {selectedDocument.description && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Описание</p>
                  <p className="text-sm text-slate-700">{selectedDocument.description}</p>
                </div>
              )}

              {/* Подписи */}
              {selectedDocument.signatures.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Подписи ({selectedDocument.signatures.length})</p>
                  <div className="space-y-2">
                    {selectedDocument.signatures.map((sig, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-sm font-medium text-slate-800">{sig.signer_name}</p>
                        <p className="text-xs text-slate-500">{sig.signer_position}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {format(new Date(sig.signed_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Одобрения */}
              {selectedDocument.approvals.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Одобрения ({selectedDocument.approvals.length})</p>
                  <div className="space-y-2">
                    {selectedDocument.approvals.map((appr, idx) => (
                      <div key={idx} className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                        <p className="text-sm font-medium text-slate-800">{appr.approver_name}</p>
                        <p className="text-xs text-slate-500">{appr.approver_position}</p>
                        {appr.comment && (
                          <p className="text-xs text-slate-600 mt-1">{appr.comment}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {format(new Date(appr.approved_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Теги */}
              {selectedDocument.tags.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Теги</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Файл */}
              {selectedDocument.file_url && (
                <div className="pt-4 border-t border-slate-200">
                  <a
                    href={selectedDocument.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Download size={18} />
                    <span>Скачать документ</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      <ConfirmationModal
        isOpen={deleteConfirm !== null}
        title="Удалить документ?"
        message={`Вы уверены, что хотите удалить документ "${deleteConfirm?.title}"? Это действие нельзя отменить.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isDanger={true}
        confirmLabel="Удалить"
      />
    </div>
  );
};

