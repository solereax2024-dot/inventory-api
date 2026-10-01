/**
 * Mobile Utilities for Tetris Game
 *
 * Helper functions for mobile-specific functionality
 */

/**
 * Haptic feedback generator for mobile devices
 * Uses Vibration API if available
 */
export const hapticFeedback = {
  /**
   * Trigger light haptic feedback
   */
  light: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  /**
   * Trigger medium haptic feedback
   */
  medium: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(20);
    }
  },

  /**
   * Trigger strong haptic feedback
   */
  heavy: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
  },

  /**
   * Trigger double tap feedback
   */
  doubleTap: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([10, 5, 10]);
    }
  },

  /**
   * Trigger success feedback
   */
  success: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([10, 10, 20, 10]);
    }
  },

  /**
   * Check if haptic feedback is supported
   */
  isSupported: () => {
    return typeof navigator !== "undefined" && !!navigator.vibrate;
  },
};

/**
 * Screen lock utilities for fullscreen mobile gaming
 */
export const screenLock = {
  /**
   * Request fullscreen with orientation lock
   */
  requestFullscreen: async (element, orientation = 'landscape') => {
    if (!element) return false;

    try {
      // Request fullscreen
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      }

      // Try to lock orientation if supported
      if (screen.orientation?.lock) {
        try {
          await screen.orientation.lock(orientation);
        } catch (e) {
          console.warn("Orientation lock not supported:", e);
        }
      }

      return true;
    } catch (err) {
      console.error("Fullscreen request failed:", err);
      return false;
    }
  },

  /**
   * Exit fullscreen
   */
  exitFullscreen: async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.webkitFullscreenElement) {
        await document.webkitExitFullscreen();
      }

      // Unlock orientation if supported
      if (screen.orientation?.unlock) {
        try {
          screen.orientation.unlock();
        } catch (e) {
          console.warn("Orientation unlock not supported:", e);
        }
      }

      return true;
    } catch (err) {
      console.error("Exit fullscreen failed:", err);
      return false;
    }
  },

  /**
   * Check if fullscreen is supported
   */
  isSupported: () => {
    return (
      typeof document !== "undefined" &&
      (!!document.fullscreenEnabled ||
        !!document.webkitFullscreenEnabled)
    );
  },
};

/**
 * Safe area utilities for notch/home indicator aware layouts
 */
export const safeArea = {
  /**
   * Get safe area insets
   */
  getInsets: () => {
    if (typeof getComputedStyle === "undefined") {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const style = getComputedStyle(document.documentElement);
    const getValue = (prop) => {
      const val = style.getPropertyValue(prop).trim();
      return parseInt(val) || 0;
    };

    return {
      top: getValue("env(safe-area-inset-top)"),
      right: getValue("env(safe-area-inset-right)"),
      bottom: getValue("env(safe-area-inset-bottom)"),
      left: getValue("env(safe-area-inset-left)"),
    };
  },

  /**
   * Get safe area padding CSS
   */
  getPaddingCSS: () => {
    return {
      paddingTop: "max(8px, env(safe-area-inset-top))",
      paddingRight: "max(8px, env(safe-area-inset-right))",
      paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      paddingLeft: "max(8px, env(safe-area-inset-left))",
    };
  },

  /**
   * Check if safe areas exist (notch, home indicator, etc.)
   */
  hasSafeAreas: () => {
    const insets = safeArea.getInsets();
    return insets.top > 0 || insets.right > 0 || insets.bottom > 0 || insets.left > 0;
  },
};

/**
 * Status bar utilities for mobile devices
 */
export const statusBar = {
  /**
   * Try to hide status bar on mobile
   */
  hide: () => {
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo(0, 1);
    }
  },

  /**
   * Set status bar style (light or dark)
   */
  setStyle: (style = 'light') => {
    if (typeof document !== "undefined") {
      const meta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (meta) {
        meta.setAttribute('content', style);
      }
    }
  },

  /**
   * Set status bar background color
   */
  setBackgroundColor: (color) => {
    if (typeof document !== "undefined") {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', color);
      }
    }
  },
};

/**
 * Keyboard utilities for mobile virtual keyboards
 */
export const mobileKeyboard = {
  /**
   * Check if virtual keyboard is visible
   */
  isVisible: () => {
    if (typeof window === "undefined") return false;
    return (
      window.innerHeight < window.screen.height * 0.75
    );
  },

  /**
   * Hide virtual keyboard
   */
  hide: () => {
    if (typeof document !== "undefined") {
      const activeElement = document.activeElement;
      if (activeElement && typeof activeElement.blur === "function") {
        activeElement.blur();
      }
    }
  },

  /**
   * Get keyboard height estimate
   */
  getHeight: () => {
    if (typeof window === "undefined") return 0;
    return Math.max(0, window.screen.height - window.innerHeight);
  },
};

/**
 * Performance utilities for mobile devices
 */
export const mobilePerformance = {
  /**
   * Check if device is in low power mode
   */
  isLowPowerMode: async () => {
    if (typeof navigator === "undefined") return false;

    // Check Battery API (deprecated but still useful)
    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        return battery.level < 0.2 && battery.charging === false;
      } catch {
        return false;
      }
    }

    return false;
  },

  /**
   * Reduce animation frame rate on low power mode
   */
  getTargetFPS: async () => {
    const isLowPower = await mobilePerformance.isLowPowerMode();
    return isLowPower ? 30 : 60;
  },

  /**
   * Request animation frame with FPS limiting
   */
  requestAnimationFrame: (callback, targetFPS = 60) => {
    const frameInterval = 1000 / targetFPS;
    let lastFrameTime = 0;

    const frameCallback = (currentTime) => {
      const deltaTime = currentTime - lastFrameTime;

      if (deltaTime >= frameInterval) {
        callback(currentTime);
        lastFrameTime = currentTime;
      }

      requestAnimationFrame(frameCallback);
    };

    return requestAnimationFrame(frameCallback);
  },
};

/**
 * Touch feedback utilities
 */
export const touchFeedback = {
  /**
   * Provide visual feedback for touch interactions
   */
  createTouchRipple: (element, event) => {
    if (!element) return;

    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = (event.clientX || event.touches?.[0]?.clientX) - rect.left - size / 2;
    const y = (event.clientY || event.touches?.[0]?.clientY) - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('touch-ripple');

    element.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  },

  /**
   * Get touch target minimum size (accessibility)
   */
  getMinimumTouchTargetSize: (deviceType) => {
    // WCAG 2.5.5: Minimum 44x44 pixels for touch targets
    return deviceType === 'mobile' ? 44 : 32;
  },
};

/**
 * Device gesture utilities
 */
export const deviceGestures = {
  /**
   * Detect double tap
   */
  onDoubleTap: (element, callback) => {
    let lastTap = 0;

    element.addEventListener('touchend', (event) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;

      if (tapLength < 300 && tapLength > 0) {
        callback(event);
        lastTap = 0;
      } else {
        lastTap = currentTime;
      }
    });
  },

  /**
   * Detect long press
   */
  onLongPress: (element, callback, duration = 500) => {
    let pressTimer = null;

    element.addEventListener('touchstart', () => {
      pressTimer = setTimeout(() => {
        callback();
      }, duration);
    });

    ['touchend', 'touchcancel'].forEach((event) => {
      element.addEventListener(event, () => {
        clearTimeout(pressTimer);
      });
    });
  },
};

export default {
  hapticFeedback,
  screenLock,
  safeArea,
  statusBar,
  mobileKeyboard,
  mobilePerformance,
  touchFeedback,
  deviceGestures,
};

