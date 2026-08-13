import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "rim-genie:";

export function usePersistedState<T>(
  key: string,
  fallback: T,
  revive: (stored: unknown) => T | null,
) {
  const [value, setValue] = useState<T>(fallback);

  const reviveRef = useRef(revive);
  reviveRef.current = revive;

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(PREFIX + key);
    } catch {
      return; 
    }
    if (raw === null) return;
    try {
      const restored = reviveRef.current(JSON.parse(raw));
      if (restored !== null) setValue(restored);
    } catch {
      window.localStorage.removeItem(PREFIX + key);
    }
  }, [key]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(PREFIX + key, JSON.stringify(next));
      } catch {
        // Quota exceeded or storage blocked — the value still applies for this session.
      }
    },
    [key],
  );

  return [value, set] as const;
}
