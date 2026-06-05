/**
 * @ai_context: Halaman autentikasi Cloud (Firebase Auth - Lapis 1).
 * @security_tier: HIGH
 * @business_rule: Mode LOGIN untuk akun yang sudah ada, mode DAFTAR untuk setup pertama.
 *   Setelah login/daftar berhasil, router akan mengarahkan ke /onboarding (jika toko belum setup)
 *   atau /locked (jika PIN belum diverifikasi sesi ini).
 * @changelog:
 *   2026-06-04 — Tambah mode DAFTAR (createUserWithEmailAndPassword) untuk setup pertama. [FIX-GENESIS]
 */
import React, { useState } from 'react';
import { logger } from '../../lib/logger';
import { useNavigate } from '@tanstack/react-router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../shared/api/firebase';
import { useToastStore } from '../../shared/store/toastStore';
import { useAuthStore } from '../../shared/store/authStore';
import { useSecurityStore } from '../../shared/store/useSecurityStore';
import { db } from '../../shared/api/db';
import { UserRole } from '../../domain/models/User';
import {
  Loader2, ShieldCheck, Mail, Lock, Beaker, UserPlus, LogIn, Eye, EyeOff,
} from 'lucide-react';
import { ERROR_MESSAGES } from '../../shared/constants/errorMessages';

