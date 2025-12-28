import React, { useState } from 'react';
import { UserCheck, CheckCircle2, XCircle, MessageSquare, FileText, Star } from 'lucide-react';

interface TaskSubmission {
  taskId: string;
  studentName: string;
  submission: {
    content: string;
    submittedAt: string;
  };
  autoGradeScore?: number;
  autoGradeFeedback?: string;
}

interface CuratorReviewPanelProps {
  submissions: TaskSubmission[];
  onApprove: (taskId: string, notes?: string) => void;
  onReject: (taskId: string, notes: string) => void;
  curatorName?: string;
}

export const CuratorReviewPanel: React.FC<CuratorReviewPanelProps> = ({
  submissions,
  onApprove,
  onReject,
  curatorName = 'Куратор',
}) => {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const handleApprove = (taskId: string) => {
    onApprove(taskId, reviewNotes[taskId]);
    setReviewNotes({ ...reviewNotes, [taskId]: '' });
  };

  const handleReject = (taskId: string) => {
    if (!reviewNotes[taskId]?.trim()) {
      alert('Укажите причину отклонения');
      return;
    }
    onReject(taskId, reviewNotes[taskId]);
  };

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        <UserCheck className="mx-auto text-slate-300 mb-4" size={48} />
        <p className="text-slate-500 font-medium">Нет заданий на проверку</p>
        <p className="text-xs text-slate-400 mt-2">Все задания будут отображаться здесь после отправки студентами</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <UserCheck size={24} className="text-blue-600" />
          Проверка заданий куратором
        </h3>
        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {submissions.length} на проверке
        </span>
      </div>

      <div className="space-y-4">
        {submissions.map((submission) => (
          <div
            key={submission.taskId}
            className="border-2 border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                    Задание {submission.taskId}
                  </span>
                  <span className="text-xs text-slate-500">
                    Студент: {submission.studentName}
                  </span>
                </div>
                
                {submission.autoGradeScore !== undefined && (
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold mb-2 ${
                    submission.autoGradeScore >= 80
                      ? 'bg-green-100 text-green-700'
                      : submission.autoGradeScore >= 60
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    <Star size={12} />
                    Автопроверка: {submission.autoGradeScore}%
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                    <FileText size={14} />
                    Ответ студента:
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{submission.submission.content}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Отправлено: {new Date(submission.submission.submittedAt).toLocaleString('ru-RU')}
                  </p>
                </div>

                {submission.autoGradeFeedback && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Результат автоматической проверки:</p>
                    <p className="text-xs text-slate-600 whitespace-pre-line">{submission.autoGradeFeedback}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Комментарий куратора
                </label>
                <textarea
                  value={reviewNotes[submission.taskId] || ''}
                  onChange={(e) => setReviewNotes({ ...reviewNotes, [submission.taskId]: e.target.value })}
                  placeholder="Оставьте комментарий для студента..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(submission.taskId)}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Одобрить
                </button>
                <button
                  onClick={() => handleReject(submission.taskId)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={18} />
                  Отклонить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

