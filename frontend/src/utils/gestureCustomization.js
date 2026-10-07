/**
 * Gesture Customization Utility
 * 
 * Manages touch gesture sensitivity and customization settings
 * Stored in localStorage for persistence
 */

const GESTURE_SETTINGS_KEY = 'brand-tetris-gesture-settings';

// Default gesture sensitivity settings
export const DEFAULT_GESTURE_SETTINGS = {
  // Swipe sensitivity (lower = more sensitive)
  swipeSensitivity: 1.0,           // Range: 0.5 (very sensitive) to 2.0 (less sensitive)
  
  // Tap feedback
  enableTapFeedback: true,          // Visual feedback for taps
  enableTapHaptic: true,            // Haptic feedback for taps
  
  // Double-tap settings
  doubleTapThreshold: 300,          // ms between taps to register as double-tap
  doubleTapDistance: 20,            // pixels max distance between tap positions
  
  // Flick settings
  flickSpeed: 300,                  // ms max for flick detection
  flickDistance: 72,                // pixels min distance for flick
  
  // Long-press settings
  longPressDuration: 500,           // ms to trigger long-press
  enableLongPress: true,            // Enable hold-piece on long-press
  
  // Haptic intensity
  hapticIntensity: 1.0,             // Range: 0 (off) to 1.0 (full)
  
  // Auto-repeat (for held buttons)
  autoRepeatDelay: 150,             // ms before auto-repeat starts
  autoRepeatInterval: 80,           // ms between repeats
};

/**
 * Load gesture settings from localStorage
 * @returns {object} Gesture settings
 */
export function loadGestureSettings() {
  try {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_GESTURE_SETTINGS;
    }

    const stored = localStorage.getItem(GESTURE_SETTINGS_KEY);
    if (!stored) {
      return DEFAULT_GESTURE_SETTINGS;
    }

    return {
      ...DEFAULT_GESTURE_SETTINGS,
      ...JSON.parse(stored),
    };
  } catch (error) {
    console.warn('Failed to load gesture settings:', error);
    return DEFAULT_GESTURE_SETTINGS;
  }
}

/**
 * Save gesture settings to localStorage
 * @param {object} settings - Gesture settings to save
 */
export function saveGestureSettings(settings) {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(
      GESTURE_SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_GESTURE_SETTINGS,
        ...settings,
      })
    );
  } catch (error) {
    console.warn('Failed to save gesture settings:', error);
  }
}

/**
 * Reset gesture settings to defaults
 */
export function resetGestureSettings() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(GESTURE_SETTINGS_KEY);
    }
  } catch (error) {
    console.warn('Failed to reset gesture settings:', error);
  }
}

/**
 * Calculate swipe threshold based on sensitivity setting
 * @param {number} baseSensitivity - Base sensitivity value from config
 * @param {number} userSensitivity - User's sensitivity multiplier
 * @returns {number} Adjusted threshold
 */
export function calculateSwipeThreshold(baseSensitivity, userSensitivity) {
  return Math.max(8, Math.round(baseSensitivity / userSensitivity));
}

/**
 * Get haptic intensity multiplier for feedback patterns
 * @param {number} intensity - Intensity level (0-1)
 * @returns {number} Duration multiplier
 */
export function getHapticIntensityMultiplier(intensity) {
  return Math.max(0, Math.min(1, intensity));
}

/**
 * Validate gesture settings
 * @param {object} settings - Settings to validate
 * @returns {object} Validated settings
 */
export function validateGestureSettings(settings) {
  return {
    swipeSensitivity: Math.max(0.5, Math.min(2.0, settings.swipeSensitivity || 1.0)),
    enableTapFeedback: Boolean(settings.enableTapFeedback !== false),
    enableTapHaptic: Boolean(settings.enableTapHaptic !== false),
    doubleTapThreshold: Math.max(100, settings.doubleTapThreshold || 300),
    doubleTapDistance: Math.max(5, settings.doubleTapDistance || 20),
    flickSpeed: Math.max(100, settings.flickSpeed || 300),
    flickDistance: Math.max(20, settings.flickDistance || 72),
    longPressDuration: Math.max(300, settings.longPressDuration || 500),
    enableLongPress: Boolean(settings.enableLongPress !== false),
    hapticIntensity: Math.max(0, Math.min(1, settings.hapticIntensity || 1.0)),
    autoRepeatDelay: Math.max(100, settings.autoRepeatDelay || 150),
    autoRepeatInterval: Math.max(50, settings.autoRepeatInterval || 80),
  };
}

export default {
  DEFAULT_GESTURE_SETTINGS,
  loadGestureSettings,
  saveGestureSettings,
  resetGestureSettings,
  calculateSwipeThreshold,
  getHapticIntensityMultiplier,
  validateGestureSettings,
};