type AuthMode = 'login' | 'register';

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  // ─── MASUK (Login) ──────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      addToast('Sistem autentikasi belum siap.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate({ to: '/' });
    } catch (error: unknown) {
      logger.error('[Auth] Login failed', { error });
      let errorMsg = ERROR_MESSAGES.LOGIN_FAILED;
      if (error instanceof Error && 'code' in error) {
        const code = (error as { code: string }).code;
        if (code === 'auth/operation-not-allowed')       errorMsg = ERROR_MESSAGES.AUTH_METHOD_DISABLED;
        else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
          errorMsg = ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS;
        else if (code === 'auth/network-request-failed') errorMsg = ERROR_MESSAGES.AUTH_NETWORK_ERROR;
      }
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── DAFTAR (Register) ──────────────────────────────────────────────────────
  //
  // @security_tier: HIGH
  // @business_rule: Form Daftar hanya untuk SETUP PERTAMA (genesis) oleh pemilik toko.
  //   Staf/kasir TIDAK mendaftar sendiri — akun mereka dibuat oleh admin via panel Settings.
  //
  // KEAMANAN BERLAPIS (tidak perlu whitelist email hardcoded):
  //   L1: Firebase Auth — hanya akun Firebase yang valid dapat masuk
  //   L2: Firestore rules — isValidUser() + UID ownership check + App Check
  //   L3: PinGate — autentikasi lokal per sesi di perangkat
  //   L4: IndexedDB encryption — data terenkripsi AES-GCM per PIN
  //   L5: branchId isolation — data antar toko tidak bisa saling akses
  //
  // Catatan: Whitelist email hardcoded SENGAJA TIDAK DIPAKAI karena:
  //   (a) Memblokir owner jika emailnya tidak ada di daftar kode
  //   (b) Perlu commit+deploy setiap kali email berubah
  //   (c) Client-side check mudah dilewati — bukan security layer yang efektif
  //   Perlindungan nyata sudah ada di L2–L5 di atas.
  //
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      addToast('Sistem autentikasi tidak tersedia. Periksa konfigurasi Firebase.', 'error');
      return;
    }

    if (password.length < 8) {
      addToast('Kata sandi minimal 8 karakter.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      addToast('Konfirmasi kata sandi tidak cocok. Periksa kembali.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Berhasil daftar → Firebase otomatis login → router arahkan ke /onboarding
      addToast('Akun berhasil dibuat! Lanjutkan setup toko Anda.', 'success');
      navigate({ to: '/' });
    } catch (error: unknown) {
      logger.error('[Auth] Register failed', { error });
      if (error instanceof Error && 'code' in error) {
        const code = (error as { code: string }).code;
        if (code === 'auth/email-already-in-use') {
          addToast('Email sudah terdaftar. Silakan masuk dengan email tersebut.', 'warning');
          switchMode('login');
        } else if (code === 'auth/weak-password') {
          addToast('Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.', 'error');
        } else if (code === 'auth/invalid-email') {
          addToast('Format email tidak valid.', 'error');
        } else if (code === 'auth/operation-not-allowed') {
          addToast('Pendaftaran email belum diaktifkan. Hubungi administrator Firebase.', 'error');
        } else if (code === 'auth/network-request-failed') {
          addToast('Tidak ada koneksi internet. Hubungkan perangkat lalu coba lagi.', 'error');
        } else {
          addToast(`Gagal membuat akun (${code}). Coba lagi.`, 'error');
        }
      } else {
        addToast('Terjadi kesalahan tidak dikenal. Coba lagi.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── SANDBOX (hanya di dev) ──────────────────────────────────────────────────
  // @security_tier: HIGH — DOUBLE GUARD: (1) runtime check + (2) JSX conditional render
  // Fungsi ini TIDAK akan berjalan di production build. Bundle tree-shaking oleh Rollup/esbuild
  // mengeliminasi dead code saat import.meta.env.DEV == false.
  // Email menggunakan akun resmi toko (bukan akun eksternal).
  const handleSandboxBypass = async () => {
    // Runtime guard: jika entah bagaimana dipanggil di production, tolak
    if (!import.meta.env.DEV) return;
    const { setFirebaseUser, login } = useAuthStore.getState();
    // SEC-FIX-001 (2026-06-04): Ganti dev@psajewelry.com → dev.psajewelry@gmail.com (email resmi toko)
    setFirebaseUser({ uid: 'dev-admin', email: 'dev.psajewelry@gmail.com', displayName: 'Dev Admin' } as Parameters<typeof setFirebaseUser>[0]);
    login({ id: 'USR-ADMIN', name: 'Dev Admin', role: UserRole.ADMIN, branchId: 'HQ' });
    await db.store_profile.put({
      id: 'default',
      name: 'PSA DEV STUDIO',
      address: 'AI Studio Sandbox',
      receiptFooter: 'Dev Mode',
      isSetupComplete: true,
      updatedAt: Date.now(),
    });
    useSecurityStore.setState({ isSetupComplete: true, isPinVerified: true });
    navigate({ to: '/' });
  };

  const isLoginMode = mode === 'login';

  return (
    <div
      data-component-id="LoginPage"
      data-error-domain="auth"
      className="flex min-h-screen items-center justify-center bg-stone-100 p-4 pt-10 font-sans"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">

        {/* Header */}
        <div className="bg-brand-900 p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-gold-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-gold-500/20">
            <ShieldCheck size={32} className="text-brand-900" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-gold-500 tracking-wider uppercase">PSA Business Suite</h1>
          <p className="text-brand-100/80 text-sm mt-2">
            {isLoginMode ? 'Otentikasi Cloud — Lapis 1' : 'Buat Akun Baru — Setup Pertama'}
          </p>
        </div>

        <div className="p-8">

          {/* Mode Toggle */}
          <div className="flex bg-stone-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                isLoginMode
                  ? 'bg-white text-brand-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <LogIn size={15} />
              Masuk
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                !isLoginMode
                  ? 'bg-white text-brand-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <UserPlus size={15} />
              Daftar
            </button>
          </div>

          {/* Info box untuk mode daftar */}
          {!isLoginMode && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 text-sm text-blue-800">
              <p className="font-bold mb-1">Setup Pertama Toko</p>
              <p className="leading-relaxed text-blue-700">
                Buat akun email untuk mengakses PSA Business Suite. Setelah ini Anda akan mengatur nama toko dan PIN keamanan.
              </p>
            </div>
          )}

          <form onSubmit={isLoginMode ? handleLogin : handleRegister} className="space-y-5">

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">
                {isLoginMode ? 'Email Administrator' : 'Email Anda'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-stone-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all font-medium text-stone-800"
                  placeholder={isLoginMode ? 'contoh@email.com' : 'email-anda@gmail.com'}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">
                {isLoginMode ? 'Kata Sandi' : 'Kata Sandi (min. 8 karakter)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-stone-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all font-medium text-stone-800"
                  placeholder="••••••••"
                  required
                  minLength={isLoginMode ? undefined : 8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Konfirmasi Password (hanya mode daftar) */}
            {!isLoginMode && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Ulangi Kata Sandi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-stone-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all font-medium text-stone-800"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative py-4 bg-brand-900 text-gold-500 font-bold rounded-xl shadow-lg hover:bg-brand-800 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-gold-500" />
                    <span>{isLoginMode ? 'MEMVERIFIKASI...' : 'MEMBUAT AKUN...'}</span>
                  </>
                ) : isLoginMode ? (
                  <span>AKSES PERANGKAT</span>
                ) : (
                  <span>BUAT AKUN & LANJUTKAN</span>
                )}
              </span>
            </button>

            {/* Sandbox (dev only) */}
            {import.meta.env.DEV === true && (
              <button
                type="button"
                onClick={handleSandboxBypass}
                className="w-full py-4 mt-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all flex items-center justify-center gap-2 border border-stone-200"
              >
                <Beaker size={18} />
                <span>Masuk Mode Sandbox (Preview)</span>
              </button>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-stone-400">
              Dengan mengakses perangkat ini, Anda menyetujui seluruh
              <br />protokol otentikasi luring &amp; daring PSA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
