"use client";

import { useEffect, useState } from "react";

/**
 * Debouncing: Waiting for a period of inactivity, then firing once.
 *
 * Returns `value`, delayed by `delayMs` -- used to avoid firing a server
 * search on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
