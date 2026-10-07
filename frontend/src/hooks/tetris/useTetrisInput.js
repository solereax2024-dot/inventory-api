import { useCallback, useRef, useEffect } from "react";
import {
  TOUCH_HARD_DROP_FLICK_DURATION_MS,
  TOUCH_HARD_DROP_FLICK_PX,
  TOUCH_SWIPE_THRESHOLD_PX,
  TOUCH_TAP_MAX_DURATION_MS,
  TOUCH_TAP_MAX_MOVE_PX,
} from "../../constants/tetris";

/**
 * useTetrisInput Hook
 *
 * Manages keyboard and touch input for the Tetris game
 *
 * Props:
 * - onMovePieceLeft: function
 * - onMovePieceRight: function
 * - onSoftDrop: function
 * - onHardDrop: function
 * - onRotateCw: function
 * - onRotateCcw: function
 * - onTogglePause: function
 * - onResetGame: function
 * - onHoldPiece: function
 * - gameStarted: boolean
 * - gameOver: boolean
 * - isPaused: boolean
 * - emitSound: function
 *
 * Returns: {
 *   handleKeyDown: function,
 *   handleBoardTouchStart: function,
 *   handleBoardTouchMove: function,
 *   handleBoardTouchEnd: function,
 *   handleBoardTouchCancel: function,
 *   focusBoard: function,
 * }
 */
export function useTetrisInput({
  onMovePieceLeft,
  onMovePieceRight,
  onSoftDrop,
  onHardDrop,
  onRotateCw,
  onRotateCcw,
  onTogglePause,
  onResetGame,
  onHoldPiece,
  gameStarted,
  gameOver,
  isPaused,
  emitSound,
}) {
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const keyPressedRef = useRef({});

  // Keyboard input handler
  const handleKeyDown = useCallback((event) => {
    if (!gameStarted || gameOver) return;

    const key = event.key.toLowerCase();

    // Prevent repeated events from key hold
    if (keyPressedRef.current[key]) return;
    keyPressedRef.current[key] = true;

    switch (key) {
      case "arrowleft":
        event.preventDefault();
        onMovePieceLeft();
        emitSound("tap");
        break;
      case "arrowright":
        event.preventDefault();
        onMovePieceRight();
        emitSound("tap");
        break;
      case "arrowdown":
        event.preventDefault();
        onSoftDrop();
        emitSound("tap");
        break;
      case " ":
        event.preventDefault();
        onHardDrop();
        emitSound("lock");
        break;
      case "z":
        event.preventDefault();
        onRotateCcw();
        emitSound("tap");
        break;
      case "x":
        event.preventDefault();
        onRotateCw();
        emitSound("tap");
        break;
      case "c":
      case "shift":
        event.preventDefault();
        onHoldPiece();
        emitSound("tap");
        break;
      case "p":
        event.preventDefault();
        onTogglePause();
        emitSound(isPaused ? "resume" : "pause");
        break;
      case "r":
        event.preventDefault();
        onResetGame();
        emitSound("reset");
        break;
      default:
        break;
    }
  }, [
    gameStarted,
    gameOver,
    onMovePieceLeft,
    onMovePieceRight,
    onSoftDrop,
    onHardDrop,
    onRotateCw,
    onRotateCcw,
    onHoldPiece,
    onTogglePause,
    onResetGame,
    isPaused,
    emitSound,
  ]);

  // Keyboard key release
  const handleKeyUp = useCallback((event) => {
    const key = event.key.toLowerCase();
    delete keyPressedRef.current[key];
  }, []);

  // Touch input handlers for mobile
  const handleBoardTouchStart = useCallback((event) => {
    if (!gameStarted || gameOver) return;

    event.preventDefault();

    const touch = event.touches?.[0];
    if (!touch) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, [gameStarted, gameOver]);

   const handleBoardTouchMove = useCallback((event) => {
     if (!gameStarted || gameOver || touchStartRef.current.time === 0) return;

     event.preventDefault();

     const touch = event.touches?.[0];
     if (!touch) return;

     const deltaX = touch.clientX - touchStartRef.current.x;
     const deltaY = touch.clientY - touchStartRef.current.y;

     // Apply separate thresholds for X and Y movement (not uniform)
     const horizontalThreshold = TOUCH_SWIPE_THRESHOLD_PX;
     const verticalThreshold = Math.max(TOUCH_SWIPE_THRESHOLD_PX, 20); // Vertical needs more movement

     // Horizontal movement detection with debounce (prevent multiple moves)
     if (Math.abs(deltaX) > horizontalThreshold && Math.abs(deltaY) < verticalThreshold) {
       if (deltaX < 0) {
         // Swipe left: move piece right
         onMovePieceRight();
         emitSound("tap");
         touchStartRef.current.x = touch.clientX; // Reset to prevent repeated moves
       } else {
         // Swipe right: move piece left
         onMovePieceLeft();
         emitSound("tap");
         touchStartRef.current.x = touch.clientX;
       }
     }

     // Vertical movement detection
     if (Math.abs(deltaY) > verticalThreshold && Math.abs(deltaX) < horizontalThreshold) {
       if (deltaY > 0) {
         // Swipe down: soft drop
         onSoftDrop();
         emitSound("tap");
         touchStartRef.current.y = touch.clientY;
       }
     }
   }, [gameStarted, gameOver, onMovePieceLeft, onMovePieceRight, onSoftDrop, emitSound]);

  const handleBoardTouchEnd = useCallback((event) => {
    if (!gameStarted || gameOver) return;

    event.preventDefault();

    const touch = event.changedTouches?.[0];
    if (!touch || touchStartRef.current.time === 0) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Flick detection: fast movement (< 300ms)
    const isFlick = deltaTime < TOUCH_HARD_DROP_FLICK_DURATION_MS;

    if (isFlick && deltaY > TOUCH_HARD_DROP_FLICK_PX) {
      // Fast downward flick: hard drop
      onHardDrop();
      emitSound("lock");
    } else if (Math.abs(deltaX) < TOUCH_TAP_MAX_MOVE_PX && Math.abs(deltaY) < TOUCH_TAP_MAX_MOVE_PX && deltaTime < TOUCH_TAP_MAX_DURATION_MS) {
      // Tap: rotate clockwise
      onRotateCw();
      emitSound("tap");
    }

    // Reset touch state
    touchStartRef.current = { x: 0, y: 0, time: 0 };
  }, [gameStarted, gameOver, onHardDrop, onRotateCw, emitSound]);

  const handleBoardTouchCancel = useCallback(() => {
    // Reset touch state on cancel
    touchStartRef.current = { x: 0, y: 0, time: 0 };
  }, []);

  const focusBoard = useCallback(() => {
    // No-op, just prevents default behavior on mouse down
  }, []);

  // Setup global keyboard listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return {
    handleKeyDown,
    handleBoardTouchStart,
    handleBoardTouchMove,
    handleBoardTouchEnd,
    handleBoardTouchCancel,
    focusBoard,
  };
}

export default useTetrisInput;

