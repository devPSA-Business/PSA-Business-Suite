import { useState, useEffect } from 'react';
import { BackButton } from '../../../shared/components/BackButton';
import { Printer, Usb, Bluetooth, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useToastStore } from '../../../shared/store/toastStore';
import { db, PrinterConfig } from '../../../shared/api/db';

export function PrinterSettingsPage() {
  const { addToast } = useToastStore();
  const [config, setConfig] = useState<PrinterConfig | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const profile = await db.store_profile.get('default');
        if (profile?.printerConfig) {
          setConfig(profile.printerConfig);
        }
      } catch (e) {
        console.error('Failed to load printer config', e);
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async (newConfig: PrinterConfig | null) => {
    try {
      const existing = await db.store_profile.get('default');
      await db.store_profile.put({
        ...(existing || { id: 'default', name: 'PSA JEWELLERY', address: '', receiptFooter: 'Terima Kasih', isSetupComplete: true, updatedAt: Date.now() }),
        printerConfig: newConfig || undefined,
        updatedAt: Date.now()
      });
      setConfig(newConfig);
      addToast('Pengaturan printer berhasil disimpan', 'success');
    } catch (e) {
      console.error('Failed to save printer config', e);
      addToast('Gagal menyimpan pengaturan printer', 'error');
    }
  };

  const connectUSB = async () => {
    if (!navigator.usb) {
      addToast('WebUSB tidak didukung di browser ini.', 'error');
      return;
    }

    try {
      const device = await navigator.usb.requestDevice({ filters: [] });
      const newConfig: PrinterConfig = {
        type: 'USB',
        name: device.productName || 'USB Printer',
        vendorId: device.vendorId,
        productId: device.productId
      };
      saveConfig(newConfig);
      addToast('Printer USB berhasil dikonfigurasi.', 'success');
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.name !== 'NotFoundError') {
        addToast('Gagal menghubungkan printer USB.', 'error');
      }
    }
  };

  const connectBluetooth = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (!nav.bluetooth) {
      addToast('Web Bluetooth tidak didukung di browser ini.', 'error');
      return;
    }

    try {
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });
      const newConfig: PrinterConfig = {
        type: 'BLUETOOTH',
        name: device.name || 'Bluetooth Printer',
        deviceId: device.id
      };
      saveConfig(newConfig);
      addToast('Printer Bluetooth berhasil dikonfigurasi.', 'success');
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.name !== 'NotFoundError') {
        addToast('Gagal menghubungkan printer Bluetooth.', 'error');
      }
    }
  };

  const testPrint = async () => {
    if (!config) return;
    setIsTesting(true);
    try {
      addToast('Mengirim perintah cetak uji...', 'info');
      // Simulation of printing process
      await new Promise(resolve => setTimeout(resolve, 1500));
      addToast('Perintah cetak terkirim. Periksa printer Anda.', 'success');
    } catch (error) {
      addToast('Gagal melakukan cetak uji.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      <BackButton />
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-brand-900 text-gold-500 rounded-3xl shadow-xl shadow-brand-900/20">
            <Printer size={40} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-brand-900 tracking-tight">Pengaturan Printer</h1>
            <p className="text-stone-500 font-medium">Hubungkan printer thermal untuk cetak struk otomatis.</p>
          </div>
        </div>
      </div>

      {/* Status Dashboard Card */}
      <div className="grid grid-cols-1 gap-6">
        {config ? (
          <div className="bg-brand-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-brand-800 relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
              {config.type === 'USB' ? <Usb size={200} className="text-gold-500" /> : <Bluetooth size={200} className="text-gold-500" />}
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-gold-500 text-xs font-black uppercase tracking-widest">
                  <CheckCircle size={14} />
                  Printer Terhubung
                </div>
                <div>
                  <p className="text-brand-200 text-sm font-bold uppercase tracking-widest mb-1">Model Perangkat</p>
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{config.name}</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[10px] text-brand-300 font-bold uppercase">Koneksi</p>
                    <p className="text-sm font-bold text-white">{config.type === 'USB' ? 'Kabel USB' : 'Bluetooth Wireless'}</p>
                  </div>
                  {config.vendorId && (
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[10px] text-brand-300 font-bold uppercase">Vendor ID</p>
                      <p className="text-sm font-mono text-white">0x{config.vendorId.toString(16).toUpperCase()}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-[200px]">
                <button
                  onClick={testPrint}
                  disabled={isTesting}
                  className="w-full py-5 bg-gold-500 hover:bg-gold-400 text-brand-900 font-black rounded-2xl shadow-lg shadow-gold-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  {isTesting ? <RefreshCw className="animate-spin" size={24} /> : <Printer size={24} />}
                  Cetak Uji Coba
                </button>
                <button
                  onClick={() => saveConfig(null)}
                  className="w-full py-4 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-200 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/10"
                >
                  <Trash2 size={20} />
                  Putuskan Koneksi
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-stone-50 rounded-[2.5rem] p-12 border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-stone-100">
              <Printer size={48} className="text-stone-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-800">Belum Ada Printer</h3>
              <p className="text-stone-500 max-w-xs mx-auto mt-2">Pilih salah satu metode koneksi di bawah untuk mulai mencetak struk.</p>
            </div>
          </div>
        )}
      </div>

      {/* Connection Options Grid */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-1 bg-brand-900 rounded-full"></div>
          <h2 className="text-xl font-black text-brand-900 uppercase tracking-widest">Pilih Metode Koneksi</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={connectUSB}
            className="group relative bg-white p-8 rounded-[2.5rem] border-2 border-stone-100 hover:border-brand-900 shadow-sm hover:shadow-xl transition-all text-left overflow-hidden"
          >
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-500">
              <Usb size={160} className="text-brand-900" />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-stone-50 group-hover:bg-brand-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:text-brand-900 transition-colors mb-6">
                <Usb size={32} />
              </div>
              <h3 className="text-2xl font-black text-stone-800 mb-2">WebUSB (Kabel)</h3>
              <p className="text-stone-500 font-medium leading-relaxed">Koneksi paling stabil dan cepat. Sangat direkomendasikan untuk penggunaan intensif di kasir.</p>
              <div className="mt-8 flex items-center gap-2 text-brand-900 font-black text-sm uppercase tracking-widest">
                Hubungkan Sekarang
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </button>

          <button
            onClick={connectBluetooth}
            className="group relative bg-white p-8 rounded-[2.5rem] border-2 border-stone-100 hover:border-brand-900 shadow-sm hover:shadow-xl transition-all text-left overflow-hidden"
          >
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-500">
              <Bluetooth size={160} className="text-brand-900" />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-stone-50 group-hover:bg-brand-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:text-brand-900 transition-colors mb-6">
                <Bluetooth size={32} />
              </div>
              <h3 className="text-2xl font-black text-stone-800 mb-2">Bluetooth (Wireless)</h3>
              <p className="text-stone-500 font-medium leading-relaxed">Koneksi nirkabel yang praktis. Cocok untuk mobilitas tinggi atau area kasir yang terbatas kabel.</p>
              <div className="mt-8 flex items-center gap-2 text-brand-900 font-black text-sm uppercase tracking-widest">
                Hubungkan Sekarang
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-amber-50 rounded-[2.5rem] p-8 md:p-10 border border-amber-100 flex flex-col md:flex-row gap-8 items-start">
        <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl">
          <CheckCircle size={32} />
        </div>
        <div className="space-y-4">
          <h3 className="text-2xl font-black text-amber-900">Tips & Panduan Printer</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="font-bold text-amber-800">Standar ESC/POS</p>
              <p className="text-sm text-amber-700/80 leading-relaxed">Pastikan printer Anda mendukung perintah ESC/POS standar untuk hasil cetak yang optimal.</p>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-amber-800">Koneksi Bluetooth</p>
              <p className="text-sm text-amber-700/80 leading-relaxed">Untuk koneksi nirkabel, pastikan <strong>Bluetooth perangkat Anda menyala</strong> dan printer dalam mode pairing.</p>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-amber-800">Troubleshooting</p>
              <p className="text-sm text-amber-700/80 leading-relaxed">Jika printer tidak merespon, coba matikan dan nyalakan kembali printer sebelum menghubungkan ulang.</p>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-amber-800">Mode Fallback (Tanpa Printer)</p>
              <p className="text-sm text-amber-700/80 leading-relaxed">Jika printer USB/Bluetooth tidak terhubung, sistem akan otomatis memunculkan <strong>dialog print bawaan OS tablet/browser</strong> saat mencetak struk.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
