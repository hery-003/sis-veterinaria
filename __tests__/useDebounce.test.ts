import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../src/hooks';

jest.useFakeTimers();

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );

    rerender({ value: 'world', delay: 500 });
    expect(result.current).toBe('hello');

    act(() => { jest.advanceTimersByTime(500); });
    expect(result.current).toBe('world');
  });

  it('cancels previous timer on new value', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 500 } }
    );

    rerender({ value: 'b', delay: 500 });
    act(() => { jest.advanceTimersByTime(200); });

    rerender({ value: 'c', delay: 500 });
    act(() => { jest.advanceTimersByTime(500); });

    expect(result.current).toBe('c');
  });
});
