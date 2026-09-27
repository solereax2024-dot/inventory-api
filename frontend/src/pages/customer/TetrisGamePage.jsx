import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowBigDown, ArrowLeft, ArrowRight, Maximize2, Minimize2, Pause, Play, RotateCcw, RotateCw, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { apiRequest } from "../../utils/api";
import "../../styles/tetris-game.css";

const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const LARGE_DESKTOP_BLOCK_SIZE = 29;
const DESKTOP_BLOCK_SIZE = 25;
const COMPACT_DESKTOP_BLOCK_SIZE = 24;
const SMALL_HEIGHT_BLOCK_SIZE = 25;
const MOBILE_BLOCK_SIZE = 22;
const MOBILE_BREAKPOINT = 640;
const LINE_CLEAR_FLASH_DURATION_MS = 190;
const LINE_SHIFT_DURATION_BASE_MS = 200;
const LINE_SHIFT_DURATION_PER_ROW_MS = 36;
const LINE_SHIFT_DURATION_MAX_MS = 420;
const ROW_COLLAPSE_STAGGER_MS = 22;
const HARD_DROP_TRAIL_DURATION_MS = 180;
const IMPACT_PULSE_DURATION_MS = 140;
const TOUCH_SWIPE_THRESHOLD_PX = 28;
const TOUCH_TAP_MAX_MOVE_PX = 12;
const TOUCH_TAP_MAX_DURATION_MS = 240;
const TOUCH_HARD_DROP_FLICK_PX = 72;
const TOUCH_HARD_DROP_FLICK_DURATION_MS = 150;
const SOUND_PREFERENCE_KEY = "brand-tetris-sound-enabled";
const BEST_RUN_PREFERENCE_KEY = "brand-tetris-best-run";
const GRID_INSET_PX = 10;
const BLOCK_COLORS = [
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
];

const TETROMINOS = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  L: [[1, 0], [1, 0], [1, 1]],
  J: [[0, 1], [0, 1], [1, 1]],
};

const TETROMINO_KEYS = Object.keys(TETROMINOS);
const FALLBACK_BRANDS = [
  { id: 0, name: "Nike", logoUrl: null },
  { id: 1, name: "Adidas", logoUrl: null },
  { id: 2, name: "Onitsuka Tiger", logoUrl: null },
  { id: 3, name: "On", logoUrl: null },
  { id: 4, name: "Puma", logoUrl: null },
  { id: 5, name: "ASICS", logoUrl: null },
  { id: 6, name: "Salomon", logoUrl: null },
];
const KNOWN_BRAND_LABELS = {
  nike: "NIKE",
  adidas: "ADI",
  "onitsuka-tiger": "OT",
  on: "ON",
  puma: "PUMA",
  asics: "ASICS",
  salomon: "SAL",
};
const CLEAR_INTENSITY_BY_LINES = {
  1: 1,
  2: 1.55,
  3: 2.15,
  4: 2.85,
};

