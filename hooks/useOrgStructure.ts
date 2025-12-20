import { useState, useCallback } from 'react';
import { Department } from '../types';
import { ORGANIZATION_STRUCTURE } from '../constants';
import { supabase } from '../supabaseClient';

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
        data.forEach((item: Record<string, unknown>) => {
          if (item.type === 'company' && dbOrg['owner']) {
            dbOrg['owner'].goal = item.goal as string | undefined;
            dbOrg['owner'].vfp = item.vfp as string | undefined;
            dbOrg['owner'].manager = (item.manager as string) || dbOrg['owner'].manager;
          } else if (item.type === 'department' && typeof item.node_id === 'string' && dbOrg[item.node_id]) {
            dbOrg[item.node_id] = { ...dbOrg[item.node_id], ...(item.content as Partial<Department>) };
          } else if (item.type === 'subdepartment') {
            for (const d in dbOrg) {
              if (dbOrg[d].departments && typeof item.node_id === 'string' && dbOrg[d].departments![item.node_id]) {
                dbOrg[d].departments![item.node_id] = {
                  ...dbOrg[d].departments![item.node_id],
                  ...(item.content as Partial<Department>)
                };
              }
            }
          }
        });
        setOrgStructure(dbOrg);
      }
    } catch (err) {
      console.warn("Table org_metadata not found or inaccessible. Using default structure.", err);
    }
  }, []);

  const handleUpdateOrgStructure = useCallback(async (
    newStruct: Record<string, Department>,
    isAdmin: boolean,
    isOffline: boolean
  ) => {
    setOrgStructure(newStruct);
    if (!isAdmin || isOffline || !supabase) return;

    try {
      // Сохраняем изменения для каждого департамента и поддепартамента
      const updates: Array<Promise<unknown>> = [];

      // Сохраняем данные компании (owner)
      if (newStruct['owner']) {
        const owner = newStruct['owner'];
        updates.push(
          supabase.from('org_metadata').upsert({
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
          }, { onConflict: 'type,node_id' })
        );
      }

      // Сохраняем данные департаментов
      for (const deptId in newStruct) {
        if (deptId === 'owner') continue;
        
        const dept = newStruct[deptId];
        updates.push(
          supabase.from('org_metadata').upsert({
            type: 'department',
            node_id: deptId,
            manager: dept.manager || null,
            content: {
              name: dept.name,
              fullName: dept.fullName,
              description: dept.description,
              longDescription: dept.longDescription,
              vfp: dept.vfp,
              goal: dept.goal,
              manager: dept.manager,
              mainStat: dept.mainStat,
              functions: dept.functions,
              troubleSigns: dept.troubleSigns,
              developmentActions: dept.developmentActions,
            }
          }, { onConflict: 'type,node_id' })
        );

        // Сохраняем поддепартаменты
        if (dept.departments) {
          for (const subDeptId in dept.departments) {
            const subDept = dept.departments[subDeptId];
            updates.push(
              supabase.from('org_metadata').upsert({
                type: 'subdepartment',
                node_id: subDeptId,
                manager: subDept.manager || null,
                content: {
                  name: subDept.name,
                  code: subDept.code,
                  description: subDept.description,
                  vfp: subDept.vfp,
                  manager: subDept.manager,
                }
              }, { onConflict: 'type,node_id' })
            );
          }
        }
      }

      await Promise.all(updates);
    } catch (err) {
      if (err instanceof Error) {
        console.error("Failed to save org structure", err);
      } else {
        console.error("Unknown error saving org structure:", err);
      }
    }
  }, []);

  return {
    orgStructure,
    fetchOrgMetadata,
    handleUpdateOrgStructure,
  };
}

