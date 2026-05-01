import React from 'react';
import * as LucideIcons from 'lucide-react';
import { QuickActionTile } from '../../../domain/models/Tile';
import { cn } from '../../../lib/utils';

interface TileButtonProps {
  tile: QuickActionTile;
  onClick: () => void;
  className?: string;
}

export const TileButton: React.FC<TileButtonProps> = React.memo(({ tile, onClick, className }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[tile.iconName] || LucideIcons.HelpCircle;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-2 p-4 bg-white border border-stone-200 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-900/30 transition-all active:scale-95 overflow-hidden",
        className
      )}
    >
      <div className="w-12 h-12 flex items-center justify-center bg-stone-50 rounded-xl text-stone-600 group-hover:bg-brand-50 group-hover:text-brand-900 transition-colors">
        <Icon size={24} />
      </div>
      <span className="text-xs font-bold text-stone-700 group-hover:text-brand-900 transition-colors text-center line-clamp-1">
        {tile.label}
      </span>
      
      {tile.shortcutKey && (
        <span className="absolute top-2 right-2 text-[8px] font-black text-stone-300 group-hover:text-brand-900/30 transition-colors">
          {tile.shortcutKey}
        </span>
      )}
      
      {tile.isLocked && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-900/10 group-hover:bg-brand-900/30 transition-colors" />
      )}
    </button>
  );
});

TileButton.displayName = 'TileButton';
