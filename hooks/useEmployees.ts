import { useState, useCallback } from 'react';
import { Employee, Attachment } from '../types';
import { supabase } from '../supabaseClient';

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

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (employeesError) throw employeesError;
      
      let attachmentsData: Attachment[] = [];
      try {
        const { data: att, error: attError } = await supabase
          .from('employee_attachments')
          .select('*');
        if (!attError && att) attachmentsData = att;
      } catch (err) {
        console.warn("Could not fetch attachments, continuing without them.", err);
      }

      if (employeesData) {
        const mergedEmployees = employeesData.map((emp) => ({
          ...emp,
          attachments: attachmentsData.filter((att) => att.employee_id === emp.id)
        }));
        setEmployees(mergedEmployees as Employee[]);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error fetching employees:', error);
        console.error('Ошибка загрузки сотрудников: ' + error.message);
      } else {
        console.error('Unknown error fetching employees:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      const { error: empError } = await supabase.from('employees').upsert(payload);
      
      if (empError) {
        console.error("Supabase Save Error:", empError);
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
          console.warn("Attachment saving failed (table missing?), skipping.", attErr);
        }
      }
      await fetchEmployees();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Critical Error:', error.message);
      } else {
        console.error('Unknown error saving employee:', error);
      }
    }
  }, [fetchEmployees]);

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
        console.error("Delete failed", error);
      } else {
        console.error("Unknown error deleting employee:", error);
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
        console.warn('Ошибки при импорте:', errors);
      }
    } catch (error) {
      console.error('Критическая ошибка при импорте:', error);
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

