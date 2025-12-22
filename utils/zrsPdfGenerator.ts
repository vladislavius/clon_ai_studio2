/**
 * Генератор PDF для ЗРС (Завершенная Работа Сотрудника)
 */

import { ZRSData } from '../components/ZRSForm';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function generateZRSPDF(zrs: ZRSData) {
  // Создаем HTML для PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ЗРС - ${format(new Date(zrs.created_at || new Date()), 'dd.MM.yyyy', { locale: ru })}</title>
      <style>
        @page {
          margin: 2.5cm 3cm 2cm 3cm;
          size: A4;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.7;
          color: #1e293b;
          background: #ffffff;
          max-width: 100%;
        }
        .company-logo {
          position: fixed;
          top: 0;
          right: 0;
          font-size: 16pt;
          font-weight: 900;
          color: #d4af37;
          text-shadow: 2px 2px 4px rgba(212, 175, 55, 0.4);
          letter-spacing: 2px;
          padding: 10px 15px;
          z-index: 1000;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 220, 0.95) 100%);
          border-bottom-left-radius: 8px;
        }
        .container {
          max-width: 100%;
          margin: 0 auto;
          padding: 0 15px;
          position: relative;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 3px solid #f59e0b;
        }
        .header h1 {
          font-size: 32pt;
          font-weight: 800;
          margin: 0;
          letter-spacing: 4px;
          color: #f59e0b;
          text-transform: uppercase;
        }
        .header-subtitle {
          font-size: 9pt;
          color: #64748b;
          margin-top: 8px;
          font-weight: 500;
        }
        .meta-info {
          margin-bottom: 25px;
          padding: 12px 15px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-left: 4px solid #f59e0b;
          border-radius: 8px;
        }
        .meta-row {
          margin-bottom: 10px;
          font-size: 10pt;
        }
        .meta-row:last-child {
          margin-bottom: 0;
        }
        .meta-label {
          font-weight: 700;
          color: #92400e;
          display: inline-block;
          min-width: 80px;
        }
        .meta-value {
          color: #1e293b;
          font-weight: 500;
        }
        .date-badge {
          display: inline-block;
          background: #ffffff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 9pt;
          font-weight: 600;
          color: #92400e;
          margin-top: 10px;
        }
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 13pt;
          font-weight: 700;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #1e293b;
        }
        .section-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #ffffff;
          border-radius: 50%;
          font-weight: 800;
          font-size: 14pt;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
        }
        .section-content {
          margin-left: 44px;
          padding: 15px 18px;
          background: #f8fafc;
          border-left: 3px solid #fbbf24;
          border-radius: 6px;
          text-align: justify;
          white-space: pre-wrap;
          font-size: 10.5pt;
          line-height: 1.8;
          color: #334155;
        }
        .signature-block {
          margin-top: 35px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          gap: 25px;
        }
        .signature-item {
          flex: 1;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .signature-label {
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
          font-size: 10pt;
        }
        .signature-line {
          border-bottom: 2px solid #cbd5e1;
          margin-top: 40px;
          height: 50px;
          position: relative;
        }
        .signature-line::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 1px;
          background: #94a3b8;
        }
        .footer-note {
          margin-top: 30px;
          padding: 12px;
          background: #f1f5f9;
          border-radius: 6px;
          font-size: 9pt;
          color: #64748b;
          font-style: italic;
          text-align: center;
          border: 1px dashed #cbd5e1;
        }
        @media print {
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="company-logo">Остров Сокровищ</div>
        <div class="header" style="margin-top: 30px;">
          <h1>ЗРС</h1>
          <div class="header-subtitle">Завершенная Работа Сотрудника</div>
        </div>
        
        <div class="meta-info">
          <div class="date-badge">
            Дата: ${format(new Date(zrs.created_at || new Date()), 'dd.MM.yyyy', { locale: ru })}
          </div>
          <div class="meta-row" style="margin-top: 15px;">
            <span class="meta-label">Кому:</span>
            <span class="meta-value">${escapeHtml(zrs.to_whom)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">От кого:</span>
            <span class="meta-value">${escapeHtml(zrs.from_whom)}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">
            <span class="section-number">1</span>
            <span>Ситуация</span>
          </div>
          <div class="section-content">${escapeHtml(zrs.situation)}</div>
        </div>
        
        <div class="section">
          <div class="section-title">
            <span class="section-number">2</span>
            <span>Данные</span>
          </div>
          <div class="section-content">${escapeHtml(zrs.data)}</div>
        </div>
        
        <div class="section">
          <div class="section-title">
            <span class="section-number">3</span>
            <span>Решение</span>
          </div>
          <div class="section-content">${escapeHtml(zrs.solution)}</div>
        </div>
        
        <div class="signature-block">
          <div class="signature-item">
            <div class="signature-label">Одобрено:</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-item">
            <div class="signature-label">Не одобрено:</div>
            <div class="signature-line"></div>
          </div>
        </div>
        
        <div class="footer-note">
          Подпись руководителя будет добавлена при одобрении документа
        </div>
      </div>
    </body>
    </html>
  `;

  // Создаем новое окно для печати
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Пожалуйста, разрешите всплывающие окна для генерации PDF');
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Ждем загрузки и вызываем печать
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Закрываем окно после печати (опционально)
      // printWindow.close();
    }, 250);
  };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

