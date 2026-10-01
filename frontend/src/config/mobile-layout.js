/**
 * Mobile Layout Strategy & Component Helpers
 *
 * Provides mobile-optimized layout logic and helpers
 * for creating responsive, touch-friendly interfaces
 */

import TETRIS_RESPONSIVE_CONFIG from "../../config/tetris-responsive";

/**
 * Mobile Layout Configuration
 * Defines optimal dimensions and spacing for mobile devices
 */
export const MOBILE_LAYOUT_CONFIG = {
  // Safe area aware insets
  safeAreaInsets: {
    top: 'max(8px, env(safe-area-inset-top))',
    right: 'max(8px, env(safe-area-inset-right))',
    bottom: 'max(8px, env(safe-area-inset-bottom))',
    left: 'max(8px, env(safe-area-inset-left))',
  },

  // Touch-friendly minimum sizes
  touchTargets: {
    minimum: 44,  // WCAG 2.5.5 minimum
    comfortable: 48,
    large: 56,
  },

  // Mobile spacing scale (in pixels)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  // Mobile viewport zones
  zones: {
    header: {
      height: 56,  // Top navigation/info
      padding: 8,
    },
    gameBoard: {
      minHeight: 280,  // Minimum playable board height
      padding: 8,
    },
    hud: {
      height: 80,  // Game info (score, level, lines)
      padding: 8,
    },
    controls: {
      height: 120,  // Touch control area
      padding: 12,
      safeAreaBottomPadding: 'max(8px, env(safe-area-inset-bottom))',
    },
    modals: {
      maxWidth: '95vw',
      maxHeight: '90vh',
      borderRadius: 12,
      padding: 16,
    },
  },

  // Mobile font scales
  typography: {
    xs: '11px',
    sm: '12px',
    base: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    title: '24px',
    heading: '28px',
  },

  // Mobile breakpoint specific settings
  breakpoints: {
    small: {
      // iPhone SE, small phones (< 375px)
      maxWidth: 375,
      controlsHeight: 100,
      gameboardMinHeight: 240,
      boardInset: 6,
      spacing: {
        xs: 2,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
      },
    },
    standard: {
      // Standard mobile (375-640px)
      maxWidth: 640,
      controlsHeight: 120,
      gameboardMinHeight: 280,
      boardInset: 8,
      spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
      },
    },
    tablet: {
      // Tablet (640-1024px)
      maxWidth: 1024,
      controlsHeight: 140,
      gameboardMinHeight: 320,
      boardInset: 12,
      spacing: {
        xs: 6,
        sm: 12,
        md: 16,
        lg: 24,
        xl: 32,
      },
    },
  },

  // Mobile orientation handling
  orientation: {
    portrait: {
      stackVertically: true,
      showSidePanels: false,
      controlsPosition: 'bottom',
      controlsHeight: 120,
    },
    landscape: {
      stackVertically: false,
      showSidePanels: true,
      controlsPosition: 'side',
      controlsHeight: '100%',
    },
  },

  // Color adjustments for mobile
  colors: {
    // Increase contrast on small screens
    contrastBoost: 0.1,  // 10% increase
    // Adapt shadows for better visibility
    shadowScale: 0.8,
  },
};

/**
 * Get layout configuration for current viewport
 */
export function getLayoutConfig(width, height, orientation = 'portrait') {
  if (width < 375) {
    return MOBILE_LAYOUT_CONFIG.breakpoints.small;
  }

  if (width < 640) {
    return MOBILE_LAYOUT_CONFIG.breakpoints.standard;
  }

  return MOBILE_LAYOUT_CONFIG.breakpoints.tablet;
}

/**
 * Calculate optimal spacing based on device
 */
export function getSpacing(level, width) {
  const config = getLayoutConfig(width, 0);
  const spacing = config.spacing;

  const levelMap = {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
  };

  return levelMap[level] || spacing.md;
}

/**
 * Get safe area aware padding CSS
 */
export function getSafeAreaPadding(edges = 'all') {
  const insets = MOBILE_LAYOUT_CONFIG.safeAreaInsets;

  if (edges === 'all') {
    return {
      paddingTop: insets.top,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
    };
  }

  const paddingMap = {
    top: { paddingTop: insets.top },
    right: { paddingRight: insets.right },
    bottom: { paddingBottom: insets.bottom },
    left: { paddingLeft: insets.left },
    horizontal: { paddingLeft: insets.left, paddingRight: insets.right },
    vertical: { paddingTop: insets.top, paddingBottom: insets.bottom },
  };

  return paddingMap[edges] || {};
}

/**
 * Get touch target minimum size CSS
 */
export function getTouchTargetSize(size = 'minimum') {
  const sizes = MOBILE_LAYOUT_CONFIG.touchTargets;
  const px = sizes[size] || sizes.minimum;
  return {
    minWidth: `${px}px`,
    minHeight: `${px}px`,
  };
}

/**
 * Mobile-specific layout utilities
 */
export const mobileLayoutUtils = {
  /**
   * Get game board calculation for available space
   */
  calculateBoardDimensions: (width, height, controlsHeight = 120) => {
    const config = getLayoutConfig(width, height);
    const availableHeight = height - controlsHeight - config.gameboardMinHeight * 0.3;

    return {
      maxHeight: Math.max(
        config.gameboardMinHeight,
        availableHeight
      ),
      padding: config.boardInset,
    };
  },

  /**
   * Get responsive font size
   */
  getResponsiveFontSize: (baseSize, width) => {
    const scale = Math.min(width / 375, 1.2);
    return `${parseInt(baseSize) * scale}px`;
  },

  /**
   * Check if layout should stack vertically
   */
  shouldStackVertically: (width, orientation) => {
    if (orientation === 'landscape') return false;
    return width < 768;
  },

  /**
   * Get optimal controls layout
   */
  getControlsLayout: (width, height, orientation) => {
    const config = MOBILE_LAYOUT_CONFIG.orientation[orientation] || MOBILE_LAYOUT_CONFIG.orientation.portrait;

    return {
      position: config.controlsPosition,
      height: config.controlsHeight,
      stacked: config.stackVertically,
      showSidePanels: config.showSidePanels,
    };
  },

  /**
   * Calculate HUD zone height
   */
  calculateHUDHeight: (width) => {
    const config = getLayoutConfig(width, 0);
    return config.gameboardMinHeight * 0.2;  // 20% of board as HUD
  },

  /**
   * Get modal dimensions
   */
  getModalDimensions: (width, height) => {
    const config = MOBILE_LAYOUT_CONFIG.zones.modals;
    const maxWidth = width > 640 ? Math.min(width * 0.8, 600) : width * 0.95;

    return {
      maxWidth,
      maxHeight: height * 0.9,
      borderRadius: config.borderRadius,
      padding: config.padding,
    };
  },

  /**
   * Get accessibility adjusted layout
   */
  getAccessibilityLayout: (width, baseSpacing) => {
    return {
      spacing: baseSpacing * 1.2,  // 20% more spacing
      fontSize: `${parseInt(MOBILE_LAYOUT_CONFIG.typography.md) * 1.1}px`,
      touchTarget: MOBILE_LAYOUT_CONFIG.touchTargets.comfortable,
      lineHeight: 1.6,  // Better readability
    };
  },
};

export default MOBILE_LAYOUT_CONFIG;

