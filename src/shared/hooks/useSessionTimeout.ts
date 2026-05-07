/**
 * @ai_context    : Auto-logout setelah inaktivitas untuk melindungi akses tidak sah di tablet toko.
 * @business_rule : Timeout 15 menit untuk kasir, 20 menit untuk manager, 30 menit untuk admin (PCI-DSS §8.1.8).
 * @security_tier : HIGH
 */
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { UserRole } from '../../domain/models/User';

const TIMEOUT_BY_ROLE: Record<UserRole, number> = {
  CASHIER: 15 * 60 * 1000, // 15 menit
  MANAGER: 20 * 60 * 1000, // 20 menit
  ADMIN: 30 * 60 * 1000,   // 30 menit
};

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

export function useSessionTimeout() {
  const { user, logout } = useAuthStore();
  const addToast = useToastStore(state => state.addToast);
  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTimeout = useCallback(() => {
    if (!useAuthStore.getState().user) return;
    logout();
    addToast('Sesi Anda telah berakhir karena tidak ada aktivitas.', 'warning');
    navigate({ to: '/login' });
  },[logout, addToast, navigate]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const role = useAuthStore.getState().user?.role ?? UserRole.CASHIER;
    const timeout = TIMEOUT_BY_ROLE[role] ?? 15 * 60 * 1000;
    timerRef.current = setTimeout(handleTimeout, timeout);
  }, [handleTimeout]);

  useEffect(() => {
    if (!user) return;
    resetTimer();
    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, resetTimer));
    };
  },[user, resetTimer]);
}
