export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 20;
export const LARGE_DESKTOP_BLOCK_SIZE = 31;
export const DESKTOP_BLOCK_SIZE = 26;
export const COMPACT_DESKTOP_BLOCK_SIZE = 25;
export const SMALL_HEIGHT_BLOCK_SIZE = 26;
export const MOBILE_BLOCK_SIZE = 22;
export const MOBILE_BREAKPOINT = 640;
export const LINE_CLEAR_FLASH_DURATION_MS = 190;
export const LINE_SHIFT_DURATION_BASE_MS = 200;
export const LINE_SHIFT_DURATION_PER_ROW_MS = 36;
export const LINE_SHIFT_DURATION_MAX_MS = 420;
export const ROW_COLLAPSE_STAGGER_MS = 22;
export const HARD_DROP_TRAIL_DURATION_MS = 180;
export const IMPACT_PULSE_DURATION_MS = 140;
export const TOUCH_SWIPE_THRESHOLD_PX = 28;
export const TOUCH_TAP_MAX_MOVE_PX = 12;
export const TOUCH_TAP_MAX_DURATION_MS = 240;
export const TOUCH_HARD_DROP_FLICK_PX = 72;
export const TOUCH_HARD_DROP_FLICK_DURATION_MS = 150;
export const SOUND_PREFERENCE_KEY = "brand-tetris-sound-enabled";
export const BEST_RUN_PREFERENCE_KEY = "brand-tetris-best-run";
export const LEADERBOARD_TIME_FILTER = "all";
export const LEADERBOARD_SORT_BY = "score";
export const GRID_INSET_PX = 10;

export const SOUND_PROFILES = {
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

export const BLOCK_COLORS = [
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
];

export const TETROMINOS = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  L: [[1, 0], [1, 0], [1, 1]],
  J: [[0, 1], [0, 1], [1, 1]],
};

export const TETROMINO_KEYS = Object.keys(TETROMINOS);

export const FALLBACK_BRANDS = [
  { id: 0, name: "Nike", logoUrl: null },
  { id: 1, name: "Adidas", logoUrl: null },
  { id: 2, name: "Onitsuka Tiger", logoUrl: null },
  { id: 3, name: "On", logoUrl: null },
  { id: 4, name: "Puma", logoUrl: null },
  { id: 5, name: "ASICS", logoUrl: null },
  { id: 6, name: "Salomon", logoUrl: null },
];

export const KNOWN_BRAND_LABELS = {
  nike: "NIKE",
  adidas: "ADI",
  "onitsuka-tiger": "OT",
  on: "ON",
  puma: "PUMA",
  asics: "ASICS",
  salomon: "SAL",
};

export const CLEAR_INTENSITY_BY_LINES = {
  1: 1,
  2: 1.55,
  3: 2.15,
  4: 2.85,
};

