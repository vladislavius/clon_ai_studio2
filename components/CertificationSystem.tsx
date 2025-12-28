import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, Clock, TrendingUp, Target, Star } from 'lucide-react';
import { CertificateGenerator } from './CertificateGenerator';

interface CertificationResult {
  passed: boolean;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completionDate: string;
  certificateId?: string;
}

interface CertificationSystemProps {
  courseId: string;
  courseName: string;
  studentName: string;
  onComplete: (result: CertificationResult) => void;
}

export const CertificationSystem: React.FC<CertificationSystemProps> = ({
  courseId,
  courseName,
  studentName,
  onComplete,
}) => {
  const [showCertificate, setShowCertificate] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);
  const [isCertifying, setIsCertifying] = useState(false);

  // Имитация аттестации (в реальности здесь будут вопросы из курса)
  const handleStartCertification = async () => {
    setIsCertifying(true);
    
    // Симуляция прохождения аттестации
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Генерируем результат (в реальности это будет на основе ответов)
    const score = Math.floor(Math.random() * 20) + 80; // 80-100%
    const totalQuestions = 20;
    const correctAnswers = Math.round((score / 100) * totalQuestions);
    const passed = score >= 80; // Минимум 80% для прохождения
    
    const certificateId = `CERT-${courseId}-${Date.now()}`;
    
    const result: CertificationResult = {
      passed,
      score,
      totalQuestions,
      correctAnswers,
      completionDate: new Date().toISOString(),
      certificateId: passed ? certificateId : undefined,
    };

    if (passed) {
      setCertificateData({
        studentName,
        courseName,
        completionDate: result.completionDate,
        score: result.score,
        certificateId: result.certificateId,
        curatorName: 'Система автоматической проверки',
      });
      setShowCertificate(true);
    }

    setIsCertifying(false);
    onComplete(result);
  };

  return (
    <>
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Award className="text-white" size={40} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Аттестация по курсу</h3>
          <p className="text-slate-600">{courseName}</p>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Target size={20} /> Требования для получения сертификата:
          </h4>
          <ul className="space-y-2 text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={18} />
              <span>Выполнить все задания контрольного листа</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={18} />
              <span>Пройти проверку куратором</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={18} />
              <span>Набрать минимум 80% на аттестации</span>
            </li>
          </ul>
        </div>

        <button
          onClick={handleStartCertification}
          disabled={isCertifying}
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isCertifying ? (
            <>
              <Clock className="animate-spin" size={24} />
              Прохождение аттестации...
            </>
          ) : (
            <>
              <Star size={24} />
              Начать аттестацию
            </>
          )}
        </button>
      </div>

      {showCertificate && certificateData && (
        <CertificateGenerator
          certificateData={certificateData}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </>
  );
};

