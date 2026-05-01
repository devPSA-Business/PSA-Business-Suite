import React, { useState } from 'react';
import { Plus, Trash2, Edit2, LayoutGrid, X, Save, Keyboard, Lock, Unlock } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTileStore } from '../../../shared/store/useTileStore';
import { QuickActionTile, TileDivision, TileAction } from '../../../domain/models/Tile';
import { cn } from '../../../lib/utils';

const ICON_OPTIONS = [
  'ShoppingCart', 'Repeat', 'Undo2', 'Wrench', 'ListChecks', 'Package', 
  'PackagePlus', 'Printer', 'LayoutDashboard', 'History', 'Settings', 
  'Users', 'FileText', 'CreditCard', 'Wallet', 'Calculator', 'Search',
  'Plus', 'Minus', 'Check', 'AlertCircle', 'Info', 'HelpCircle'
];

const DIVISION_OPTIONS: TileDivision[] = ['SALES', 'SERVICE', 'INVENTORY', 'ADMIN'];
const ACTION_OPTIONS: TileAction[] = ['NAVIGATE', 'EXECUTE'];

export function TileManager() {
  const { tiles, addTile, updateTile, removeTile } = useTileStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingTile, setEditingTile] = useState<Partial<QuickActionTile> | null>(null);

  const handleOpenAdd = () => {
    setEditingTile({
      label: '',
      iconName: 'ShoppingCart',
      action: 'NAVIGATE',
      target: '',
      division: 'SALES',
      isLocked: false,
      shortcutKey: '',
      order: tiles.length + 1
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (tile: QuickActionTile) => {
    setEditingTile(tile);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editingTile || !editingTile.label || !editingTile.target) return;

    if ('id' in editingTile && editingTile.id) {
      updateTile(editingTile.id, editingTile);
    } else {
      addTile(editingTile as Omit<QuickActionTile, 'id'>);
    }
    setIsEditing(false);
    setEditingTile(null);
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden mt-8">
      <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
        <div>
          <h2 className="text-xl font-bold text-stone-800">Quick Action Tiles</h2>
          <p className="text-sm text-stone-500">Kelola ubin akses cepat dan shortcut keyboard.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-gold-500 font-bold rounded-xl hover:bg-brand-800 transition-all active:scale-95 shadow-sm"
        >
          <Plus size={18} />
          Tambah Ubin
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.sort((a, b) => {
            if (a.division !== b.division) return a.division.localeCompare(b.division);
            return a.order - b.order;
          }).map((tile) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const Icon = (LucideIcons as any)[tile.iconName] || LucideIcons.HelpCircle;
            return (
              <div key={tile.id} className="p-4 border border-stone-100 bg-stone-50 rounded-xl flex items-center gap-4 group">
                <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl text-stone-600 border border-stone-200">
                  <Icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-stone-800 truncate">{tile.label}</h4>
                    {tile.isLocked && <Lock size={12} className="text-stone-400" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-stone-200 text-stone-600 rounded">
                      {tile.division}
                    </span>
                    {tile.shortcutKey && (
                      <span className="text-[10px] font-bold text-brand-900 flex items-center gap-1">
                        <Keyboard size={10} />
                        {tile.shortcutKey}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenEdit(tile)}
                    className="p-2 text-stone-400 hover:text-brand-900 hover:bg-white rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => removeTile(tile.id)}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && editingTile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-8 border-b border-stone-100 bg-stone-50/50">
              <h2 className="text-2xl font-serif font-bold text-brand-900">
                {editingTile.id ? 'Edit Ubin' : 'Tambah Ubin Baru'}
              </h2>
              <button onClick={() => setIsEditing(false)} className="w-12 h-12 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-all">
                <X size={28} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Label Ubin</label>
                  <input
                    type="text"
                    value={editingTile.label}
                    onChange={(e) => setEditingTile({ ...editingTile, label: e.target.value })}
                    className="w-full p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-brand-900 transition-all font-bold"
                    placeholder="Contoh: Kasir, Laporan..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Divisi</label>
                  <select
                    value={editingTile.division}
                    onChange={(e) => setEditingTile({ ...editingTile, division: e.target.value as TileDivision })}
                    className="w-full p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-brand-900 transition-all font-bold"
                  >
                    {DIVISION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Shortcut (F1-F12)</label>
                  <input
                    type="text"
                    value={editingTile.shortcutKey}
                    onChange={(e) => setEditingTile({ ...editingTile, shortcutKey: e.target.value })}
                    className="w-full p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-brand-900 transition-all font-bold"
                    placeholder="F1, Alt+1..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Ikon</label>
                  <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 bg-stone-50 rounded-2xl border-2 border-stone-100">
                    {ICON_OPTIONS.map(iconName => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
                      return (
                        <button
                          key={iconName}
                          onClick={() => setEditingTile({ ...editingTile, iconName })}
                          className={cn(
                            "w-12 h-12 flex items-center justify-center rounded-xl transition-all",
                            editingTile.iconName === iconName ? "bg-brand-900 text-gold-500 shadow-md" : "bg-white text-stone-400 hover:bg-stone-100"
                          )}
                        >
                          <Icon size={20} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Target (Path)</label>
                  <input
                    type="text"
                    value={editingTile.target}
                    onChange={(e) => setEditingTile({ ...editingTile, target: e.target.value })}
                    className="w-full p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:outline-none focus:border-brand-900 transition-all font-mono text-sm"
                    placeholder="/cashier, /inventory..."
                  />
                </div>

                <div className="col-span-2 flex items-center gap-3">
                  <button
                    onClick={() => setEditingTile({ ...editingTile, isLocked: !editingTile.isLocked })}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all",
                      editingTile.isLocked ? "bg-brand-900 text-gold-500" : "bg-stone-100 text-stone-500"
                    )}
                  >
                    {editingTile.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    {editingTile.isLocked ? 'Ubin Dikunci' : 'Ubin Bebas'}
                  </button>
                  <p className="text-[10px] text-stone-400 italic">Ubin yang dikunci akan memiliki indikator visual khusus.</p>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-6 py-4 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-2xl font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-4 text-gold-500 bg-brand-900 hover:bg-brand-800 rounded-2xl font-black shadow-lg shadow-brand-900/20 transition-all active:scale-95"
                >
                  Simpan Ubin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
