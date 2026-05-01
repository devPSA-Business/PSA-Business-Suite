import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logError } from '../utils/logger';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-stone-200 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h1 className="text-2xl font-serif font-bold text-brand-900 mb-3">Terjadi Kesalahan</h1>
            <p className="text-stone-500 mb-8">
              Maaf, terjadi kesalahan sistem yang tidak terduga. Silakan muat ulang halaman ini.
            </p>
            
            <div className="bg-stone-50 p-4 rounded-xl text-left mb-8 overflow-auto max-h-32 border border-stone-100">
              <p className="text-xs font-mono text-red-600 break-words">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 bg-brand-900 hover:bg-brand-800 text-gold-500 font-bold py-4 rounded-xl transition-all active:scale-95 shadow-md"
            >
              <RefreshCw size={20} />
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
