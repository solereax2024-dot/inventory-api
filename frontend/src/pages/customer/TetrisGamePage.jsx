import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { apiRequest } from "../../utils/api";
import TetrisGameOverModal from "../../components/tetris/TetrisGameOverModal";
import TetrisStartModal from "../../components/tetris/TetrisStartModal";
import TetrisBoardStage from "../../components/tetris/TetrisBoardStage";
import TetrisGridContent from "../../components/tetris/TetrisGridContent";
import TetrisMobileControls from "../../components/tetris/TetrisMobileControls";
import TetrisMobileLeaderboardModal from "../../components/tetris/TetrisMobileLeaderboardModal";
import TetrisPlayerDetailsModal from "../../components/tetris/TetrisPlayerDetailsModal";
import TetrisSideDetailsPanel from "../../components/tetris/TetrisSideDetailsPanel";
import { TetrisLeaderboardList } from "../../components/tetris/TetrisLeaderboardPanel";
import {
  BEST_RUN_PREFERENCE_KEY,
  BLOCK_COLORS,
  COMPACT_DESKTOP_BLOCK_SIZE,
  DESKTOP_BLOCK_SIZE,
  FALLBACK_BRANDS,
  GRID_INSET_PX,
  GRID_WIDTH,
  HARD_DROP_TRAIL_DURATION_MS,
  LARGE_DESKTOP_BLOCK_SIZE,
  LEADERBOARD_SORT_BY,
  LEADERBOARD_TIME_FILTER,
  MOBILE_BLOCK_SIZE,
  MOBILE_BREAKPOINT,
  SMALL_HEIGHT_BLOCK_SIZE,
  SOUND_PROFILES,
  SOUND_PREFERENCE_KEY,
  TETROMINOS,
  TETROMINO_KEYS,
} from "../../constants/tetris";
import {
  useLocalStorage,
  useLayoutDimensions,
  useTetrisKeyboardControls,
  useTetrisLockEffects,
  useTetrisTouchGestures,
} from "../../hooks";
import {
  canPlacePiece,
  computeLockedPieceOutcome,
  calculateBlockSize,
  createEmptyGrid,
  formatDateTime,
  formatRelativeTime,
  getDropRow,
  getPieceCells,
  isActivePieceActionBlocked,
  matchesLeaderboardTimeFilter,
  rotatePiece,
  rotatePieceCounterClockwise,
  sortLeaderboardEntries,
} from "../../utils/tetrisGame";
import {
  createPreviewMatrix,
  getBrandColorForTile,
  getBrandShortLabel,
  getBrandTileById,
  getMedalIcon,
  getPreviewGridStyle,
} from "../../utils/tetrisBrandRendering";
import {
  createDefaultBestRun,
  parseSoundEnabledPreference,
  parseBestRunPreference,
} from "../../utils/preferenceDefaults";
import "../../styles/tetris/index.css";

function getViewportMetrics() {
  if (typeof window === "undefined") {
    return { width: 1440, height: 900 };
  }

  const visualViewport = window.visualViewport;

  return {
    width: Math.max(Math.round(visualViewport?.width || window.innerWidth || 0), 320),
    height: Math.max(Math.round(visualViewport?.height || window.innerHeight || 0), 320),
  };
}

