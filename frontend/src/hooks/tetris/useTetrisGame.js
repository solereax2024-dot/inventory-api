import { useState, useCallback, useEffect, useRef, useMemo } from "react";

const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const SOUND_PREFERENCE_KEY = "tetris-sound-enabled";
const BEST_RUN_PREFERENCE_KEY = "tetris-best-run";

// Game pieces (Tetris standard)
const TETRIS_PIECES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  L: [[1, 0], [1, 0], [1, 1]],
  J: [[0, 1], [0, 1], [1, 1]],
};

/**
 * useTetrisGame Hook
 *
 * Main game state and logic management
 *
 * Returns: {
 *   // Game state
 *   gameStarted, setGameStarted,
 *   gameOver, setGameOver,
 *   isPaused, setIsPaused,
 *   score, setScore,
 *   level, setLevel,
 *   linesCleared, setLinesCleared,
 *   grid, setGrid,
 *   currentPiece, setCurrentPiece,
 *   currentPieceRow, setCurrentPieceRow,
 *   currentPieceCol, setCurrentPieceCol,
 *   currentTileId, setCurrentTileId,
 *   // ... many more state properties
 *
 *   // Game control functions
 *   startGame,
 *   resetGame,
 *   togglePauseGame,
 *   movePieceHorizontal,
 *   rotateCurrentPiece,
 *   softDropPiece,
 *   hardDropPiece,
 *   holdCurrentPiece,
 *   // ... more functions
 * }
 */
