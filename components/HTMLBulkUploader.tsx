import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { useToast } from './Toast';

interface HTMLBulkUploaderProps {
  onFilesProcessed: (htmlSections: Array<{ content: string; htmlContent: string; order: number; fileName: string }>) => void;
  onClose: () => void;
}

export const HTMLBulkUploader: React.FC<HTMLBulkUploaderProps> = ({ onFilesProcessed, onClose }) => {
  const toast = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<Array<{ name: string; status: 'pending' | 'processing' | 'success' | 'error'; error?: string }>>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files).filter(file => 
        file.name.endsWith('.html') || file.name.endsWith('.htm')
      );
      setSelectedFiles(files);
      setProcessedFiles(files.map(f => ({ name: f.name, status: 'pending' as const })));
    }
  };

  const extractOrderFromFileName = (fileName: string): number => {
    // Пытаемся извлечь число из начала имени файла (например: "01_page.html" -> 1, "001_intro.html" -> 1)
    const match = fileName.match(/^(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    // Если числа нет, используем порядок по алфавиту
    return 0;
  };

  const processFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Пожалуйста, выберите HTML файлы для загрузки.');
      return;
    }

    setIsProcessing(true);
    const results: Array<{ content: string; htmlContent: string; order: number; fileName: string }> = [];
    const errors: string[] = [];

    // Сортируем файлы по имени (для правильного порядка)
    const sortedFiles = [...selectedFiles].sort((a, b) => {
      const orderA = extractOrderFromFileName(a.name);
      const orderB = extractOrderFromFileName(b.name);
      if (orderA !== 0 || orderB !== 0) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i];
      
      // Обновляем статус
      setProcessedFiles(prev => 
        prev.map(p => p.name === file.name ? { ...p, status: 'processing' } : p)
      );

      try {
        const text = await file.text();
        const order = extractOrderFromFileName(file.name) || (i + 1);
        
        // Извлекаем title или используем имя файла как заголовок
        const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : file.name.replace(/\.(html|htm)$/i, '');
        
        results.push({
          content: title.substring(0, 100), // Краткое описание
          htmlContent: text, // Полный HTML
          order: order,
          fileName: file.name,
        });

        setProcessedFiles(prev => 
          prev.map(p => p.name === file.name ? { ...p, status: 'success' } : p)
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
        errors.push(`${file.name}: ${errorMsg}`);
        setProcessedFiles(prev => 
          prev.map(p => p.name === file.name ? { ...p, status: 'error', error: errorMsg } : p)
        );
      }
    }

    setIsProcessing(false);

    if (results.length > 0) {
      onFilesProcessed(results);
      toast.success(`Успешно обработано ${results.length} из ${selectedFiles.length} файлов!`);
      if (errors.length > 0) {
        toast.error(`Ошибки при обработке ${errors.length} файлов.`);
      }
      onClose();
    } else {
      toast.error('Не удалось обработать ни одного файла.');
    }
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    setProcessedFiles(prev => prev.filter(p => p.name !== fileName));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Upload size={28} className="text-blue-600" />
              Массовая загрузка HTML-страниц
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Загрузите все HTML-файлы курса одновременно. Они будут автоматически отсортированы и добавлены как секции.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Загрузка файлов */}
          <div className="mb-6">
            <label
              htmlFor="html-bulk-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Upload size={48} className="text-blue-500 mb-3" />
              <p className="mb-2 text-lg text-blue-700 font-semibold">Нажмите или перетащите HTML файлы сюда</p>
              <p className="text-sm text-blue-500">Можно выбрать несколько файлов (Ctrl/Cmd + Click)</p>
              <input
                id="html-bulk-upload"
                type="file"
                multiple
                accept=".html,.htm"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Список выбранных файлов */}
          {selectedFiles.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800">
                  Выбрано файлов: {selectedFiles.length}
                </h4>
                <button
                  onClick={() => {
                    setSelectedFiles([]);
                    setProcessedFiles([]);
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Очистить все
                </button>
              </div>
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 max-h-64 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => {
                    const processed = processedFiles.find(p => p.name === file.name);
                    const order = extractOrderFromFileName(file.name) || (index + 1);
                    
                    return (
                      <div
                        key={file.name}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          processed?.status === 'success'
                            ? 'bg-green-50 border-green-200'
                            : processed?.status === 'error'
                            ? 'bg-red-50 border-red-200'
                            : processed?.status === 'processing'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText size={20} className="text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              Порядок: {order} • Размер: {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {processed?.status === 'processing' && (
                            <Loader2 size={18} className="animate-spin text-blue-600" />
                          )}
                          {processed?.status === 'success' && (
                            <CheckCircle2 size={18} className="text-green-600" />
                          )}
                          {processed?.status === 'error' && (
                            <AlertCircle size={18} className="text-red-600" title={processed.error} />
                          )}
                          <button
                            onClick={() => removeFile(file.name)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Информация */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <AlertCircle size={18} />
              Как это работает:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Выберите все HTML-файлы вашего курса (можно выбрать несколько через Ctrl/Cmd)</li>
              <li>Файлы будут автоматически отсортированы по номеру в начале имени (01, 02, 03...)</li>
              <li>Каждый файл станет отдельной секцией типа "HTML"</li>
              <li>После обработки вы сможете добавить контрольный лист заданий</li>
            </ul>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            disabled={isProcessing}
          >
            Отмена
          </button>
          <button
            onClick={processFiles}
            disabled={isProcessing || selectedFiles.length === 0}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              isProcessing || selectedFiles.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Обработка {processedFiles.filter(p => p.status === 'processing' || p.status === 'success').length} из {selectedFiles.length}...
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                Обработать и добавить {selectedFiles.length} {selectedFiles.length === 1 ? 'файл' : 'файлов'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

