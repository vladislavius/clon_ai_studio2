import React, { useState, useMemo } from 'react';
import { Document } from '../types';
import { ZRSDocument } from '../hooks/useZRS';
import { ChevronDown, ChevronRight, FileText, Download, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { generateZRSPDF } from '../utils/zrsPdfGenerator';
import { ZRSData } from './ZRSForm';
import { formatAbbreviatedName, extractFullName } from '../utils/nameFormatter';

interface ZRSListProps {
  documents?: Document[]; // Для обратной совместимости
  zrsDocuments?: ZRSDocument[]; // Новый способ - напрямую из таблицы zrs_documents
  onView?: (document: Document | ZRSDocument) => void;
}

interface GroupedZRS {
  recipient: string; // ФИО получателя
  zrsList: (Document | ZRSDocument)[];
}

export const ZRSList: React.FC<ZRSListProps> = ({ documents, zrsDocuments, onView }) => {
  const [expandedRecipients, setExpandedRecipients] = useState<Set<string>>(new Set());

  // Фильтруем только ЗРС документы и группируем по получателю
  const groupedZRS = useMemo(() => {
    let allZRS: (Document | ZRSDocument)[] = [];

    // Если переданы zrsDocuments напрямую из таблицы - используем их
    if (zrsDocuments && zrsDocuments.length > 0) {
      allZRS = zrsDocuments;
    } else if (documents) {
      // Иначе фильтруем из documents (обратная совместимость)
      allZRS = documents.filter(doc => 
        doc.title?.startsWith('ЗРС') || doc.content?.includes('class="zrs-document"')
      );
    }

    // Получаем получателя
    const getRecipient = (item: Document | ZRSDocument): string => {
      // Если это ZRSDocument из таблицы - используем поле напрямую
      if ('to_whom' in item && item.to_whom) {
        return item.to_whom;
      }
      
      // Иначе парсим из Document
      const doc = item as Document;
      if (!doc.content) return 'Не указан';
      
      // Ищем "Кому:" в HTML
      const match = doc.content.match(/<strong>Кому:<\/strong>\s*([^<]+)/i);
      if (match) {
        return match[1].trim();
      }
      
      // Альтернативный вариант - ищем в тексте
      const textMatch = doc.content.match(/Кому[:\s]+([^<\n]+)/i);
      if (textMatch) {
        return textMatch[1].trim();
      }
      
      return 'Не указан';
    };

    // Группируем по получателю
    const grouped = new Map<string, (Document | ZRSDocument)[]>();
    
    allZRS.forEach(item => {
      const recipient = getRecipient(item);
      if (!grouped.has(recipient)) {
        grouped.set(recipient, []);
      }
      grouped.get(recipient)!.push(item);
    });

    // Сортируем по фамилии (первое слово)
    const sorted: GroupedZRS[] = Array.from(grouped.entries())
      .map(([recipient, zrsList]) => ({
        recipient,
        zrsList: zrsList.sort((a, b) => {
          const dateA = 'created_at' in a ? a.created_at : (a as Document).created_at;
          const dateB = 'created_at' in b ? b.created_at : (b as Document).created_at;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        }),
      }))
      .sort((a, b) => {
        // Извлекаем фамилию (первое слово)
        const surnameA = a.recipient.split(' ')[0] || '';
        const surnameB = b.recipient.split(' ')[0] || '';
        return surnameA.localeCompare(surnameB, 'ru');
      });

    return sorted;
  }, [documents, zrsDocuments]);

  const toggleRecipient = (recipient: string) => {
    setExpandedRecipients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recipient)) {
        newSet.delete(recipient);
      } else {
        newSet.add(recipient);
      }
      return newSet;
    });
  };

  const handleGeneratePDF = (item: Document | ZRSDocument) => {
    let zrsData: ZRSData | null = null;

    // Если это ZRSDocument из таблицы - используем поля напрямую
    if ('to_whom' in item && item.to_whom) {
      zrsData = {
        to_whom: item.to_whom,
        from_whom: item.from_whom,
        situation: item.situation,
        data: item.data,
        solution: item.solution,
        created_at: item.created_at,
        status: item.status,
      };
    } else {
      // Иначе парсим из Document
      const doc = item as Document;
      if (!doc.content) {
        alert('Не удалось извлечь данные ЗРС из документа');
        return;
      }

      const extractField = (fieldName: string): string => {
        const regex = new RegExp(`<strong>${fieldName}:</strong>\\s*([^<]+)`, 'i');
        const match = doc.content?.match(regex);
        if (match) return match[1].trim();
        
        // Альтернативный вариант для многострочных полей
        const sectionMatch = doc.content?.match(new RegExp(`<h3>\\d+\\.\\s*${fieldName}:</h3>\\s*<p>([\\s\\S]*?)</p>`, 'i'));
        if (sectionMatch) {
          return sectionMatch[1].replace(/<br\s*\/?>/gi, '\n').trim();
        }
        return '';
      };

      const toWhom = extractField('Кому');
      const fromWhom = extractField('От кого');
      const situation = doc.content.match(/<h3>1\.\s*Ситуация:<\/h3>\s*<p>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<br\s*\/?>/gi, '\n').trim() || '';
      const data = doc.content.match(/<h3>2\.\s*Данные:<\/h3>\s*<p>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<br\s*\/?>/gi, '\n').trim() || '';
      const solution = doc.content.match(/<h3>3\.\s*Решение:<\/h3>\s*<p>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<br\s*\/?>/gi, '\n').trim() || '';

      if (!toWhom || !fromWhom) {
        alert('Не удалось извлечь данные ЗРС из документа');
        return;
      }

      // Преобразуем статус Document в статус ZRS
      let zrsStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected' = 'draft';
      if (doc.status === 'signed') {
        zrsStatus = 'approved';
      } else if (doc.status === 'pending_signature') {
        zrsStatus = 'pending_approval';
      } else if (doc.status === 'draft') {
        zrsStatus = 'draft';
      } else if (doc.status === 'rejected') {
        zrsStatus = 'rejected';
      }

      zrsData = {
        to_whom: toWhom,
        from_whom: fromWhom,
        situation,
        data,
        solution,
        created_at: doc.created_at,
        status: zrsStatus,
      };
    }

    if (zrsData) {
      generateZRSPDF(zrsData);
    } else {
      alert('Не удалось извлечь данные ЗРС из документа');
    }
  };

  if (groupedZRS.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-amber-50/20 rounded-xl border-2 border-amber-200 p-6 md:p-8 text-center">
        <div className="p-3 bg-amber-100 rounded-full w-fit mx-auto mb-3">
          <FileText className="text-amber-700" size={32} />
        </div>
        <p className="text-slate-700 font-black text-sm md:text-base">Нет созданных ЗРС</p>
        <p className="text-xs md:text-sm text-slate-500 mt-1">Создайте первый ЗРС, используя кнопку "Создать ЗРС"</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groupedZRS.map(({ recipient, zrsList }) => {
        const isExpanded = expandedRecipients.has(recipient);
        // Извлекаем ФИО из recipient и форматируем в сокращенный вид
        const fullName = extractFullName(recipient);
        const abbreviatedName = formatAbbreviatedName(fullName);
        // Получаем дату последнего ЗРС
        const lastZRSDate = zrsList.length > 0 
          ? ('created_at' in zrsList[0] ? zrsList[0].created_at : (zrsList[0] as Document).created_at)
          : null;

        return (
          <div
            key={recipient}
            className="bg-gradient-to-br from-white to-amber-50/20 rounded-xl border-2 border-amber-200 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            {/* Заголовок группы */}
            <button
              onClick={() => toggleRecipient(recipient)}
              className="w-full px-4 md:px-5 py-3 md:py-4 flex items-center justify-between hover:bg-amber-50/50 transition-colors text-left rounded-t-xl"
            >
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                {isExpanded ? (
                  <ChevronDown className="text-amber-600 flex-shrink-0" size={18} />
                ) : (
                  <ChevronRight className="text-amber-600 flex-shrink-0" size={18} />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 text-sm md:text-base truncate">
                    {abbreviatedName || fullName || recipient.split(' ')[0]}
                  </h3>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">
                    {zrsList.length} {zrsList.length === 1 ? 'ЗРС' : 'ЗРС'}
                  </p>
                </div>
              </div>
              {lastZRSDate && (
                <div className="text-[10px] md:text-xs text-slate-500 font-medium flex items-center gap-1 ml-2 flex-shrink-0">
                  <Calendar size={12} />
                  {format(new Date(lastZRSDate), 'dd.MM.yyyy', { locale: ru })}
                </div>
              )}
            </button>

            {/* Список ЗРС для этого получателя */}
            {isExpanded && (
              <div className="border-t-2 border-amber-200 bg-white">
                {zrsList.map((item, index) => {
                  const created_at = 'created_at' in item ? item.created_at : (item as unknown as Document).created_at;
                  const itemStatus = 'status' in item ? item.status : (item as unknown as Document).status;
                  // Преобразуем статус для отображения
                  let displayStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected' | undefined = undefined;
                  if (itemStatus === 'signed' || itemStatus === 'approved') {
                    displayStatus = 'approved';
                  } else if (itemStatus === 'pending_signature' || itemStatus === 'pending_approval') {
                    displayStatus = 'pending_approval';
                  } else if (itemStatus === 'draft') {
                    displayStatus = 'draft';
                  } else if (itemStatus === 'rejected') {
                    displayStatus = 'rejected';
                  }
                  const title = 'title' in item ? item.title : `ЗРС от ${format(new Date(created_at), 'dd.MM.yyyy', { locale: ru })}`;
                  
                  return (
                    <div
                      key={item.id}
                      className={`px-4 md:px-5 py-3 md:py-4 border-b border-amber-100 last:border-b-0 transition-colors ${
                        index % 2 === 0 ? 'bg-amber-50/30' : 'bg-white'
                      } hover:bg-amber-50/50`}
                    >
                      <div className="flex items-start justify-between gap-3 md:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-amber-100 rounded-lg">
                              <FileText className="text-amber-700 flex-shrink-0" size={14} />
                            </div>
                            <h4 className="font-black text-slate-800 text-xs md:text-sm truncate">
                              {title}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs text-slate-500 mb-2">
                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                              <Calendar size={11} />
                              {format(new Date(created_at), 'dd.MM.yyyy', { locale: ru })}
                            </span>
                            {displayStatus && (
                              <span className={`font-bold px-2 py-1 rounded-lg ${
                                displayStatus === 'draft' ? 'bg-slate-100 text-slate-700' :
                                displayStatus === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                                displayStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                displayStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {displayStatus === 'draft' && 'Черновик'}
                                {displayStatus === 'pending_approval' && 'На одобрении'}
                                {displayStatus === 'approved' && 'Одобрено'}
                                {displayStatus === 'rejected' && 'Отклонено'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                          {onView && (
                            <button
                              onClick={() => onView(item)}
                              className="p-2 md:p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-110 border border-blue-200"
                              title="Просмотреть"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleGeneratePDF(item)}
                            className="p-2 md:p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 hover:scale-110 border border-emerald-200"
                            title="Скачать PDF"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

