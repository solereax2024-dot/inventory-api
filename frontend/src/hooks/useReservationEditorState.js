import { useCallback, useEffect, useRef, useState } from "react";

export default function useReservationEditorState() {
  const [reservationEditors, setReservationEditors] = useState({});
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [mopOtherDrafts, setMopOtherDrafts] = useState({});
  const [priceDrafts, setPriceDrafts] = useState({});
  const [downpaymentDrafts, setDownpaymentDrafts] = useState({});
  const [balanceDrafts, setBalanceDrafts] = useState({});
  const [reservationSavedMap, setReservationSavedMap] = useState({});
  const reservationSavedTimersRef = useRef({});

  const markReservationSaved = useCallback((orderId, field) => {
    if (!field) return;
    const key = `${orderId}:${field}`;
    const existingTimer = reservationSavedTimersRef.current[key];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }
    setReservationSavedMap((prev) => ({ ...prev, [key]: true }));
    reservationSavedTimersRef.current[key] = window.setTimeout(() => {
      setReservationSavedMap((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      delete reservationSavedTimersRef.current[key];
    }, 1600);
  }, []);

  const isReservationSaved = useCallback(
    (orderId, field) => Boolean(reservationSavedMap[`${orderId}:${field}`]),
    [reservationSavedMap]
  );

  const isReservationEditorOpen = useCallback(
    (orderId, field) => Boolean(reservationEditors?.[orderId]?.[field]),
    [reservationEditors]
  );

  const setReservationEditorOpen = useCallback((orderId, field, isOpen) => {
    setReservationEditors((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [field]: isOpen
      }
    }));
  }, []);

  const clearReservationStateForOrder = useCallback((orderId) => {
    setReservationEditors((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setMopOtherDrafts((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setDownpaymentDrafts((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setBalanceDrafts((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setReservationSavedMap((prev) => {
      const next = { ...prev };
      ["status", "courier", "mop", "mopOther", "price", "downpayment", "balance"].forEach((field) => {
        const key = `${orderId}:${field}`;
        delete next[key];
        const timerId = reservationSavedTimersRef.current[key];
        if (timerId) {
          window.clearTimeout(timerId);
          delete reservationSavedTimersRef.current[key];
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const rowElement = event.target.closest("[data-reservation-row-id]");
      const clickedOrderId = rowElement?.getAttribute("data-reservation-row-id");
      setReservationEditors((prev) => {
        const entries = Object.entries(prev || {});
        if (entries.length === 0) {
          return prev;
        }
        if (!clickedOrderId) {
          return {};
        }
        const next = Object.fromEntries(entries.filter(([orderId]) => String(orderId) === String(clickedOrderId)));
        return Object.keys(next).length === entries.length ? prev : next;
      });
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => () => {
    Object.values(reservationSavedTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
  }, []);

  return {
    reservationEditors,
    setReservationEditors,
    updatingOrderId,
    setUpdatingOrderId,
    mopOtherDrafts,
    setMopOtherDrafts,
    priceDrafts,
    setPriceDrafts,
    downpaymentDrafts,
    setDownpaymentDrafts,
    balanceDrafts,
    setBalanceDrafts,
    reservationSavedMap,
    setReservationSavedMap,
    markReservationSaved,
    isReservationSaved,
    isReservationEditorOpen,
    setReservationEditorOpen,
    clearReservationStateForOrder
  };
}

