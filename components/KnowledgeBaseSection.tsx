import React, { useState } from 'react';
import { FileText, FileCheck, Search, Plus, Edit2, Trash2, X, Download, Eye } from 'lucide-react';

interface KnowledgeBaseSectionProps {
  isAdmin?: boolean;
}

type KnowledgeBaseSubView = 'regulations' | 'orders';

interface Document {
  id: string;
  title: string;
  type: 'regulation' | 'order';
  description?: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
  updated_at: string;
}

export const KnowledgeBaseSection: React.FC<KnowledgeBaseSectionProps> = ({ isAdmin }) => {
  const [currentSubView, setCurrentSubView] = useState<KnowledgeBaseSubView>('regulations');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocuments = documents.filter(doc => {
    if (currentSubView === 'regulations' && doc.type !== 'regulation') return false;
    if (currentSubView === 'orders' && doc.type !== 'order') return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        doc.title.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in space-y-4">
      {/* Sub-navigation */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1.5 rounded-lg gap-1.5">
          <button
            onClick={() => setCurrentSubView('regulations')}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              currentSubView === 'regulations'
                ? 'bg-white shadow text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={18} /> РЕГЛАМЕНТЫ
          </button>
          <button
            onClick={() => setCurrentSubView('orders')}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              currentSubView === 'orders'
                ? 'bg-white shadow text-green-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCheck size={18} /> ПРИКАЗЫ
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Поиск документов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          />
        </div>

        {isAdmin && (
          <button className="mt-4 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            <Plus size={18} /> Добавить документ
          </button>
        )}
      </div>

      {/* Documents list */}
      <div className="flex-1 overflow-y-auto">
        {filteredDocuments.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
            <FileText className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">
              {currentSubView === 'regulations' ? 'Регламенты не найдены' : 'Приказы не найдены'}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {isAdmin ? 'Добавьте первый документ' : 'Документы появятся здесь'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {doc.type === 'regulation' ? (
                        <FileText className="text-blue-500" size={20} />
                      ) : (
                        <FileCheck className="text-green-500" size={20} />
                      )}
                      <h3 className="font-semibold text-slate-800">{doc.title}</h3>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-slate-600 mb-3">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Обновлено: {new Date(doc.updated_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.file_url && (
                      <>
                        <button
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Просмотр"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Скачать"
                        >
                          <Download size={18} />
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Редактировать"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

