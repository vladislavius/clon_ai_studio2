import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';

interface GradingCriteria {
  minWords?: number;
  keywords?: string[];
  requiredElements?: string[];
}

interface AutoGraderProps {
  submission: string;
  criteria: GradingCriteria;
  onGrade: (score: number, feedback: string) => void;
}

export const AutoGrader: React.FC<AutoGraderProps> = ({ submission, criteria, onGrade }) => {
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);

  const gradeSubmission = async () => {
    setIsGrading(true);
    
    // Имитация автоматической проверки
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let score = 0;
    const feedback: string[] = [];
    
    // Проверка минимального количества слов
    if (criteria.minWords) {
      const wordCount = submission.trim().split(/\s+/).length;
      if (wordCount >= criteria.minWords) {
        score += 30;
        feedback.push(`✓ Минимальное количество слов соблюдено (${wordCount} из ${criteria.minWords})`);
      } else {
        feedback.push(`✗ Недостаточно слов (${wordCount} из ${criteria.minWords} минимум)`);
      }
    }
    
    // Проверка ключевых слов
    if (criteria.keywords && criteria.keywords.length > 0) {
      const foundKeywords = criteria.keywords.filter(keyword => 
        submission.toLowerCase().includes(keyword.toLowerCase())
      );
      const keywordScore = Math.round((foundKeywords.length / criteria.keywords.length) * 40);
      score += keywordScore;
      
      if (foundKeywords.length === criteria.keywords.length) {
        feedback.push(`✓ Все ключевые слова найдены`);
      } else {
        feedback.push(`⚠ Найдено ${foundKeywords.length} из ${criteria.keywords.length} ключевых слов`);
      }
    }
    
    // Проверка обязательных элементов
    if (criteria.requiredElements && criteria.requiredElements.length > 0) {
      const foundElements = criteria.requiredElements.filter(element =>
        submission.toLowerCase().includes(element.toLowerCase())
      );
      const elementScore = Math.round((foundElements.length / criteria.requiredElements.length) * 30);
      score += elementScore;
      
      if (foundElements.length === criteria.requiredElements.length) {
        feedback.push(`✓ Все обязательные элементы присутствуют`);
      } else {
        feedback.push(`⚠ Найдено ${foundElements.length} из ${criteria.requiredElements.length} обязательных элементов`);
      }
    }
    
    // Базовая оценка за структуру и содержание
    if (submission.length > 100) {
      score += 20;
      feedback.push(`✓ Ответ достаточно развернутый`);
    }
    
    // Ограничиваем оценку до 100%
    score = Math.min(score, 100);
    
    const finalFeedback = feedback.length > 0 
      ? feedback.join('\n')
      : 'Автоматическая проверка завершена';
    
    setResult({ score, feedback: finalFeedback });
    setIsGrading(false);
    onGrade(score, finalFeedback);
  };

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
          <Sparkles size={18} className="text-blue-600" />
          Автоматическая проверка
        </h4>
        <button
          onClick={gradeSubmission}
          disabled={isGrading || !submission.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isGrading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Проверка...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Проверить автоматически
            </>
          )}
        </button>
      </div>

      {result && (
        <div className={`mt-4 p-4 rounded-lg border-2 ${
          result.score >= 80 
            ? 'bg-green-50 border-green-200' 
            : result.score >= 60
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-800">Результат проверки:</span>
            <span className={`text-2xl font-bold ${
              result.score >= 80 ? 'text-green-600' : result.score >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {result.score}%
            </span>
          </div>
          <div className="mt-3 space-y-1">
            {result.feedback.split('\n').map((line, i) => (
              <p key={i} className="text-sm text-slate-700 whitespace-pre-line">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

