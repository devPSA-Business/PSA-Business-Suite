import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Edit2, Trash2, Plus, PackageSearch, X, AlertTriangle, Filter, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, StockItem } from '../../../shared/api/db';
import { DIContainer } from '@infrastructure/di/Container';
import { InventoryFilterDrawer, InventoryFilterState } from '../components/InventoryFilterDrawer';
import { useToastStore } from '../../../shared/store/toastStore';
import { useAuthStore } from '../../../shared/store/authStore';
import { UserRole } from '../../../domain/models/User';
import { StockCategory, StockCategoryLabels } from '../../../domain/models/StockCategory';
import { useAppStore } from '../../../shared/store/appStore';
import { UI_REGISTRY } from '../../../shared/constants/ui_registry';

import { PinGate } from '../../../shared/components/PinGate';
import { BackButton } from '../../../shared/components/BackButton';

export function InventoryPage() {
  const { addToast } = useToastStore();
  const user = useAuthStore((state) => state.user);
  const categories = useAppStore((state) => state.categories);

  // Helper: check if category needs weight/karat
  const isGoldCategory = (cat: string) => {
    return [StockCategory.GOLD_JEWELLERY, StockCategory.GOLD_BAR, StockCategory.BUYBACK_GOLD].includes(cat as StockCategory);
  };
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<InventoryFilterState>({
    category: 'all',
    aging: 'all'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const queryResult = useLiveQuery(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let collection: any;
    
    if (searchTerm) {
      // Optimasi Pencarian Skala Besar: Gunakan B-Tree Index untuk text prefix search
      collection = db.stock
        .where('name')
        .startsWithIgnoreCase(searchTerm)
        .or('barcode')
        .startsWithIgnoreCase(searchTerm);
    } else {
      // Jika tidak ada pencarian, gunakan default db.stock collection
      collection = db.stock.toCollection();
    }

    // Filter lanjutan di level Dexie C++ Backend (sebelum ditarik ke RAM JavaScript)
    const filteredCollection = collection.filter((item: StockItem) => {
      // Filter Branch
      if (user?.branchId && user.branchId !== 'HQ' && item.branchId !== user.branchId) {
        return false;
      }
      
      // Filter Kategori
      if (filters.category !== 'all' && item.category !== filters.category) return false;
      
      // Filter Kelancaran Stok (Aging)
      if (filters.aging === 'slow' && item.quantity < 2) return false;
      if (filters.aging === 'dead' && item.quantity === 0) return false;

      return true;
    });

    // Menghitung total untuk pagination (sangat cepat di IndexedDB)
    const count = await filteredCollection.count();
    
    // Hanya tarik ke RAM sesuai offset dan halaman saat ini
    const items = await filteredCollection
      .offset((currentPage - 1) * itemsPerPage)
      .limit(itemsPerPage)
      .toArray();
      
    return { count, items };
  }, [filters, searchTerm, user?.branchId, currentPage]);

  // Pagination logic
  const totalItems = queryResult?.count || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedProducts = queryResult?.items || [];

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    category: categories[0],
    price: '',
    cost: '',
    quantity: '',
    weight: '',
    karat: ''
  });

  const handleOpenForm = (product?: StockItem) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        barcode: product.barcode,
        name: product.name,
        category: product.category,
        price: product.price.toString(),
        cost: product.cost.toString(),
        quantity: product.quantity.toString(),
        weight: (product.weight ?? 0).toString(),
        karat: (product.karat ?? 0).toString()
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        barcode: '',
        name: '',
        category: categories[0],
        price: '',
        cost: '',
        quantity: '',
        weight: '',
        karat: ''
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedProduct(null);
  };

  const handleOpenDelete = (product: StockItem) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
  };

  const handleCloseDelete = () => {
    setIsDeleteOpen(false);
    setSelectedProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      if (!user) throw new Error('User not authenticated');

      const isGold = isGoldCategory(formData.category);
      const productData = {
        barcode: formData.barcode,
        name: formData.name,
        category: formData.category as StockCategory,
        price: Number(formData.price),
        cost: Number(formData.cost),
        quantity: Number(formData.quantity),
        weight: isGold ? Number(formData.weight) : 0,
        karat: isGold ? Number(formData.karat) : 0,
        userId: user.name,
        userRole: user.role
      };

      if (selectedProduct) {
        await DIContainer.updateProductUseCase.execute({
          id: selectedProduct.id,
          ...productData
        });
      } else {
        await DIContainer.receiveStockUseCase.execute(productData);
      }
      
      addToast('Barang berhasil disimpan', 'success');
      handleCloseForm();
    } catch (error) {
      const msg = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
      addToast(`Gagal menyimpan produk: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    
    setIsProcessing(true);
    try {
      if (!user) throw new Error('User not authenticated');
      await DIContainer.deleteProductUseCase.execute(selectedProduct.id, user.name, user.role);
      addToast('Barang berhasil dihapus', 'success');
      handleCloseDelete();
    } catch (error) {
      const msg = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
      addToast(`Gagal menghapus produk: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 pb-24">
      <BackButton />
      
      {/* Header Section: Bento Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-brand-900">{UI_REGISTRY.PAGES.INVENTORY.label}</h1>
          <p className="text-stone-500">Kelola stok dan pantau ketersediaan barang.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-brand-900/20 outline-none shadow-sm"
            />
          </div>
          <button
            onClick={() => setIsFilterOpen(true)}
            className="p-3 bg-white border border-stone-200 rounded-2xl text-stone-600 hover:bg-stone-50 transition-all"
          >
            <Filter size={20} />
          </button>
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 px-5 py-3 bg-brand-900 text-gold-500 rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">{UI_REGISTRY.ACTIONS.CREATE.label}</span>
          </button>
        </div>
      </div>

      <InventoryFilterDrawer 
        isOpen={isFilterOpen} 
        onClose={() => setIsFilterOpen(false)} 
        filters={filters}
        onApplyFilters={setFilters}
      />

      {/* Bento Grid Content */}
      <div className="bento-grid">
        {paginatedProducts?.map((product: StockItem) => (
          <div key={product.id} className="bg-white p-5 rounded-[1.5rem] border border-stone-200 shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex justify-between items-start mb-4">
              <div className="min-w-0">
                <h3 className="font-bold text-stone-800 truncate">{product.name}</h3>
                <p className="text-xs font-mono text-stone-400">{product.barcode}</p>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-1 bg-stone-100 text-stone-600 rounded-lg">
                {StockCategoryLabels[product.category as StockCategory]}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-stone-50">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase">Harga Jual</p>
                <p className="font-bold text-brand-900">Rp {product.price.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-stone-400 uppercase">Stok | Berat | Karat</p>
                <p className="font-bold text-stone-800">
                  {product.quantity} | {product.weight ?? 0}g | {product.karat ?? 0}%
                </p>
              </div>
            </div>

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button
                onClick={() => handleOpenForm(product)}
                className="w-12 h-12 flex items-center justify-center bg-stone-100 text-stone-600 hover:bg-brand-900 hover:text-gold-500 rounded-full transition-all active:scale-95"
              >
                <Edit2 size={20} />
              </button>
              <button
                onClick={() => handleOpenDelete(product)}
                className="w-12 h-12 flex items-center justify-center bg-stone-100 text-stone-600 hover:bg-red-600 hover:text-white rounded-full transition-all active:scale-95"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 disabled:opacity-50 hover:bg-stone-50 transition-colors"
          >
            Sebelumnya
          </button>
          <span className="text-sm font-medium text-stone-500">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 disabled:opacity-50 hover:bg-stone-50 transition-colors"
          >
            Selanjutnya
          </button>
        </div>
      )}

      {/* Form Modal (Add/Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm sm:p-4 transition-opacity">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={handleCloseForm} />
          
          <div className="bg-white w-full sm:max-w-lg sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 relative max-h-[90vh] flex flex-col">
            {/* Mobile drag handle indicator */}
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-12 h-1.5 bg-stone-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-stone-100 bg-stone-50/50 shrink-0">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-900">
                {selectedProduct ? 'Perbarui Barang' : 'Tambah Barang Baru'}
              </h2>
              <button onClick={handleCloseForm} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-all active:scale-95">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 pb-safe">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Nama Barang</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 sm:p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-900/10 focus:border-brand-900 transition-all text-stone-800 font-bold text-sm sm:text-base"
                    placeholder="Masukkan nama barang..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Barcode / SKU</label>
                  <input
                    required
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    className="w-full p-3 sm:p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-900/10 focus:border-brand-900 transition-all text-stone-800 font-mono text-sm sm:text-base"
                    placeholder="C-001"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Kategori</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as StockCategory})}
                    className="w-full p-3 sm:p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-900/10 focus:border-brand-900 transition-all text-stone-800 font-bold text-sm sm:text-base"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {StockCategoryLabels[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Harga Modal</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    className="w-full p-3 sm:p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-900/10 focus:border-brand-900 transition-all text-stone-800 font-bold text-sm sm:text-base font-mono"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Harga Jual</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full p-3 sm:p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-900/10 focus:border-brand-900 transition-all text-brand-900 font-black text-lg sm:text-xl font-mono"
                    placeholder="0"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Kuantitas Stok</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full p-3 sm:p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-900/10 focus:border-brand-900 transition-all text-stone-800 font-bold text-sm sm:text-base font-mono"
                    placeholder="0"
                  />
                </div>

                <AnimatePresence mode="popLayout">
                  {isGoldCategory(formData.category) && (
                    <motion.div 
                      key="gold-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="md:col-span-2 grid grid-cols-2 gap-4 sm:gap-6 overflow-hidden"
                    >
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Berat (gram)</label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.weight}
                          onChange={(e) => setFormData({...formData, weight: e.target.value})}
                          className="w-full p-3 sm:p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-900/10 focus:border-brand-900 transition-all text-stone-800 font-bold text-sm sm:text-base font-mono"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Karat (%)</label>
                        <input
                          required
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.karat}
                          onChange={(e) => setFormData({...formData, karat: e.target.value})}
                          className="w-full p-3 sm:p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-900/10 focus:border-brand-900 transition-all text-stone-800 font-bold text-sm sm:text-base font-mono"
                          placeholder="0"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-4 sm:pt-6 flex gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-2xl font-bold transition-all active:scale-95 text-sm sm:text-base"
                >
                  {UI_REGISTRY.ACTIONS.CANCEL.label}
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-gold-500 bg-brand-900 hover:bg-brand-800 disabled:bg-stone-300 disabled:text-stone-500 rounded-2xl font-black shadow-lg shadow-brand-900/20 transition-all active:scale-95 text-sm sm:text-base"
                >
                  {isProcessing ? 'Menyimpan...' : UI_REGISTRY.ACTIONS.SAVE.label}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm sm:p-4 transition-opacity">
          <div className="absolute inset-0" onClick={handleCloseDelete} />
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200 p-6 sm:p-10 text-center relative pb-safe">
            <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-6 sm:hidden" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-red-100">
              <AlertTriangle size={32} className="sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 mb-2 sm:mb-3">Hapus Barang?</h3>
            <p className="text-stone-500 text-sm sm:text-lg mb-8 sm:mb-10 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong>{selectedProduct.name}</strong>? Data ini akan hilang permanen dari inventaris.
            </p>
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={handleCloseDelete}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-2xl font-bold transition-all active:scale-95 text-sm sm:text-base"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isProcessing}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-2xl font-black shadow-lg shadow-red-600/20 transition-all active:scale-95 text-sm sm:text-base"
              >
                {isProcessing ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
      <span className="text-[9px] text-stone-300 font-mono absolute bottom-1 right-2">[W-I-01]</span>
    </div>
  );
}
