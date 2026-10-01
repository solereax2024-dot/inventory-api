import { useCallback, useRef, useEffect } from "react";

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

    const touch = event.touches?.[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Swipe threshold: 15 pixels
    const threshold = 15;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX < 0) {
        // Swipe left: move piece right
        onMovePieceRight();
        emitSound("tap");
        touchStartRef.current.x = touch.clientX; // Update to prevent multiple moves
      } else {
        // Swipe right: move piece left
        onMovePieceLeft();
        emitSound("tap");
        touchStartRef.current.x = touch.clientX;
      }
    }

    if (Math.abs(deltaY) > threshold) {
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

    const touch = event.changedTouches?.[0];
    if (!touch || touchStartRef.current.time === 0) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Flick detection: fast movement (< 300ms)
    const isFlick = deltaTime < 300;
    const flickThreshold = 40;

    if (isFlick && deltaY > flickThreshold) {
      // Fast downward flick: hard drop
      onHardDrop();
      emitSound("lock");
    } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 200) {
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

