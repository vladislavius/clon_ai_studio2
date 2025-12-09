import React, { useState, useEffect } from 'react';
import { Users, Briefcase, Cake, FileDown, Plus, Search, Menu, LayoutGrid, Database, Settings, Loader2 } from 'lucide-react';
import EmployeeList from './components/EmployeeList';
import EmployeeModal from './components/EmployeeModal';
import Birthdays from './components/Birthdays';
import ImportExport from './components/ImportExport';
import { ORGANIZATION_STRUCTURE } from './constants';
import { Employee, ViewMode, Attachment } from './types';
import { supabase } from './supabaseClient';

function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // --- Supabase Fetching ---
  const fetchEmployees = async () => {
    setIsLoading(true);
    if (!supabase) {
      alert("Supabase client not initialized.");
      setIsLoading(false);
      return;
    }

    // Fetch employees AND their attachments using the relation
    // We alias 'employee_attachments' to 'attachments' to match our Employee type
    const { data, error } = await supabase
      .from('employees')
      .select('*, attachments:employee_attachments(*)');

    if (error) {
      console.error('Error fetching employees:', error);
      alert('Failed to load employees from database.');
    } else {
      if (data) {
        setEmployees(data as Employee[]);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // --- Computed data ---
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept ? emp.department?.includes(selectedDept) : true;
    return matchesSearch && matchesDept;
  });

  // --- CRUD Operations ---

  const handleSaveEmployee = async (emp: Employee) => {
    if (!supabase) return;

    // 1. Separate attachments from the main employee object
    // because 'attachments' is not a column in the 'employees' table, it's a separate table.
    const { attachments, ...employeeData } = emp;

    // 2. Upsert Employee Record
    const { error: empError } = await supabase
      .from('employees')
      .upsert(employeeData);

    if (empError) {
      console.error('Error saving employee:', empError);
      alert('Error saving data to database: ' + empError.message);
      return;
    }

    // 3. Sync Attachments (Upsert new ones, Delete removed ones)
    // First, verify we have the employee ID (which we should, from emp.id)
    if (attachments) {
        // A. Get current IDs in DB for this employee to find deletions
        const { data: existingDocs } = await supabase
            .from('employee_attachments')
            .select('id')
            .eq('employee_id', emp.id);
        
        const existingIds = existingDocs?.map(d => d.id) || [];
        const newIds = attachments.map(a => a.id);
        
        // Find IDs to delete (exist in DB but not in new list)
        const idsToDelete = existingIds.filter(id => !newIds.includes(id));
        
        if (idsToDelete.length > 0) {
            await supabase.from('employee_attachments').delete().in('id', idsToDelete);
        }

        // B. Upsert current list
        // Ensure every attachment has the correct employee_id
        const attachmentsToUpsert = attachments.map(a => ({
            ...a,
            employee_id: emp.id
        }));

        if (attachmentsToUpsert.length > 0) {
            const { error: attachError } = await supabase
                .from('employee_attachments')
                .upsert(attachmentsToUpsert);
            
            if (attachError) console.error("Error saving attachments:", attachError);
        }
    }

    // 4. Refresh local state fully to ensure consistency
    fetchEmployees();
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee? This will also delete all files.')) {
      if (!supabase) return;

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting employee:', error);
        alert('Error deleting employee: ' + error.message);
      } else {
        setEmployees(prev => prev.filter(e => e.id !== id));
      }
    }
  };

  const handleEditClick = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleImportData = (data: Employee[]) => {
      if(confirm("Importing will overwrite local view. To save to DB, please implement bulk save.")){
         setEmployees(data);
         setCurrentView('employees');
      }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col fixed h-full z-20">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Users size={24} />
          </div>
          <h1 className="font-bold text-xl text-slate-800">HR System</h1>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
            <button 
              onClick={() => setCurrentView('employees')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${currentView === 'employees' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <LayoutGrid size={20} /> Employees
            </button>
            <button 
              onClick={() => setCurrentView('birthdays')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${currentView === 'birthdays' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Cake size={20} /> Birthdays
            </button>
          </div>

          <div className="mb-6">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">System</p>
            <button 
              onClick={() => setCurrentView('import-export')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${currentView === 'import-export' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Database size={20} /> Import / Export
            </button>
          </div>

          <div>
            <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Departments</p>
            <button 
              onClick={() => setSelectedDept(null)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all ${!selectedDept ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              All Departments
            </button>
            {Object.values(ORGANIZATION_STRUCTURE).map(dept => (
              <button
                key={dept.id}
                onClick={() => {
                  setSelectedDept(dept.id);
                  setCurrentView('employees');
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all ${selectedDept === dept.id ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                {dept.name}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Total Employees</p>
            <p className="text-2xl font-bold text-slate-800">
               {isLoading ? '...' : employees.length}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 flex flex-col min-w-0">
        
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200 px-8 py-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleAddClick}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5"
            >
              <Plus size={20} /> Add Employee
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 flex-1">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p>Loading database...</p>
             </div>
          ) : (
            <>
              {currentView === 'employees' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">
                        {selectedDept ? ORGANIZATION_STRUCTURE[selectedDept].fullName : 'All Employees'}
                      </h2>
                      <p className="text-slate-500 mt-1">
                        Showing {filteredEmployees.length} profiles
                      </p>
                    </div>
                  </div>
                  
                  <EmployeeList 
                    employees={filteredEmployees}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteEmployee}
                  />
                </div>
              )}

              {currentView === 'birthdays' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">Birthday Calendar</h2>
                  <Birthdays employees={employees} />
                </div>
              )}

              {currentView === 'import-export' && (
                <ImportExport employees={employees} onImport={handleImportData} />
              )}
            </>
          )}
        </div>
      </main>

      <EmployeeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEmployee}
        initialData={editingEmployee}
      />
    </div>
  );
}

export default App;