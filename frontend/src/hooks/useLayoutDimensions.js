import { useMemo } from "react";

export default function useLayoutDimensions(viewportSize, blockSize, { GRID_WIDTH, GRID_INSET_PX, MOBILE_BREAKPOINT } = {}) {
  return useMemo(() => {
    const isMobileViewport = viewportSize.width < MOBILE_BREAKPOINT;
    const isShortMobileViewport = isMobileViewport && viewportSize.height <= 760;
    const isVeryShortMobileViewport = isMobileViewport && viewportSize.height <= 680;
    const isUltraCompactHeight = viewportSize.height <= 820;
    const isCompactHeight = viewportSize.height <= 920;

    return {
      boardPixelWidth: GRID_WIDTH * blockSize + GRID_INSET_PX * 2,
      boardShellWidth: (GRID_WIDTH * blockSize + GRID_INSET_PX * 2) + (isMobileViewport ? 18 : isUltraCompactHeight ? 20 : 28),
      stageGap: isMobileViewport ? (isVeryShortMobileViewport ? 4 : isShortMobileViewport ? 5 : 6) : isUltraCompactHeight ? 8 : isCompactHeight ? 10 : 12,
      stageSidePanelWidth: isMobileViewport ? (isVeryShortMobileViewport ? 48 : isShortMobileViewport ? 56 : 64) : isUltraCompactHeight ? 74 : isCompactHeight ? 84 : 96,
      stageSidePanelMinWidth: isMobileViewport ? (isVeryShortMobileViewport ? 40 : isShortMobileViewport ? 48 : 56) : isUltraCompactHeight ? 66 : isCompactHeight ? 72 : 80,
      sidePreviewBlockSize: isMobileViewport ? (isVeryShortMobileViewport ? 12 : isShortMobileViewport ? 14 : 18) : isUltraCompactHeight ? 18 : isCompactHeight ? 22 : 28,
    };
  }, [blockSize, viewportSize.height, viewportSize.width, GRID_WIDTH, GRID_INSET_PX, MOBILE_BREAKPOINT]);
}