export function useTetrisGame() {
  // Core game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesCleared, setLinesCleared] = useState(0);
  const [grid, setGrid] = useState(() => createEmptyGrid());
  const [message, setMessage] = useState("Ready to play? Enter your name to start.");
  const [playerName, setPlayerName] = useState("");
  const [isBoardFocused, setIsBoardFocused] = useState(false);

  // Piece state
  const [currentPiece, setCurrentPiece] = useState(null);
  const [currentPieceKey, setCurrentPieceKey] = useState(null);
  const [currentPieceRow, setCurrentPieceRow] = useState(0);
  const [currentPieceCol, setCurrentPieceCol] = useState(0);
  const [currentTileId, setCurrentTileId] = useState(0);
  const [nextPiece, setNextPiece] = useState(null);
  const [nextPieceKey, setNextPieceKey] = useState(null);
  const [nextTileId, setNextTileId] = useState(0);
  const [holdPiece, setHoldPiece] = useState(null);
  const [holdPieceKey, setHoldPieceKey] = useState(null);
  const [holdTileId, setHoldTileId] = useState(null);
  const [canHoldPiece, setCanHoldPiece] = useState(true);

  // Animation state
  const [pieceSpawnPulse, setPieceSpawnPulse] = useState(false);
  const [rotatePulse, setRotatePulse] = useState(false);
  const [softDropPulse, setSoftDropPulse] = useState(false);
  const [hardDropPulse, setHardDropPulse] = useState(false);
  const [lockPulseCells, setLockPulseCells] = useState([]);
  const [hardDropTrail, setHardDropTrail] = useState([]);
  const [impactPulse, setImpactPulse] = useState(null);
  const [rowClearFlashRows, setRowClearFlashRows] = useState([]);
  const [clearEffectVariant, setClearEffectVariant] = useState("single");
  const [clearIntensity, setClearIntensity] = useState(1);
  const [rowShiftBlocks, setRowShiftBlocks] = useState([]);
  const [pointPopups, setPointPopups] = useState([]);
  const [isTetrisClearActive, setIsTetrisClearActive] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [backToBackActive, setBackToBackActive] = useState(false);
  const [tSpinActive, setTSpinActive] = useState(false);
  const [levelUpPulse, setLevelUpPulse] = useState(false);
  const [restartPulse, setRestartPulse] = useState(false);
  const [scorePulse, setScorePulse] = useState(false);
  const [levelPulse, setLevelPulse] = useState(false);
  const [linesPulse, setLinesPulse] = useState(false);

  // Refs for tracking state
  const scheduledTimeoutsRef = useRef([]);
  const ghostPieceRowRef = useRef(null);

  // Utility: Create empty grid
  const createEmptyGrid = () => {
    return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(null));
  };

  // Utility: Get random piece
  const createRandomPiece = useCallback(() => {
    const pieces = Object.keys(TETRIS_PIECES);
    const randomKey = pieces[Math.floor(Math.random() * pieces.length)];
    return TETRIS_PIECES[randomKey];
  }, []);

  // Utility: Create random tile ID
  const createRandomTileId = useCallback(() => {
    return Math.floor(Math.random() * 1000000);
  }, []);

  // Utility: Schedule timeouts
  const scheduleUiTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(callback, delay);
    scheduledTimeoutsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

  // Utility: Clear scheduled timeouts
  const clearScheduledTimeouts = useCallback(() => {
    scheduledTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    scheduledTimeoutsRef.current = [];
  }, []);

  // Utility: Can place piece at position
  const canPlacePiece = useCallback((pieceToCheck, row, col, gridToCheck = grid) => {
    for (let pieceRow = 0; pieceRow < pieceToCheck.length; pieceRow += 1) {
      for (let pieceCol = 0; pieceCol < pieceToCheck[pieceRow].length; pieceCol += 1) {
        if (!pieceToCheck[pieceRow][pieceCol]) continue;

        const gridRow = row + pieceRow;
        const gridCol = col + pieceCol;

        if (gridRow < 0 || gridRow >= GRID_HEIGHT || gridCol < 0 || gridCol >= GRID_WIDTH) {
          return false;
        }

        if (gridToCheck[gridRow][gridCol] !== null) {
          return false;
        }
      }
    }
    return true;
  }, [grid]);

  // Game control: Start game
  const startGame = useCallback(() => {
    if (!playerName.trim()) {
      setMessage("Please enter a name first!");
      return;
    }

    clearScheduledTimeouts();

    setGameStarted(true);
    setGameOver(false);
    setIsPaused(false);
    setScore(0);
    setLevel(1);
    setLinesCleared(0);
    setGrid(createEmptyGrid());
    setMessage("Game Started!");
    setCurrentPiece(createRandomPiece());
    setCurrentPieceKey(`piece-${Date.now()}`);
    setCurrentTileId(createRandomTileId());
    setCurrentPieceRow(0);
    setCurrentPieceCol(3);
    setNextPiece(createRandomPiece());
    setNextPieceKey(`next-${Date.now()}`);
    setNextTileId(createRandomTileId());
    setCanHoldPiece(true);
    setHoldPiece(null);
    setRestartPulse(true);
    setPieceSpawnPulse(true);
    scheduleUiTimeout(() => setRestartPulse(false), 240);
    scheduleUiTimeout(() => setPieceSpawnPulse(false), 180);
  }, [
    playerName,
    clearScheduledTimeouts,
    createEmptyGrid,
    createRandomPiece,
    createRandomTileId,
    scheduleUiTimeout,
  ]);

  // Game control: Reset game
  const resetGame = useCallback(() => {
    clearScheduledTimeouts();
    setGameStarted(false);
    setGameOver(false);
    setIsPaused(false);
    setGrid(createEmptyGrid());
    setScore(0);
    setLevel(1);
    setLinesCleared(0);
    setCurrentPiece(null);
    setCurrentPieceKey(null);
    setCurrentPieceRow(0);
    setCurrentPieceCol(0);
    setCurrentTileId(0);
    setNextPiece(null);
    setNextPieceKey(null);
    setNextTileId(0);
    setHoldPiece(null);
    setHoldPieceKey(null);
    setHoldTileId(null);
    setCanHoldPiece(true);
    setMessage("Game reset. Ready to play?");
    setRestartPulse(true);
    scheduleUiTimeout(() => setRestartPulse(false), 240);
  }, [clearScheduledTimeouts, createEmptyGrid, scheduleUiTimeout]);

  // Game control: Toggle pause
  const togglePauseGame = useCallback(() => {
    if (gameStarted && !gameOver) {
      setIsPaused(!isPaused);
      setMessage(isPaused ? "Resumed!" : "Paused");
    }
  }, [gameStarted, gameOver, isPaused]);

  // Piece movement: Move horizontal
  const movePieceHorizontal = useCallback((direction) => {
    if (!gameStarted || gameOver || isPaused || !currentPiece) return;

    const newCol = currentPieceCol + direction;
    if (canPlacePiece(currentPiece, currentPieceRow, newCol)) {
      setCurrentPieceCol(newCol);
    }
  }, [gameStarted, gameOver, isPaused, currentPiece, currentPieceCol, currentPieceRow, canPlacePiece]);

  // Piece movement: Soft drop
  const softDropPiece = useCallback(() => {
    if (!gameStarted || gameOver || isPaused || !currentPiece) return;

    const newRow = currentPieceRow + 1;
    if (canPlacePiece(currentPiece, newRow, currentPieceCol)) {
      setCurrentPieceRow(newRow);
      setSoftDropPulse(true);
      scheduleUiTimeout(() => setSoftDropPulse(false), 100);
    }
  }, [
    gameStarted,
    gameOver,
    isPaused,
    currentPiece,
    currentPieceRow,
    currentPieceCol,
    canPlacePiece,
    scheduleUiTimeout,
  ]);

  // Piece movement: Hard drop
  const hardDropPiece = useCallback(() => {
    if (!gameStarted || gameOver || isPaused || !currentPiece) return;

    let droppedRow = currentPieceRow;
    while (canPlacePiece(currentPiece, droppedRow + 1, currentPieceCol)) {
      droppedRow += 1;
    }

    setCurrentPieceRow(droppedRow);
    setHardDropPulse(true);
    scheduleUiTimeout(() => setHardDropPulse(false), 150);
  }, [
    gameStarted,
    gameOver,
    isPaused,
    currentPiece,
    currentPieceRow,
    currentPieceCol,
    canPlacePiece,
    scheduleUiTimeout,
  ]);

  // Piece rotation
  const rotateCurrentPiece = useCallback((direction = "cw") => {
    if (!gameStarted || gameOver || isPaused || !currentPiece) return;

    const rotated = rotatePiece(currentPiece, direction === "ccw");
    if (canPlacePiece(rotated, currentPieceRow, currentPieceCol)) {
      setCurrentPiece(rotated);
      setRotatePulse(true);
      scheduleUiTimeout(() => setRotatePulse(false), 100);
    }
  }, [gameStarted, gameOver, isPaused, currentPiece, currentPieceRow, currentPieceCol, canPlacePiece, scheduleUiTimeout]);

  // Hold piece
  const holdCurrentPiece = useCallback(() => {
    if (!gameStarted || gameOver || !canHoldPiece || !currentPiece) return;

    const tempPiece = currentPiece;
    const tempTileId = currentTileId;

    setCurrentPiece(holdPiece || nextPiece);
    setCurrentTileId(holdTileId || nextTileId);
    setHoldPiece(tempPiece);
    setHoldTileId(tempTileId);
    setCanHoldPiece(false);
  }, [gameStarted, gameOver, canHoldPiece, currentPiece, currentTileId, holdPiece, holdTileId, nextPiece, nextTileId]);

  // Helper: Rotate piece
  function rotatePiece(piece, counterClockwise = false) {
    if (counterClockwise) {
      return rotatePiece(rotatePiece(rotatePiece(piece)));
    }

    const rows = piece.length;
    const cols = piece[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        rotated[col][rows - 1 - row] = piece[row][col];
      }
    }

    return rotated;
  }

  return {
    // Game state
    gameStarted,
    setGameStarted,
    gameOver,
    setGameOver,
    isPaused,
    setIsPaused,
    score,
    setScore,
    level,
    setLevel,
    linesCleared,
    setLinesCleared,
    grid,
    setGrid,
    message,
    setMessage,
    playerName,
    setPlayerName,
    isBoardFocused,
    setIsBoardFocused,

    // Piece state
    currentPiece,
    setCurrentPiece,
    currentPieceKey,
    setCurrentPieceKey,
    currentPieceRow,
    setCurrentPieceRow,
    currentPieceCol,
    setCurrentPieceCol,
    currentTileId,
    setCurrentTileId,
    nextPiece,
    setNextPiece,
    nextPieceKey,
    setNextPieceKey,
    nextTileId,
    setNextTileId,
    holdPiece,
    setHoldPiece,
    holdPieceKey,
    setHoldPieceKey,
    holdTileId,
    setHoldTileId,
    canHoldPiece,
    setCanHoldPiece,

    // Animation state
    pieceSpawnPulse,
    setPieceSpawnPulse,
    rotatePulse,
    setRotatePulse,
    softDropPulse,
    setSoftDropPulse,
    hardDropPulse,
    setHardDropPulse,
    lockPulseCells,
    setLockPulseCells,
    hardDropTrail,
    setHardDropTrail,
    impactPulse,
    setImpactPulse,
    rowClearFlashRows,
    setRowClearFlashRows,
    clearEffectVariant,
    setClearEffectVariant,
    clearIntensity,
    setClearIntensity,
    rowShiftBlocks,
    setRowShiftBlocks,
    pointPopups,
    setPointPopups,
    isTetrisClearActive,
    setIsTetrisClearActive,
    comboCount,
    setComboCount,
    backToBackActive,
    setBackToBackActive,
    tSpinActive,
    setTSpinActive,
    levelUpPulse,
    setLevelUpPulse,
    restartPulse,
    setRestartPulse,
    scorePulse,
    setScorePulse,
    levelPulse,
    setLevelPulse,
    linesPulse,
    setLinesPulse,

    // Utilities
    scheduleUiTimeout,
    clearScheduledTimeouts,
    canPlacePiece,
    createRandomPiece,
    createRandomTileId,

    // Game controls
    startGame,
    resetGame,
    togglePauseGame,
    movePieceHorizontal,
    rotateCurrentPiece,
    softDropPiece,
    hardDropPiece,
    holdCurrentPiece,
  };
}

export default useTetrisGame;

