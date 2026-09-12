import { useEffect, useMemo, useState } from "react";
import { formatCountdownLabel } from "../utils/format";

export default function useCountdown(targetTime, isEnabled = true) {
  const targetMs = useMemo(() => {
    if (!targetTime) {
      return null;
    }
    const parsed = new Date(targetTime).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }, [targetTime]);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isEnabled || targetMs === null) {
      return undefined;
    }
    if (targetMs <= Date.now()) {
      setNowMs(Date.now());
      return undefined;
    }
    const tick = () => setNowMs(Date.now());
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [isEnabled, targetMs]);

  const remainingMs = targetMs === null ? null : Math.max(0, targetMs - nowMs);
  const isComplete = targetMs !== null && remainingMs === 0;

  return {
    targetMs,
    remainingMs,
    isComplete,
    label: targetMs === null ? "" : formatCountdownLabel(remainingMs)
  };
}

