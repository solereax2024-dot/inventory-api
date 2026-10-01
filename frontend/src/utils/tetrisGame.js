import { CLEAR_INTENSITY_BY_LINES, GRID_HEIGHT, GRID_WIDTH } from "../constants/tetris";

export function formatRelativeTime(value) {
  if (!value) return "No recent run";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "No recent run";

  const diffMs = Date.now() - parsedDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return parsedDate.toLocaleDateString();
}

export function formatDateTime(value) {
  if (!value) return "—";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function matchesLeaderboardTimeFilter(entry, filter) {
  if (filter === "all") return true;

  const sourceDate = entry?.lastPlayed || entry?.updatedAt || entry?.createdAt;
  if (!sourceDate) return false;

  const parsedDate = new Date(sourceDate);
  if (Number.isNaN(parsedDate.getTime())) return false;

  const elapsedMs = Date.now() - parsedDate.getTime();
  const oneDayMs = 1000 * 60 * 60 * 24;

  if (filter === "today") return elapsedMs <= oneDayMs;
  if (filter === "week") return elapsedMs <= oneDayMs * 7;
  if (filter === "month") return elapsedMs <= oneDayMs * 31;

  return true;
}

export function sortLeaderboardEntries(entries, sortBy) {
  return [...entries].sort((left, right) => {
    if (sortBy === "level") {
      return (right?.highestLevel || 0) - (left?.highestLevel || 0)
        || (right?.highestScore || 0) - (left?.highestScore || 0)
        || (right?.totalLinesCleared || 0) - (left?.totalLinesCleared || 0);
    }

    if (sortBy === "recent") {
      const leftTime = left?.lastPlayed ? new Date(left.lastPlayed).getTime() : 0;
      const rightTime = right?.lastPlayed ? new Date(right.lastPlayed).getTime() : 0;
      return rightTime - leftTime || (right?.highestScore || 0) - (left?.highestScore || 0);
    }

    return (right?.highestScore || 0) - (left?.highestScore || 0)
      || (right?.highestLevel || 0) - (left?.highestLevel || 0)
      || (right?.totalLinesCleared || 0) - (left?.totalLinesCleared || 0);
  });
}

export function getClearIntensityValue(clearedLineCount, didTSpin = false) {
  if (clearedLineCount <= 0) return 1;

  const baseIntensity = CLEAR_INTENSITY_BY_LINES[clearedLineCount] || CLEAR_INTENSITY_BY_LINES[4];
  return didTSpin && clearedLineCount > 0 ? baseIntensity + 0.2 : baseIntensity;
}

export function createImpactPulseState(lockedCells, source = "lock", dropDistance = 0) {
  if (!Array.isArray(lockedCells) || lockedCells.length === 0) return null;

  const columns = lockedCells.map((cell) => cell.col);
  const rows = lockedCells.map((cell) => cell.row);
  const minCol = Math.min(...columns);
  const maxCol = Math.max(...columns);
  const bottomRow = Math.max(...rows);
  const widthCells = (maxCol - minCol) + 1;
  const strength = source === "hard-drop"
    ? 1.18 + Math.min(0.7, Math.max(dropDistance, 1) * 0.055)
    : 0.94;

  return {
    id: `${source}-${Date.now()}-${Math.random()}`,
    minCol,
    bottomRow,
    widthCells,
    strength,
    variant: source === "hard-drop" ? "hard-drop" : "lock",
  };
}

export function createEmptyGrid() {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(null));
}

