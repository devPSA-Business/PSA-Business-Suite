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

const validateProductionSecrets = () => {
  const pepper = import.meta.env.VITE_CRYPTO_PEPPER;
  const WEAK_PEPPER_HINTS = ['change-me', 'secret-pepper', 'GANTI_DENGAN', 'GENERATE_DULU', ''];

  if (!pepper || pepper.length < 32 || WEAK_PEPPER_HINTS.some(h => pepper.includes(h))) {
    throw new Error(
      '[PSA-SECURITY] VITE_CRYPTO_PEPPER tidak valid, kosong, atau terlalu lemah.\n' +
      'Generate dengan: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
};

// Hanya validasi di production — dev boleh pakai nilai dummy
if (import.meta.env.PROD) {
  validateProductionSecrets();
}

registerSW({ immediate: true });

DIContainer.syncService.startAutoSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
