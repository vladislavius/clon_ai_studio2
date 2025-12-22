import React, { useState, useEffect } from 'react';
import { DocumentTemplate, DocumentTemplateVariable, DocumentType } from '../types';
import { X, Plus, Trash2, Save, Code, FileText } from 'lucide-react';

interface DocumentTemplatesEditorProps {
  template: Partial<DocumentTemplate> | null;
  onSave: (template: Partial<DocumentTemplate>) => void;
  onClose: () => void;
}

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'contract', label: 'Трудовой договор' },
  { value: 'order', label: 'Приказ' },
  { value: 'certificate', label: 'Справка' },
  { value: 'other', label: 'Другое' },
];

const variableTypes: { value: DocumentTemplateVariable['type']; label: string }[] = [
  { value: 'text', label: 'Текст' },
  { value: 'date', label: 'Дата' },
  { value: 'number', label: 'Число' },
  { value: 'select', label: 'Выбор' },
];

export const DocumentTemplatesEditor: React.FC<DocumentTemplatesEditorProps> = ({
  template,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentType>('contract');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [variables, setVariables] = useState<DocumentTemplateVariable[]>([]);

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setType(template.type || 'contract');
      setContent(template.content || '');
      setDescription(template.description || '');
      setVariables(template.variables || []);
    }
  }, [template]);

  const addVariable = () => {
    setVariables([
      ...variables,
      {
        name: '',
        label: '',
        type: 'text' as const,
        required: false,
      },
    ]);
  };

  const updateVariable = (index: number, updates: Partial<DocumentTemplateVariable>) => {
    const newVariables = [...variables];
    newVariables[index] = { ...newVariables[index], ...updates };
    setVariables(newVariables);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Введите название шаблона');
      return;
    }

    if (!content.trim()) {
      alert('Введите содержимое шаблона');
      return;
    }

    const validVariables = variables.filter(v => v.name.trim() && v.label.trim());
    
    onSave({
      id: template?.id,
      name: name.trim(),
      type,
      content: content.trim(),
      description: description.trim() || undefined,
      variables: validVariables,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200/50 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <FileText className="text-white" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">
                {template?.id ? 'Редактировать шаблон' : 'Новый шаблон документа'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {template?.id ? 'Измените параметры шаблона' : 'Создайте новый шаблон для документов'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white to-slate-50/30">
          {/* Основная информация */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Название шаблона *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Например: Трудовой договор"
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium transition-all bg-white hover:border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Тип документа *
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as DocumentType)}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white hover:border-slate-300"
              >
                {documentTypes.map(dt => (
                  <option key={dt.value} value={dt.value}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
              Описание (опционально)
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Краткое описание шаблона"
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white hover:border-slate-300"
            />
          </div>

          {/* Переменные */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800">Переменные шаблона</h3>
              <button
                onClick={addVariable}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 text-sm transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus size={18} />
                Добавить переменную
              </button>
            </div>

            <div className="space-y-3">
              {variables.map((variable, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-2xl border-2 border-slate-200 p-5 space-y-3 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Имя переменной ({'{{'}name{'}}'})
                      </label>
                      <input
                        type="text"
                        value={variable.name || ''}
                        onChange={e => updateVariable(index, { name: e.target.value })}
                        placeholder="employee_name"
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm transition-all bg-white hover:border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                        Метка
                      </label>
                      <input
                        type="text"
                        value={variable.label || ''}
                        onChange={e => updateVariable(index, { label: e.target.value })}
                        placeholder="Имя сотрудника"
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all bg-white hover:border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Тип
                      </label>
                      <select
                        value={variable.type}
                        onChange={e => updateVariable(index, { type: e.target.value as DocumentTemplateVariable['type'] })}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all bg-white hover:border-slate-300"
                      >
                        {variableTypes.map(vt => (
                          <option key={vt.value} value={vt.value}>
                            {vt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={variable.required || false}
                          onChange={e => updateVariable(index, { required: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs font-bold text-slate-600">Обязательное</span>
                      </label>
                    </div>
                  </div>

                  {variable.type === 'select' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Варианты (через запятую)
                      </label>
                      <input
                        type="text"
                        value={variable.options?.join(', ') || ''}
                        onChange={e => updateVariable(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="Вариант 1, Вариант 2, Вариант 3"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => removeVariable(index)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Содержимое шаблона */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-600 uppercase">
                Содержимое шаблона * (используйте {'{{variable_name}}'} для переменных)
              </label>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Code size={14} />
                HTML/Markdown
              </div>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="<h1>Трудовой договор</h1><p>Сотрудник: {{employee_name}}</p>..."
              rows={15}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Используйте переменные в формате {'{{variable_name}}'} для подстановки значений
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
          >
            <Save size={16} />
            Сохранить шаблон
          </button>
        </div>
      </div>
    </div>
  );
};

