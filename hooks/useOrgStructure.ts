import { useState, useCallback } from 'react';
import { Department } from '../types';
import { ORGANIZATION_STRUCTURE } from '../constants';
import { supabase } from '../supabaseClient';
import { debugLog, debugWarn, logError } from '../utils/logger';

interface UseOrgStructureReturn {
  orgStructure: Record<string, Department>;
  fetchOrgMetadata: (isOffline: boolean) => Promise<void>;
  handleUpdateOrgStructure: (newStruct: Record<string, Department>, isAdmin: boolean, isOffline: boolean) => Promise<void>;
}

/**
 * Custom hook for organizational structure management
 * Handles fetching and updating org structure metadata
 */
export function useOrgStructure(): UseOrgStructureReturn {
  const [orgStructure, setOrgStructure] = useState<Record<string, Department>>(ORGANIZATION_STRUCTURE);

  const fetchOrgMetadata = useCallback(async (isOffline: boolean) => {
    if (!supabase || isOffline) return;

    try {
      const { data, error } = await supabase.from('org_metadata').select('*');
      if (error) throw error;

      if (data && data.length > 0) {
        const dbOrg: Record<string, Department> = { ...ORGANIZATION_STRUCTURE };
        debugLog('Загружаем данные из org_metadata. Всего записей:', data.length);

        data.forEach((item: Record<string, unknown>) => {
          if (item.type === 'company' && dbOrg['owner']) {
            dbOrg['owner'].goal = item.goal as string | undefined;
            dbOrg['owner'].vfp = item.vfp as string | undefined;
            dbOrg['owner'].manager = (item.manager as string) || dbOrg['owner'].manager;
          } else if (item.type === 'department' && typeof item.node_id === 'string') {
            if (!dbOrg[item.node_id]) {
              return;
            }
            const content = item.content as Partial<Department> | null;
            const description = (item.description as string)?.trim() || content?.description || dbOrg[item.node_id].description;
            const longDescription = (item.long_description as string)?.trim() || content?.longDescription || dbOrg[item.node_id].longDescription;
            const goal = (item.goal as string)?.trim() || content?.goal || dbOrg[item.node_id].goal;
            const vfp = (item.vfp as string)?.trim() || content?.vfp || dbOrg[item.node_id].vfp;
            const manager = (item.manager as string)?.trim() || content?.manager || dbOrg[item.node_id].manager;

            dbOrg[item.node_id] = {
              ...dbOrg[item.node_id],
              ...content,
              description: description,
              longDescription: longDescription,
              goal: goal,
              vfp: vfp,
              manager: manager,
              functions: Array.isArray(content?.functions) ? content.functions : (dbOrg[item.node_id].functions || []),
              troubleSigns: Array.isArray(content?.troubleSigns) ? content.troubleSigns : (dbOrg[item.node_id].troubleSigns || []),
              developmentActions: Array.isArray(content?.developmentActions) ? content.developmentActions : (dbOrg[item.node_id].developmentActions || []),
            };
          } else if (item.type === 'subdepartment') {
            for (const d in dbOrg) {
              if (dbOrg[d].departments && typeof item.node_id === 'string' && dbOrg[d].departments![item.node_id]) {
                const content = item.content as Partial<Department> | null;
                const vfp = (item.vfp as string) || content?.vfp;
                const manager = (item.manager as string) || content?.manager;
                const description = (item.description as string) || content?.description;

                dbOrg[d].departments![item.node_id] = {
                  ...dbOrg[d].departments![item.node_id],
                  ...content,
                  vfp: vfp || dbOrg[d].departments![item.node_id].vfp,
                  manager: manager || dbOrg[d].departments![item.node_id].manager,
                  description: description || dbOrg[d].departments![item.node_id].description,
                };
              }
            }
          }
        });

        // Убеждаемся, что dept7 всегда присутствует (на случай, если он был удален)
        if (!dbOrg['dept7'] && ORGANIZATION_STRUCTURE['dept7']) {
          dbOrg['dept7'] = { ...ORGANIZATION_STRUCTURE['dept7'] };
        }

        // Сравнение объектов чтобы избежать лишних ререндеров
        setOrgStructure(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(dbOrg)) {
            debugLog('Структура организации обновлена из БД');
            return dbOrg;
          }
          return prev;
        });
      }
    } catch (err) {
      debugWarn("Table org_metadata not found or inaccessible. Using default structure.", err);
    }
  }, []);

  const handleUpdateOrgStructure = useCallback(async (
    newStruct: Record<string, Department>,
    isAdmin: boolean,
    isOffline: boolean
  ) => {
    // Убеждаемся, что dept7 всегда присутствует в структуре
    if (!newStruct['dept7'] && ORGANIZATION_STRUCTURE['dept7']) {
      debugWarn('dept7 отсутствует в newStruct, восстанавливаем из дефолтной структуры');
      newStruct['dept7'] = { ...ORGANIZATION_STRUCTURE['dept7'] };
    }

    // Сначала обновляем локальное состояние для немедленного отображения
    setOrgStructure(newStruct);
    if (!isAdmin || isOffline || !supabase) return;

    try {
      // Сохраняем изменения для каждого департамента и поддепартамента
      const updates: Array<Promise<unknown>> = [];

      // Сохраняем данные компании (owner)
      if (newStruct['owner']) {
        const owner = newStruct['owner'];
        updates.push(
          (async () => {
            const result = await supabase.from('org_metadata').upsert({
              type: 'company',
              node_id: 'owner',
              goal: owner.goal || null,
              vfp: owner.vfp || null,
              manager: owner.manager || null,
              content: {
                goal: owner.goal,
                vfp: owner.vfp,
                manager: owner.manager,
              }
            }, {
              onConflict: 'type,node_id'
            });
            if (result.error) {
              logError('Ошибка сохранения компании:', result.error);
            }
            return result;
          })()
        );
      }

      // Сохраняем данные департаментов
      for (const deptId in newStruct) {
        if (deptId === 'owner') continue;

        const dept = newStruct[deptId];

        // Подготавливаем content с правильной обработкой массивов
        const content: Record<string, unknown> = {
          name: dept.name || '',
          fullName: dept.fullName || '',
          description: dept.description || '',
          longDescription: dept.longDescription || dept.description || '',
          vfp: dept.vfp || null,
          goal: dept.goal || null,
          manager: dept.manager || '',
          mainStat: dept.mainStat || null,
          functions: Array.isArray(dept.functions) ? dept.functions : [],
          troubleSigns: Array.isArray(dept.troubleSigns) ? dept.troubleSigns : [],
          developmentActions: Array.isArray(dept.developmentActions) ? dept.developmentActions : [],
        };

        updates.push(
          (async () => {
            const result = await supabase.from('org_metadata').upsert({
              type: 'department',
              node_id: deptId,
              manager: dept.manager || null,
              goal: dept.goal || null,
              vfp: dept.vfp || null,
              description: dept.description || null,
              long_description: dept.longDescription || dept.description || null,
              content: content
            }, {
              onConflict: 'type,node_id'
            });
            if (result.error) {
              logError(`Ошибка сохранения департамента ${deptId}:`, result.error);
            }
            return result;
          })()
        );

        // Сохраняем поддепартаменты
        if (dept.departments) {
          for (const subDeptId in dept.departments) {
            const subDept = dept.departments[subDeptId];
            const subContent: Record<string, unknown> = {
              name: subDept.name || '',
              code: subDept.code || '',
              description: subDept.description || '',
              vfp: subDept.vfp || null,
              manager: subDept.manager || '',
            };

            updates.push(
              (async () => {
                const result = await supabase.from('org_metadata').upsert({
                  type: 'subdepartment',
                  node_id: subDeptId,
                  manager: subDept.manager || null,
                  vfp: subDept.vfp || null,
                  description: subDept.description || null,
                  content: subContent
                }, {
                  onConflict: 'type,node_id'
                });
                if (result.error) {
                  logError(`Ошибка сохранения поддепартамента ${subDeptId}:`, result.error);
                }
                return result;
              })()
            );
          }
        }
      }

      const results = await Promise.allSettled(updates);

      // Проверяем результаты
      const errors: string[] = [];
      const successes: number[] = [];

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          errors.push(`Запрос ${index + 1}: ${result.reason}`);
        } else if (result.value && typeof result.value === 'object' && 'error' in result.value) {
          const supabaseResult = result.value as { error?: { message: string } };
          if (supabaseResult.error) {
            errors.push(`Запрос ${index + 1}: ${supabaseResult.error.message}`);
          } else {
            successes.push(index);
          }
        } else {
          successes.push(index);
        }
      });

      if (errors.length > 0) {
        debugWarn('Некоторые данные не сохранились:', errors);
        debugLog('Успешно сохранено:', successes.length, 'из', results.length);
      } else {
        debugLog('Все данные успешно сохранены в БД:', successes.length, 'записей');
      }

      // После сохранения перезагружаем данные из БД для синхронизации
      // Это гарантирует, что мы видим актуальные данные
      if (!isOffline && successes.length > 0) {
        await fetchOrgMetadata(isOffline);
      }
    } catch (err) {
      if (err instanceof Error) {
        logError("Failed to save org structure", err);
      } else {
        logError("Unknown error saving org structure:", err);
      }
      // В случае ошибки все равно обновляем локальное состояние
      setOrgStructure(newStruct);
    }
  }, [fetchOrgMetadata]);

  return {
    orgStructure,
    fetchOrgMetadata,
    handleUpdateOrgStructure,
  };
}

