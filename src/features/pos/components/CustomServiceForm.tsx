import React, { useState } from 'react';
import { Wrench, PackagePlus } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { handleNumberInputKeyDown, sanitizeNumberInput } from '../../../shared/utils/inputUtils';

export function CustomServiceForm() {
  const { addCustomItem } = useCartStore();
  const addToast = useToastStore((state) => state.addToast);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    type: 'REPARASI' as 'REPARASI' | 'SEPUH' | 'CUSTOM'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price) {
      addToast('Judul dan Harga wajib diisi', 'error');
      return;
    }

    const priceNum = Number(formData.price);
    if (priceNum <= 0) {
      addToast('Harga harus lebih dari 0', 'error');
      return;
    }

    addCustomItem({
      stockId: `JASA-${Date.now()}`,
      name: `[${formData.type}] ${formData.title}`,
      price: priceNum,
      quantity: 1,
      subtotal: priceNum,
      maxStock: 999,
      isCustomItem: true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    addToast('Jasa ditambahkan ke keranjang', 'success');
    setFormData({ title: '', description: '', price: '', type: 'REPARASI' });
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Wrench size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-800">Layanan Jasa</h2>
              <p className="text-sm text-stone-500">Reparasi, Sepuh & Pesanan Custom</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {['REPARASI', 'SEPUH', 'CUSTOM'].map((cat) => (
              <button
                type="button"
                key={cat}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => setFormData({ ...formData, type: cat as any })}
                className={`py-3 px-2 rounded-xl text-sm font-bold transition-all border ${
                  formData.type === cat 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-[1.02]' 
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Judul Jasa / Barang</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-shadow"
              placeholder="Contoh: Patri Cincin Patah"
            />
          </div>

           <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Biaya Jasa (Rp)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">Rp</span>
              <input
                type="text"
                required
                value={formData.price}
                onKeyDown={handleNumberInputKeyDown}
                onChange={(e) => setFormData({ ...formData, price: sanitizeNumberInput(e.target.value) })}
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none text-xl font-mono transition-shadow"
                placeholder="0"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <PackagePlus size={20} />
              <span>Masukkan ke Tagihan Kasir</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
