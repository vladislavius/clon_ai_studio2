import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { Employee, Attachment } from '../types';
import { supabase } from '../supabaseClient';
import { debugLog, debugWarn, logError } from '../utils/logger';

interface UseEmployeesReturn {
  employees: Employee[];
  isLoading: boolean;
  fetchEmployees: () => Promise<void>;
  handleSaveEmployee: (emp: Employee, isAdmin: boolean, isOffline: boolean) => Promise<void>;
  handleDeleteEmployee: (id: string, isAdmin: boolean, isOffline: boolean) => Promise<void>;
  handleImportData: (data: Employee[], isAdmin: boolean, isOffline: boolean) => Promise<void>;
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

/**
 * Custom hook for employee management
 * Handles CRUD operations for employees
 */
export function useEmployees(): UseEmployeesReturn {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false); // Защита от множественных вызовов
  const toast = useToast();

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchEmployees = useCallback(async () => {
    debugLog('[useEmployees] fetchEmployees called, isMounted:', isMountedRef.current);
    if (!isMountedRef.current) return;
    
    // Защита от множественных одновременных вызовов
    if (isFetchingRef.current) {
      debugLog('[useEmployees] Already fetching, skipping duplicate call');
      return;
    }
    
    isFetchingRef.current = true;
    setIsLoading(true);

    if (!supabase) {
      debugLog('[useEmployees] supabase is null, skipping');
      if (isMountedRef.current) setIsLoading(false);
      return;
    }

    try {
      // Проверяем сессию перед запросом
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        debugLog('[useEmployees] No session, skipping fetch');
        if (isMountedRef.current) {
          setEmployees([]);
          setIsLoading(false);
        }
        return;
      }

      debugLog('[useEmployees] Fetching employees from Supabase...', { 
        userId: currentSession.user.id,
        email: currentSession.user.email 
      });
      
      // Оптимизированный запрос: загружаем только employees без JOIN
      // JOIN с attachments может быть медленным, загружаем их отдельно только если нужно
      const startTime = performance.now();
      
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      const fetchTime = performance.now() - startTime;
      debugLog('[useEmployees] Fetch time:', fetchTime.toFixed(2), 'ms');

      debugLog('[useEmployees] Employees result:', { 
        count: employeesData?.length, 
        error: employeesError,
        errorCode: employeesError?.code,
        errorMessage: employeesError?.message
      });

      if (employeesError) {
        // Детальное логирование ошибки для диагностики
        logError('Error fetching employees:', {
          code: employeesError.code,
          message: employeesError.message,
          details: employeesError.details,
          hint: employeesError.hint
        });
        throw employeesError;
      }

      // Загружаем attachments отдельно только если есть сотрудники
      let attachmentsData: Attachment[] = [];
      if (employeesData && employeesData.length > 0) {
        try {
          const { data: att, error: attError } = await supabase
            .from('employee_attachments')
            .select('*');
          if (!attError && att) {
            attachmentsData = att;
          }
        } catch (err) {
          debugWarn("Could not fetch attachments, continuing without them.", err);
        }
      }

      if (employeesData && isMountedRef.current) {
        // Объединяем employees с attachments
        const mergedEmployees = employeesData.map((emp: Employee) => ({
          ...emp,
          attachments: attachmentsData.filter((att) => att.employee_id === emp.id)
        })) as Employee[];
        
        setEmployees(mergedEmployees);
        const totalTime = performance.now() - startTime;
        debugLog('[useEmployees] Successfully loaded', mergedEmployees.length, 'employees in', totalTime.toFixed(2), 'ms');
      } else if (isMountedRef.current) {
        debugLog('[useEmployees] No employees data or component unmounted');
        setEmployees([]);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        logError('Error fetching employees:', error);
        if (isMountedRef.current) {
          toast.error('Ошибка загрузки сотрудников: ' + error.message);
        }
      } else {
        logError('Unknown error fetching employees:', error);
      }
      // Устанавливаем пустой массив при ошибке
      if (isMountedRef.current) {
        setEmployees([]);
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [toast]);

  const sanitizePayload = (emp: Employee) => {
    const { attachments, ...data } = emp;
    const payload: Record<string, unknown> = { ...data };
    const dateFields = ['birth_date', 'join_date', 'passport_date', 'foreign_passport_date'];
    dateFields.forEach(field => {
      if (payload[field] === '') {
        payload[field] = null;
      }
    });
    return { payload, attachments };
  };

  const handleSaveEmployee = useCallback(async (
    emp: Employee,
    isAdmin: boolean,
    isOffline: boolean
  ) => {
    if (!isAdmin) return;

    if (isOffline) {
      setEmployees(prev => {
        const exists = prev.find(e => e.id === emp.id);
        if (exists) return prev.map(e => e.id === emp.id ? emp : e);
        return [emp, ...prev];
      });
      return;
    }

    if (!supabase) return;

    const { payload, attachments } = sanitizePayload(emp);

    try {
      // Optimistic locking: проверяем версию перед сохранением
      if (emp.id && emp.version !== undefined) {
        // Получаем текущую версию из БД
        const { data: currentData } = await supabase
          .from('employees')
          .select('version')
          .eq('id', emp.id)
          .single();

        // Проверяем конфликт версий
        if (currentData && currentData.version !== emp.version) {
          toast.error(
            'Запись была изменена другим пользователем. Обновите страницу для получения актуальных данных.'
          );
          return;
        }
      }

      const { error: empError } = await supabase.from('employees').upsert(payload);

      if (empError) {
        logError("Supabase Save Error:", empError);
        toast.error('Ошибка сохранения: ' + empError.message);
        return;
      }

      if (attachments && attachments.length > 0) {
        try {
          const { data: existingDocs } = await supabase
            .from('employee_attachments')
            .select('id')
            .eq('employee_id', emp.id);

          const existingIds = existingDocs?.map(d => d.id) || [];
          const newIds = attachments.map(a => a.id);
          const idsToDelete = existingIds.filter(id => !newIds.includes(id));

          if (idsToDelete.length > 0) {
            await supabase.from('employee_attachments').delete().in('id', idsToDelete);
          }

          const attachmentsToUpsert = attachments
            .filter(a => a.file_name && a.public_url)
            .map(a => ({
              id: a.id,
              employee_id: emp.id,
              file_name: a.file_name,
              file_type: a.file_type,
              file_size: a.file_size,
              storage_path: a.storage_path,
              public_url: a.public_url,
              uploaded_at: a.uploaded_at
            }));

          if (attachmentsToUpsert.length > 0) {
            await supabase.from('employee_attachments').upsert(attachmentsToUpsert);
          }
        } catch (attErr) {
          debugWarn("Attachment saving failed (table missing?), skipping.", attErr);
        }
      }
      if (isMountedRef.current) {
        await fetchEmployees();
        toast.success('Сотрудник успешно сохранен');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        logError('Critical Error:', error.message);
        if (isMountedRef.current) {
          toast.error('Критическая ошибка: ' + error.message);
        }
      } else {
        logError('Unknown error saving employee:', error);
      }
    }
  }, [fetchEmployees, toast]);

  const handleDeleteEmployee = useCallback(async (
    id: string,
    isAdmin: boolean,
    isOffline: boolean
  ) => {
    if (isOffline) {
      setEmployees(prev => prev.filter(e => e.id !== id));
      return;
    }

    if (!supabase || !isAdmin) return;

    try {
      setIsLoading(true);
      await supabase.from('employee_attachments').delete().eq('employee_id', id);

      const { data: stats } = await supabase
        .from('statistics_definitions')
        .select('id')
        .eq('owner_id', id);

      if (stats && stats.length > 0) {
        const statIds = stats.map(s => s.id);
        await supabase.from('statistics_values').delete().in('definition_id', statIds);
        await supabase.from('statistics_definitions').delete().in('id', statIds);
      }

      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;

      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (error: unknown) {
      if (error instanceof Error) {
        logError("Delete failed", error);
      } else {
        logError("Unknown error deleting employee:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImportData = useCallback(async (
    data: Employee[],
    isAdmin: boolean,
    isOffline: boolean
  ) => {
    if (!isAdmin) return;

    if (isOffline) {
      setEmployees(data);
      return;
    }

    setIsLoading(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      for (const emp of data) {
        try {
          await handleSaveEmployee(emp, isAdmin, isOffline);
          successCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
          errors.push(`${emp.full_name || emp.id}: ${errorMessage}`);
        }
      }

      if (errors.length > 0) {
              debugWarn('Ошибки при импорте:', errors);
      }
    } catch (error) {
      logError('Критическая ошибка при импорте:', error);
    } finally {
      setIsLoading(false);
    }
  }, [handleSaveEmployee]);

  return {
    employees,
    isLoading,
    fetchEmployees,
    handleSaveEmployee,
    handleDeleteEmployee,
    handleImportData,
    setEmployees,
  };
}