export default function TetrisGamePage() {
  const shellRef = useRef(null);
  const gameSurfaceRef = useRef(null);
  const boardFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const playerNameInputRef = useRef(null);
  const scoreSubmittedRef = useRef(false);
  const timeoutIdsRef = useRef([]);

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
  const [nextQueue, setNextQueue] = useState([]);
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
  const [isBoardFocused, setIsBoardFocused] = useState(false);
  const [isMobileLeaderboardOpen, setIsMobileLeaderboardOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useLocalStorage(SOUND_PREFERENCE_KEY, true, {
    parse: parseSoundEnabledPreference,
    serialize: String,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bestRun, setBestRun] = useLocalStorage(BEST_RUN_PREFERENCE_KEY, createDefaultBestRun, {
    parse: parseBestRunPreference,
  });
  const [selectedLeaderboardEntry, setSelectedLeaderboardEntry] = useState(null);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState(null);
  const [playerStatsLoading, setPlayerStatsLoading] = useState(false);
  const [playerStatsError, setPlayerStatsError] = useState("");
  const [viewportSize, setViewportSize] = useState(getViewportMetrics);
  const isMobileViewport = viewportSize.width < MOBILE_BREAKPOINT;
  const isShortMobileViewport = isMobileViewport && viewportSize.height <= 760;
  const isVeryShortMobileViewport = isMobileViewport && viewportSize.height <= 680;
  const isCompactDesktopHeight = !isMobileViewport && viewportSize.height <= 920;
  const isUltraCompactDesktopHeight = !isMobileViewport && viewportSize.height <= 820;
  const isMobileGameplayActive = gameStarted && !gameOver && isMobileViewport;
  const lastMoveWasRotateRef = useRef(false);
  const previousScoreRef = useRef(0);
  const previousLevelRef = useRef(1);
  const previousLinesRef = useRef(0);
  const comboChainRef = useRef(0);
  const previousClearWasTetrisRef = useRef(false);
  const nextQueueEntryIdRef = useRef(0);

  const blockSize = useMemo(() => {
    return calculateBlockSize(viewportSize.width, viewportSize.height, {
      MOBILE_BREAKPOINT,
      MOBILE_BLOCK_SIZE,
      SMALL_HEIGHT_BLOCK_SIZE,
      LARGE_DESKTOP_BLOCK_SIZE,
      DESKTOP_BLOCK_SIZE,
      COMPACT_DESKTOP_BLOCK_SIZE,
      mobileLayoutMode: isMobileGameplayActive ? "gameplay" : "prestart",
      compactMobileHeight: isShortMobileViewport,
      veryShortMobileHeight: isVeryShortMobileViewport,
    });
  }, [isMobileGameplayActive, isShortMobileViewport, isVeryShortMobileViewport, viewportSize.height, viewportSize.width]);

  const {
    boardPixelWidth,
    boardShellWidth,
    stageGap,
    stageSidePanelWidth,
    stageSidePanelMinWidth,
    sidePreviewBlockSize,
  } = useLayoutDimensions(viewportSize, blockSize, {
    GRID_WIDTH,
    GRID_INSET_PX,
    MOBILE_BREAKPOINT,
  });

  const shouldShowBoardFocusHint = !isBoardFocused && gameStarted && !gameOver && viewportSize.width >= MOBILE_BREAKPOINT;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let frameId = 0;
    const visualViewport = window.visualViewport;
    const updateViewportSize = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        setViewportSize(getViewportMetrics());
      });
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);
    window.addEventListener("orientationchange", updateViewportSize);
    visualViewport?.addEventListener("resize", updateViewportSize);

    return () => {
      window.removeEventListener("resize", updateViewportSize);
      window.removeEventListener("orientationchange", updateViewportSize);
      visualViewport?.removeEventListener("resize", updateViewportSize);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
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
    const filteredEntries = leaderboard.filter((entry) => matchesLeaderboardTimeFilter(entry, LEADERBOARD_TIME_FILTER));
    return sortLeaderboardEntries(filteredEntries, LEADERBOARD_SORT_BY)
      .slice(0, 10)
      .map((entry, index) => ({ ...entry, displayRank: index + 1 }));
  }, [leaderboard]);

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

  const currentPlayerRank = useMemo(() => {
    const normalizedPlayerName = playerName.trim().toLowerCase();
    if (!normalizedPlayerName) return null;

    const rankedEntries = sortLeaderboardEntries(leaderboard, "score");
    const rankIndex = rankedEntries.findIndex((entry) => (entry?.playerName || "").trim().toLowerCase() === normalizedPlayerName);

    return rankIndex >= 0 ? rankIndex + 1 : null;
  }, [leaderboard, playerName]);

  const emitSound = useCallback((soundName, force = false) => {
    if ((!soundEnabled && !force) || typeof window === "undefined") return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const profile = SOUND_PROFILES[soundName] || SOUND_PROFILES.tap;
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
    // Auto-pause game when opening leaderboard on mobile (as per spec section 35)
    if (gameStarted && !gameOver && !isPaused) {
      setIsPaused(true);
      setMessage("Game paused - Leaderboard open");
    }
    setIsMobileLeaderboardOpen(true);
  }, [gameStarted, gameOver, isPaused]);

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

  const createUpcomingEntryId = useCallback(() => {
    nextQueueEntryIdRef.current += 1;
    return `queue-entry-${nextQueueEntryIdRef.current}`;
  }, []);

  const createRandomTileId = useCallback(() => {
    const totalTiles = Math.max(brandTiles.length || FALLBACK_BRANDS.length, BLOCK_COLORS.length, 1);
    return Math.floor(Math.random() * totalTiles);
  }, [brandTiles.length]);

  const createUpcomingEntry = useCallback(() => ({
    entryId: createUpcomingEntryId(),
    ...createRandomPieceEntry(),
    tileId: createRandomTileId(),
  }), [createRandomPieceEntry, createRandomTileId, createUpcomingEntryId]);

  const ensureUpcomingQueue = useCallback((entries = []) => {
    const normalizedQueue = entries.filter(Boolean).map((entry) => ({
      ...entry,
      entryId: entry?.entryId || createUpcomingEntryId(),
    }));

    while (normalizedQueue.length < 3) {
      normalizedQueue.push(createUpcomingEntry());
    }

    return normalizedQueue.slice(0, 3);
  }, [createUpcomingEntry, createUpcomingEntryId]);

  const syncUpcomingQueue = useCallback((entries = []) => {
    const normalizedQueue = ensureUpcomingQueue(entries);
    const [nextEntry] = normalizedQueue;

    setNextQueue(normalizedQueue);
    setNextPiece(nextEntry?.piece ?? null);
    setNextPieceKey(nextEntry?.pieceKey ?? null);
    setNextTileId(nextEntry?.tileId ?? null);

    return normalizedQueue;
  }, [ensureUpcomingQueue]);

  const getSpawnColumn = useCallback((piece) => {
    const pieceWidth = piece?.[0]?.length || 0;
    return Math.max(0, Math.floor((GRID_WIDTH - pieceWidth) / 2));
  }, []);

  const triggerPulseEffect = useCallback((setter, durationMs) => {
    setter(true);
    scheduleUiTimeout(() => setter(false), durationMs);
  }, [scheduleUiTimeout]);

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
      return false;
    }

    const openingEntry = createUpcomingEntry();
    const queuedEntries = ensureUpcomingQueue([
      createUpcomingEntry(),
      createUpcomingEntry(),
      createUpcomingEntry(),
    ]);

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
    setCurrentTileId(openingEntry.tileId);
    setCurrentPieceRow(0);
    setCurrentPieceCol(getSpawnColumn(openingEntry.piece));
    syncUpcomingQueue(queuedEntries);
    setCanHoldPiece(true);
    setHoldPiece(null);
    setHoldPieceKey(null);
    setHoldTileId(null);
    triggerPulseEffect(setRestartPulse, 240);
    triggerPulseEffect(setPieceSpawnPulse, 180);
    emitSound("start");
    triggerHaptic(18);

    if (gameSurfaceRef.current) {
      gameSurfaceRef.current.focus();
    }
    return true;
  }, [playerName, clearScheduledTimeouts, clearTransientEffects, createUpcomingEntry, emitSound, ensureUpcomingQueue, getSpawnColumn, scheduleUiTimeout, syncUpcomingQueue, triggerHaptic]);

  const openStartModal = useCallback(() => {
    setIsStartModalOpen(true);
    setMessage("Enter your username to start playing.");
    emitSound("modal");
  }, [emitSound]);

  const closeStartModal = useCallback(() => {
    setIsStartModalOpen(false);
  }, []);

  const handleStartFromModal = useCallback(() => {
    if (startGame()) {
      setIsStartModalOpen(false);
    }
  }, [startGame]);

  const resetGame = useCallback(() => {
    clearScheduledTimeouts();
    clearTransientEffects();
    scoreSubmittedRef.current = false;
    setIsStartModalOpen(false);
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
    triggerPulseEffect(setRestartPulse, 240);
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
      if (isActivePieceActionBlocked({ gameStarted, gameOver, isPaused, currentPiece })) return;

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
    if (isActivePieceActionBlocked({ gameStarted, gameOver, isPaused, currentPiece })) return;

    const newRow = currentPieceRow + 1;
    if (canPlacePiece(grid, currentPiece, newRow, currentPieceCol)) {
      setCurrentPieceRow(newRow);
      setScore((prev) => prev + 1);
      triggerPulseEffect(setSoftDropPulse, 90);
      emitSound("softDrop");
      lastMoveWasRotateRef.current = false;
      return;
    }

    lockCurrentPiece(currentPieceRow, { source: "lock" });
  }, [gameStarted, gameOver, isPaused, grid, currentPiece, currentPieceRow, currentPieceCol, emitSound, lockCurrentPiece, triggerPulseEffect]);

  const hardDropCurrentPiece = useCallback(() => {
    if (isActivePieceActionBlocked({ gameStarted, gameOver, isPaused, currentPiece })) return;

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
    triggerPulseEffect(setHardDropPulse, HARD_DROP_TRAIL_DURATION_MS);
    scheduleUiTimeout(() => setHardDropTrail([]), HARD_DROP_TRAIL_DURATION_MS);
    emitSound("hardDrop");
    triggerHaptic(16);
    lastMoveWasRotateRef.current = false;
    lockCurrentPiece(dropRow, { source: "hard-drop", dropDistance });
  }, [gameStarted, gameOver, isPaused, grid, currentPiece, currentPieceRow, currentPieceCol, currentTileId, emitSound, lockCurrentPiece, scheduleUiTimeout, triggerHaptic, triggerPulseEffect]);

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
      triggerPulseEffect(setRotatePulse, 110);
      lastMoveWasRotateRef.current = true;
      return true;
    }

    return false;
  }, [currentPieceCol, currentPieceRow, emitSound, grid, triggerPulseEffect]);

  const rotateCurrentPiece = useCallback(() => {
    if (isActivePieceActionBlocked({ gameStarted, gameOver, isPaused, currentPiece })) return;

    const rotated = rotatePiece(currentPiece);
    applyRotationWithKick(rotated);
  }, [applyRotationWithKick, currentPiece, gameOver, gameStarted, isPaused]);

  const rotateCurrentPieceCounterClockwise = useCallback(() => {
    if (isActivePieceActionBlocked({ gameStarted, gameOver, isPaused, currentPiece })) return;

    const rotated = rotatePieceCounterClockwise(currentPiece);
    applyRotationWithKick(rotated);
  }, [applyRotationWithKick, currentPiece, gameOver, gameStarted, isPaused]);


  const holdCurrentPiece = useCallback(() => {
    if (isActivePieceActionBlocked({ gameStarted, gameOver, isPaused, currentPiece }) || !canHoldPiece) return;

    const queuedEntries = ensureUpcomingQueue(nextQueue);

    let newCurrent;
    let newCurrentKey;
    let newCurrentTileId;
    let newHold = currentPiece;
    let newHoldKey = currentPieceKey;
    let newHoldTileId = currentTileId;
    let updatedQueueEntries = queuedEntries;

    if (holdPiece) {
      newCurrent = holdPiece;
      newCurrentKey = holdPieceKey;
      newCurrentTileId = holdTileId;
    } else {
      const [promotedEntry, ...remainingQueueEntries] = queuedEntries;
      newCurrent = promotedEntry?.piece ?? nextPiece;
      newCurrentKey = promotedEntry?.pieceKey ?? nextPieceKey;
      newCurrentTileId = promotedEntry?.tileId ?? nextTileId;
      updatedQueueEntries = [...remainingQueueEntries, createUpcomingEntry()];
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
    triggerPulseEffect(setPieceSpawnPulse, 180);
    lastMoveWasRotateRef.current = false;

    if (!holdPiece) {
      syncUpcomingQueue(updatedQueueEntries);
    }

    emitSound("hold");
  }, [gameStarted, gameOver, isPaused, currentPiece, currentPieceKey, holdPiece, holdPieceKey, nextPiece, nextPieceKey, currentTileId, holdTileId, nextQueue, nextTileId, createUpcomingEntry, emitSound, ensureUpcomingQueue, getSpawnColumn, triggerPulseEffect, syncUpcomingQueue]);
  const applyLockEffects = useTetrisLockEffects({
    comboChainRef,
    previousClearWasTetrisRef,
    scheduleUiTimeout,
    emitSound,
    triggerHaptic,
    level,
    setLockPulseCells,
    setImpactPulse,
    setComboCount,
    setBackToBackActive,
    setTSpinActive,
    setLevelUpPulse,
    setScore,
    setPointPopups,
    setClearEffectVariant,
    setClearIntensity,
    setRowClearFlashRows,
    setRowShiftBlocks,
    setIsTetrisClearActive,
    setMessage,
    setCurrentPiece,
    setCurrentPieceKey,
    setGameOver,
    setIsPaused,
    setCurrentTileId,
    setCurrentPieceRow,
    setCurrentPieceCol,
    syncUpcomingQueue,
    setPieceSpawnPulse,
  });

  const {
    handleBoardTouchStart,
    handleBoardTouchMove,
    handleBoardTouchEnd,
    handleBoardTouchCancel,
  } = useTetrisTouchGestures({
    isBlocked: Boolean(selectedLeaderboardEntry),
    focusBoard,
    rotateCurrentPiece,
    movePieceHorizontal,
    softDropCurrentPiece,
    hardDropCurrentPiece,
  });

  function lockCurrentPiece(lockedRow = currentPieceRow, options = {}) {
    if (!currentPiece) return;

    const { source = "lock", dropDistance = 0 } = options;
    const {
      placedGrid,
      lockedCells,
      clearedRows,
      settledGrid,
      clearedLineCount,
      didTSpin,
      comboBonusCount,
      bonusPoints,
      isDifficultClear,
      receivesBackToBackBonus,
      nextClearIntensity,
      nextLinesClearedTotal,
      nextLevel,
      upcomingPiece,
      upcomingPieceKey,
      upcomingTileId,
      refreshedQueueEntries,
      spawnCol,
      canSpawnUpcomingPiece,
    } = computeLockedPieceOutcome({
      grid,
      currentPiece,
      currentPieceKey,
      currentPieceCol,
      currentTileId,
      lockedRow,
      level,
      linesCleared,
      lastMoveWasRotate: lastMoveWasRotateRef.current,
      comboChainCount: comboChainRef.current,
      previousClearWasTetris: previousClearWasTetrisRef.current,
      nextQueue,
      nextPiece,
      nextPieceKey,
      nextTileId,
      ensureUpcomingQueue,
      createUpcomingEntry,
      getSpawnColumn,
    });

    setGrid(settledGrid);
    setLinesCleared(nextLinesClearedTotal);
    setLevel(nextLevel);
    setCanHoldPiece(true);
    applyLockEffects({
      outcome: {
        placedGrid,
        lockedCells,
        clearedRows,
        clearedLineCount,
        didTSpin,
        comboBonusCount,
        bonusPoints,
        isDifficultClear,
        receivesBackToBackBonus,
        nextClearIntensity,
        nextLevel,
        upcomingPiece,
        upcomingPieceKey,
        upcomingTileId,
        refreshedQueueEntries,
        spawnCol,
        canSpawnUpcomingPiece,
      },
      source,
      dropDistance,
      onAfterSpawn: () => {
        lastMoveWasRotateRef.current = false;
      },
    });
  }

  const stepActivePieceDown = useCallback(() => {
    if (isActivePieceActionBlocked({ gameStarted, gameOver, isPaused, currentPiece })) return;

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

  useTetrisKeyboardControls({
    isBlocked: Boolean(selectedLeaderboardEntry || isMobileLeaderboardOpen),
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
  });

  useEffect(() => {
    if (!gameOver || !gameStarted || scoreSubmittedRef.current) return;

    scoreSubmittedRef.current = true;
    void submitScore(score, level, linesCleared);
  }, [gameOver, gameStarted, level, linesCleared, score, submitScore]);


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

  const getBrandColor = useCallback((tileId) => getBrandColorForTile(tileId, brandTiles), [brandTiles]);

  const getBrandTile = useCallback((tileId) => getBrandTileById(tileId, brandTiles), [brandTiles]);

  const nextQueuePreviewEntries = useMemo(() => nextQueue.map((entry, index) => ({
    id: entry?.entryId || `next-slot-${index}`,
    slot: index + 1,
    piece: entry?.piece ?? null,
    tileId: entry?.tileId ?? null,
    brandTile: entry?.tileId !== null && entry?.tileId !== undefined ? getBrandTile(entry.tileId) : null,
    preview: createPreviewMatrix(entry?.piece ?? null),
  })), [createPreviewMatrix, getBrandTile, nextQueue]);
  const holdBrandTile = useMemo(() => (holdTileId !== null && holdTileId !== undefined ? getBrandTile(holdTileId) : null), [getBrandTile, holdTileId]);
  const holdPiecePreview = useMemo(() => createPreviewMatrix(holdPiece), [holdPiece]);
  const ghostPieceRow = useMemo(() => {
    if (!currentPiece || !gameStarted || gameOver) return null;
    return getDropRow(grid, currentPiece, currentPieceRow, currentPieceCol);
  }, [currentPiece, currentPieceCol, currentPieceRow, gameOver, gameStarted, grid]);
  const shimmerSweepRows = useMemo(() => [...rowClearFlashRows].sort((leftRow, rightRow) => rightRow - leftRow), [rowClearFlashRows]);
  const activePlayerStats = selectedPlayerStats || selectedLeaderboardEntry;
  const boardShellStyle = useMemo(() => ({
    "--tetris-board-shell-width": boardShellWidth,
    "--tetris-clear-intensity": `${clearIntensity}`,
    "--tetris-shake-x": `${(1.8 + clearIntensity * 1.75).toFixed(2)}px`,
    "--tetris-shake-y": `${(0.8 + clearIntensity * 0.55).toFixed(2)}px`,
    "--tetris-shake-duration": `${Math.round(210 + clearIntensity * 82)}ms`,
    "--tetris-shake-scale-mid": `${(1 + clearIntensity * 0.0028).toFixed(4)}`,
    "--tetris-shake-scale-peak": `${(1 + clearIntensity * 0.0042).toFixed(4)}`,
    "--tetris-shake-scale-tail": `${(1 + clearIntensity * 0.0018).toFixed(4)}`,
    "--tetris-board-pixel-width": `${boardPixelWidth}px`,
    "--tetris-stage-gap": `${stageGap}px`,
    "--tetris-side-panel-width": `${stageSidePanelWidth}px`,
    "--tetris-side-panel-min-width": `${stageSidePanelMinWidth}px`,
    "--tetris-side-preview-block-size": `${sidePreviewBlockSize}px`,
  }), [boardPixelWidth, boardShellWidth, clearIntensity, sidePreviewBlockSize, stageGap, stageSidePanelMinWidth, stageSidePanelWidth]);

  const leaderboardListContent = useMemo(() => (
    <TetrisLeaderboardList
      leaderboardLoading={leaderboardLoading}
      leaderboardError={leaderboardError}
      filteredLeaderboard={filteredLeaderboard}
      leaderboardTimeFilter={LEADERBOARD_TIME_FILTER}
      leaderboardSortBy={LEADERBOARD_SORT_BY}
      openPlayerModal={openPlayerModal}
      getMedalIcon={getMedalIcon}
      formatRelativeTime={formatRelativeTime}
    />
  ), [filteredLeaderboard, getMedalIcon, leaderboardError, leaderboardLoading, openPlayerModal]);

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

  const renderCompactStatsBar = (className, ariaLabel = "Game stats") => (
    <section className={className} aria-label={ariaLabel}>
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
  );

  return (
    <div className={[
      "tetris-game-container",
      isMobileViewport && isMobileGameplayActive ? "is-mobile-live-gameplay" : "",
    ].filter(Boolean).join(" ")}>
      <div
        ref={shellRef}
        className={[
          "tetris-shell",
          isFullscreen ? "is-fullscreen-focus" : "",
          isMobileViewport ? "is-mobile-viewport" : "",
          gameStarted && !gameOver ? "is-live-gameplay" : "",
          isMobileGameplayActive ? "is-mobile-live-gameplay" : "",
          isCompactDesktopHeight ? "is-compact-height" : "",
          isUltraCompactDesktopHeight ? "is-ultra-compact-height" : "",
        ].filter(Boolean).join(" ")}
      >
        <header className={gameStarted && !gameOver ? "tetris-header is-live" : "tetris-header"}>
          <div className="tetris-header-copy">
            <p className="tetris-header-kicker">Arcade brand challenge</p>
            <h1>Brand Tetris</h1>
            <p className="tetris-header-subtitle">Stack sneaker brands, clear lines, and chase the top spot on the leaderboard.</p>
          </div>
        </header>

        <div className={[
          "tetris-main",
          isMobileViewport && isMobileGameplayActive ? "is-mobile-gameplay" : "",
        ].filter(Boolean).join(" ")}>
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
          <section className={[
            "tetris-layout-column",
            "tetris-board-column",
            isMobileViewport && isMobileGameplayActive ? "is-mobile-gameplay" : "",
          ].filter(Boolean).join(" ")}>
            {isMobileViewport && (gameStarted || gameOver) && renderCompactStatsBar(
              "tetris-stats-bar tetris-stats-bar-compact tetris-mobile-board-stats",
              "Mobile game stats"
            )}
            <TetrisBoardStage
              boardFrameRef={boardFrameRef}
              boardShellClassName={[
                "tetris-board-shell",
                rowClearFlashRows.length > 0 ? "is-clear-shaking" : "",
                isTetrisClearActive ? "is-tetris-clear" : "",
                levelUpPulse ? "is-level-up" : "",
                restartPulse ? "is-restarting" : "",
                tSpinActive ? "is-tspin-active" : "",
              ].filter(Boolean).join(" ")}
              boardShellStyle={boardShellStyle}
              isBoardFocused={isBoardFocused}
              holdPiece={holdPiece}
              holdPiecePreview={holdPiecePreview}
              holdTileId={holdTileId}
              holdBrandTile={holdBrandTile}
              getPreviewGridStyle={getPreviewGridStyle}
              getBrandColor={getBrandColor}
              renderTileFace={renderTileFace}
              nextQueuePreviewEntries={nextQueuePreviewEntries}
              afterGridContent={shouldShowBoardFocusHint ? (
                <div className="tetris-grid-focus-indicator" aria-hidden="true">
                  Click board to enable keyboard controls
                </div>
              ) : null}
            >
              {isTetrisClearActive && <div className="tetris-clear-burst" aria-hidden="true" />}
              {hardDropPulse && <div className="tetris-hard-drop-flash" aria-hidden="true" />}
              <TetrisGridContent
                gameSurfaceRef={gameSurfaceRef}
                blockSize={blockSize}
                isBoardFocused={isBoardFocused}
                isPaused={isPaused}
                gameOver={gameOver}
                pieceSpawnPulse={pieceSpawnPulse}
                rotatePulse={rotatePulse}
                softDropPulse={softDropPulse}
                hardDropPulse={hardDropPulse}
                restartPulse={restartPulse}
                focusBoard={focusBoard}
                handleBoardTouchStart={handleBoardTouchStart}
                handleBoardTouchMove={handleBoardTouchMove}
                handleBoardTouchEnd={handleBoardTouchEnd}
                handleBoardTouchCancel={handleBoardTouchCancel}
                onBoardFocusChange={setIsBoardFocused}
                grid={grid}
                getBrandColor={getBrandColor}
                getBrandTile={getBrandTile}
                renderTileFace={renderTileFace}
                rowClearFlashRows={rowClearFlashRows}
                clearEffectVariant={clearEffectVariant}
                clearIntensity={clearIntensity}
                shimmerSweepRows={shimmerSweepRows}
                rowShiftBlocks={rowShiftBlocks}
                hardDropTrail={hardDropTrail}
                impactPulse={impactPulse}
                lockPulseCells={lockPulseCells}
                currentPiece={currentPiece}
                ghostPieceRow={ghostPieceRow}
                currentPieceRow={currentPieceRow}
                currentPieceCol={currentPieceCol}
                currentTileId={currentTileId}
                pointPopups={pointPopups}
              />
            </TetrisBoardStage>

            <TetrisGameOverModal
              isVisible={gameOver}
              playerName={playerName}
              finalScore={score}
              bestScore={bestRun.score}
              finalLevel={level}
              linesCleared={linesCleared}
              playerRank={currentPlayerRank}
              onPlayAgain={resetGame}
              onOpenLeaderboard={viewportSize.width < 768 ? openMobileLeaderboard : undefined}
            />
          </section>

          {/* COLUMN 3: DETAILS (RIGHT) */}
          {!isMobileViewport && (

            <TetrisSideDetailsPanel
              gameStarted={gameStarted}
              gameOver={gameOver}
              loading={loading}
              message={message}
              playerName={playerName}
              score={score}
              linesCleared={linesCleared}
              onPlayerNameChange={setPlayerName}
              onStartGame={startGame}
              onResetGame={resetGame}
              isPaused={isPaused}
              comboCount={comboCount}
              backToBackActive={backToBackActive}
              soundEnabled={soundEnabled}
              isFullscreen={isFullscreen}
              namedPlayerBestEntry={namedPlayerBestEntry}
              globalBestEntry={globalBestEntry}
              togglePauseGame={togglePauseGame}
              toggleSound={toggleSound}
              toggleFullscreen={toggleFullscreen}
              playerNameInputRef={playerNameInputRef}
              renderCompactStatsBar={renderCompactStatsBar}
            />
          )}
        </div>

        <TetrisMobileControls
          className={[
            "tetris-touch-controls",
            isMobileGameplayActive ? "is-gameplay" : "",
          ].filter(Boolean).join(" ")}
          isMobileGameplayActive={isMobileGameplayActive}
          gameStarted={gameStarted}
          gameOver={gameOver}
          isPaused={isPaused}
          canHoldPiece={canHoldPiece}
          openStartModal={openStartModal}
          movePieceHorizontal={movePieceHorizontal}
          rotateCurrentPiece={rotateCurrentPiece}
          softDropCurrentPiece={softDropCurrentPiece}
          hardDropCurrentPiece={hardDropCurrentPiece}
          holdCurrentPiece={holdCurrentPiece}
          togglePauseGame={togglePauseGame}
          resetGame={resetGame}
        />

        <TetrisStartModal
          isVisible={isStartModalOpen}
          playerName={playerName}
          message={message}
          onPlayerNameChange={setPlayerName}
          onStart={handleStartFromModal}
          onCancel={closeStartModal}
        />

        <TetrisMobileLeaderboardModal
          isVisible={isMobileLeaderboardOpen}
          onClose={closeMobileLeaderboard}
          leaderboardListContent={leaderboardListContent}
        />

        <TetrisPlayerDetailsModal
          selectedLeaderboardEntry={selectedLeaderboardEntry}
          activePlayerStats={activePlayerStats}
          formatRelativeTime={formatRelativeTime}
          formatDateTime={formatDateTime}
          leaderboardTimeFilter={LEADERBOARD_TIME_FILTER}
          playerStatsLoading={playerStatsLoading}
          playerStatsError={playerStatsError}
          onClose={closePlayerModal}
        />
      </div>
    </div>
  );
}
