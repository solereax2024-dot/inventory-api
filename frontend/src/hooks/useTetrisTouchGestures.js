import { useCallback, useEffect, useRef } from "react";
import {
  TOUCH_HARD_DROP_FLICK_DURATION_MS,
  TOUCH_HARD_DROP_FLICK_PX,
  TOUCH_SWIPE_THRESHOLD_PX,
  TOUCH_TAP_MAX_DURATION_MS,
  TOUCH_TAP_MAX_MOVE_PX,
} from "../constants/tetris";

export default function useTetrisTouchGestures({
  isBlocked = false,
  isPaused = false,
  focusBoard,
  resumePausedGame,
  rotateCurrentPiece,
  movePieceHorizontal,
  softDropCurrentPiece,
  hardDropCurrentPiece,
  holdCurrentPiece,
}) {
  const UPWARD_HOLD_MIN_DISTANCE_PX = 42;
  const UPWARD_HOLD_VERTICAL_RATIO = 1.5;
  const touchGestureRef = useRef({
    activeTouchId: null,
    startX: 0,
    startY: 0,
    startTime: 0,
  });

  const handleBoardTouchStart = useCallback((event) => {
    if (isBlocked) return;

    const touch = event.touches?.[0];
    if (!touch) return;

    touchGestureRef.current = {
      activeTouchId: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };

    focusBoard(false);
  }, [focusBoard, isBlocked]);

  const handleBoardTouchMove = useCallback((event) => {
    const activeTouchId = touchGestureRef.current.activeTouchId;
    if (activeTouchId === null) return;

    const touch = Array.from(event.touches || []).find((item) => item.identifier === activeTouchId) || event.touches?.[0];
    if (!touch) return;

    const deltaX = Math.abs(touch.clientX - touchGestureRef.current.startX);
    const deltaY = Math.abs(touch.clientY - touchGestureRef.current.startY);

    if (deltaX > TOUCH_TAP_MAX_MOVE_PX || deltaY > TOUCH_TAP_MAX_MOVE_PX) {
      if (event.cancelable) event.preventDefault();
    }
  }, []);

  const handleBoardTouchEnd = useCallback((event) => {
    if (isBlocked) {
      touchGestureRef.current.activeTouchId = null;
      return;
    }

    const activeTouchId = touchGestureRef.current.activeTouchId;
    if (activeTouchId === null) return;

    const touch = Array.from(event.changedTouches || []).find((item) => item.identifier === activeTouchId) || event.changedTouches?.[0];
    if (!touch) {
      touchGestureRef.current.activeTouchId = null;
      return;
    }

    const deltaX = touch.clientX - touchGestureRef.current.startX;
    const deltaY = touch.clientY - touchGestureRef.current.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const elapsedMs = Date.now() - touchGestureRef.current.startTime;

    const isTap = absX <= TOUCH_TAP_MAX_MOVE_PX && absY <= TOUCH_TAP_MAX_MOVE_PX && elapsedMs <= TOUCH_TAP_MAX_DURATION_MS;

    if (isTap) {
      if (isPaused) {
        resumePausedGame?.();
        touchGestureRef.current.activeTouchId = null;
        return;
      }

      rotateCurrentPiece();
      touchGestureRef.current.activeTouchId = null;
      return;
    }

    if (isPaused) {
      touchGestureRef.current.activeTouchId = null;
      return;
    }

    if (absX >= absY) {
      if (absX >= TOUCH_SWIPE_THRESHOLD_PX) {
        movePieceHorizontal(deltaX > 0 ? 1 : -1);
      }
    } else if (absY >= TOUCH_SWIPE_THRESHOLD_PX) {
      const isStrictUpwardSwipe = deltaY < 0
        && absY >= UPWARD_HOLD_MIN_DISTANCE_PX
        && absY >= absX * UPWARD_HOLD_VERTICAL_RATIO;

      if (isStrictUpwardSwipe) {
        holdCurrentPiece();
      } else {
        const isHardDropFlick = absY >= TOUCH_HARD_DROP_FLICK_PX && elapsedMs <= TOUCH_HARD_DROP_FLICK_DURATION_MS;
        if (isHardDropFlick) {
          hardDropCurrentPiece();
        } else {
          softDropCurrentPiece();
        }
      }
    }

    touchGestureRef.current.activeTouchId = null;
  }, [hardDropCurrentPiece, holdCurrentPiece, isBlocked, isPaused, movePieceHorizontal, resumePausedGame, rotateCurrentPiece, softDropCurrentPiece]);

  const handleBoardTouchCancel = useCallback(() => {
    touchGestureRef.current.activeTouchId = null;
  }, []);

  useEffect(() => () => {
    // Cleanup on unmount
  }, []);

  return {
    handleBoardTouchStart,
    handleBoardTouchMove,
    handleBoardTouchEnd,
    handleBoardTouchCancel,
  };
}

