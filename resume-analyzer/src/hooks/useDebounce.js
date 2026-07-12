/**
 * hooks/useDebounce.js  [Phase 6]
 *
 * Debounces a value — useful for search inputs.
 * Usage: const debouncedQuery = useDebounce(searchQuery, 300);
 */
import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
