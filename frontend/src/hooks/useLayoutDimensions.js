import { useMemo } from "react";

export default function useLayoutDimensions(viewportSize, blockSize, { GRID_WIDTH, GRID_INSET_PX, MOBILE_BREAKPOINT, isFullscreen = false } = {}) {
  return useMemo(() => {
    const isMobileViewport = viewportSize.width < MOBILE_BREAKPOINT;
    const isShortMobileViewport = isMobileViewport && viewportSize.height <= 760;
    const isVeryShortMobileViewport = isMobileViewport && viewportSize.height <= 680;
    const isUltraCompactHeight = viewportSize.height <= 820;
    const isCompactHeight = viewportSize.height <= 920;
    const gridBorderWidth = isMobileViewport ? 0 : 3;
    const boardPixelWidth = GRID_WIDTH * blockSize + GRID_INSET_PX * 2 + gridBorderWidth * 2;
    const isMobileFullscreen = isMobileViewport && isFullscreen;
    const stageGap = isMobileViewport
      ? (isMobileFullscreen ? 1 : isVeryShortMobileViewport ? 1 : isShortMobileViewport ? 1 : 2)
      : isUltraCompactHeight ? 2 : isCompactHeight ? 2 : 2;
    const stageSidePanelMinWidth = isMobileViewport
      ? (isMobileFullscreen ? (isVeryShortMobileViewport ? 30 : isShortMobileViewport ? 32 : 34) : isVeryShortMobileViewport ? 40 : isShortMobileViewport ? 48 : 56)
      : isUltraCompactHeight ? 66 : isCompactHeight ? 72 : 72;
    const holdStagePanelWidth = isMobileViewport
      ? (isMobileFullscreen ? (isVeryShortMobileViewport ? 32 : isShortMobileViewport ? 36 : 38) : isVeryShortMobileViewport ? 48 : isShortMobileViewport ? 56 : 64)
      : isUltraCompactHeight ? 110 : isCompactHeight ? 120 : 130;
    const nextStagePanelWidth = isMobileViewport
      ? (isMobileFullscreen ? (isVeryShortMobileViewport ? 32 : isShortMobileViewport ? 36 : 38) : isVeryShortMobileViewport ? 48 : isShortMobileViewport ? 56 : 64)
      : isUltraCompactHeight ? 110 : isCompactHeight ? 124 : 140;
    const boardShellWidth = isMobileViewport
      ? Math.min(viewportSize.width - 8, boardPixelWidth + holdStagePanelWidth + nextStagePanelWidth + stageGap * 2)
      : boardPixelWidth + holdStagePanelWidth + nextStagePanelWidth + stageGap * 2;

    return {
      boardPixelWidth,
      boardShellWidth,
      stageGap,
      stageSidePanelWidth: Math.max(holdStagePanelWidth, nextStagePanelWidth),
      holdStagePanelWidth,
      nextStagePanelWidth,
      stageSidePanelMinWidth,
      sidePreviewBlockSize: isMobileViewport
        ? (isMobileFullscreen ? (isVeryShortMobileViewport ? 10 : isShortMobileViewport ? 12 : 14) : isVeryShortMobileViewport ? 12 : isShortMobileViewport ? 14 : 18)
        : isUltraCompactHeight ? 18 : isCompactHeight ? 22 : 28,
    };
  }, [blockSize, isFullscreen, viewportSize.height, viewportSize.width, GRID_WIDTH, GRID_INSET_PX, MOBILE_BREAKPOINT]);
}

