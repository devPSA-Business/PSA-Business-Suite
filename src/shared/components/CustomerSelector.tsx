import { useState, useEffect, useRef } from 'react';
import { Search, Plus, User, X } from 'lucide-react';
import { Customer } from '@domain/models/Customer';
import { DIContainer } from '@infrastructure/di/Container';
import { useAuthStore } from '../store/authStore';

interface CustomerSelectorProps {
  onSelect: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

export function CustomerSelector({ onSelect, selectedCustomer }: CustomerSelectorProps) {
  const user = useAuthStore(state => state.user);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New customer form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      DIContainer.customerRepository.search(query).then((data: Customer[]) => {
        setResults(data);
        setShowDropdown(true);
      });
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [query]);

  const handleCreateCustomer = async () => {
    if (!newName || !newPhone) return;
    
    try {
      const customer = await DIContainer.createCustomerUseCase.execute({
        name: newName,
        phoneNumber: newPhone,
        email: newEmail || undefined,
        address: newAddress || undefined,
        userId: user?.name || 'System'
      });

      onSelect(customer);
      setIsCreating(false);
      setQuery('');
      
      // Reset form
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewAddress('');
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  if (selectedCustomer) {
    return (
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <div className="font-bold text-brand-900">{selectedCustomer.name}</div>
            <div className="text-sm text-brand-700">{selectedCustomer.phoneNumber}</div>
          </div>
        </div>
        <button 
          onClick={() => onSelect(null)}
          className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    );
  }

    if (isCreating) {
      return (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex justify-between items-center mb-1 sm:mb-2">
            <h3 className="font-bold text-stone-800 text-sm sm:text-base">Pelanggan Baru</h3>
            <button onClick={() => setIsCreating(false)} className="text-stone-500 hover:text-stone-700 p-1">
              <X size={20} className="sm:w-5 sm:h-5 w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-stone-500 mb-1">Nama Lengkap *</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2.5 sm:p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm sm:text-base"
                placeholder="Cth: Budi Santoso"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-stone-500 mb-1">Nomor Telepon *</label>
              <input 
                type="tel" 
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full p-2.5 sm:p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm sm:text-base"
                placeholder="Cth: 08123456789"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] sm:text-xs font-bold text-stone-500 mb-1">Email (Opsional)</label>
              <input 
                type="email" 
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-2.5 sm:p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm sm:text-base"
                placeholder="Cth: budi@email.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] sm:text-xs font-bold text-stone-500 mb-1">Alamat (Opsional)</label>
              <textarea 
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full p-2.5 sm:p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none h-20 text-sm sm:text-base"
                placeholder="Alamat lengkap..."
              />
            </div>
          </div>
          <button 
            onClick={handleCreateCustomer}
            disabled={!newName || !newPhone}
            className="w-full py-3 sm:py-2 bg-brand-900 text-gold-500 font-bold rounded-lg disabled:bg-stone-300 disabled:text-stone-500 transition-colors text-sm sm:text-base"
          >
            Simpan Pelanggan
          </button>
        </div>
      );
    }
  
    return (
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-stone-400 sm:w-[18px] sm:h-[18px] w-4 h-4" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau nomor telepon..."
            className="w-full pl-9 sm:pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm sm:text-base"
          />
        </div>

      {showDropdown && (
        <div className="absolute z-10 mt-2 w-full bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
          {results.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto">
              {results.map(customer => (
                <li 
                  key={customer.id}
                  onClick={() => {
                    onSelect(customer);
                    setShowDropdown(false);
                    setQuery('');
                  }}
                  className="p-3 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-0 flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-stone-800">{customer.name}</div>
                    <div className="text-xs text-stone-500">{customer.phoneNumber}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-stone-500 text-sm">
              Pelanggan tidak ditemukan.
            </div>
          )}
          <div className="p-2 border-t border-stone-100 bg-stone-50">
            <button 
              onClick={() => {
                setIsCreating(true);
                setShowDropdown(false);
              }}
              className="w-full py-2 flex items-center justify-center gap-2 text-brand-700 font-bold hover:bg-brand-50 rounded-lg transition-colors"
            >
              <Plus size={18} />
              Tambah Pelanggan Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
