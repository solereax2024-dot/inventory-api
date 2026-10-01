import { useEffect, useState, useCallback, useMemo } from "react";
import TETRIS_RESPONSIVE_CONFIG from "../../config/tetris-responsive";

/**
 * useDeviceDetection Hook
 *
 * Detects device type and provides mobile-specific optimization helpers
 *
 * Returns: {
 *   deviceType: string,           // 'mobile' | 'tablet' | 'desktop' | 'largeDesktop'
 *   isMobile: boolean,
 *   isTablet: boolean,
 *   isDesktop: boolean,
 *   isTouchDevice: boolean,
 *   orientation: string,          // 'portrait' | 'landscape'
 *   isPortrait: boolean,
 *   isLandscape: boolean,
 *   hasNotch: boolean,
 *   hasHomeIndicator: boolean,
 *   supportsHover: boolean,
 *   dpi: number,
 *   isHighDpi: boolean,
 *   shouldCompactLayout: boolean,
 * }
 */
export function useDeviceDetection() {
  const [viewportSize, setViewportSize] = useState(() => {
    if (typeof window === "undefined") {
      return { width: 1024, height: 768 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  const [orientation, setOrientation] = useState(() => {
    if (typeof window === "undefined") return "landscape";
    return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
  });

  const [touchDevice, setTouchDevice] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      ("ontouchstart" in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0)
    );
  });

  // Handle viewport changes
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setOrientation(window.innerHeight > window.innerWidth ? "portrait" : "landscape");
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        setViewportSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
        setOrientation(window.innerHeight > window.innerWidth ? "portrait" : "landscape");
      }, 100); // Wait for orientation to settle
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  // Detect high DPI displays
  const dpi = useMemo(() => {
    if (typeof window === "undefined") return 1;
    return window.devicePixelRatio || 1;
  }, []);

  // Detect if device has a notch (common on modern phones)
  const hasNotch = useCallback(() => {
    if (typeof window === "undefined" || !navigator.userAgent) return false;
    const ua = navigator.userAgent;
    return /iPhone|iPad|Mac OS/i.test(ua) && window.devicePixelRatio > 2;
  }, []);

  // Detect home indicator (bottom safe area on modern mobile devices)
  const hasHomeIndicator = useCallback(() => {
    if (typeof window === "undefined" || !("screen" in window)) return false;
    const screen = window.screen;
    // Home indicator on iPhone typically results in ~34px safe area
    const bottomInset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0;
    return bottomInset > 10;
  }, []);

  // Check if device supports hover (keyboard/mouse vs touch)
  const supportsHover = useCallback(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(hover: hover)").matches;
  }, []);

  // Determine if layout should be compact
  const shouldCompactLayout = useMemo(() => {
    return viewportSize.width < 768 || viewportSize.height < 800;
  }, [viewportSize]);

  const deviceType = TETRIS_RESPONSIVE_CONFIG.getDeviceProfile(viewportSize.width, viewportSize.height);

  return {
    // Device type
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop' || deviceType === 'largeDesktop',

    // Touch capabilities
    isTouchDevice: touchDevice,
    supportsHover: supportsHover(),

    // Orientation
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',

    // Device features
    hasNotch: hasNotch(),
    hasHomeIndicator: hasHomeIndicator(),
    dpi,
    isHighDpi: dpi >= 2,

    // Layout decisions
    shouldCompactLayout,
    viewportSize,
  };
}

/**
 * useMobileOptimization Hook
 *
 * Provides mobile-specific game optimizations
 *
 * Returns optimization settings based on device capabilities
 */
export function useMobileOptimization(deviceDetection) {
  const optimizations = useMemo(() => {
    if (!deviceDetection) return null;

    return {
      // Animation optimizations
      reduceAnimations: deviceDetection.isMobile && deviceDetection.dpi < 2,
      reducedMotion: typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,

      // Performance optimizations
      useGPUAcceleration: deviceDetection.isHighDpi || deviceDetection.isDesktop,
      lowPowerMode: typeof navigator !== "undefined" && navigator.getBattery?.(),
      throttleUpdateFrequency: deviceDetection.isMobile,
      updateFrequency: deviceDetection.isMobile ? 30 : 60, // FPS

      // Touch optimizations
      enhancedTouchTargets: deviceDetection.isMobile && deviceDetection.isTouchDevice,
      minTouchTargetSize: deviceDetection.isMobile ? 44 : 32, // pixels (accessibility)
      hapticFeedback: deviceDetection.isMobile && deviceDetection.isTouchDevice,

      // Input optimizations
      hideHoverStates: deviceDetection.isMobile && !deviceDetection.supportsHover,
      showTouchIndicators: deviceDetection.isMobile && deviceDetection.isTouchDevice,
      adjustInputThresholds: deviceDetection.isMobile,

      // Safe area considerations
      reserveNotchSpace: deviceDetection.hasNotch,
      reserveHomeIndicatorSpace: deviceDetection.hasHomeIndicator,
      safeAreaPaddingTop: deviceDetection.hasNotch ? 'env(safe-area-inset-top)' : '0',
      safeAreaPaddingBottom: deviceDetection.hasHomeIndicator ? 'env(safe-area-inset-bottom)' : '0',

      // Layout decisions
      useCompactLayout: deviceDetection.shouldCompactLayout,
      stackPanelsVertically: deviceDetection.isMobile && deviceDetection.isPortrait,
      hideSidePanelsOnMobile: deviceDetection.isMobile && deviceDetection.isPortrait,

      // Font scaling
      fontSizeScale: deviceDetection.isMobile ? 0.9 : 1.0,
      lineHeightScale: deviceDetection.isMobile ? 1.3 : 1.4,

      // Color and visual adjustments
      increaseContrastMobile: deviceDetection.isMobile,
      useLargerTouchFeedback: deviceDetection.isMobile && deviceDetection.isTouchDevice,
    };
  }, [deviceDetection]);

  return optimizations;
}

export default useDeviceDetection;

