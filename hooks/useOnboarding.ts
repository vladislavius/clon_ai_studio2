import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { OnboardingInstance, OnboardingTask, OnboardingTemplate, OnboardingTaskTemplate } from '../types';
import { logError, debugLog } from '../utils/logger';

export function useOnboarding() {
  const [instances, setInstances] = useState<OnboardingInstance[]>([]);
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка всех экземпляров онбординга
  const fetchInstances = useCallback(async () => {
    if (!supabase) {
      debugLog('Supabase не инициализирован');
      setInstances([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('onboarding_instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        debugLog('Ошибка загрузки onboarding_instances:', {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint
        });
        
        // Если ошибка связана с отсутствием колонки в RLS политике (42703)
        if (fetchError.code === '42703' && fetchError.message?.includes('is_admin')) {
          debugLog('Ошибка в RLS политиках: используется несуществующая колонка is_admin. Выполните скрипт fix_onboarding_rls_policies.sql');
          setInstances([]);
          setError('Ошибка в RLS политиках. Выполните скрипт fix_onboarding_rls_policies.sql в Supabase');
          setIsLoading(false);
          return;
        }
        
        // Если таблица не существует или ошибка 400 (может быть кеш схемы)
        if (fetchError.code === '42P01' || 
            fetchError.code === 'PGRST116' || 
            fetchError.code === 'PGRST301' ||
            fetchError.message?.includes('does not exist') || 
            fetchError.message?.includes('relation') || 
            fetchError.message?.includes('не существует') ||
            fetchError.message?.includes('schema cache')) {
          debugLog('Таблица onboarding_instances не существует или не видна (возможно, нужно обновить кеш схемы), возвращаем пустой массив');
          setInstances([]);
          setError(null);
          setIsLoading(false);
          return;
        }
        throw fetchError;
      }

      // Загружаем задачи и сотрудников для каждого экземпляра
      const instancesWithTasks = await Promise.all(
        (data || []).map(async (instance) => {
          try {
            // Загружаем задачи
            let tasksData = null;
            if (supabase) {
              const { data } = await supabase
                .from('onboarding_tasks')
                .select('*')
                .eq('instance_id', instance.id)
                .order('order_index', { ascending: true });
              tasksData = data;
            }

            // Загружаем сотрудника
            let employee = null;
            if (instance.employee_id && supabase) {
              const { data: empData } = await supabase
                .from('employees')
                .select('id, full_name, email, position, photo_url')
                .eq('id', instance.employee_id)
                .single();
              employee = empData;
            }

            return {
              ...instance,
              tasks: tasksData || [],
              employee,
            } as OnboardingInstance;
          } catch (err) {
            logError('Ошибка загрузки связанных данных для онбординга:', err);
            return {
              ...instance,
              tasks: [],
              employee: null,
            } as OnboardingInstance;
          }
        })
      );

      setInstances(instancesWithTasks);
      setError(null);
    } catch (err) {
      logError('Ошибка загрузки экземпляров онбординга:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setInstances([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загрузка шаблонов
  const fetchTemplates = useCallback(async () => {
    if (!supabase) {
      debugLog('Supabase не инициализирован');
      setTemplates([]);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('onboarding_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Если таблица не существует, просто возвращаем пустой массив
        if (fetchError.code === '42P01' || fetchError.code === 'PGRST116' || fetchError.message?.includes('does not exist') || fetchError.message?.includes('relation') || fetchError.message?.includes('не существует')) {
          debugLog('Таблица onboarding_templates не существует, возвращаем пустой массив');
          setTemplates([]);
          return;
        }
        throw fetchError;
      }
      setTemplates(data || []);
    } catch (err) {
      logError('Ошибка загрузки шаблонов онбординга:', err);
      setTemplates([]);
    }
  }, []);

  // Создание экземпляра онбординга из шаблона
  const createInstanceFromTemplate = useCallback(async (
    employeeId: string,
    templateId: string,
    startDate: string = new Date().toISOString().split('T')[0]
  ): Promise<OnboardingInstance | null> => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }

    try {
      debugLog('Создание экземпляра онбординга:', { employeeId, templateId, startDate });
      
      // Получаем шаблон
      const { data: template, error: templateError } = await supabase
        .from('onboarding_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) {
        debugLog('Ошибка загрузки шаблона (код):', templateError.code);
        debugLog('Ошибка загрузки шаблона (сообщение):', templateError.message);
        
        // Если таблица не существует
        if (templateError.code === '42P01' || templateError.code === 'PGRST116' || templateError.message?.includes('does not exist') || templateError.message?.includes('relation') || templateError.message?.includes('не существует')) {
          const errorMsg = 'Таблица onboarding_templates не существует. Пожалуйста, выполните SQL скрипт create_onboarding_tables.sql в Supabase.';
          logError(errorMsg);
          throw new Error(errorMsg);
        }
        throw templateError;
      }

      if (!template) {
        throw new Error('Шаблон не найден');
      }

      // Создаем экземпляр
      const { data: instance, error: instanceError } = await supabase
        .from('onboarding_instances')
        .insert({
          employee_id: employeeId,
          template_id: templateId,
          start_date: startDate,
          status: 'in_progress',
          progress_percentage: 0,
        })
        .select()
        .single();

      if (instanceError) {
        debugLog('Ошибка создания экземпляра (код):', instanceError.code);
        debugLog('Ошибка создания экземпляра (сообщение):', instanceError.message);
        
        // Если таблица не существует
        if (instanceError.code === '42P01' || instanceError.code === 'PGRST116' || instanceError.message?.includes('does not exist') || instanceError.message?.includes('relation') || instanceError.message?.includes('не существует')) {
          const errorMsg = 'Таблица onboarding_instances не существует. Пожалуйста, выполните SQL скрипт create_onboarding_tables.sql в Supabase.';
          logError(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Если ошибка RLS политики
        if (instanceError.code === '42501' || instanceError.message?.includes('permission denied') || instanceError.message?.includes('new row violates row-level security')) {
          const errorMsg = 'Нет прав для создания экземпляра онбординга. Проверьте RLS политики в Supabase.';
          logError(errorMsg, instanceError);
          throw new Error(errorMsg);
        }
        
        throw instanceError;
      }

      if (!instance) {
        throw new Error('Ошибка создания экземпляра: данные не возвращены');
      }

      debugLog('Экземпляр онбординга успешно создан:', instance.id);

      // Создаем задачи из шаблона
      const tasks = (template.tasks as OnboardingTaskTemplate[]).map((taskTemplate, index) => {
        const startDateObj = new Date(startDate);
        const dueDate = taskTemplate.due_days
          ? new Date(startDateObj.getTime() + taskTemplate.due_days * 24 * 60 * 60 * 1000)
          : null;

        return {
          instance_id: instance.id,
          title: taskTemplate.title,
          description: taskTemplate.description,
          category: taskTemplate.category,
          assigned_to: taskTemplate.assigned_to,
          due_date: dueDate?.toISOString().split('T')[0] || null,
          order_index: taskTemplate.order_index ?? index,
          completed: false,
          attachments: [],
        };
      });

      if (tasks.length > 0) {
        const { error: tasksError } = await supabase
          .from('onboarding_tasks')
          .insert(tasks);

        if (tasksError) {
          debugLog('Ошибка создания задач (код):', tasksError.code);
          debugLog('Ошибка создания задач (сообщение):', tasksError.message);
          
          // Если таблица не существует
          if (tasksError.code === '42P01' || tasksError.code === 'PGRST116' || tasksError.message?.includes('does not exist') || tasksError.message?.includes('relation') || tasksError.message?.includes('не существует')) {
            const errorMsg = 'Таблица onboarding_tasks не существует. Пожалуйста, выполните SQL скрипт create_onboarding_tables.sql в Supabase.';
            logError(errorMsg);
            throw new Error(errorMsg);
          }
          
          throw tasksError;
        }
        
        debugLog('Задачи онбординга успешно созданы:', tasks.length);
      }

      await fetchInstances();
      return instance as OnboardingInstance;
    } catch (err) {
      logError('Ошибка создания экземпляра онбординга:', err);
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      throw err; // Пробрасываем ошибку дальше, чтобы компонент мог её обработать
    }
  }, [fetchInstances]);

  // Обновление задачи
  const updateTask = useCallback(async (taskId: string, updates: Partial<OnboardingTask>) => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }

    try {
      const updateData: any = { ...updates };
      
      if (updates.completed) {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.completed === false) {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }

      const { error: updateError } = await supabase
        .from('onboarding_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Пересчитываем прогресс
      const task = instances
        .flatMap(i => i.tasks || [])
        .find(t => t.id === taskId);
      
      if (task) {
        await updateInstanceProgress(task.instance_id);
      }

      await fetchInstances();
    } catch (err) {
      logError('Ошибка обновления задачи:', err);
      throw err;
    }
  }, [instances, fetchInstances]);

  // Обновление прогресса экземпляра
  const updateInstanceProgress = useCallback(async (instanceId: string) => {
    if (!supabase) {
      return;
    }

    try {
      const { data: tasks } = await supabase
        .from('onboarding_tasks')
        .select('completed')
        .eq('instance_id', instanceId);

      if (!tasks) return;

      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      const status = progress === 100 ? 'completed' : 'in_progress';

      await supabase
        .from('onboarding_instances')
        .update({
          progress_percentage: progress,
          status,
        })
        .eq('id', instanceId);

      await fetchInstances();
    } catch (err) {
      logError('Ошибка обновления прогресса:', err);
    }
  }, [fetchInstances]);

  // Создание/обновление шаблона
  const saveTemplate = useCallback(async (template: Partial<OnboardingTemplate>): Promise<OnboardingTemplate | null> => {
    if (!supabase) {
      const errorMsg = 'Supabase не инициализирован';
      logError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      debugLog('Сохранение шаблона онбординга:', { id: template.id, name: template.name });
      
      if (template.id) {
        const { data, error: updateError } = await supabase
          .from('onboarding_templates')
          .update(template)
          .eq('id', template.id)
          .select()
          .single();

        if (updateError) {
          debugLog('Ошибка обновления шаблона (код):', updateError.code);
          debugLog('Ошибка обновления шаблона (сообщение):', updateError.message);
          
          // Если таблица не существует
          if (updateError.code === '42P01' || updateError.code === 'PGRST116' || updateError.message?.includes('does not exist') || updateError.message?.includes('relation') || updateError.message?.includes('не существует')) {
            const errorMsg = 'Таблица onboarding_templates не существует. Пожалуйста, выполните SQL скрипт create_onboarding_tables.sql в Supabase.';
            logError(errorMsg);
            throw new Error(errorMsg);
          }
          
          // Если ошибка RLS политики
          if (updateError.code === '42501' || updateError.message?.includes('permission denied') || updateError.message?.includes('new row violates row-level security')) {
            const errorMsg = 'Нет прав для сохранения шаблона. Проверьте RLS политики в Supabase.';
            logError(errorMsg, updateError);
            throw new Error(errorMsg);
          }
          
          throw updateError;
        }
        
        debugLog('Шаблон успешно обновлен:', data?.id);
        await fetchTemplates();
        return data;
      } else {
        const { data, error: insertError } = await supabase
          .from('onboarding_templates')
          .insert(template)
          .select()
          .single();

        if (insertError) {
          debugLog('Ошибка создания шаблона (код):', insertError.code);
          debugLog('Ошибка создания шаблона (сообщение):', insertError.message);
          
          // Если таблица не существует
          if (insertError.code === '42P01' || insertError.code === 'PGRST116' || insertError.message?.includes('does not exist') || insertError.message?.includes('relation') || insertError.message?.includes('не существует')) {
            const errorMsg = 'Таблица onboarding_templates не существует. Пожалуйста, выполните SQL скрипт create_onboarding_tables.sql в Supabase.';
            logError(errorMsg);
            throw new Error(errorMsg);
          }
          
          // Если ошибка RLS политики
          if (insertError.code === '42501' || insertError.message?.includes('permission denied') || insertError.message?.includes('new row violates row-level security')) {
            const errorMsg = 'Нет прав для создания шаблона. Проверьте RLS политики в Supabase.';
            logError(errorMsg, insertError);
            throw new Error(errorMsg);
          }
          
          throw insertError;
        }
        
        debugLog('Шаблон успешно создан:', data?.id);
        await fetchTemplates();
        return data;
      }
    } catch (err) {
      logError('Ошибка сохранения шаблона:', err);
      throw err;
    }
  }, [fetchTemplates]);

  // Удаление шаблона
  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }

    try {
      const { error } = await supabase
        .from('onboarding_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      await fetchTemplates();
    } catch (err) {
      logError('Ошибка удаления шаблона:', err);
      throw err;
    }
  }, [fetchTemplates]);

  // Удаление экземпляра
  const deleteInstance = useCallback(async (instanceId: string) => {
    if (!supabase) {
      throw new Error('Supabase не инициализирован');
    }

    try {
      const { error } = await supabase
        .from('onboarding_instances')
        .delete()
        .eq('id', instanceId);

      if (error) throw error;
      await fetchInstances();
    } catch (err) {
      logError('Ошибка удаления экземпляра:', err);
      throw err;
    }
  }, [fetchInstances]);

  useEffect(() => {
    fetchInstances();
    fetchTemplates();
  }, [fetchInstances, fetchTemplates]);

  return {
    instances,
    templates,
    isLoading,
    error,
    fetchInstances,
    fetchTemplates,
    createInstanceFromTemplate,
    updateTask,
    updateInstanceProgress,
    saveTemplate,
    deleteTemplate,
    deleteInstance,
  };
}

