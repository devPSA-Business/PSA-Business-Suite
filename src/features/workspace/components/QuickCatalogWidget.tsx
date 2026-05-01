import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../shared/api/db';
import { Search, Package } from 'lucide-react';

export function QuickCatalogWidget() {
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useLiveQuery(
    async () => {
      if (!searchQuery.trim()) return [];
      
      const lowerQuery = searchQuery.toLowerCase();
      // Gunakan indeks 'name' dan 'barcode' untuk pencarian O(1)
      const resultsByName = await db.stock
        .where('name')
        .startsWithIgnoreCase(searchQuery)
        .limit(5)
        .toArray();

      const resultsByBarcode = await db.stock
        .where('barcode')
        .startsWithIgnoreCase(searchQuery)
        .limit(5)
        .toArray();

      // Gabungkan dan hilangkan duplikat, lalu potong maksimal 5
      const combined = [...resultsByName, ...resultsByBarcode];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      
      return unique.slice(0, 5);
    },
    [searchQuery]
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-full min-h-[300px]">
      <div className="p-5 border-b border-stone-100 bg-stone-50 flex items-center gap-2">
        <Search size={20} className="text-stone-500" />
        <h2 className="font-bold text-brand-900">Cek Harga & Stok</h2>
      </div>
      <div className="p-4 border-b border-stone-100">
        <input
          type="text"
          placeholder="Ketik nama atau barcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 relative min-h-[150px]">
        {!searchQuery.trim() ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 p-4 text-center">
            <Package size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Cari produk untuk melihat harga dan sisa stok dengan cepat.</p>
          </div>
        ) : searchResults === undefined ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-xl flex justify-between items-center animate-pulse">
                <div className="space-y-2 w-1/2">
                  <div className="h-4 bg-stone-200 rounded w-full"></div>
                  <div className="h-3 bg-stone-200 rounded w-2/3"></div>
                </div>
                <div className="space-y-2 w-1/4 items-end flex flex-col">
                  <div className="h-4 bg-stone-200 rounded w-3/4"></div>
                  <div className="h-3 bg-stone-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : searchResults.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-stone-500 text-sm">Produk tidak ditemukan.</div>
        ) : (
          <div className="space-y-2">
            {searchResults.map(item => (
              <div key={item.id} className="p-3 bg-stone-50 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-stone-800 text-sm line-clamp-1">{item.name}</p>
                  <p className="text-xs text-stone-500 font-mono">{item.barcode}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-900 text-sm">Rp {item.price.toLocaleString('id-ID')}</p>
                  <p className={`text-xs font-bold ${item.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Stok: {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
