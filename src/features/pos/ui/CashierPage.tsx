import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ShoppingCart, Lock, History, Calculator, Wrench, TrendingUp, Wallet, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import { ProductList } from './ProductList';
import { useCartStore } from '../store/useCartStore';
import { useCheckoutStore } from '../store/useCheckoutStore';
import { CartModal } from '../components/CartModal';
import { TransactionHistoryModal } from '../components/TransactionHistoryModal';
import { CartDisplay } from '../components/CartDisplay';
import { PettyCashModal } from '../components/PettyCashModal';
import { CustomServiceForm } from '../components/CustomServiceForm';
import { GoldCashierForm } from '../components/GoldCashierForm';
import { QuickCatalogDrawer } from '../components/QuickCatalogDrawer';
import { triggerHaptic } from '../../../lib/haptic';

/**
 * @ai_context Halaman utama Kasir/POS untuk transaksi ritel dan emas.
 */
export function CashierPage() {
  const [activeTab, setActiveTab] = useState<'ritel' | 'jasa' | 'emas'>('ritel');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPettyCashOpen, setIsPettyCashOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [showPrinterReconnect, setShowPrinterReconnect] = useState(false);
  
  const navigate = useNavigate();
  const { cartItems, totalPrice, totalItems, removeItem } = useCartStore();
  const { openCheckoutModal } = useCheckoutStore();

  useEffect(() => {
    const checkPrinterConnection = async () => {
      // Get printer config from DB instead of localStorage
      const profile = await import('../../../shared/api/db').then(m => m.db.store_profile.get('default'));
      const savedConfig = profile?.printerConfig;
      if (savedConfig && 'usb' in navigator) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const devices = await (navigator as any).usb.getDevices();
          if (devices.length === 0) {
            setShowPrinterReconnect(true);
          }
        } catch (error) {
          console.error("Gagal memeriksa koneksi printer USB", error);
        }
      }
    };
    checkPrinterConnection();
  }, []);

  const handleReconnectPrinter = async () => {
    try {
      if ('usb' in navigator) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const device = await (navigator as any).usb.requestDevice({ filters: [] });
        if (device) {
          setShowPrinterReconnect(false);
        }
      }
    } catch (error) {
      console.error("Gagal meminta akses printer USB", error);
    }
  };

  const tabs = [
    { id: 'ritel', label: 'Ritel & Aksesoris', icon: ShoppingCart },
    { id: 'jasa', label: 'Reparasi & Jasa', icon: Wrench },
    { id: 'emas', label: 'Buyback Emas', icon: TrendingUp },
  ] as const;

  return (
    <div 
      data-component-id="CashierPage" 
      data-error-domain="pos"
      className="h-screen w-full flex flex-col bg-stone-50 overflow-hidden"
    >
      {/* Frontline Header / Hub */}
      <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-900 rounded-xl flex items-center justify-center text-gold-500 font-bold text-lg shadow-md">
            P
          </div>
          <div>
            <h1 className="font-bold text-brand-900 text-lg">Kasir Terpadu</h1>
            <p className="text-xs text-stone-500 hidden sm:block">Pusat Layanan Frontline</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setIsCatalogOpen(true)} className="flex items-center gap-2 px-3 py-2 text-stone-600 hover:text-brand-900 hover:bg-stone-100 rounded-xl font-medium transition-colors">
            <Calculator size={18} />
            <span className="hidden sm:inline">Katalog</span>
          </button>
          
          <button onClick={() => setIsPettyCashOpen(true)} className="flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition-colors">
            <Wallet size={18} />
            <span className="hidden sm:inline">Kas Keluar</span>
          </button>

          <div className="w-px h-8 bg-stone-200 mx-1 hidden sm:block" />
          
          <button onClick={() => setIsHistoryModalOpen(true)} className="p-2.5 text-stone-500 hover:text-brand-900 hover:bg-stone-100 rounded-xl transition-colors">
            <History size={20} />
          </button>
          
          <button onClick={() => navigate({ to: '/workspace' })} className="ml-1 px-4 py-2 bg-stone-900 text-white hover:bg-stone-800 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-md">
            <Lock size={16} />
            <span className="hidden sm:inline">Jeda Shift</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Side: Operations Area */}
        <div className="flex-1 flex flex-col w-full lg:w-2/3 overflow-hidden bg-stone-50">
          {/* Smart Tabs Nav */}
          <nav className="flex px-4 sm:px-6 pt-4 bg-white border-b border-stone-200 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 pb-[-1px]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-t-2xl transition-all border border-b-0 whitespace-nowrap ${
                      isActive 
                        ? 'bg-stone-50 border-stone-200 text-brand-900 z-10' 
                        : 'bg-white border-transparent text-stone-400 hover:bg-stone-50 hover:text-stone-600'
                    }`}
                    style={{ marginBottom: isActive ? '-1px' : '0' }}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-28 lg:pb-6 relative z-0" style={{ touchAction: 'pan-y' }}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 50) {
                  const currentIndex = tabs.findIndex(t => t.id === activeTab);
                  if (info.offset.x < 0 && currentIndex < tabs.length - 1) { // Swipe Left
                    setActiveTab(tabs[currentIndex + 1].id);
                    triggerHaptic('light');
                  } else if (info.offset.x > 0 && currentIndex > 0) { // Swipe Right
                    setActiveTab(tabs[currentIndex - 1].id);
                    triggerHaptic('light');
                  }
                }
              }}
              className="w-full"
            >
              {activeTab === 'ritel' && <ProductList />}
              {activeTab === 'jasa' && <CustomServiceForm />}
              {activeTab === 'emas' && <GoldCashierForm />}
            </motion.div>
          </main>
        </div>

        {/* Right Side: CartDisplay (Hidden on mobile) */}
        <div className="hidden lg:flex w-1/3 border-l border-stone-200 bg-white flex-col shadow-[-4px_0_24px_-16px_rgba(0,0,0,0.1)] z-10">
          <CartDisplay />
        </div>
      </div>

      {/* Floating Action Button (FAB) - Mobile Cart */}
      {totalItems > 0 && (
        <button
          onClick={() => { setIsCartModalOpen(true); }}
          className="lg:hidden fixed bottom-6 right-6 px-6 h-16 bg-brand-900 text-gold-500 rounded-full shadow-2xl flex items-center gap-3 animate-in zoom-in-90 duration-300 active:scale-95 transition-all z-40"
        >
          <ShoppingCart size={24} />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-medium text-brand-100">{totalItems} Item</span>
            <span className="font-bold">Rp {totalPrice.toLocaleString()}</span>
          </div>
        </button>
      )}

      {/* Modals & Drawers */}
      <div className="lg:hidden">
        <CartModal 
          isOpen={isCartModalOpen} 
          onClose={() => setIsCartModalOpen(false)} 
          items={cartItems} 
          total={totalPrice} 
          onRemove={removeItem}
          onCheckout={() => { setIsCartModalOpen(false); openCheckoutModal(); }}
        />
      </div>
      
      <TransactionHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} />
      <PettyCashModal isOpen={isPettyCashOpen} onClose={() => setIsPettyCashOpen(false)} />
      <QuickCatalogDrawer isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />

      {/* Auto-Reconnect Printer Modal */}
      {showPrinterReconnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Printer size={32} />
            </div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2">Printer Terputus</h2>
            <p className="text-stone-500 mb-8">
              Sistem mendeteksi bahwa printer thermal Anda sebelumnya terhubung namun kini tidak terdeteksi oleh browser. Silakan pastikan kabel printer terpasang lalu klik tombol di bawah.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setShowPrinterReconnect(false)}
                className="px-5 py-3 text-stone-500 hover:bg-stone-100 rounded-xl font-bold transition-colors"
               >
                 Abaikan
              </button>
              <button 
                onClick={handleReconnectPrinter}
                className="px-6 py-3 bg-brand-900 text-gold-500 rounded-xl font-bold hover:bg-brand-800 shadow-md active:scale-95 transition-all flex items-center gap-2"
              >
                <Printer size={18} />
                Sambungkan Ulang Printer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
