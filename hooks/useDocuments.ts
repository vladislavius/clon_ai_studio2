import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Document, DocumentTemplate, DocumentSignature, DocumentSignatureWorkflow, Employee } from '../types';
import { logError, debugLog } from '../utils/logger';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка всех документов (оптимизированная версия)
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 1. Загружаем все документы
      const { data: docsData, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Ограничиваем количество для производительности

      if (fetchError) {
        // Если таблица не существует, просто возвращаем пустой массив
        if (fetchError.code === '42P01' || fetchError.message?.includes('does not exist')) {
          debugLog('Таблица documents не существует, возвращаем пустой массив');
          setDocuments([]);
          setError(null);
          setIsLoading(false);
          return;
        }
        throw fetchError;
      }

      if (!docsData || docsData.length === 0) {
        setDocuments([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      // 2. Собираем все уникальные ID для batch запросов
      const employeeIds = new Set<string>();
      const templateIds = new Set<string>();
      const documentIds = docsData.map(d => d.id);

      docsData.forEach(doc => {
        if (doc.employee_id) employeeIds.add(doc.employee_id);
        if (doc.template_id) templateIds.add(doc.template_id);
      });

      // 3. Загружаем все employees одним запросом
      const employeesMap = new Map<string, any>();
      if (employeeIds.size > 0) {
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id, full_name, email, position, photo_url')
          .in('id', Array.from(employeeIds));
        
        if (employeesData) {
          employeesData.forEach(emp => employeesMap.set(emp.id, emp));
        }
      }

      // 4. Загружаем все templates одним запросом
      const templatesMap = new Map<string, any>();
      if (templateIds.size > 0) {
        const { data: templatesData } = await supabase
          .from('document_templates')
          .select('id, name, type')
          .in('id', Array.from(templateIds));
        
        if (templatesData) {
          templatesData.forEach(tpl => templatesMap.set(tpl.id, tpl));
        }
      }

      // 5. Загружаем все подписи одним запросом
      const { data: allSignatures } = await supabase
        .from('document_signatures')
        .select('*')
        .in('document_id', documentIds)
        .order('signed_at', { ascending: true });

      // 6. Загружаем все workflow одним запросом
      const { data: allWorkflow } = await supabase
        .from('document_signature_workflow')
        .select('*')
        .in('document_id', documentIds)
        .order('order_index', { ascending: true });

      // 7. Собираем signer_id из подписей и workflow
      const signerIds = new Set<string>();
      (allSignatures || []).forEach(sig => {
        if (sig.signer_id) signerIds.add(sig.signer_id);
      });
      (allWorkflow || []).forEach(wf => {
        if (wf.signer_id) signerIds.add(wf.signer_id);
      });

      // 8. Загружаем всех signers одним запросом
      const signersMap = new Map<string, any>();
      if (signerIds.size > 0) {
        const { data: signersData } = await supabase
          .from('employees')
          .select('id, full_name, email, position, photo_url')
          .in('id', Array.from(signerIds));
        
        if (signersData) {
          signersData.forEach(signer => signersMap.set(signer.id, signer));
        }
      }

      // 9. Группируем подписи и workflow по document_id
      const signaturesByDoc = new Map<string, any[]>();
      const workflowByDoc = new Map<string, any[]>();

      (allSignatures || []).forEach(sig => {
        if (!signaturesByDoc.has(sig.document_id)) {
          signaturesByDoc.set(sig.document_id, []);
        }
        const sigWithSigner = { ...sig, signer: sig.signer_id ? signersMap.get(sig.signer_id) : null };
        signaturesByDoc.get(sig.document_id)!.push(sigWithSigner);
      });

      (allWorkflow || []).forEach(wf => {
        if (!workflowByDoc.has(wf.document_id)) {
          workflowByDoc.set(wf.document_id, []);
        }
        const wfWithSigner = { ...wf, signer: wf.signer_id ? signersMap.get(wf.signer_id) : null };
        workflowByDoc.get(wf.document_id)!.push(wfWithSigner);
      });

      // 10. Собираем финальные документы
      const documentsWithDetails = docsData.map((doc) => {
        return {
          ...doc,
          employee: doc.employee_id ? employeesMap.get(doc.employee_id) || null : null,
          template: doc.template_id ? templatesMap.get(doc.template_id) || null : null,
          signatures: signaturesByDoc.get(doc.id) || [],
          workflow: workflowByDoc.get(doc.id) || [],
        } as Document;
      });

      setDocuments(documentsWithDetails);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      logError('Ошибка загрузки документов:', err);
      
      // Если таблица не существует, не показываем ошибку пользователю
      if (errorMessage.includes('does not exist') || errorMessage.includes('42P01')) {
        debugLog('Таблицы документов не существуют, возвращаем пустой массив');
        setDocuments([]);
        setError(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загрузка шаблонов
  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Если таблица не существует или ошибка доступа, просто возвращаем пустой массив
        if (
          fetchError.code === '42P01' || 
          fetchError.code === 'PGRST116' ||
          fetchError.code === '42501' || // insufficient_privilege
          fetchError.message?.includes('does not exist') ||
          fetchError.message?.includes('permission denied')
        ) {
          debugLog('Таблица document_templates не существует или нет доступа, возвращаем пустой массив:', fetchError);
          setTemplates([]);
          return;
        }
        logError('Ошибка загрузки шаблонов документов:', fetchError);
        throw fetchError;
      }
      setTemplates(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      logError('Ошибка загрузки шаблонов документов:', err);
      
      // Если таблица не существует или нет доступа, не показываем ошибку
      if (
        errorMessage.includes('does not exist') || 
        errorMessage.includes('42P01') ||
        errorMessage.includes('PGRST116') ||
        errorMessage.includes('permission denied') ||
        errorMessage.includes('42501')
      ) {
        debugLog('Таблицы документов не существуют или нет доступа, возвращаем пустой массив');
      } else {
        // Только логируем, не устанавливаем ошибку в state
        debugLog('Ошибка загрузки шаблонов (не критично):', err);
      }
      setTemplates([]);
    }
  }, []);

  // Создание документа из шаблона
  const createDocumentFromTemplate = useCallback(async (
    employeeId: string,
    templateId: string,
    variables: Record<string, string>,
    title?: string
  ): Promise<Document | null> => {
    try {
      // Получаем шаблон
      const { data: template, error: templateError } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !template) throw templateError || new Error('Шаблон не найден');

      // Заменяем переменные в контенте
      let content = template.content;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        content = content.replace(regex, value);
      });

      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();

      // Создаем документ
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          employee_id: employeeId,
          template_id: templateId,
          title: title || template.name,
          content,
          status: 'draft',
          version: 1,
          created_by: currentEmployee?.id,
        })
        .select()
        .single();

      if (docError || !document) throw docError || new Error('Ошибка создания документа');

      await fetchDocuments();
      return document as Document;
    } catch (err) {
      logError('Ошибка создания документа:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      return null;
    }
  }, [fetchDocuments]);

  // Сохранение/обновление документа
  const saveDocument = useCallback(async (document: Partial<Document>): Promise<Document | null> => {
    try {
      if (document.id) {
        const { data, error: updateError } = await supabase
          .from('documents')
          .update(document)
          .eq('id', document.id)
          .select()
          .single();

        if (updateError) throw updateError;
        await fetchDocuments();
        return data;
      } else {
        const { data, error: insertError } = await supabase
          .from('documents')
          .insert(document)
          .select()
          .single();

        if (insertError) throw insertError;
        await fetchDocuments();
        return data;
      }
    } catch (err) {
      logError('Ошибка сохранения документа:', err);
      throw err;
    }
  }, [fetchDocuments]);

  // Создание/обновление шаблона
  const saveTemplate = useCallback(async (template: Partial<DocumentTemplate>): Promise<DocumentTemplate | null> => {
    try {
      // Подготовка данных для вставки/обновления
      const templateData: Partial<DocumentTemplate> = {
        name: template.name,
        type: template.type,
        content: template.content,
        variables: template.variables || [],
        description: template.description || null,
      };

      if (template.id) {
        // Обновление существующего шаблона
        const { data, error: updateError } = await supabase
          .from('document_templates')
          .update(templateData)
          .eq('id', template.id)
          .select()
          .single();

        if (updateError) {
          logError('Ошибка обновления шаблона:', updateError);
          throw updateError;
        }
        await fetchTemplates();
        return data;
      } else {
        // Создание нового шаблона
        // Пытаемся получить текущего сотрудника, но не критично, если не получится
        let createdById: string | undefined = undefined;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            const { data: currentEmployee, error: empError } = await supabase
              .from('employees')
              .select('id')
              .eq('email', user.email)
              .maybeSingle();
            
            if (!empError && currentEmployee) {
              createdById = currentEmployee.id;
            }
          }
        } catch (empErr) {
          debugLog('Не удалось получить текущего сотрудника для created_by, продолжаем без него:', empErr);
        }

        // Подготавливаем данные для вставки
        const insertData: any = { ...templateData };
        
        // Добавляем created_by только если колонка существует
        // Если колонка отсутствует, Supabase вернет ошибку PGRST204
        // В этом случае попробуем без created_by
        if (createdById) {
          insertData.created_by = createdById;
        }

        const { data, error: insertError } = await supabase
          .from('document_templates')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          logError('Ошибка создания шаблона:', insertError);
          
          // Если ошибка связана с отсутствием колонки created_by
          if (insertError.code === 'PGRST204' && insertError.message?.includes('created_by')) {
            debugLog('Колонка created_by отсутствует, пытаемся создать шаблон без неё');
            // Пробуем создать без created_by
            const { data: retryData, error: retryError } = await supabase
              .from('document_templates')
              .insert(templateData)
              .select()
              .single();
            
            if (retryError) {
              logError('Ошибка создания шаблона (повторная попытка):', retryError);
              throw new Error('Не удалось создать шаблон. Выполните SQL скрипт fix_document_templates_created_by.sql в Supabase для добавления колонки created_by.');
            }
            
            await fetchTemplates();
            return retryData;
          }
          
          // Если таблица не существует
          if (insertError.code === 'PGRST116' || insertError.code === '42P01' || insertError.message?.includes('does not exist') || insertError.message?.includes('relation')) {
            throw new Error('Таблица document_templates не существует. Выполните SQL скрипт create_documents_tables.sql в Supabase.');
          }
          
          // Если ошибка RLS политики
          if (insertError.code === '42501' || insertError.message?.includes('permission denied') || insertError.message?.includes('new row violates row-level security')) {
            throw new Error('Нет прав для создания шаблона. Проверьте RLS политики в Supabase.');
          }
          
          throw insertError;
        }
        await fetchTemplates();
        return data;
      }
    } catch (err) {
      logError('Ошибка сохранения шаблона:', err);
      throw err;
    }
  }, [fetchTemplates]);

  // Удаление документа
  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      await fetchDocuments();
    } catch (err) {
      logError('Ошибка удаления документа:', err);
      throw err;
    }
  }, [fetchDocuments]);

  // Удаление шаблона
  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      await fetchTemplates();
    } catch (err) {
      logError('Ошибка удаления шаблона:', err);
      throw err;
    }
  }, [fetchTemplates]);

  // Добавление подписи
  const addSignature = useCallback(async (
    documentId: string,
    signatureData: string,
    signatureType: 'image' | 'digital' | 'stamp' = 'image',
    comment?: string
  ): Promise<DocumentSignature | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: signer } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();

      if (!signer) throw new Error('Пользователь не найден');

      // Получаем порядок подписи
      const { data: existingSignatures } = await supabase
        .from('document_signatures')
        .select('order_index')
        .eq('document_id', documentId)
        .order('order_index', { ascending: false })
        .limit(1);

      const orderIndex = existingSignatures && existingSignatures.length > 0
        ? existingSignatures[0].order_index + 1
        : 0;

      const { data: signature, error: sigError } = await supabase
        .from('document_signatures')
        .insert({
          document_id: documentId,
          signer_id: signer.id,
          signature_data: signatureData,
          signature_type: signatureType,
          comment,
          order_index: orderIndex,
          ip_address: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip).catch(() => null),
          user_agent: navigator.userAgent,
        })
        .select()
        .single();

      if (sigError) throw sigError;

      // Обновляем workflow
      await supabase
        .from('document_signature_workflow')
        .update({ status: 'signed' })
        .eq('document_id', documentId)
        .eq('signer_id', signer.id)
        .eq('status', 'pending');

      await fetchDocuments();
      return signature as DocumentSignature;
    } catch (err) {
      logError('Ошибка добавления подписи:', err);
      throw err;
    }
  }, [fetchDocuments]);

  // Создание workflow подписания
  const createWorkflow = useCallback(async (
    documentId: string,
    signers: Array<{ signer_id: string; role: 'employee' | 'manager' | 'hr' | 'director'; required?: boolean }>
  ) => {
    try {
      const workflowItems = signers.map((signer, index) => ({
        document_id: documentId,
        signer_id: signer.signer_id,
        role: signer.role,
        required: signer.required !== false,
        order_index: index,
        status: 'pending' as const,
      }));

      const { error } = await supabase
        .from('document_signature_workflow')
        .insert(workflowItems);

      if (error) throw error;

      // Обновляем статус документа
      await supabase
        .from('documents')
        .update({ status: 'pending_signature' })
        .eq('id', documentId);

      await fetchDocuments();
    } catch (err) {
      logError('Ошибка создания workflow:', err);
      throw err;
    }
  }, [fetchDocuments]);

  useEffect(() => {
    fetchDocuments();
    fetchTemplates();
  }, [fetchDocuments, fetchTemplates]);

  return {
    documents,
    templates,
    isLoading,
    error,
    fetchDocuments,
    fetchTemplates,
    createDocumentFromTemplate,
    saveDocument,
    saveTemplate,
    deleteDocument,
    deleteTemplate,
    addSignature,
    createWorkflow,
  };
}

