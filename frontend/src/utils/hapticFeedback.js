/**
 * Haptic Feedback Utility
 *
 * Provides consistent haptic feedback patterns for different game actions
 * Compatible with: Vibration API (standard), mobile browsers
 */

// Haptic feedback patterns (duration in milliseconds)
export const HAPTIC_PATTERNS = {
  // Light feedback
  tap: 8,              // Light tap feedback
  move: 10,            // Move piece
  softDrop: 12,        // Soft drop

  // Medium feedback
  rotate: 14,          // Rotation
  hold: 16,            // Hold piece

  // Strong feedback
  lock: 20,            // Piece locked
  lineClear: [30, 20], // Line clear pattern (vibrate 30ms, pause 20ms)
  tetris: [50, 30],    // TETRIS clear (strong vibration)
  hardDrop: [40, 15],  // Hard drop impact

  // UI feedback
  modal: 12,           // Modal open/close
  focus: 8,            // Focus change
  pause: 14,           // Pause toggle
  gameOver: [60, 40],  // Game over
};

/**
 * Trigger haptic feedback with optional pattern
 * @param {string|number|array} pattern - Haptic pattern name or duration(s)
 * @param {boolean} enabled - Whether haptics are enabled
 */
export function triggerHapticFeedback(pattern = 'tap', enabled = true) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) {
    return;
  }

  try {
    let vibrationPattern = HAPTIC_PATTERNS[pattern];

    // If pattern is not found in map, treat as direct duration
    if (vibrationPattern === undefined) {
      vibrationPattern = typeof pattern === 'number' ? pattern : 10;
    }

    navigator.vibrate(vibrationPattern);
  } catch (error) {
    // Silently fail if vibration not supported
  }
}

/**
 * Cancel all ongoing haptic feedback
 */
export function cancelHapticFeedback() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(0);
  }
}

export default {
  HAPTIC_PATTERNS,
  triggerHapticFeedback,
  cancelHapticFeedback,
};

