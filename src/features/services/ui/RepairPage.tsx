import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { RepairService } from '../../../shared/api/db';
import { DIContainer } from '@infrastructure/di/Container';
import { RepairForm } from '../components/RepairForm';
import { useAuthStore } from '../../../shared/store/authStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { Clock, Wrench, CheckCircle, PackageCheck, Plus, Printer, X } from 'lucide-react';
import { BackButton } from '../../../shared/components/BackButton';

const STATUS_COLORS = {
  RECEIVED: 'bg-blue-100 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  DELIVERED: 'bg-stone-100 text-stone-600 border-stone-200',
};

const STATUS_LABELS = {
  RECEIVED: 'Diterima',
  IN_PROGRESS: 'Dikerjakan',
  COMPLETED: 'Selesai',
  DELIVERED: 'Diambil',
};

export function RepairPage() {
  const { addToast } = useToastStore();
  const repairs = useLiveQuery(() => DIContainer.liveQueries.observeRepairs());
  const user = useAuthStore((state) => state.user);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStatusChange = async (id: string, newStatus: RepairService['status']) => {
    if (!user) {
      addToast('Anda harus login untuk mengubah status.', 'error');
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await DIContainer.updateRepairStatusUseCase.execute({
        id,
        newStatus,
        userId: user.name
      });

      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank');
        addToast('Membuka WhatsApp untuk notifikasi pelanggan', 'info');
      }
    } catch (error) {
      const msg = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
      addToast(`Gagal mengubah status: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getNextStatus = (currentStatus: RepairService['status']): RepairService['status'] | null => {
    switch (currentStatus) {
      case 'RECEIVED': return 'IN_PROGRESS';
      case 'IN_PROGRESS': return 'COMPLETED';
      case 'COMPLETED': return 'DELIVERED';
      default: return null;
    }
  };

  const getStatusIcon = (status: RepairService['status']) => {
    switch (status) {
      case 'RECEIVED': return <Clock size={14} className="mr-1" />;
      case 'IN_PROGRESS': return <Wrench size={14} className="mr-1" />;
      case 'COMPLETED': return <CheckCircle size={14} className="mr-1" />;
      case 'DELIVERED': return <PackageCheck size={14} className="mr-1" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      <BackButton />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-brand-900">Reparasi & Sepuh</h1>
          <p className="text-stone-500 mt-1">Kelola layanan perbaikan dan pelapisan perhiasan pelanggan.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 bg-brand-900 hover:bg-brand-800 text-gold-500 px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95"
        >
          <Plus size={20} />
          Tambah Reparasi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {repairs === undefined ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-5 bg-stone-200 rounded-md w-32"></div>
                  <div className="h-3 bg-stone-200 rounded-md w-24"></div>
                </div>
                <div className="h-6 bg-stone-200 rounded-full w-24"></div>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-stone-200 rounded-md w-16"></div>
                  <div className="h-4 bg-stone-200 rounded-md w-20"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-stone-200 rounded-md w-16"></div>
                  <div className="h-4 bg-stone-200 rounded-md w-24"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-stone-200 rounded-md w-16"></div>
                  <div className="h-4 bg-stone-200 rounded-md w-12"></div>
                </div>
                <div className="pt-2 border-t border-stone-200 space-y-2">
                  <div className="h-3 bg-stone-200 rounded-md w-24"></div>
                  <div className="h-4 bg-stone-200 rounded-md w-full"></div>
                  <div className="h-4 bg-stone-200 rounded-md w-2/3"></div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 mt-auto">
                <div className="h-11 bg-stone-200 rounded-xl flex-1"></div>
                <div className="w-11 h-11 bg-stone-200 rounded-xl ml-2 shrink-0"></div>
              </div>
            </div>
          ))
        ) : repairs.length === 0 ? (
          <div className="col-span-full p-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200 shadow-sm">
            <Wrench size={48} className="mx-auto mb-3 text-stone-300" />
            <p>Belum ada data reparasi.</p>
          </div>
        ) : (
          repairs.map((repair) => (
            <div key={repair.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-stone-800 text-lg">{repair.customerName}</h3>
                  <p className="text-xs text-stone-500 mt-1">{repair.phoneNumber || '-'}</p>
                </div>
                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ml-2 ${STATUS_COLORS[repair.status]}`}>
                  {getStatusIcon(repair.status)}
                  {STATUS_LABELS[repair.status]}
                </span>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Layanan</span>
                  <span className="bg-stone-200 text-stone-700 px-2 py-0.5 rounded text-xs font-bold">
                    {repair.serviceType}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tanggal</span>
                  <span className="text-xs font-medium text-stone-600">
                    {new Date(repair.date).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Berat Awal</span>
                  <span className="text-xs font-bold text-stone-700">{repair.initialWeight}g</span>
                </div>
                <div className="pt-2 border-t border-stone-200">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Deskripsi Barang</span>
                  <p className="text-sm text-stone-800 line-clamp-2">
                    {repair.itemDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 mt-auto">
                <div className="flex-1 flex items-center gap-2">
                  {repair.status !== 'DELIVERED' && (
                    <button
                      onClick={() => {
                        const next = getNextStatus(repair.status);
                        if (next) handleStatusChange(repair.id, next);
                      }}
                      disabled={isProcessing}
                      className="flex-1 text-xs font-bold bg-brand-900 hover:bg-brand-800 text-gold-500 py-2.5 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center min-h-[44px]"
                    >
                      Proses ke {STATUS_LABELS[getNextStatus(repair.status)!]}
                    </button>
                  )}
                </div>
                <button
                  onClick={async () => {
                    try {
                      await DIContainer.printService.print(repair);
                      addToast('Struk berhasil dicetak', 'success');
                    } catch (error) {
                      console.error('Gagal mencetak struk:', error);
                      addToast('Gagal mencetak struk', 'error');
                    }
                  }}
                  className="w-11 h-11 flex items-center justify-center text-stone-500 hover:text-brand-900 hover:bg-stone-100 rounded-xl transition-colors active:scale-95 bg-stone-50 border border-stone-200 ml-2 shrink-0"
                  title="Cetak Struk"
                >
                  <Printer size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form Tambah Reparasi */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-4xl my-8 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsFormOpen(false)} 
              className="absolute -top-12 right-0 md:-right-12 p-2 text-white/70 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>
            <RepairForm />
          </div>
        </div>
      )}
      <span className="text-[9px] text-stone-300 font-mono absolute bottom-1 right-2">[W-R-01]</span>
    </div>
  );
}
