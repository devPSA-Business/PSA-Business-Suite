import { logger } from '@lib/logger';
import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToastStore } from '../../../shared/store/toastStore';
import { DIContainer } from '@infrastructure/di/Container';
import { useAuthStore } from '../../../shared/store/authStore';
import { StockCategory } from '../../../domain/models/StockCategory';
import { UserRole } from '../../../domain/models/User';
import { BulkReceiveStockItemDTO } from '../usecases/BulkReceiveStockUseCase';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const { addToast } = useToastStore();
  const user = useAuthStore((state) => state.user);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BulkReceiveStockItemDTO[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/json' && !selectedFile.name.endsWith('.json')) {
        addToast('Hanya mendukung file JSON untuk saat ini.', 'error');
        return;
      }
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    setIsValidating(true);
    setErrors([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (!Array.isArray(data)) {
          throw new Error('Format data harus berupa array.');
        }

        const validatedData: BulkReceiveStockItemDTO[] = [];
        const validationErrors: string[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.forEach((item: any, index: number) => {
          if (!item.barcode || !item.name || !item.category || item.quantity === undefined || item.cost === undefined || item.price === undefined) {
            validationErrors.push(`Baris ${index + 1}: Data tidak lengkap.`);
          } else if (!Object.values(StockCategory).includes(item.category)) {
            validationErrors.push(`Baris ${index + 1}: Kategori "${item.category}" tidak valid.`);
          } else {
            validatedData.push({
              barcode: String(item.barcode),
              name: String(item.name),
              category: item.category as StockCategory,
              quantity: Number(item.quantity),
              cost: Number(item.cost),
              price: Number(item.price)
            });
          }
        });

        setPreviewData(validatedData);
        setErrors(validationErrors);
      } catch (err) {
        setErrors([`Gagal membaca file: ${err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)}`]);
      } finally {
        setIsValidating(false);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    
    setIsProcessing(true);
    try {
      if (!user) throw new Error('User not authenticated');
      
      await DIContainer.bulkReceiveStockUseCase.execute({
        items: previewData,
        userId: user.name,
        userRole: user.role
      });
      addToast(`Berhasil mengimpor ${previewData.length} item.`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      addToast('Gagal mengimpor data.', 'error');
      logger.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-8 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-900 text-gold-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-brand-900">Impor Massal</h2>
              <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">Unggah file JSON inventaris</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-all">
            <X size={28} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed border-stone-100 rounded-[2rem] p-12 text-center hover:border-brand-900/20 hover:bg-stone-50 transition-all cursor-pointer group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
              />
              <div className="w-20 h-20 bg-stone-50 text-stone-300 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <FileText size={40} />
              </div>
              <p className="text-xl font-bold text-stone-800">Klik untuk pilih file</p>
              <p className="text-stone-500 mt-2">Format yang didukung: .json</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="flex items-center gap-3">
                  <FileText className="text-brand-900" size={24} />
                  <div>
                    <p className="font-bold text-stone-800">{file.name}</p>
                    <p className="text-xs text-stone-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); setPreviewData([]); setErrors([]); }}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Ganti File
                </button>
              </div>

              {isValidating ? (
                <div className="flex items-center justify-center py-12 gap-3 text-stone-500">
                  <Loader2 className="animate-spin" />
                  <span className="font-bold">Memvalidasi data...</span>
                </div>
              ) : (
                <>
                  {errors.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-red-600 font-bold mb-2">
                        <AlertCircle size={18} />
                        <span>Ditemukan {errors.length} Kesalahan</span>
                      </div>
                      <ul className="text-xs text-red-500 space-y-1 list-disc pl-5 max-h-32 overflow-y-auto">
                        {errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}

                  {previewData.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-green-600 font-bold">
                        <CheckCircle2 size={18} />
                        <span>{previewData.length} Item Siap Diimpor</span>
                      </div>
                      <div className="border border-stone-100 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-stone-50 text-stone-500 font-bold uppercase tracking-wider border-b border-stone-100">
                            <tr>
                              <th className="p-3">Barcode</th>
                              <th className="p-3">Nama</th>
                              <th className="p-3 text-right">Qty</th>
                              <th className="p-3 text-right">Harga</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-50">
                            {previewData.slice(0, 5).map((item, i) => (
                              <tr key={i}>
                                <td className="p-3 font-mono">{item.barcode}</td>
                                <td className="p-3 font-bold text-stone-800">{item.name}</td>
                                <td className="p-3 text-right">{item.quantity}</td>
                                <td className="p-3 text-right font-bold text-brand-900">Rp {item.price.toLocaleString()}</td>
                              </tr>
                            ))}
                            {previewData.length > 5 && (
                              <tr>
                                <td colSpan={4} className="p-3 text-center text-stone-400 italic">
                                  ... dan {previewData.length - 5} item lainnya
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-8 border-t border-stone-100 bg-stone-50/50 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 rounded-2xl font-bold transition-all active:scale-95"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={isProcessing || previewData.length === 0 || errors.length > 0}
            className="flex-1 px-6 py-4 text-gold-500 bg-brand-900 hover:bg-brand-800 disabled:bg-stone-200 disabled:text-stone-400 rounded-2xl font-black shadow-lg shadow-brand-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Mengimpor...
              </>
            ) : (
              'Konfirmasi Impor'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
