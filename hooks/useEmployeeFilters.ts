import { useMemo } from 'react';
import { Employee } from '../types';
import { DEPT_SORT_ORDER, DEFAULT_DEPT_SORT_INDEX } from '../constants';

interface UseEmployeeFiltersProps {
  employees: Employee[];
  searchTerm: string;
  deptFilter: string;
}

interface UseEmployeeFiltersReturn {
  filteredEmployees: Employee[];
}

/**
 * Custom hook for filtering and sorting employees
 * Memoized to prevent unnecessary recalculations
 */
export function useEmployeeFilters({
  employees,
  searchTerm,
  deptFilter,
}: UseEmployeeFiltersProps): UseEmployeeFiltersReturn {
  const filteredEmployees = useMemo(() => {
    return employees
      .filter(emp => {
        const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              emp.position.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = deptFilter === 'all' || emp.department?.includes(deptFilter);
        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        const deptA = a.department?.[0] || 'other';
        const deptB = b.department?.[0] || 'other';
        const indexA = DEPT_SORT_ORDER.indexOf(deptA);
        const indexB = DEPT_SORT_ORDER.indexOf(deptB);
        const safeIndexA = indexA === -1 ? DEFAULT_DEPT_SORT_INDEX : indexA;
        const safeIndexB = indexB === -1 ? DEFAULT_DEPT_SORT_INDEX : indexB;

        if (safeIndexA !== safeIndexB) return safeIndexA - safeIndexB;
        return a.full_name.localeCompare(b.full_name);
      });
  }, [employees, searchTerm, deptFilter]);

  return {
    filteredEmployees,
  };
}

