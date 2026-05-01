import React, { useState, useEffect } from 'react';
import { db } from '../../../shared/api/db';

const BRANDS = [
  { code: 'XUP', label: 'Xuping' },
  { code: 'YAX', label: 'Yaxia' },
  { code: 'MEI', label: 'Meilyn' },
  { code: 'AMK', label: 'AMK Titanium' },
  { code: 'RHO', label: 'Rhodium' },
];

const CATEGORIES = [
  { code: 'CIN', label: 'Cincin' },
  { code: 'ANT', label: 'Anting' },
  { code: 'KAL', label: 'Kalung' },
  { code: 'GLT', label: 'Gelang Tangan' },
  { code: 'GLK', label: 'Gelang Kaki' },
  { code: 'CPL', label: 'Couple Set' },
  { code: 'FST', label: 'Full Set' },
];

const COLORS = [
  { code: 'GLD', label: 'Gold/Kuning' },
  { code: 'RGD', label: 'Rose Gold' },
  { code: 'SLV', label: 'Silver' },
  { code: 'TTN', label: 'Two-Tone' },
  { code: 'BLK', label: 'Black' },
  { code: 'MCL', label: 'Multicolor' },
];

const STONES = [
  { code: 'PLN', label: 'Polos' },
  { code: 'ZRC', label: 'Zirkon' },
  { code: 'CRY', label: 'Kristal' },
  { code: 'PRL', label: 'Mutiara' },
  { code: 'FLR', label: 'Floral' },
  { code: 'GEO', label: 'Geometrik' },
  { code: 'NM', label: 'Nama/Huruf' },
  { code: 'ANM', label: 'Motif Hewan' },
  { code: 'BTK', label: 'Batik/Etnik' },
];

interface SkuGeneratorProps {
  onBarcodeGenerated: (barcode: string) => void;
  onNameSuggested?: (name: string) => void;
}

export function SkuGenerator({ onBarcodeGenerated, onNameSuggested }: SkuGeneratorProps) {
  const [brand, setBrand] = useState('XUP');
  const [category, setCategory] = useState('CIN');
  const [color, setColor] = useState('GLD');
  const [size, setSize] = useState('17');
  const [stone, setStone] = useState('ZRC');
  const [sequence, setSequence] = useState('001');

  useEffect(() => {
    // Attempt to calculate next sequence automatically
    const baseSku = `${brand}-${category}-${color}-${size}-${stone}`;
    db.stock.where('barcode').startsWith(baseSku).toArray().then(items => {
      if (items.length > 0) {
        let maxSeq = 0;
        for (const item of items) {
          const parts = item.barcode.split('-');
          if (parts.length === 6) {
            const seqInfo = parseInt(parts[5], 10);
            if (!isNaN(seqInfo) && seqInfo > maxSeq) {
              maxSeq = seqInfo;
            }
          }
        }
        setSequence((maxSeq + 1).toString().padStart(3, '0'));
      } else {
        setSequence('001');
      }
    }).catch(e => console.error(e));

    // Suggest Name
    const brandLabel = BRANDS.find(b => b.code === brand)?.label;
    const catLabel = CATEGORIES.find(c => c.code === category)?.label;
    const colorLabel = COLORS.find(c => c.code === color)?.label;
    const stoneLabel = STONES.find(c => c.code === stone)?.label;
    
    if (onNameSuggested && brandLabel && catLabel && colorLabel && stoneLabel) {
      onNameSuggested(`${catLabel} ${brandLabel} ${colorLabel} ${size} ${stoneLabel}`);
    }

  }, [brand, category, color, size, stone]);

  useEffect(() => {
    onBarcodeGenerated(`${brand}-${category}-${color}-${size}-${stone}-${sequence}`);
  }, [brand, category, color, size, stone, sequence, onBarcodeGenerated]);

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mt-2 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase">Brand</label>
          <select value={brand} onChange={e => setBrand(e.target.value)} className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand-900/20">
            {BRANDS.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase">Kategori</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand-900/20">
            {CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase">Warna</label>
          <select value={color} onChange={e => setColor(e.target.value)} className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand-900/20">
            {COLORS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase">Ukuran</label>
          <input type="text" value={size} onChange={e => setSize(e.target.value.toUpperCase())} className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand-900/20" placeholder="17 / M" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase">Motif</label>
          <select value={stone} onChange={e => setStone(e.target.value)} className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand-900/20">
            {STONES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase">Seq</label>
          <input type="text" value={sequence} onChange={e => setSequence(e.target.value)} className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-brand-900/20" />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
        <span className="text-xs font-bold text-stone-500 uppercase">Preview SKU:</span>
        <span className="font-mono text-sm font-black text-brand-900 bg-brand-50 px-2 py-1 rounded">
          {brand}-{category}-{color}-{size}-{stone}-{sequence}
        </span>
      </div>
    </div>
  );
}
