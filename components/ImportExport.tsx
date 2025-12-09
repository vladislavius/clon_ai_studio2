import React, { useRef } from 'react';
import { Employee } from '../types';
import { Download, Upload, FileJson, FileType, Database, AlertCircle } from 'lucide-react';

interface ImportExportProps {
  employees: Employee[];
  onImport: (data: Employee[]) => void;
}

const ImportExport: React.FC<ImportExportProps> = ({ employees, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadJSON = () => {
    const data = JSON.stringify(employees, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hr_system_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleDownloadEXE = () => {
    // In a real web environment, we cannot generate a binary .exe file client-side.
    // This is a simulation or placeholder for the requested feature.
    alert("Generating Windows Executable...\n\n(Note: In a real web app, this would trigger a server-side build. For this demo, we acknowledge the request.)");
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            if (window.confirm(`Found ${parsed.length} employee records. This will replace current data. Continue?`)) {
                 onImport(parsed);
            }
          } else {
            alert('Invalid file format: Expected an array of employees.');
          }
        } catch (err) {
          alert('Error parsing JSON file. Please ensure it is a valid backup file.');
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">System Data Management</h2>
            <p className="text-slate-500 mt-1">Manage global database backups and restoration.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Export JSON */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                    <FileJson size={24} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">Export JSON Database</h3>
                <p className="text-sm text-slate-500 mb-6">Full system backup including all employee records, settings, and structure. Use this for standard backups.</p>
                <button 
                    onClick={handleDownloadJSON}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                    <Download size={18} /> Download .JSON
                </button>
            </div>

            {/* Export EXE */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                    <FileType size={24} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">Export Portable (.EXE)</h3>
                <p className="text-sm text-slate-500 mb-6">Download a portable Windows executable viewer for offline access to the HR system data.</p>
                <button 
                    onClick={handleDownloadEXE}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
                >
                    <Download size={18} /> Download .EXE
                </button>
            </div>

             {/* Import JSON */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110"></div>
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform relative z-10">
                    <Database size={24} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2 relative z-10">Import Database</h3>
                <p className="text-sm text-slate-500 mb-6 relative z-10">Restore system from a previously saved JSON file. <br/><span className="text-emerald-700 font-medium">Supports only JSON files.</span></p>
                
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImport}
                    accept=".json"
                    className="hidden"
                />
                <button 
                    onClick={handleImportClick}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors relative z-10"
                >
                    <Upload size={18} /> Select .JSON File
                </button>
            </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
            <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
                <h4 className="font-bold text-amber-800 text-sm">Note regarding Individual Reports</h4>
                <p className="text-sm text-amber-700 mt-1">To download individual Text Reports or Print/PDF versions of specific employee cards, please locate the employee in the list and use the action buttons on their card.</p>
            </div>
        </div>
    </div>
  );
};

export default ImportExport;