/**
 * Tetris Game Responsive Configuration
 *
 * Centralized breakpoints, device profiles, and responsive settings
 * Eliminates hardcoded values scattered throughout the codebase
 */

export const TETRIS_RESPONSIVE_CONFIG = {
  // Grid dimensions (game logic)
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
  GRID_INSET_PX: 8,

  // Breakpoints (all responsive thresholds in one place)
  breakpoints: {
    mobile: 640,      // < 640px = mobile
    tablet: 768,      // 640-768px = mobile/tablet
    desktop: 1024,    // >= 1024px = desktop
    large: 1280,      // >= 1280px = large desktop
  },

  // Device profiles with optimized settings
  devices: {
    // Mobile phones
    mobile: {
      name: "Mobile Phone",
      widthRange: [320, 640],
      heightRange: [480, 812],
      blockSizeRange: [13, 24],
      horizontalReserve: 34,      // Insets + safe areas
      verticalReserveSmall: 206,  // < 650px height
      verticalReserveMedium: 218, // 650-740px height
      verticalReserveLarge: 226,  // >= 740px height
      touchControlsHeight: 120,   // Bottom control area
      hudHeight: 80,              // Top game info
      previewPanelHeight: 100,    // Next/Hold preview
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
      blockSizeRange: [24, 28],
      horizontalReserve: 80,
      verticalReserve: 300,
      desktopBlockSize: 25,
      largeDesktopBlockSize: 29,
      compactDesktopBlockSize: 24,
      smallHeightBlockSize: 25,
      orientation: "landscape",
    },

    // Large desktop / 4K
    largeDesktop: {
      name: "Large Desktop / 4K",
      widthRange: [1440, Infinity],
      heightRange: [1080, Infinity],
      blockSizeRange: [28, 29],
      horizontalReserve: 100,
      verticalReserve: 350,
      largeDesktopBlockSize: 29,
      orientation: "landscape",
    },
  },

  // Block size presets by device type
  blockSizes: {
    LARGE_DESKTOP: 29,
    DESKTOP: 25,
    COMPACT_DESKTOP: 24,
    SMALL_HEIGHT: 25,
    MOBILE: 22,
    TABLET: 20,
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

  // Safe area insets (for notch/home indicator)
  safeAreaInsets: {
    top: 'env(safe-area-inset-top)',
    right: 'env(safe-area-inset-right)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
  },

  // Touch input thresholds
  touchInput: {
    SWIPE_THRESHOLD_PX: 15,
    FLICK_SPEED_MS: 300,
    FLICK_DISTANCE_PX: 40,
    TAP_DURATION_MS: 200,
    TAP_DISTANCE_PX: 10,
    DOUBLE_TAP_INTERVAL_MS: 300,
  },

  // Media query helpers
  mediaQueries: {
    mobile: '(max-width: 640px)',
    tablet: '(min-width: 640px) and (max-width: 1024px)',
    desktop: '(min-width: 1024px)',
    largeDesktop: '(min-width: 1440px)',
    shortScreen: '(max-height: 980px)',
    tallScreen: '(min-height: 1000px)',
    portrait: '(orientation: portrait)',
    highDpi: '(min-device-pixel-ratio: 2)',
    touchSupport: '(hover: none) and (pointer: coarse)',
    noTouchSupport: '(hover: hover) and (pointer: fine)',
  },

  // CSS class mappings
  cssClasses: {
    mobile: 'is-mobile',
    tablet: 'is-tablet',
    desktop: 'is-desktop',
    touchDevice: 'is-touch-device',
    portrait: 'is-portrait',
    highDpi: 'is-high-dpi',
    fullscreen: 'is-fullscreen-focus',
    paused: 'is-paused',
    gameOver: 'is-game-over',
    live: 'is-live',
  },

  // Height calculation helpers
  calculateHeightReserve: (height) => {
    if (height < 650) return 206;
    if (height < 740) return 218;
    return 226;
  },

  // Get device profile for current viewport
  getDeviceProfile: (width) => {
    if (width < 640) return 'mobile';
    if (width < 1024) return 'tablet';
    if (width < 1440) return 'desktop';
    return 'largeDesktop';
  },

  // Get optimal block size for viewport
  getOptimalBlockSize: (width, height, type = null) => {
    const deviceType = type || exports.TETRIS_RESPONSIVE_CONFIG.getDeviceProfile(width, height);

    if (deviceType === 'mobile') {
      const horizontalReserve = 34;
      const verticalReserve = exports.TETRIS_RESPONSIVE_CONFIG.calculateHeightReserve(height);
      const usableWidth = Math.max(150, width - horizontalReserve - 16);
      const usableHeight = Math.max(280, height - verticalReserve - 16);
      const widthFit = Math.floor(usableWidth / 10);
      const heightFit = Math.floor(usableHeight / 20);
      return Math.max(13, Math.min(24, widthFit, heightFit));
    }

    if (deviceType === 'tablet') {
      return Math.floor(Math.min(width / 12, (height - 200) / 24));
    }

    // Desktop
    if (height < 980) {
      return Math.max(24, Math.min(25, width / 12, (height - 300) / 22));
    }

    return Math.max(25, Math.min(29, width / 12, (height - 300) / 22));
  },
};

export default TETRIS_RESPONSIVE_CONFIG;

