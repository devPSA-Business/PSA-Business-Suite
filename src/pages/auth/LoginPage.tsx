import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../shared/api/firebase';
import { useToastStore } from '../../shared/store/toastStore';
import { useAuthStore } from '../../shared/store/authStore';
import { useSecurityStore } from '../../shared/store/useSecurityStore';
import { db } from '../../shared/api/db';
import { UserRole } from '../../domain/models/User';
import { Loader2, ShieldCheck, Mail, Lock, Beaker } from 'lucide-react';
import { ERROR_MESSAGES } from '../../shared/constants/errorMessages';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      addToast('Sistem Autentikasi belum siap / kredensial tidak valid.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // FASE 3.2: Setelah Cloud Login sukses, kita arahkan ke root.
      // App.tsx / Router guard akan menentukan apakah toko perlu di-setup atau langsung minta PIN (Lapis 2).
      navigate({ to: '/' }); 
    } catch (error: unknown) {
      console.error('[Auth] Login failed:', error);
      let errorMsg = ERROR_MESSAGES.LOGIN_FAILED;
      
      if (error instanceof Error && 'code' in error) {
        const errCode = (error as { code: string }).code;
        if (errCode === 'auth/operation-not-allowed') {
          errorMsg = ERROR_MESSAGES.AUTH_METHOD_DISABLED;
        } else if (errCode === 'auth/user-not-found' || errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential') {
          errorMsg = ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS;
        } else if (errCode === 'auth/network-request-failed') {
          errorMsg = ERROR_MESSAGES.AUTH_NETWORK_ERROR;
        }
      }

      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSandboxBypass = async () => {
    const { setFirebaseUser, login } = useAuthStore.getState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setFirebaseUser({ uid: 'dev-admin', email: 'dev@psajewelry.com', displayName: 'Dev Admin' } as any);
    login({ id: 'USR-ADMIN', name: 'Dev Admin', role: UserRole.ADMIN, branchId: 'HQ' });
    
    await db.store_profile.put({
      id: 'default',
      name: 'PSA DEV STUDIO',
      address: 'AI Studio Sandbox',
      receiptFooter: 'Dev Mode',
      isSetupComplete: true,
      updatedAt: Date.now()
    });
    
    useSecurityStore.setState({ isSetupComplete: true, isPinVerified: true });
    navigate({ to: '/' });
  };

  return (
    <div 
      data-component-id="LoginPage" 
      data-error-domain="auth"
      className="flex min-h-screen items-center justify-center bg-stone-100 p-4 font-sans"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="bg-brand-900 p-8 text-center relativer flex flex-col items-center">
           <div className="w-16 h-16 bg-gold-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-gold-500/20">
             <ShieldCheck size={32} className="text-brand-900" />
           </div>
           <h1 className="text-2xl font-serif font-bold text-gold-500 tracking-wider uppercase">PSA Business Suite</h1>
           <p className="text-brand-100/80 text-sm mt-2">Otentikasi Cloud - Lapis 1</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Email Administrator</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-stone-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all font-medium text-stone-800"
                  placeholder="admin@psajewelry.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Sandi Master</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-stone-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all font-medium text-stone-800"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative py-4 bg-brand-900 text-gold-500 font-bold rounded-xl shadow-lg hover:bg-brand-800 hover:shadow-brand-900/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-gold-500" />
                    <span>MENGOTENTIKASI...</span>
                  </>
                ) : (
                  <span>AKSES PERANGKAT</span>
                )}
              </span>
            </button>

            {import.meta.env.DEV === true && (
              <button
                type="button"
                onClick={handleSandboxBypass}
                className="w-full py-4 mt-4 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all flex items-center justify-center gap-2 border border-stone-200"
              >
                <Beaker size={18} />
                <span>Masuk Mode Sandbox (Preview)</span>
              </button>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-stone-400">
              Dengan mengakses perangkat ini, Anda menyetujui seluruh<br/>protokol otentikasi luring & daring PSA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
