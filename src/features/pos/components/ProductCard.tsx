import { memo } from 'react';
import { StockItem } from '../../../shared/api/db';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: StockItem;
  onAdd: (product: StockItem) => void;
}

export const ProductCard = memo(function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <button
      onClick={() => onAdd(product)}
      className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-stone-200 shadow-sm hover:shadow-lg transition-all flex flex-col h-full text-left active:scale-95 min-h-[120px] sm:min-h-[140px]"
    >
      <div className="flex-1">
        <div className="text-[10px] sm:text-xs font-medium text-stone-400 mb-1 uppercase tracking-wider">{product.category}</div>
        <h3 className="text-stone-800 font-semibold text-sm sm:text-lg leading-tight mb-1 sm:mb-2 line-clamp-2">
          {product.name}
        </h3>
      </div>
      <div className="flex items-end justify-between mt-2">
        <div className="text-brand-900 font-bold text-base sm:text-xl">
          Rp {product.price.toLocaleString('id-ID')}
        </div>
        <div className="bg-brand-900 text-gold-500 p-2 sm:p-3 rounded-lg sm:rounded-xl">
          <Plus size={20} className="sm:w-6 sm:h-6" />
        </div>
      </div>
    </button>
  );
});
