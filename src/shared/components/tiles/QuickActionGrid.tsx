import React, { useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTileStore } from '../../store/useTileStore';
import { TileButton } from './TileButton';
import { TileDivision, QuickActionTile } from '../../../domain/models/Tile';
import { cn } from '../../../lib/utils';

interface QuickActionGridProps {
  division: TileDivision;
  className?: string;
  onExecute?: (tile: QuickActionTile) => void;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({ division, className, onExecute }) => {
  const navigate = useNavigate();
  const allTiles = useTileStore((state) => state.tiles);
  
  const displayTiles = useMemo(() => {
    return allTiles
      .filter((t) => t.division === division)
      .sort((a, b) => a.order - b.order);
  }, [allTiles, division]);

  const handleAction = useCallback((tile: QuickActionTile) => {
    if (tile.action === 'NAVIGATE') {
      navigate({ to: tile.target });
    } else if (tile.action === 'EXECUTE' && onExecute) {
      onExecute(tile);
    }
  }, [navigate, onExecute]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      if (isTyping) return;

      const key = event.key;
      const isAlt = event.altKey;
      
      // Construct shortcut string to match (e.g., "F1", "Alt+1")
      const shortcut = isAlt ? `Alt+${key}` : key;

      const matchingTile = displayTiles.find((t) => t.shortcutKey === shortcut);
      if (matchingTile) {
        // Prevent default browser behavior for F-keys
        if (key.startsWith('F')) {
          event.preventDefault();
        }
        handleAction(matchingTile);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayTiles, handleAction]);

  if (displayTiles.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4", className)}>
      {displayTiles.map((tile) => (
        <TileButton 
          key={tile.id} 
          tile={tile} 
          onClick={() => handleAction(tile)} 
        />
      ))}
    </div>
  );
};
