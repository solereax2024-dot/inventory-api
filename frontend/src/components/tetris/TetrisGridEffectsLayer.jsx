import {
  GRID_INSET_PX,
  GRID_WIDTH,
  HARD_DROP_TRAIL_DURATION_MS,
  LINE_SHIFT_DURATION_BASE_MS,
  LINE_SHIFT_DURATION_MAX_MS,
  LINE_SHIFT_DURATION_PER_ROW_MS,
} from "../../constants/tetris";

export default function TetrisGridEffectsLayer({
  blockSize,
  getBrandColor,
  renderTileFace,
  rowClearFlashRows,
  clearEffectVariant,
  clearIntensity,
  shimmerSweepRows,
  rowShiftBlocks,
  hardDropTrail,
  impactPulse,
  lockPulseCells,
  currentPiece,
  ghostPieceRow,
  currentPieceRow,
  currentPieceCol,
  currentTileId,
  pointPopups,
  isPaused,
  gameOver,
}) {
  return (
    <>
      {rowClearFlashRows.length > 0 && (
        <div className={`tetris-row-clear-overlay is-${clearEffectVariant}`} aria-hidden="true" />
      )}

      {shimmerSweepRows.map((rowIndex, index) => (
        <div
          key={`shimmer-row-${rowIndex}-${clearEffectVariant}`}
          className={`tetris-cleared-row-shimmer is-${clearEffectVariant}`}
          style={{
            left: GRID_INSET_PX,
            top: GRID_INSET_PX + rowIndex * blockSize,
            width: GRID_WIDTH * blockSize,
            height: blockSize,
            "--tetris-row-shimmer-delay": `${Math.min(index * 42, 132)}ms`,
            "--tetris-row-shimmer-intensity": `${clearIntensity}`,
          }}
          aria-hidden="true"
        />
      ))}

      {rowClearFlashRows.map((rowIndex) => (
        <div
          key={`flash-row-${rowIndex}`}
          className={`tetris-cleared-row-flash is-${clearEffectVariant}`}
          style={{
            left: GRID_INSET_PX,
            top: GRID_INSET_PX + rowIndex * blockSize,
            width: GRID_WIDTH * blockSize,
            height: blockSize,
          }}
          aria-hidden="true"
        />
      ))}

      {rowShiftBlocks.map((block) => (
        <div
          key={block.id}
          className="tetris-block tetris-block-row-shift"
          style={{
            left: GRID_INSET_PX + block.colIndex * blockSize,
            top: GRID_INSET_PX + block.rowIndex * blockSize,
            width: blockSize,
            height: blockSize,
            backgroundColor: getBrandColor(block.tileId),
            "--tetris-row-shift-distance": `${block.shiftCount * blockSize}px`,
            "--tetris-row-shift-duration": `${Math.min(
              LINE_SHIFT_DURATION_MAX_MS,
              LINE_SHIFT_DURATION_BASE_MS + (block.shiftCount * LINE_SHIFT_DURATION_PER_ROW_MS)
            )}ms`,
            "--tetris-row-shift-delay": `${block.shiftDelayMs || 0}ms`,
          }}
          aria-hidden="true"
        >
          {renderTileFace(block.tileId, true)}
        </div>
      ))}

      {hardDropTrail.map((cell, index) => (
        <div
          key={`trail-${cell.row}-${cell.col}-${cell.tileId}-${index}`}
          className={[
            "tetris-block",
            "tetris-block-hard-drop-trail",
            cell.trailLead ? "is-lead" : "",
          ].filter(Boolean).join(" ")}
          style={{
            left: GRID_INSET_PX + cell.col * blockSize,
            top: GRID_INSET_PX + cell.row * blockSize,
            width: blockSize,
            height: blockSize,
            backgroundColor: getBrandColor(cell.tileId),
            opacity: cell.trailOpacity,
            "--tetris-hard-drop-delay": `${Math.min((cell.trailOrder || index) * 4, 90)}ms`,
            "--tetris-hard-drop-duration": `${HARD_DROP_TRAIL_DURATION_MS}ms`,
            "--tetris-hard-drop-scale-x": `${cell.trailScale || 1}`,
            "--tetris-hard-drop-scale-y": `${cell.trailScaleY || cell.trailScale || 1}`,
            "--tetris-hard-drop-lift": `${cell.trailLift || -4}px`,
            "--tetris-hard-drop-glow": `${cell.trailGlow || 0.2}`,
            "--tetris-hard-drop-blur": `${cell.trailBlur || 0.18}px`,
          }}
          aria-hidden="true"
        />
      ))}

      {impactPulse && (
        <div
          key={impactPulse.id}
          className={`tetris-impact-ring is-${impactPulse.variant}`}
          style={{
            left: GRID_INSET_PX + (impactPulse.minCol - 0.22) * blockSize,
            top: GRID_INSET_PX + (impactPulse.bottomRow + 0.52) * blockSize,
            width: (impactPulse.widthCells + 0.44) * blockSize,
            height: Math.max(blockSize * 0.74, 14),
            "--tetris-impact-opacity": `${Math.min(1, 0.7 + impactPulse.strength * 0.16).toFixed(3)}`,
            "--tetris-impact-scale-start": `${(0.62 * impactPulse.strength).toFixed(3)}`,
            "--tetris-impact-scale-mid": `${(0.96 + impactPulse.strength * 0.16).toFixed(3)}`,
            "--tetris-impact-scale-end": `${(1.14 + impactPulse.strength * 0.24).toFixed(3)}`,
          }}
          aria-hidden="true"
        />
      )}

      {lockPulseCells.map((cell, index) => (
        <div
          key={`lock-${cell.row}-${cell.col}-${cell.tileId}-${index}`}
          className="tetris-block tetris-block-lock-pulse"
          style={{
            left: GRID_INSET_PX + cell.col * blockSize,
            top: GRID_INSET_PX + cell.row * blockSize,
            width: blockSize,
            height: blockSize,
            backgroundColor: getBrandColor(cell.tileId),
          }}
          aria-hidden="true"
        >
          {renderTileFace(cell.tileId, true)}
        </div>
      ))}

      {currentPiece && ghostPieceRow !== null && ghostPieceRow !== currentPieceRow && currentPiece.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          cell ? (
            <div
              key={`ghost-${rowIndex}-${colIndex}`}
              className="tetris-block tetris-block-ghost"
              style={{
                left: GRID_INSET_PX + (currentPieceCol + colIndex) * blockSize,
                top: GRID_INSET_PX + (ghostPieceRow + rowIndex) * blockSize,
                width: blockSize,
                height: blockSize,
                backgroundColor: getBrandColor(currentTileId),
              }}
              aria-hidden="true"
            />
          ) : null
        ))
      )}

      {pointPopups.map((popup) => (
        <div
          key={popup.id}
          className={[
            "tetris-point-popup",
            popup.isTetris ? "is-tetris" : "",
            popup.isTSpin ? "is-tspin" : "",
          ].filter(Boolean).join(" ")}
          style={{ "--popup-x-offset": `${popup.xOffset}px` }}
          aria-hidden="true"
        >
          +{popup.points}
        </div>
      ))}

      {isPaused && !gameOver && (
        <div className="tetris-pause-overlay" aria-live="polite">
          <strong>Paused</strong>
          <span>Press P, Esc, or tap Resume.</span>
        </div>
      )}
    </>
  );
}

