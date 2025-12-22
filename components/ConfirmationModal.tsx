import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, title, message, confirmLabel = 'Подтвердить', cancelLabel = 'Отмена', isDanger = false, onConfirm, onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-slate-200/50">
        <div className="p-6 bg-gradient-to-br from-white to-slate-50/50">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl flex-shrink-0 shadow-lg ${isDanger ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-600 border-2 border-red-200' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 border-2 border-blue-200'}`}>
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-slate-800 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{message}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-slate-50 to-white p-5 flex justify-end gap-3 border-t border-slate-200">
          <button 
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 ${
              isDanger 
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-200/50 hover:shadow-red-300/50' 
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-200/50 hover:shadow-blue-300/50'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
