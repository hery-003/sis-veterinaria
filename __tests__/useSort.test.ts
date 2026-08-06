import { renderHook, act } from '@testing-library/react';
import useSort from '../src/hooks/useSort';

describe('useSort', () => {
  const items = [
    { id: 3, name: 'Charlie', age: 5 },
    { id: 1, name: 'Alice', age: 3 },
    { id: 2, name: 'Bob', age: 7 },
  ];

  it('returns unsorted items when no orderBy is set', () => {
    const { result } = renderHook(() => useSort(items));
    expect(result.current.sortedItems).toEqual(items);
  });

  it('sorts items by string field in ascending order', () => {
    const { result } = renderHook(() => useSort(items, 'name', 'asc'));
    expect(result.current.sortedItems[0].name).toBe('Alice');
    expect(result.current.sortedItems[1].name).toBe('Bob');
    expect(result.current.sortedItems[2].name).toBe('Charlie');
  });

  it('sorts items by string field in descending order', () => {
    const { result } = renderHook(() => useSort(items, 'name', 'desc'));
    expect(result.current.sortedItems[0].name).toBe('Charlie');
    expect(result.current.sortedItems[2].name).toBe('Alice');
  });

  it('sorts items by numeric field', () => {
    const { result } = renderHook(() => useSort(items, 'age', 'asc'));
    expect(result.current.sortedItems[0].age).toBe(3);
    expect(result.current.sortedItems[1].age).toBe(5);
    expect(result.current.sortedItems[2].age).toBe(7);
  });

  it('toggles sort order on handleSort', () => {
    const { result } = renderHook(() => useSort(items));
    act(() => result.current.handleSort('name'));
    expect(result.current.orderBy).toBe('name');
    expect(result.current.order).toBe('asc');
    expect(result.current.sortedItems[0].name).toBe('Alice');

    act(() => result.current.handleSort('name'));
    expect(result.current.order).toBe('desc');
    expect(result.current.sortedItems[0].name).toBe('Charlie');
  });

  it('changes to asc when sorting new column', () => {
    const { result } = renderHook(() => useSort(items, 'name', 'desc'));
    act(() => result.current.handleSort('age'));
    expect(result.current.orderBy).toBe('age');
    expect(result.current.order).toBe('asc');
  });

  it('places null values at the end', () => {
    const itemsWithNull = [
      { id: 1, name: 'A' },
      { id: 2, name: null },
      { id: 3, name: 'B' },
    ];
    const { result } = renderHook(() => useSort(itemsWithNull, 'name', 'asc'));
    expect(result.current.sortedItems[2].name).toBeNull();
    expect(result.current.sortedItems[0].name).toBe('A');
    expect(result.current.sortedItems[1].name).toBe('B');
  });

  it('uses custom comparator when provided', () => {
    const customComparator = (a, b, key) => {
      if (key === 'age') return b.age - a.age;
      return 0;
    };
    const { result } = renderHook(() => useSort(items, 'age', 'asc', customComparator));
    expect(result.current.sortedItems[0].age).toBe(7);
    expect(result.current.sortedItems[2].age).toBe(3);
  });

  it('returns empty array when items is null', () => {
    const { result } = renderHook(() => useSort(null));
    expect(result.current.sortedItems).toBeNull();
  });
});
