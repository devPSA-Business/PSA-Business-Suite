import { logger } from '@lib/logger';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { StockItem } from '../../../shared/api/db';
import { StockCategory, StockCategoryLabels } from '../../../domain/models/StockCategory';
import { DIContainer } from '@infrastructure/di/Container';
import { useCartStore } from '../store/useCartStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { Plus, Search } from 'lucide-react';
import { useAuthStore } from '../../../shared/store/authStore';

/**
 * @ai_context Halaman daftar produk kasir POS.
 * @business_rule Filter kategori DILARANG hardcoded — wajib dari StockCategory enum.
 *   - Tampilkan hanya kategori IMITATION dan ACCESSORIES di kasir ritel (bukan BUYBACK_GOLD).
 *   - BUYBACK_GOLD tidak dijual eceran ke konsumen (P0-KAS).
 * @changelog 2026-05-27 BACKLOG-10: Category filter dari enum, bukan string hardcoded.
 * @security_tier LOW
 */

/**
 * Kategori yang DITAMPILKAN di kasir ritel.
 * BUYBACK_GOLD, GOLD_JEWELLERY, GOLD_BAR dikecualikan — tidak dijual eceran.
 * @business_rule P0-KAS: emas tidak boleh dijual ke konsumen via kasir ritel.
 */
const POS_VISIBLE_CATEGORIES: StockCategory[] = [
  StockCategory.IMITATION,
  StockCategory.ACCESSORIES,
];

/** Label untuk tab "Semua" yang menampilkan seluruh kategori POS_VISIBLE_CATEGORIES */
const ALL_TAB = 'ALL' as const;
type CategoryTab = typeof ALL_TAB | StockCategory;

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
  const [activeCategory, setActiveCategory] = useState<CategoryTab>(ALL_TAB);
  const addItem = useCartStore((state) => state.addItem);
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Category filter query — pass ke liveQueries agar filter terjadi di DB level (efisien)
  const categoryFilter: string = activeCategory === ALL_TAB ? 'ALL' : activeCategory;

  // Debounced search + category-aware query
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(true);
      DIContainer.liveQueries.searchProducts(searchQuery, categoryFilter, user?.branchId)
        .then((data) => {
          // Client-side guard: filter agar hanya POS_VISIBLE_CATEGORIES tampil
          // (defence-in-depth jika liveQueries tidak filter)
          const filtered = data.filter(
            (p) => activeCategory !== ALL_TAB
              ? p.category === activeCategory
              : POS_VISIBLE_CATEGORIES.includes(p.category as StockCategory)
          );
          setProducts(filtered.slice(0, 50)); // Limit 50 untuk performa DOM
          setIsLoading(false);
        })
        .catch(err => {
          logger.error('Failed to search products', {
            error: err instanceof Error ? err.message : String(err),
          });
          setIsLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory, categoryFilter, user?.branchId]);

  // Global Barcode Scanner Listener (Zero-Click)
  useEffect(() => {
    let barcodeBuffer = '';
    let timeoutId: NodeJS.Timeout | undefined;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        if (document.activeElement?.id !== 'pos-search-input') return;
      }

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
        barcodeBuffer += e.key;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { barcodeBuffer = ''; }, 200);
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
  }, [addItem]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && products?.length === 1) {
      handleAdd(products[0]);
      setSearchQuery('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
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

      {/* Category Tabs — dari StockCategory enum, bukan hardcoded string */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(ALL_TAB)}
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeCategory === ALL_TAB
              ? 'bg-brand-900 text-white'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Semua
        </button>
        {POS_VISIBLE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeCategory === cat
                ? 'bg-brand-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {StockCategoryLabels[cat]}
          </button>
        ))}
      </div>
      
      {/* Product Grid */}
      {isLoading ? (
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
      ) : products.length === 0 ? (
        <div className="p-8 text-center text-stone-500 bg-white rounded-2xl border border-stone-100">
          {searchQuery
            ? `Produk "${searchQuery}" tidak ditemukan.`
            : 'Tidak ada produk di kategori ini.'}
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
        logger.error("Failed to search products:", { error: err instanceof Error ? err.message : String(err) });
        setIsLoading(false);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.branchId]);

  // Global Barcode Scanner Listener (Zero-Click)
  useEffect(() => {
    let barcodeBuffer = '';
    let timeoutId: NodeJS.Timeout | undefined;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika user sedang mengetik manual di input/textarea/select lain
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        if (document.activeElement?.id !== 'pos-search-input') return;
      }

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
