import { logger } from '@lib/logger';
import React, { useState, useEffect } from 'react';
import { BackButton } from '../../../shared/components/BackButton';
import { Receipt, Save, Store, MapPin, MessageSquare } from 'lucide-react';
import { useToastStore } from '../../../shared/store/toastStore';
import { db } from '../../../shared/api/db';

export function ReceiptSettingsPage() {
  const { addToast } = useToastStore();
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await db.store_profile.get('default');
        if (profile) {
          setShopName(profile.name || 'PSA JEWELLERY');
          setShopAddress(profile.address || '');
          setReceiptFooter(profile.receiptFooter || 'Terima Kasih\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.');
        }
      } catch (err) {
        logger.error("Failed to load store profile", err);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existing = await db.store_profile.get('default');
      await db.store_profile.put({
        ...(existing || { id: 'default', isSetupComplete: true }),
        name: shopName,
        address: shopAddress,
        receiptFooter: receiptFooter,
        updatedAt: Date.now()
      });
      
      addToast('Format struk berhasil disimpan', 'success');
    } catch (err) {
      logger.error("Failed to save store profile", err);
      addToast('Gagal menyimpan profil toko', 'error');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <BackButton />
      
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-brand-900 text-gold-500 rounded-2xl shadow-lg">
          <Receipt size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold text-brand-900">Format Struk</h1>
          <p className="text-stone-500">Sesuaikan identitas toko yang akan dicetak pada struk thermal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Kustomisasi */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-2">
                <Store size={16} className="text-brand-900" /> Nama Toko
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900/20 outline-none font-bold text-stone-800"
                placeholder="PSA JEWELLERY"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-2">
                <MapPin size={16} className="text-brand-900" /> Alamat & Kontak
              </label>
              <textarea
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900/20 outline-none resize-none h-24 text-sm"
                placeholder="Jl. Contoh No. 123
Telp: 0812-3456-7890"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-2">
                <MessageSquare size={16} className="text-brand-900" /> Pesan Penutup (Footer)
              </label>
              <textarea
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900/20 outline-none resize-none h-24 text-sm"
                placeholder="Terima Kasih
Barang tidak dapat ditukar."
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-brand-900 text-gold-500 font-bold rounded-xl hover:bg-brand-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md"
            >
              <Save size={20} />
              Simpan Format Struk
            </button>
          </form>
        </div>

        {/* Live Preview */}
        <div className="bg-stone-100 p-6 rounded-3xl border border-stone-200 flex flex-col items-center justify-center">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Preview Struk Thermal</h3>
          <div className="bg-white p-6 w-full max-w-[300px] shadow-md font-mono text-xs text-center text-stone-800 border-t-4 border-stone-300">
            <div className="font-bold text-base mb-1">{shopName || 'NAMA TOKO'}</div>
            <div className="whitespace-pre-wrap mb-4">{shopAddress || 'Alamat Toko\nTelp: -'}</div>
            <div className="border-b border-dashed border-stone-300 mb-4"></div>
            <div className="text-left mb-4">
              <div>No  : TRX-12345678</div>
              <div>Tgl : 19/04/2026 10:14</div>
              <div>Kasir: Admin</div>
            </div>
            <div className="border-b border-dashed border-stone-300 mb-4"></div>
            <div className="text-left mb-4">
              <div>Cincin Emas 2g</div>
              <div className="flex justify-between">
                <span>1x Rp 2.000.000</span>
                <span>Rp 2.000.000</span>
              </div>
            </div>
            <div className="border-b border-dashed border-stone-300 mb-4"></div>
            <div className="flex justify-between font-bold text-sm mb-4">
              <span>TOTAL</span>
              <span>Rp 2.000.000</span>
            </div>
            <div className="border-b border-dashed border-stone-300 mb-4"></div>
            <div className="whitespace-pre-wrap mt-4">{receiptFooter || 'Terima Kasih'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
