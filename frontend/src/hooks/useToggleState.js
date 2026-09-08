import { useCallback, useState } from "react";

export default function useToggleState(initialValue = "") {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(
    (nextValue) => {
      setValue((prev) => (prev === nextValue ? initialValue : nextValue));
    },
    [initialValue]
  );

  const reset = useCallback(() => setValue(initialValue), [initialValue]);

  return {
    value,
    setValue,
    toggle,
    reset
  };
}

