import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Circle, MessageSquare, Video, UserCheck, FileText, ChevronRight, ChevronDown, X, BookOpen, Play, Pause, Award, Sparkles, TrendingUp, Target, Clock, Paperclip, Image as ImageIcon, File } from 'lucide-react';
import { AutoGrader } from './AutoGrader';
import { CertificationSystem } from './CertificationSystem';
import { AchievementBadges } from './AchievementBadges';
import { CuratorReviewPanel } from './CuratorReviewPanel';

interface CourseSection {
  id: string;
  type: 'text' | 'image' | 'heading' | 'h1' | 'h2' | 'h3' | 'list' | 'quote' | 'html';
  content: string;
  order: number;
  imageUrl?: string;
  listItems?: string[];
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textColor?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  htmlContent?: string; // Полный HTML контент для типа 'html'
  inlineImages?: Array<{ id: string; url: string; position: number; caption?: string }>; // Изображения внутри текста
}

interface CourseTask {
  id: string;
  sequenceNumber: number;
  text: string;
  type: 'reading' | 'practical' | 'theoretical' | 'essay' | 'training' | 'other';
  description?: string;
  checked: boolean;
  checkedAt?: string;
  submission?: {
    content?: string;
    fileUrl?: string;
    submittedAt: string;
  };
  curatorNotes?: string;
  requiresRevision?: boolean;
  autoGraded?: boolean;
  autoGradeScore?: number;
  autoGradeFeedback?: string;
  gradingCriteria?: {
    minWords?: number;
    keywords?: string[];
    requiredElements?: string[];
  };
  curatorChecked?: boolean;
  curatorCheckedAt?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  sections: CourseSection[];
  tasks: CourseTask[];
}

interface CourseViewerProps {
  course: Course;
  onBack: () => void;
  onTaskToggle: (taskId: string) => void;
  onTaskExpand: (taskId: string | null) => void;
  expandedTaskId: string | null;
  showChat: boolean;
  showVideo: boolean;
  onToggleChat: () => void;
  onToggleVideo: () => void;
  chatMessages: Array<{ id: string; sender: 'student' | 'curator'; message: string; timestamp: string; attachments?: Array<{ id: string; name: string; url: string; type: string; size: number }> }>;
  newMessage: string;
  onMessageChange: (message: string) => void;
  onSendMessage: (attachments?: Array<{ id: string; name: string; url: string; type: string; size: number }>) => void;
  isAdmin?: boolean;
  studentName?: string;
  onTaskUpdate?: (taskId: string, updates: Partial<CourseTask>) => void;
}