export function rotatePiece(piece) {
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

export function rotatePieceCounterClockwise(piece) {
  return rotatePiece(rotatePiece(rotatePiece(piece)));
}

export function canPlacePiece(grid, piece, row, col) {
  for (let pieceRow = 0; pieceRow < piece.length; pieceRow += 1) {
    for (let pieceCol = 0; pieceCol < piece[pieceRow].length; pieceCol += 1) {
      if (!piece[pieceRow][pieceCol]) {
        continue;
      }

      const gridRow = row + pieceRow;
      const gridCol = col + pieceCol;

      if (gridRow < 0 || gridRow >= GRID_HEIGHT || gridCol < 0 || gridCol >= GRID_WIDTH) {
        return false;
      }

      if (grid[gridRow][gridCol] !== null) {
        return false;
      }
    }
  }

  return true;
}

export function placePiece(grid, piece, row, col, tileId) {
  const nextGrid = grid.map((gridRow) => [...gridRow]);

  for (let pieceRow = 0; pieceRow < piece.length; pieceRow += 1) {
    for (let pieceCol = 0; pieceCol < piece[pieceRow].length; pieceCol += 1) {
      if (!piece[pieceRow][pieceCol]) {
        continue;
      }

      nextGrid[row + pieceRow][col + pieceCol] = tileId;
    }
  }

  return nextGrid;
}

export function getDropRow(grid, piece, row, col) {
  let dropRow = row;

  while (canPlacePiece(grid, piece, dropRow + 1, col)) {
    dropRow += 1;
  }

  return dropRow;
}

export function clearLines(grid) {
  const newGrid = grid.filter((row) => row.some((cell) => cell === null));
  const clearedLineCount = grid.length - newGrid.length;
  const emptyRows = Array.from({ length: clearedLineCount }, () => Array(GRID_WIDTH).fill(null));

  return { grid: [...emptyRows, ...newGrid], clearedLineCount };
}

export function countTSpinCornerOccupancy(piece, row, col, grid) {
  if (!piece) return 0;

  const corners = [
    [row, col],
    [row, col + 2],
    [row + 2, col],
    [row + 2, col + 2],
  ];

  return corners.reduce((count, [gridRow, gridCol]) => {
    if (gridRow < 0 || gridRow >= GRID_HEIGHT || gridCol < 0 || gridCol >= GRID_WIDTH) {
      return count + 1;
    }

    return grid[gridRow][gridCol] !== null ? count + 1 : count;
  }, 0);
}

export function getPieceCells(piece, row, col, tileId) {
  const cells = [];

  piece.forEach((pieceRow, rowIndex) => {
    pieceRow.forEach((cell, colIndex) => {
      if (!cell) return;
      cells.push({ row: row + rowIndex, col: col + colIndex, tileId });
    });
  });

  return cells;
}

export function isActivePieceActionBlocked({
  gameStarted,
  gameOver,
  isPaused,
  currentPiece,
}) {
  return !gameStarted || gameOver || isPaused || !currentPiece;
}

export function calculateBlockSize(
  viewportWidth,
  viewportHeight,
  {
    MOBILE_BREAKPOINT,
    MOBILE_BLOCK_SIZE,
    SMALL_HEIGHT_BLOCK_SIZE,
    LARGE_DESKTOP_BLOCK_SIZE,
    DESKTOP_BLOCK_SIZE,
    COMPACT_DESKTOP_BLOCK_SIZE,
    mobileLayoutMode = "prestart",
    compactMobileHeight = false,
    veryShortMobileHeight = false,
  } = {}
) {
  if (viewportWidth <= MOBILE_BREAKPOINT) {
    const isShortMobileViewport = compactMobileHeight || viewportHeight <= 760;
    const isVeryShortMobileViewport = veryShortMobileHeight || viewportHeight <= 680;

    const horizontalReserve = 18;
    const verticalReserve = mobileLayoutMode === "gameplay"
      ? (isVeryShortMobileViewport ? 300 : isShortMobileViewport ? 320 : 338)
      : (isVeryShortMobileViewport ? 238 : isShortMobileViewport ? 262 : 286);

    const widthFit = Math.floor(Math.max(120, viewportWidth - horizontalReserve) / GRID_WIDTH);
    const heightFit = Math.floor(Math.max(200, viewportHeight - verticalReserve) / GRID_HEIGHT);
    const minimumBlockSize = isVeryShortMobileViewport ? 12 : 13;

    return Math.max(minimumBlockSize, Math.min(MOBILE_BLOCK_SIZE, widthFit, heightFit));
  }

  const isUltraCompactHeight = viewportHeight <= 820;
  const isCompactHeight = viewportHeight <= 920;
  const sideColumnsReserve = viewportWidth >= 1600 ? 620 : viewportWidth >= 1280 ? 560 : viewportWidth >= 1120 ? 500 : 440;
  const verticalReserve = isUltraCompactHeight ? 176 : isCompactHeight ? 220 : 256;
  const widthFit = Math.floor(Math.max(GRID_WIDTH * 18, viewportWidth - sideColumnsReserve) / GRID_WIDTH);
  const heightFit = Math.floor(Math.max(GRID_HEIGHT * 18, viewportHeight - verticalReserve) / GRID_HEIGHT);
  const preferredBlockSize = viewportWidth >= 1440 && viewportHeight >= 900
    ? LARGE_DESKTOP_BLOCK_SIZE
    : viewportWidth >= 1200
      ? DESKTOP_BLOCK_SIZE
      : COMPACT_DESKTOP_BLOCK_SIZE;
  const minimumBlockSize = isUltraCompactHeight ? 19 : isCompactHeight ? 21 : COMPACT_DESKTOP_BLOCK_SIZE;
  const compactCap = isCompactHeight ? Math.min(SMALL_HEIGHT_BLOCK_SIZE, preferredBlockSize) : preferredBlockSize;

  return Math.max(minimumBlockSize, Math.min(compactCap, widthFit, heightFit));
}

export function computeLockedPieceOutcome({
  grid,
  currentPiece,
  currentPieceKey,
  currentPieceCol,
  currentTileId,
  lockedRow,
  level,
  linesCleared,
  lastMoveWasRotate,
  comboChainCount,
  previousClearWasTetris,
  nextQueue,
  nextPiece,
  nextPieceKey,
  nextTileId,
  ensureUpcomingQueue,
  createUpcomingEntry,
  getSpawnColumn,
}) {
  const placedGrid = placePiece(grid, currentPiece, lockedRow, currentPieceCol, currentTileId);
  const lockedCells = getPieceCells(currentPiece, lockedRow, currentPieceCol, currentTileId);
  const clearedRows = placedGrid.reduce((indices, row, rowIndex) => {
    if (row.every((cell) => cell !== null)) {
      indices.push(rowIndex);
    }
    return indices;
  }, []);
  const { grid: settledGrid, clearedLineCount } = clearLines(placedGrid);
  const didTSpin = currentPieceKey === "T"
    && lastMoveWasRotate
    && countTSpinCornerOccupancy(currentPiece, lockedRow, currentPieceCol, grid) >= 3;

  const lineScoreTable = [0, 100, 300, 500, 800];
  const tSpinScoreTable = [400, 800, 1200, 1600];
  const comboBonusCount = clearedLineCount > 0 ? comboChainCount : 0;
  const comboBonus = clearedLineCount > 0 ? 50 * comboBonusCount * level : 0;
  const isDifficultClear = clearedLineCount === 4 || (didTSpin && clearedLineCount > 0);
  const receivesBackToBackBonus = isDifficultClear && previousClearWasTetris;
  const nextClearIntensity = getClearIntensityValue(clearedLineCount, didTSpin);
  const baseActionScore = didTSpin
    ? (tSpinScoreTable[clearedLineCount] || tSpinScoreTable[0]) * level
    : (lineScoreTable[clearedLineCount] || 0) * level;
  const actionScore = receivesBackToBackBonus ? Math.floor(baseActionScore * 1.5) : baseActionScore;
  const bonusPoints = actionScore + comboBonus;
  const nextLinesClearedTotal = linesCleared + clearedLineCount;
  const nextLevel = Math.floor(nextLinesClearedTotal / 10) + 1;

  const queuedEntries = ensureUpcomingQueue(
    nextQueue.length
      ? nextQueue
      : nextPiece
        ? [{ piece: nextPiece, pieceKey: nextPieceKey, tileId: nextTileId }]
        : []
  );
  const [upcomingEntry, ...remainingQueueEntries] = queuedEntries;
  const upcomingPiece = upcomingEntry?.piece ?? null;
  const upcomingPieceKey = upcomingEntry?.pieceKey ?? null;
  const upcomingTileId = upcomingEntry?.tileId ?? null;
  const refreshedQueueEntries = [...remainingQueueEntries, createUpcomingEntry()];
  const spawnCol = getSpawnColumn(upcomingPiece);
  const canSpawnUpcomingPiece = canPlacePiece(settledGrid, upcomingPiece, 0, spawnCol);

  return {
    placedGrid,
    lockedCells,
    clearedRows,
    settledGrid,
    clearedLineCount,
    didTSpin,
    comboBonusCount,
    comboBonus,
    isDifficultClear,
    receivesBackToBackBonus,
    nextClearIntensity,
    baseActionScore,
    actionScore,
    bonusPoints,
    nextLinesClearedTotal,
    nextLevel,
    queuedEntries,
    upcomingEntry,
    upcomingPiece,
    upcomingPieceKey,
    upcomingTileId,
    refreshedQueueEntries,
    spawnCol,
    canSpawnUpcomingPiece,
  };
}

