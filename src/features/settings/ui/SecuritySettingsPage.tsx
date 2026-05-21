/**
 * @ai_context Halaman pengaturan keamanan: generate Recovery Key, status PIN, dan panduan owner.
 * @security_tier HIGH
 * @business_rule Recovery Key adalah satu-satunya cara memulihkan akses jika PIN lupa.
 *               Kunci asli TIDAK disimpan server — hanya dikembalikan ke UI untuk dicatat owner.
 *               Setelah kunci digenerate, owner WAJIB mencetaknya dan menyimpannya secara fisik.
 * @data-component-id: security-settings-page
 * @data-error-domain: security
 * @changelog:
 *   2026-05-21 — Dibuat untuk melengkapi B1 cryptoIndexedDB recovery flow (BATCH A)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useSecurityStore } from '../../../shared/store/useSecurityStore';
import { useAuthStore } from '../../../shared/store/authStore';
import { useToastStore } from '../../../shared/store/toastStore';
import {
  Shield,
  KeyRound,
  Copy,
  Printer,
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';

type PageState = 'overview' | 'confirm_generate' | 'show_key' | 'verify_key';

export function SecuritySettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  const generateRecoveryKey = useSecurityStore((s) => s.generateRecoveryKey);

  const [pageState, setPageState] = useState<PageState>('overview');
  const [generatedKey, setGeneratedKey] = useState('');
  const [verifyInput, setVerifyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState<boolean | null>(null);

  useEffect(() => {
    // Cek apakah recovery key sudah pernah di-generate sebelumnya
    import('../../../shared/api/db').then(({ db }) => {
      db.keyval.get('recovery_key_hash').then((record) => {
        setHasExistingKey(!!record?.value);
      }).catch(() => setHasExistingKey(false));
    });
  }, []);

  const handleGenerateKey = async () => {
    setIsLoading(true);
    try {
      const newKey = await generateRecoveryKey();
      // Format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
      const formatted = newKey.match(/.{1,4}/g)?.join('-') || newKey;
      setGeneratedKey(formatted);
      setPageState('show_key');
      setHasExistingKey(true);
    } catch (err) {
      addToast('Gagal generate Recovery Key. Coba lagi.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
      addToast('Recovery Key disalin ke clipboard.', 'success');
    });
  };

  const handlePrint = () => {
    const printContent = `
      <html><body style="font-family:monospace;padding:32px;max-width:480px;margin:auto">
        <h2 style="text-align:center;margin-bottom:8px">PSA Jewellery</h2>
        <h3 style="text-align:center;color:#555;margin-top:0">Recovery Key — SIMPAN AMAN</h3>
        <hr/>
        <p style="font-size:11px;color:#777">Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p style="font-size:11px;color:#777">Akun: ${user?.name || 'Owner'}</p>
        <div style="background:#f5f5f5;border:2px dashed #ccc;padding:24px;margin:16px 0;text-align:center;letter-spacing:3px;font-size:18px;font-weight:bold">
          ${generatedKey}
        </div>
        <p style="font-size:11px;color:#c00;font-weight:bold">⚠ Simpan di tempat yang aman dan rahasia.</p>
        <p style="font-size:11px;color:#c00">Jangan bagikan kepada siapapun. Ini adalah satu-satunya cara memulihkan akses jika PIN lupa.</p>
        <hr/>
        <p style="font-size:10px;color:#aaa;text-align:center">PSA Business Suite — Recovery Key</p>
      </body></html>
    `;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(printContent);
      w.document.close();
      w.focus();
      w.print();
    }
  };

  const handleVerifyAndFinish = () => {
    const rawInput = verifyInput.replace(/-/g, '').toUpperCase();
    const rawKey = generatedKey.replace(/-/g, '');
    if (rawInput === rawKey) {
      addToast('Recovery Key berhasil diverifikasi dan disimpan.', 'success');
      setPageState('overview');
      setGeneratedKey('');
      setVerifyInput('');
    } else {
      addToast('Kunci tidak cocok. Pastikan Anda menyalin dengan benar.', 'error');
    }
  };

  return (
    <div
      data-component-id="security-settings-page"
      data-error-domain="security"
      className="min-h-screen bg-stone-50"
    >
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: '/settings' })}
          className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-emerald-600" />
          <h1 className="font-bold text-stone-900">Keamanan Sistem</h1>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* ── OVERVIEW STATE ── */}
        {pageState === 'overview' && (
          <>
            {/* Status Indikator */}
            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${hasExistingKey ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              {hasExistingKey === null ? (
                <RefreshCw size={20} className="text-stone-400 animate-spin" />
              ) : hasExistingKey ? (
                <CheckCircle size={20} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              )}
              <div>
                <p className={`font-bold text-sm ${hasExistingKey ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {hasExistingKey === null
                    ? 'Memeriksa status...'
                    : hasExistingKey
                    ? 'Recovery Key sudah terdaftar di perangkat ini.'
                    : 'Belum ada Recovery Key. Sangat disarankan untuk membuat sekarang.'}
                </p>
                {hasExistingKey && (
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Jika lupa PIN, gunakan Recovery Key untuk memulihkan akses tanpa kehilangan data.
                  </p>
                )}
              </div>
            </div>

            {/* Recovery Key Card */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="p-5 border-b border-stone-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-stone-900">Recovery Key</h2>
                  <p className="text-xs text-stone-500">Kunci darurat untuk reset PIN tanpa kehilangan data</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2 text-sm text-stone-600">
                  <p className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold mt-0.5">1.</span>
                    Recovery Key <strong>hanya ditampilkan sekali</strong> saat dibuat.
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold mt-0.5">2.</span>
                    Catat dan simpan di tempat <strong>fisik yang aman</strong> (bukan di HP).
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold mt-0.5">3.</span>
                    PSA <strong>tidak menyimpan</strong> kunci ini di server — tidak ada yang bisa pulihkan untuk Anda.
                  </p>
                </div>
                <button
                  onClick={() => setPageState('confirm_generate')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2"
                >
                  <KeyRound size={18} />
                  {hasExistingKey ? 'Buat Recovery Key Baru' : 'Buat Recovery Key Sekarang'}
                </button>
                {hasExistingKey && (
                  <p className="text-xs text-center text-stone-400">
                    Membuat kunci baru akan menonaktifkan kunci lama.
                  </p>
                )}
              </div>
            </div>

            {/* PIN Info Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-stone-100 text-stone-600 rounded-xl flex items-center justify-center">
                  <Lock size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-stone-900">PIN Kasir</h2>
                  <p className="text-xs text-stone-500">PIN 6 digit untuk membuka sesi harian</p>
                </div>
              </div>
              <p className="text-sm text-stone-600">
                Untuk mengganti PIN, kunjungi menu <strong>Manajemen Pegawai</strong> di halaman Pengaturan,
                pilih nama Anda, lalu pilih "Ubah PIN".
              </p>
            </div>
          </>
        )}

        {/* ── CONFIRM GENERATE STATE ── */}
        {pageState === 'confirm_generate' && (
          <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
            <div className="p-5 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              <h2 className="font-bold text-amber-900">Konfirmasi Generate Recovery Key</h2>
            </div>
            <div className="p-5 space-y-4">
              {hasExistingKey && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm font-bold text-red-700">
                    ⚠ Kunci lama akan langsung tidak berlaku setelah kunci baru dibuat.
                  </p>
                </div>
              )}
              <div className="space-y-2 text-sm text-stone-700">
                <p>Pastikan Anda siap:</p>
                <p className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-500" />
                  Punya kertas dan pulpen untuk mencatat
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-500" />
                  Atau printer untuk mencetak
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-500" />
                  Waktu 2–3 menit tanpa gangguan
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPageState('overview')}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleGenerateKey}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <KeyRound size={18} />}
                  {isLoading ? 'Membuat...' : 'Lanjut, Buat Kunci'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SHOW KEY STATE ── */}
        {pageState === 'show_key' && generatedKey && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800 font-medium">
                Recovery Key berhasil dibuat. <strong>Catat kunci di bawah ini sekarang.</strong> Kunci ini tidak akan ditampilkan lagi setelah halaman ditutup.
              </p>
            </div>

            <div className="bg-white rounded-2xl border-2 border-dashed border-stone-300 overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                <span className="text-sm font-bold text-stone-700 uppercase tracking-wide">Recovery Key Anda</span>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-stone-400 hover:text-stone-700 p-1"
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="px-5 py-6 text-center">
                {showKey ? (
                  <p className="font-mono text-xl font-bold tracking-[0.15em] text-stone-900 break-all">
                    {generatedKey}
                  </p>
                ) : (
                  <p className="font-mono text-xl text-stone-300 tracking-[0.15em]">
                    {'•'.repeat(39)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopy}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${hasCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'}`}
              >
                {hasCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
                {hasCopied ? 'Disalin!' : 'Salin'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-sm transition-colors"
              >
                <Printer size={16} />
                Cetak
              </button>
            </div>

            <button
              onClick={() => {
                setShowKey(true);
                setPageState('verify_key');
              }}
              className="w-full py-3.5 bg-brand-900 text-gold-500 font-bold rounded-xl transition-colors hover:bg-brand-800 active:scale-95"
            >
              Sudah Saya Catat — Verifikasi Kunci
            </button>
          </div>
        )}

        {/* ── VERIFY KEY STATE ── */}
        {pageState === 'verify_key' && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-100">
              <h2 className="font-bold text-stone-900">Verifikasi Recovery Key</h2>
              <p className="text-sm text-stone-500 mt-1">
                Ketik ulang kunci yang sudah Anda catat untuk memastikan tidak ada kesalahan.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX-..."
                className="w-full p-4 border border-stone-200 rounded-xl font-mono text-sm tracking-widest focus:ring-2 focus:ring-blue-400 outline-none uppercase text-center"
                maxLength={50}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setPageState('show_key')}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors text-sm"
                >
                  Kembali Lihat Kunci
                </button>
                <button
                  onClick={handleVerifyAndFinish}
                  disabled={verifyInput.replace(/-/g, '').length < 8}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
                >
                  Konfirmasi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
