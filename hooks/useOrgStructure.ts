import { useState, useCallback } from 'react';
import { Department, SubDepartment, DepartmentSection } from '../types';
import { ORGANIZATION_STRUCTURE } from '../constants';
import { supabase } from '../supabaseClient';
import { debugLog, debugWarn, logError } from '../utils/logger';
import { initializeOrgStructureData } from '../utils/orgStructureData';

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
  // Инициализируем структуру с данными из orgStructureData
  const initialData = initializeOrgStructureData();
  const mergedStructure: Record<string, Department> = { ...ORGANIZATION_STRUCTURE };
  
  // Применяем данные из orgStructureData к структуре
  Object.keys(initialData).forEach(deptId => {
    if (mergedStructure[deptId] && initialData[deptId]) {
      const existingDept = mergedStructure[deptId];
      const newDeptData = initialData[deptId]!;
      
      // Объединяем поддепартаменты, сохраняя секции
      const mergedDepartments: Record<string, SubDepartment> = {
        ...existingDept.departments
      };
      
      if (newDeptData.departments) {
        Object.keys(newDeptData.departments).forEach(subDeptId => {
          if (mergedDepartments[subDeptId]) {
            // Объединяем существующий поддепартамент с новыми данными
            mergedDepartments[subDeptId] = {
              ...mergedDepartments[subDeptId],
              ...newDeptData.departments![subDeptId],
              // Сохраняем секции, объединяя их
              sections: {
                ...mergedDepartments[subDeptId].sections,
                ...(newDeptData.departments![subDeptId].sections || {})
              }
            };
          } else {
            // Добавляем новый поддепартамент
            mergedDepartments[subDeptId] = newDeptData.departments![subDeptId];
          }
        });
      }
      
      mergedStructure[deptId] = {
        ...existingDept,
        ...newDeptData,
        departments: mergedDepartments
      };
    }
  });
  
  const [orgStructure, setOrgStructure] = useState<Record<string, Department>>(mergedStructure);

  const fetchOrgMetadata = useCallback(async (isOffline: boolean) => {
    if (!supabase || isOffline) return;

    try {
      const { data, error } = await supabase.from('org_metadata').select('*');
      if (error) throw error;

      if (data && data.length > 0) {
        // Начинаем с объединенной структуры (ORGANIZATION_STRUCTURE + orgStructureData)
        const initialData = initializeOrgStructureData();
        const baseStructure: Record<string, Department> = { ...ORGANIZATION_STRUCTURE };
        
        // Применяем данные из orgStructureData
        Object.keys(initialData).forEach(deptId => {
          if (baseStructure[deptId] && initialData[deptId]) {
            const existingDept = baseStructure[deptId];
            const newDeptData = initialData[deptId]!;
            
            // Объединяем поддепартаменты, сохраняя секции
            const mergedDepartments: Record<string, SubDepartment> = {
              ...existingDept.departments
            };
            
            if (newDeptData.departments) {
              Object.keys(newDeptData.departments).forEach(subDeptId => {
                if (mergedDepartments[subDeptId]) {
                  // Объединяем существующий поддепартамент с новыми данными
                  mergedDepartments[subDeptId] = {
                    ...mergedDepartments[subDeptId],
                    ...newDeptData.departments![subDeptId],
                    // Сохраняем секции, объединяя их
                    sections: {
                      ...mergedDepartments[subDeptId].sections,
                      ...(newDeptData.departments![subDeptId].sections || {})
                    }
                  };
                } else {
                  // Добавляем новый поддепартамент
                  mergedDepartments[subDeptId] = newDeptData.departments![subDeptId];
                }
              });
            }
            
            baseStructure[deptId] = {
              ...existingDept,
              ...newDeptData,
              departments: mergedDepartments
            };
          }
        });
        
        const dbOrg: Record<string, Department> = { ...baseStructure };
        debugLog('Загружаем данные из org_metadata. Всего записей:', data.length);

        data.forEach((item: Record<string, unknown>) => {
          if (item.type === 'company' && dbOrg['owner']) {
            dbOrg['owner'].goal = item.goal as string | undefined;
            dbOrg['owner'].vfp = item.vfp as string | undefined;
            // Сохраняем пустую строку, если она была сохранена, иначе используем дефолт
            dbOrg['owner'].manager = (item.manager !== null && item.manager !== undefined) 
              ? (item.manager as string).trim() 
              : dbOrg['owner'].manager;
          } else if (item.type === 'department' && typeof item.node_id === 'string') {
            if (!dbOrg[item.node_id]) {
              return;
            }
            const content = item.content as Partial<Department> | null;
            const description = (item.description as string)?.trim() || content?.description || dbOrg[item.node_id].description;
            const longDescription = (item.long_description as string)?.trim() || content?.longDescription || dbOrg[item.node_id].longDescription;
            const goal = (item.goal as string)?.trim() || content?.goal || dbOrg[item.node_id].goal;
            const vfp = (item.vfp as string)?.trim() || content?.vfp || dbOrg[item.node_id].vfp;
            // Сохраняем пустую строку, если она была сохранена, иначе используем дефолт
            const manager = (item.manager !== null && item.manager !== undefined)
              ? (item.manager as string).trim()
              : (content?.manager || dbOrg[item.node_id].manager);

            dbOrg[item.node_id] = {
              ...dbOrg[item.node_id],
              ...content,
              description: description,
              longDescription: longDescription,
              goal: goal,
              vfp: vfp,
              manager: manager,
              mainStat: content?.mainStat || dbOrg[item.node_id].mainStat,
              functions: Array.isArray(content?.functions) ? content.functions : (dbOrg[item.node_id].functions || []),
              troubleSigns: Array.isArray(content?.troubleSigns) ? content.troubleSigns : (dbOrg[item.node_id].troubleSigns || []),
              developmentActions: Array.isArray(content?.developmentActions) ? content.developmentActions : (dbOrg[item.node_id].developmentActions || []),
              tools: Array.isArray(content?.tools) ? content.tools : (dbOrg[item.node_id].tools || []),
              processes: Array.isArray(content?.processes) ? content.processes : (dbOrg[item.node_id].processes || []),
              keyIndicators: Array.isArray(content?.keyIndicators) ? content.keyIndicators : (dbOrg[item.node_id].keyIndicators || []),
              productFlow: content?.productFlow || dbOrg[item.node_id].productFlow,
              connections: Array.isArray(content?.connections) ? content.connections : (dbOrg[item.node_id].connections || []),
              content: content?.content || dbOrg[item.node_id].content,
            };
          } else if (item.type === 'subdepartment') {
            for (const d in dbOrg) {
              if (dbOrg[d].departments && typeof item.node_id === 'string' && dbOrg[d].departments![item.node_id]) {
                const content = item.content as Partial<SubDepartment> | null;
                // Сохраняем пустую строку, если она была сохранена
                const vfp = (item.vfp !== null && item.vfp !== undefined) 
                  ? (item.vfp as string).trim() 
                  : (content?.vfp || dbOrg[d].departments![item.node_id].vfp);
                const manager = (item.manager !== null && item.manager !== undefined)
                  ? (item.manager as string).trim()
                  : (content?.manager || dbOrg[d].departments![item.node_id].manager);
                const description = (item.description !== null && item.description !== undefined)
                  ? (item.description as string).trim()
                  : (content?.description || dbOrg[d].departments![item.node_id].description);
                const employeeName = (content?.employeeName !== null && content?.employeeName !== undefined)
                  ? (content.employeeName as string).trim() || undefined
                  : dbOrg[d].departments![item.node_id].employeeName;

                // Объединяем секции из БД с секциями из orgStructureData
                const existingSections = dbOrg[d].departments![item.node_id].sections || {};
                const dbSections = content?.sections || {};
                const mergedSections = {
                  ...existingSections,
                  ...dbSections
                };
                
                // Обрабатываем секции с mainStat
                const processedSections: Record<string, DepartmentSection> = {};
                for (const secId in mergedSections) {
                  const section = mergedSections[secId];
                  const dbSection = dbSections[secId];
                  processedSections[secId] = {
                    ...section,
                    mainStat: dbSection?.mainStat || section.mainStat || undefined,
                  };
                }

                dbOrg[d].departments![item.node_id] = {
                  ...dbOrg[d].departments![item.node_id],
                  ...content,
                  vfp: vfp,
                  goal: content?.goal || dbOrg[d].departments![item.node_id].goal,
                  manager: manager,
                  description: description,
                  longDescription: content?.longDescription || dbOrg[d].departments![item.node_id].longDescription,
                  employeeName: employeeName,
                  mainStat: content?.mainStat || dbOrg[d].departments![item.node_id].mainStat,
                  tasks: Array.isArray(content?.tasks) ? content.tasks : (dbOrg[d].departments![item.node_id].tasks || []),
                  tools: Array.isArray(content?.tools) ? content.tools : (dbOrg[d].departments![item.node_id].tools || []),
                  processes: Array.isArray(content?.processes) ? content.processes : (dbOrg[d].departments![item.node_id].processes || []),
                  responsibilities: Array.isArray(content?.responsibilities) ? content.responsibilities : (dbOrg[d].departments![item.node_id].responsibilities || []),
                  keyIndicators: Array.isArray(content?.keyIndicators) ? content.keyIndicators : (dbOrg[d].departments![item.node_id].keyIndicators || []),
                  troubleSigns: Array.isArray(content?.troubleSigns) ? content.troubleSigns : (dbOrg[d].departments![item.node_id].troubleSigns || []),
                  developmentActions: Array.isArray(content?.developmentActions) ? content.developmentActions : (dbOrg[d].departments![item.node_id].developmentActions || []),
                  sections: processedSections,
                  content: content?.content || dbOrg[d].departments![item.node_id].content,
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
          tools: Array.isArray(dept.tools) ? dept.tools : [],
          processes: Array.isArray(dept.processes) ? dept.processes : [],
          keyIndicators: Array.isArray(dept.keyIndicators) ? dept.keyIndicators : [],
          productFlow: dept.productFlow || null,
          connections: Array.isArray(dept.connections) ? dept.connections : [],
          content: dept.content || null,
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
            // Обрабатываем секции с mainStat
            const sectionsWithMainStat: Record<string, DepartmentSection> = {};
            if (subDept.sections) {
              for (const secId in subDept.sections) {
                const section = subDept.sections[secId];
                sectionsWithMainStat[secId] = {
                  ...section,
                  mainStat: section.mainStat || undefined,
                };
              }
            }

            const subContent: Record<string, unknown> = {
              name: subDept.name || '',
              code: subDept.code || '',
              description: subDept.description || '',
              longDescription: subDept.longDescription || subDept.description || '',
              vfp: subDept.vfp || null,
              goal: subDept.goal || null,
              manager: subDept.manager || '',
              employeeName: subDept.employeeName || null,
              mainStat: subDept.mainStat || null,
              tasks: Array.isArray(subDept.tasks) ? subDept.tasks : [],
              tools: Array.isArray(subDept.tools) ? subDept.tools : [],
              processes: Array.isArray(subDept.processes) ? subDept.processes : [],
              responsibilities: Array.isArray(subDept.responsibilities) ? subDept.responsibilities : [],
              keyIndicators: Array.isArray(subDept.keyIndicators) ? subDept.keyIndicators : [],
              troubleSigns: Array.isArray(subDept.troubleSigns) ? subDept.troubleSigns : [],
              developmentActions: Array.isArray(subDept.developmentActions) ? subDept.developmentActions : [],
              sections: sectionsWithMainStat,
              content: subDept.content || null,
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

