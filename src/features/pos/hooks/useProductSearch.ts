import { useLiveQuery } from 'dexie-react-hooks';
import { DIContainer } from '@infrastructure/di/Container';

export function useProductSearch(searchQuery: string, category: string = 'All') {
  const products = useLiveQuery(
    () => DIContainer.liveQueries.searchProducts(searchQuery, category),
    [searchQuery, category]
  );

  return { products: products ?? [] };
}
