import { useEffect, useState } from "react";

function resolveDefaultValue(defaultValue) {
  return typeof defaultValue === "function" ? defaultValue() : defaultValue;
}

export default function useLocalStorage(key, defaultValue, { parse, serialize } = {}) {
  const [value, setValue] = useState(() => {
    const fallbackValue = resolveDefaultValue(defaultValue);

    if (typeof window === "undefined") {
      return fallbackValue;
    }

    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue === null) {
        return fallbackValue;
      }

      return parse ? parse(storedValue) : JSON.parse(storedValue);
    } catch {
      return fallbackValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const serializedValue = serialize ? serialize(value) : JSON.stringify(value);
      window.localStorage.setItem(key, serializedValue);
    } catch {
      // Ignore storage failures and keep in-memory state working.
    }
  }, [key, serialize, value]);

  return [value, setValue];
}

