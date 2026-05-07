import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Search, PackageSearch } from 'lucide-react';
import { db } from '../../../shared/api/db';

interface QuickCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCatalogDrawer({ isOpen, onClose }: QuickCatalogDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<'perhiasan' | 'bahan'>('perhiasan');

  const products = useLiveQuery(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let collection: any;
    if (searchTerm) {
      collection = db.stock.where('name').startsWithIgnoreCase(searchTerm).or('barcode').startsWithIgnoreCase(searchTerm);
    } else {
      collection = db.stock;
    }
    const results = await collection.toArray();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return results.filter((item: any) => {
      if (tab === 'perhiasan') {
        return item.category === 'CINCIN' || item.category === 'KALUNG' || item.category === 'GELANG' || item.category === 'ANTING' || item.category === 'LIONTIN';
      } else {
        return item.category === 'BAHAN' || item.category === 'KOTAK' || item.category === 'LAINNYA';
      }
    }).slice(0, 30); // limit for quick viewing
  }, [searchTerm, tab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 w-full md:w-96 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-300 border-r border-stone-200">
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-brand-900 text-lg">Katalog Cepat</h2>
          <p className="text-xs text-stone-500">Cek harga & stok realtime</p>
        </div>
        <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 bg-stone-200/50 hover:bg-stone-200 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 border-b border-stone-200">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama/barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 outline-none text-sm transition-all"
          />
        </div>
        
        <div className="flex p-1 bg-stone-100 rounded-xl">
          <button
            onClick={() => setTab('perhiasan')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${tab === 'perhiasan' ? 'bg-white text-brand-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Perhiasan
          </button>
          <button
            onClick={() => setTab('bahan')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${tab === 'bahan' ? 'bg-white text-brand-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Bahan & Brand
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
        {products?.length === 0 ? (
          <div className="text-center py-12">
            <PackageSearch className="mx-auto text-stone-300 mb-2" size={48} />
            <p className="text-stone-500 text-sm">Produk tidak di temukan</p>
          </div>
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          products?.map((item: any) => (
            <div key={item.id} className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <p className="font-bold text-stone-800 text-sm truncate">{item.name}</p>
                <p className="text-xs text-stone-400 font-mono">{item.barcode}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-brand-900">Rp {item.price.toLocaleString()}</p>
                <p className={`text-[10px] font-bold uppercase mt-1 ${item.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {item.quantity > 0 ? `Tersedia: ${item.quantity}` : 'Habis'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
