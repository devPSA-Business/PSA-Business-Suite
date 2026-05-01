import React from 'react';
import { useToastStore } from '../store/toastStore';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:top-auto sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl shadow-stone-900/5 sm:shadow-2xl border animate-in slide-in-from-top-5 sm:slide-in-from-bottom-5 fade-in duration-300 w-full sm:min-w-[320px] sm:max-w-md ${
              isSuccess
                ? 'bg-green-50 border-green-200 text-green-800'
                : isError
                ? 'bg-red-50 border-red-200 text-red-800'
                : isWarning
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-stone-800 border-stone-700 text-white'
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />}
            {isError && <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />}
            {isWarning && <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />}
            {!isSuccess && !isError && !isWarning && <Info className="w-6 h-6 text-stone-300 shrink-0" />}
            
            <p className="text-sm font-bold flex-1">{toast.message}</p>
            
            <button
              onClick={() => removeToast(toast.id)}
              className={`p-1 rounded-xl transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 ${
                isSuccess
                  ? 'hover:bg-green-100/80 text-green-600'
                  : isError
                  ? 'hover:bg-red-100/80 text-red-600'
                  : isWarning
                  ? 'hover:bg-amber-100/80 text-amber-600'
                  : 'hover:bg-stone-700 text-stone-300'
              }`}
            >
              <X size={20} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
