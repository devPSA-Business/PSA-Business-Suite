import { useState, useEffect } from 'react';
import { BackButton } from '../../shared/components/BackButton';
import { Users, UserPlus, Shield, Key, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';
import { db, User } from '../../shared/api/db';
import { UserRole } from '../../domain/models/User';
import { useToastStore } from '../../shared/store/toastStore';
import { hashPin, useSecurityStore } from '../../shared/store/useSecurityStore';
import { useAuthStore } from '../../shared/store/authStore';

export function EmployeesPage() {
  const { addToast } = useToastStore();
  const currentUser = useAuthStore(state => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    role: UserRole.CASHIER,
    branchId: 'HQ',
    pin: '',
    confirmPin: ''
  });

  const fetchUsers = useCallback(async () => {
    try {
      const allUsers = await db.users.toArray();
      setUsers(allUsers);
    } catch (err) {
      addToast('Gagal memuat data pegawai.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.pin !== formData.confirmPin) {
      addToast('PIN tidak cocok.', 'error');
      return;
    }

    if (formData.pin.length !== 6 && !editingUser) {
      addToast('PIN harus 6 digit angka.', 'error');
      return;
    }

    try {
      const generatedId = `USR-${Date.now()}`;
      const targetUserId = editingUser ? editingUser.id : generatedId;
      
      const pinHash = formData.pin ? await hashPin(formData.pin, targetUserId) : (editingUser?.pinHash || '');
      
      if (editingUser) {
        await db.users.update(editingUser.id, {
          name: formData.name,
          role: formData.role,
          branchId: formData.branchId,
          pinHash: pinHash
        });
        
        // Auto-enroll user in local device crypto if PIN is updated
        if (formData.pin) {
           await useSecurityStore.getState().authorizeUserLocal(editingUser.id, formData.pin);
        }
        addToast('Data pegawai diperbarui.', 'success');
      } else {
        const newUser: User = {
          id: targetUserId,
          name: formData.name,
          role: formData.role,
          branchId: formData.branchId,
          pinHash: pinHash,
          status: 'ACTIVE',
          createdAt: Date.now()
        };
        await db.users.add(newUser);
        // Auto-enroll new user in local device crypto
        await useSecurityStore.getState().authorizeUserLocal(targetUserId, formData.pin);
        
        addToast('Pegawai baru ditambahkan dan diotorisasi di perangkat ini.', 'success');
      }
      
      resetForm();
      fetchUsers();
    } catch (err) {
      addToast('Gagal menyimpan data.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      addToast('Anda tidak dapat menghapus akun Anda sendiri.', 'error');
      return;
    }

    if (!window.confirm('Hapus pegawai ini secara permanen?')) return;

    try {
      await db.users.delete(id);
      addToast('Pegawai dihapus.', 'success');
      fetchUsers();
    } catch (err) {
      addToast('Gagal menghapus pegawai.', 'error');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', role: UserRole.CASHIER, branchId: 'HQ', pin: '', confirmPin: '' });
    setIsAdding(false);
    setEditingUser(null);
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      role: user.role,
      branchId: user.branchId || 'HQ',
      pin: '',
      confirmPin: ''
    });
    setIsAdding(true);
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <BackButton />
        <div className="bg-white p-12 rounded-3xl border border-stone-200 shadow-sm">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-brand-900 mb-2">Akses Ditolak</h1>
          <p className="text-stone-500">Hanya Administrator yang dapat mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <BackButton />
          <h1 className="text-3xl font-serif font-bold text-brand-900 mt-4">Manajemen Pegawai</h1>
          <p className="text-stone-500">Kelola akses dan peran untuk seluruh tim Anda.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-900 text-gold-500 font-bold rounded-2xl shadow-lg shadow-brand-900/20 hover:bg-brand-800 transition-all active:scale-95"
          >
            <UserPlus size={20} />
            Tambah Pegawai
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl border-2 border-brand-900/10 shadow-xl mb-8 animate-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-bold text-brand-900 mb-6 flex items-center gap-2">
            {editingUser ? <Edit2 size={20} /> : <UserPlus size={20} />}
            {editingUser ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}
          </h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900/20 outline-none"
                  placeholder="Contoh: Ahmad Kasir"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Peran (Role)</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900/20 outline-none"
                >
                  <option value="CASHIER">Cashier (Akses POS Saja)</option>
                  <option value="MANAGER">Manager (Akses Laporan & Stok)</option>
                  <option value="ADMIN">Administrator (Semua Akses)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Cabang (Branch)</label>
                <select
                  value={formData.branchId}
                  onChange={e => setFormData(f => ({ ...f, branchId: e.target.value }))}
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900/20 outline-none"
                >
                  <option value="HQ">Headquarters (Pusat)</option>
                  <option value="CABANG-01">Cabang 01 (Jakarta)</option>
                  <option value="CABANG-02">Cabang 02 (Surabaya)</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
                  {editingUser ? 'PIN Baru (Kosongkan jika tidak diubah)' : 'PIN (6 Digit Angka)'}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  pattern="\d{6}"
                  required={!editingUser}
                  value={formData.pin}
                  onChange={e => setFormData(f => ({ ...f, pin: e.target.value }))}
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900/20 outline-none"
                  placeholder="123456"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Konfirmasi PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  pattern="\d{6}"
                  required={!editingUser || formData.pin !== ''}
                  value={formData.confirmPin}
                  onChange={e => setFormData(f => ({ ...f, confirmPin: e.target.value }))}
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-900/20 outline-none"
                  placeholder="123456"
                />
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 text-stone-500 font-bold hover:bg-stone-50 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-brand-900 text-gold-500 font-bold rounded-xl shadow-lg shadow-brand-900/10 hover:bg-brand-800 transition-all"
              >
                {editingUser ? 'Simpan Perubahan' : 'Daftarkan Pegawai'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                user.role === 'ADMIN' ? 'bg-purple-50 text-purple-600' :
                user.role === 'MANAGER' ? 'bg-blue-50 text-blue-600' :
                'bg-stone-50 text-stone-600'
              }`}>
                {user.role === 'ADMIN' ? <Shield size={24} /> : <Users size={24} />}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(user)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-stone-400 hover:text-brand-900 hover:bg-stone-50 rounded-lg transition-colors"
                  title="Edit Pegawai"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hapus Pegawai"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-1">{user.name}</h3>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                user.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
                'bg-stone-100 text-stone-600'
              }`}>
                {user.role}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-gold-100 text-gold-700">
                {user.branchId || 'HQ'}
              </span>
              <span className="text-xs text-stone-400 font-medium">• ID: {user.id}</span>
            </div>
            <div className="pt-4 border-t border-stone-50 flex items-center justify-between text-stone-400">
              <div className="flex items-center gap-1.5 text-xs">
                <Key size={14} />
                <span>PIN Terdaftar</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Check size={14} className="text-green-500" />
                <span>Aktif</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && !isLoading && (
        <div className="text-center py-20 bg-stone-50 rounded-[3rem] border-2 border-dashed border-stone-200">
          <Users size={48} className="mx-auto text-stone-300 mb-4" />
          <p className="text-stone-500 font-medium">Belum ada pegawai terdaftar.</p>
        </div>
      )}
    </div>
  );
}
