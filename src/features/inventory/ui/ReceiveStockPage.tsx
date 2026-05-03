import { logger } from '@lib/logger';
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../shared/store/appStore';
import { DIContainer } from '@infrastructure/di/Container';
import { PackagePlus, Plus, Save, Trash2, Upload, Info } from 'lucide-react';
import { useToastStore } from '../../../shared/store/toastStore';
import { useAuthStore } from '../../../shared/store/authStore';
import { UserRole } from '../../../domain/models/User';
import { StockCategory, StockCategoryLabels } from '../../../domain/models/StockCategory';
import { BackButton } from '../../../shared/components/BackButton';
import { BulkImportModal } from '../components/BulkImportModal';
import { SkuGenerator } from '../components/SkuGenerator';
import { db } from '../../../shared/api/db';

interface DraftItem {
  id: string; // Temporary ID for draft list
  barcode: string;
  name: string;
  category: StockCategory;
  quantity: number;
  cost: number;
  price: number;
}

export function ReceiveStockPage() {
  const { addToast } = useToastStore();
  const user = useAuthStore((state) => state.user);
  const categories = useAppStore((state) => state.categories);

  // Document Info State
  const [invoiceNo, setInvoiceNo] = useState('');
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('');

  // Item Detail State
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<StockCategory>(categories[0]);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [cost, setCost] = useState<number | ''>('');
  const [price, setPrice] = useState<number | ''>('');

  // Draft List State
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isExistingProduct, setIsExistingProduct] = useState(false);
  const [isAutoSku, setIsAutoSku] = useState(false);

  useEffect(() => {
    if (!barcode || barcode.length < 3) {
      setIsExistingProduct(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const existingItem = await db.stock.where('barcode').equals(barcode).first();
        if (existingItem) {
          setName(existingItem.name);
          setCategory(existingItem.category);
          setPrice(existingItem.price);
          setCost(existingItem.cost);
          setIsExistingProduct(true);
          addToast(`Produk ditemukan: ${existingItem.name}. Data otomatis diisi.`, 'info');
        } else {
          setIsExistingProduct(false);
          // Only notify if we just transitioned from an existing product or if it's a long barcode (likely scanned)
          if (barcode.length >= 6) {
             addToast('Barcode baru. Silakan isi detail produk.', 'info');
          }
        }
      } catch (error) {
        logger.error('Error checking barcode:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [barcode, addToast]);

  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setBarcode(`PSA${timestamp}${random}`);
  };

  const handleAddDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || quantity === '' || cost === '' || price === '') {
      addToast('Mohon lengkapi semua field detail barang.', 'error');
      return;
    }

    const newItem: DraftItem = {
      id: crypto.randomUUID(),
      barcode: barcode || `PSA${Date.now().toString().slice(-8)}`,
      name,
      category: category as StockCategory,
      quantity: Number(quantity),
      cost: Number(cost),
      price: Number(price),
    };

    setDraftItems([...draftItems, newItem]);

    // Reset item form
    setBarcode('');
    setName('');
    setQuantity('');
    setCost('');
    setPrice('');
    setIsExistingProduct(false);
  };

  const handleRemoveDraft = (id: string) => {
    setDraftItems(draftItems.filter((item) => item.id !== id));
  };

  const handleSaveAll = async () => {
    if (draftItems.length === 0) {
      addToast('Daftar penerimaan masih kosong.', 'info');
      return;
    }

    if (!invoiceNo || !supplierName) {
      addToast('Mohon lengkapi No. Nota dan Nama Supplier.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (!user) throw new Error('User not authenticated');

      for (const item of draftItems) {
        await DIContainer.receiveStockUseCase.execute({
          name: item.name,
          category: item.category,
          barcode: item.barcode,
          quantity: item.quantity,
          cost: item.cost,
          price: item.price,
          userId: user.name,
          userRole: user.role
        });
      }

      addToast('Semua barang berhasil disimpan ke inventaris.', 'success');
      setDraftItems([]);
      setInvoiceNo('');
      setSupplierName('');
    } catch (error) {
      logger.error('Failed to save received stock:', error);
      addToast('Terjadi kesalahan saat menyimpan barang.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <BackButton />
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-brand-900 flex items-center gap-3">
            <PackagePlus className="w-8 h-8 text-gold-500" />
            Penerimaan Barang
          </h1>
          <p className="text-stone-500 mt-1">
            Input stok baru dari supplier ke dalam inventaris toko.
          </p>
        </div>
        <button
          onClick={() => setIsBulkImportOpen(true)}
          className="flex items-center justify-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-6 py-4 rounded-2xl font-bold shadow-sm transition-all active:scale-95 min-h-[56px]"
        >
          <Upload size={20} />
          Impor Massal
        </button>
      </div>

      <BulkImportModal 
        isOpen={isBulkImportOpen} 
        onClose={() => setIsBulkImportOpen(false)} 
        onSuccess={() => {
          addToast('Impor massal berhasil', 'success');
        }}
      />

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200 space-y-8">
        {/* Group 1: Info Dokumen */}
        <div>
          <h2 className="text-lg font-bold text-brand-900 mb-4 border-b border-stone-100 pb-2">
            1. Informasi Dokumen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                No. Nota / Invoice
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="INV-2023..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Tanggal Terima
              </label>
              <input
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Nama Supplier
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="PT. Sumber Emas..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800"
              />
            </div>
          </div>
        </div>

        {/* Group 2: Detail Barang */}
        <div>
          <h2 className="text-lg font-bold text-brand-900 mb-4 border-b border-stone-100 pb-2">
            2. Detail Barang
          </h2>
          <form onSubmit={handleAddDraft} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1 flex items-center justify-between">
                  <span>Barcode / SKU (Unik)</span>
                  <button 
                    type="button" 
                    onClick={() => setIsAutoSku(!isAutoSku)}
                    className="text-xs text-brand-900 font-bold hover:underline"
                  >
                    {isAutoSku ? 'Input Manual' : 'Auto Generate SKU'}
                  </button>
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Scan atau ketik..."
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800 font-mono"
                    />
                    {!isAutoSku && (
                      <button
                        type="button"
                        onClick={generateBarcode}
                        className="min-w-[44px] min-h-[44px] px-4 bg-stone-200 text-stone-700 rounded-xl hover:bg-stone-300 transition-colors font-medium text-sm whitespace-nowrap flex items-center justify-center"
                      >
                        Acak
                      </button>
                    )}
                  </div>
                  {isAutoSku && (
                    <div className="-mx-2 -mt-2">
                      <SkuGenerator 
                        onBarcodeGenerated={setBarcode} 
                        onNameSuggested={(suggestedName) => !name && setName(suggestedName)} 
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Nama Barang <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Cincin Xuping Permata..."
                    required
                    className={`w-full bg-stone-50 border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800 ${
                      isExistingProduct ? 'border-emerald-300 bg-emerald-50/30' : 'border-stone-200'
                    }`}
                  />
                  {isExistingProduct && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center gap-1 text-xs font-bold bg-emerald-100 px-2 py-1 rounded-md">
                      <Info size={14} />
                      Auto-filled
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as StockCategory)}
                  required
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {StockCategoryLabels[cat]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Kuantitas <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  min="1"
                  required
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Harga Modal (Cost) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))}
                  min="0"
                  required
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Berat Emas (Gram)
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Harga Jual (Price) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  min="0"
                  required
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800"
                />
              </div>
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 border border-brand-900 text-brand-900 rounded-xl p-3 hover:bg-brand-50 transition-colors font-bold active:scale-95"
              >
                <Plus size={20} />
                Tambah ke Daftar Penerimaan
              </button>
            </div>
          </form>
        </div>

        {/* Draft List */}
        {draftItems.length > 0 && (
          <div className="pt-6 border-t border-stone-200 animate-in fade-in duration-300">
            <h3 className="text-md font-bold text-stone-800 mb-3">
              Daftar Barang ({draftItems.length} item)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-sm text-stone-600">
                <thead className="bg-stone-50 text-stone-700 border-b border-stone-200">
                  <tr>
                    <th className="p-3 font-semibold">Barcode</th>
                    <th className="p-3 font-semibold">Nama Barang</th>
                    <th className="p-3 font-semibold">Kategori</th>
                    <th className="p-3 font-semibold text-right">Qty</th>
                    <th className="p-3 font-semibold text-right">Modal</th>
                    <th className="p-3 font-semibold text-right">Jual</th>
                    <th className="p-3 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {draftItems.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-3 font-mono text-xs">{item.barcode}</td>
                      <td className="p-3 font-medium text-stone-800">{item.name}</td>
                      <td className="p-3">{StockCategoryLabels[item.category]}</td>
                      <td className="p-3 text-right font-medium">{item.quantity}</td>
                      <td className="p-3 text-right">Rp {item.cost.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right text-brand-900 font-medium">Rp {item.price.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveDraft(item.id)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5 mx-auto text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="w-full min-h-[56px] flex items-center justify-center gap-2 bg-brand-900 text-gold-500 font-bold rounded-xl active:scale-95 transition-all shadow-md hover:bg-brand-800 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Save size={24} />
                {isSaving ? 'Menyimpan...' : 'Simpan Semua ke Inventaris'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
