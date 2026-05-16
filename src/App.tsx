/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RouterProvider } from '@tanstack/react-router';
import { router } from './app/router';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { SystemHealthBot } from './shared/components/SystemHealthBot';
import { useEffect, useState, useRef } from 'react';
import { cryptoKeyStore } from './lib/cryptoKeyStore';
import { logger } from './lib/logger';
import { Loader2, ShieldAlert } from 'lucide-react';
import { db } from './shared/api/db';
import { syncTimeOffset } from './shared/utils/timeUtils';
import { ShiftTotalsReconciler } from './infrastructure/migrations/ShiftTotalsReconciler';
import { doc, getDoc } from 'firebase/firestore';
import { firestoreDb, auth } from './shared/api/firebase';
import { useSecurityStore } from './shared/store/useSecurityStore';
import { useAuthStore } from './shared/store/authStore';
import { backupManager } from './shared/utils/backupManager';
import { useEventListener } from './shared/hooks/useEventListener';

export default function App() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [isKilled, setIsKilled] = useState(false);
  const isSystemLocked = useSecurityStore((state) => state.isSystemLocked);
  const isFirebaseInitialized = useAuthStore((state) => state.isFirebaseInitialized);
  
  const healthWorkerRef = useRef<Worker | null>(null);

  // --- F14: Managed Event Listeners ---
  useEventListener(window, 'REQUEST_HEALTH_CHECK', () => {
    healthWorkerRef.current?.postMessage({ type: 'RUN_HEALTH_CHECK' });
  });

  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      logger.info('[App] Aplikasi masuk background, menjalankan auto-backup lokal...');
      backupManager.autoBackupLocal().catch(err => {
        logger.error('[App] Auto-backup visibilitychange gagal:', { error: err instanceof Error ? err.message : String(err) });
      });
    }
  });

  const isProd = import.meta.env.PROD;
  useEventListener(window, 'contextmenu', (e) => e.preventDefault(), isProd);
  useEventListener(window, 'keydown', (e) => {
    const ke = e as KeyboardEvent;
    // Block F12
    if (ke.key === 'F12') ke.preventDefault();
    // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (ke.ctrlKey && ke.shiftKey && (ke.key === 'I' || ke.key === 'J' || ke.key === 'C')) ke.preventDefault();
    // Block Ctrl+U (View Source)
    if (ke.ctrlKey && ke.key === 'u') ke.preventDefault();
  }, isProd);

  // --- Task 1.3: Early Firebase Configuration Validation ---
  useEffect(() => {
    Promise.all([
      import('./shared/api/firebase'),
      import('./shared/constants/errorMessages')
    ]).then(([{ isConfigValid }, { ERROR_MESSAGES }]) => {
      if (!isConfigValid) {
        logger.warn(`[App] ${ERROR_MESSAGES.FIREBASE_CONFIG_MISSING || 'Cloud configuration missing. Offline mode active.'}`);
      } else {
        logger.info('[App] Firebase configuration detected. Cloud features are enabled.');
      }
    }).catch(err => {
      logger.error('[App] Failed to load critical assets (firebase/errorMessages):', { 
        error: err instanceof Error ? err.message : String(err) 
      });
      // Fallback: Aplikasi tetap bisa jalan tapi dengan log warning
    });
  }, []);

  // --- Task 3.1: Managed HealthGuardian with Timeout Wrapper ---
  useEffect(() => {
    const TIMEOUT_MS = 10000; // 10 detik timeout
    let timeoutId: NodeJS.Timeout | null = null;

    const startWorker = () => {
      if (healthWorkerRef.current) {
        healthWorkerRef.current.terminate();
      }

      healthWorkerRef.current = new Worker(new URL('./workers/healthGuardian.worker.ts', import.meta.url), {
        type: 'module'
      });

      healthWorkerRef.current.onmessage = (e) => {
        if (e.data.type === 'HEALTH_REPORT') {
          if (timeoutId) clearTimeout(timeoutId);
          
          const report = e.data.data;
          import('./shared/store/useHealthStore').then((module) => {
            module.useHealthStore.getState().setReport(report);
          });

          if (report.status === 'CRITICAL') {
            const issues = report.issues.filter((i: { severity: string }) => i.severity === 'CRITICAL');
            logger.error(`[HealthGuardian] CRITICAL ISSUES DETECTED:`, issues);
          }
        } else if (e.data.type === 'TRIGGER_FORCE_SYNC') {
          import('./infrastructure/di/Container').then(m => {
            m.DIContainer.syncService.processSyncQueue().catch(console.error);
          });
        } else if (e.data.type === 'SEND_ALERT') {
          import('./infrastructure/services/AlertService').then(m => {
            const alertService = new m.AlertService();
            alertService.sendTelegramAlert(e.data.message).catch(console.error);
          });
        }
      };
    };

    const runCheck = () => {
      if (!healthWorkerRef.current) startWorker();
      
      // Setup timeout guard
      timeoutId = setTimeout(() => {
        import('./shared/constants/errorMessages').then(({ ERROR_MESSAGES }) => {
          logger.warn(`[HealthGuardian] ${ERROR_MESSAGES.WORKER_TIMEOUT}`);
          startWorker(); // Restart zombie worker
        });
      }, TIMEOUT_MS);

      healthWorkerRef.current?.postMessage({ type: 'RUN_HEALTH_CHECK' });
    };

    startWorker();
    runCheck(); // Initial check

    const healthInterval = setInterval(runCheck, 5 * 60 * 1000);

    return () => {
      clearInterval(healthInterval);
      if (timeoutId) clearTimeout(timeoutId);
      healthWorkerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth?.onAuthStateChanged((user) => {
      import('./shared/store/authStore').then(m => m.useAuthStore.getState().setFirebaseUser(user));
    });

    // Fallback timeout: If Firebase auth hangs (e.g. offline, blocked, network issues), force initialization
    const fallbackTimeout = setTimeout(() => {
      import('./shared/store/authStore').then(m => {
        if (!m.useAuthStore.getState().isFirebaseInitialized) {
          logger.warn('[App] Firebase initialization timed out. Proceeding in Offline-First mode.');
          m.useAuthStore.getState().setFirebaseUser(null);
        }
      });
    }, 4000);

    return () => {
      unsubscribeAuth?.();
      clearTimeout(fallbackTimeout);
    };
  }, []);

  useEffect(() => {
    // --- FIREBASE KILL-SWITCH (Device Control) ---
    // Listen to Firebase for system-wide remote lock using polling instead of onSnapshot to save costs.
    const checkLock = async () => {
      import('./shared/api/firebase').then(async ({ isConfigValid }) => {
        if (!isConfigValid) return;
        try {
          const lockRef = doc(firestoreDb, 'device_controls', 'system_lock');
          const lockSnap = await getDoc(lockRef);
          if (lockSnap.exists()) {
            const lockData = lockSnap.data();
            if (lockData.isLocked === true) {
              setIsKilled(true);
              import('./shared/store/useSecurityStore').then(m => m.useSecurityStore.getState().lock());
            } else {
              setIsKilled(false);
            }
          }
        } catch (error) {
          console.warn("Kill-switch check failed (offline):", error);
        }
      });
    };
    
    // Poll every 5 minutes
    checkLock();
    const interval = setInterval(checkLock, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleResetDatabase = async () => {
    if (window.confirm('PERHATIAN: Tindakan ini akan menghapus seluruh database lokal, termasuk kunci enkripsi. Semua data yang belum tersinkronisasi akan hilang permanen. Lanjutkan?')) {
      try {
        await db.delete();
        logger.info('Database has been successfully deleted by the user.');
        window.location.reload();
      } catch (error) {
        const message = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
        logger.error('Failed to reset database', { error: message });
        setBootError('Gagal mereset database: ' + message);
      }
    }
  };

  useEffect(() => {
    async function bootstrapSecurity() {
      try {
        // Sync server time immediately, but don't block forever if Firebase hangs
        await Promise.race([
          syncTimeOffset(),
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);

        // Phase 1.2: Check system locked state forcefully from IndexedDB to persist across Cache Clears
        await useSecurityStore.getState().initSystemLock();
        
        // Phase 3: Check Store Setup profile state
        await useSecurityStore.getState().initSetupState();

        // FASE 0 Migration: Migrate printer config from localStorage to store_profile Dexie
        const migrationV0 = await db.keyval.get('migration_v0_done');
        if (!migrationV0) {
          const savedPrinterRaw = localStorage.getItem('PSA_PRINTER_CONFIG');
          const shopNameRaw = localStorage.getItem('PSA_SHOP_NAME');
          const shopAddressRaw = localStorage.getItem('PSA_SHOP_ADDRESS');
          const shopFooterRaw = localStorage.getItem('PSA_RECEIPT_FOOTER');
          
          if (savedPrinterRaw || shopNameRaw || shopAddressRaw || shopFooterRaw) {
            const printerConfig = savedPrinterRaw ? JSON.parse(savedPrinterRaw) : undefined;
            
            await db.store_profile.put({
              id: 'default',
              name: shopNameRaw || 'PSA JEWELLERY',
              address: shopAddressRaw || '',
              receiptFooter: shopFooterRaw || 'Terima Kasih',
              isSetupComplete: true, // Assuming if these exist, setup is complete
              updatedAt: Date.now(),
              printerConfig: printerConfig
            });
            
            localStorage.removeItem('PSA_PRINTER_CONFIG');
            localStorage.removeItem('PSA_SHOP_NAME');
            localStorage.removeItem('PSA_SHOP_ADDRESS');
            localStorage.removeItem('PSA_RECEIPT_FOOTER');
            logger.info('[Migration] Printer/Shop config migrated to IndexedDB.');
          }
          await db.keyval.put({ key: 'migration_v0_done', value: true });
        }
        
        // P0 Migration: Reconcile any legacy shift totals
        await ShiftTotalsReconciler.reconcileActiveShiftTotals();

        const wrappedKeyMeta = await cryptoKeyStore.getWrappedKey();
        
        // Robustness: Detect if DB was wiped (e.g., Cache/History cleared by browser)
        if (!wrappedKeyMeta) {
           const dbHasData = await db.table('stock').count() > 0 || await db.table('transactions').count() > 0;
           if (dbHasData) {
              // This is a weird state, maybe cache partially wiped.
           } else {
              // Appears to be a fresh start or wiped.
              logger.warn('No keys found. Application appears fresh or storage was cleared.');
           }
        }

        // --- EXPERT HARDENING: Request Persistent Storage ---
        // Prevents browser from silently evicting IndexedDB under storage pressure
        if (navigator.storage && navigator.storage.persist) {
          const isPersisted = await navigator.storage.persist();
          if (isPersisted) {
            logger.info('Browser granted persistent storage rights.');
          } else {
            logger.warn('Persistent storage not granted. DB may be evicted under pressure.');
          }
        }
        // ----------------------------------------------------
        
        // FASE 1: Removed server unwrap. DB is unlocked via PIN upon user login.
        if (wrappedKeyMeta) {
           logger.info('Device is enrolled. Database will be unlocked via user PIN upon login.');
        } else {
           logger.info('Device is not enrolled. First login will initialize local crypto.');
        }
      } catch (error) {
        const message = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
        logger.error('Failed to bootstrap security', { error: message });
        setBootError('Gagal memuat modul keamanan: ' + message);
      } finally {
        setIsBootstrapping(false);
      }
    }
    bootstrapSecurity();
  }, []);

  if (isBootstrapping || !isFirebaseInitialized) {
    return (
      <div 
        data-component-id="AppBootstrap" 
        data-error-domain="security_init"
        className="flex h-screen w-full items-center justify-center bg-stone-50"
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-stone-600 mx-auto mb-4" />
          <p className="text-stone-600 font-medium">Memuat Modul Keamanan...</p>
        </div>
      </div>
    );
  }

  if (bootError) {
    return (
      <div 
        data-component-id="AppCrashBoundary" 
        data-error-domain="fatal_error_recovery"
        className="flex h-screen w-full items-center justify-center bg-stone-50"
      >
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-200 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Gagal Memuat Data Toko</h2>
          <p className="text-stone-600 mb-6 text-sm">Terjadi masalah saat mengakses data aplikasi. Silakan coba muat ulang halaman ini.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => window.location.reload()} className="w-full px-4 py-3 bg-stone-800 text-white rounded-lg font-bold">Muat Ulang Halaman</button>
            <div className="w-full space-y-2 mt-4 pt-4 border-t border-stone-100">
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider text-center">Bantuan Lanjutan</p>
              <button onClick={handleResetDatabase} className="w-full px-4 py-2 bg-stone-100 text-stone-600 rounded-lg font-bold text-xs hover:bg-stone-200">Reset Data (Perlu Bantuan IT)</button>
              <p className="text-[10px] text-red-600 font-medium text-center">PERINGATAN: Tindakan ini berisiko kehilangan data.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSystemLocked) {
    return (
      <div 
        data-component-id="AppNuclearLock" 
        data-error-domain="security_nuclear_lock"
        className="flex h-screen w-full items-center justify-center bg-black"
      >
        <div className="text-center text-stone-200 max-w-sm px-6">
          <ShieldAlert className="h-16 w-16 mx-auto mb-6 text-red-600" />
          <h1 className="text-xl font-bold uppercase tracking-widest mb-4">Keamanan Terkunci</h1>
          <p className="text-sm text-stone-400 mb-8">
            Percobaan akses ilegal terdeteksi. Sistem telah mengunci seluruh antarmuka. 
            Sinkronisasi data sedang berlangsung. Jangan tutup aplikasi atau matikan perangkat.
          </p>
          <Loader2 className="h-6 w-6 animate-spin text-stone-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (isKilled) {
    return (
      <div 
        data-component-id="AppKillSwitch" 
        data-error-domain="security_lockdown"
        className="flex h-screen w-full items-center justify-center bg-black"
      >
        <div className="text-center text-red-500 max-w-sm px-6">
          <ShieldAlert className="h-16 w-16 mx-auto mb-6 opacity-80" />
          <h1 className="text-2xl font-bold uppercase tracking-widest mb-4">SYSTEM LOCKED</h1>
          <p className="text-sm text-stone-400">
            Akses ke perangkat ini telah diblokir secara terpusat oleh Administrator. Hubungi manajemen pusat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SystemHealthBot />
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
