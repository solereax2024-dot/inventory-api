import { useEffect } from "react";

const BLOCKED_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  " ",
  "Spacebar",
  "c",
  "C",
  "p",
  "P",
  "Escape",
  "z",
  "Z",
  "x",
  "X",
  "Shift",
  "Enter",
  "r",
  "R",
];

export default function useTetrisKeyboardControls({
  isBlocked = false,
  gameStarted,
  gameOver,
  startGame,
  resetGame,
  movePieceHorizontal,
  softDropCurrentPiece,
  rotateCurrentPiece,
  rotateCurrentPieceCounterClockwise,
  hardDropCurrentPiece,
  holdCurrentPiece,
  togglePauseGame,
}) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleKeyDown = (event) => {
      if (isBlocked) return;

      const activeElement = document.activeElement;
      const isTypingIntoField = activeElement instanceof HTMLElement
        && ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
      if (isTypingIntoField) return;

      if (BLOCKED_KEYS.includes(event.key)) {
        event.preventDefault();
      }

      if (event.key === "Enter" && !gameStarted && !gameOver) {
        startGame();
        return;
      }

      if ((event.key === "Enter" || event.key === "r" || event.key === "R") && gameOver) {
        resetGame();
        return;
      }

      if ((event.key === "r" || event.key === "R") && gameStarted) {
        resetGame();
        return;
      }

      if (!gameStarted) return;

      if (event.key === "ArrowLeft") {
        movePieceHorizontal(-1);
      } else if (event.key === "ArrowRight") {
        movePieceHorizontal(1);
      } else if (event.key === "ArrowDown") {
        softDropCurrentPiece();
      } else if (event.key === "ArrowUp" || event.key === "x" || event.key === "X") {
        rotateCurrentPiece();
      } else if (event.key === "z" || event.key === "Z") {
        rotateCurrentPieceCounterClockwise();
      } else if (event.key === " " || event.key === "Spacebar") {
        hardDropCurrentPiece();
      } else if (event.key === "c" || event.key === "C" || event.key === "Shift") {
        holdCurrentPiece();
      } else if (event.key === "p" || event.key === "P" || event.key === "Escape") {
        togglePauseGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    gameOver,
    gameStarted,
    hardDropCurrentPiece,
    holdCurrentPiece,
    isBlocked,
    movePieceHorizontal,
    resetGame,
    rotateCurrentPiece,
    rotateCurrentPieceCounterClockwise,
    softDropCurrentPiece,
    startGame,
    togglePauseGame,
  ]);
}

