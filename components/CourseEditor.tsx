import React, { useState } from 'react';
import { Plus, Trash2, Save, Eye, Upload, Image as ImageIcon, FileText, Video, X, ChevronUp, ChevronDown, ChevronRight, Type, Heading1, Heading2, Heading3, Code, FolderOpen, CheckCircle2 } from 'lucide-react';
import { useToast } from './Toast';
import { TextFormattingToolbar } from './TextFormattingToolbar';
import { HTMLBulkUploader } from './HTMLBulkUploader';

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

interface Course {
  id: string;
  title: string;
  description: string;
  sections: CourseSection[];
  tasks: CourseTask[];
  coverImage?: string; // URL обложки курса
}

interface CourseTask {
  id: string;
  sequenceNumber: number;
  text: string;
  type: 'reading' | 'practical' | 'theoretical' | 'essay' | 'training' | 'other';
  description?: string;
  gradingCriteria?: {
    minWords?: number;
    keywords?: string[];
    requiredElements?: string[];
  };
}

interface CourseEditorProps {
  course?: Course | null;
  onSave: (course: Course) => void;
  onCancel: () => void;
  isAdmin?: boolean;
}

export const CourseEditor: React.FC<CourseEditorProps> = ({ course, onSave, onCancel, isAdmin }) => {
  const toast = useToast();
  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [coverImage, setCoverImage] = useState(course?.coverImage || '');
  const [sections, setSections] = useState<CourseSection[]>(course?.sections || []);
  const [tasks, setTasks] = useState<CourseTask[]>(course?.tasks || []);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showBulkUploader, setShowBulkUploader] = useState(false);
  const [imageInsertPosition, setImageInsertPosition] = useState<{ sectionId: string; position: number } | null>(null);

  const addSection = (type: CourseSection['type']) => {
    const newSection: CourseSection = {
      id: Date.now().toString(),
      type,
      content: '',
      order: sections.length,
      listItems: type === 'list' ? [''] : undefined,
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (id: string, updates: Partial<CourseSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
  };

  const handleBulkHTMLUpload = (htmlSections: Array<{ content: string; htmlContent: string; order: number; fileName: string }>) => {
    const newSections: CourseSection[] = htmlSections.map((item, index) => ({
      id: `html-${Date.now()}-${index}`,
      type: 'html' as const,
      content: item.content,
      htmlContent: item.htmlContent,
      order: item.order,
      textAlign: 'left',
      textColor: '#1e293b',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
    }));

    // Объединяем с существующими секциями и пересортировываем
    const allSections = [...sections, ...newSections].sort((a, b) => a.order - b.order);
    
    // Обновляем порядок для всех секций
    const reorderedSections = allSections.map((section, index) => ({
      ...section,
      order: index,
    }));

    setSections(reorderedSections);
    toast.success(`Добавлено ${newSections.length} HTML-секций!`);
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    newSections.forEach((s, i) => { s.order = i; });
    setSections(newSections);
  };

  const handleImageUpload = (sectionId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      updateSection(sectionId, { imageUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleCoverImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setCoverImage(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleInlineImageUpload = (sectionId: string, file: File, position: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const section = sections.find(s => s.id === sectionId);
      if (section) {
        const inlineImages = section.inlineImages || [];
        const newImage = {
          id: Date.now().toString(),
          url: imageUrl,
          position: position,
          caption: ''
        };
        const updatedImages = [...inlineImages, newImage].sort((a, b) => a.position - b.position);
        updateSection(sectionId, { inlineImages: updatedImages });
        setImageInsertPosition(null);
        toast.success('Изображение добавлено в текст');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteInlineImage = (sectionId: string, imageId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section && section.inlineImages) {
      const updatedImages = section.inlineImages.filter(img => img.id !== imageId);
      updateSection(sectionId, { inlineImages: updatedImages });
      toast.success('Изображение удалено');
    }
  };

  const addTask = () => {
    const newTask: CourseTask = {
      id: Date.now().toString(),
      sequenceNumber: tasks.length + 1,
      text: '',
      type: 'reading',
      description: '',
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (id: string, updates: Partial<CourseTask>) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const updateTaskCriteria = (id: string, criteria: CourseTask['gradingCriteria']) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, gradingCriteria: criteria } : t));
  };

  const deleteTask = (id: string) => {
    const filtered = tasks.filter(t => t.id !== id);
    filtered.forEach((t, i) => { t.sequenceNumber = i + 1; });
    setTasks(filtered);
  };

  const moveTask = (id: string, direction: 'up' | 'down') => {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tasks.length) return;
    
    const newTasks = [...tasks];
    [newTasks[index], newTasks[newIndex]] = [newTasks[newIndex], newTasks[index]];
    
    // Обновляем sequenceNumber
    newTasks.forEach((t, i) => { t.sequenceNumber = i + 1; });
    setTasks(newTasks);
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Введите название курса');
      return;
    }

    const courseData: Course = {
      id: course?.id || Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      coverImage: coverImage || undefined,
      sections: sections.filter(s => s.content.trim() || s.imageUrl),
      tasks: tasks.filter(t => t.text.trim()),
    };

    onSave(courseData);
    toast.success('Курс сохранен');
  };

  return (
    <>
      {showBulkUploader && (
        <HTMLBulkUploader
          onFilesProcessed={handleBulkHTMLUpload}
          onClose={() => setShowBulkUploader(false)}
        />
      )}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-5xl mx-auto pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel();
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl border-2 border-blue-500"
              title="Вернуться к списку курсов"
            >
              <ChevronRight className="rotate-180" size={20} /> Назад к курсам
            </button>
            <h2 className="text-2xl font-bold text-slate-800">
              {course ? 'Редактирование курса' : 'Создание нового курса'}
            </h2>
          </div>
        <button
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Основная информация */}
      <div className="space-y-4 mb-6">
        {/* Обложка курса */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Обложка курса
          </label>
          {coverImage ? (
            <div className="relative">
              <img src={coverImage} alt="Cover" className="w-full h-48 object-cover rounded-lg border border-slate-300" />
              <button
                onClick={() => setCoverImage('')}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-8 cursor-pointer hover:border-blue-400 transition-colors bg-slate-50">
              <Upload size={32} className="text-slate-400 mb-2" />
              <span className="text-sm text-slate-600 font-medium">Загрузить обложку курса</span>
              <span className="text-xs text-slate-400 mt-1">Рекомендуемый размер: 1200x600px</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverImageUpload(file);
                }}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Название курса *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Курс по состояниям"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Описание курса
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Краткое описание курса..."
            rows={3}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
        </div>
      </div>

      {/* Секции курса */}
      <div className="mb-6">
        {/* Заголовок секции */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-800 mb-1">Содержание курса</h3>
          <p className="text-sm text-slate-500">Добавьте секции для создания структуры курса</p>
        </div>

        {/* Панель инструментов */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 shadow-sm p-4 mb-6">
          {/* Основные инструменты */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-slate-300"></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Основные инструменты</span>
              <div className="h-px flex-1 bg-slate-300"></div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setShowBulkUploader(true)}
                className="group px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-2 border border-emerald-400/30"
                title="Загрузить множество HTML-файлов сразу"
              >
                <FolderOpen size={16} className="group-hover:rotate-12 transition-transform" /> 
                <span>Массовая загрузка HTML</span>
              </button>
            </div>
          </div>

          {/* Заголовки */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-slate-300"></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Заголовки</span>
              <div className="h-px flex-1 bg-slate-300"></div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => addSection('h1')}
                className="group px-3.5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-1.5 border border-blue-400/30"
                title="Заголовок первого уровня"
              >
                <Heading1 size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>H1</span>
              </button>
              <button
                onClick={() => addSection('h2')}
                className="group px-3.5 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-1.5 border border-purple-400/30"
                title="Заголовок второго уровня"
              >
                <Heading2 size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>H2</span>
              </button>
              <button
                onClick={() => addSection('h3')}
                className="group px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-1.5 border border-indigo-400/30"
                title="Заголовок третьего уровня"
              >
                <Heading3 size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>H3</span>
              </button>
              <button
                onClick={() => addSection('heading')}
                className="group px-3.5 py-2 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg text-sm font-semibold hover:from-slate-600 hover:to-slate-700 transition-all shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-1.5 border border-slate-400/30"
                title="Обычный заголовок"
              >
                <Type size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>Заголовок</span>
              </button>
            </div>
          </div>

          {/* Контент */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-slate-300"></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Контент</span>
              <div className="h-px flex-1 bg-slate-300"></div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => addSection('text')}
                className="group px-3.5 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-1.5 border border-green-400/30"
                title="Текстовый блок"
              >
                <FileText size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>Текст</span>
              </button>
              <button
                onClick={() => addSection('image')}
                className="group px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg text-sm font-semibold hover:from-pink-600 hover:to-pink-700 transition-all shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-1.5 border border-pink-400/30"
                title="Изображение"
              >
                <ImageIcon size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>Изображение</span>
              </button>
              <button
                onClick={() => addSection('list')}
                className="group px-3.5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-1.5 border border-orange-400/30"
                title="Список"
              >
                <Plus size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>Список</span>
              </button>
              <button
                onClick={() => addSection('quote')}
                className="group px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg text-sm font-semibold hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-1.5 border border-cyan-400/30"
                title="Цитата"
              >
                <FileText size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>Цитата</span>
              </button>
              <button
                onClick={() => addSection('html')}
                className="group px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-sm font-semibold hover:from-amber-600 hover:to-amber-700 transition-all shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-1.5 border border-amber-400/30"
                title="HTML контент"
              >
                <Code size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>HTML</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((section, index) => (
            <div key={section.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <select
                    value={section.type}
                    onChange={(e) => {
                      const newType = e.target.value as CourseSection['type'];
                      // При смене типа сохраняем контент, но сбрасываем специфичные поля
                      const updates: Partial<CourseSection> = { type: newType };
                      if (newType === 'list' && !section.listItems) {
                        updates.listItems = [''];
                      }
                      if (newType !== 'list') {
                        updates.listItems = undefined;
                      }
                      if (newType !== 'image') {
                        updates.imageUrl = undefined;
                      }
                      if (newType !== 'html') {
                        updates.htmlContent = undefined;
                      }
                      updateSection(section.id, updates);
                    }}
                    className="text-xs font-semibold text-slate-700 border border-slate-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="text">Текст</option>
                    <option value="heading">Заголовок</option>
                    <option value="h1">H1</option>
                    <option value="h2">H2</option>
                    <option value="h3">H3</option>
                    <option value="image">Изображение</option>
                    <option value="list">Список</option>
                    <option value="quote">Цитата</option>
                    <option value="html">HTML контент</option>
                  </select>
                  <span className="text-xs text-slate-400">#{index + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveSection(section.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => moveSection(section.id, 'down')}
                    disabled={index === sections.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {(section.type === 'h1' || section.type === 'h2' || section.type === 'h3' || section.type === 'heading') && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={section.content}
                    onChange={(e) => updateSection(section.id, { content: e.target.value })}
                    placeholder="Введите заголовок..."
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      section.type === 'h1' ? 'text-3xl font-bold' :
                      section.type === 'h2' ? 'text-2xl font-bold' :
                      section.type === 'h3' ? 'text-xl font-bold' :
                      'text-lg font-bold'
                    }`}
                    style={{
                      color: section.textColor || '#1e293b',
                      textAlign: section.textAlign || 'left',
                      fontWeight: section.fontWeight || 'bold',
                      fontStyle: section.fontStyle || 'normal',
                      textDecoration: section.textDecoration || 'none',
                    }}
                  />
                  <TextFormattingToolbar
                    textAlign={section.textAlign || 'left'}
                    textColor={section.textColor || '#1e293b'}
                    fontWeight={section.fontWeight || 'bold'}
                    fontStyle={section.fontStyle || 'normal'}
                    textDecoration={section.textDecoration || 'none'}
                    onTextAlignChange={(align) => updateSection(section.id, { textAlign: align })}
                    onTextColorChange={(color) => updateSection(section.id, { textColor: color })}
                    onFontWeightChange={(weight) => updateSection(section.id, { fontWeight: weight })}
                    onFontStyleChange={(style) => updateSection(section.id, { fontStyle: style })}
                    onTextDecorationChange={(decoration) => updateSection(section.id, { textDecoration: decoration })}
                  />
                </div>
              )}

              {section.type === 'text' && (
                <div className="space-y-3">
                  <TextFormattingToolbar
                    textAlign={section.textAlign || 'left'}
                    textColor={section.textColor || '#1e293b'}
                    fontWeight={section.fontWeight || 'normal'}
                    fontStyle={section.fontStyle || 'normal'}
                    textDecoration={section.textDecoration || 'none'}
                    onTextAlignChange={(align) => updateSection(section.id, { textAlign: align })}
                    onTextColorChange={(color) => updateSection(section.id, { textColor: color })}
                    onFontWeightChange={(weight) => updateSection(section.id, { fontWeight: weight })}
                    onFontStyleChange={(style) => updateSection(section.id, { fontStyle: style })}
                    onTextDecorationChange={(decoration) => updateSection(section.id, { textDecoration: decoration })}
                  />
                  <div className="space-y-3">
                    <textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      onSelect={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        setImageInsertPosition({ sectionId: section.id, position: target.selectionStart });
                      }}
                      placeholder="Введите текст... Выберите место курсором и нажмите 'Вставить изображение' для добавления картинки в текст"
                      rows={6}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                      style={{
                        color: section.textColor || '#1e293b',
                        textAlign: section.textAlign || 'left',
                        fontWeight: section.fontWeight || 'normal',
                        fontStyle: section.fontStyle || 'normal',
                        textDecoration: section.textDecoration || 'none',
                      }}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <label
                        htmlFor={`inline-image-${section.id}`}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
                      >
                        <ImageIcon size={16} /> Вставить изображение в текст
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const position = imageInsertPosition?.sectionId === section.id 
                              ? imageInsertPosition.position 
                              : section.content.length;
                            handleInlineImageUpload(section.id, file, position);
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                        id={`inline-image-${section.id}`}
                      />
                      {imageInsertPosition?.sectionId === section.id && (
                        <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={14} /> Позиция выбрана (символ {imageInsertPosition.position})
                        </span>
                      )}
                    </div>
                    {/* Отображение встроенных изображений */}
                    {section.inlineImages && section.inlineImages.length > 0 && (
                      <div className="space-y-3 mt-4 pt-4 border-t-2 border-slate-300 bg-slate-50 rounded-lg p-4">
                        <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <ImageIcon size={16} /> Изображения в тексте ({section.inlineImages.length})
                        </p>
                        {section.inlineImages.map((img) => (
                          <div key={img.id} className="relative border-2 border-slate-300 rounded-lg p-4 bg-white">
                            <div className="flex items-start gap-4">
                              <img src={img.url} alt="Inline" className="w-40 h-40 object-cover rounded-lg border border-slate-200 shadow-sm" />
                              <div className="flex-1 space-y-2">
                                <p className="text-xs text-slate-500 font-semibold">
                                  Позиция в тексте: символ {img.position}
                                </p>
                                <input
                                  type="text"
                                  value={img.caption || ''}
                                  onChange={(e) => {
                                    const updatedImages = section.inlineImages?.map(i =>
                                      i.id === img.id ? { ...i, caption: e.target.value } : i
                                    );
                                    updateSection(section.id, { inlineImages: updatedImages });
                                  }}
                                  placeholder="Подпись к изображению (необязательно)"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                              </div>
                              <button
                                onClick={() => handleDeleteInlineImage(section.id, img.id)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Удалить изображение"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {section.type === 'image' && (
                <div className="space-y-3">
                  {section.imageUrl ? (
                    <div className="relative">
                      <img src={section.imageUrl} alt="Uploaded" className="w-full rounded-lg border border-slate-300 max-h-96 object-contain" />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <label
                          htmlFor={`image-replace-${section.id}`}
                          className="p-1 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600"
                          title="Заменить изображение"
                        >
                          <Upload size={16} />
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(section.id, file);
                          }}
                          className="hidden"
                          id={`image-replace-${section.id}`}
                        />
                        <button
                          onClick={() => updateSection(section.id, { imageUrl: undefined })}
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                          title="Удалить изображение"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-blue-400 transition-colors">
                      <Upload size={24} className="text-slate-400 mb-2" />
                      <span className="text-sm text-slate-600">Нажмите для загрузки изображения</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(section.id, file);
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                  <input
                    type="text"
                    value={section.content}
                    onChange={(e) => updateSection(section.id, { content: e.target.value })}
                    placeholder="Подпись к изображению (необязательно)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              )}

              {section.type === 'list' && (
                <div className="space-y-2">
                  {(section.listItems || ['']).map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2">
                      <span className="text-slate-400">•</span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const newItems = [...(section.listItems || [])];
                          newItems[itemIndex] = e.target.value;
                          updateSection(section.id, { listItems: newItems });
                        }}
                        placeholder="Элемент списка"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <button
                        onClick={() => {
                          const newItems = (section.listItems || []).filter((_, i) => i !== itemIndex);
                          updateSection(section.id, { listItems: newItems.length > 0 ? newItems : [''] });
                        }}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      updateSection(section.id, { listItems: [...(section.listItems || []), ''] });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Добавить элемент
                  </button>
                </div>
              )}

              {section.type === 'html' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Code size={14} className="text-amber-800" />
                        <p className="text-xs text-amber-800 font-semibold">
                          HTML страница #{index + 1}
                        </p>
                        {sections.filter(s => s.type === 'html').length >= 200 && (
                          <span className="text-xs text-red-600 font-semibold">(Достигнут лимит: 200 страниц)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const htmlSections = sections.filter(s => s.type === 'html');
                            if (htmlSections.length < 200) {
                              const newSection: CourseSection = {
                                id: Date.now().toString(),
                                type: 'html',
                                content: '',
                                htmlContent: '',
                                order: sections.length,
                                textAlign: 'left',
                                textColor: '#1e293b',
                                fontWeight: 'normal',
                                fontStyle: 'normal',
                                textDecoration: 'none',
                              };
                              setSections([...sections, newSection]);
                              toast.success('Новая HTML-страница добавлена');
                            } else {
                              toast.error('Достигнут лимит в 200 HTML-страниц');
                            }
                          }}
                          disabled={sections.filter(s => s.type === 'html').length >= 200}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <Plus size={14} /> Добавить следующую страницу
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-amber-700">
                      Вставьте полный HTML-код страницы. Поддерживаются внешние стили (Tailwind, Google Fonts, Font Awesome и т.д.)
                    </p>
                  </div>
                  <textarea
                    value={section.htmlContent || section.content || ''}
                    onChange={(e) => updateSection(section.id, { htmlContent: e.target.value, content: e.target.value.substring(0, 100) })}
                    placeholder="Вставьте HTML-код..."
                    rows={15}
                    className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none font-mono text-xs"
                  />
                  <div className="w-full">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 w-full">
                      <p className="text-xs text-slate-600 mb-2 font-semibold">Предпросмотр:</p>
                      <div className="border border-slate-300 rounded bg-white p-4 max-h-96 w-full" style={{ position: 'relative', isolation: 'isolate', overflow: 'visible' }}>
                        {section.htmlContent || section.content ? (
                          <iframe
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
                                      overflow: auto !important; 
                                      position: relative !important;
                                    }
                                    html { 
                                      overflow: auto !important; 
                                      position: relative !important;
                                    }
                                    * { 
                                      max-width: 100% !important;
                                    }
                                  </style>
                                </head>
                                <body>
                                  ${section.htmlContent || section.content}
                                </body>
                              </html>
                            `}
                            className="w-full border-0"
                            style={{ 
                              minHeight: '400px',
                              maxHeight: '384px',
                              width: '100%',
                              display: 'block',
                              overflow: 'auto',
                              pointerEvents: 'auto'
                            }}
                            sandbox="allow-same-origin allow-scripts"
                            title="HTML Preview"
                          />
                        ) : (
                          <p className="text-xs text-slate-400 italic">Предпросмотр появится после ввода HTML-кода</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {(section.htmlContent || section.content) && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <div className="flex-1 text-xs text-green-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        HTML-код сохранен автоматически
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {sections.length === 0 && (
            <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-slate-300">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-md mb-4">
                <FileText size={40} className="text-slate-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-700 mb-2">Нет секций</h4>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Используйте панель инструментов выше для добавления секций курса
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Контрольный лист */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Контрольный лист заданий</h3>
          <button
            onClick={addTask}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Добавить задание
          </button>
        </div>

        <div className="space-y-3">
          {tasks.map((task, taskIndex) => (
            <div key={task.id} className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <span className="text-sm font-bold text-slate-400">#{task.sequenceNumber}</span>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveTask(task.id, 'up')}
                      disabled={taskIndex === 0}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      title="Переместить вверх"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveTask(task.id, 'down')}
                      disabled={taskIndex === tasks.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      title="Переместить вниз"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Текст задания *</label>
                    <input
                      type="text"
                      value={task.text}
                      onChange={(e) => updateTask(task.id, { text: e.target.value })}
                      placeholder="Например: Прочитайте раздел 1 и выполните упражнение"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Тип задания</label>
                      <select
                        value={task.type}
                        onChange={(e) => updateTask(task.id, { type: e.target.value as CourseTask['type'] })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      >
                        <option value="reading">Чтение</option>
                        <option value="practical">Практика</option>
                        <option value="theoretical">Теория</option>
                        <option value="essay">Эссе</option>
                        <option value="training">Тренировка</option>
                        <option value="other">Другое</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Описание (необязательно)</label>
                      <input
                        type="text"
                        value={task.description || ''}
                        onChange={(e) => updateTask(task.id, { description: e.target.value })}
                        placeholder="Дополнительные детали..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Критерии автоматической проверки */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-3"
                    >
                      {expandedTaskId === task.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      Критерии автоматической проверки (опционально)
                    </button>
                    
                    {expandedTaskId === task.id && (
                      <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Минимальное количество слов
                          </label>
                          <input
                            type="number"
                            value={task.gradingCriteria?.minWords || ''}
                            onChange={(e) => updateTaskCriteria(task.id, {
                              ...task.gradingCriteria,
                              minWords: e.target.value ? parseInt(e.target.value) : undefined,
                            })}
                            placeholder="Например: 100"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Ключевые слова (через запятую)
                          </label>
                          <input
                            type="text"
                            value={task.gradingCriteria?.keywords?.join(', ') || ''}
                            onChange={(e) => updateTaskCriteria(task.id, {
                              ...task.gradingCriteria,
                              keywords: e.target.value ? e.target.value.split(',').map(k => k.trim()).filter(k => k) : undefined,
                            })}
                            placeholder="Например: состояние, клиент, продукт"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Обязательные элементы (через запятую)
                          </label>
                          <input
                            type="text"
                            value={task.gradingCriteria?.requiredElements?.join(', ') || ''}
                            onChange={(e) => updateTaskCriteria(task.id, {
                              ...task.gradingCriteria,
                              requiredElements: e.target.value ? e.target.value.split(',').map(e => e.trim()).filter(e => e) : undefined,
                            })}
                            placeholder="Например: пример, вывод, практика"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-300">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-md mb-4">
                <FileText size={40} className="text-blue-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-700 mb-2">Нет заданий</h4>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                Создайте задания для проверки знаний студентов по материалам курса
              </p>
              <button
                onClick={addTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
              >
                <Plus size={16} /> Создать первое задание
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="sticky bottom-0 bg-white border-t-2 border-slate-200 shadow-lg -mx-6 -mb-6 px-6 py-4 mt-8">
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-all shadow-sm hover:shadow-md border border-slate-300"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-2 border border-blue-500/30"
          >
            <Save size={18} className="group-hover:scale-110 transition-transform" /> 
            <span>Сохранить курс</span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

