import { logger } from '@lib/logger';
import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { DIContainer } from '@infrastructure/di/Container';
import { useAuthStore } from '../../../shared/store/authStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { CustomerSelector } from '../../../shared/components/CustomerSelector';
import { Customer } from '../../../domain/models/Customer';
import { handleNumberInputKeyDown, isValidNumericValue, sanitizeNumberInput } from '../../../shared/utils/inputUtils';
import { ERROR_MESSAGES } from '../../../shared/constants/errorMessages';

interface RepairFormProps {
  hideBackButton?: boolean;
}

export function RepairForm({ hideBackButton: _hideBackButton }: RepairFormProps = {}) {
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    itemDescription: '',
    serviceType: 'REPARASI' as 'REPARASI' | 'SEPUH',
    initialWeight: '',
    price: '',
    materialCost: '',
    paymentMethod: 'CASH' as 'CASH' | 'TRANSFER' | 'QRIS',
  });
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>('');

  // Cleanup object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  // Fungsi kompresi gambar (WebP, max width 800px)
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Kompresi ke WebP dengan quality 0.8
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Gagal mengompresi gambar'));
            }
          }, 'image/webp', 0.8);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    // Jika operator menekan Cancel / "Batal Unggah" di window OS... 
    if (!file) {
        if (photoPreviewUrl) {
            URL.revokeObjectURL(photoPreviewUrl);
            setPhotoPreviewUrl('');
        }
        setPhotoBlob(null);
        return; 
    }

    if (!file.type.startsWith('image/')) {
      addToast('File harus berupa gambar.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const compressedBlob = await compressImage(file);
      
      // FIX: Hapus URL lama dari memori sebelum membuat yang baru
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      
      setPhotoBlob(compressedBlob);
      setPhotoPreviewUrl(URL.createObjectURL(compressedBlob));
    } catch (err) {
      logger.error('Gagal memproses gambar:', err);
      addToast('Gagal memproses gambar.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const weight = parseFloat(formData.initialWeight);
    const price = parseFloat(formData.price) || 0;
    const materialCost = parseFloat(formData.materialCost) || 0;

    // Validasi UI (P1 Financial Guard)
    if (!customer) {
      addToast(ERROR_MESSAGES.CUSTOMER_REQUIRED, 'error');
      return;
    }
    if (!formData.itemDescription) {
      addToast(ERROR_MESSAGES.ITEM_DESCRIPTION_REQUIRED, 'error');
      return;
    }
    if (!isValidNumericValue(formData.initialWeight, 0, 1000)) {
      addToast(ERROR_MESSAGES.WEIGHT_INVALID, 'error');
      return;
    }
    if (!isValidNumericValue(formData.price, 1, 100000000)) {
      addToast(ERROR_MESSAGES.PRICE_INVALID, 'error');
      return;
    }
    if (formData.materialCost && !isValidNumericValue(formData.materialCost, 0, 100000000)) {
      addToast(ERROR_MESSAGES.INVALID_NUMERIC, 'error');
      return;
    }
    if (!photoBlob) {
      addToast('Foto barang (Before) wajib diunggah sesuai SOP.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(photoBlob);
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          await DIContainer.createRepairUseCase.execute({
            customerName: customer.name,
            phoneNumber: customer.phoneNumber,
            itemDescription: formData.itemDescription,
            serviceType: formData.serviceType,
            initialWeight: weight,
            price: price,
            materialCost: materialCost,
            paymentMethod: formData.paymentMethod,
            photoBeforeBase64: base64String,
            photoBeforeBlob: undefined,
            userId: user ? user.name : 'System',
            customerId: customer.id,
          });
          
          addToast('Data reparasi berhasil disimpan!', 'success');
          // Reset form
          setFormData({
            itemDescription: '',
            serviceType: 'REPARASI',
            initialWeight: '',
            price: '',
            materialCost: '',
            paymentMethod: 'CASH',
          });
          setCustomer(null);
          setPhotoBlob(null);
          if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
          setPhotoPreviewUrl('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
          addToast((error as Error).message || 'Terjadi kesalahan saat menyimpan data.', 'error');
        } finally {
          setIsLoading(false);
        }
      };
    } catch (error) {
      addToast((error as Error).message || 'Gagal memproses gambar.', 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200 w-full max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-900 mb-2">Penerimaan Jasa Reparasi & Sepuh</h2>
        <p className="text-stone-500 text-xs sm:text-sm">Pastikan untuk menimbang barang dan memfoto kondisi awal sesuai SOP.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kolom Kiri: Data Pelanggan & Barang */}
          <div className="space-y-5 sm:space-y-6">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-2">Jenis Jasa</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {(['REPARASI', 'SEPUH'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, serviceType: type })}
                    className={`p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 ${
                      formData.serviceType === type
                        ? 'bg-brand-900 text-gold-500 shadow-md border-2 border-brand-900'
                        : 'bg-stone-50 text-stone-600 border-2 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {type === 'REPARASI' ? 'Reparasi' : 'Sepuh (Chrome)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-2">Pelanggan *</label>
              <CustomerSelector onSelect={setCustomer} selectedCustomer={customer} />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-2">Deskripsi Barang *</label>
              <textarea
                required
                rows={3}
                value={formData.itemDescription}
                onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800 resize-none text-sm sm:text-base"
                placeholder="Contoh: Cincin emas kuning mata satu, patah di bagian bawah."
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-2">Berat Awal (g) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.initialWeight}
                  onChange={(e) => setFormData({ ...formData, initialWeight: sanitizeNumberInput(e.target.value) })}
                  onBlur={() => setFormData({ ...formData, initialWeight: sanitizeNumberInput(formData.initialWeight) })}
                  onKeyDown={handleNumberInputKeyDown}
                  className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800 font-mono text-sm sm:text-base"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-2">Harga Jasa (Rp) *</label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: sanitizeNumberInput(e.target.value) })}
                  onBlur={() => setFormData({ ...formData, price: sanitizeNumberInput(formData.price) })}
                  onKeyDown={handleNumberInputKeyDown}
                  className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800 font-mono text-sm sm:text-base"
                  placeholder="0"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-2">Biaya Bahan (Rp)</label>
                <input
                  type="number"
                  value={formData.materialCost}
                  onChange={(e) => setFormData({ ...formData, materialCost: sanitizeNumberInput(e.target.value) })}
                  onBlur={() => setFormData({ ...formData, materialCost: sanitizeNumberInput(formData.materialCost) })}
                  onKeyDown={handleNumberInputKeyDown}
                  className="w-full p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 transition-all text-stone-800 font-mono text-sm sm:text-base"
                  placeholder="Opsional"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-2">Metode Pembayaran</label>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-stone-50 px-3 py-2 rounded-lg border border-stone-200 flex-1 justify-center sm:flex-none sm:justify-start sm:border-none sm:bg-transparent sm:px-0 sm:py-0">
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="CASH" 
                    checked={formData.paymentMethod === 'CASH'} 
                    onChange={() => setFormData({...formData, paymentMethod: 'CASH'})}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-brand-900 focus:ring-brand-900"
                  />
                  <span className="font-medium text-stone-700 text-xs sm:text-sm">Tunai</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-stone-50 px-3 py-2 rounded-lg border border-stone-200 flex-1 justify-center sm:flex-none sm:justify-start sm:border-none sm:bg-transparent sm:px-0 sm:py-0">
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="TRANSFER" 
                    checked={formData.paymentMethod === 'TRANSFER'} 
                    onChange={() => setFormData({...formData, paymentMethod: 'TRANSFER'})}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-brand-900 focus:ring-brand-900"
                  />
                  <span className="font-medium text-stone-700 text-xs sm:text-sm">Transfer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-stone-50 px-3 py-2 rounded-lg border border-stone-200 flex-1 justify-center sm:flex-none sm:justify-start sm:border-none sm:bg-transparent sm:px-0 sm:py-0">
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="QRIS" 
                    checked={formData.paymentMethod === 'QRIS'} 
                    onChange={() => setFormData({...formData, paymentMethod: 'QRIS'})}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-brand-900 focus:ring-brand-900"
                  />
                  <span className="font-medium text-stone-700 text-xs sm:text-sm">QRIS</span>
                </label>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Foto SOP */}
          <div className="space-y-4 sm:space-y-6">
            <label className="block text-xs sm:text-sm font-bold text-stone-700 mb-2">Foto Barang (Before) *</label>
            
            <div 
              onClick={() => !photoBlob && fileInputRef.current?.click()}
              className={`relative w-full min-h-[200px] md:h-[calc(100%-2rem)] bg-stone-50 border-2 border-dashed ${photoBlob ? 'border-brand-900' : 'border-stone-300'} rounded-2xl overflow-hidden flex flex-col items-center justify-center group hover:border-brand-900 transition-colors cursor-pointer`}
            >
              {photoBlob ? (
                <>
                  <img src={photoPreviewUrl} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoBlob(null);
                      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
                      setPhotoPreviewUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 sm:p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors active:scale-95"
                  >
                    <X size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </>
              ) : (
                <div className="text-center p-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 text-stone-400 group-hover:text-brand-900 transition-colors">
                    <Camera size={32} className="sm:w-9 sm:h-9" />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-stone-700 mb-1">Ketuk untuk Foto</p>
                  <p className="text-xs sm:text-sm text-stone-500">Wajib untuk bukti kondisi awal</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 sm:pt-6 border-t border-stone-200">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[56px] text-base sm:text-lg font-bold bg-brand-900 text-gold-500 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:grayscale"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin sm:w-6 sm:h-6" size={20} />
                Menyimpan...
              </>
            ) : (
              'Simpan Data Reparasi'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
