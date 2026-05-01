import React from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Briefcase, Building, Plus, ChevronDown, ChevronUp, Home } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '../../../infrastructure/di/Container';

const navItems = [
  { path: '/', icon: Home, label: 'Beranda' },
  { path: '/workspace', icon: LayoutDashboard, label: 'Operasional' },
  { path: '/office', icon: Building, label: 'Manajemen' },
];

export function CollapsibleBottomBar() {
  const { isBottomBarOpen, toggleBottomBar, setContextualMenuOpen } = useUIStore();
  const location = useLocation();
  const openShift = useLiveQuery(() => DIContainer.liveQueries.observeOpenShift());

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <AnimatePresence mode="wait">
        {isBottomBarOpen ? (
          <motion.nav
            key="expanded"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="bg-white/90 backdrop-blur-xl border border-stone-200 shadow-2xl rounded-full px-4 py-2 flex items-center gap-2"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                    isActive ? 'bg-brand-50 text-brand-900' : 'text-stone-400'
                  }`}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.div layoutId="activeTab" className="absolute inset-0 bg-brand-100/50 rounded-full -z-10" />
                  )}
                  {item.path === '/workspace' && openShift && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
                  )}
                </Link>
              );
            })}
            
            <div className="w-px h-8 bg-stone-200 mx-1" />
            
            <button
              onClick={() => setContextualMenuOpen(true)}
              className="w-12 h-12 bg-brand-900 text-gold-500 rounded-full shadow-md flex items-center justify-center active:scale-90 transition-transform"
            >
              <Plus size={24} />
            </button>

            <button onClick={toggleBottomBar} className="flex min-w-[44px] min-h-[44px] items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 transition-colors">
              <ChevronDown size={20} />
            </button>
          </motion.nav>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={toggleBottomBar}
            className="bg-white border border-stone-200 shadow-lg rounded-full min-w-[56px] min-h-[56px] flex items-center justify-center text-stone-500 active:scale-90 transition-all hover:bg-stone-50"
          >
            <ChevronUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

