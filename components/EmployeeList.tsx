import React from 'react';
import { Employee as EmployeeType } from '../types';
import { ORGANIZATION_STRUCTURE } from '../constants';
import { Edit2, Trash2, User, Phone, Mail, MessageCircle, FileText, Printer, Hash } from 'lucide-react';

interface EmployeeListProps {
  employees: EmployeeType[];
  onEdit: (emp: EmployeeType) => void;
  onDelete: (id: string) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, onEdit, onDelete }) => {
  const getDeptColor = (deptId?: string) => {
    if (!deptId) return '#e2e8f0';
    return ORGANIZATION_STRUCTURE[deptId]?.color || '#e2e8f0';
  };

  const getDeptName = (deptId?: string) => {
    if (!deptId) return 'Unassigned';
    return ORGANIZATION_STRUCTURE[deptId]?.name || 'Unknown';
  };

  const getSubDeptName = (deptId?: string, subDeptId?: string) => {
    if (!deptId || !subDeptId) return '';
    const dept = ORGANIZATION_STRUCTURE[deptId];
    if (!dept || !dept.departments) return '';
    return dept.departments[subDeptId]?.name || '';
  };

  const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper for full export from list (same as Modal)
  const quickExportTxt = (e: React.MouseEvent, emp: EmployeeType) => {
    e.stopPropagation();
    const lines = [
        "========================================",
        "          FULL EMPLOYEE DOSSIER         ",
        "========================================",
        "",
        "[1] PERSONAL INFORMATION",
        `Full Name:          ${emp.full_name}`,
        `Position:           ${emp.position}`,
        `System ID:          ${emp.id}`,
        `Nickname (NIK):     ${emp.nickname || 'N/A'}`,
        `Birth Date:         ${emp.birth_date || '-'}`,
        `Join Date:          ${emp.join_date || '-'}`,
        "",
        "[2] CONTACTS",
        `Phone:              ${emp.phone || '-'}`,
        `WhatsApp:           ${emp.whatsapp || '-'}`,
        `Telegram:           ${emp.telegram || '-'}`,
        `Work Email:         ${emp.email || '-'}`,
        `Personal Email:     ${emp.email2 || '-'}`,
        "",
        "[3] ORGANIZATION",
        `Department:         ${emp.department?.map(d => ORGANIZATION_STRUCTURE[d]?.name).join(', ') || '-'}`,
        `Sub-Department:     ${emp.subdepartment?.map(s => {
             const deptId = emp.department?.[0];
             return deptId ? ORGANIZATION_STRUCTURE[deptId]?.departments?.[s]?.name : s;
        }).join(', ') || '-'}`,
        "",
        "[4] ADDRESSES",
        `Actual Address:     ${emp.actual_address || '-'}`,
        `Registration Addr:  ${emp.registration_address || '-'}`,
        "",
        "[5] DOCUMENTS",
        `INN:                ${emp.inn || '-'}`,
        `-- Domestic Passport --`,
        `Number:             ${emp.passport_number || '-'}`,
        `Issued Date:        ${emp.passport_date || '-'}`,
        `Issued By:          ${emp.passport_issuer || '-'}`,
        `-- Foreign Passport --`,
        `Number:             ${emp.foreign_passport || '-'}`,
        `Issued Date:        ${emp.foreign_passport_date || '-'}`,
        `Issued By:          ${emp.foreign_passport_issuer || '-'}`,
        "",
        "[6] FINANCE",
        `Bank Name:          ${emp.bank_name || '-'}`,
        `Account Details:    ${emp.bank_details || '-'}`,
        `Crypto Wallet:      ${emp.crypto_wallet || '-'}`,
        `Crypto Network:     ${emp.crypto_network || '-'}`,
        `Crypto Currency:    ${emp.crypto_currency || '-'}`,
        "",
        "[7] EMERGENCY CONTACTS",
        ...(emp.emergency_contacts.length ? emp.emergency_contacts.map((c, i) => 
            `${i+1}. ${c.name} (${c.relation}) | Phone: ${c.phone} | TG: ${c.telegram || '-'}`
        ) : ['No emergency contacts recorded.']),
        "",
        "[8] ATTACHED FILES",
        ...(emp.attachments?.length ? emp.attachments.map((f, i) => 
            `${i+1}. ${f.file_name} (${f.file_type}) - ${f.public_url}`
        ) : ['No files attached.']),
        "",
        "[9] ADDITIONAL NOTES",
        `${emp.additional_info || 'None'}`,
        "",
        "========================================",
        `Report Generated: ${new Date().toLocaleString()}`,
        "========================================",
    ];
    
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${emp.full_name.replace(/\s+/g, '_')}_full_dossier.txt`;
    a.click();
  };

  const quickPrint = (e: React.MouseEvent, emp: EmployeeType) => {
    e.stopPropagation();
     const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${emp.full_name}</title>
          <meta charset="utf-8">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 0; }
            body { 
                margin: 0; 
                padding: 0; 
                font-family: 'Inter', sans-serif; 
                background: #fff; 
                color: #0f172a; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
            }
            .page {
                width: 210mm;
                height: 296mm;
                padding: 15mm;
                box-sizing: border-box;
                position: relative;
                display: flex;
                flex-direction: column;
            }
            
            /* Branding / Footer */
            .footer {
                position: absolute;
                bottom: 10mm;
                left: 15mm;
                right: 15mm;
                border-top: 1px solid #e2e8f0;
                padding-top: 4mm;
                font-size: 8px;
                color: #94a3b8;
                display: flex;
                justify-content: space-between;
            }

            /* Layout */
            .header-section {
                display: flex;
                gap: 25px;
                margin-bottom: 30px;
                align-items: center;
            }
            
            .photo-container {
                width: 100px;
                height: 100px;
                border-radius: 16px;
                overflow: hidden;
                border: 2px solid #f1f5f9;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                flex-shrink: 0;
            }
            .photo-container img { width: 100%; height: 100%; object-fit: cover; }
            .photo-placeholder { width: 100%; height: 100%; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-weight: bold; font-size: 24px; }

            .header-details h1 { margin: 0; font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; text-transform: uppercase; letter-spacing: -0.02em; }
            .header-details h2 { margin: 4px 0 12px 0; font-size: 15px; font-weight: 600; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; }
            
            .badges { display: flex; gap: 8px; flex-wrap: wrap; }
            .badge { background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; color: #475569; border: 1px solid #e2e8f0; }
            .badge.highlight { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }

            /* Content Grid */
            .content-grid {
                display: grid;
                grid-template-columns: 200px 1fr;
                gap: 30px;
                flex: 1;
            }

            /* Sidebar */
            .sidebar { border-right: 1px solid #f1f5f9; padding-right: 20px; }
            
            /* Main Content */
            .main { }

            /* Section Styling */
            .section { margin-bottom: 24px; break-inside: avoid; }
            .section-title {
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #94a3b8;
                border-bottom: 2px solid #f1f5f9;
                padding-bottom: 6px;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            /* Key-Value Pairs */
            .kv-group { margin-bottom: 12px; }
            .kv-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; display: block; }
            .kv-value { font-size: 12px; font-weight: 500; color: #0f172a; line-height: 1.4; word-break: break-word; }
            .kv-value.mono { font-family: 'Courier New', monospace; letter-spacing: -0.5px; background: #f8fafc; padding: 2px 4px; border-radius: 4px; display: inline-block; }

            /* Address Box */
            .address-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
            .address-type { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .address-text { font-size: 11px; color: #334155; line-height: 1.4; }

            /* Contact Items */
            .contact-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 11px; color: #334155; }
            .contact-icon { width: 24px; height: 24px; background: #f1f5f9; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #64748b; flex-shrink: 0; }
            
            /* File Grid */
            .files-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .file-card { 
                background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; 
                display: flex; align-items: center; gap: 10px; 
                box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            }
            .file-type-icon { 
                width: 32px; height: 32px; background: #f0f9ff; color: #0369a1; 
                border-radius: 6px; display: flex; align-items: center; justify-content: center; 
                font-weight: 800; font-size: 10px; text-transform: uppercase;
            }
            .file-details { flex: 1; min-width: 0; }
            .file-name { font-size: 11px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .file-size { font-size: 9px; color: #94a3b8; }

            /* Finance Table */
            .finance-table { width: 100%; border-collapse: collapse; font-size: 11px; }
            .finance-table td { padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
            .finance-table td:first-child { color: #64748b; font-weight: 600; width: 40%; }
            .finance-table td:last-child { text-align: right; color: #0f172a; font-weight: 500; }
            .finance-table tr:last-child td { border-bottom: none; }

            /* Emergency Contacts */
            .emergency-card { border-left: 3px solid #fecaca; background: #fff1f2; padding: 8px 12px; border-radius: 0 6px 6px 0; margin-bottom: 8px; }
            .ec-name { font-weight: 700; color: #881337; font-size: 11px; }
            .ec-relation { font-size: 10px; color: #9f1239; margin-bottom: 2px; }
            .ec-phone { font-size: 11px; color: #be123c; font-weight: 500; }

          </style>
        </head>
        <body>
          <div class="page">
             
             <!-- Header -->
             <div class="header-section">
                <div class="photo-container">
                    ${emp.photo_url ? `<img src="${emp.photo_url}" />` : '<div class="photo-placeholder">HR</div>'}
                </div>
                <div class="header-details">
                    <h1>${emp.full_name}</h1>
                    <h2>${emp.position}</h2>
                    <div class="badges">
                        <span class="badge highlight">ID: ${emp.id.substring(0,8)}</span>
                        ${emp.nickname ? `<span class="badge">NIK: ${emp.nickname}</span>` : ''}
                        <span class="badge">Joined: ${emp.join_date || 'N/A'}</span>
                    </div>
                </div>
             </div>

             <div class="content-grid">
                
                <!-- Sidebar (Left) -->
                <div class="sidebar">
                    
                    <div class="section">
                        <div class="section-title">Contacts</div>
                        ${emp.phone ? `
                        <div class="contact-row">
                            <div class="contact-icon">Ph</div>
                            <span>${emp.phone}</span>
                        </div>` : ''}
                        ${emp.email ? `
                        <div class="contact-row">
                            <div class="contact-icon">@</div>
                            <span>${emp.email}</span>
                        </div>` : ''}
                        ${emp.telegram ? `
                        <div class="contact-row">
                            <div class="contact-icon">Tg</div>
                            <span>${emp.telegram}</span>
                        </div>` : ''}
                         ${emp.whatsapp ? `
                        <div class="contact-row">
                            <div class="contact-icon">Wa</div>
                            <span>${emp.whatsapp}</span>
                        </div>` : ''}
                    </div>

                    <div class="section">
                        <div class="section-title">Residence</div>
                        <div class="address-box">
                            <div class="address-type">Actual Address</div>
                            <div class="address-text">${emp.actual_address || 'Not specified'}</div>
                        </div>
                        <div class="address-box">
                            <div class="address-type">Registration</div>
                            <div class="address-text">${emp.registration_address || 'Same as actual'}</div>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">Emergency</div>
                        ${emp.emergency_contacts && emp.emergency_contacts.length > 0 ? 
                            emp.emergency_contacts.map(c => `
                                <div class="emergency-card">
                                    <div class="ec-name">${c.name}</div>
                                    <div class="ec-relation">${c.relation}</div>
                                    <div class="ec-phone">${c.phone}</div>
                                </div>
                            `).join('') : '<span style="font-size:10px; color:#94a3b8">No records</span>'}
                    </div>

                </div>

                <!-- Main (Right) -->
                <div class="main">
                    
                    <!-- Organization & Basic -->
                    <div class="section">
                         <div class="section-title">Organization & Identity</div>
                         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                             <div class="kv-group">
                                <span class="kv-label">Department</span>
                                <span class="kv-value">${emp.department?.map(d => ORGANIZATION_STRUCTURE[d]?.name).join(', ') || '-'}</span>
                             </div>
                             <div class="kv-group">
                                <span class="kv-label">Sub-Department</span>
                                <span class="kv-value">${emp.subdepartment?.map(s => {
                                     const deptId = emp.department?.[0];
                                     return deptId ? ORGANIZATION_STRUCTURE[deptId]?.departments?.[s]?.name : s;
                                }).join(', ') || '-'}</span>
                             </div>
                         </div>
                         <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 10px;">
                             <div class="kv-group">
                                <span class="kv-label">Birth Date</span>
                                <span class="kv-value">${emp.birth_date || '-'}</span>
                             </div>
                             <div class="kv-group">
                                <span class="kv-label">INN</span>
                                <span class="kv-value mono">${emp.inn || '-'}</span>
                             </div>
                         </div>
                    </div>

                    <!-- Documents -->
                    <div class="section">
                        <div class="section-title">Passport Details</div>
                        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
                                <div class="kv-group" style="margin:0;">
                                    <span class="kv-label">Series & Number</span>
                                    <span class="kv-value mono" style="font-size:13px;">${emp.passport_number || '-'}</span>
                                </div>
                                <div class="kv-group" style="margin:0;">
                                    <span class="kv-label">Date of Issue</span>
                                    <span class="kv-value">${emp.passport_date || '-'}</span>
                                </div>
                             </div>
                             <div class="kv-group" style="margin:0;">
                                <span class="kv-label">Issued By</span>
                                <span class="kv-value">${emp.passport_issuer || '-'}</span>
                             </div>
                        </div>
                    </div>

                    <!-- Finance -->
                    <div class="section">
                        <div class="section-title">Finance</div>
                        <table class="finance-table">
                            <tr>
                                <td>Bank Name</td>
                                <td>${emp.bank_name || '-'}</td>
                            </tr>
                            <tr>
                                <td>Account / Card</td>
                                <td>${emp.bank_details || '-'}</td>
                            </tr>
                             <tr>
                                <td>Crypto Wallet (${emp.crypto_network || 'NET'})</td>
                                <td style="font-family:monospace;">${emp.crypto_wallet || '-'}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Files -->
                    ${emp.attachments && emp.attachments.length > 0 ? `
                    <div class="section">
                        <div class="section-title">Attached Files</div>
                        <div class="files-grid">
                             ${emp.attachments.slice(0, 8).map(f => `
                                <div class="file-card">
                                    <div class="file-type-icon">${f.file_type.split('/')[1] || 'FILE'}</div>
                                    <div class="file-details">
                                        <div class="file-name">${f.file_name}</div>
                                        <div class="file-size">${formatFileSize(f.file_size)}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ${emp.attachments.length > 8 ? `<div style="text-align:center; font-size:9px; color:#94a3b8; margin-top:5px;">+ ${emp.attachments.length - 8} more files</div>` : ''}
                    </div>` : ''}

                    <!-- Notes -->
                    ${emp.additional_info ? `
                    <div class="section">
                        <div class="section-title">Notes</div>
                        <div style="font-size:11px; background:#f8fafc; padding:10px; border-radius:8px; line-height:1.5; color:#475569;">
                            ${emp.additional_info}
                        </div>
                    </div>` : ''}

                </div>
             </div>

             <div class="footer">
                <span>CONFIDENTIAL PERSONNEL RECORD</span>
                <span>Generated on ${new Date().toLocaleDateString()}</span>
             </div>

          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
    }
  };

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
           <User size={40} className="opacity-50" />
        </div>
        <p className="text-xl font-semibold text-gray-600">No employees found</p>
        <p className="text-sm">Try adjusting your search or add a new employee.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {employees.map((emp) => (
        <div key={emp.id} onClick={() => onEdit(emp)} className="group bg-white rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 overflow-hidden flex flex-col relative cursor-pointer">
          
          {/* Top colored banner */}
          <div className="h-24 w-full relative overflow-hidden" style={{ backgroundColor: getDeptColor(emp.department?.[0]) + '20' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-10 -mt-10 blur-xl"></div>
            
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(emp.id); }}
                  className="p-1.5 bg-white/80 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg shadow-sm backdrop-blur-sm transition-all"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
            </div>

            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
               <button 
                  onClick={(e) => quickExportTxt(e, emp)}
                  className="p-1.5 bg-white/80 hover:bg-white text-gray-500 rounded-lg shadow-sm backdrop-blur-sm transition-all"
                  title="Export Full TXT"
                >
                  <FileText size={14} />
                </button>
                <button 
                  onClick={(e) => quickPrint(e, emp)}
                  className="p-1.5 bg-white/80 hover:bg-white text-gray-500 rounded-lg shadow-sm backdrop-blur-sm transition-all"
                  title="Print Full Dossier"
                >
                  <Printer size={14} />
                </button>
            </div>

          </div>
          
          <div className="px-6 pb-6 flex-1 flex flex-col -mt-12">
            <div className="relative mb-4 self-start">
              <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-md">
                 <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 relative">
                    {emp.photo_url ? (
                      <img src={emp.photo_url} alt={emp.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><User size={40} /></div>
                    )}
                 </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow-sm" title={getDeptName(emp.department?.[0])}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: getDeptColor(emp.department?.[0]) }}>
                    {getDeptName(emp.department?.[0]).substring(0,2).toUpperCase()}
                  </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{emp.full_name}</h3>
              <p className="text-sm font-medium text-blue-600 mb-1">{emp.position}</p>
              
              {/* Added NIK/ID Display */}
              {emp.nickname && (
                 <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <Hash size={10} />
                        NIK: {emp.nickname}
                    </span>
                 </div>
              )}

              {emp.department?.[0] && emp.subdepartment?.[0] && (
                 <p className="text-xs text-gray-400 font-medium">
                   {getSubDeptName(emp.department[0], emp.subdepartment[0])}
                 </p>
              )}
            </div>

            <div className="mt-auto space-y-3 pt-4 border-t border-gray-50">
              {emp.phone && (
                <div className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  <Phone size={14} className="text-gray-400" />
                  <span className="truncate">{emp.phone}</span>
                </div>
              )}
              {emp.email && (
                <div className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  <Mail size={14} className="text-gray-400" />
                  <span className="truncate">{emp.email}</span>
                </div>
              )}
              {emp.telegram && (
                <div className="flex items-center gap-3 text-sm text-blue-500 hover:text-blue-600 transition-colors">
                  <MessageCircle size={14} />
                  <span className="truncate">{emp.telegram}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmployeeList;