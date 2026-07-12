/**
 * hooks/useLocalStorage.js  [Phase 6]
 *
 * Synced localStorage state hook.
 * Usage: const [token, setToken] = useLocalStorage('token', null);
 */
import { useState } from 'react';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (valueToStore === null || valueToStore === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (err) {
      console.warn(`useLocalStorage: failed to set "${key}"`, err);
    }
  };

  return [storedValue, setValue];
}
