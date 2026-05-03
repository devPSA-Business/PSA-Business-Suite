import { logger } from '@lib/logger';
import React, { useState, useEffect } from 'react';
import { X, Save, Edit2 } from 'lucide-react';
import { StockItem } from '../../../shared/api/db';
import { DIContainer } from '@infrastructure/di/Container';
import { StockHistoryViewer } from './StockHistoryViewer';
import { useAuthStore } from '../../../shared/store/authStore';
import { useToastStore } from '../../../shared/store/toastStore';

interface InventoryItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string | null;
}

export const InventoryItemDetailModal: React.FC<InventoryItemDetailModalProps> = ({ isOpen, onClose, itemId }) => {
  const [item, setItem] = useState<StockItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<StockItem>>({});
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (itemId) {
      DIContainer.liveQueries.observeProducts().then((items) => {
        const found = items.find(i => i.id === itemId);
        setItem(found || null);
      });
    }
  }, [itemId]);

  const handleSave = async () => {
    if (itemId && item && user) {
      try {
        await DIContainer.updateProductUseCase.execute({
          id: itemId,
          name: formData.name ?? item.name,
          category: formData.category ?? item.category,
          price: formData.price ?? item.price,
          cost: formData.cost ?? item.cost,
          barcode: formData.barcode ?? item.barcode,
          userId: user.name,
          userRole: user.role
        });
        setItem(prev => prev ? { ...prev, ...formData } : null);
        setIsEditing(false);
        addToast('Produk berhasil diperbarui', 'success');
      } catch (error) {
        addToast('Gagal memperbarui produk', 'error');
        logger.error(error);
      }
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-900">Detail Produk: {item.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-stone-500">Barcode</label>
            <p className="font-mono">{item.barcode}</p>
          </div>
          <div>
            <label className="text-sm text-stone-500">Kategori</label>
            <p>{item.category}</p>
          </div>
          <div>
            <label className="text-sm text-stone-500">Harga</label>
            {isEditing ? (
              <input 
                type="number" 
                value={formData.price ?? item.price} 
                onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                className="w-full border rounded p-1"
              />
            ) : (
              <p>Rp {item.price.toLocaleString()}</p>
            )}
          </div>
          <div>
            <label className="text-sm text-stone-500">Stok</label>
            {isEditing ? (
              <input 
                type="number" 
                value={formData.quantity ?? item.quantity} 
                onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
                className="w-full border rounded p-1"
              />
            ) : (
              <p>{item.quantity}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {isEditing ? (
            <button onClick={handleSave} className="flex items-center gap-2 bg-gold-500 text-white px-4 py-2 rounded">
              <Save className="w-4 h-4" /> Simpan
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-brand-900 text-white px-4 py-2 rounded">
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          )}
        </div>

        <StockHistoryViewer stockId={item.id} />
      </div>
    </div>
  );
};
