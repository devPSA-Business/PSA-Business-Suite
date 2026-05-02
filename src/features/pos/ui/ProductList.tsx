import { logger } from '@lib/logger';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { StockItem } from '../../../shared/api/db';
import { DIContainer } from '@infrastructure/di/Container';
import { useCartStore } from '../store/useCartStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { PackageSearch, Plus, Search, Loader2 } from 'lucide-react';

import { useAuthStore } from '../../../shared/store/authStore';

const ProductItem = React.memo(({ product, onAdd }: { product: StockItem; onAdd: (p: StockItem) => void }) => {
  return (
    <button
      onClick={() => onAdd(product)}
      disabled={product.quantity <= 0}
      className="flex flex-col text-left bg-white p-4 sm:p-5 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:border-brand-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:hover:shadow-sm group w-full min-h-[140px]"
    >
      <div className="flex-1 mb-3">
        <h3 className="font-bold text-stone-800 line-clamp-2 leading-snug group-hover:text-brand-900 transition-colors">
          {product.name}
        </h3>
        <p className="text-[10px] sm:text-xs text-stone-400 mt-1 font-mono">{product.barcode}</p>
      </div>
      <div className="flex items-end justify-between w-full mt-auto">
        <div>
          <p className="text-sm sm:text-base font-bold text-brand-900 font-mono">
            Rp {product.price.toLocaleString('id-ID')}
          </p>
          <p className={`text-[10px] sm:text-xs mt-1 font-medium px-2 py-0.5 rounded-full inline-block ${product.quantity > 0 ? 'bg-stone-100 text-stone-600' : 'bg-red-50 text-red-600'}`}>
            Stok: {product.quantity}
          </p>
        </div>
        <div className={`w-10 h-10 sm:w-8 sm:h-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${
          product.quantity > 0 
            ? 'bg-stone-50 text-brand-900 group-hover:bg-brand-900 group-hover:text-gold-500' 
            : 'bg-stone-100 text-stone-400'
        }`}>
          <Plus size={20} />
        </div>
      </div>
    </button>
  );
});

export function ProductList() {
  const [products, setProducts] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(true);
      DIContainer.liveQueries.searchProducts(searchQuery, 'ALL', user?.branchId).then((data) => {
        // Limit to 50 items to prevent DOM freeze
        setProducts(data.slice(0, 50));
        setIsLoading(false);
      }).catch(err => {
        logger.error("Failed to search products:", err);
        setIsLoading(false);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.branchId]);

  // Global Barcode Scanner Listener (Zero-Click)
  useEffect(() => {
    let barcodeBuffer = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let timeoutId: any;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika user sedang mengetik manual di input/textarea/select lain
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        if (document.activeElement?.id !== 'pos-search-input') return;
      }

      const now = Date.now();

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          e.preventDefault();
          const scannedBarcode = barcodeBuffer;
          barcodeBuffer = '';
          
          DIContainer.liveQueries.searchProducts(scannedBarcode, 'ALL', user?.branchId).then(matches => {
            const product = matches.find(p => p.barcode === scannedBarcode);
            if (product && product.quantity > 0) {
              useCartStore.getState().addItem(product);
              useToastStore.getState().addToast(`Ditambahkan: ${product.name}`, 'success');
            } else if (product && product.quantity <= 0) {
              useToastStore.getState().addToast(`Stok habis: ${product.name}`, 'error');
            } else {
              useToastStore.getState().addToast(`Barcode tidak ditemukan: ${scannedBarcode}`, 'error');
            }
          });
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1) {
        // Scanner Speed detection: barcode scanners usually send characters within ~20ms of each other
        // If a character comes after a long delay, it's likely manual typing, so we reset or ignore
        barcodeBuffer += e.key;
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { barcodeBuffer = ''; }, 200); // 200ms threshold
      }
    };

    const handleClearSearch = () => {
      setSearchQuery('');
      searchInputRef.current?.focus();
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('clear-pos-search', handleClearSearch);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('clear-pos-search', handleClearSearch);
      clearTimeout(timeoutId);
    };
  }, [user?.branchId]);

  const handleAdd = useCallback((product: StockItem) => {
    addItem(product);
    // Optional: clear search after adding if it was a barcode scan
    // setSearchQuery('');
    // searchInputRef.current?.focus();
  }, [addItem]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && products?.length === 1) {
      // If only one product matches (e.g., exact barcode scan), add it automatically
      handleAdd(products[0]);
      setSearchQuery('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-stone-400" />
        </div>
        <input
          id="pos-search-input"
          ref={searchInputRef}
          type="text"
          placeholder="Cari produk / scan barcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full pl-11 pr-4 py-4 sm:py-3 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm text-base sm:text-sm"
        />
      </div>
      
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-stone-200 animate-pulse">
                <div className="h-4 bg-stone-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-stone-200 rounded w-1/2 mb-4"></div>
                <div className="flex justify-between items-end mt-4">
                  <div className="h-5 bg-stone-200 rounded w-24"></div>
                  <div className="h-8 bg-stone-200 rounded-lg w-8"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="p-8 text-center text-stone-500 bg-white rounded-2xl border border-stone-100">
          Produk tidak ditemukan.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductItem key={product.id} product={product} onAdd={handleAdd} />
          ))}
        </div>
      )}
    </div>
  );
}
