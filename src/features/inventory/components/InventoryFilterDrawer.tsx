import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';

export interface InventoryFilterState {
  category: string;
  aging: 'all' | 'slow' | 'dead';
}

interface InventoryFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: InventoryFilterState;
  onApplyFilters: (filters: InventoryFilterState) => void;
}

export const InventoryFilterDrawer: React.FC<InventoryFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters: initialFilters,
  onApplyFilters
}) => {
  const [localFilters, setLocalFilters] = useState<InventoryFilterState>(initialFilters);

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(initialFilters);
    }
  }, [isOpen, initialFilters]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer / Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-y-0 sm:inset-x-auto sm:right-0 w-full sm:w-80 bg-white shadow-2xl z-50 flex flex-col rounded-t-[2.5rem] sm:rounded-none animate-in slide-in-from-bottom-full sm:slide-in-from-right-full duration-300 border-t sm:border-t-0 sm:border-l border-stone-200 max-h-[90vh] sm:max-h-none pb-safe">
        {/* Mobile drag handle indicator */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-stone-200 rounded-full" />
        </div>

        <div className="h-16 flex items-center justify-between px-6 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2 text-brand-900 font-bold">
            <Filter size={20} />
            <h2>Filter Inventaris</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Kategori Filter */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Kategori</label>
            <select 
              value={localFilters.category} 
              onChange={(e) => setLocalFilters({...localFilters, category: e.target.value})} 
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800 font-medium"
            >
              <option value="all">Semua Kategori</option>
              <option value="RITEL">Ritel</option>
              <option value="JASA">Jasa</option>
              <option value="EMAS">Emas</option>
            </select>
          </div>
          
          {/* Status Stok Filter */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Status Stok</label>
            <select 
              value={localFilters.aging} 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(e) => setLocalFilters({...localFilters, aging: e.target.value as any})} 
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800 font-medium"
            >
              <option value="all">Semua Status</option>
              <option value="slow">Slow Moving</option>
              <option value="dead">Dead Stock</option>
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-stone-100 shrink-0 bg-stone-50">
          <button 
            onClick={handleApply} 
            className="w-full min-h-[56px] bg-brand-900 text-gold-500 font-bold rounded-xl active:scale-95 transition-all shadow-md hover:bg-brand-800 flex items-center justify-center gap-2"
          >
            Terapkan Filter
          </button>
        </div>
      </div>
    </>
  );
};
