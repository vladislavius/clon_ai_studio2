/**
 * Хук для управления полученными документами
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { ReceivedDocument, ReceivedDocumentType, ReceivedDocumentStatus, ReceivedDocumentSignature, ReceivedDocumentApproval } from '../types';
import { logError, debugLog } from '../utils/logger';

export interface UseReceivedDocumentsReturn {
  documents: ReceivedDocument[];
  isLoading: boolean;
  error: string | null;
  fetchDocuments: () => Promise<void>;
  uploadDocument: (
    file: File,
    metadata: {
      title: string;
      document_type: ReceivedDocumentType;
      employee_id?: string;
      sender_name?: string;
      sender_email?: string;
      received_date: string;
      description?: string;
      tags?: string[];
    },
    createdBy: string
  ) => Promise<ReceivedDocument | null>;
  updateDocument: (
    id: string,
    updates: Partial<ReceivedDocument>
  ) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;
  addSignature: (
    documentId: string,
    signature: ReceivedDocumentSignature
  ) => Promise<boolean>;
  addApproval: (
    documentId: string,
    approval: ReceivedDocumentApproval
  ) => Promise<boolean>;
}

export function useReceivedDocuments(): UseReceivedDocumentsReturn {
  const [documents, setDocuments] = useState<ReceivedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка всех документов
  const fetchDocuments = useCallback(async () => {
    if (!supabase) {
      setError('Supabase не инициализирован');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Оптимизация: сначала загружаем документы без JOIN'ов
      const { data: docsData, error: fetchError } = await supabase
        .from('received_documents')
        .select('*')
        .order('received_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100); // Ограничиваем количество для производительности

      if (fetchError) {
        // Проверяем, существует ли таблица
        if (fetchError.code === '42P01' || fetchError.code === 'PGRST116') {
          debugLog('Таблица received_documents не существует, возвращаем пустой массив');
          setDocuments([]);
          setIsLoading(false);
          return;
        }
        throw fetchError;
      }

      if (!docsData || docsData.length === 0) {
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      // Оптимизация: собираем все уникальные ID для batch запросов
      const employeeIds = new Set<string>();
      const creatorIds = new Set<string>();

      docsData.forEach((doc: any) => {
        if (doc.employee_id) employeeIds.add(doc.employee_id);
        if (doc.created_by) creatorIds.add(doc.created_by);
      });

      // Загружаем всех employees одним запросом
      const allEmployeeIds = Array.from(new Set([...employeeIds, ...creatorIds]));
      const employeesMap = new Map<string, any>();
      
      if (allEmployeeIds.length > 0) {
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id, full_name, position, email')
          .in('id', allEmployeeIds);
        
        if (employeesData) {
          employeesData.forEach(emp => employeesMap.set(emp.id, emp));
        }
      }

      // Преобразуем данные
      const processedDocuments: ReceivedDocument[] = docsData.map((doc: any) => ({
        ...doc,
        signatures: Array.isArray(doc.signatures) ? doc.signatures : [],
        approvals: Array.isArray(doc.approvals) ? doc.approvals : [],
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        employee: doc.employee_id ? employeesMap.get(doc.employee_id) || undefined : undefined,
        creator: doc.created_by ? employeesMap.get(doc.created_by) || undefined : undefined,
      }));

      setDocuments(processedDocuments);
    } catch (err: any) {
      logError('Ошибка загрузки полученных документов:', err);
      setError(err.message || 'Ошибка загрузки документов');
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загрузка документа в Storage и создание записи
  const uploadDocument = useCallback(async (
    file: File,
    metadata: {
      title: string;
      document_type: ReceivedDocumentType;
      employee_id?: string;
      sender_name?: string;
      sender_email?: string;
      received_date: string;
      description?: string;
      tags?: string[];
    },
    createdBy: string
  ): Promise<ReceivedDocument | null> => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }

    try {
      // 1. Загружаем файл в Storage
      const fileExt = file.name.split('.').pop() || 'file';
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `received/${timestamp}_${randomSuffix}.${fileExt}`;
      const bucket = 'employee-docs'; // Используем существующий bucket для документов

      debugLog('Загрузка файла в Storage:', { fileName, bucket, size: file.size });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Ошибка загрузки файла: ${uploadError.message}`);
      }

      if (!uploadData) {
        throw new Error('Не удалось загрузить файл');
      }

      // 2. Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData.path);

      // 3. Создаем запись в БД
      const insertData = {
        title: metadata.title,
        document_type: metadata.document_type,
        file_name: file.name,
        file_path: uploadData.path,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        employee_id: metadata.employee_id || null,
        sender_name: metadata.sender_name || null,
        sender_email: metadata.sender_email || null,
        received_date: metadata.received_date,
        description: metadata.description || null,
        tags: metadata.tags || [],
        signatures: [],
        approvals: [],
        created_by: createdBy,
        status: 'received' as ReceivedDocumentStatus,
      };

      debugLog('Создание записи в БД:', insertData);

      // Вставляем без JOIN для избежания ошибок
      const { data: documentData, error: insertError } = await supabase
        .from('received_documents')
        .insert(insertData)
        .select('*')
        .single();

      if (insertError) {
        // Если ошибка вставки, удаляем загруженный файл
        await supabase.storage.from(bucket).remove([uploadData.path]);
        logError('Ошибка вставки документа:', insertError);
        throw new Error(insertError.message || 'Ошибка сохранения документа в базу данных');
      }

      // Загружаем связанные данные отдельно (оптимизация)
      let employee = undefined;
      let creator = undefined;

      if (documentData.employee_id) {
        const { data: empData } = await supabase
          .from('employees')
          .select('id, full_name, position, email')
          .eq('id', documentData.employee_id)
          .single();
        employee = empData || undefined;
      }

      if (documentData.created_by) {
        const { data: creatorData } = await supabase
          .from('employees')
          .select('id, full_name, position, email')
          .eq('id', documentData.created_by)
          .single();
        creator = creatorData || undefined;
      }

      // Преобразуем данные
      const processedDocument: ReceivedDocument = {
        ...documentData,
        signatures: Array.isArray(documentData.signatures) ? documentData.signatures : [],
        approvals: Array.isArray(documentData.approvals) ? documentData.approvals : [],
        tags: Array.isArray(documentData.tags) ? documentData.tags : [],
        employee,
        creator,
      };

      // Обновляем список
      await fetchDocuments();

      return processedDocument;
    } catch (err: any) {
      logError('Ошибка загрузки документа:', err);
      throw err;
    }
  }, [fetchDocuments]);

  // Обновление документа
  const updateDocument = useCallback(async (
    id: string,
    updates: Partial<ReceivedDocument>
  ): Promise<boolean> => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }

    try {
      const updateData: any = { ...updates };
      // Удаляем поля, которые не должны обновляться напрямую
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.employee;
      delete updateData.creator;

      const { error: updateError } = await supabase
        .from('received_documents')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      await fetchDocuments();
      return true;
    } catch (err: any) {
      logError('Ошибка обновления документа:', err);
      throw err;
    }
  }, [fetchDocuments]);

  // Удаление документа
  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }

    try {
      // Находим документ, чтобы получить путь к файлу
      const document = documents.find(d => d.id === id);
      if (!document) {
        throw new Error('Документ не найден');
      }

      // Удаляем файл из Storage
      if (document.file_path) {
        const bucket = 'employee-docs';
        const { error: storageError } = await supabase.storage
          .from(bucket)
          .remove([document.file_path]);

        if (storageError) {
          debugLog('Ошибка удаления файла из Storage (продолжаем удаление записи):', storageError);
        }
      }

      // Удаляем запись из БД
      const { error: deleteError } = await supabase
        .from('received_documents')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      await fetchDocuments();
      return true;
    } catch (err: any) {
      logError('Ошибка удаления документа:', err);
      throw err;
    }
  }, [documents, fetchDocuments]);

  // Добавление подписи
  const addSignature = useCallback(async (
    documentId: string,
    signature: {
      signer_name: string;
      signer_position: string;
      signed_at: string;
      signature_type?: 'image' | 'digital' | 'stamp';
    }
  ): Promise<boolean> => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }

    try {
      const document = documents.find(d => d.id === documentId);
      if (!document) {
        throw new Error('Документ не найден');
      }

      const updatedSignatures = [...document.signatures, signature];

      const { error: updateError } = await supabase
        .from('received_documents')
        .update({ signatures: updatedSignatures })
        .eq('id', documentId);

      if (updateError) {
        throw updateError;
      }

      await fetchDocuments();
      return true;
    } catch (err: any) {
      logError('Ошибка добавления подписи:', err);
      throw err;
    }
  }, [documents, fetchDocuments]);

  // Добавление одобрения
  const addApproval = useCallback(async (
    documentId: string,
    approval: {
      approver_name: string;
      approver_position: string;
      approved_at: string;
      comment?: string;
    }
  ): Promise<boolean> => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }

    try {
      const document = documents.find(d => d.id === documentId);
      if (!document) {
        throw new Error('Документ не найден');
      }

      const updatedApprovals = [...document.approvals, approval];

      const { error: updateError } = await supabase
        .from('received_documents')
        .update({ approvals: updatedApprovals })
        .eq('id', documentId);

      if (updateError) {
        throw updateError;
      }

      await fetchDocuments();
      return true;
    } catch (err: any) {
      logError('Ошибка добавления одобрения:', err);
      throw err;
    }
  }, [documents, fetchDocuments]);

  // Загружаем документы при монтировании
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    error,
    fetchDocuments,
    uploadDocument,
    updateDocument,
    deleteDocument,
    addSignature,
    addApproval,
  };
}

