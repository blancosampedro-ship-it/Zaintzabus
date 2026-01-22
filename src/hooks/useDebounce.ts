import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores (útil en búsquedas).
 * @param value Valor a debounce
 * @param delay Delay en ms (default 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
