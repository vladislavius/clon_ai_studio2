import React, { useState, useEffect } from 'react';
import { useDocuments } from '../hooks/useDocuments';
import { Document, DocumentTemplate, Employee } from '../types';
import { DocumentTemplatesEditor } from './DocumentTemplatesEditor';
import { ZRSForm, ZRSData } from './ZRSForm';
import { ZRSList } from './ZRSList';
import { useZRS } from '../hooks/useZRS';
import {
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  Archive,
  Edit2,
  Trash2,
  X,
  Download,
  Eye,
  Loader2,
  PenTool,
  FileCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from './Toast';
import { logError, debugLog } from '../utils/logger';
import { formatAbbreviatedName } from '../utils/nameFormatter';

interface DocumentsDashboardProps {
  employees: Employee[];
  isAdmin: boolean;
}

export const DocumentsDashboard: React.FC<DocumentsDashboardProps> = ({ employees, isAdmin }) => {
  const {
    documents,
    templates,
    isLoading,
    error,
    createDocumentFromTemplate,
    saveDocument,
    saveTemplate,
    deleteDocument,
    deleteTemplate,
  } = useDocuments();

  const {
    zrsDocuments,
    isLoading: isZRSLoading,
    createZRS,
    fetchZRS,
  } = useZRS();

  const [editingTemplate, setEditingTemplate] = useState<Partial<DocumentTemplate> | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'document' | 'template'; id: string } | null>(null);
  const [isZRSFormOpen, setIsZRSFormOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | undefined>(undefined);
  const { showToast } = useToast();

  // Получаем текущего сотрудника из сессии и загружаем ЗРС
  useEffect(() => {
    const getCurrentEmployee = async () => {
      try {
        const { supabase } = await import('../supabaseClient');
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const emp = employees.find(e => e.email === user.email);
          setCurrentEmployee(emp);
        }
      } catch (err) {
        // Игнорируем ошибки
      }
    };
    if (employees.length > 0) {
      getCurrentEmployee();
    }
    // Загружаем ЗРС при монтировании (с задержкой, чтобы не блокировать основной UI)
    const timeoutId = setTimeout(() => {
      fetchZRS();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [employees, fetchZRS]);

  const handleSaveTemplate = async (template: Partial<DocumentTemplate>) => {
    try {
      await saveTemplate(template);
      showToast('success', 'Шаблон сохранен успешно');
      setEditingTemplate(null);
    } catch (err: any) {
      logError('Ошибка сохранения шаблона:', err);
      const errorMessage = err?.message || 'Ошибка сохранения шаблона';
      
      if (errorMessage.includes('created_by') || err?.code === 'PGRST204') {
        showToast('error', 'Ошибка: колонка created_by отсутствует. Выполните SQL скрипт fix_document_templates_created_by.sql в Supabase');
      } else if (errorMessage.includes('не существует') || errorMessage.includes('does not exist') || err?.code === '42P01' || err?.code === 'PGRST116') {
        showToast('error', 'Ошибка: таблица document_templates не создана. Выполните SQL скрипт create_documents_tables.sql в Supabase');
      } else if (errorMessage.includes('Нет прав') || errorMessage.includes('permission denied') || err?.code === '42501') {
        showToast('error', 'Ошибка: нет прав для сохранения шаблона. Проверьте RLS политики в Supabase');
      } else {
        showToast('error', errorMessage);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === 'template') {
        await deleteTemplate(deleteConfirm.id);
        showToast('success', 'Шаблон удален успешно');
      } else {
        await deleteDocument(deleteConfirm.id);
        showToast('success', 'Документ удален успешно');
        if (selectedDocument?.id === deleteConfirm.id) {
          setSelectedDocument(null);
        }
      }
      setDeleteConfirm(null);
    } catch (err) {
      showToast('error', 'Ошибка при удалении');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
        <p className="font-bold">Ошибка: {error}</p>
      </div>
    );
  }

  // Если выбран документ, показываем его просмотр
  if (selectedDocument) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedDocument(null)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-800">{selectedDocument.title}</h2>
              <p className="text-sm text-slate-500 mt-1">
                Сотрудник: {selectedDocument.employee?.full_name || 'Неизвестно'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Генерация PDF из документа
                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                  showToast('error', 'Ошибка: разрешите всплывающие окна для генерации PDF');
                  return;
                }
                
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html lang="ru">
                  <head>
                    <meta charset="UTF-8">
                    <title>${selectedDocument.title}</title>
                    <style>
                      @page { size: A4; margin: 2cm; }
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                        line-height: 1.6;
                        color: #1e293b;
                      }
                      h1, h2, h3 { color: #0f172a; }
                      .document-header {
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 1rem;
                        margin-bottom: 2rem;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="document-header">
                      <h1>${selectedDocument.title}</h1>
                      <p>Сотрудник: ${selectedDocument.employee?.full_name || 'Неизвестно'}</p>
                      <p>Дата создания: ${format(new Date(selectedDocument.created_at), 'dd.MM.yyyy', { locale: ru })}</p>
                    </div>
                    <div class="document-content">
                      ${selectedDocument.content}
                    </div>
                    <script>
                      window.onload = () => {
                        setTimeout(() => {
                          window.print();
                        }, 250);
                      };
                    </script>
                  </body>
                  </html>
                `);
                printWindow.document.close();
                showToast('info', 'PDF готов к печати/сохранению');
              }}
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Скачать PDF
            </button>
            {selectedDocument.file_url && (
              <a
                href={selectedDocument.file_url}
                download
                className="px-4 py-2 bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Скачать файл
              </a>
            )}
            {isAdmin && (
              <button
                onClick={() => setDeleteConfirm({ type: 'document', id: selectedDocument.id })}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Удалить
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: selectedDocument.content }}
          />
        </div>

        {selectedDocument.signatures && selectedDocument.signatures.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-black text-slate-800 mb-4">Подписи</h3>
            <div className="space-y-3">
              {selectedDocument.signatures.map(sig => (
                <div key={sig.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{sig.signer?.full_name || 'Неизвестно'}</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(sig.signed_at), 'd MMMM yyyy, HH:mm', { locale: ru })}
                    </p>
                  </div>
                  {sig.signature_type === 'image' && (
                    <img
                      src={sig.signature_data}
                      alt="Подпись"
                      className="h-12 w-auto object-contain"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Основной дашборд
  // Преобразуем ЗРС в формат Document для единого отображения
  const zrsAsDocuments: Document[] = zrsDocuments.map(zrs => ({
    id: zrs.id,
    employee_id: zrs.employee_id || '',
    title: `ЗРС от ${format(new Date(zrs.created_at), 'dd.MM.yyyy', { locale: ru })}`,
    content: `
      <div class="zrs-document">
        <h2>ЗРС</h2>
        <p><strong>Дата:</strong> ${format(new Date(zrs.created_at), 'dd.MM.yyyy', { locale: ru })}</p>
        <p><strong>Кому:</strong> ${zrs.to_whom}</p>
        <p><strong>От кого:</strong> ${zrs.from_whom}</p>
        <h3>1. Ситуация:</h3>
        <p>${(zrs.situation || '').replace(/\n/g, '<br>')}</p>
        <h3>2. Данные:</h3>
        <p>${(zrs.data || '').replace(/\n/g, '<br>')}</p>
        <h3>3. Решение:</h3>
        <p>${(zrs.solution || '').replace(/\n/g, '<br>')}</p>
      </div>
    `,
    status: zrs.status === 'approved' ? 'signed' : zrs.status === 'pending_approval' ? 'pending_signature' : zrs.status || 'draft',
    created_at: zrs.created_at,
    updated_at: zrs.updated_at,
    employee: zrs.employee,
    version: 1,
  }));

  // Объединяем документы и ЗРС
  const allDocuments = [...documents.filter(d => !d.title?.startsWith('ЗРС') && !d.content?.includes('class="zrs-document"')), ...zrsAsDocuments];

  const draftDocuments = allDocuments.filter(d => d.status === 'draft');
  const pendingDocuments = allDocuments.filter(d => d.status === 'pending_signature');
  const signedDocuments = allDocuments.filter(d => d.status === 'signed');
  const archivedDocuments = allDocuments.filter(d => d.status === 'archived');

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 font-bold uppercase text-xs mb-2">Черновики</p>
              <h3 className="text-4xl font-black">{draftDocuments.length}</h3>
            </div>
            <FileText size={32} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 font-bold uppercase text-xs mb-2">На подписании</p>
              <h3 className="text-4xl font-black">{pendingDocuments.length}</h3>
            </div>
            <Clock size={32} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 font-bold uppercase text-xs mb-2">Подписано</p>
              <h3 className="text-4xl font-black">{signedDocuments.length}</h3>
            </div>
            <CheckCircle2 size={32} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-100 font-bold uppercase text-xs mb-2">В архиве</p>
              <h3 className="text-4xl font-black">{archivedDocuments.length}</h3>
            </div>
            <Archive size={32} className="opacity-80" />
          </div>
        </div>
      </div>

      {/* Действия */}
      <div className="bg-gradient-to-r from-white to-slate-50 rounded-2xl border border-slate-200/60 shadow-sm p-5 flex flex-wrap gap-4 items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <PenTool className="text-blue-600" size={18} />
          </div>
          <span className="text-sm md:text-base font-bold text-slate-700">Действия:</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsZRSFormOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-200 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <FileCheck size={18} />
            <span>Создать ЗРС</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setEditingTemplate({})}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus size={18} />
              <span>Новый шаблон</span>
            </button>
          )}
        </div>
      </div>

      {/* ЗРС - сгруппированные по получателям */}
      <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg p-5 md:p-6">
        <h2 className="text-lg md:text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
          <FileCheck className="text-amber-600" size={20} />
          ЗРС (Завершенная Работа Сотрудника)
        </h2>
        {isZRSLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : zrsDocuments.length > 0 ? (
          <ZRSList
            zrsDocuments={zrsDocuments}
            onView={(doc) => {
                // Если это ZRSDocument, создаем Document для просмотра
                if ('to_whom' in doc) {
                  const zrsDoc = doc as any;
                  const document: Document = {
                    id: zrsDoc.id,
                    employee_id: zrsDoc.employee_id || '',
                    title: `ЗРС от ${format(new Date(zrsDoc.created_at), 'dd.MM.yyyy', { locale: ru })}`,
                    content: `
                      <div class="zrs-document">
                        <h2>ЗРС</h2>
                        <p><strong>Дата:</strong> ${format(new Date(zrsDoc.created_at), 'dd.MM.yyyy', { locale: ru })}</p>
                        <p><strong>Кому:</strong> ${zrsDoc.to_whom}</p>
                        <p><strong>От кого:</strong> ${zrsDoc.from_whom}</p>
                        <h3>1. Ситуация:</h3>
                        <p>${(zrsDoc.situation || '').replace(/\n/g, '<br>')}</p>
                        <h3>2. Данные:</h3>
                        <p>${(zrsDoc.data || '').replace(/\n/g, '<br>')}</p>
                        <h3>3. Решение:</h3>
                        <p>${(zrsDoc.solution || '').replace(/\n/g, '<br>')}</p>
                      </div>
                    `,
                    status: zrsDoc.status === 'approved' ? 'signed' : zrsDoc.status === 'pending_approval' ? 'pending_signature' : zrsDoc.status || 'draft',
                    created_at: zrsDoc.created_at,
                    updated_at: zrsDoc.updated_at,
                    employee: zrsDoc.employee,
                    version: 1,
                  };
                  setSelectedDocument(document);
                } else {
                  setSelectedDocument(doc as Document);
                }
              }}
            />
        ) : (
          <div className="bg-gradient-to-br from-white to-amber-50/20 rounded-xl border-2 border-amber-200 p-6 md:p-8 text-center">
            <div className="p-3 bg-amber-100 rounded-full w-fit mx-auto mb-3">
              <FileCheck className="text-amber-700" size={32} />
            </div>
            <p className="text-slate-700 font-black text-sm md:text-base">Нет созданных ЗРС</p>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Создайте первый ЗРС, используя кнопку "Создать ЗРС" выше</p>
          </div>
        )}
      </div>

      {/* Документы на подписании (включая ЗРС) */}
      {pendingDocuments.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg p-5 md:p-6">
          <h2 className="text-lg md:text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="text-amber-500" size={20} />
            Документы на подписании
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingDocuments.map(doc => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocument(doc)}
                className="bg-gradient-to-br from-white to-amber-50/30 rounded-2xl border-2 border-amber-200 hover:border-amber-400 p-5 cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800 text-base md:text-lg mb-1.5">{doc.title}</h3>
                    <p className="text-xs text-slate-500">{doc.employee?.full_name}</p>
                  </div>
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="text-amber-600" size={18} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-amber-100">
                  <span className="text-slate-500">{format(new Date(doc.created_at), 'd MMM yyyy', { locale: ru })}</span>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 font-bold rounded-lg">На подписании</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Все документы (включая ЗРС) */}
      {allDocuments.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-5 md:p-6">
          <h2 className="text-lg md:text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="text-blue-500" size={20} />
            Все документы
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allDocuments.map(doc => (
            <div
              key={doc.id}
              onClick={() => setSelectedDocument(doc)}
              className={`bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-1 ${
                doc.status === 'draft' ? 'border-slate-200 hover:border-slate-400' :
                doc.status === 'pending_signature' ? 'border-amber-200 hover:border-amber-400' :
                doc.status === 'signed' ? 'border-emerald-200 hover:border-emerald-400' :
                'border-slate-200 hover:border-slate-400'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-black text-slate-800 text-base md:text-lg mb-1.5">{doc.title}</h3>
                  <p className="text-xs text-slate-500">
                    {doc.employee?.full_name ? formatAbbreviatedName(doc.employee.full_name) : 'Неизвестно'}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${
                  doc.status === 'draft' ? 'bg-slate-100' :
                  doc.status === 'pending_signature' ? 'bg-amber-100' :
                  doc.status === 'signed' ? 'bg-emerald-100' :
                  'bg-slate-100'
                }`}>
                  <FileText className={`${
                    doc.status === 'draft' ? 'text-slate-600' :
                    doc.status === 'pending_signature' ? 'text-amber-600' :
                    doc.status === 'signed' ? 'text-emerald-600' :
                    'text-slate-600'
                  }`} size={18} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <span className="text-slate-500">{format(new Date(doc.created_at), 'd MMM yyyy', { locale: ru })}</span>
                <span className={`px-2.5 py-1 rounded-lg font-bold ${
                  doc.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                  doc.status === 'pending_signature' ? 'bg-amber-100 text-amber-700' :
                  doc.status === 'signed' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {doc.status === 'draft' && 'Черновик'}
                  {doc.status === 'pending_signature' && 'На подписании'}
                  {doc.status === 'signed' && 'Подписано'}
                  {doc.status === 'archived' && 'В архиве'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Шаблоны (только для админов) */}
      {isAdmin && templates.length > 0 && (
        <div>
          <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="text-blue-500" size={20} />
            Шаблоны документов
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800 mb-1">{template.name}</h3>
                    <p className="text-xs text-slate-500">Тип: {
                      template.type === 'contract' ? 'Трудовой договор' :
                      template.type === 'order' ? 'Приказ' :
                      template.type === 'certificate' ? 'Справка' :
                      'Другое'
                    }</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        // Скачивание шаблона как HTML файл
                        const blob = new Blob([template.content || ''], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${template.name || 'template'}.html`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showToast('success', 'Шаблон скачан');
                      }}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Скачать шаблон"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'template', id: template.id })}
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
        </div>
      )}

      {/* Редактор шаблонов */}
      {editingTemplate !== null && (
        <DocumentTemplatesEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {/* Форма ЗРС */}
      <ZRSForm
        isOpen={isZRSFormOpen}
        onClose={() => setIsZRSFormOpen(false)}
        employees={employees}
        currentEmployee={currentEmployee}
        onSave={async (zrs) => {
          try {
            // Определяем текущего сотрудника
            let employeeToUse = currentEmployee;
            
            // Если currentEmployee не определен, пытаемся найти его из сессии
            if (!employeeToUse?.id) {
              try {
                const { supabase } = await import('../supabaseClient');
                if (supabase) {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user?.email) {
                    employeeToUse = employees.find(e => e.email === user.email);
                  }
                }
              } catch (err) {
                logError('Ошибка при определении сотрудника:', err);
              }
            }
            
            // Если все еще не найден, используем первого сотрудника из списка (fallback)
            if (!employeeToUse?.id && employees.length > 0) {
              employeeToUse = employees[0];
              debugLog('Используем первого сотрудника из списка как fallback:', employeeToUse);
            }
            
            if (!employeeToUse?.id) {
              showToast('error', 'Не удалось определить текущего сотрудника. Убедитесь, что вы авторизованы и ваш email совпадает с email в базе сотрудников.');
              return;
            }

            // Сохраняем ЗРС в таблицу zrs_documents
            const createdZRS = await createZRS(zrs, employeeToUse.id);
            
            if (createdZRS) {
              // Обновляем список ЗРС после сохранения
              // fetchZRS уже вызывается внутри createZRS, но вызываем еще раз для надежности
              setTimeout(async () => {
                await fetchZRS();
              }, 500);
              
              const statusMessage = zrs.status === 'pending_approval' 
                ? 'ЗРС отправлен на одобрение' 
                : 'ЗРС сохранен как черновик';
              showToast('success', statusMessage);
              setIsZRSFormOpen(false);
            }
          } catch (err: any) {
            logError('Ошибка сохранения ЗРС:', err);
            const errorMessage = err?.message || 'Ошибка сохранения ЗРС';
            if (errorMessage.includes('не существует') || errorMessage.includes('does not exist')) {
              showToast('error', 'Таблица ЗРС не создана. Выполните SQL скрипт create_zrs_table.sql в Supabase');
            } else {
              showToast('error', errorMessage);
            }
          }
        }}
      />

      {/* Модальное окно подтверждения удаления */}
      <ConfirmationModal
        isOpen={deleteConfirm !== null}
        title={deleteConfirm?.type === 'template' ? 'Удалить шаблон?' : 'Удалить документ?'}
        message={
          deleteConfirm?.type === 'template'
            ? 'Вы уверены, что хотите удалить этот шаблон? Это действие нельзя отменить.'
            : 'Вы уверены, что хотите удалить этот документ? Это действие нельзя отменить.'
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isDanger={true}
        confirmLabel="Удалить"
      />
    </div>
  );
};

