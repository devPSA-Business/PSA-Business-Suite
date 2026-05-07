import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { DIContainer } from '@infrastructure/di/Container';
import { useUIStore } from './shared/store/useUIStore';

// Request persistent storage to prevent browser eviction
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(granted => {
    useUIStore.getState().setStoragePersisted(granted);
    if (granted) {
      console.log("Storage will not be cleared except by explicit user action");
    } else {
      console.warn("Storage may be cleared by the UA under storage pressure.");
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
          console.error('SW update check failed', err);
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
