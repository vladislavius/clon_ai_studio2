
import { Employee, StatisticDefinition, StatisticValue } from '../types';
import { format } from 'date-fns';
import { ORGANIZATION_STRUCTURE } from '../constants';

/**
 * Экспорт сотрудников в CSV формат
 */
export function exportEmployeesToCSV(employees: Employee[]): void {
  const headers = [
    'ID',
    'ФИО',
    'Должность',
    'Email',
    'Телефон',
    'Дата рождения',
    'Дата приема',
    'Департамент',
    'Отдел',
    'Telegram',
    'WhatsApp',
  ];

  const rows = employees.map(emp => [
    emp.id,
    emp.full_name || '',
    emp.position || '',
    emp.email || '',
    emp.phone || '',
    emp.birth_date || '',
    emp.join_date || '',
    emp.department?.map(d => ORGANIZATION_STRUCTURE[d]?.name).join('; ') || '',
    emp.subdepartment?.join('; ') || '',
    emp.telegram || '',
    emp.whatsapp || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `employees_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Экспорт статистик в CSV формат
 */
export function exportStatisticsToCSV(
  definitions: StatisticDefinition[],
  values: Record<string, StatisticValue[]>,
  period: string
): void {
  const headers = [
    'ID Статистики',
    'Название',
    'Владелец',
    'Текущее значение',
    'Динамика %',
    'Период',
    'Дата экспорта',
  ];

  const rows = definitions.map(def => {
    const statValues = values[def.id] || [];
    const sorted = [...statValues].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const current = sorted.length > 0 ? sorted[sorted.length - 1].value : 0;
    const prev = sorted.length > 1 ? sorted[0].value : 0;
    const percent = prev !== 0 ? ((current - prev) / Math.abs(prev)) * 100 : 0;

    return [
      def.id,
      def.title,
      def.owner_id || '',
      current.toLocaleString(),
      percent.toFixed(1),
      period,
      format(new Date(), 'yyyy-MM-dd'),
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `statistics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Экспорт сотрудника в PDF (используя window.print)
 */
export function exportEmployeeToPDF(employee: Employee): void {
  // Создаем временное окно с форматированным содержимым
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Пожалуйста, разрешите всплывающие окна для экспорта PDF');
    return;
  }

  const deptName = employee.department?.map(d => ORGANIZATION_STRUCTURE[d]?.name).join(', ') || '-';
  const subDeptName = employee.subdepartment?.join(', ') || '-';
  
  const emergencyContactsHtml = employee.emergency_contacts && employee.emergency_contacts.length > 0
    ? employee.emergency_contacts.map(c => `
        <div style="margin-bottom: 10px; padding: 8px; background: #fff1f2; border-left: 3px solid #fecaca;">
          <strong>${c.name}</strong> (${c.relation})<br>
          <span style="color: #881337;">${c.phone}</span>
        </div>
      `).join('')
    : '<p style="color: #94a3b8; font-style: italic;">Контакты не указаны</p>';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${employee.full_name} - Личное дело</title>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #0f172a;
            line-height: 1.6;
          }
          .header {
            display: flex;
            gap: 25px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f1f5f9;
          }
          .photo {
            width: 120px;
            height: 120px;
            border-radius: 12px;
            object-fit: cover;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
          }
          .header-info h1 {
            font-size: 24px;
            font-weight: 800;
            margin: 0 0 5px 0;
            text-transform: uppercase;
          }
          .header-info h2 {
            font-size: 14px;
            color: #3b82f6;
            margin: 0 0 15px 0;
            text-transform: uppercase;
          }
          .badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .badge {
            background: #f8fafc;
            color: #475569;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            border: 1px solid #e2e8f0;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 10px;
            font-weight: 800;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 10px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 2px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 15px;
          }
          .label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .value {
            font-size: 12px;
            font-weight: 600;
            color: #0f172a;
          }
          .footer {
            margin-top: 40px;
            text-align: right;
            font-size: 9px;
            color: #cbd5e1;
            padding-top: 15px;
            border-top: 1px solid #f1f5f9;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${employee.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(employee.full_name || '') + '&background=f1f5f9&color=64748b'}" 
               class="photo" 
               onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(employee.full_name || '')}&background=f1f5f9&color=64748b'" />
          <div class="header-info">
            <h1>${employee.full_name || 'Не указано'}</h1>
            <h2>${employee.position || 'Должность не указана'}</h2>
            <div class="badges">
              <span class="badge">ID: ${employee.id.substring(0, 8)}</span>
              ${employee.nickname ? `<span class="badge">NIK: ${employee.nickname}</span>` : ''}
              <span class="badge">Принят: ${employee.join_date || '-'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Организационная структура</div>
          <div class="grid-2">
            <div>
              <div class="label">Департамент</div>
              <div class="value">${deptName}</div>
            </div>
            <div>
              <div class="label">Отдел/Секция</div>
              <div class="value">${subDeptName}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Контактная информация</div>
          <div class="grid-2">
            <div>
              <div class="label">Телефон</div>
              <div class="value">${employee.phone || '-'}</div>
            </div>
            <div>
              <div class="label">Email</div>
              <div class="value">${employee.email || '-'}</div>
            </div>
            <div>
              <div class="label">Telegram</div>
              <div class="value">${employee.telegram || '-'}</div>
            </div>
            <div>
              <div class="label">WhatsApp</div>
              <div class="value">${employee.whatsapp || '-'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Экстренные контакты</div>
          ${emergencyContactsHtml}
        </div>

        <div class="footer">
          CONFIDENTIAL PERSONNEL RECORD • HR SYSTEM PRO • ${format(new Date(), 'dd.MM.yyyy')}
        </div>

        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.onafterprint = () => window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  
  printWindow.document.close();
}

/**
 * Экспорт статистик в Excel-подобный формат (CSV с расширенным форматированием)
 */
export function exportStatisticsToExcel(
  definitions: StatisticDefinition[],
  values: Record<string, StatisticValue[]>,
  period: string
): void {
  // Создаем более детальный CSV с историей значений
  const rows: string[] = [];
  
  // Заголовок
  rows.push('ЭКСПОРТ СТАТИСТИК');
  rows.push(`Дата экспорта: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`);
  rows.push(`Период: ${period}`);
  rows.push('');
  
  // Для каждой статистики
  definitions.forEach(def => {
    rows.push(`СТАТИСТИКА: ${def.title}`);
    rows.push(`Владелец: ${def.owner_id || 'Не указан'}`);
    rows.push(`Описание: ${def.description || 'Нет описания'}`);
    rows.push('');
    rows.push('Дата,Значение,Значение 2');
    
    const statValues = (values[def.id] || [])
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    statValues.forEach(val => {
      rows.push(`${val.date},${val.value},${val.value2 || 0}`);
    });
    
    rows.push('');
    rows.push('---');
    rows.push('');
  });
  
  const csvContent = rows.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `statistics_detailed_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

