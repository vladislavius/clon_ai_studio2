import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseCourseMaterials, ParsedMaterial } from '../utils/courseMaterialParser';

interface CourseMaterialUploaderProps {
  onMaterialsParsed: (materials: ParsedMaterial[]) => void;
  isAdmin?: boolean;
}

export const CourseMaterialUploader: React.FC<CourseMaterialUploaderProps> = ({
  onMaterialsParsed,
  isAdmin,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedMaterials, setProcessedMaterials] = useState<ParsedMaterial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const pdfAndPptxFiles = selectedFiles.filter(
      file => file.name.endsWith('.pdf') || file.name.endsWith('.pptx')
    );

    if (pdfAndPptxFiles.length !== selectedFiles.length) {
      setError('Поддерживаются только файлы PDF и PPTX');
    } else {
      setError(null);
      setFiles(prev => [...prev, ...pdfAndPptxFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessFiles = async () => {
    if (files.length === 0) {
      setError('Выберите файлы для обработки');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const materials = await parseCourseMaterials(files);
      setProcessedMaterials(materials);
      onMaterialsParsed(materials);
    } catch (err) {
      setError(`Ошибка при обработке файлов: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Загрузка материалов курса</h3>

      <div className="space-y-4">
        {/* Загрузка файлов */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Выберите PDF и PPTX файлы
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Upload className="mx-auto mb-2 text-slate-400" size={32} />
            <p className="text-sm text-slate-600 mb-1">
              Нажмите для выбора файлов или перетащите их сюда
            </p>
            <p className="text-xs text-slate-400">
              Поддерживаются форматы: PDF, PPTX
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.pptx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Список выбранных файлов */}
        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              Выбрано файлов: {files.length}
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="text-blue-500 flex-shrink-0" size={20} />
                    <span className="text-sm text-slate-700 truncate">{file.name}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Кнопка обработки */}
        {files.length > 0 && (
          <button
            onClick={handleProcessFiles}
            disabled={isProcessing}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Обработка файлов...
              </>
            ) : (
              <>
                <Upload size={18} />
                Обработать и интегрировать материалы
              </>
            )}
          </button>
        )}

        {/* Результаты обработки */}
        {processedMaterials.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="text-green-600" size={20} />
              <span className="text-sm font-semibold text-green-700">
                Обработано материалов: {processedMaterials.length}
              </span>
            </div>
            <p className="text-xs text-green-600">
              Материалы успешно интегрированы в курс
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

