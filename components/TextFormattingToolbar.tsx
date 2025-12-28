import React from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette } from 'lucide-react';

interface TextFormattingToolbarProps {
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textColor: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  onTextAlignChange: (align: 'left' | 'center' | 'right' | 'justify') => void;
  onTextColorChange: (color: string) => void;
  onFontWeightChange: (weight: 'normal' | 'bold') => void;
  onFontStyleChange: (style: 'normal' | 'italic') => void;
  onTextDecorationChange: (decoration: 'none' | 'underline') => void;
}

const textColors = [
  { name: 'Черный', value: '#1e293b' },
  { name: 'Серый', value: '#64748b' },
  { name: 'Синий', value: '#3b82f6' },
  { name: 'Зеленый', value: '#10b981' },
  { name: 'Красный', value: '#ef4444' },
  { name: 'Оранжевый', value: '#f59e0b' },
  { name: 'Фиолетовый', value: '#8b5cf6' },
  { name: 'Розовый', value: '#ec4899' },
];

export const TextFormattingToolbar: React.FC<TextFormattingToolbarProps> = ({
  textAlign,
  textColor,
  fontWeight,
  fontStyle,
  textDecoration,
  onTextAlignChange,
  onTextColorChange,
  onFontWeightChange,
  onFontStyleChange,
  onTextDecorationChange,
}) => {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 flex-wrap">
      {/* Форматирование текста */}
      <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
        <button
          onClick={() => onFontWeightChange(fontWeight === 'bold' ? 'normal' : 'bold')}
          className={`p-2 rounded-lg transition-colors ${
            fontWeight === 'bold'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
          title="Жирный"
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => onFontStyleChange(fontStyle === 'italic' ? 'normal' : 'italic')}
          className={`p-2 rounded-lg transition-colors ${
            fontStyle === 'italic'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
          title="Курсив"
        >
          <Italic size={18} />
        </button>
        <button
          onClick={() => onTextDecorationChange(textDecoration === 'underline' ? 'none' : 'underline')}
          className={`p-2 rounded-lg transition-colors ${
            textDecoration === 'underline'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
          title="Подчеркнутый"
        >
          <Underline size={18} />
        </button>
      </div>

      {/* Выравнивание */}
      <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
        <button
          onClick={() => onTextAlignChange('left')}
          className={`p-2 rounded-lg transition-colors ${
            textAlign === 'left'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
          title="По левому краю"
        >
          <AlignLeft size={18} />
        </button>
        <button
          onClick={() => onTextAlignChange('center')}
          className={`p-2 rounded-lg transition-colors ${
            textAlign === 'center'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
          title="По центру"
        >
          <AlignCenter size={18} />
        </button>
        <button
          onClick={() => onTextAlignChange('right')}
          className={`p-2 rounded-lg transition-colors ${
            textAlign === 'right'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
          title="По правому краю"
        >
          <AlignRight size={18} />
        </button>
        <button
          onClick={() => onTextAlignChange('justify')}
          className={`p-2 rounded-lg transition-colors ${
            textAlign === 'justify'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
          title="По ширине"
        >
          <AlignJustify size={18} />
        </button>
      </div>

      {/* Цвет текста */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
            showColorPicker
              ? 'bg-blue-100 text-blue-700'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
          title="Цвет текста"
        >
          <Palette size={18} />
          <div
            className="w-4 h-4 rounded border border-slate-300"
            style={{ backgroundColor: textColor }}
          />
        </button>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-slate-200 p-3 z-10 min-w-[200px]">
            <div className="grid grid-cols-4 gap-2">
              {textColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    onTextColorChange(color.value);
                    setShowColorPicker(false);
                  }}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    textColor === color.value
                      ? 'border-blue-500 scale-110'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200">
              <input
                type="color"
                value={textColor}
                onChange={(e) => onTextColorChange(e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

