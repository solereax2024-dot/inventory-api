// DEPRECATED: Legacy responsive-board hook retained only as a reference.
// The active layout now uses `useLayoutDimensions` and shared sizing constants.

import { useState, useEffect, useRef, useMemo } from "react";
import TETRIS_RESPONSIVE_CONFIG from "../../config/tetris-responsive";
import { GRID_WIDTH } from "../../constants/tetris";

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

    if (width < TETRIS_RESPONSIVE_CONFIG.breakpoints.mobile) {
      return TETRIS_RESPONSIVE_CONFIG.getOptimalBlockSize(width, height, "mobile");
    }

    if (width < TETRIS_RESPONSIVE_CONFIG.breakpoints.desktop) {
      return TETRIS_RESPONSIVE_CONFIG.getOptimalBlockSize(width, height, "tablet");
    }

    return TETRIS_RESPONSIVE_CONFIG.getOptimalBlockSize(width, height, "desktop");
  }, [viewportSize, boardFrameWidth]);

   const boardShellWidth = blockSize * GRID_WIDTH + TETRIS_RESPONSIVE_CONFIG.GRID_INSET_PX * 2;

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

