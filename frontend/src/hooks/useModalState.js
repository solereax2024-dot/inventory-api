import { useCallback, useState } from "react";

export default function useModalState(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(Boolean(initialOpen));

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen
  };
}