function formatRelativeTime(value) {
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

function formatDateTime(value) {
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

function matchesLeaderboardTimeFilter(entry, filter) {
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

function sortLeaderboardEntries(entries, sortBy) {
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

function getClearIntensityValue(clearedLineCount, didTSpin = false) {
  if (clearedLineCount <= 0) return 1;

  const baseIntensity = CLEAR_INTENSITY_BY_LINES[clearedLineCount] || CLEAR_INTENSITY_BY_LINES[4];
  return didTSpin && clearedLineCount > 0 ? baseIntensity + 0.2 : baseIntensity;
}

function createImpactPulseState(lockedCells, source = "lock", dropDistance = 0) {
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

function createEmptyGrid() {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(null));
}

function rotatePiece(piece) {
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

function rotatePieceCounterClockwise(piece) {
  return rotatePiece(rotatePiece(rotatePiece(piece)));
}

function canPlacePiece(grid, piece, row, col) {
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

function placePiece(grid, piece, row, col, tileId) {
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

function getDropRow(grid, piece, row, col) {
  let dropRow = row;

  while (canPlacePiece(grid, piece, dropRow + 1, col)) {
    dropRow += 1;
  }

  return dropRow;
}

function clearLines(grid) {
  const newGrid = grid.filter((row) => row.some((cell) => cell === null));
  const clearedLineCount = grid.length - newGrid.length;
  const emptyRows = Array.from({ length: clearedLineCount }, () => Array(GRID_WIDTH).fill(null));

  return { grid: [...emptyRows, ...newGrid], clearedLineCount };
}

function countTSpinCornerOccupancy(piece, row, col, grid) {
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

function getPieceCells(piece, row, col, tileId) {
  const cells = [];

  piece.forEach((pieceRow, rowIndex) => {
    pieceRow.forEach((cell, colIndex) => {
      if (!cell) return;
      cells.push({ row: row + rowIndex, col: col + colIndex, tileId });
    });
  });

  return cells;
}

export default function TetrisGamePage() {
  const shellRef = useRef(null);
  const gameSurfaceRef = useRef(null);
  const boardFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const playerNameInputRef = useRef(null);
  const scoreSubmittedRef = useRef(false);
  const timeoutIdsRef = useRef([]);
  const touchGestureRef = useRef({
    activeTouchId: null,
    startX: 0,
    startY: 0,
    startTime: 0,
  });

  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [grid, setGrid] = useState(createEmptyGrid());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesCleared, setLinesCleared] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [message, setMessage] = useState("Welcome to Brand Tetris!");
  const [loading, setLoading] = useState(false);
  const [brandTiles, setBrandTiles] = useState(FALLBACK_BRANDS);
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
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [leaderboardTimeFilter] = useState("all"); // all, today, week, month
  const [leaderboardSortBy] = useState("score"); // score, level, recent
  const [isBoardFocused, setIsBoardFocused] = useState(false);
  const [isMobileLeaderboardOpen, setIsMobileLeaderboardOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const savedPreference = window.localStorage.getItem(SOUND_PREFERENCE_KEY);
    return savedPreference === null ? true : savedPreference === "true";
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bestRun, setBestRun] = useState(() => {
    if (typeof window === "undefined") {
      return { score: 0, level: 1, lines: 0 };
    }

    try {
      const rawValue = window.localStorage.getItem(BEST_RUN_PREFERENCE_KEY);
      if (!rawValue) return { score: 0, level: 1, lines: 0 };
      const parsedValue = JSON.parse(rawValue);
      return {
        score: Number(parsedValue?.score) || 0,
        level: Number(parsedValue?.level) || 1,
        lines: Number(parsedValue?.lines) || 0,
      };
    } catch {
      return { score: 0, level: 1, lines: 0 };
    }
  });
  const [selectedLeaderboardEntry, setSelectedLeaderboardEntry] = useState(null);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState(null);
  const [playerStatsLoading, setPlayerStatsLoading] = useState(false);
  const [playerStatsError, setPlayerStatsError] = useState("");
  const [viewportSize, setViewportSize] = useState(() => {
    if (typeof window === "undefined") {
      return { width: 1440, height: 900 };
    }

    return { width: window.innerWidth, height: window.innerHeight };
  });
  const [boardFrameWidth, setBoardFrameWidth] = useState(0);
  const lastMoveWasRotateRef = useRef(false);
  const previousScoreRef = useRef(0);
  const previousLevelRef = useRef(1);
  const previousLinesRef = useRef(0);
  const comboChainRef = useRef(0);
  const previousClearWasTetrisRef = useRef(false);

  const blockSize = useMemo(() => {
    const width = viewportSize.width;
    const height = viewportSize.height;
    const minBlockSize = width < MOBILE_BREAKPOINT ? MOBILE_BLOCK_SIZE - 2 : COMPACT_DESKTOP_BLOCK_SIZE - 4;
    const horizontalBoardInset = width < MOBILE_BREAKPOINT ? 18 : 30;
    const availableBoardWidth = boardFrameWidth > 0
      ? Math.max(boardFrameWidth - horizontalBoardInset, GRID_WIDTH * minBlockSize)
      : Math.max(width - horizontalBoardInset, GRID_WIDTH * minBlockSize);
    const widthDrivenBlockSize = Math.floor(availableBoardWidth / GRID_WIDTH);

    let viewportDrivenBlockSize = DESKTOP_BLOCK_SIZE;
    if (width >= 1800) {
      viewportDrivenBlockSize = LARGE_DESKTOP_BLOCK_SIZE + 15;
    } else if (width >= 1600) {
      viewportDrivenBlockSize = LARGE_DESKTOP_BLOCK_SIZE + 13;
    } else if (width >= 1400) {
      viewportDrivenBlockSize = LARGE_DESKTOP_BLOCK_SIZE + 11;
    } else if (width >= 1280) {
      viewportDrivenBlockSize = LARGE_DESKTOP_BLOCK_SIZE + 9;
    } else if (width >= 1024) {
      viewportDrivenBlockSize = LARGE_DESKTOP_BLOCK_SIZE + 7;
    } else if (width >= 768) {
      viewportDrivenBlockSize = COMPACT_DESKTOP_BLOCK_SIZE + 4;
    } else if (width < MOBILE_BREAKPOINT) {
      viewportDrivenBlockSize = MOBILE_BLOCK_SIZE;
    }

    const verticalReserve = width >= 1280 ? 210 : width >= 1024 ? 230 : width >= 768 ? 220 : width >= 520 ? 145 : 132;
    const availableBoardHeight = Math.max(height - verticalReserve, GRID_HEIGHT * minBlockSize);
    const heightDrivenBlockSize = Math.floor(availableBoardHeight / GRID_HEIGHT);
    const smallHeightCap = height < 760 ? SMALL_HEIGHT_BLOCK_SIZE : heightDrivenBlockSize;

    return Math.max(minBlockSize, Math.min(widthDrivenBlockSize, viewportDrivenBlockSize, heightDrivenBlockSize, smallHeightCap));
  }, [boardFrameWidth, viewportSize.height, viewportSize.width]);

  const boardPixelWidth = GRID_WIDTH * blockSize + GRID_INSET_PX * 2;
  const boardShellWidth = boardPixelWidth + (viewportSize.width < MOBILE_BREAKPOINT ? 18 : 28);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const element = boardFrameRef.current;
    if (!element) return undefined;

    const updateBoardFrameWidth = (nextWidth) => {
      setBoardFrameWidth((prevWidth) => {
        const normalizedWidth = Math.round(nextWidth);
        return prevWidth === normalizedWidth ? prevWidth : normalizedWidth;
      });
    };

    updateBoardFrameWidth(element.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") {
      const fallbackResize = () => updateBoardFrameWidth(element.getBoundingClientRect().width);
      window.addEventListener("resize", fallbackResize);
      return () => window.removeEventListener("resize", fallbackResize);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (!entry) return;
      updateBoardFrameWidth(entry.contentRect.width);
    });

    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const brands = await apiRequest("/api/public/brands", "GET");
        setBrandTiles(
          Array.isArray(brands) && brands.length > 0
            ? brands.map((brand, index) => ({ id: index, name: brand.name, logoUrl: brand.logoUrl }))
            : FALLBACK_BRANDS
        );
      } catch (error) {
        console.error("Failed to load brands:", error);
        setBrandTiles(FALLBACK_BRANDS);
      }
    };

    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      try {
        const data = await apiRequest("/api/public/games/tetris/leaderboard/all", "GET");
        setLeaderboard(Array.isArray(data) ? data : []);
      } catch (error) {
        try {
          const fallbackData = await apiRequest("/api/public/games/tetris/leaderboard?limit=10", "GET");
          setLeaderboard(Array.isArray(fallbackData) ? fallbackData : []);
          setLeaderboardError(null);
        } catch (fallbackError) {
          setLeaderboardError("Failed to load leaderboard");
          setLeaderboard([]);
        }
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => () => {
    const audioContext = audioContextRef.current;
    if (audioContext?.close) {
      audioContext.close().catch(() => {});
    }
  }, []);

  const clearScheduledTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  }, []);

  useEffect(() => () => {
    clearScheduledTimeouts();
  }, [clearScheduledTimeouts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BEST_RUN_PREFERENCE_KEY, JSON.stringify(bestRun));
  }, [bestRun]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();

    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!gameStarted || gameOver || viewportSize.width >= MOBILE_BREAKPOINT) return undefined;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;
    const previousOverscrollBehavior = body.style.overscrollBehavior;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
      body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [gameOver, gameStarted, viewportSize.width]);

  useEffect(() => {
    if (!selectedLeaderboardEntry) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedLeaderboardEntry(null);
        setSelectedPlayerStats(null);
        setPlayerStatsError("");
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedLeaderboardEntry]);

  const filteredLeaderboard = useMemo(() => {
    const filteredEntries = leaderboard.filter((entry) => matchesLeaderboardTimeFilter(entry, leaderboardTimeFilter));
    return sortLeaderboardEntries(filteredEntries, leaderboardSortBy)
      .slice(0, 10)
      .map((entry, index) => ({ ...entry, displayRank: index + 1 }));
  }, [leaderboard, leaderboardSortBy, leaderboardTimeFilter]);

  const globalBestEntry = useMemo(() => {
    const [topEntry] = sortLeaderboardEntries(leaderboard, "score");
    return topEntry || null;
  }, [leaderboard]);

  const namedPlayerBestEntry = useMemo(() => {
    const normalizedPlayerName = playerName.trim().toLowerCase();
    if (!normalizedPlayerName) return null;

    const [topEntry] = sortLeaderboardEntries(
      leaderboard.filter((entry) => (entry?.playerName || "").trim().toLowerCase() === normalizedPlayerName),
      "score"
    );

    return topEntry || null;
  }, [leaderboard, playerName]);

  const emitSound = useCallback((soundName, force = false) => {
    if ((!soundEnabled && !force) || typeof window === "undefined") return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const soundProfiles = {
      tap: { frequencies: [520], duration: 0.045, type: "triangle", gain: 0.024 },
      move: { frequencies: [392], duration: 0.05, type: "square", gain: 0.02 },
      rotate: { frequencies: [494, 587], duration: 0.05, type: "triangle", gain: 0.022, step: 0.02 },
      drop: { frequencies: [260, 196], duration: 0.08, type: "sawtooth", gain: 0.028, step: 0.03 },
      softDrop: { frequencies: [320, 280], duration: 0.05, type: "triangle", gain: 0.018, step: 0.018 },
      hardDrop: { frequencies: [260, 220, 180], duration: 0.09, type: "sawtooth", gain: 0.03, step: 0.026 },
      hold: { frequencies: [659, 523], duration: 0.06, type: "triangle", gain: 0.024, step: 0.03 },
      lock: { frequencies: [220, 247], duration: 0.05, type: "square", gain: 0.018, step: 0.018 },
      lineClear: { frequencies: [440, 554], duration: 0.08, type: "triangle", gain: 0.024, step: 0.03 },
      lineClearMulti: { frequencies: [440, 554, 659], duration: 0.08, type: "triangle", gain: 0.026, step: 0.028 },
      tetris: { frequencies: [392, 523, 659, 784], duration: 0.09, type: "triangle", gain: 0.028, step: 0.03 },
      backToBack: { frequencies: [494, 659, 880], duration: 0.1, type: "triangle", gain: 0.03, step: 0.03 },
      tSpin: { frequencies: [523, 659, 784], duration: 0.09, type: "triangle", gain: 0.028, step: 0.025 },
      wallKick: { frequencies: [370, 466], duration: 0.05, type: "square", gain: 0.02, step: 0.016 },
      start: { frequencies: [440, 554, 659], duration: 0.08, type: "triangle", gain: 0.026, step: 0.04 },
      levelUp: { frequencies: [440, 554, 659, 880], duration: 0.1, type: "triangle", gain: 0.028, step: 0.03 },
      pause: { frequencies: [330], duration: 0.08, type: "sine", gain: 0.022 },
      resume: { frequencies: [330, 440], duration: 0.07, type: "triangle", gain: 0.024, step: 0.03 },
      reset: { frequencies: [280, 220], duration: 0.08, type: "square", gain: 0.02, step: 0.04 },
      gameOver: { frequencies: [330, 247, 196], duration: 0.12, type: "sawtooth", gain: 0.024, step: 0.04 },
      modal: { frequencies: [784, 1047], duration: 0.07, type: "triangle", gain: 0.022, step: 0.03 },
      toggle: { frequencies: [660], duration: 0.06, type: "sine", gain: 0.022 },
      focus: { frequencies: [420, 520], duration: 0.045, type: "triangle", gain: 0.018, step: 0.02 },
    };

    const profile = soundProfiles[soundName] || soundProfiles.tap;
    const context = audioContextRef.current || new AudioContextClass();
    audioContextRef.current = context;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const startTime = context.currentTime;
    profile.frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = profile.type;
      oscillator.frequency.setValueAtTime(frequency, startTime + index * (profile.step || 0.025));
      gainNode.gain.setValueAtTime(profile.gain, startTime + index * (profile.step || 0.025));
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + index * (profile.step || 0.025) + profile.duration);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(startTime + index * (profile.step || 0.025));
      oscillator.stop(startTime + index * (profile.step || 0.025) + profile.duration);
    });
  }, [soundEnabled]);

  const triggerHaptic = useCallback((duration = 14) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }, []);

  const focusBoard = useCallback((shouldEmitSound = true) => {
    gameSurfaceRef.current?.focus();
    if (shouldEmitSound) {
      emitSound("focus");
    }
  }, [emitSound]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((previousState) => {
      const nextState = !previousState;
      if (!previousState) {
        emitSound("toggle", true);
      }
      return nextState;
    });
  }, [emitSound]);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;

    try {
      if (document.fullscreenElement === shellRef.current) {
        await document.exitFullscreen();
        return;
      }

      if (shellRef.current?.requestFullscreen) {
        await shellRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error("Unable to toggle fullscreen mode:", error);
    }
  }, []);


  const closePlayerModal = useCallback(() => {
    setSelectedLeaderboardEntry(null);
    setSelectedPlayerStats(null);
    setPlayerStatsError("");
  }, []);

  const openMobileLeaderboard = useCallback(() => {
    setIsMobileLeaderboardOpen(true);
  }, []);

  const closeMobileLeaderboard = useCallback(() => {
    setIsMobileLeaderboardOpen(false);
  }, []);

  const openPlayerModal = useCallback(async (entry) => {
    if (!entry) return;

    setSelectedLeaderboardEntry(entry);
    setSelectedPlayerStats(entry);
    setPlayerStatsLoading(true);
    setPlayerStatsError("");
    emitSound("modal");
    triggerHaptic(10);

    try {
      const playerStats = await apiRequest(`/api/public/games/tetris/player/${encodeURIComponent(entry.playerName || "")}`, "GET");
      setSelectedPlayerStats(playerStats || entry);
    } catch (error) {
      setPlayerStatsError("Unable to load player details right now.");
      setSelectedPlayerStats(entry);
    } finally {
      setPlayerStatsLoading(false);
    }
  }, [emitSound, triggerHaptic]);

  const scheduleUiTimeout = useCallback((callback, delayMs) => {
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((existingId) => existingId !== timeoutId);
      callback();
    }, delayMs);

    timeoutIdsRef.current.push(timeoutId);
  }, []);

  const createRandomPieceEntry = useCallback(() => {
    const randomKey = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
    return { pieceKey: randomKey, piece: TETROMINOS[randomKey] };
  }, []);

  const createRandomPiece = useCallback(() => createRandomPieceEntry().piece, [createRandomPieceEntry]);

  const createRandomTileId = useCallback(() => {
    const totalTiles = Math.max(brandTiles.length || FALLBACK_BRANDS.length, BLOCK_COLORS.length, 1);
    return Math.floor(Math.random() * totalTiles);
  }, [brandTiles.length]);

  const createUpcomingEntry = useCallback(() => ({
    ...createRandomPieceEntry(),
    tileId: createRandomTileId(),
  }), [createRandomPieceEntry, createRandomTileId]);

  const getSpawnColumn = useCallback((piece) => {
    const pieceWidth = piece?.[0]?.length || 0;
    return Math.max(0, Math.floor((GRID_WIDTH - pieceWidth) / 2));
  }, []);

  const clearTransientEffects = useCallback(() => {
    setRowClearFlashRows([]);
    setClearEffectVariant("single");
    setClearIntensity(1);
    setRowShiftBlocks([]);
    setPointPopups([]);
    setIsTetrisClearActive(false);
    setPieceSpawnPulse(false);
    setRotatePulse(false);
    setSoftDropPulse(false);
    setHardDropPulse(false);
    setLockPulseCells([]);
    setHardDropTrail([]);
    setImpactPulse(null);
    setBoardPulse(null);
    setComboCount(0);
    setBackToBackActive(false);
    setTSpinActive(false);
    setLevelUpPulse(false);
    setRestartPulse(false);
    setScorePulse(false);
    setLevelPulse(false);
    setLinesPulse(false);
    comboChainRef.current = 0;
    previousClearWasTetrisRef.current = false;
    lastMoveWasRotateRef.current = false;
  }, []);

  const submitScore = useCallback(async (finalScore, finalLevel, finalLinesCleared) => {
    const trimmedPlayerName = playerName.trim();
    if (!trimmedPlayerName) return;

    setLoading(true);

    try {
      await apiRequest("/api/public/games/tetris/scores", "POST", {
        playerName: trimmedPlayerName,
        score: finalScore,
        level: finalLevel,
        linesCleared: finalLinesCleared,
      });

      const refreshedLeaderboard = await apiRequest("/api/public/games/tetris/leaderboard/all", "GET");
      if (Array.isArray(refreshedLeaderboard)) {
        setLeaderboard(refreshedLeaderboard);
      }
    } catch (error) {
      console.error("Failed to submit Tetris score:", error);
      setLeaderboardError("Score submission failed. Please try another run.");
    } finally {
      setLoading(false);
    }
  }, [playerName]);

  const startGame = useCallback(() => {
    if (!playerName.trim()) {
      setMessage("Please enter a name first!");
      emitSound("tap");
      return;
    }

    const openingEntry = createUpcomingEntry();
    const queuedEntry = createUpcomingEntry();

    clearScheduledTimeouts();
    clearTransientEffects();
    scoreSubmittedRef.current = false;

    setGameStarted(true);
    setGameOver(false);
    setIsPaused(false);
    setScore(0);
    setLevel(1);
    setLinesCleared(0);
    setGrid(createEmptyGrid());
    setMessage("Game Started! Use arrows on desktop or swipe/tap on mobile.");
    setCurrentPiece(openingEntry.piece);
    setCurrentPieceKey(openingEntry.pieceKey);
    setCurrentTileId(createRandomTileId());
    setCurrentPieceRow(0);
    setCurrentPieceCol(getSpawnColumn(openingEntry.piece));
    setNextPiece(queuedEntry.piece);
    setNextPieceKey(queuedEntry.pieceKey);
    setNextTileId(queuedEntry.tileId);
    setCanHoldPiece(true);
    setHoldPiece(null);
    setHoldPieceKey(null);
    setHoldTileId(null);
    setRestartPulse(true);
    setPieceSpawnPulse(true);
    scheduleUiTimeout(() => setRestartPulse(false), 240);
    scheduleUiTimeout(() => setPieceSpawnPulse(false), 180);
    emitSound("start");
    triggerHaptic(18);

    if (gameSurfaceRef.current) {
      gameSurfaceRef.current.focus();
    }
  }, [playerName, clearScheduledTimeouts, clearTransientEffects, createRandomTileId, createUpcomingEntry, emitSound, getSpawnColumn, scheduleUiTimeout, triggerHaptic]);

  const resetGame = useCallback(() => {
    clearScheduledTimeouts();
    clearTransientEffects();
    scoreSubmittedRef.current = false;
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
    emitSound("reset");
  }, [clearScheduledTimeouts, clearTransientEffects, emitSound, scheduleUiTimeout]);

  const togglePauseGame = useCallback(() => {
    if (gameStarted && !gameOver) {
      setIsPaused(!isPaused);
      setMessage(isPaused ? "Resumed!" : "Paused");
      emitSound(isPaused ? "resume" : "pause");
    }
  }, [gameStarted, gameOver, isPaused, emitSound]);

  const movePieceHorizontal = useCallback(
    (direction) => {
      if (!gameStarted || gameOver || isPaused || !currentPiece) return;

      const newCol = currentPieceCol + direction;
      if (canPlacePiece(grid, currentPiece, currentPieceRow, newCol)) {
        setCurrentPieceCol(newCol);
        lastMoveWasRotateRef.current = false;
        emitSound("move");
      }
    },
    [gameStarted, gameOver, isPaused, grid, currentPiece, currentPieceRow, currentPieceCol, emitSound]
  );

  const softDropCurrentPiece = useCallback(() => {
    if (!gameStarted || gameOver || isPaused || !currentPiece) return;

    const newRow = currentPieceRow + 1;
    if (canPlacePiece(grid, currentPiece, newRow, currentPieceCol)) {
      setCurrentPieceRow(newRow);
      setScore((prev) => prev + 1);
      setSoftDropPulse(true);
      scheduleUiTimeout(() => setSoftDropPulse(false), 90);
      emitSound("softDrop");
      lastMoveWasRotateRef.current = false;
      return;
    }

    lockCurrentPiece(currentPieceRow, { source: "lock" });
  }, [gameStarted, gameOver, isPaused, grid, currentPiece, currentPieceRow, currentPieceCol, emitSound, lockCurrentPiece, scheduleUiTimeout]);

  const hardDropCurrentPiece = useCallback(() => {
    if (!gameStarted || gameOver || isPaused || !currentPiece) return;

    const dropRow = getDropRow(grid, currentPiece, currentPieceRow, currentPieceCol);
    const dropDistance = dropRow - currentPieceRow;
    setScore((prev) => prev + dropDistance * 2);
    const trailCells = [];
    for (let travelRow = currentPieceRow; travelRow <= dropRow; travelRow += 1) {
      const travelProgress = dropDistance <= 0 ? 1 : (travelRow - currentPieceRow + 1) / (dropDistance + 1);
      const isTrailLead = travelRow === dropRow;
      getPieceCells(currentPiece, travelRow, currentPieceCol, currentTileId).forEach((cell, cellIndex) => {
        trailCells.push({
          ...cell,
          trailOpacity: 0.02 + (travelProgress * 0.12) + (isTrailLead ? 0.04 : 0),
          trailScale: 0.96 + (travelProgress * 0.04),
          trailScaleY: 0.92 + (travelProgress * 0.08),
          trailLift: Math.round(-3 + (travelProgress * 2)),
          trailGlow: 0.04 + (travelProgress * 0.08),
          trailBlur: 0.04 + (travelProgress * 0.06),
          trailLead: isTrailLead,
          trailOrder: trailCells.length + cellIndex,
        });
      });
    }
    setHardDropTrail(trailCells);
    setHardDropPulse(true);
    scheduleUiTimeout(() => setHardDropPulse(false), HARD_DROP_TRAIL_DURATION_MS);
    scheduleUiTimeout(() => setHardDropTrail([]), HARD_DROP_TRAIL_DURATION_MS);
    emitSound("hardDrop");
    triggerHaptic(16);
    lastMoveWasRotateRef.current = false;
    lockCurrentPiece(dropRow, { source: "hard-drop", dropDistance });
  }, [gameStarted, gameOver, isPaused, grid, currentPiece, currentPieceRow, currentPieceCol, currentTileId, emitSound, lockCurrentPiece, scheduleUiTimeout, triggerHaptic]);

  const applyRotationWithKick = useCallback((rotatedPiece) => {
    const kickOffsets = [
      { row: 0, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
      { row: 0, col: -2 },
      { row: 0, col: 2 },
      { row: -1, col: 0 },
      { row: -1, col: -1 },
      { row: -1, col: 1 },
      { row: 1, col: 0 },
    ];

    for (const offset of kickOffsets) {
      const nextRow = currentPieceRow + offset.row;
      const nextCol = currentPieceCol + offset.col;

      if (!canPlacePiece(grid, rotatedPiece, nextRow, nextCol)) continue;

      setCurrentPiece(rotatedPiece);
      setCurrentPieceRow(nextRow);
      setCurrentPieceCol(nextCol);
      emitSound(offset.row === 0 && offset.col === 0 ? "rotate" : "wallKick");
      setRotatePulse(true);
      scheduleUiTimeout(() => setRotatePulse(false), 110);
      lastMoveWasRotateRef.current = true;
      return true;
    }

    return false;
  }, [currentPieceCol, currentPieceRow, emitSound, grid, scheduleUiTimeout]);

  const rotateCurrentPiece = useCallback(() => {
    if (!gameStarted || gameOver || isPaused || !currentPiece) return;

    const rotated = rotatePiece(currentPiece);
    applyRotationWithKick(rotated);
  }, [applyRotationWithKick, currentPiece, gameOver, gameStarted, isPaused]);

  const rotateCurrentPieceCounterClockwise = useCallback(() => {
    if (!gameStarted || gameOver || isPaused || !currentPiece) return;

    const rotated = rotatePieceCounterClockwise(currentPiece);
    applyRotationWithKick(rotated);
  }, [applyRotationWithKick, currentPiece, gameOver, gameStarted, isPaused]);

  const holdCurrentPiece = useCallback(() => {
    if (!gameStarted || gameOver || isPaused || !currentPiece || !canHoldPiece) return;

    let newCurrent = nextPiece;
    let newCurrentKey = nextPieceKey;
    let newCurrentTileId = nextTileId;
    let newHold = currentPiece;
    let newHoldKey = currentPieceKey;
    let newHoldTileId = currentTileId;
    let refreshedNextEntry = null;

    if (holdPiece) {
      newCurrent = holdPiece;
      newCurrentKey = holdPieceKey;
      newCurrentTileId = holdTileId;
      newHold = currentPiece;
      newHoldKey = currentPieceKey;
      newHoldTileId = currentTileId;
    } else {
      refreshedNextEntry = createUpcomingEntry();
    }

    setCurrentPiece(newCurrent);
    setCurrentPieceKey(newCurrentKey);
    setCurrentTileId(newCurrentTileId);
    setCurrentPieceRow(0);
    setCurrentPieceCol(getSpawnColumn(newCurrent));
    setHoldPiece(newHold);
    setHoldPieceKey(newHoldKey);
    setHoldTileId(newHoldTileId);
    setCanHoldPiece(false);
    setPieceSpawnPulse(true);
    scheduleUiTimeout(() => setPieceSpawnPulse(false), 180);
    lastMoveWasRotateRef.current = false;

    if (refreshedNextEntry) {
      setNextPiece(refreshedNextEntry.piece);
      setNextPieceKey(refreshedNextEntry.pieceKey);
      setNextTileId(refreshedNextEntry.tileId);
    }

    emitSound("hold");
  }, [gameStarted, gameOver, isPaused, currentPiece, currentPieceKey, holdPiece, holdPieceKey, nextPiece, nextPieceKey, currentTileId, holdTileId, nextTileId, createUpcomingEntry, emitSound, getSpawnColumn, scheduleUiTimeout]);

  const handleBoardTouchStart = useCallback((event) => {
    if (selectedLeaderboardEntry) return;

    const touch = event.touches?.[0];
    if (!touch) return;

    touchGestureRef.current = {
      activeTouchId: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };

    focusBoard(false);
  }, [focusBoard, selectedLeaderboardEntry]);

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
    if (selectedLeaderboardEntry) {
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
      rotateCurrentPiece();
      touchGestureRef.current.activeTouchId = null;
      return;
    }

    if (absX >= absY) {
      if (absX >= TOUCH_SWIPE_THRESHOLD_PX) {
        movePieceHorizontal(deltaX > 0 ? 1 : -1);
      }
    } else if (absY >= TOUCH_SWIPE_THRESHOLD_PX) {
      if (deltaY > 0) {
        const isHardDropFlick = absY >= TOUCH_HARD_DROP_FLICK_PX && elapsedMs <= TOUCH_HARD_DROP_FLICK_DURATION_MS;
        if (isHardDropFlick) {
          hardDropCurrentPiece();
        } else {
          softDropCurrentPiece();
        }
      }
    }

    touchGestureRef.current.activeTouchId = null;
  }, [hardDropCurrentPiece, movePieceHorizontal, rotateCurrentPiece, selectedLeaderboardEntry, softDropCurrentPiece]);

  const handleBoardTouchCancel = useCallback(() => {
    touchGestureRef.current.activeTouchId = null;
  }, []);

  function lockCurrentPiece(lockedRow = currentPieceRow, options = {}) {
    if (!currentPiece) return;

    const { source = "lock", dropDistance = 0 } = options;

    const placedGrid = placePiece(grid, currentPiece, lockedRow, currentPieceCol, currentTileId);
    const lockedCells = getPieceCells(currentPiece, lockedRow, currentPieceCol, currentTileId);
    const clearedRows = placedGrid.reduce((indices, row, rowIndex) => {
      if (row.every((cell) => cell !== null)) {
        indices.push(rowIndex);
      }
      return indices;
    }, []);
    const { grid: settledGrid, clearedLineCount } = clearLines(placedGrid);
    const didTSpin = currentPieceKey === "T" && lastMoveWasRotateRef.current && countTSpinCornerOccupancy(currentPiece, lockedRow, currentPieceCol, grid) >= 3;
    const lineScoreTable = [0, 100, 300, 500, 800];
    const tSpinScoreTable = [400, 800, 1200, 1600];
    const comboBonusCount = clearedLineCount > 0 ? comboChainRef.current : 0;
    const comboBonus = clearedLineCount > 0 ? 50 * comboBonusCount * level : 0;
    const isDifficultClear = clearedLineCount === 4 || (didTSpin && clearedLineCount > 0);
    const receivesBackToBackBonus = isDifficultClear && previousClearWasTetrisRef.current;
    const nextClearIntensity = getClearIntensityValue(clearedLineCount, didTSpin);
    const baseActionScore = didTSpin
      ? (tSpinScoreTable[clearedLineCount] || tSpinScoreTable[0]) * level
      : (lineScoreTable[clearedLineCount] || 0) * level;
    const actionScore = receivesBackToBackBonus ? Math.floor(baseActionScore * 1.5) : baseActionScore;
    const bonusPoints = actionScore + comboBonus;
    const nextLinesClearedTotal = linesCleared + clearedLineCount;
    const nextLevel = Math.floor(nextLinesClearedTotal / 10) + 1;
    const upcomingEntry = nextPiece
      ? { piece: nextPiece, pieceKey: nextPieceKey, tileId: nextTileId }
      : createUpcomingEntry();
    const upcomingPiece = upcomingEntry.piece;
    const upcomingPieceKey = upcomingEntry.pieceKey;
    const upcomingTileId = upcomingEntry.tileId;
    const refreshedUpcomingEntry = createUpcomingEntry();
    const spawnCol = getSpawnColumn(upcomingPiece);
    const canSpawnUpcomingPiece = canPlacePiece(settledGrid, upcomingPiece, 0, spawnCol);

    setGrid(settledGrid);
    setLinesCleared(nextLinesClearedTotal);
    setLevel(nextLevel);
    setCanHoldPiece(true);
    setLockPulseCells(lockedCells);
    scheduleUiTimeout(() => setLockPulseCells([]), 180);
    const nextImpactPulse = createImpactPulseState(lockedCells, source, dropDistance);
    if (nextImpactPulse) {
      setImpactPulse(nextImpactPulse);
      scheduleUiTimeout(() => {
        setImpactPulse((previousPulse) => (previousPulse?.id === nextImpactPulse.id ? null : previousPulse));
      }, IMPACT_PULSE_DURATION_MS);
    }
    setComboCount(comboBonusCount);
    setBackToBackActive(receivesBackToBackBonus);
    setTSpinActive(didTSpin);
    if (didTSpin) {
      scheduleUiTimeout(() => setTSpinActive(false), 1200);
    }

    if (nextLevel > level) {
      setLevelUpPulse(true);
      scheduleUiTimeout(() => setLevelUpPulse(false), 1000);
      emitSound("levelUp");
    }

    if (bonusPoints > 0) {
      const popupId = `${Date.now()}-${Math.random()}`;
      setScore((previousScore) => previousScore + bonusPoints);
      setPointPopups((previousPopups) => ([
        ...previousPopups,
        { id: popupId, points: bonusPoints, isTetris: clearedLineCount === 4, isTSpin: didTSpin, xOffset: 0 },
      ]));
      scheduleUiTimeout(() => {
        setPointPopups((previousPopups) => previousPopups.filter((popup) => popup.id !== popupId));
      }, 1400);
    }

    if (clearedLineCount > 0) {
      const shiftingBlocks = placedGrid.reduce((blocks, row, rowIndex) => {
        if (clearedRows.includes(rowIndex)) return blocks;

        const shiftCount = clearedRows.filter((clearedRowIndex) => clearedRowIndex > rowIndex).length;
        if (shiftCount <= 0) return blocks;
        const nearestClearedRowDistance = Math.min(
          ...clearedRows
            .filter((clearedRowIndex) => clearedRowIndex > rowIndex)
            .map((clearedRowIndex) => clearedRowIndex - rowIndex)
        );
        const shiftDelayMs = Math.min(Math.max(nearestClearedRowDistance - 1, 0) * ROW_COLLAPSE_STAGGER_MS, 120);

        row.forEach((tileId, colIndex) => {
          if (tileId === null) return;

          blocks.push({
            id: `shift-${rowIndex}-${colIndex}-${tileId}`,
            rowIndex,
            colIndex,
            tileId,
            shiftCount,
            shiftDelayMs,
          });
        });

        return blocks;
      }, []);

      const nextClearEffectVariant = didTSpin
        ? "tspin"
        : clearedLineCount === 4
          ? "tetris"
          : clearedLineCount > 1
            ? "multi"
            : "single";

      setClearEffectVariant(nextClearEffectVariant);
      setClearIntensity(nextClearIntensity);
      setRowClearFlashRows(clearedRows);
      setRowShiftBlocks(shiftingBlocks);
      setIsTetrisClearActive(clearedLineCount === 4);
      setMessage(
        didTSpin
          ? `T-Spin${clearedLineCount > 0 ? ` ${["", "Single", "Double", "Triple"][clearedLineCount]}` : ""}!`
          : clearedLineCount === 4
            ? `${receivesBackToBackBonus ? "Back-to-Back Tetris!" : "Tetris! Four lines cleared!"}`
            : `${clearedLineCount} line${clearedLineCount > 1 ? "s" : ""} cleared!`
      );
      const maxShiftDelayMs = shiftingBlocks.reduce((maxDelay, block) => Math.max(maxDelay, block.shiftDelayMs || 0), 0);
      const clearEffectDuration = Math.min(
        LINE_SHIFT_DURATION_MAX_MS,
        LINE_SHIFT_DURATION_BASE_MS + (clearedLineCount * LINE_SHIFT_DURATION_PER_ROW_MS)
      ) + maxShiftDelayMs;
      scheduleUiTimeout(() => {
        setRowClearFlashRows([]);
        setClearEffectVariant("single");
        setClearIntensity(1);
      }, Math.max(LINE_CLEAR_FLASH_DURATION_MS, clearEffectDuration));
      scheduleUiTimeout(() => {
        setRowShiftBlocks([]);
      }, clearEffectDuration);

      if (clearedLineCount === 4) {
        scheduleUiTimeout(() => setIsTetrisClearActive(false), LINE_SHIFT_DURATION_MAX_MS + 140);
      }

      emitSound(
        didTSpin
          ? "tSpin"
          : clearedLineCount === 4
            ? (receivesBackToBackBonus ? "backToBack" : "tetris")
            : clearedLineCount > 1
              ? "lineClearMulti"
              : "lineClear"
      );
      triggerHaptic(clearedLineCount === 4 ? 28 : 16);
      comboChainRef.current += 1;
      previousClearWasTetrisRef.current = isDifficultClear;
    } else {
      if (didTSpin) {
        setMessage("T-Spin! +400 × level");
        emitSound("tSpin");
        triggerHaptic(18);
      } else {
        setMessage("Keep stacking clean.");
        setTSpinActive(false);
        emitSound("lock");
      }
      setClearEffectVariant("single");
      setClearIntensity(1);
      setComboCount(0);
      setBackToBackActive(false);
      comboChainRef.current = 0;
      previousClearWasTetrisRef.current = false;
    }

    if (!canSpawnUpcomingPiece) {
      setCurrentPiece(null);
      setCurrentPieceKey(null);
      setGameOver(true);
      setIsPaused(false);
      setMessage("Game over! Tap Play Again to run it back.");
      emitSound("gameOver");
      triggerHaptic(32);
      return;
    }

    setCurrentPiece(upcomingPiece);
    setCurrentPieceKey(upcomingPieceKey);
    setCurrentTileId(upcomingTileId);
    setCurrentPieceRow(0);
    setCurrentPieceCol(spawnCol);
    setNextPiece(refreshedUpcomingEntry.piece);
    setNextPieceKey(refreshedUpcomingEntry.pieceKey);
    setNextTileId(refreshedUpcomingEntry.tileId);
    setPieceSpawnPulse(true);
    scheduleUiTimeout(() => setPieceSpawnPulse(false), 180);
    lastMoveWasRotateRef.current = false;
  }

  const stepActivePieceDown = useCallback(() => {
    if (!gameStarted || gameOver || isPaused || !currentPiece) return;

    const nextRow = currentPieceRow + 1;
    if (canPlacePiece(grid, currentPiece, nextRow, currentPieceCol)) {
      setCurrentPieceRow(nextRow);
      return;
    }

    lockCurrentPiece(currentPieceRow, { source: "lock" });
  }, [currentPiece, currentPieceCol, currentPieceRow, gameOver, gameStarted, grid, isPaused, lockCurrentPiece]);

  useEffect(() => {
    if (!gameStarted || gameOver || isPaused || !currentPiece) return undefined;

    const fallDelay = Math.max(120, 760 - (level - 1) * 55);
    const timerId = window.setTimeout(() => {
      stepActivePieceDown();
    }, fallDelay);

    return () => clearTimeout(timerId);
  }, [currentPiece, gameOver, gameStarted, isPaused, level, stepActivePieceDown]);

  useEffect(() => {

    const handleKeyDown = (event) => {
      if (selectedLeaderboardEntry || isMobileLeaderboardOpen) return;

      const activeElement = document.activeElement;
      const isTypingIntoField = activeElement instanceof HTMLElement
        && ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
      if (isTypingIntoField) return;

      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Spacebar", "c", "C", "p", "P", "Escape", "z", "Z", "x", "X", "Shift", "Enter", "r", "R"].includes(event.key)) {
        event.preventDefault();
      }

      if ((event.key === "Enter") && !gameStarted && !gameOver) {
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
  }, [gameOver, gameStarted, hardDropCurrentPiece, holdCurrentPiece, isMobileLeaderboardOpen, movePieceHorizontal, resetGame, rotateCurrentPiece, rotateCurrentPieceCounterClockwise, selectedLeaderboardEntry, softDropCurrentPiece, startGame, togglePauseGame]);

  useEffect(() => {
    if (!gameOver || !gameStarted || scoreSubmittedRef.current) return;

    scoreSubmittedRef.current = true;
    void submitScore(score, level, linesCleared);
  }, [gameOver, gameStarted, level, linesCleared, score, submitScore]);

  useEffect(() => {
    if (!gameStarted) {
      previousScoreRef.current = score;
      previousLevelRef.current = level;
      previousLinesRef.current = linesCleared;
      return;
    }

    if (score !== previousScoreRef.current) {
      setScorePulse(true);
      scheduleUiTimeout(() => setScorePulse(false), 140);
      previousScoreRef.current = score;
    }

    if (level !== previousLevelRef.current) {
      setLevelPulse(true);
      scheduleUiTimeout(() => setLevelPulse(false), 140);
      previousLevelRef.current = level;
    }

    if (linesCleared !== previousLinesRef.current) {
      setLinesPulse(true);
      scheduleUiTimeout(() => setLinesPulse(false), 140);
      previousLinesRef.current = linesCleared;
    }
  }, [gameStarted, linesCleared, level, score, scheduleUiTimeout]);

  useEffect(() => {
    setBestRun((previousBestRun) => {
      const isBetterRun = score > previousBestRun.score
        || (score === previousBestRun.score && level > previousBestRun.level)
        || (score === previousBestRun.score && level === previousBestRun.level && linesCleared > previousBestRun.lines);

      if (!isBetterRun) return previousBestRun;

      return {
        score,
        level,
        lines: linesCleared,
      };
    });
  }, [linesCleared, level, score]);

  const getBrandColor = useCallback((tileId) => {
    const availableTiles = brandTiles.length > 0 ? brandTiles : FALLBACK_BRANDS;
    if (typeof tileId === "number" && Number.isFinite(tileId)) {
      return BLOCK_COLORS[Math.abs(tileId) % BLOCK_COLORS.length];
    }

    const fallbackIndex = availableTiles.findIndex((tile) => tile.id === tileId);
    return BLOCK_COLORS[(fallbackIndex >= 0 ? fallbackIndex : 0) % BLOCK_COLORS.length];
  }, [brandTiles]);

  const getBrandTile = useCallback((tileId) => {
    const availableTiles = brandTiles.length > 0 ? brandTiles : FALLBACK_BRANDS;
    return availableTiles.find((tile) => tile.id === tileId)
      || (typeof tileId === "number" ? availableTiles[Math.abs(tileId) % availableTiles.length] : null)
      || availableTiles[0]
      || FALLBACK_BRANDS[0];
  }, [brandTiles]);

  const getBrandShortLabel = useCallback((brandName) => {
    if (!brandName) return "?";
    const label = KNOWN_BRAND_LABELS[brandName.toLowerCase()];
    if (label) return label;
    return brandName.substring(0, 3).toUpperCase();
  }, []);

  const createPreviewMatrix = useCallback((piece) => {
    if (!piece) return [];
    const maxRow = Math.max(...piece.map((_, i) => i));
    const maxCol = Math.max(...piece.map((row) => Math.max(...row.map((_, j) => j))));
    const matrix = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(0));

    piece.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (matrix[rowIndex]) matrix[rowIndex][colIndex] = cell;
      });
    });

    return matrix;
  }, []);

  const getPreviewGridStyle = useCallback((matrix) => {
    const rowCount = matrix.length || 1;
    const columnCount = Math.max(1, ...matrix.map((row) => row.length || 0));

    return {
      gridTemplateColumns: `repeat(${columnCount}, var(--tetris-mini-block-size))`,
      gridTemplateRows: `repeat(${rowCount}, var(--tetris-mini-block-size))`,
    };
  }, []);

  const getMedalIcon = useCallback((rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  }, []);

  const nextBrandTile = useMemo(() => (nextTileId !== null && nextTileId !== undefined ? getBrandTile(nextTileId) : null), [nextTileId, getBrandTile]);
  const nextPiecePreview = useMemo(() => createPreviewMatrix(nextPiece), [nextPiece]);
  const holdBrandTile = useMemo(() => (holdTileId !== null && holdTileId !== undefined ? getBrandTile(holdTileId) : null), [getBrandTile, holdTileId]);
  const holdPiecePreview = useMemo(() => createPreviewMatrix(holdPiece), [holdPiece]);
  const ghostPieceRow = useMemo(() => {
    if (!currentPiece || !gameStarted || gameOver) return null;
    return getDropRow(grid, currentPiece, currentPieceRow, currentPieceCol);
  }, [currentPiece, currentPieceCol, currentPieceRow, gameOver, gameStarted, grid]);
  const shimmerSweepRows = useMemo(() => [...rowClearFlashRows].sort((leftRow, rightRow) => rightRow - leftRow), [rowClearFlashRows]);
  const activePlayerStats = selectedPlayerStats || selectedLeaderboardEntry;

  const leaderboardListContent = (
    <>
      {leaderboardLoading && <p className="text-muted">Loading leaderboard...</p>}
      {!leaderboardLoading && leaderboardError && <p className="text-muted">{leaderboardError}</p>}
      {!leaderboardLoading && !leaderboardError && filteredLeaderboard.length === 0 && <p className="text-muted">Play a round to create the first score.</p>}

      {!leaderboardLoading && !leaderboardError && filteredLeaderboard.length > 0 && (
        <div className="tetris-mini-leaderboard tetris-leaderboard-panel" role="table" aria-label={`Top Tetris scores - ${leaderboardTimeFilter} - sorted by ${leaderboardSortBy}`}>
          {filteredLeaderboard.map((entry, index) => (
            <button
              key={entry.id || `${entry.playerName}-${index}`}
              type="button"
              className={index < 3 ? "tetris-mini-leaderboard-row is-medal is-clickable" : "tetris-mini-leaderboard-row is-clickable"}
              role="row"
              onClick={() => openPlayerModal(entry)}
              aria-label={`View leaderboard details for ${entry.playerName || "Anonymous"}`}
            >
              <span className="tetris-mini-leaderboard-rank" role="cell">{getMedalIcon(entry.displayRank) || `#${entry.displayRank}`}</span>
              <div className="tetris-mini-leaderboard-copy">
                <span className="tetris-mini-leaderboard-player" role="cell">{entry.playerName || "Anonymous"}</span>
                <span className="tetris-mini-leaderboard-subline" role="cell">
                  {(entry.totalGames || 0)} game{entry.totalGames !== 1 ? "s" : ""} • {entry.totalLinesCleared || 0} lines • {formatRelativeTime(entry.lastPlayed)}
                </span>
              </div>
              <div className="tetris-mini-leaderboard-score-stack">
                <span className="tetris-mini-leaderboard-score" role="cell">{entry.highestScore?.toLocaleString() || 0}</span>
                <span className="tetris-mini-leaderboard-level" role="cell">L{entry.highestLevel || 1}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );

  useEffect(() => {
    if (viewportSize.width >= 768 && isMobileLeaderboardOpen) {
      setIsMobileLeaderboardOpen(false);
    }
  }, [isMobileLeaderboardOpen, viewportSize.width]);

  useEffect(() => {
    if (!isMobileLeaderboardOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeMobileLeaderboard();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeMobileLeaderboard, isMobileLeaderboardOpen]);

  const renderTileFace = useCallback((tileId, compact = false) => {
    const tile = getBrandTile(tileId);
    if (tile?.logoUrl) {
      return (
        <span className={`tetris-brand-chip ${compact ? "is-compact" : ""}`}>
          <img className="tetris-brand-logo" src={tile.logoUrl} alt={tile.name} loading="lazy" />
        </span>
      );
    }

    return (
      <span className={`tetris-brand-chip ${compact ? "is-compact" : ""} is-text`}>
        <span className="tetris-brand-short-label">{getBrandShortLabel(tile?.name)}</span>
      </span>
    );
  }, [getBrandTile]);

  return (
    <div className="tetris-game-container">
      <div ref={shellRef} className={isFullscreen ? "tetris-shell is-fullscreen-focus" : "tetris-shell"}>
        <header className={gameStarted && !gameOver ? "tetris-header is-live" : "tetris-header"}>
          <div className="tetris-header-copy">
            <p className="tetris-header-kicker">Arcade brand challenge</p>
            <h1>Brand Tetris</h1>
            <p className="tetris-header-subtitle">Stack sneaker brands, clear lines, and chase the top spot on the leaderboard.</p>
          </div>
          <div className="tetris-header-actions" aria-label="Game utilities">
            <button
              type="button"
              className="tetris-header-action-btn"
              onClick={toggleSound}
              aria-label={soundEnabled ? "Mute game sound" : "Enable game sound"}
              title={soundEnabled ? "Sound on" : "Sound off"}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span>{soundEnabled ? "Sound" : "Muted"}</span>
            </button>
            <button
              type="button"
              className="tetris-header-action-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              <span>{isFullscreen ? "Window" : "Focus"}</span>
            </button>
          </div>
        </header>

        <div className="tetris-main">
          {/* COLUMN 1: LEADERBOARD (LEFT) */}
          <aside className="tetris-layout-column tetris-leaderboard-column" aria-label="Leaderboard column">
            <section className="tetris-panel tetris-panel-compact tetris-panel-featured tetris-hud-card tetris-leaderboard-embed tetris-leaderboard-panel" aria-label="Embedded Tetris leaderboard">
              <div className="tetris-panel-heading tetris-panel-heading-compact">
                <h2 className="tetris-panel-title"><Trophy size={16} /> Leaderboard</h2>
              </div>

              {leaderboardLoading && <p className="text-muted">Loading leaderboard...</p>}
              {!leaderboardLoading && leaderboardError && <p className="text-muted">{leaderboardError}</p>}
              {!leaderboardLoading && !leaderboardError && filteredLeaderboard.length === 0 && <p className="text-muted">Play a round to create the first score.</p>}
              {leaderboardListContent}
            </section>
          </aside>

          {/* COLUMN 2: GAME BOARD (CENTER) */}
          <section className="tetris-layout-column tetris-board-column">
            <div className="tetris-playfield">
              <div className="tetris-playfield-layout">
                <div className="tetris-playfield-board-wrap">
                  <div className="tetris-playfield-board" ref={boardFrameRef}>
                    <div
                      className={[
                        "tetris-board-shell",
                        rowClearFlashRows.length > 0 ? "is-clear-shaking" : "",
                        isTetrisClearActive ? "is-tetris-clear" : "",
                        levelUpPulse ? "is-level-up" : "",
                        restartPulse ? "is-restarting" : "",
                        tSpinActive ? "is-tspin-active" : "",
                      ].filter(Boolean).join(" ")}
                      style={{
                        "--tetris-board-shell-width": `min(100%, ${boardShellWidth}px)`,
                        "--tetris-clear-intensity": `${clearIntensity}`,
                        "--tetris-shake-x": `${(1.8 + clearIntensity * 1.75).toFixed(2)}px`,
                        "--tetris-shake-y": `${(0.8 + clearIntensity * 0.55).toFixed(2)}px`,
                        "--tetris-shake-duration": `${Math.round(210 + clearIntensity * 82)}ms`,
                        "--tetris-shake-scale-mid": `${(1 + clearIntensity * 0.0028).toFixed(4)}`,
                        "--tetris-shake-scale-peak": `${(1 + clearIntensity * 0.0042).toFixed(4)}`,
                        "--tetris-shake-scale-tail": `${(1 + clearIntensity * 0.0018).toFixed(4)}`,
                      }}
                    >
                      <div className="tetris-board-chrome">
                        <div>
                          <p className="tetris-board-kicker">Main playfield</p>
                          <h2 className="tetris-board-title">Game Board</h2>
                        </div>
                        <div className="tetris-board-meta" aria-label="Board details">
                          <span className="tetris-board-chip">10 × 20 grid</span>
                          <span className={`tetris-board-chip ${isBoardFocused ? "is-active" : ""}`}>{isBoardFocused ? "Keyboard ready" : "Touch ready"}</span>
                        </div>
                      </div>

                      <div className="tetris-grid-stage">
                        {isTetrisClearActive && <div className="tetris-clear-burst" aria-hidden="true" />}
                        {hardDropPulse && <div className="tetris-hard-drop-flash" aria-hidden="true" />}
                        <div
                          ref={gameSurfaceRef}
                          className={[
                            "tetris-grid",
                            isPaused ? "is-paused" : "",
                            pieceSpawnPulse ? "is-spawning" : "",
                            rotatePulse ? "is-rotating" : "",
                            softDropPulse ? "is-soft-dropping" : "",
                            hardDropPulse ? "is-hard-dropping" : "",
                            restartPulse ? "is-restarting" : "",
                          ].filter(Boolean).join(" ")}
                          tabIndex={0}
                          onMouseDown={focusBoard}
                          onTouchStart={handleBoardTouchStart}
                          onTouchMove={handleBoardTouchMove}
                          onTouchEnd={handleBoardTouchEnd}
                          onTouchCancel={handleBoardTouchCancel}
                          onFocus={() => setIsBoardFocused(true)}
                          onBlur={() => setIsBoardFocused(false)}
                          style={{
                            "--tetris-cell-size": `${blockSize}px`,
                            "--tetris-grid-inset": `${GRID_INSET_PX}px`,
                            width: GRID_WIDTH * blockSize + GRID_INSET_PX * 2,
                            height: GRID_HEIGHT * blockSize + GRID_INSET_PX * 2,
                          }}
                          aria-label="Tetris board"
                        >
                          {grid.map((row, rowIndex) =>
                            row.map((tileId, colIndex) => (
                              tileId !== null && (
                                <div
                                  key={`${rowIndex}-${colIndex}`}
                                  className="tetris-block"
                                  style={{
                                    left: GRID_INSET_PX + colIndex * blockSize,
                                    top: GRID_INSET_PX + rowIndex * blockSize,
                                    width: blockSize,
                                    height: blockSize,
                                    backgroundColor: getBrandColor(tileId),
                                  }}
                                  title={getBrandTile(tileId)?.name || "Brand block"}
                                >
                                  {renderTileFace(tileId, true)}
                                </div>
                              )
                            ))
                          )}

                          {rowClearFlashRows.length > 0 && (
                            <div className={`tetris-row-clear-overlay is-${clearEffectVariant}`} aria-hidden="true" />
                          )}

                          {shimmerSweepRows.map((rowIndex, index) => (
                            <div
                              key={`shimmer-row-${rowIndex}-${clearEffectVariant}`}
                              className={`tetris-cleared-row-shimmer is-${clearEffectVariant}`}
                              style={{
                                left: GRID_INSET_PX,
                                top: GRID_INSET_PX + rowIndex * blockSize,
                                width: GRID_WIDTH * blockSize,
                                height: blockSize,
                                "--tetris-row-shimmer-delay": `${Math.min(index * 42, 132)}ms`,
                                "--tetris-row-shimmer-intensity": `${clearIntensity}`,
                              }}
                              aria-hidden="true"
                            />
                          ))}

                          {rowClearFlashRows.map((rowIndex) => (
                            <div
                              key={`flash-row-${rowIndex}`}
                              className={`tetris-cleared-row-flash is-${clearEffectVariant}`}
                              style={{
                                left: GRID_INSET_PX,
                                top: GRID_INSET_PX + rowIndex * blockSize,
                                width: GRID_WIDTH * blockSize,
                                height: blockSize,
                              }}
                              aria-hidden="true"
                            />
                          ))}

                          {rowShiftBlocks.map((block) => (
                            <div
                              key={block.id}
                              className="tetris-block tetris-block-row-shift"
                              style={{
                                left: GRID_INSET_PX + block.colIndex * blockSize,
                                top: GRID_INSET_PX + block.rowIndex * blockSize,
                                width: blockSize,
                                height: blockSize,
                                backgroundColor: getBrandColor(block.tileId),
                                "--tetris-row-shift-distance": `${block.shiftCount * blockSize}px`,
                                "--tetris-row-shift-duration": `${Math.min(
                                  LINE_SHIFT_DURATION_MAX_MS,
                                  LINE_SHIFT_DURATION_BASE_MS + (block.shiftCount * LINE_SHIFT_DURATION_PER_ROW_MS)
                                )}ms`,
                                "--tetris-row-shift-delay": `${block.shiftDelayMs || 0}ms`,
                              }}
                              aria-hidden="true"
                            >
                              {renderTileFace(block.tileId, true)}
                            </div>
                          ))}

                          {hardDropTrail.map((cell, index) => (
                            <div
                              key={`trail-${cell.row}-${cell.col}-${cell.tileId}-${index}`}
                              className={[
                                "tetris-block",
                                "tetris-block-hard-drop-trail",
                                cell.trailLead ? "is-lead" : "",
                              ].filter(Boolean).join(" ")}
                              style={{
                                left: GRID_INSET_PX + cell.col * blockSize,
                                top: GRID_INSET_PX + cell.row * blockSize,
                                width: blockSize,
                                height: blockSize,
                                backgroundColor: getBrandColor(cell.tileId),
                                opacity: cell.trailOpacity,
                                "--tetris-hard-drop-delay": `${Math.min((cell.trailOrder || index) * 4, 90)}ms`,
                                "--tetris-hard-drop-duration": `${HARD_DROP_TRAIL_DURATION_MS}ms`,
                                "--tetris-hard-drop-scale-x": `${cell.trailScale || 1}`,
                                "--tetris-hard-drop-scale-y": `${cell.trailScaleY || cell.trailScale || 1}`,
                                "--tetris-hard-drop-lift": `${cell.trailLift || -4}px`,
                                "--tetris-hard-drop-glow": `${cell.trailGlow || 0.2}`,
                                "--tetris-hard-drop-blur": `${cell.trailBlur || 0.18}px`,
                              }}
                              aria-hidden="true"
                            />
                          ))}

                          {impactPulse && (
                            <div
                              key={impactPulse.id}
                              className={`tetris-impact-ring is-${impactPulse.variant}`}
                              style={{
                                left: GRID_INSET_PX + (impactPulse.minCol - 0.22) * blockSize,
                                top: GRID_INSET_PX + (impactPulse.bottomRow + 0.52) * blockSize,
                                width: (impactPulse.widthCells + 0.44) * blockSize,
                                height: Math.max(blockSize * 0.74, 14),
                                "--tetris-impact-opacity": `${Math.min(1, 0.7 + impactPulse.strength * 0.16).toFixed(3)}`,
                                "--tetris-impact-scale-start": `${(0.62 * impactPulse.strength).toFixed(3)}`,
                                "--tetris-impact-scale-mid": `${(0.96 + impactPulse.strength * 0.16).toFixed(3)}`,
                                "--tetris-impact-scale-end": `${(1.14 + impactPulse.strength * 0.24).toFixed(3)}`,
                              }}
                              aria-hidden="true"
                            />
                          )}

                          {lockPulseCells.map((cell, index) => (
                            <div
                              key={`lock-${cell.row}-${cell.col}-${cell.tileId}-${index}`}
                              className="tetris-block tetris-block-lock-pulse"
                              style={{
                                left: GRID_INSET_PX + cell.col * blockSize,
                                top: GRID_INSET_PX + cell.row * blockSize,
                                width: blockSize,
                                height: blockSize,
                                backgroundColor: getBrandColor(cell.tileId),
                              }}
                              aria-hidden="true"
                            >
                              {renderTileFace(cell.tileId, true)}
                            </div>
                          ))}

                          {currentPiece && ghostPieceRow !== null && ghostPieceRow !== currentPieceRow && currentPiece.map((row, rowIndex) =>
                            row.map((cell, colIndex) => (
                              cell ? (
                                <div
                                  key={`ghost-${rowIndex}-${colIndex}`}
                                  className="tetris-block tetris-block-ghost"
                                  style={{
                                    left: GRID_INSET_PX + (currentPieceCol + colIndex) * blockSize,
                                    top: GRID_INSET_PX + (ghostPieceRow + rowIndex) * blockSize,
                                    width: blockSize,
                                    height: blockSize,
                                    backgroundColor: getBrandColor(currentTileId),
                                  }}
                                  aria-hidden="true"
                                />
                              ) : null
                            ))
                          )}

                          {currentPiece && currentPiece.map((row, rowIndex) =>
                            row.map((cell, colIndex) => (
                              cell ? (
                                <div
                                  key={`piece-${rowIndex}-${colIndex}`}
                                  className={[
                                    "tetris-block",
                                    "tetris-block-falling",
                                    pieceSpawnPulse ? "is-spawn-pulse" : "",
                                    rotatePulse ? "is-rotate-pulse" : "",
                                    softDropPulse ? "is-soft-drop-pulse" : "",
                                  ].filter(Boolean).join(" ")}
                                  style={{
                                    left: GRID_INSET_PX + (currentPieceCol + colIndex) * blockSize,
                                    top: GRID_INSET_PX + (currentPieceRow + rowIndex) * blockSize,
                                    width: blockSize,
                                    height: blockSize,
                                    backgroundColor: getBrandColor(currentTileId),
                                    opacity: 0.92,
                                  }}
                                  title={getBrandTile(currentTileId)?.name || "Current brand block"}
                                >
                                  {renderTileFace(currentTileId, true)}
                                </div>
                              ) : null
                            ))
                          )}

                          {pointPopups.map((popup) => (
                            <div
                              key={popup.id}
                              className={[
                                "tetris-point-popup",
                                popup.isTetris ? "is-tetris" : "",
                                popup.isTSpin ? "is-tspin" : "",
                              ].filter(Boolean).join(" ")}
                              style={{ "--popup-x-offset": `${popup.xOffset}px` }}
                              aria-hidden="true"
                            >
                              +{popup.points}
                            </div>
                          ))}

                          {isPaused && !gameOver && (
                            <div className="tetris-pause-overlay" aria-live="polite">
                              <strong>Paused</strong>
                              <span>Press P, Esc, or tap Resume.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {gameOver && (
              <div className="tetris-game-over-overlay">
                <div className="tetris-game-over-layout">
                  <div className="tetris-game-over-content">
                    <h2>Game Over</h2>
                    <div className="tetris-game-over-stats">
                      <div className="tetris-game-over-stat">
                        <span>Score</span>
                        <strong>{score}</strong>
                      </div>
                      <div className="tetris-game-over-stat">
                        <span>Level</span>
                        <strong>{level}</strong>
                      </div>
                      <div className="tetris-game-over-stat">
                        <span>Lines</span>
                        <strong>{linesCleared}</strong>
                      </div>
                    </div>
                    <button type="button" onClick={resetGame} className="tetris-restart-btn">
                      <RotateCcw size={18} /> Play Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* COLUMN 3: DETAILS (RIGHT) */}
          <aside className="tetris-layout-column tetris-side-details" aria-label="Game details">
            <div className="tetris-playfield-topbar">
              <div className="tetris-topbar-message-stack">
                <p className="tetris-message tetris-message-compact" aria-live="polite">{message}</p>
                <p className="tetris-status-note">{isBoardFocused ? "Keyboard play is live: arrows move, Z/X rotate, Space hard-drops, Shift/C hold, and R restarts." : "Tap the board or use the visible controls. On mobile, swipe left/right to move, tap to rotate, swipe down to soft drop, and flick down to hard drop."}</p>
              </div>
              <section className="tetris-stats-bar tetris-stats-bar-compact" aria-label="Game stats">
                <div className={["stat-item", "stat-item-compact", scorePulse ? "is-pulsed" : ""].filter(Boolean).join(" ")}>
                  <span className="stat-label">Score</span>
                  <span className="stat-value">{score}</span>
                </div>
                <div className={["stat-item", "stat-item-compact", levelPulse ? "is-pulsed" : ""].filter(Boolean).join(" ")}>
                  <span className="stat-label">Level</span>
                  <span className="stat-value">{level}</span>
                </div>
                <div className={["stat-item", "stat-item-compact", linesPulse ? "is-pulsed" : ""].filter(Boolean).join(" ")}>
                  <span className="stat-label">Lines</span>
                  <span className="stat-value">{linesCleared}</span>
                </div>
              </section>
              <section className="tetris-best-run-grid" aria-label="Best score details">
                <article className="tetris-best-run-card is-personal">
                  <span className="tetris-best-run-label">Best run</span>
                  <strong>{bestRun.score.toLocaleString()}</strong>
                  <span>L{bestRun.level} • {bestRun.lines.toLocaleString()} lines</span>
                </article>
                <article className="tetris-best-run-card">
                  <span className="tetris-best-run-label">{namedPlayerBestEntry ? "Player best" : "Global top"}</span>
                  <strong>{(namedPlayerBestEntry?.highestScore || globalBestEntry?.highestScore || 0).toLocaleString()}</strong>
                  <span>
                    {namedPlayerBestEntry
                      ? `L${namedPlayerBestEntry.highestLevel || 1} • ${(namedPlayerBestEntry.totalLinesCleared || 0).toLocaleString()} lines`
                      : `${globalBestEntry?.playerName || "No leader yet"}${globalBestEntry ? ` • L${globalBestEntry.highestLevel || 1}` : ""}`}
                  </span>
                </article>
              </section>
              <div className="tetris-effect-strip" aria-live="polite">
                {comboCount > 1 && <span className="tetris-effect-chip is-combo">Combo x{comboCount}</span>}
                {backToBackActive && <span className="tetris-effect-chip is-b2b">Back-to-Back</span>}
                {tSpinActive && <span className="tetris-effect-chip is-tspin">T-Spin</span>}
                {levelUpPulse && <span className="tetris-effect-chip is-level-up">Level Up</span>}
              </div>
            </div>


            <div className="tetris-quick-panels">
              <section className="tetris-detail-panel tetris-panel tetris-panel-compact tetris-panel-priority tetris-panel-featured tetris-hud-card" aria-label="Next piece preview">
                <div className="tetris-panel-heading tetris-panel-heading-compact">
                  <h2 className="tetris-panel-title">Next</h2>
                  <span className="tetris-next-brand-name">{nextBrandTile?.name || "Waiting..."}</span>
                </div>
                <div key={nextPieceKey || "next-empty"} className="tetris-next-preview tetris-next-preview-compact tetris-hud-preview is-updated">
                  {nextPiece ? (
                    <div className="tetris-mini-grid tetris-mini-grid-compact-view" style={getPreviewGridStyle(nextPiecePreview)}>
                      {nextPiecePreview.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                          <div
                            key={`next-${rowIndex}-${colIndex}`}
                            className={cell ? "tetris-mini-block active" : "tetris-mini-block"}
                            style={{ backgroundColor: cell ? getBrandColor(nextTileId) : "transparent" }}
                            title={cell ? getBrandTile(nextTileId)?.name || "Next brand block" : undefined}
                          >
                            {cell ? renderTileFace(nextTileId, true) : null}
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <p className="text-muted">Next piece shows here.</p>
                  )}
                </div>
              </section>

              <section className="tetris-detail-panel tetris-panel tetris-panel-compact tetris-panel-subtle tetris-hud-card" aria-label="Held piece preview">
                <div className="tetris-panel-heading tetris-panel-heading-compact">
                  <h2 className="tetris-panel-title">Hold</h2>
                  <span className="tetris-next-brand-name">{holdBrandTile?.name || (canHoldPiece ? "Ready" : "Used")}</span>
                </div>
                <div key={holdPieceKey || "hold-empty"} className="tetris-next-preview tetris-next-preview-compact tetris-hud-preview is-updated">
                  {holdPiece ? (
                    <div className="tetris-mini-grid tetris-mini-grid-compact-view" style={getPreviewGridStyle(holdPiecePreview)}>
                      {holdPiecePreview.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                          <div
                            key={`hold-${rowIndex}-${colIndex}`}
                            className={cell ? "tetris-mini-block active" : "tetris-mini-block"}
                            style={{ backgroundColor: cell ? getBrandColor(holdTileId) : "transparent" }}
                            title={cell ? holdBrandTile?.name || "Held brand block" : undefined}
                          >
                            {cell ? renderTileFace(holdTileId, true) : null}
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <p className="text-muted">Press C or tap Hold.</p>
                  )}
                </div>
                <p className="tetris-inline-hint"><span className="tetris-keycap tetris-keycap-inline">C</span> Hold once per drop.</p>
              </section>
            </div>

            <section className={gameStarted ? "tetris-panel tetris-panel-secondary tetris-panel-recessed tetris-start-panel-compact is-live" : "tetris-panel tetris-panel-secondary tetris-panel-recessed tetris-start-panel-compact"}>
              <div className="tetris-panel-heading">
                <h2 className="tetris-panel-title">Start</h2>
                <span className="tetris-panel-badge">{loading ? "Loading" : gameStarted ? "Live" : "Ready"}</span>
              </div>
              <div className="tetris-input-group">
                {gameStarted ? (
                  <>
                    <div className="tetris-live-summary" aria-label="Current session summary">
                      <div className="tetris-live-summary-item">
                        <span className="tetris-live-summary-label">Player</span>
                        <strong>{playerName || "Guest"}</strong>
                      </div>
                      <div className="tetris-live-summary-item">
                        <span className="tetris-live-summary-label">Session</span>
                        <strong>{gameOver ? "Finished" : "Running"}</strong>
                      </div>
                    </div>
                    <div className="tetris-start-secondary-row tetris-start-secondary-row-live">
                      <button type="button" onClick={togglePauseGame} className="tetris-button tetris-button-secondary">
                        {isPaused ? <Play size={16} /> : <Pause size={16} />} {isPaused ? "Resume" : "Pause"}
                      </button>
                      <button type="button" onClick={resetGame} className="tetris-button tetris-button-secondary">
                        <RotateCcw size={16} /> Reset
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="tetris-start-primary-row">
                      <input
                        ref={playerNameInputRef}
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(event) => setPlayerName(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && startGame()}
                        disabled={gameStarted}
                        className="tetris-input"
                      />
                      <div className="tetris-action-row">
                        <button
                          type="button"
                          onClick={startGame}
                          disabled={gameStarted || loading}
                          className="tetris-button tetris-button-primary"
                        >
                          {gameStarted ? "Game Running..." : "Start Game"}
                        </button>
                        <button type="button" onClick={resetGame} className="tetris-button tetris-button-secondary" disabled={!gameStarted && !gameOver && score === 0 && linesCleared === 0}>
                          <RotateCcw size={16} /> Reset
                        </button>
                      </div>
                    </div>
                    <div className="tetris-start-secondary-row">
                      <div className="tetris-controls-guide" aria-label="Controls guide">
                        <div className="tetris-controls-guide-row">
                          <span className="tetris-keycap">←</span>
                          <span className="tetris-keycap">→</span>
                          <span className="tetris-keycap">↑</span>
                          <span className="tetris-keycap">↓</span>
                          <span className="tetris-keycap">Space</span>
                          <span className="tetris-keycap">C</span>
                        </div>
                        <p className="tetris-controls-guide-text">Arrows move, Z/X rotate, Space hard-drops, C/Shift holds, P/Esc pauses, Enter confirms, and R restarts. On mobile, swipe left/right to move, swipe down to soft drop, flick down to hard drop, and tap to rotate.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </aside>
        </div>

        <div className={gameStarted ? "tetris-touch-controls" : "tetris-touch-controls is-disabled"}>
          <div className="tetris-touch-controls-header">
            <div className="tetris-touch-controls-header-copy">
              <h3 className="tetris-touch-controls-title">Touch controls</h3>
              <p className="tetris-touch-controls-note">Swipe, tap, and flick-friendly controls for phones and tablets.</p>
            </div>
            <button type="button" className="tetris-mobile-leaderboard-toggle" onClick={openMobileLeaderboard} aria-label="Open leaderboard on mobile">
              <Trophy size={16} /> Leaderboard
            </button>
          </div>

          <div className="tetris-mobile-start-panel">
            {!gameStarted ? (
              <>
                <div className="tetris-mobile-start-copy">
                  <p className="tetris-mobile-start-label">Start game</p>
                  <p className="tetris-mobile-start-note">Enter your name, then tap Start Game or press Enter.</p>
                </div>
                <input
                  ref={playerNameInputRef}
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && startGame()}
                  disabled={gameStarted}
                  className="tetris-input tetris-mobile-start-input"
                />
              </>
            ) : (
              <div className="tetris-mobile-start-copy tetris-mobile-start-copy-live">
                <p className="tetris-mobile-start-label">Session</p>
                <p className="tetris-mobile-start-note">Playing as {playerName || "Guest"}.</p>
              </div>
            )}

            <div className={gameStarted ? "tetris-mobile-status-row tetris-mobile-status-row-live" : "tetris-mobile-status-row"} aria-label="Mobile session summary">
              <span className="tetris-mobile-status-chip">
                <strong>{gameStarted ? score.toLocaleString() : "0"}</strong>
                <small>Score</small>
              </span>
              <span className="tetris-mobile-status-chip">
                <strong>{gameStarted ? level : 1}</strong>
                <small>Level</small>
              </span>
              <span className="tetris-mobile-status-chip">
                <strong>{gameStarted ? linesCleared : 0}</strong>
                <small>Lines</small>
              </span>
            </div>

            {gameStarted ? (
              <div className="tetris-mobile-start-actions tetris-mobile-start-actions-live">
                <button type="button" onClick={resetGame} className="tetris-control-btn tetris-control-btn-secondary" disabled={!gameStarted && !gameOver && score === 0 && linesCleared === 0}>
                  <RotateCcw size={18} /> Reset
                </button>
              </div>
            ) : (
              <div className="tetris-mobile-start-actions">
                <button type="button" onClick={startGame} disabled={gameStarted || loading} className="tetris-control-btn tetris-control-btn-primary">
                  Start Game
                </button>
                <button type="button" onClick={resetGame} className="tetris-control-btn tetris-control-btn-secondary" disabled={!gameStarted && !gameOver && score === 0 && linesCleared === 0}>
                  <RotateCcw size={18} /> Reset
                </button>
              </div>
            )}
          </div>

          <div className="tetris-control-row">
            <button type="button" className="tetris-control-btn" aria-label="Move left" onClick={() => movePieceHorizontal(-1)} disabled={!gameStarted || gameOver}>
              <ArrowLeft size={18} /> <span className="tetris-control-label">Left</span>
            </button>
            <button type="button" className="tetris-control-btn" aria-label="Rotate piece" onClick={rotateCurrentPiece} disabled={!gameStarted || gameOver}>
              <RotateCw size={18} /> <span className="tetris-control-label">Rotate</span>
            </button>
            <button type="button" className="tetris-control-btn" aria-label="Move right" onClick={() => movePieceHorizontal(1)} disabled={!gameStarted || gameOver}>
              <span className="tetris-control-label">Right</span> <ArrowRight size={18} />
            </button>
          </div>
          <div className="tetris-control-row">
            <button type="button" className="tetris-control-btn tetris-control-btn-secondary" aria-label="Soft drop" onClick={softDropCurrentPiece} disabled={!gameStarted || gameOver}>
              <ArrowBigDown size={18} /> <span className="tetris-control-label">Soft Drop</span>
            </button>
            <button type="button" className="tetris-control-btn tetris-control-btn-primary" aria-label="Hard drop" onClick={hardDropCurrentPiece} disabled={!gameStarted || gameOver}>
              <span className="tetris-control-label">Hard Drop</span>
            </button>
          </div>
          <div className="tetris-control-row tetris-control-row-single">
            <button type="button" className="tetris-control-btn tetris-control-btn-secondary" aria-label="Hold piece" onClick={holdCurrentPiece} disabled={!gameStarted || gameOver || !canHoldPiece}>
              <span className="tetris-control-label">Hold Piece</span>
            </button>
            <button type="button" className="tetris-control-btn tetris-control-btn-secondary" aria-label={isPaused ? "Resume game" : "Pause game"} onClick={togglePauseGame} disabled={!gameStarted || gameOver}>
              {isPaused ? <Play size={18} /> : <Pause size={18} />} <span className="tetris-control-label">{isPaused ? "Resume" : "Pause"}</span>
            </button>
          </div>
        </div>

        {isMobileLeaderboardOpen && (
          <div className="tetris-mobile-leaderboard-backdrop" role="presentation" onClick={closeMobileLeaderboard}>
            <div className="tetris-mobile-leaderboard-panel" role="dialog" aria-modal="true" aria-labelledby="tetris-mobile-leaderboard-title" onClick={(event) => event.stopPropagation()}>
              <div className="tetris-mobile-leaderboard-header">
                <div>
                  <p className="tetris-board-kicker">Mobile view</p>
                  <h2 id="tetris-mobile-leaderboard-title">Leaderboard</h2>
                </div>
                <button type="button" className="tetris-modal-close" onClick={closeMobileLeaderboard} aria-label="Close leaderboard">
                  <X size={18} />
                </button>
              </div>

              <p className="tetris-mobile-leaderboard-note">Tap a player to open their profile.</p>

              {leaderboardListContent}
            </div>
          </div>
        )}

        {selectedLeaderboardEntry && (
          <div className="tetris-player-modal-backdrop" role="presentation" onClick={closePlayerModal}>
            <div className="tetris-player-modal" role="dialog" aria-modal="true" aria-labelledby="tetris-player-modal-title" onClick={(event) => event.stopPropagation()}>
              <div className="tetris-player-modal-header">
                <div>
                  <p className="tetris-board-kicker">Leaderboard spotlight</p>
                  <h2 id="tetris-player-modal-title">{activePlayerStats?.playerName || "Player details"}</h2>
                </div>
                <button type="button" className="tetris-modal-close" onClick={closePlayerModal} aria-label="Close player details">
                  <X size={18} />
                </button>
              </div>

              <div className="tetris-player-modal-rank-row">
                <span className="tetris-player-rank-pill">#{activePlayerStats?.rank || selectedLeaderboardEntry.displayRank || 1}</span>
                <span className="tetris-player-rank-meta">Last played {formatRelativeTime(activePlayerStats?.lastPlayed)}</span>
              </div>

              <div className="tetris-player-modal-grid">
                <article className="tetris-player-modal-stat">
                  <span>Best score</span>
                  <strong>{activePlayerStats?.highestScore?.toLocaleString() || 0}</strong>
                </article>
                <article className="tetris-player-modal-stat">
                  <span>Highest level</span>
                  <strong>L{activePlayerStats?.highestLevel || 1}</strong>
                </article>
                <article className="tetris-player-modal-stat">
                  <span>Total games</span>
                  <strong>{activePlayerStats?.totalGames || 0}</strong>
                </article>
                <article className="tetris-player-modal-stat">
                  <span>Total lines</span>
                  <strong>{activePlayerStats?.totalLinesCleared || 0}</strong>
                </article>
              </div>

              <div className="tetris-player-modal-notes">
                <p><strong>Joined:</strong> {formatDateTime(activePlayerStats?.createdAt)}</p>
                <p><strong>Latest session:</strong> {formatDateTime(activePlayerStats?.lastPlayed)}</p>
                <p><strong>Leaderboard scope:</strong> {leaderboardTimeFilter === "all" ? "All recorded runs" : `Filtered to ${leaderboardTimeFilter}`}</p>
              </div>

              {playerStatsLoading && <p className="text-muted">Refreshing player details…</p>}
              {!playerStatsLoading && playerStatsError && <p className="text-muted">{playerStatsError}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

