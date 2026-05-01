export enum StockCategory {
  GOLD_JEWELLERY = 'GOLD_JEWELLERY',
  GOLD_BAR = 'GOLD_BAR',
  IMITATION = 'IMITATION',
  BUYBACK_GOLD = 'BUYBACK_GOLD',
  ACCESSORIES = 'ACCESSORIES',
}

export const StockCategoryLabels: Record<StockCategory, string> = {
  [StockCategory.GOLD_JEWELLERY]: 'Perhiasan Emas',
  [StockCategory.GOLD_BAR]: 'Logam Mulia',
  [StockCategory.IMITATION]: 'Perhiasan Imitasi',
  [StockCategory.BUYBACK_GOLD]: 'Emas Buyback',
  [StockCategory.ACCESSORIES]: 'Aksesoris',
};
