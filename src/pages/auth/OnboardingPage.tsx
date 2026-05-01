import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Store, User, Lock, ArrowRight, Loader2, ShieldCheck, MapPin, Beaker } from 'lucide-react';
import { useToastStore } from '../../shared/store/toastStore';
import { DIContainer } from '../../infrastructure/di/Container';
import { useSecurityStore } from '../../shared/store/useSecurityStore';
import { isConfigValid } from '../../shared/api/firebase';
import { db } from '../../shared/api/db';

export function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Store Setup
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');

  // Step 2: Owner Setup
  const [ownerName, setOwnerName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !storeAddress.trim()) {
      addToast('Informasi toko belum lengkap.', 'warning');
      return;
    }
    setStep(2);
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      addToast('Nama pemilik harus diisi.', 'warning');
      return;
    }
    if (pin.length !== 6) {
      addToast('PIN harus terdiri dari 6 digit angka.', 'warning');
      return;
    }
    if (pin !== confirmPin) {
      addToast('Konfirmasi PIN tidak cocok.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await DIContainer.setupStoreUseCase.execute({
        storeName,
        storeAddress,
        ownerName,
        ownerPin: pin
      });

      // Update state keamanan
      await useSecurityStore.getState().initSetupState();

      addToast('Inisialisasi Toko & Kriptografi Berhasil!', 'success');
      
      // Ke LockedPage (Login via PIN Lapis 2) atau ke Root tergantung alur guard Router
      navigate({ to: '/' });
    } catch (error) {
      console.error('[Onboarding] Setup failed:', error);
      addToast(`Gagal melakukan setup data: ${(error instanceof Error ? error.message : String(error))}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      data-component-id="OnboardingPage" 
      data-error-domain="onboarding"
      className="flex min-h-screen items-center justify-center bg-stone-100 p-4 font-sans relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-brand-900 clip-path-slant z-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 40%, 0 100%)' }}></div>
      
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in duration-500 border border-stone-200">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-stone-100 flex items-center justify-between">
            <div>
               <h1 className="text-2xl font-serif font-bold text-brand-900">Setup Enterprise</h1>
               <p className="text-stone-500 text-sm mt-1">Inisialisasi Sistem Baru</p>
            </div>
            <div className="flex gap-2 items-center">
               <div className={`w-8 h-2 rounded-full ${step >= 1 ? 'bg-gold-500' : 'bg-stone-200'} transition-colors duration-500`}></div>
               <div className={`w-8 h-2 rounded-full ${step >= 2 ? 'bg-gold-500' : 'bg-stone-200'} transition-colors duration-500`}></div>
            </div>
        </div>

        <div className="p-8">
          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 mb-6 flex gap-3 text-sm leading-relaxed">
                 <ShieldCheck size={24} className="shrink-0 text-blue-600 mt-0.5" />
                 <p>
                   Aplikasi telah berhasil terhubung ke jaringan awan. Langkah selanjutnya adalah <strong>menentukan identitas toko</strong>. Data ini akan tercetak pada struk thermal.
                 </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Nama Toko / Cabang</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Store size={18} className="text-stone-400" />
                  </div>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all font-medium text-stone-800"
                    placeholder="Contoh: PSA Centre Point"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Alamat Operasional</label>
                <div className="relative">
                  <div className="absolute top-3 left-0 pl-4 flex items-start pointer-events-none">
                    <MapPin size={18} className="text-stone-400" />
                  </div>
                  <textarea
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all font-medium text-stone-800 min-h-[100px] resize-none"
                    placeholder="Jl. Utama No. 1, Kota XYZ"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                 <button
                   type="submit"
                   className="py-3 px-6 bg-brand-900 text-gold-500 font-bold rounded-xl shadow-lg hover:bg-brand-800 hover:shadow-brand-900/20 active:scale-95 transition-all flex justify-center items-center gap-2"
                 >
                   <span>Selanjutnya</span>
                   <ArrowRight size={18} />
                 </button>
              </div>

              {import.meta.env.DEV === true && (
                <div className="pt-4 border-t border-stone-100 mt-4">
                  <button
                    type="button"
                    onClick={async () => {
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
                    }}
                    className="w-full py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all flex items-center justify-center gap-2 border border-stone-200"
                  >
                    <Beaker size={18} />
                    <span>Lewati Setup (Mode Sandbox)</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleCompleteSetup} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-100 mb-6 flex gap-3 text-sm leading-relaxed">
                 <Lock size={24} className="shrink-0 text-amber-600 mt-0.5" />
                 <p>
                   <strong>Penting!</strong> PIN 6-digit yang Anda buat di bawah ini akan digunakan untuk <strong>mengenkripsi database</strong> di perangkat ini secara luring. Jaga kerahasiaannya.
                 </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Nama Pimpinan (Admin Utama)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={18} className="text-stone-400" />
                  </div>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all font-medium text-stone-800 uppercase"
                    placeholder="Nama Lengkap / Panggilan"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">PIN Rahasia</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-center tracking-[0.5em] py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all font-bold text-stone-800"
                    placeholder="••••••"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Ketik Ulang PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-center tracking-[0.5em] py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all font-bold text-stone-800"
                    placeholder="••••••"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                 <button
                   type="button"
                   onClick={() => setStep(1)}
                   className="py-3 px-6 text-stone-500 font-bold hover:text-stone-800 transition-colors flex items-center gap-2"
                 >
                   Kembali
                 </button>
                 <button
                   type="submit"
                   disabled={isLoading || pin.length !== 6 || confirmPin.length !== 6}
                   className="py-3 px-8 bg-brand-900 text-gold-500 font-bold rounded-xl shadow-lg hover:bg-brand-800 hover:shadow-brand-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                 >
                   {isLoading ? (
                     <>
                        <Loader2 size={18} className="animate-spin text-gold-500" />
                        <span>MEMPROSES...</span>
                     </>
                   ) : (
                     <span>Selesaikan Setup</span>
                   )}
                 </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
