/**
 * Simple device detection utilities
 */

/**
 * Check if the current device is mobile
 * @returns {boolean} true if device width is less than 640px (mobile breakpoint)
 */
export function isMobile() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerWidth < 640;
}

/**
 * Check if the current device is tablet
 * @returns {boolean} true if device width is between 640px and 1024px
 */
export function isTablet() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerWidth >= 640 && window.innerWidth < 1024;
}

/**
 * Check if the current device is desktop
 * @returns {boolean} true if device width is 1024px or greater
 */
export function isDesktop() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerWidth >= 1024;
}

/**
 * Check if the device supports touch
 * @returns {boolean} true if device supports touch
 */
export function isTouchDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }
  return (
    (typeof navigator !== "undefined" &&
      (navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0 ||
        (navigator.userAgent && /touch/.test(navigator.userAgent)))) ||
    false
  );
}

/**
 * Get current viewport width
 * @returns {number} viewport width in pixels
 */
export function getViewportWidth() {
  if (typeof window === "undefined") {
    return 1024;
  }
  return window.innerWidth;
}

/**
 * Get current viewport height
 * @returns {number} viewport height in pixels
 */
export function getViewportHeight() {
  if (typeof window === "undefined") {
    return 768;
  }
  return window.innerHeight;
}

/**
 * Check if device is in portrait orientation
 * @returns {boolean} true if device height > width
 */
export function isPortrait() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerHeight > window.innerWidth;
}

/**
 * Check if device is in landscape orientation
 * @returns {boolean} true if device width > height
 */
export function isLandscape() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerWidth > window.innerHeight;
}

export default {
  isMobile,
  isTablet,
  isDesktop,
  isTouchDevice,
  getViewportWidth,
  getViewportHeight,
  isPortrait,
  isLandscape,
};

