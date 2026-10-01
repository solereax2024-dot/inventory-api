import { useState, useEffect, useRef, useMemo, useCallback } from "react";

const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const LARGE_DESKTOP_BLOCK_SIZE = 29;
const DESKTOP_BLOCK_SIZE = 25;
const COMPACT_DESKTOP_BLOCK_SIZE = 24;
const SMALL_HEIGHT_BLOCK_SIZE = 25;
const MOBILE_BLOCK_SIZE = 22;
const MOBILE_BREAKPOINT = 640;

/**
 * useTetrisResponsiveBoard Hook
 *
 * Manages responsive board sizing and viewport tracking
 *
 * Returns: {
 *   blockSize: number,
 *   viewportSize: { width, height },
 *   boardShellWidth: number,
 *   boardFrameRef: React.Ref
 * }
 */
export function useTetrisResponsiveBoard() {
  const boardFrameRef = useRef(null);
  const [boardFrameWidth, setBoardFrameWidth] = useState(0);
  const [viewportSize, setViewportSize] = useState(() => {
    if (typeof window === "undefined") return { width: 1024, height: 768 };
    return {
      width: Math.max(window.innerWidth, 320),
      height: Math.max(window.innerHeight, 480),
    };
  });

  // Calculate block size based on viewport
  const blockSize = useMemo(() => {
    const width = viewportSize.width;
    const height = viewportSize.height;

    // MOBILE: fit the full 10x20 board between the HUD/previews and control dock.
    // The board may shrink below the old minimum on short phones so it never gets clipped.
    if (width < MOBILE_BREAKPOINT) {
      const horizontalReserve = 34;
      const verticalReserve = height < 650 ? 206 : height < 740 ? 218 : 226;

      const usableWidth = Math.max(150, width - horizontalReserve - 16);
      const usableHeight = Math.max(280, height - verticalReserve - 16);

      const widthFit = Math.floor(usableWidth / GRID_WIDTH);
      const heightFit = Math.floor(usableHeight / GRID_HEIGHT);

      return Math.max(13, Math.min(24, widthFit, heightFit));
    }

    // DESKTOP
    const minBlockSize = COMPACT_DESKTOP_BLOCK_SIZE - 4;
    const horizontalBoardInset = 30;
    const availableBoardWidth = boardFrameWidth > 0
      ? Math.max(boardFrameWidth - horizontalBoardInset, GRID_WIDTH * minBlockSize)
      : Math.max(width - horizontalBoardInset, GRID_WIDTH * minBlockSize);

    const maxBlockSizeFromWidth = Math.floor(availableBoardWidth / GRID_WIDTH);
    const maxBlockSizeFromHeight = Math.floor((height - 300) / GRID_HEIGHT);

    if (height < 980) {
      return Math.max(minBlockSize, Math.min(SMALL_HEIGHT_BLOCK_SIZE, maxBlockSizeFromWidth, maxBlockSizeFromHeight));
    }

    return Math.max(
      COMPACT_DESKTOP_BLOCK_SIZE,
      Math.min(LARGE_DESKTOP_BLOCK_SIZE, maxBlockSizeFromWidth, maxBlockSizeFromHeight)
    );
  }, [viewportSize, boardFrameWidth]);

  const boardShellWidth = blockSize * GRID_WIDTH + 60; // 30px inset on each side

  // Handle viewport resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: Math.max(window.innerWidth, 320),
        height: Math.max(window.innerHeight, 480),
      });
    };

    const updateBoardFrameWidth = (nextWidth) => {
      setBoardFrameWidth(nextWidth);
    };

    // Initial board frame width
    if (boardFrameRef.current) {
      const initialWidth = boardFrameRef.current.getBoundingClientRect().width;
      updateBoardFrameWidth(initialWidth);
    }

    const fallbackResize = () => {
      if (boardFrameRef.current) {
        updateBoardFrameWidth(boardFrameRef.current.getBoundingClientRect().width);
      }
    };

    // Setup ResizeObserver for board frame
    let resizeObserver;
    if (boardFrameRef.current && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === boardFrameRef.current) {
            updateBoardFrameWidth(entry.contentRect.width);
          }
        }
      });
      resizeObserver.observe(boardFrameRef.current);
    }

    // Fallback to listening for window resize
    window.addEventListener("resize", handleResize);
    window.addEventListener("resize", fallbackResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("resize", fallbackResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  return {
    blockSize,
    viewportSize,
    boardShellWidth,
    boardFrameRef,
  };
}

export default useTetrisResponsiveBoard;

