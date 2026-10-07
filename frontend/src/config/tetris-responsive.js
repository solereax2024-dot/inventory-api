/**
 * Tetris Game Responsive Configuration
 *
 * Centralized breakpoints, device profiles, and responsive settings
 * Eliminates hardcoded values scattered throughout the codebase
 */

import {
  GRID_HEIGHT,
  GRID_INSET_PX,
  GRID_WIDTH,
  TABLET_BREAKPOINT,
  DESKTOP_BREAKPOINT,
  LARGE_DESKTOP_BREAKPOINT,
  LARGE_DESKTOP_BLOCK_SIZE,
  DESKTOP_BLOCK_SIZE,
  COMPACT_DESKTOP_BLOCK_SIZE,
  SMALL_HEIGHT_BLOCK_SIZE,
  MOBILE_BLOCK_SIZE,
  MOBILE_BREAKPOINT,
} from "../constants/tetris";
import { calculateBlockSize } from "../utils/tetrisGame";

export function getOptimalBlockSize(width, height, type = null) {
  const deviceType = type || TETRIS_RESPONSIVE_CONFIG.getDeviceProfile(width, height);
  return calculateBlockSize(width, height, {
    MOBILE_BREAKPOINT,
    MOBILE_BLOCK_SIZE: TETRIS_RESPONSIVE_CONFIG.blockSizes.MOBILE,
    SMALL_HEIGHT_BLOCK_SIZE: TETRIS_RESPONSIVE_CONFIG.blockSizes.SMALL_HEIGHT,
    LARGE_DESKTOP_BLOCK_SIZE: TETRIS_RESPONSIVE_CONFIG.blockSizes.LARGE_DESKTOP,
    DESKTOP_BLOCK_SIZE: TETRIS_RESPONSIVE_CONFIG.blockSizes.DESKTOP,
    COMPACT_DESKTOP_BLOCK_SIZE: TETRIS_RESPONSIVE_CONFIG.blockSizes.COMPACT_DESKTOP,
    mobileLayoutMode: deviceType === "mobile" ? "expanded" : "prestart",
    compactMobileHeight: height <= 760,
    veryShortMobileHeight: height <= 680,
  });
}

export const TETRIS_RESPONSIVE_CONFIG = {
  // Grid dimensions (game logic)
  GRID_WIDTH,
  GRID_HEIGHT,
  GRID_INSET_PX,

  // Breakpoints (all responsive thresholds in one place)
  breakpoints: {
    mobile: 640,      // < 640px = mobile
    tablet: 768,      // 640-768px = tablet
    desktop: 1024,    // >= 1024px = desktop
    large: 1280,      // >= 1280px = large desktop
  },

  // Device profiles with optimized settings
  devices: {
    mobile: {
      name: "Mobile Phone",
      widthRange: [320, 640],
      heightRange: [480, 932],
      blockSizeRange: [12, 24],
      horizontalReserve: 18,
      verticalReserveSmall: 292,
      verticalReserveMedium: 312,
      verticalReserveLarge: 330,
      orientation: "portrait",
    },

    // Tablets
    tablet: {
      name: "Tablet",
      widthRange: [640, 1024],
      heightRange: [600, 900],
      blockSizeRange: [20, 26],
      horizontalReserve: 60,
      verticalReserve: 200,
      compactDesktopBlockSize: 24,
      orientation: "both",
    },

    // Desktop computers
    desktop: {
      name: "Desktop",
      widthRange: [1024, 1440],
      heightRange: [768, 1080],
      blockSizeRange: [25, 31],
      horizontalReserve: 80,
      verticalReserve: 300,
      desktopBlockSize: 26,
      largeDesktopBlockSize: 31,
      compactDesktopBlockSize: 25,
      smallHeightBlockSize: 26,
      orientation: "landscape",
    },

    // Large desktop / 4K
    largeDesktop: {
      name: "Large Desktop / 4K",
      widthRange: [1440, Infinity],
      heightRange: [1080, Infinity],
      blockSizeRange: [29, 31],
      horizontalReserve: 100,
      verticalReserve: 350,
      largeDesktopBlockSize: 31,
      orientation: "landscape",
    },
  },

  // Block size presets by device type
  blockSizes: {
    LARGE_DESKTOP: LARGE_DESKTOP_BLOCK_SIZE,
    DESKTOP: DESKTOP_BLOCK_SIZE,
    COMPACT_DESKTOP: COMPACT_DESKTOP_BLOCK_SIZE,
    SMALL_HEIGHT: SMALL_HEIGHT_BLOCK_SIZE,
    MOBILE: MOBILE_BLOCK_SIZE,
    TABLET: COMPACT_DESKTOP_BLOCK_SIZE,
  },

  // Animation/timing constants
  animations: {
    PIECE_SPAWN_DURATION_MS: 180,
    RESTART_PULSE_DURATION_MS: 240,
    ROTATE_PULSE_DURATION_MS: 100,
    SOFT_DROP_PULSE_DURATION_MS: 100,
    HARD_DROP_PULSE_DURATION_MS: 150,
    LINE_CLEAR_FLASH_DURATION_MS: 190,
    LINE_SHIFT_DURATION_BASE_MS: 200,
    LINE_SHIFT_DURATION_PER_ROW_MS: 36,
    LINE_SHIFT_DURATION_MAX_MS: 420,
    HARD_DROP_TRAIL_DURATION_MS: 180,
    IMPACT_PULSE_DURATION_MS: 140,
  },

  getDeviceProfile: (width, height) => {
    if (width < MOBILE_BREAKPOINT) return "mobile";
    if (width < DESKTOP_BREAKPOINT) return "tablet";
    if (width < LARGE_DESKTOP_BREAKPOINT) return "desktop";
    return "largeDesktop";
  },

  // Media query helpers
  mediaQueries: {
    mobile: `(max-width: ${MOBILE_BREAKPOINT}px)`,
    tablet: `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${DESKTOP_BREAKPOINT}px)`,
    desktop: `(min-width: ${DESKTOP_BREAKPOINT}px)`,
    largeDesktop: `(min-width: ${LARGE_DESKTOP_BREAKPOINT}px)`,
    shortScreen: '(max-height: 980px)',
    tallScreen: '(min-height: 1000px)',
    portrait: '(orientation: portrait)',
    landscape: '(orientation: landscape)',
    highDpi: '(min-device-pixel-ratio: 2)',
  },

  // CSS class mappings
  cssClasses: {
    mobile: 'is-mobile',
    tablet: 'is-tablet',
    desktop: 'is-desktop',
    portrait: 'is-portrait',
    highDpi: 'is-high-dpi',
    fullscreen: 'is-fullscreen-focus',
    paused: 'is-paused',
    gameOver: 'is-game-over',
    live: 'is-live',
  },

  // Get optimal block size for viewport
  getOptimalBlockSize,
};

export default TETRIS_RESPONSIVE_CONFIG;

