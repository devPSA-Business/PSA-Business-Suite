import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Customer } from '../../shared/api/db';
import { User, Phone, Mail, MapPin, Search, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { BackButton } from '../../shared/components/BackButton';
import { useToastStore } from '../../shared/store/toastStore';
import { useAuthStore } from '../../shared/store/authStore';
import { DIContainer } from '../../infrastructure/di/Container';
import { cn } from '../../lib/utils';

export function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const addToast = useToastStore(state => state.addToast);
  const user = useAuthStore(state => state.user);

  const customers = useLiveQuery(
    () => {
      if (!searchQuery) return DIContainer.customerRepository.findAll(user?.branchId);
      return DIContainer.customerRepository.search(searchQuery, user?.branchId);
    },
    [searchQuery, user?.branchId]
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) return;
    try {
      await DIContainer.deleteCustomerUseCase.execute(id, user?.name || 'System');
      addToast('Pelanggan berhasil dihapus.', 'success');
    } catch (error) {
      addToast('Gagal menghapus pelanggan.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userId = user?.name || 'System';

    try {
      if (editingCustomer) {
        await DIContainer.updateCustomerUseCase.execute({
          id: editingCustomer.id,
          name: formData.get('name') as string,
          phoneNumber: formData.get('phone') as string,
          email: formData.get('email') as string || undefined,
          address: formData.get('address') as string || undefined,
          userId,
        });
        addToast('Data pelanggan diperbarui.', 'success');
      } else {
        await DIContainer.createCustomerUseCase.execute({
          name: formData.get('name') as string,
          phoneNumber: formData.get('phone') as string,
          email: formData.get('email') as string || undefined,
          address: formData.get('address') as string || undefined,
          userId,
        });
        addToast('Pelanggan baru ditambahkan.', 'success');
      }
      setIsModalOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      addToast('Gagal menyimpan data pelanggan.', 'error');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <BackButton />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-brand-900">Manajemen Pelanggan</h1>
          <p className="text-stone-500">Kelola data pelanggan dan riwayat loyalitas.</p>
        </div>
        <button 
          onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
          className="bg-brand-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-800 transition-all active:scale-95 shadow-lg shadow-brand-900/20"
        >
          <Plus size={20} />
          Tambah Pelanggan
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
        <input
          type="text"
          placeholder="Cari nama atau nomor telepon..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none shadow-sm"
        />
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers?.map(customer => (
          <div key={customer.id} className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-brand-50 p-3 rounded-2xl text-brand-900">
                <User size={24} />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditingCustomer(customer); setIsModalOpen(true); }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(customer.id)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold text-brand-900 mb-4">{customer.name}</h3>
            
            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-stone-400" />
                <span>{customer.phoneNumber}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-stone-400" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-stone-400 mt-0.5" />
                  <span className="line-clamp-2">{customer.address}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-stone-100 flex justify-between items-center">
              <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                Terdaftar: {new Date(customer.createdAt).toLocaleDateString('id-ID')}
              </span>
              <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                Aktif
              </div>
            </div>
          </div>
        ))}
      </div>

      {customers?.length === 0 && (
        <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
          <User size={48} className="mx-auto text-stone-300 mb-4" />
          <h3 className="text-xl font-bold text-stone-800">Tidak ada pelanggan ditemukan</h3>
          <p className="text-stone-500 mb-6">Coba kata kunci lain atau tambah pelanggan baru.</p>
          <button
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="px-6 py-3 bg-brand-900 text-gold-500 rounded-2xl font-bold hover:bg-brand-800 transition-colors"
          >
            Tambah Pelanggan Baru
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-brand-900 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/20 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">Nama Lengkap *</label>
                <input
                  name="name"
                  required
                  defaultValue={editingCustomer?.name}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">Nomor Telepon *</label>
                <input
                  name="phone"
                  required
                  defaultValue={editingCustomer?.phoneNumber}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="Contoh: 08123456789"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">Email (Opsional)</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingCustomer?.email}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="budi@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">Alamat (Opsional)</label>
                <textarea
                  name="address"
                  defaultValue={editingCustomer?.address}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none h-24 resize-none"
                  placeholder="Alamat lengkap pelanggan..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 border border-stone-200 text-stone-600 font-bold rounded-2xl hover:bg-stone-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-brand-900 text-white font-bold rounded-2xl hover:bg-brand-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-900/20"
                >
                  <Check size={20} />
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
