export type TileAction = 'NAVIGATE' | 'EXECUTE';
export type TileDivision = 'SALES' | 'SERVICE' | 'INVENTORY' | 'ADMIN';

export interface QuickActionTile {
  id: string;
  label: string;
  iconName: string;
  action: TileAction;
  target: string;
  division: TileDivision;
  isLocked: boolean;
  shortcutKey?: string;
  order: number;
}
