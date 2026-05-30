import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { DIContainer } from '@infrastructure/di/Container';
import { useUIStore } from './shared/store/useUIStore';
import { initGlobalErrorHandlers, logger } from './lib/logger';

// BACKLOG-03: Inisialisasi global error handlers — WAJIB dipanggil pertama
// Menangkap unhandledrejection dan uncaughtError yang sebelumnya hilang secara senyap.
initGlobalErrorHandlers();

// Request persistent storage to prevent browser eviction
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(granted => {
    useUIStore.getState().setStoragePersisted(granted);
    if (granted) {
      logger.info("[main] Persistent storage granted — data tidak akan dihapus browser");
    } else {
      logger.warn("[main] Persistent storage NOT granted — data mungkin dihapus browser saat storage pressure");
    }
  });
}

// G-04 FIX: Force SW update dari network, bypass HTTP cache
registerSW({ 
  immediate: true,
  onRegisteredSW(swUrl, r) {
    if (r) {
      // Cek update setiap 1 jam saat online, bypass cache
      setInterval(async () => {
        if (!(!r.installing && navigator.onLine)) return;
        try {
          const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          });
          if (resp?.status === 200) await r.update();
        } catch (err) {
          logger.error('[main] SW update check failed', { error: err });
        }
      }, 60 * 60 * 1000);
    }
  }
});

DIContainer.syncService.startAutoSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
