
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Extending React.Component with explicit props and state interfaces ensures the compiler recognizes inherited properties.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly defining the state property as a class field ensures TypeScript identifies it correctly on the class instance,
  // fixing errors where 'state' was reported as missing on the type 'ErrorBoundary'.
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  private errorHandler?: (event: ErrorEvent) => void;
  private rejectionHandler?: (event: PromiseRejectionEvent) => void;

  // static method used by React to update state after an error is thrown in a child component.
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // Lifecycle method called after an error is thrown to log error information.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Игнорируем ошибки от расширений браузера
    if (error.message?.includes('message port') || 
        error.message?.includes('content.js') ||
        error.stack?.includes('content.js')) {
      return;
    }
    console.error('Uncaught error:', error, errorInfo);
  }

  public componentDidMount() {
    // Обработка ошибок от расширений браузера
    this.errorHandler = (event: ErrorEvent) => {
      if (event.filename?.includes('content.js') || 
          event.message?.includes('message port')) {
        event.preventDefault();
        return false;
      }
    };

    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('message port') ||
          event.reason?.message?.includes('content.js') ||
          event.reason?.stack?.includes('content.js')) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', this.errorHandler, true);
    window.addEventListener('unhandledrejection', this.rejectionHandler);
  }

  public componentWillUnmount() {
    // Cleanup
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler, true);
    }
    if (this.rejectionHandler) {
      window.removeEventListener('unhandledrejection', this.rejectionHandler);
    }
  }

  public render(): ReactNode {
    // Accessing 'hasError' from the state property inherited and defined on the class.
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle size={32} />
              </div>
            </div>
            <h1 className="text-xl font-bold text-center text-slate-800 mb-2">Произошла ошибка</h1>
            <p className="text-sm text-slate-500 text-center mb-6">
              Система столкнулась с неожиданной ошибкой.
            </p>
            <div className="bg-slate-100 p-3 rounded-lg text-xs font-mono text-slate-600 mb-6 overflow-auto max-h-32 border border-slate-200">
                {/* Accessing error details from state for display in the UI */}
                {this.state.error?.message || 'Неизвестная ошибка'}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <RefreshCcw size={18} />
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    // Accessing children from props, which is available on this through inheritance from React.Component.
    return this.props.children || null;
  }
}

export default ErrorBoundary;
