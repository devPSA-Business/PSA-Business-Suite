import React from 'react';
import { useRouterState, useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Printer, 
  RefreshCw, Wrench, Home, PackagePlus
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export function ContextualBottomSheet() {
  const { isContextualMenuOpen, setContextualMenuOpen } = useUIStore();
  const routerState = useRouterState();
  const navigate = useNavigate();
  const pathname = routerState.location.pathname;

  const handleAction = (action: () => void) => {
    action();
    setContextualMenuOpen(false);
  };

  const getContextualActions = () => {
    if (pathname.startsWith('/inventory')) {
      return [
        { label: 'Tambah Barang Baru', icon: PackagePlus, onClick: () => navigate({ to: '/receive-stock' }), color: 'text-brand-900', bg: 'bg-brand-50' },
        { label: 'Cetak Barcode', icon: Printer, onClick: () => navigate({ to: '/barcode-print' }), color: 'text-stone-700', bg: 'bg-stone-100' },
      ];
    }
    if (pathname.startsWith('/services')) {
      return [
        { label: 'Akses Reparasi Baru', icon: Wrench, onClick: () => navigate({ to: '/service-pos' }), color: 'text-brand-900', bg: 'bg-brand-50' },
      ];
    }
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/finance') || pathname.startsWith('/audit')) {
      return [
        { label: 'Refresh Data Laporan', icon: RefreshCw, onClick: () => window.location.reload(), color: 'text-stone-700', bg: 'bg-stone-100' },
      ];
    }
    
    // Default actions if no specific context
    return [
      { label: 'Kembali ke Beranda', icon: Home, onClick: () => navigate({ to: '/workspace' }), color: 'text-stone-700', bg: 'bg-stone-100' },
    ];
  };

  const actions = getContextualActions();

  return (
    <AnimatePresence>
      {isContextualMenuOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setContextualMenuOpen(false)}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[60]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] z-[70] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pb-safe"
          >
            <div className="p-4 sm:p-6 pt-3 sm:pt-4">
              {/* Drag Handle (Visual Only) */}
              <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-4 sm:mb-6" />

              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-serif font-bold text-brand-900">Alat & Aksi</h3>
                <button 
                  onClick={() => setContextualMenuOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-600 bg-stone-50 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X size={20} className="sm:w-5 sm:h-5 w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                {actions.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAction(action.onClick)}
                      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl transition-all active:scale-95 border border-stone-100/50 ${action.bg}`}
                    >
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center shadow-sm ${action.color}`}>
                        <Icon size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                      </div>
                      <span className={`font-bold text-sm sm:text-base ${action.color}`}>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
