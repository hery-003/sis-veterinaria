import { useState, useMemo, useCallback } from 'react';

type SortOrder = 'asc' | 'desc';

export default function useSort<T extends Record<string, any>>(
  items: T[],
  defaultOrderBy: string | null = null,
  defaultOrder: SortOrder = 'asc',
  customComparator?: (a: T, b: T, key: string) => number
) {
  const [orderBy, setOrderBy] = useState<string | null>(defaultOrderBy);
  const [order, setOrder] = useState<SortOrder>(defaultOrder);

  const handleSort = useCallback((key: string) => {
    setOrderBy((prev) => {
      setOrder((o) => (prev === key ? (o === 'asc' ? 'desc' : 'asc') : 'asc'));
      return key;
    });
  }, []);

  const sortedItems = useMemo(() => {
    if (!orderBy || !items) return items;
    return [...items].sort((a, b) => {
      if (customComparator) {
        return order === 'asc' ? customComparator(a, b, orderBy) : -customComparator(a, b, orderBy);
      }
      const aVal = a[orderBy];
      const bVal = b[orderBy];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal, 'es', { sensitivity: 'base' });
        return order === 'asc' ? cmp : -cmp;
      }
      return order === 'asc' ? (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) : (aVal < bVal ? 1 : aVal > bVal ? -1 : 0);
    });
  }, [items, orderBy, order, customComparator]);

  return { orderBy, order, handleSort, sortedItems };
}
