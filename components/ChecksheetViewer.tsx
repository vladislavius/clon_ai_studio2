/**
 * Компонент для просмотра и выполнения контрольного листа
 * Интегрирован с материалами из шляпной папки
 */

import React, { useState, useEffect } from 'react';
import {
  FileCheck, Check, X, Edit2, BookOpen, Target, FileText, GraduationCap,
  Link as LinkIcon, Upload, Download, Eye, Plus, Save, AlertCircle, CheckCircle2, Printer
} from 'lucide-react';
import { HatFileChecksheet, ChecksheetItem, ChecksheetItemType, ChecksheetItemSubmission } from '../types';
import { useToast } from './Toast';
import { supabase } from '../supabaseClient';

interface ChecksheetViewerProps {
  checksheet: HatFileChecksheet;
  hatFileId: string;
  employeeId: string;
  employeeName: string;
  postName: string;
  onUpdate?: (checksheet: HatFileChecksheet) => void;
  isEditable?: boolean; // Может ли сотрудник редактировать
  isTrainer?: boolean; // Является ли пользователь ответственным за обучение
  hatFile?: any; // Шляпная папка для доступа к basic_data
}

const ChecksheetViewer: React.FC<ChecksheetViewerProps> = ({
  checksheet,
  hatFileId,
  employeeId,
  employeeName,
  postName,
  onUpdate,
  isEditable = true,
  isTrainer = false,
  hatFile: hatFileProp,
}) => {
  const toast = useToast();
  const [localChecksheet, setLocalChecksheet] = useState<HatFileChecksheet>(checksheet);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const hatFile = hatFileProp; // Для доступа к basic_data

  useEffect(() => {
    setLocalChecksheet(checksheet);
  }, [checksheet]);

  const updateItem = (itemId: string, updates: Partial<ChecksheetItem>) => {
    const updated = {
      ...localChecksheet,
      items: localChecksheet.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    };
    setLocalChecksheet(updated);
    onUpdate?.(updated);
  };

  const toggleItemChecked = (itemId: string) => {
    if (!isEditable) return;
    
    const item = localChecksheet.items.find(i => i.id === itemId);
    if (item) {
      updateItem(itemId, {
        checked: !item.checked,
        checked_at: !item.checked ? new Date().toISOString() : undefined,
        completion_date: !item.checked ? new Date().toISOString().split('T')[0] : undefined,
      });
      toast.success(item.checked ? 'Задание отмечено как невыполненное' : 'Задание отмечено как выполненное');
    }
  };

  const getItemTypeLabel = (type: ChecksheetItemType): string => {
    const labels: Record<ChecksheetItemType, string> = {
      practical: 'Практическое задание',
      theoretical: 'Теоретическое задание',
      essay: 'Эссе',
      sketch: 'Зарисовка',
      reading: 'Прочитать раздел',
      memorize: 'Выучить наизусть',
      training: 'Тренировка',
      glossary: 'Прояснение слов в глоссарии',
      online_course: 'Пройти онлайн-курс',
      inspection: 'Провести инспекцию',
      coordination: 'Провести координацию',
      other: 'Другое',
    };
    return labels[type] || type;
  };

  const getItemTypeIcon = (type: ChecksheetItemType) => {
    switch (type) {
      case 'practical':
        return <Target className="text-green-600" size={18} />;
      case 'theoretical':
        return <BookOpen className="text-blue-600" size={18} />;
      case 'essay':
        return <FileText className="text-purple-600" size={18} />;
      case 'sketch':
        return <Edit2 className="text-orange-600" size={18} />;
      case 'reading':
        return <BookOpen className="text-indigo-600" size={18} />;
      case 'memorize':
        return <GraduationCap className="text-amber-600" size={18} />;
      case 'training':
        return <CheckCircle2 className="text-teal-600" size={18} />;
      case 'glossary':
        return <FileText className="text-slate-600" size={18} />;
      case 'online_course':
        return <LinkIcon className="text-cyan-600" size={18} />;
      default:
        return <FileCheck className="text-slate-600" size={18} />;
    }
  };

  const handleSubmitItem = async (itemId: string) => {
    const item = localChecksheet.items.find(i => i.id === itemId);
    if (!item) return;

    // Для эссе и зарисовок требуется либо текст, либо файл
    if ((item.type === 'essay' || item.type === 'sketch') && !submissionContent.trim() && !submissionFile) {
      toast.error('Введите содержимое задания или загрузите файл');
      return;
    }

    let fileUrl: string | undefined;
    let fileName: string | undefined;

    // Загружаем файл, если он есть
    if (submissionFile && supabase) {
      try {
        const fileExt = submissionFile.name.split('.').pop();
        const fileNameWithId = `${itemId}-${Date.now()}.${fileExt}`;
        const filePath = `checksheet-submissions/${employeeId}/${fileNameWithId}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('employee-files')
          .upload(filePath, submissionFile);

        if (uploadError) {
          console.error('Ошибка загрузки файла:', uploadError);
          toast.error('Ошибка загрузки файла');
        } else {
          const { data: urlData } = supabase.storage
            .from('employee-files')
            .getPublicUrl(filePath);
          
          fileUrl = urlData.publicUrl;
          fileName = submissionFile.name;
        }
      } catch (error) {
        console.error('Ошибка при загрузке файла:', error);
        toast.error('Ошибка при загрузке файла');
      }
    }

    const submission: ChecksheetItemSubmission = {
      id: crypto.randomUUID(),
      item_id: itemId,
      type: item.type === 'essay' ? 'essay' : item.type === 'sketch' ? 'sketch' : 'text',
      content: submissionContent.trim() || undefined,
      file_url: fileUrl,
      file_name: fileName,
      submitted_at: new Date().toISOString(),
      submitted_by: employeeId,
    };

    updateItem(itemId, {
      submission,
      checked: false, // Ожидает проверки
    });

    setSubmissionContent('');
    setSubmissionFile(null);
    setEditingItemId(null);
    toast.success('Задание отправлено на проверку');
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const completionPercentage = localChecksheet.items.length > 0
    ? Math.round((localChecksheet.items.filter(i => i.checked).length / localChecksheet.items.length) * 100)
    : 0;

  const handleDownloadChecksheet = () => {
    // Создаем HTML версию для печати/скачивания
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Не удалось открыть окно для печати. Разрешите всплывающие окна.');
      return;
    }

    const htmlContent = generateChecksheetHTML();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Ждем загрузки и затем печатаем/сохраняем
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const generateChecksheetHTML = (): string => {
    const itemsHTML = localChecksheet.items.map((item) => {
      const checkedMark = item.checked ? '✓' : '☐';
      const completionDate = item.completion_date 
        ? ` (${new Date(item.completion_date).toLocaleDateString('ru-RU')})` 
        : '';
      
      const submissionHTML = item.submission?.content 
        ? `<div style="margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 10pt;"><strong>Результат:</strong><br>${escapeHtml(item.submission.content)}</div>` 
        : '';
      
      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 30px;">${item.sequence_number}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 30px; font-size: 16px;">${checkedMark}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">
            <strong>${getItemTypeLabel(item.type)}:</strong> ${escapeHtml(item.text)}
            ${item.description ? `<br><em style="color: #666; font-size: 10pt;">${escapeHtml(item.description)}</em>` : ''}
            ${item.linked_material_url ? `<br><span style="font-size: 10pt; color: #0066cc;">Ссылка: ${escapeHtml(item.linked_material_url)}</span>` : ''}
            ${submissionHTML}
            ${completionDate ? `<br><span style="font-size: 10pt; color: #666;">${completionDate}</span>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    const completionHTML = localChecksheet.completion ? `
      <div style="margin-top: 40px; padding: 20px; border: 2px solid #22c55e; border-radius: 8px; background: #f0fdf4;">
        <h3 style="color: #15803d; margin-bottom: 20px; text-transform: uppercase; font-size: 16px;">ЗАВЕРШЕНИЕ ОБУЧЕНИЯ:</h3>
        
        <div style="margin-bottom: 30px; padding: 15px; background: white; border-radius: 4px;">
          <div style="margin-bottom: 10px; font-weight: bold;">Декларация стажера:</div>
          <div style="margin-bottom: 15px; font-style: italic;">"Я выполнил все требования, и я знаю и могу применять данные материалы."</div>
          <div style="margin-top: 20px;">
            <div style="margin-bottom: 10px;">
              <strong>ПОДПИСЬ ОБУЧИВШЕГОСЯ:</strong>
              <div style="border-bottom: 1px solid #000; margin-top: 5px; min-height: 30px;">${escapeHtml(localChecksheet.completion.trainee_signature || '')}</div>
            </div>
            <div>
              <strong>ДАТА:</strong>
              <div style="border-bottom: 1px solid #000; margin-top: 5px; min-height: 30px; width: 150px;">${escapeHtml(localChecksheet.completion.trainee_signature_date || '')}</div>
            </div>
          </div>
        </div>

        <div style="padding: 15px; background: white; border-radius: 4px;">
          <div style="margin-bottom: 10px; font-weight: bold;">Декларация ответственного за обучение:</div>
          <div style="margin-bottom: 15px; font-style: italic;">"Я обучил этого стажера хорошо; он выполнил все требования, знает и может применить информацию, содержащуюся в данных материалах."</div>
          <div style="margin-top: 20px;">
            <div style="margin-bottom: 10px;">
              <strong>ПОДПИСЬ ОТВЕТСТВЕННОГО ЗА ОБУЧЕНИЕ:</strong>
              <div style="border-bottom: 1px solid #000; margin-top: 5px; min-height: 30px;">${escapeHtml(localChecksheet.completion.trainer_signature || '')}</div>
            </div>
            <div>
              <strong>ДАТА:</strong>
              <div style="border-bottom: 1px solid #000; margin-top: 5px; min-height: 30px; width: 150px;">${escapeHtml(localChecksheet.completion.trainer_signature_date || '')}</div>
            </div>
          </div>
        </div>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Контрольный лист - ${escapeHtml(employeeName)}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
            @page { margin: 1cm; size: A4; }
          }
          body {
            font-family: 'Arial', sans-serif;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
          }
          .title {
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            color: #7c3aed;
            margin: 30px 0;
          }
          .info-section {
            margin-bottom: 20px;
          }
          .info-row {
            margin-bottom: 8px;
          }
          .instructions {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 30px;
            white-space: pre-line;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #f3f4f6;
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
            font-weight: bold;
          }
          .product-section {
            margin-top: 40px;
            padding: 15px;
            background: #f9fafb;
            border-left: 4px solid #7c3aed;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <div style="font-size: 20px; color: #f97316;">Остров Сокровищ</div>
            <div style="font-size: 12px; color: #666;">ТУРОПЕРАТОРСКАЯ СЕТЬ</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; margin-bottom: 5px;">${escapeHtml(postName)}</div>
            <div style="border-top: 1px solid #333; padding-top: 5px; margin-top: 10px;"></div>
          </div>
        </div>

        <div class="title">Контрольный лист</div>

        <div class="info-section">
          <div class="info-row"><strong>ФИО:</strong> ${escapeHtml(employeeName)}</div>
          <div class="info-row"><strong>Название поста:</strong> ${escapeHtml(postName)}</div>
          <div style="display: flex; gap: 30px;">
            <div class="info-row"><strong>Дата начала:</strong> ${localChecksheet.started_at ? new Date(localChecksheet.started_at).toLocaleDateString('ru-RU') : '___________'}</div>
            <div class="info-row"><strong>Дата завершения:</strong> ${localChecksheet.completed_at ? new Date(localChecksheet.completed_at).toLocaleDateString('ru-RU') : '___________'}</div>
          </div>
        </div>

        ${localChecksheet.instructions ? `
          <div class="instructions">
            <h3 style="margin-top: 0; margin-bottom: 10px;">Как пользоваться этим контрольным листом:</h3>
            ${escapeHtml(localChecksheet.instructions)}
          </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">№</th>
              <th style="width: 30px;">✓</th>
              <th>Задание</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="product-section">
          <strong>Продукт поста:</strong> ${escapeHtml(hatFile?.basic_data?.products?.[0] || 'Кредитоспособная, платежеспособная, процветающая компания, достигающая свои цели.')}
        </div>

        ${completionHTML}

        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
          Сгенерировано: ${new Date().toLocaleString('ru-RU')}
        </div>
      </body>
      </html>
    `;
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div className="space-y-6">
      {/* Заголовок контрольного листа */}
      <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-purple-700 mb-2">Контрольный лист</h2>
            <div className="space-y-1 text-sm text-slate-600">
              <div><span className="font-semibold">Сотрудник:</span> {employeeName}</div>
              <div><span className="font-semibold">Пост:</span> {postName}</div>
              {localChecksheet.started_at && (
                <div><span className="font-semibold">Дата начала:</span> {new Date(localChecksheet.started_at).toLocaleDateString('ru-RU')}</div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <div className="text-3xl font-black text-purple-600">{completionPercentage}%</div>
              <div className="text-sm text-slate-500">Выполнено</div>
            </div>
            <button
              type="button"
              onClick={handleDownloadChecksheet}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-bold hover:from-purple-700 hover:to-purple-800 transition-all flex items-center gap-2 shadow-lg"
            >
              <Printer size={18} />
              <span>Скачать/Печать</span>
            </button>
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Инструкции */}
        {localChecksheet.instructions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-blue-800 mb-2">Как пользоваться этим контрольным листом:</h3>
            <div className="text-sm text-blue-700 whitespace-pre-line">{localChecksheet.instructions}</div>
          </div>
        )}
      </div>

      {/* Список заданий */}
      <div className="space-y-3">
        {localChecksheet.items.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-xl border-2 transition-all ${
              item.checked
                ? 'border-green-300 bg-green-50'
                : item.requires_revision
                ? 'border-orange-300 bg-orange-50'
                : 'border-slate-200 hover:border-purple-300'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Чекбокс */}
                <button
                  type="button"
                  onClick={() => toggleItemChecked(item.id)}
                  disabled={!isEditable}
                  className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    item.checked
                      ? 'bg-green-500 border-green-600 text-white'
                      : 'border-slate-300 hover:border-purple-500'
                  } ${!isEditable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {item.checked && <Check size={16} />}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Заголовок задания */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-black text-slate-500">
                      #{item.sequence_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 ${
                      item.type === 'practical'
                        ? 'bg-green-100 text-green-700'
                        : item.type === 'essay'
                        ? 'bg-purple-100 text-purple-700'
                        : item.type === 'sketch'
                        ? 'bg-orange-100 text-orange-700'
                        : item.type === 'reading'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {getItemTypeIcon(item.type)}
                      {getItemTypeLabel(item.type)}
                    </span>
                    {item.checked && item.completion_date && (
                      <span className="text-xs text-slate-500">
                        Выполнено: {new Date(item.completion_date).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </div>

                  {/* Текст задания */}
                  <div
                    className={`text-sm mb-2 ${
                      item.checked ? 'line-through text-slate-500' : 'text-slate-700'
                    }`}
                  >
                    {item.text}
                  </div>

                  {/* Описание задания */}
                  {item.description && (
                    <div className="text-xs text-slate-600 mb-2 italic">
                      {item.description}
                    </div>
                  )}

                  {/* Ссылка на материал из шляпной папки */}
                  {item.linked_material_url && (
                    <a
                      href={item.linked_material_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mb-2"
                    >
                      <LinkIcon size={12} />
                      Открыть материал из шляпной папки
                    </a>
                  )}

                  {/* Термины для прояснения (для типа glossary) */}
                  {item.type === 'glossary' && item.glossary_terms && item.glossary_terms.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-2 mb-2">
                      <div className="text-xs font-semibold text-slate-700 mb-1">Термины для прояснения:</div>
                      <div className="flex flex-wrap gap-1">
                        {item.glossary_terms.map((term, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs">
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Результат выполнения */}
                  {item.submission && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                      <div className="text-xs font-semibold text-blue-700 mb-1">Результат выполнения:</div>
                      {item.submission.content && (
                        <div className="text-sm text-slate-700 whitespace-pre-wrap mb-2">
                          {item.submission.content}
                        </div>
                      )}
                      {item.submission.file_url && (
                        <a
                          href={item.submission.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <Download size={12} />
                          {item.submission.file_name || 'Скачать файл'}
                        </a>
                      )}
                      <div className="text-xs text-slate-500 mt-1">
                        Отправлено: {new Date(item.submission.submitted_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  )}

                  {/* Комментарии проверяющего */}
                  {item.requires_revision && item.revision_notes && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-2">
                      <div className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Требуется доработка:
                      </div>
                      <div className="text-xs text-orange-600">{item.revision_notes}</div>
                    </div>
                  )}

                  {/* Кнопки действий */}
                  {isEditable && !item.checked && (
                    <div className="flex gap-2 mt-2">
                      {(item.type === 'essay' || item.type === 'sketch') && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItemId(item.id);
                            setSubmissionContent(item.submission?.content || '');
                            setSubmissionFile(null); // Файл нужно загружать заново
                          }}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 flex items-center gap-1"
                        >
                          {item.submission ? <Edit2 size={14} /> : <Plus size={14} />}
                          {item.submission ? 'Редактировать' : 'Выполнить задание'}
                        </button>
                      )}
                      {item.linked_material_url && (
                        <a
                          href={item.linked_material_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
                        >
                          <BookOpen size={14} />
                          Изучить материал
                        </a>
                      )}
                    </div>
                  )}

                  {/* Форма выполнения задания */}
                  {editingItemId === item.id && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        {item.type === 'essay' ? 'Напишите эссе:' : item.type === 'sketch' ? 'Сделайте зарисовку/описание:' : 'Выполните задание:'}
                      </label>
                      <textarea
                        value={submissionContent}
                        onChange={(e) => setSubmissionContent(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[120px] text-sm mb-3"
                        placeholder={item.type === 'essay' ? 'Введите текст эссе...' : item.type === 'sketch' ? 'Опишите зарисовку или загрузите файл...' : 'Введите ответ...'}
                      />
                      {/* Загрузка файла для эссе и зарисовок */}
                      {(item.type === 'essay' || item.type === 'sketch') && (
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-slate-700 mb-2">
                            Загрузить файл (опционально):
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept={item.type === 'sketch' ? 'image/*,.pdf' : '.pdf,.doc,.docx,.txt'}
                              onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                              className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                            {submissionFile && (
                              <span className="text-xs text-slate-600">
                                {submissionFile.name}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSubmitItem(item.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2"
                        >
                          <Save size={16} />
                          Отправить на проверку
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItemId(null);
                            setSubmissionContent('');
                            setSubmissionFile(null);
                          }}
                          className="px-4 py-2 bg-slate-400 text-white rounded-lg text-sm font-bold hover:bg-slate-500"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Раздел завершения обучения */}
      {completionPercentage === 100 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6">
          <h3 className="text-xl font-black text-green-800 mb-4">ЗАВЕРШЕНИЕ ОБУЧЕНИЯ:</h3>
          
          <div className="space-y-4">
            {/* Декларация стажера */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-sm font-semibold text-slate-700 mb-2">
                Декларация стажера:
              </div>
              <div className="text-sm text-slate-600 mb-4">
                "Я выполнил все требования, и я знаю и могу применять данные материалы."
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    ПОДПИСЬ ОБУЧИВШЕГОСЯ
                  </label>
                  <input
                    type="text"
                    value={localChecksheet.completion?.trainee_signature || ''}
                    onChange={(e) => {
                      const updated = {
                        ...localChecksheet,
                        completion: {
                          ...localChecksheet.completion,
                          trainee_declaration: "Я выполнил все требования, и я знаю и могу применять данные материалы.",
                          trainee_signature: e.target.value,
                          trainer_declaration: localChecksheet.completion?.trainer_declaration || "Я обучил этого стажера хорошо; он выполнил все требования, знает и может применить информацию, содержащуюся в данных материалах.",
                        }
                      };
                      setLocalChecksheet(updated);
                      onUpdate?.(updated);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Введите подпись"
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    ДАТА
                  </label>
                  <input
                    type="date"
                    value={localChecksheet.completion?.trainee_signature_date || ''}
                    onChange={(e) => {
                      const updated = {
                        ...localChecksheet,
                        completion: {
                          ...localChecksheet.completion,
                          trainee_declaration: "Я выполнил все требования, и я знаю и могу применять данные материалы.",
                          trainer_declaration: localChecksheet.completion?.trainer_declaration || "Я обучил этого стажера хорошо; он выполнил все требования, знает и может применить информацию, содержащуюся в данных материалах.",
                          trainee_signature_date: e.target.value,
                        }
                      };
                      setLocalChecksheet(updated);
                      onUpdate?.(updated);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </div>

            {/* Декларация ответственного за обучение */}
            {isTrainer && (
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="text-sm font-semibold text-slate-700 mb-2">
                  Декларация ответственного за обучение:
                </div>
                <div className="text-sm text-slate-600 mb-4">
                  "Я обучил этого стажера хорошо; он выполнил все требования, знает и может применить информацию, содержащуюся в данных материалах."
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      ПОДПИСЬ ОТВЕТСТВЕННОГО ЗА ОБУЧЕНИЕ
                    </label>
                    <input
                      type="text"
                      value={localChecksheet.completion?.trainer_signature || ''}
                      onChange={(e) => {
                        const updated = {
                          ...localChecksheet,
                          completion: {
                            ...localChecksheet.completion,
                            trainee_declaration: localChecksheet.completion?.trainee_declaration || "Я выполнил все требования, и я знаю и могу применять данные материалы.",
                            trainer_declaration: "Я обучил этого стажера хорошо; он выполнил все требования, знает и может применить информацию, содержащуюся в данных материалах.",
                            trainer_signature: e.target.value,
                          }
                        };
                        setLocalChecksheet(updated);
                        onUpdate?.(updated);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="Введите подпись"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      ДАТА
                    </label>
                    <input
                      type="date"
                      value={localChecksheet.completion?.trainer_signature_date || ''}
                      onChange={(e) => {
                        const updated = {
                          ...localChecksheet,
                          completion: {
                            ...localChecksheet.completion,
                            trainee_declaration: localChecksheet.completion?.trainee_declaration || "Я выполнил все требования, и я знаю и могу применять данные материалы.",
                            trainer_declaration: "Я обучил этого стажера хорошо; он выполнил все требования, знает и может применить информацию, содержащуюся в данных материалах.",
                            trainer_signature_date: e.target.value,
                          }
                        };
                        setLocalChecksheet(updated);
                        onUpdate?.(updated);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecksheetViewer;

