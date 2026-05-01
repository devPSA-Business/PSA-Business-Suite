import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { StockItem } from '../../../shared/api/db';
import { DIContainer } from '@infrastructure/di/Container';
import { Printer, Search, Plus, Trash2, PackageSearch } from 'lucide-react';
import { useToastStore } from '../../../shared/store/toastStore';
import { BackButton } from '../../../shared/components/BackButton';

interface PrintItem {
  product: StockItem;
  count: number;
}

export function BarcodePrintPage() {
  const { addToast } = useToastStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [printList, setPrintList] = useState<PrintItem[]>([]);

  const products = useLiveQuery(() => DIContainer.liveQueries.observeProducts(), []);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.barcode.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery)
    );
  }, [products, searchQuery]);

  const handleAddToList = (product: StockItem) => {
    setPrintList((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, count: item.count + 1 }
            : item
        );
      }
      return [...prev, { product, count: 1 }];
    });
  };

  const handleAddAllFiltered = () => {
    if (filteredProducts.length === 0) return;
    
    setPrintList((prev) => {
      const newList = [...prev];
      filteredProducts.forEach(product => {
        const existing = newList.find(item => item.product.id === product.id);
        if (existing) {
          existing.count += 1;
        } else {
          newList.push({ product, count: 1 });
        }
      });
      return newList;
    });
    addToast(`Berhasil menambahkan ${filteredProducts.length} item ke daftar cetak.`, 'success');
  };

  const handleClearList = () => {
    setPrintList([]);
    addToast('Daftar cetak dikosongkan.', 'info');
  };

  const handleRemoveFromList = (productId: string) => {
    setPrintList((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleUpdateCount = (productId: string, count: number) => {
    if (count < 1) return;
    setPrintList((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, count } : item
      )
    );
  };

  const handlePrint = () => {
    if (printList.length === 0) {
      addToast('Daftar cetak masih kosong.', 'info');
      return;
    }
    window.print();
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-brand-900 flex items-center gap-3">
          <Printer className="w-8 h-8 text-gold-500" />
          Cetak Barcode
        </h1>
        <p className="text-stone-500 mt-1">
          Pilih produk dan tentukan jumlah label barcode yang akan dicetak.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Pilih Barang */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-brand-900">Daftar Barang</h2>
            <button
              onClick={handleAddAllFiltered}
              disabled={filteredProducts.length === 0}
              className="text-xs font-bold text-brand-900 hover:underline disabled:text-stone-300"
            >
              Tambah Semua Hasil
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-4 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-stone-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama, barcode, atau kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800"
            />
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {!products ? (
              <div className="text-center py-8 text-stone-400 animate-pulse font-medium">
                Memuat data inventaris...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <PackageSearch size={40} className="text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500">Tidak ada barang yang ditemukan.</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-stone-50 border border-stone-100 rounded-xl hover:border-brand-900/30 transition-colors group"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-stone-800 truncate">{product.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <span className="font-mono bg-stone-200 px-1.5 py-0.5 rounded text-stone-700">
                        {product.barcode}
                      </span>
                      <span>Stok: <strong className="text-stone-700">{product.quantity}</strong></span>
                      <span>Rp {product.price.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToList(product)}
                    className="w-10 h-10 shrink-0 flex items-center justify-center bg-white border border-stone-200 text-brand-900 rounded-lg hover:bg-brand-50 hover:border-brand-900 transition-all active:scale-95 shadow-sm"
                    title="Tambahkan ke Daftar Cetak"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom Kanan: Daftar Cetak */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-brand-900">Daftar Cetak</h2>
              <span className="bg-brand-100 text-brand-900 px-3 py-1 rounded-full text-xs font-bold">
                {printList.reduce((acc, item) => acc + item.count, 0)} Label
              </span>
            </div>
            <button
              onClick={handleClearList}
              disabled={printList.length === 0}
              className="text-xs font-bold text-red-500 hover:underline disabled:text-stone-300"
            >
              Kosongkan
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar mb-4">
            {printList.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded-xl border border-stone-200 border-dashed h-full flex flex-col items-center justify-center">
                <Printer size={40} className="text-stone-300 mb-3" />
                <p className="text-stone-500">Belum ada barang yang dipilih.</p>
                <p className="text-sm text-stone-400 mt-1">Pilih barang dari daftar di sebelah kiri.</p>
              </div>
            ) : (
              printList.map((item) => (
                <div
                  key={item.product.id}
                  className="p-4 bg-stone-50 border border-stone-200 rounded-xl"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-stone-800 truncate">{item.product.name}</p>
                      <p className="text-xs font-mono text-stone-500 mt-0.5">{item.product.barcode}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromList(item.product.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Hapus"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2 bg-white p-2 rounded-lg border border-stone-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-2">Jumlah Label:</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleUpdateCount(item.product.id, Math.max(1, item.count - 1))}
                          className="w-8 h-8 flex items-center justify-center bg-stone-50 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-100"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.count}
                          onChange={(e) => handleUpdateCount(item.product.id, parseInt(e.target.value) || 1)}
                          className="w-16 text-center font-bold text-brand-900 bg-stone-50 border border-stone-200 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900"
                        />
                        <button 
                          onClick={() => handleUpdateCount(item.product.id, item.count + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-stone-50 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-1 justify-end px-1">
                      {[1, 5, 10].map(val => (
                        <button
                          key={val}
                          onClick={() => handleUpdateCount(item.product.id, item.count + val)}
                          className="text-[10px] font-bold px-2 py-1 bg-stone-50 border border-stone-100 rounded hover:bg-stone-100 text-stone-500"
                        >
                          +{val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="shrink-0 pt-4 border-t border-stone-100">
            <button
              onClick={handlePrint}
              disabled={printList.length === 0}
              className="w-full min-h-[56px] bg-brand-900 text-gold-500 font-bold rounded-xl active:scale-95 transition-all shadow-md hover:bg-brand-800 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Printer size={20} />
              Cetak Label Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles (Hidden on screen, visible only on print) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body > *:not(#print-area) {
            display: none !important;
          }
          #print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 0;
            size: auto;
          }
        }
      `}} />

      {/* Hidden Print Area */}
      <div id="print-area" className="hidden">
        <div className="flex flex-wrap gap-4 p-4">
          {printList.flatMap((item) => 
            Array.from({ length: item.count }).map((_, i) => (
              <div key={`${item.product.id}-${i}`} className="w-[40mm] h-[20mm] border border-black flex flex-col items-center justify-center p-1 text-center bg-white break-inside-avoid">
                <div className="font-bold text-[8px] leading-tight truncate w-full">{item.product.name}</div>
                <div className="font-mono text-[10px] font-bold my-0.5">{item.product.barcode}</div>
                <div className="text-[8px] font-bold">Rp {item.product.price.toLocaleString('id-ID')}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
