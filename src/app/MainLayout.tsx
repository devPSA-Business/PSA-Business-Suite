import React, { useState, useEffect } from 'react';
import { Outlet, useRouterState, useNavigate } from '@tanstack/react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '../infrastructure/di/Container';
import { WifiOff, RefreshCw, CloudDrizzle, DownloadCloud, Lock, Menu, MoreVertical, AlertTriangle, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ToastContainer } from '../shared/components/Toast';
import { useToastStore } from '../shared/store/toastStore';
import { UserRole } from '../domain/models/User';
import { useAuthStore } from '../shared/store/authStore';
import { useUIStore } from '../shared/store/useUIStore';
import { CollapsibleBottomBar } from '../shared/components/navigation/CollapsibleBottomBar';
import { GlobalSidebar } from '../shared/components/navigation/GlobalSidebar';
import { ContextualBottomSheet } from '../shared/components/navigation/ContextualBottomSheet';

import { useSessionTimeout } from '../shared/hooks/useSessionTimeout';

export function MainLayout() {
  useSessionTimeout();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const routerState = useRouterState();
  const isCashier = routerState.location.pathname === '/cashier';
  const navigate = useNavigate();
  const { setSidebarOpen, isBottomBarOpen, isStoragePersisted } = useUIStore();
  const { user } = useAuthStore();
  const isCashierRole = user?.role === UserRole.CASHIER;
  const isCashierPage = routerState.location.pathname === '/cashier';
  const isAuthRoute = ['/login', '/onboarding', '/locked'].includes(routerState.location.pathname);
  const [isStorageBannerDismissed, setIsStorageBannerDismissed] = useState(
    sessionStorage.getItem('psa_dismissed_storage_banner') === 'true'
  );

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
  const [showIOSInstallBanner, setShowIOSInstallBanner] = useState(
    isIOS && !isInStandaloneMode && sessionStorage.getItem('psa_dismissed_ios_banner') !== 'true'
  );

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(_r) {
      // SW Registered
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      useToastStore.getState().addToast('Koneksi terhubung. Sinkronisasi latar belakang aktif.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      useToastStore.getState().addToast('Mode Offline. Data Anda tetap tersimpan aman di perangkat.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const pendingSyncs = useLiveQuery(
    () => DIContainer.liveQueries.observePendingSyncCount(),
    []
  ) ?? 0;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSyncs > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingSyncs]);

  useEffect(() => {
    const handleAuthError = (event: Event) => {
      const customEvent = event as CustomEvent;
      const message = customEvent.detail?.message || 'Sesi Habis, Silakan Login Ulang';
      useToastStore.getState().addToast(message, 'error');
      
      // Mengunci paksa dan logout (Mencegah Orphaned Event Bug)
      const { logout } = useAuthStore.getState();
      logout();
      navigate({ to: '/' }); 
    };

    window.addEventListener('psa:auth-error', handleAuthError);
    return () => window.removeEventListener('psa:auth-error', handleAuthError);
  }, [navigate]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUSBDisconnect = (_event: any) => {
      useToastStore.getState().addToast('Hardware terputus! Periksa kabel printer/timbangan.', 'error');
    };

    navigator.usb?.addEventListener('disconnect', handleUSBDisconnect);

    return () => {
      navigator.usb?.removeEventListener('disconnect', handleUSBDisconnect);
    };
  }, []);

  const getHeaderTitle = () => {
    const path = routerState.location.pathname;
    if (path === '/') return 'PSA Jewellery';
    if (path.startsWith('/workspace')) return 'PSA Ruang Kerja';
    if (path.startsWith('/office')) return 'PSA Kantor';
    if (path.startsWith('/settings')) return 'Pengaturan Sistem';
    return 'PSA Jewellery';
  };

  return (
      <div className="flex flex-col h-[100dvh] w-full bg-stone-50 text-stone-900 font-sans relative overflow-x-hidden">
        <ToastContainer />
        {/* PROACTIVE PWA UPDATE BLOCKER */}
      {needRefresh && (
        <div className="fixed inset-0 z-[100] bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-md w-full text-center shadow-2xl border-4 border-brand-900">
            <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <DownloadCloud size={40} className="text-brand-900 animate-bounce" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-brand-900 mb-3">Pembaruan Sistem Wajib</h2>
            <p className="text-stone-600 mb-8 leading-relaxed">
              Versi terbaru aplikasi dengan peningkatan keamanan dan fitur baru telah tersedia. Anda <strong>wajib</strong> memperbarui sekarang untuk melanjutkan operasional.
            </p>
            <button 
              onClick={() => updateServiceWorker(true)} 
              className="w-full py-4 bg-brand-900 hover:bg-brand-800 text-gold-500 font-black rounded-2xl text-lg shadow-lg shadow-brand-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Muat Ulang & Perbarui
            </button>
          </div>
        </div>
      )}
      <GlobalSidebar />
      <ContextualBottomSheet />

      {/* Global Offline Banner */}
      {!isOnline && (
        <div className="bg-stone-800 text-stone-100 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium z-50 shadow-md">
          <WifiOff size={16} className="text-amber-400" />
          <span>Mode Offline — Data transaksi aman tersimpan di perangkat lokal.</span>
        </div>
      )}
      
        {/* Dynamic Header */}
        {!isCashierPage && !isAuthRoute && (
          <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 sm:px-6 shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                aria-label="Menu"
              >
                <Menu size={24} />
              </button>
              <div className="w-8 h-8 bg-brand-900 rounded-lg flex items-center justify-center text-gold-500 font-serif font-bold text-lg">
                P
              </div>
              <h1 className="font-serif font-bold text-lg sm:text-xl text-brand-900 truncate">
                {getHeaderTitle()}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {!isCashierRole && (
                <button 
                  onClick={() => navigate({ to: '/handover' })}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors"
                  title="Kunci Darurat / Serah Terima"
                >
                  <Lock size={20} />
                </button>
              )}
              
              {needRefresh && (
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="hidden sm:flex min-w-[44px] min-h-[44px] bg-brand-900 text-gold-500 border border-brand-800 px-3 py-1.5 rounded-lg justify-center items-center gap-2 text-xs sm:text-sm font-bold shadow-md hover:bg-brand-800 transition-all active:scale-95 animate-pulse"
                >
                  <DownloadCloud size={16} />
                  <span>Update Tersedia!</span>
                </button>
              )}

              {/* Sync Status Indicator */}
              {!isOnline ? (
                <div className="bg-stone-100 text-stone-500 border border-stone-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-colors">
                  <WifiOff size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Mode Offline</span>
                </div>
              ) : pendingSyncs > 0 ? (
                <div className="bg-amber-50 text-amber-600 border border-amber-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold">
                  <RefreshCw size={14} className="animate-spin sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{pendingSyncs} Sync</span>
                </div>
              ) : (
                <div className="bg-green-50 text-green-600 border border-green-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold">
                  <CloudDrizzle size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Sync</span>
                </div>
              )}
              
              {!isCashierRole && (
                <button 
                  onClick={() => navigate({ to: '/settings' })}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 -mr-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                  aria-label="Pengaturan"
                >
                  <MoreVertical size={24} />
                </button>
              )}
            </div>
          </header>
        )}

      {/* iOS Safari Install Banner */}
      {showIOSInstallBanner && (
        <div className="bg-brand-50 border-b border-brand-200 px-4 py-3 flex items-start sm:items-center justify-between gap-3 z-10 shrink-0">
          <div className="flex items-start sm:items-center gap-3">
            <DownloadCloud className="text-brand-600 shrink-0 mt-0.5 sm:mt-0" size={20} />
            <p className="text-sm font-medium text-brand-900">
              Gunakan aplikasi secara optimal: Tap bagikan (ikon Share) di Safari, lalu pilih <strong>Add to Home Screen</strong>.
            </p>
          </div>
          <button 
            onClick={() => {
              sessionStorage.setItem('psa_dismissed_ios_banner', 'true');
              setShowIOSInstallBanner(false);
            }} 
            className="text-brand-600 hover:text-brand-900 bg-brand-200/50 hover:bg-brand-300 p-1.5 rounded-lg transition-colors shrink-0"
            title="Tutup panduan"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Storage Persistence Warning Banner */}
      {!isAuthRoute && isStoragePersisted === false && !isStorageBannerDismissed && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-start sm:items-center justify-between gap-3 z-10 shrink-0">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" size={20} />
            <p className="text-sm font-medium text-amber-800">
              Peringatan: Penyimpanan browser tidak permanen. Data offline berisiko terhapus oleh sistem. Harap rutin melakukan sinkronisasi.
            </p>
          </div>
          <button 
            onClick={() => {
              sessionStorage.setItem('psa_dismissed_storage_banner', 'true');
              setIsStorageBannerDismissed(true);
            }} 
            className="text-amber-600 hover:text-amber-900 bg-amber-200/50 hover:bg-amber-300 p-1.5 rounded-lg transition-colors shrink-0"
            title="Tutup peringatan untuk sesi ini"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto relative w-full ${isAuthRoute ? 'p-0' : 'p-4 sm:p-6'} ${!isCashier && !isAuthRoute && isBottomBarOpen ? 'pb-28' : !isAuthRoute ? 'pb-16' : ''}`}>
        <Outlet />
      </main>

      {!isCashier && !isAuthRoute && <CollapsibleBottomBar />}
      </div>
  );
}
