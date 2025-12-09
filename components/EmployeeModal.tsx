import React, { useState, useEffect } from 'react';
import { ORGANIZATION_STRUCTURE } from '../constants';
import { X, Save, User, MapPin, Phone, CreditCard, FileText, Briefcase, FileBadge, Siren, Plus, Trash2, Printer, Paperclip, File, Download, Loader2, Eye, Upload } from 'lucide-react';
import { Employee as EmployeeType, EmergencyContact, Attachment } from '../types';
import { supabase } from '../supabaseClient';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: EmployeeType) => void;
  initialData: EmployeeType | null;
}

const DEFAULT_EMPLOYEE: EmployeeType = {
  id: '',
  created_at: '',
  updated_at: '',
  full_name: '',
  position: '',
  emergency_contacts: [],
  custom_fields: [],
  attachments: [],
  department: [],
  subdepartment: []
};

const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<EmployeeType>(DEFAULT_EMPLOYEE);
  const [activeTab, setActiveTab] = useState('basic');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        setFormData({ ...DEFAULT_EMPLOYEE, id: crypto.randomUUID(), created_at: new Date().toISOString() });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit check
          alert("File size should be less than 5MB");
          return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Document/File Upload Logic ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!supabase) {
        alert("Database connection not active.");
        return;
    }

    setIsUploading(true);
    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Sanitize file name
        const fileExt = file.name.split('.').pop();
        const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${formData.id}/${Date.now()}_${cleanName}.${fileExt}`;
        const filePath = `${fileName}`;

        // 1. Upload to Supabase Storage Bucket 'employee-files'
        const { data, error } = await supabase.storage
            .from('employee-files')
            .upload(filePath, file);

        if (error) {
            console.error('Upload error:', error);
            alert(`Failed to upload ${file.name}: ${error.message}`);
            continue;
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('employee-files')
            .getPublicUrl(filePath);

        // 3. Create Attachment object matching table schema
        newAttachments.push({
            id: crypto.randomUUID(),
            employee_id: formData.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            public_url: publicUrl,
            storage_path: filePath,
            uploaded_at: new Date().toISOString()
        });
    }

    setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...newAttachments]
    }));
    setIsUploading(false);
    // Reset input
    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
      if (!confirm(`Delete file "${attachment.file_name}"?`)) return;

      // 1. Delete from Storage
      if (attachment.storage_path && supabase) {
          const { error } = await supabase.storage
              .from('employee-files')
              .remove([attachment.storage_path]);
          
          if (error) {
              console.error('Delete storage error', error);
          }
      }

      // 2. Remove from Local State (App.tsx handles DB sync on save)
      setFormData(prev => ({
          ...prev,
          attachments: prev.attachments.filter(a => a.id !== attachment.id)
      }));
  };

  // --- Formatting Helper ---
  const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
    setFormData(prev => ({ ...prev, department: selectedOptions, subdepartment: [] })); 
  };

  const handleSubDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
    setFormData(prev => ({ ...prev, subdepartment: selectedOptions }));
  };

  const handleEmergencyChange = (index: number, field: keyof EmergencyContact, value: string) => {
    const updated = [...formData.emergency_contacts];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, emergency_contacts: updated }));
  };

  const addEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: [...(prev.emergency_contacts || []), { name: '', relation: '', phone: '', telegram: '' }]
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, updated_at: new Date().toISOString() });
    onClose();
  };

  // --- Export Actions ---

  const handleExportTxt = () => {
    const emp = formData;
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

  const handlePrint = () => {
    const emp = formData;
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
    } else {
        alert("Please allow popups to print");
    }
  };


  // --- Helper Functions ---

  const getAvailableSubDepts = () => {
    const subdepts: { id: string, name: string, parentName: string }[] = [];
    formData.department?.forEach(deptId => {
      const dept = ORGANIZATION_STRUCTURE[deptId];
      if (dept && dept.departments) {
        Object.values(dept.departments).forEach(sub => {
          subdepts.push({ id: sub.id, name: sub.name, parentName: dept.name });
        });
      }
    });
    return subdepts;
  };

  const InputField = ({ label, name, type = "text", placeholder = "", required = false }: any) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{label} {required && <span className="text-red-500">*</span>}</label>
      <input 
        type={type}
        name={name}
        required={required}
        value={(formData as any)[name] || ''}
        onChange={handleChange}
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-gray-800 placeholder-gray-400"
        placeholder={placeholder}
      />
    </div>
  );

  const TextAreaField = ({ label, name, rows = 3 }: any) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
      <textarea 
        name={name}
        rows={rows}
        value={(formData as any)[name] || ''}
        onChange={handleChange}
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-gray-800 resize-none"
      />
    </div>
  );

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'contacts', label: 'Contacts', icon: Phone },
    { id: 'emergency', label: 'Emergency', icon: Siren },
    { id: 'docs', label: 'Documents', icon: FileBadge },
    { id: 'files', label: 'Files & Docs', icon: Paperclip },
    { id: 'finance', label: 'Finance', icon: CreditCard },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'structure', label: 'Structure', icon: Briefcase },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/20">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {initialData ? 'Edit Profile' : 'New Employee'}
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              {initialData ? initialData.full_name : 'Create a new employee record'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
              {/* Export Buttons */}
              <button 
                type="button"
                onClick={handleExportTxt}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                title="Download Full Dossier (TXT)"
              >
                  <FileText size={18} />
                  <span className="hidden sm:inline">Export Full TXT</span>
              </button>
              <button 
                type="button"
                onClick={handlePrint}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium mr-2"
                title="Print Full Dossier / Save as PDF"
              >
                  <Printer size={18} />
                  <span className="hidden sm:inline">Print / PDF</span>
              </button>
              
              <div className="h-6 w-px bg-gray-200 mx-2"></div>

              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-64 bg-slate-50/50 border-r border-gray-100 p-4 space-y-1 overflow-y-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'text-gray-600 hover:bg-white hover:text-blue-600'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-white">
            <form id="employee-form" onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
              
              {activeTab === 'basic' && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex gap-6 items-start">
                    <div className="w-32 h-32 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0 group relative">
                      {formData.photo_url ? (
                        <img src={formData.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={40} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                       <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Employee Photo</label>
                          <div className="flex gap-2">
                              <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePhotoUpload}
                                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                              {formData.photo_url && (
                                  <button
                                      type="button"
                                      onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                      title="Remove photo"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                              )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Upload a JPG or PNG file (max 5MB)</p>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <InputField label="Join Date" name="join_date" type="date" />
                          <InputField label="Birth Date" name="birth_date" type="date" />
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label="Full Name" name="full_name" required placeholder="Ivanov Ivan Ivanovich" />
                    <InputField label="Position" name="position" required placeholder="Senior Manager" />
                    <InputField label="Nickname / ID" name="nickname" placeholder="ivanov_ii" />
                  </div>

                  <TextAreaField label="Additional Info / Notes" name="additional_info" />
                </div>
              )}

              {activeTab === 'contacts' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                   <div className="bg-blue-50/50 p-6 rounded-2xl space-y-6 border border-blue-100">
                    <h3 className="font-bold text-blue-900 flex items-center gap-2">
                      <Phone size={18} /> Primary Contacts
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputField label="Phone Number" name="phone" type="tel" />
                      <InputField label="Work Email" name="email" type="email" />
                      <InputField label="WhatsApp" name="whatsapp" />
                      <InputField label="Telegram" name="telegram" placeholder="@username" />
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl space-y-6 border border-gray-100">
                     <h3 className="font-bold text-gray-700">Secondary Contacts</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Personal Email" name="email2" type="email" />
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'emergency' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Emergency Contacts</h3>
                    <button 
                      type="button"
                      onClick={addEmergencyContact}
                      className="text-sm flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                    >
                      <Plus size={16} /> Add Contact
                    </button>
                  </div>
                  
                  {formData.emergency_contacts.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                      <Siren size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No emergency contacts added</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.emergency_contacts.map((contact, index) => (
                        <div key={index} className="p-5 rounded-xl border border-red-100 bg-red-50/30 relative group">
                           <button
                             type="button"
                             onClick={() => removeEmergencyContact(index)}
                             className="absolute top-4 right-4 p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                           >
                             <Trash2 size={16} />
                           </button>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                             <div className="space-y-1.5">
                               <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
                               <input 
                                 value={contact.name}
                                 onChange={(e) => handleEmergencyChange(index, 'name', e.target.value)}
                                 className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-red-400 outline-none"
                                 placeholder="e.g. Parent Name"
                               />
                             </div>
                             <div className="space-y-1.5">
                               <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Relation</label>
                               <input 
                                 value={contact.relation}
                                 onChange={(e) => handleEmergencyChange(index, 'relation', e.target.value)}
                                 className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-red-400 outline-none"
                                 placeholder="e.g. Mother, Father, Friend"
                               />
                             </div>
                             <div className="space-y-1.5">
                               <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Phone</label>
                               <input 
                                 value={contact.phone}
                                 onChange={(e) => handleEmergencyChange(index, 'phone', e.target.value)}
                                 className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-red-400 outline-none"
                               />
                             </div>
                             <div className="space-y-1.5">
                               <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Telegram</label>
                               <input 
                                 value={contact.telegram || ''}
                                 onChange={(e) => handleEmergencyChange(index, 'telegram', e.target.value)}
                                 className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-red-400 outline-none"
                               />
                             </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-4 flex items-center gap-2">
                    <Siren size={14} className="text-red-400" />
                    These contacts will only be used in case of emergency or force majeure.
                  </p>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Paperclip size={18} /> Attachments & Documents
                      </h3>
                      
                      <div className="mb-6">
                         <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                             <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                 {isUploading ? (
                                    <Loader2 className="animate-spin text-blue-500" size={32} />
                                 ) : (
                                    <>
                                        <Upload className="w-8 h-8 mb-3 text-slate-400" />
                                        <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> (Contracts, NDAs, Scans)</p>
                                        <p className="text-xs text-slate-400">PDF, IMG, DOCX (Max 10MB)</p>
                                    </>
                                 )}
                             </div>
                             <input type="file" className="hidden" multiple onChange={handleFileUpload} disabled={isUploading} />
                         </label>
                      </div>

                      <div className="space-y-2">
                         {!formData.attachments || formData.attachments.length === 0 ? (
                             <p className="text-center text-sm text-slate-400 py-4">No documents attached.</p>
                         ) : (
                             formData.attachments.map(file => (
                                 <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg group hover:shadow-sm transition-all">
                                     <div className="flex items-center gap-3 overflow-hidden">
                                         <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                                            <File size={20} />
                                         </div>
                                         <div className="min-w-0">
                                             <p className="text-sm font-medium text-slate-700 truncate">{file.file_name}</p>
                                             <p className="text-xs text-slate-400">{formatFileSize(file.file_size)} • {new Date(file.uploaded_at).toLocaleDateString()}</p>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-1">
                                         <a 
                                            href={file.public_url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="View / Download"
                                         >
                                             <Download size={16} />
                                         </a>
                                         <button
                                            type="button" 
                                            onClick={() => handleDeleteAttachment(file)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete File"
                                         >
                                             <Trash2 size={16} />
                                         </button>
                                     </div>
                                 </div>
                             ))
                         )}
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label="INN" name="inn" />
                  </div>
                  
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-gray-800 mb-4">Domestic Passport</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InputField label="Series & Number" name="passport_number" />
                      <InputField label="Date of Issue" name="passport_date" type="date" />
                      <div className="md:col-span-3">
                         <InputField label="Issued By" name="passport_issuer" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-gray-800 mb-4">Foreign Passport</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InputField label="Series & Number" name="foreign_passport" />
                      <InputField label="Date of Issue" name="foreign_passport_date" type="date" />
                      <div className="md:col-span-3">
                        <InputField label="Issued By" name="foreign_passport_issuer" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'address' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <TextAreaField label="Actual Residence Address" name="actual_address" />
                  <TextAreaField label="Official Registration Address" name="registration_address" />
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-emerald-50/50 p-6 rounded-2xl space-y-6 border border-emerald-100">
                    <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                      <CreditCard size={18} /> Bank Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputField label="Bank Name" name="bank_name" />
                      <InputField label="Account / Card Number" name="bank_details" />
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 p-6 rounded-2xl space-y-6 border border-indigo-100">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                      <FileBadge size={18} /> Crypto Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputField label="Wallet Address" name="crypto_wallet" />
                      <InputField label="Network" name="crypto_network" placeholder="e.g. TRC20" />
                      <InputField label="Currency" name="crypto_currency" placeholder="e.g. USDT" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'structure' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Department(s)</label>
                    <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 h-64 overflow-y-auto">
                       <div className="grid grid-cols-1 gap-2">
                        {Object.values(ORGANIZATION_STRUCTURE).map(dept => (
                           <label key={dept.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.department?.includes(dept.id) ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                             <input 
                               type="checkbox"
                               value={dept.id}
                               checked={formData.department?.includes(dept.id) || false}
                               onChange={(e) => {
                                 const newDepts = e.target.checked 
                                    ? [...(formData.department || []), dept.id]
                                    : (formData.department || []).filter(d => d !== dept.id);
                                 setFormData(prev => ({ ...prev, department: newDepts, subdepartment: [] }));
                               }}
                               className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                             />
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full" style={{backgroundColor: dept.color}}></div>
                               <span className="font-medium text-gray-700">{dept.fullName}</span>
                             </div>
                           </label>
                        ))}
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Sub-department(s)</label>
                     <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 h-64 overflow-y-auto">
                       {(!formData.department || formData.department.length === 0) ? (
                         <div className="flex items-center justify-center h-full text-gray-400 text-sm">Select a department first</div>
                       ) : (
                         <div className="grid grid-cols-1 gap-2">
                          {getAvailableSubDepts().map(sub => (
                             <label key={sub.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.subdepartment?.includes(sub.id) ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                               <input 
                                 type="checkbox"
                                 value={sub.id}
                                 checked={formData.subdepartment?.includes(sub.id) || false}
                                 onChange={(e) => {
                                   const newSubs = e.target.checked 
                                      ? [...(formData.subdepartment || []), sub.id]
                                      : (formData.subdepartment || []).filter(d => d !== sub.id);
                                   setFormData(prev => ({ ...prev, subdepartment: newSubs }));
                                 }}
                                 className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                               />
                               <div>
                                 <span className="block font-medium text-gray-800">{sub.name}</span>
                                 <span className="text-xs text-gray-500">{sub.parentName}</span>
                               </div>
                             </label>
                          ))}
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-white hover:shadow-sm transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="employee-form"
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeModal;