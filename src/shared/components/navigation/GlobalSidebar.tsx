import React, { useState, useEffect } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, LayoutDashboard, Briefcase, Building, Settings, 
  ChevronDown, ChevronRight, Package, Wrench, 
  Users, FileText, Printer, Receipt, Key, Cloud, CloudOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/authStore';
import { ChangePinModal } from '../ChangePinModal';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '../../../infrastructure/di/Container';

/**
 * @ai_context Hook to listen to sync status updates from SyncService.
 */
function useSyncStatus() {
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [isOk, setIsOk] = useState(true);
  const [timeLabel, setTimeLabel] = useState('Belum sync');

  useEffect(() => {
    const handler = (e: Event) => {
      const { ok, lastSyncAt: ts } = (e as CustomEvent).detail;
      setIsOk(ok);
      if (ts) setLastSyncAt(ts);
    };
    window.addEventListener('psa:sync-status', handler);
    return () => window.removeEventListener('psa:sync-status', handler);
  }, []);

  useEffect(() => {
    const update = () => {
      if (!lastSyncAt) return;
      setTimeLabel(formatDistanceToNow(lastSyncAt, { addSuffix: true, locale: localeId }));
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [lastSyncAt]);

  const isStale = lastSyncAt && Date.now() - lastSyncAt > 2 * 3_600_000;
  return { isOk, isStale, lastSyncAt, timeLabel };
}

const menuGroups = [
  {
    id: 'home',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    id: 'workspace',
    label: 'Operasional Toko',
    icon: Briefcase,
    subItems: [
      { label: 'Inventaris', path: '/inventory', icon: Package },
      { label: 'Servis & Reparasi', path: '/services', icon: Wrench },
      { label: 'Kasir (POS)', path: '/cashier', icon: Receipt },
    ]
  },
  {
    id: 'office',
    label: 'Manajemen',
    icon: Building,
    subItems: [
      { label: 'Laporan Keuangan', path: '/finance', icon: FileText },
      { label: 'Pegawai', path: '/employees', icon: Users },
      { label: 'Audit Sistem', path: '/system-audit', icon: FileText },
    ]
  },
  {
    id: 'settings',
    label: 'Pengaturan',
    icon: Settings,
    subItems: [
      { label: 'Pengaturan Printer', path: '/settings/printer', icon: Printer },
      { label: 'Format Struk', path: '/settings/receipt', icon: Receipt },
      { label: 'Sistem', path: '/settings', icon: Settings },
    ]
  }
];

export function GlobalSidebar() {
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const { isOk, isStale, timeLabel } = useSyncStatus();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const openShift = useLiveQuery(() => DIContainer.liveQueries.observeOpenShift());
  const user = useAuthStore(state => state.user);
  
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    workspace: pathname.startsWith('/inventory') || pathname.startsWith('/services'),
    office: pathname.startsWith('/finance') || pathname.startsWith('/employees'),
    settings: pathname.startsWith('/settings'),
  });

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredMenuGroups = menuGroups.map(group => {
    if (group.id === 'settings' && user?.role === 'ADMIN') {
      return {
        ...group,
        subItems: [
          ...group.subItems!,
          { label: 'Sinkronisasi DLQ', path: '/settings/sync-dlq', icon: FileText }
        ]
      };
    }
    return group;
  }).filter(group => {
    if (user?.role === 'CASHIER') {
      return group.id === 'home' || group.id === 'workspace';
    }
    return true;
  });

  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[60]"
          />

          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[85%] sm:w-4/5 max-w-sm bg-white z-[70] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-14 sm:h-16 border-b border-stone-200 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-stone-50">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-900 rounded-lg flex items-center justify-center text-gold-500 font-serif font-bold text-base sm:text-lg">
                  P
                </div>
                <h2 className="font-serif font-bold text-base sm:text-lg text-brand-900">PSA Menu</h2>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-full transition-colors"
              >
                <X size={20} className="sm:w-5 sm:h-5 w-4 h-4" />
              </button>
            </div>

            {/* Menu Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 sm:space-y-2">
              {filteredMenuGroups.map((group) => {
                const GroupIcon = group.icon;
                const isExpanded = expandedGroups[group.id];
                const isActive = group.path === pathname;

                if (group.path) {
                  return (
                    <Link
                      key={group.id}
                      to={group.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center min-h-[44px] gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-colors font-medium text-sm sm:text-base ${
                        isActive 
                          ? 'bg-brand-50 text-brand-900' 
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <GroupIcon size={18} className={`sm:w-5 sm:h-5 ${isActive ? 'text-brand-900' : 'text-stone-400'}`} />
                      <span>{group.label}</span>
                    </Link>
                  );
                }

                return (
                  <div key={group.id} className="space-y-1">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full min-h-[44px] flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl hover:bg-stone-100 transition-colors text-stone-700 font-medium text-sm sm:text-base"
                    >
                      <div className="flex items-center gap-3">
                        <GroupIcon size={18} className="sm:w-5 sm:h-5 text-stone-400" />
                        <span>{group.label}</span>
                        {group.id === 'workspace' && openShift && (
                          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full animate-pulse ml-2" />
                        )}
                      </div>
                      {isExpanded ? <ChevronDown size={16} className="sm:w-[18px] sm:h-[18px] text-stone-400" /> : <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px] text-stone-400" />}
                    </button>
                    
                    <AnimatePresence>
                      {isExpanded && group.subItems && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-9 sm:pl-11 pr-3 sm:pr-4 py-1 space-y-1 border-l-2 border-stone-100 ml-5 sm:ml-6 my-1">
                            {group.subItems.map((sub) => {
                              const SubIcon = sub.icon;
                              const isSubActive = pathname === sub.path;
                              return (
                                <Link
                                  key={sub.path}
                                  to={sub.path}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`flex min-h-[44px] items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-lg transition-colors text-xs sm:text-sm font-medium ${
                                    isSubActive
                                      ? 'bg-brand-50 text-brand-900'
                                      : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                                  }`}
                                >
                                  <SubIcon size={14} className={`sm:w-4 sm:h-4 ${isSubActive ? 'text-brand-900' : 'text-stone-400'}`} />
                                  <span>{sub.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            
            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-stone-200 bg-stone-50 shrink-0 space-y-3 sm:space-y-4 pb-safe">
              <button
                onClick={() => setIsChangePinOpen(true)}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2 sm:py-2.5 px-4 bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-100 hover:text-brand-900 transition-colors font-medium text-xs sm:text-sm shadow-sm"
              >
                <Key size={14} className="sm:w-4 sm:h-4" />
                Ganti PIN Saya
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new Event('REQUEST_HEALTH_CHECK'));
                  import('../../store/useHealthStore').then((m) => {
                    m.useHealthStore.getState().showBot();
                  });
                  setSidebarOpen(false);
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2 sm:py-2.5 px-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors font-medium text-xs sm:text-sm shadow-sm"
              >
                <div className="p-1 rounded-full bg-blue-200"><Wrench size={10} className="text-blue-800" /></div>
                Bantuan Diagnostik Sistem
              </button>
              <div className="flex flex-col items-center gap-1">
                <div className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${isStale ? 'text-red-500' : isOk ? 'text-green-600' : 'text-amber-500'}`}>
                  {isOk ? <Cloud size={10} /> : <CloudOff size={10} />}
                  <span>Sync: {timeLabel}</span>
                </div>
                <div className="text-[10px] sm:text-xs text-stone-400 text-center">
                  PSA Business Suite v1.4.0
                </div>
              </div>
            </div>
          </motion.div>
          
          <ChangePinModal isOpen={isChangePinOpen} onClose={() => setIsChangePinOpen(false)} />
        </>
      )}
    </AnimatePresence>
  );
}