export const CourseViewer: React.FC<CourseViewerProps> = ({
  course,
  onBack,
  onTaskToggle,
  onTaskExpand,
  expandedTaskId,
  showChat,
  showVideo,
  onToggleChat,
  onToggleVideo,
  chatMessages,
  newMessage,
  onMessageChange,
  onSendMessage,
  isAdmin,
  studentName = 'Студент',
  onTaskUpdate,
}) => {
  const [taskSubmissions, setTaskSubmissions] = useState<Record<string, string>>({});
  const [showCertification, setShowCertification] = useState(false);
  const [showCuratorPanel, setShowCuratorPanel] = useState(false);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement>>({});
  const [chatAttachments, setChatAttachments] = useState<Array<{ id: string; name: string; url: string; type: string; size: number }>>([]);
  
  const completedTasks = course.tasks.filter(t => t.checked && t.curatorChecked).length;
  const totalTasks = course.tasks.length;
  const allTasksCompleted = completedTasks === totalTasks && totalTasks > 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Задания на проверку куратором
  const pendingReviewTasks = course.tasks.filter(t => 
    t.submission && !t.curatorChecked
  );
  
  const handleTaskSubmission = (taskId: string, submission: string) => {
    setTaskSubmissions({ ...taskSubmissions, [taskId]: submission });
    if (onTaskUpdate) {
      onTaskUpdate(taskId, {
        submission: {
          content: submission,
          submittedAt: new Date().toISOString(),
        },
      });
    }
  };

  const handleAutoGrade = (taskId: string, score: number, feedback: string) => {
    if (onTaskUpdate) {
      onTaskUpdate(taskId, {
        autoGraded: true,
        autoGradeScore: score,
        autoGradeFeedback: feedback,
      });
    }
  };

  // Обработка сообщений от iframe для автоматической подстройки высоты
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'iframe-height' && event.data.id) {
        const iframe = iframeRefs.current[event.data.id];
        if (iframe) {
          iframe.style.height = `${event.data.height}px`;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const renderSection = (section: CourseSection) => {
    switch (section.type) {
      case 'h1':
        return (
          <h1
            className="mt-8 mb-4 pb-3 border-b-2 border-blue-200 break-words overflow-wrap-anywhere word-break:break-word text-4xl font-bold"
            style={{
              color: section.textColor || '#1e293b',
              textAlign: section.textAlign || 'left',
              fontWeight: section.fontWeight || 'bold',
              fontStyle: section.fontStyle || 'normal',
              textDecoration: section.textDecoration || 'none',
            }}
          >
            {section.content}
          </h1>
        );
      case 'h2':
        return (
          <h2
            className="mt-8 mb-4 pb-3 border-b-2 border-blue-200 break-words overflow-wrap-anywhere word-break:break-word text-3xl font-bold"
            style={{
              color: section.textColor || '#1e293b',
              textAlign: section.textAlign || 'left',
              fontWeight: section.fontWeight || 'bold',
              fontStyle: section.fontStyle || 'normal',
              textDecoration: section.textDecoration || 'none',
            }}
          >
            {section.content}
          </h2>
        );
      case 'h3':
        return (
          <h3
            className="mt-8 mb-4 pb-3 border-b-2 border-blue-200 break-words overflow-wrap-anywhere word-break:break-word text-2xl font-bold"
            style={{
              color: section.textColor || '#1e293b',
              textAlign: section.textAlign || 'left',
              fontWeight: section.fontWeight || 'bold',
              fontStyle: section.fontStyle || 'normal',
              textDecoration: section.textDecoration || 'none',
            }}
          >
            {section.content}
          </h3>
        );
      case 'heading':
        return (
          <h2
            className="text-2xl font-bold mt-8 mb-4 pb-3 border-b-2 border-blue-200 break-words overflow-wrap-anywhere word-break:break-word"
            style={{
              color: section.textColor || '#1e293b',
              textAlign: section.textAlign || 'left',
              fontWeight: section.fontWeight || 'bold',
              fontStyle: section.fontStyle || 'normal',
              textDecoration: section.textDecoration || 'none',
            }}
          >
            {section.content}
          </h2>
        );
      
      case 'text':
        // Обрабатываем встроенные изображения
        const renderTextWithImages = () => {
          if (!section.inlineImages || section.inlineImages.length === 0) {
            // Если нет изображений, просто показываем текст
            return section.content.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < section.content.split('\n').length - 1 && <br />}
              </React.Fragment>
            ));
          }

          // Сортируем изображения по позиции
          const sortedImages = [...section.inlineImages].sort((a, b) => a.position - b.position);
          const parts: Array<{ type: 'text' | 'image'; content?: string; image?: typeof sortedImages[0] }> = [];
          let lastPos = 0;

          sortedImages.forEach((img) => {
            // Добавляем текст до изображения
            if (img.position > lastPos) {
              parts.push({
                type: 'text',
                content: section.content.substring(lastPos, img.position)
              });
            }
            // Добавляем изображение
            parts.push({ type: 'image', image: img });
            lastPos = img.position;
          });

          // Добавляем оставшийся текст
          if (lastPos < section.content.length) {
            parts.push({
              type: 'text',
              content: section.content.substring(lastPos)
            });
          }

          return parts.map((part, i) => {
            if (part.type === 'image' && part.image) {
              return (
                <React.Fragment key={`img-${part.image.id}`}>
                  <div className="my-6 flex flex-col items-center">
                    <img
                      src={part.image.url}
                      alt={part.image.caption || 'Изображение'}
                      className="max-w-full h-auto rounded-lg shadow-md border border-slate-200"
                      style={{ maxHeight: '500px' }}
                    />
                    {part.image.caption && (
                      <figcaption className="text-center text-sm text-slate-500 mt-2 italic">
                        {part.image.caption}
                      </figcaption>
                    )}
                  </div>
                </React.Fragment>
              );
            } else if (part.type === 'text' && part.content) {
              return (
                <React.Fragment key={`text-${i}`}>
                  {part.content.split('\n').map((line, lineIdx) => (
                    <React.Fragment key={lineIdx}>
                      {line}
                      {lineIdx < part.content!.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              );
            }
            return null;
          });
        };

        return (
          <div
            className="leading-relaxed mb-6 text-base break-words overflow-wrap-anywhere word-break:break-word"
            style={{
              color: section.textColor || '#1e293b',
              textAlign: section.textAlign || 'left',
              fontWeight: section.fontWeight || 'normal',
              fontStyle: section.fontStyle || 'normal',
              textDecoration: section.textDecoration || 'none',
            }}
          >
            {renderTextWithImages()}
          </div>
        );
      
      case 'image':
        return (
          <figure className="my-8">
            <img
              src={section.imageUrl}
              alt={section.content || 'Изображение'}
              className="w-full rounded-xl shadow-lg border border-slate-200"
            />
            {section.content && (
              <figcaption className="text-center text-sm text-slate-500 mt-3 italic">
                {section.content}
              </figcaption>
            )}
          </figure>
        );
      
      case 'list':
        return (
          <ul className="list-none space-y-2 my-6">
            {section.listItems?.map((item, i) => (
              <li key={i} className="flex items-start gap-3 break-words overflow-wrap-anywhere">
                <span className="text-blue-500 mt-1.5 flex-shrink-0">•</span>
                <span className="text-slate-700 flex-1 break-words overflow-wrap-anywhere word-break:break-word">{item}</span>
              </li>
            ))}
          </ul>
        );
      
      case 'quote':
        return (
          <blockquote className="border-l-4 border-blue-500 pl-6 py-4 my-6 bg-blue-50 rounded-r-lg italic text-slate-700 break-words overflow-wrap-anywhere word-break:break-word">
            {section.content}
          </blockquote>
        );
      
      case 'html':
        return (
          <div className="my-8 html-content-wrapper w-full" style={{ position: 'relative', isolation: 'isolate', overflow: 'visible' }}>
            <iframe
              ref={(el) => {
                if (el) {
                  iframeRefs.current[section.id] = el;
                }
              }}
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                      body { 
                        margin: 0; 
                        padding: 0; 
                        overflow: visible !important; 
                        position: relative !important;
                      }
                      html { 
                        overflow: visible !important; 
                        position: relative !important;
                      }
                      * { 
                        max-width: 100% !important;
                      }
                    </style>
                    <script>
                      (function() {
                        function sendHeight() {
                          var height = Math.max(
                            document.body.scrollHeight,
                            document.body.offsetHeight,
                            document.documentElement.clientHeight,
                            document.documentElement.scrollHeight,
                            document.documentElement.offsetHeight
                          );
                          window.parent.postMessage({ type: 'iframe-height', id: '${section.id}', height: height }, '*');
                        }
                        window.addEventListener('load', sendHeight);
                        window.addEventListener('resize', sendHeight);
                        setTimeout(sendHeight, 100);
                        setTimeout(sendHeight, 500);
                        setTimeout(sendHeight, 1000);
                      })();
                    </script>
                  </head>
                  <body>
                    ${section.htmlContent || section.content}
                  </body>
                </html>
              `}
              className="w-full border-0 rounded-lg"
              style={{ 
                width: '100%',
                display: 'block',
                border: 'none',
                overflow: 'hidden',
                minHeight: '400px'
              }}
              sandbox="allow-same-origin allow-scripts"
              title="HTML Content"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-xl mb-6 shadow-lg">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBack();
              }}
              className="mb-4 px-5 py-2.5 bg-white text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 text-sm font-bold transition-all hover:scale-105 shadow-lg border-2 border-white/50"
            >
              <ChevronRight className="rotate-180" size={20} /> Назад к курсам
            </button>
            <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
            <p className="text-white/90 text-base">{course.description}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {totalTasks > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Прогресс выполнения</span>
              <span className="text-lg font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-white h-3 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-white/80 mt-2">
              Выполнено: {completedTasks} из {totalTasks} заданий
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4 flex-wrap">
          {isAdmin && pendingReviewTasks.length > 0 && (
            <button
              onClick={() => setShowCuratorPanel(!showCuratorPanel)}
              className={`px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                showCuratorPanel
                  ? 'bg-white text-orange-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <UserCheck size={18} />
              Проверка заданий
              {pendingReviewTasks.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingReviewTasks.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={onToggleChat}
            className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              showChat
                ? 'bg-white text-blue-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <MessageSquare size={18} /> Чат с куратором
          </button>
          <button
            onClick={onToggleVideo}
            className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              showVideo
                ? 'bg-white text-green-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Video size={18} /> Видеосвязь
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6">
        {/* Main Content */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${showChat || showVideo || showCuratorPanel ? 'md:w-2/3' : 'w-full'}`}>
          {/* Curator Review Panel */}
          {showCuratorPanel && isAdmin && (
            <div className="mb-6">
              <CuratorReviewPanel
                submissions={pendingReviewTasks.map(task => ({
                  taskId: task.id,
                  studentName: studentName,
                  submission: task.submission!,
                  autoGradeScore: task.autoGradeScore,
                  autoGradeFeedback: task.autoGradeFeedback,
                }))}
                onApprove={(taskId, notes) => {
                  if (onTaskUpdate) {
                    onTaskUpdate(taskId, {
                      curatorChecked: true,
                      curatorCheckedAt: new Date().toISOString(),
                      curatorNotes: notes,
                      requiresRevision: false,
                    });
                  }
                }}
                onReject={(taskId, notes) => {
                  if (onTaskUpdate) {
                    onTaskUpdate(taskId, {
                      curatorChecked: true,
                      curatorCheckedAt: new Date().toISOString(),
                      curatorNotes: notes,
                      requiresRevision: true,
                    });
                  }
                }}
                curatorName="Куратор"
              />
            </div>
          )}

          {/* Achievement Badges */}
          <div className="mb-6">
            <AchievementBadges
              courseId={course.id}
              completedTasks={completedTasks}
              totalTasks={totalTasks}
              certifications={0}
            />
          </div>

          {/* Course Content Container */}
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg p-6 md:p-10 mb-6 w-full max-w-full overflow-x-auto overflow-y-visible">
            <style>{`
              .html-content-wrapper {
                width: 100%;
                max-width: 100%;
                overflow-x: auto;
                overflow-y: auto;
                margin: 0;
                padding: 0;
                position: relative;
              }
              .html-content {
                width: 100%;
                max-width: 100%;
                margin: 0;
                padding: 0;
                overflow-x: auto;
                overflow-y: auto;
                box-sizing: border-box;
              }
              .html-content iframe {
                width: 100%;
                max-width: 100%;
                border: none;
              }
              .html-content .slide-container {
                max-width: 100%;
                width: 100% !important;
                height: auto !important;
                min-height: 500px;
                margin: 0 auto;
                overflow: visible;
                box-sizing: border-box;
              }
              .html-content .left-panel,
              .html-content .right-panel {
                flex: 1 1 auto;
                max-width: 100%;
                overflow: visible;
                box-sizing: border-box;
              }
              .html-content * {
                max-width: 100%;
                box-sizing: border-box;
              }
              .html-content img {
                max-width: 100%;
                height: auto;
              }
              @media (max-width: 768px) {
                .html-content .slide-container {
                  flex-direction: column;
                  min-height: auto;
                }
                .html-content .left-panel,
                .html-content .right-panel {
                  flex: 1 1 100%;
                  max-width: 100%;
                }
                .html-content .left-panel {
                  padding: 40px 30px !important;
                }
                .html-content h1 {
                  font-size: 2.5rem !important;
                }
              }
            `}</style>
            <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-p:text-slate-700 prose-p:leading-relaxed prose-ul:list-disc prose-ul:pl-6 prose-li:text-slate-700 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600 break-words overflow-wrap-anywhere word-break:break-word">
              {course.sections
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <div key={section.id} className="mb-6 last:mb-0 break-words overflow-wrap-anywhere">
                    {renderSection(section)}
                  </div>
                ))}
            </div>
          </div>

          {/* Certification Block */}
          {allTasksCompleted && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-300 shadow-lg p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Award className="text-white" size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Все задания выполнены!</h3>
                  <p className="text-slate-600 mb-3">Вы готовы пройти аттестацию и получить сертификат</p>
                  <button
                    onClick={() => setShowCertification(true)}
                    className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <Target size={18} /> Пройти аттестацию
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Checklist */}
          {course.tasks.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg p-6 md:p-8 w-full max-w-full overflow-hidden">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText size={24} /> Контрольный лист заданий
              </h3>
              <div className="space-y-4">
                {course.tasks
                  .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
                  .map((task) => (
                    <div
                      key={task.id}
                      className={`border-2 rounded-xl p-5 md:p-6 transition-all overflow-hidden ${
                        task.checked && task.curatorChecked
                          ? 'bg-green-50 border-green-300 shadow-sm'
                          : task.checked
                          ? 'bg-blue-50 border-blue-300 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => onTaskToggle(task.id)}
                          className="flex-shrink-0 mt-1"
                        >
                          {task.checked ? (
                            <CheckCircle2 className="text-green-600" size={28} />
                          ) : (
                            <Circle className="text-slate-400" size={28} />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                  Задание {task.sequenceNumber}
                                </span>
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold">
                                  {task.type === 'reading' && 'Чтение'}
                                  {task.type === 'practical' && 'Практика'}
                                  {task.type === 'theoretical' && 'Теория'}
                                  {task.type === 'essay' && 'Эссе'}
                                  {task.type === 'training' && 'Тренировка'}
                                  {task.type === 'other' && 'Другое'}
                                </span>
                                {task.curatorChecked && (
                                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-semibold flex items-center gap-1">
                                    <UserCheck size={12} />
                                    Проверено куратором
                                  </span>
                                )}
                                {task.autoGraded && (
                                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-semibold flex items-center gap-1">
                                    <Sparkles size={12} />
                                    Автопроверка: {task.autoGradeScore}%
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-slate-800 text-lg mb-1 break-words overflow-wrap-anywhere word-break:break-word">{task.text}</h4>
                              {task.description && (
                                <p className="text-sm text-slate-600 mb-3 break-words overflow-wrap-anywhere word-break:break-word">{task.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => onTaskExpand(expandedTaskId === task.id ? null : task.id)}
                              className="flex-shrink-0 p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-all shadow-sm hover:shadow-md"
                              title={expandedTaskId === task.id ? "Свернуть" : "Раскрыть задание"}
                            >
                              {expandedTaskId === task.id ? (
                                <ChevronDown size={22} className="font-bold" />
                              ) : (
                                <ChevronRight size={22} className="font-bold" />
                              )}
                            </button>
                          </div>

                          {expandedTaskId === task.id && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              {task.submission && (
                                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="text-xs font-semibold text-blue-700 mb-2">Ваш ответ:</p>
                                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.submission.content}</p>
                                  {task.submission.fileUrl && (
                                    <a
                                      href={task.submission.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                                    >
                                      Открыть прикрепленный файл
                                    </a>
                                  )}
                                </div>
                              )}

                              {task.curatorNotes && (
                                <div className={`mb-4 p-4 rounded-lg border ${
                                  task.requiresRevision
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-green-50 border-green-200'
                                }`}>
                                  <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                                    <UserCheck size={16} />
                                    {task.requiresRevision ? 'Требуется доработка' : 'Проверено куратором'}
                                  </p>
                                  <p className="text-sm text-slate-700">{task.curatorNotes}</p>
                                </div>
                              )}

                              {/* Статусы проверки */}
                              <div className="flex items-center gap-3 mb-3">
                                {task.autoGraded && (
                                  <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                                    (task.autoGradeScore || 0) >= 80 
                                      ? 'bg-green-100 text-green-700' 
                                      : (task.autoGradeScore || 0) >= 60
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    <Sparkles size={14} />
                                    Автопроверка: {task.autoGradeScore}%
                                  </div>
                                )}
                                {task.curatorChecked && (
                                  <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1">
                                    <UserCheck size={14} />
                                    Проверено куратором
                                  </div>
                                )}
                              </div>

                              {task.autoGradeFeedback && (
                                <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                  <p className="text-xs font-semibold text-slate-700 mb-1">Результат автоматической проверки:</p>
                                  <p className="text-sm text-slate-600 whitespace-pre-line">{task.autoGradeFeedback}</p>
                                </div>
                              )}

                              {!task.submission && (
                                <div className="space-y-3">
                                  <textarea
                                    value={taskSubmissions[task.id] || ''}
                                    onChange={(e) => setTaskSubmissions({ ...taskSubmissions, [task.id]: e.target.value })}
                                    placeholder="Введите ваш ответ..."
                                    className="w-full p-4 border-2 border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none break-words overflow-wrap-anywhere word-break:break-word min-w-0"
                                    rows={6}
                                  />
                                  
                                  {/* Автоматическая проверка */}
                                  {task.gradingCriteria && (
                                    <AutoGrader
                                      submission={taskSubmissions[task.id] || ''}
                                      criteria={task.gradingCriteria}
                                      onGrade={(score, feedback) => handleAutoGrade(task.id, score, feedback)}
                                    />
                                  )}
                                  
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleTaskSubmission(task.id, taskSubmissions[task.id] || '')}
                                      disabled={!taskSubmissions[task.id]?.trim()}
                                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Отправить на проверку куратору
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {task.checkedAt && (
                            <p className="text-xs text-slate-400 mt-3">
                              Выполнено: {new Date(task.checkedAt).toLocaleString('ru-RU')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Certification System */}
          {showCertification && (
            <div className="mt-6">
              <CertificationSystem
                courseId={course.id}
                courseName={course.title}
                studentName={studentName}
                onComplete={(result) => {
                  console.log('Certification result:', result);
                  setShowCertification(false);
                }}
              />
            </div>
          )}
        </div>

          {/* Curator Panel Sidebar */}
          {showCuratorPanel && isAdmin && (
            <div className="md:w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-shrink-0 h-full">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck size={18} /> Проверка заданий
                </h3>
                <button
                  onClick={() => setShowCuratorPanel(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <CuratorReviewPanel
                  submissions={pendingReviewTasks.map(task => ({
                    taskId: task.id,
                    studentName: studentName,
                    submission: task.submission!,
                    autoGradeScore: task.autoGradeScore,
                    autoGradeFeedback: task.autoGradeFeedback,
                  }))}
                  onApprove={(taskId, notes) => {
                    if (onTaskUpdate) {
                      onTaskUpdate(taskId, {
                        curatorChecked: true,
                        curatorCheckedAt: new Date().toISOString(),
                        curatorNotes: notes,
                        requiresRevision: false,
                      });
                    }
                  }}
                  onReject={(taskId, notes) => {
                    if (onTaskUpdate) {
                      onTaskUpdate(taskId, {
                        curatorChecked: true,
                        curatorCheckedAt: new Date().toISOString(),
                        curatorNotes: notes,
                        requiresRevision: true,
                      });
                    }
                  }}
                  curatorName="Куратор"
                />
              </div>
            </div>
          )}

          {/* Chat Sidebar */}
          {showChat && (
            <div className="md:w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-shrink-0 h-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare size={18} /> Чат с куратором
              </h3>
              <button
                onClick={onToggleChat}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-12">
                  <MessageSquare className="mx-auto mb-3 text-slate-300" size={40} />
                  <p>Начните общение с куратором</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-xl ${
                        msg.sender === 'student'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      {/* Отображение вложений */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.attachments.map((attachment) => (
                            <div key={attachment.id} className={`flex items-center gap-2 rounded-lg p-2 ${msg.sender === 'student' ? 'bg-white/20' : 'bg-slate-200'}`}>
                              {attachment.type.startsWith('image/') ? (
                                <ImageIcon size={16} className={msg.sender === 'student' ? 'text-white' : 'text-blue-600'} />
                              ) : attachment.type === 'application/pdf' ? (
                                <FileText size={16} className={msg.sender === 'student' ? 'text-white' : 'text-red-600'} />
                              ) : (
                                <File size={16} className={msg.sender === 'student' ? 'text-white' : 'text-slate-600'} />
                              )}
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs underline hover:no-underline truncate flex-1 ${msg.sender === 'student' ? 'text-white' : 'text-slate-700'}`}
                              >
                                {attachment.name}
                              </a>
                              <span className={`text-xs ${msg.sender === 'student' ? 'text-white/70' : 'text-slate-500'}`}>
                                {(attachment.size / 1024).toFixed(1)} KB
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className={`text-xs mt-1.5 ${msg.sender === 'student' ? 'text-blue-100' : 'text-slate-500'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              {/* Отображение прикрепленных файлов перед отправкой */}
              {chatAttachments.length > 0 && (
                <div className="mb-3 space-y-2 p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Прикрепленные файлы:</p>
                  {chatAttachments.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon size={16} className="text-blue-600" />
                      ) : file.type === 'application/pdf' ? (
                        <FileText size={16} className="text-red-600" />
                      ) : (
                        <File size={16} className="text-slate-600" />
                      )}
                      <span className="text-xs text-slate-700 flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                      <button
                        onClick={() => setChatAttachments(chatAttachments.filter(f => f.id !== file.id))}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <label
                  htmlFor="chat-file-upload"
                  className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg cursor-pointer transition-colors flex items-center justify-center border-2 border-slate-300"
                  title="Прикрепить файл (фото, PDF, DOCX)"
                >
                  <Paperclip size={18} />
                </label>
                <input
                  type="file"
                  id="chat-file-upload"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const url = event.target?.result as string;
                        const newAttachment = {
                          id: Date.now().toString() + Math.random(),
                          name: file.name,
                          url: url,
                          type: file.type,
                          size: file.size
                        };
                        setChatAttachments([...chatAttachments, newAttachment]);
                      };
                      reader.readAsDataURL(file);
                    });
                    e.target.value = '';
                  }}
                  className="hidden"
                  multiple
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => onMessageChange(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSendMessage(chatAttachments.length > 0 ? chatAttachments : undefined);
                      setChatAttachments([]);
                    }
                  }}
                  placeholder="Введите сообщение..."
                  className="flex-1 px-4 py-2.5 border-2 border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                  onClick={() => {
                    onSendMessage(chatAttachments.length > 0 ? chatAttachments : undefined);
                    setChatAttachments([]);
                  }}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Отправить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Sidebar */}
        {showVideo && (
          <div className="md:w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-shrink-0 h-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Video size={18} /> Видеосвязь
              </h3>
              <button
                onClick={onToggleVideo}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="text-green-600" size={40} />
                </div>
                <p className="text-slate-700 font-semibold mb-2">Видеосвязь с куратором</p>
                <p className="text-xs text-slate-500 mb-6">
                  Функция видеосвязи будет реализована в дальнейшем
                </p>
                <button className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto">
                  <Play size={18} /> Начать видеозвонок
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

