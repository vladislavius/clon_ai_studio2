import React, { useRef } from 'react';
import { Download, Award, Calendar, User, CheckCircle } from 'lucide-react';

interface CertificateData {
  studentName: string;
  courseName: string;
  completionDate: string;
  score?: number;
  certificateId: string;
  curatorName?: string;
}

interface CertificateGeneratorProps {
  certificateData: CertificateData;
  onClose: () => void;
}

export const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({ certificateData, onClose }) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!certificateRef.current) return;

    // Создаем canvas для экспорта
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 800;
    canvas.width = width;
    canvas.height = height;

    // Фон сертификата
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Декоративная рамка
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Внутренняя рамка
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 80, width - 160, height - 160);

    // Заголовок
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('СЕРТИФИКАТ', width / 2, 180);

    // Подзаголовок
    ctx.fillStyle = '#64748b';
    ctx.font = '24px Arial';
    ctx.fillText('О прохождении курса', width / 2, 230);

    // Имя студента
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(certificateData.studentName, width / 2, 320);

    // Текст сертификата
    ctx.fillStyle = '#475569';
    ctx.font = '20px Arial';
    ctx.fillText('успешно прошел(а) курс', width / 2, 380);

    // Название курса
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`"${certificateData.courseName}"`, width / 2, 440);

    // Дата
    ctx.fillStyle = '#64748b';
    ctx.font = '18px Arial';
    ctx.fillText(`Дата выдачи: ${new Date(certificateData.completionDate).toLocaleDateString('ru-RU')}`, width / 2, 520);

    // ID сертификата
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Arial';
    ctx.fillText(`ID: ${certificateData.certificateId}`, width / 2, 580);

    // Подпись куратора
    if (certificateData.curatorName) {
      ctx.fillStyle = '#475569';
      ctx.font = '16px Arial';
      ctx.fillText(`Куратор: ${certificateData.curatorName}`, width / 2, 650);
    }

    // Скачивание
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificateData.certificateId}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="text-yellow-500" size={28} /> Сертификат о прохождении курса
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-8">
          {/* Сертификат для предпросмотра */}
          <div
            ref={certificateRef}
            className="bg-gradient-to-br from-blue-50 via-white to-purple-50 border-4 border-blue-600 rounded-xl p-12 text-center shadow-lg"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)',
            }}
          >
            {/* Декоративные элементы */}
            <div className="absolute top-4 left-4 w-16 h-16 border-4 border-blue-600 rounded-full opacity-20"></div>
            <div className="absolute top-4 right-4 w-16 h-16 border-4 border-purple-600 rounded-full opacity-20"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 border-4 border-blue-600 rounded-full opacity-20"></div>
            <div className="absolute bottom-4 right-4 w-16 h-16 border-4 border-purple-600 rounded-full opacity-20"></div>

            {/* Заголовок */}
            <div className="mb-8">
              <h1 className="text-5xl font-bold text-blue-900 mb-3">СЕРТИФИКАТ</h1>
              <p className="text-xl text-slate-600">О прохождении курса</p>
            </div>

            {/* Имя студента */}
            <div className="my-12">
              <p className="text-3xl font-bold text-slate-900 mb-4">{certificateData.studentName}</p>
              <p className="text-xl text-slate-600 mb-6">успешно прошел(а) курс</p>
              <div className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">
                <p className="text-2xl font-bold">{certificateData.courseName}</p>
              </div>
            </div>

            {/* Информация */}
            <div className="mt-12 space-y-4">
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Calendar size={20} />
                <span>Дата выдачи: {new Date(certificateData.completionDate).toLocaleDateString('ru-RU', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              
              {certificateData.score !== undefined && (
                <div className="flex items-center justify-center gap-2 text-slate-600">
                  <CheckCircle size={20} />
                  <span>Оценка: {certificateData.score}%</span>
                </div>
              )}

              {certificateData.curatorName && (
                <div className="flex items-center justify-center gap-2 text-slate-600">
                  <User size={20} />
                  <span>Куратор: {certificateData.curatorName}</span>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-slate-300">
                <p className="text-xs text-slate-400">ID сертификата: {certificateData.certificateId}</p>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Download size={20} /> Скачать сертификат
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

