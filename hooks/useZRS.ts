import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { ZRSData } from '../components/ZRSForm';
import { Employee } from '../types';
import { logError, debugLog } from '../utils/logger';

export interface ZRSDocument extends ZRSData {
  id: string;
  employee_id?: string;
  employee?: Employee;
  approved_by?: string;
  approver?: Employee;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export function useZRS() {
  const [zrsDocuments, setZrsDocuments] = useState<ZRSDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка всех ЗРС
  const fetchZRS = useCallback(async () => {
    if (!supabase) {
      debugLog('Supabase не инициализирован');
      setZrsDocuments([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('zrs_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Если таблица не существует, просто возвращаем пустой массив
        if (fetchError.code === '42P01' || fetchError.code === 'PGRST116' || fetchError.message?.includes('does not exist') || fetchError.message?.includes('relation') || fetchError.message?.includes('не существует')) {
          debugLog('Таблица zrs_documents не существует, возвращаем пустой массив');
          setZrsDocuments([]);
          setError(null);
          setIsLoading(false);
          return;
        }
        logError('Ошибка загрузки ЗРС:', fetchError);
        setZrsDocuments([]);
        setError(fetchError.message || 'Ошибка загрузки ЗРС');
        setIsLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setZrsDocuments([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      // Оптимизация: собираем все уникальные ID для batch запросов
      const employeeIds = new Set<string>();
      const approverIds = new Set<string>();

      data.forEach(zrs => {
        if (zrs.employee_id) employeeIds.add(zrs.employee_id);
        if (zrs.approved_by) approverIds.add(zrs.approved_by);
      });

      // Загружаем всех employees одним запросом
      const allEmployeeIds = Array.from(new Set([...employeeIds, ...approverIds]));
      const employeesMap = new Map<string, any>();
      
      if (allEmployeeIds.length > 0) {
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id, full_name, email, position, photo_url')
          .in('id', allEmployeeIds);
        
        if (employeesData) {
          employeesData.forEach(emp => employeesMap.set(emp.id, emp));
        }
      }

      // Собираем финальные ЗРС с данными из кеша
      const zrsWithDetails = data.map((zrs) => {
        return {
          ...zrs,
          employee: zrs.employee_id ? employeesMap.get(zrs.employee_id) || null : null,
          approver: zrs.approved_by ? employeesMap.get(zrs.approved_by) || null : null,
        } as ZRSDocument;
      });

      setZrsDocuments(zrsWithDetails);
      setError(null);
    } catch (err) {
      logError('Ошибка загрузки ЗРС:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setZrsDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Создание нового ЗРС
  const createZRS = useCallback(async (zrs: ZRSData, employeeId: string): Promise<ZRSDocument | null> => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }
    
    try {
      debugLog('Создание ЗРС:', { employeeId, status: zrs.status, to_whom: zrs.to_whom });
      
      const insertData = {
        employee_id: employeeId,
        to_whom: zrs.to_whom,
        from_whom: zrs.from_whom,
        situation: zrs.situation,
        data: zrs.data,
        solution: zrs.solution,
        status: zrs.status || 'draft',
      };
      
      debugLog('Данные для вставки:', insertData);

      const { data, error: createError } = await supabase
        .from('zrs_documents')
        .insert(insertData)
        .select()
        .single();

      if (createError) {
        debugLog('Ошибка создания ЗРС (код):', createError.code);
        debugLog('Ошибка создания ЗРС (сообщение):', createError.message);
        debugLog('Ошибка создания ЗРС (детали):', createError);
        
        // Если таблица не существует, выводим понятное сообщение
        if (createError.code === '42P01' || createError.code === 'PGRST116' || createError.message?.includes('does not exist') || createError.message?.includes('relation') || createError.message?.includes('не существует')) {
          const errorMsg = 'Таблица zrs_documents не существует. Пожалуйста, выполните SQL скрипт create_zrs_table.sql в Supabase.';
          logError(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Если ошибка RLS политики
        if (createError.code === '42501' || createError.message?.includes('permission denied') || createError.message?.includes('new row violates row-level security')) {
          const errorMsg = 'Нет прав для создания ЗРС. Проверьте RLS политики в Supabase.';
          logError(errorMsg, createError);
          throw new Error(errorMsg);
        }
        
        logError('Ошибка создания ЗРС:', createError);
        throw createError;
      }

      if (!data) {
        throw new Error('Не удалось создать ЗРС: данные не возвращены');
      }

      debugLog('ЗРС успешно создан:', data.id);

      // Обновляем список
      await fetchZRS();
      return data as ZRSDocument;
    } catch (err) {
      logError('Ошибка создания ЗРС:', err);
      throw err;
    }
  }, [fetchZRS]);

  // Обновление ЗРС
  const updateZRS = useCallback(async (id: string, updates: Partial<ZRSData>): Promise<void> => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }
    
    try {
      const { error: updateError } = await supabase
        .from('zrs_documents')
        .update({
          to_whom: updates.to_whom,
          from_whom: updates.from_whom,
          situation: updates.situation,
          data: updates.data,
          solution: updates.solution,
          status: updates.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Обновляем список
      await fetchZRS();
    } catch (err) {
      logError('Ошибка обновления ЗРС:', err);
      throw err;
    }
  }, [fetchZRS]);

  // Одобрение ЗРС
  const approveZRS = useCallback(async (id: string, approverId: string): Promise<void> => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }
    
    try {
      const { error: updateError } = await supabase
        .from('zrs_documents')
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Обновляем список
      await fetchZRS();
    } catch (err) {
      logError('Ошибка одобрения ЗРС:', err);
      throw err;
    }
  }, [fetchZRS]);

  // Отклонение ЗРС
  const rejectZRS = useCallback(async (id: string, approverId: string, reason: string): Promise<void> => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }
    
    try {
      const { error: updateError } = await supabase
        .from('zrs_documents')
        .update({
          status: 'rejected',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Обновляем список
      await fetchZRS();
    } catch (err) {
      logError('Ошибка отклонения ЗРС:', err);
      throw err;
    }
  }, [fetchZRS]);

  // Удаление ЗРС
  const deleteZRS = useCallback(async (id: string): Promise<void> => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }
    
    try {
      const { error: deleteError } = await supabase
        .from('zrs_documents')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // Обновляем список
      await fetchZRS();
    } catch (err) {
      logError('Ошибка удаления ЗРС:', err);
      throw err;
    }
  }, [fetchZRS]);

  // Загружаем данные при монтировании
  useEffect(() => {
    fetchZRS();
  }, [fetchZRS]);

  return {
    zrsDocuments,
    isLoading,
    error,
    fetchZRS,
    createZRS,
    updateZRS,
    approveZRS,
    rejectZRS,
    deleteZRS,
  };
}

