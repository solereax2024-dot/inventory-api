import {
  GRID_HEIGHT,
  GRID_INSET_PX,
  GRID_WIDTH,
} from "../../constants/tetris";
import TetrisGridEffectsLayer from "./TetrisGridEffectsLayer";

export default function TetrisGridContent({
  gameSurfaceRef,
  blockSize,
  isBoardFocused,
  isPaused,
  gameOver,
  pieceSpawnPulse,
  rotatePulse,
  softDropPulse,
  hardDropPulse,
  restartPulse,
  focusBoard,
  handleBoardTouchStart,
  handleBoardTouchMove,
  handleBoardTouchEnd,
  handleBoardTouchCancel,
  onBoardFocusChange,
  grid,
  getBrandColor,
  getBrandTile,
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
}) {
  return (
    <div
      ref={gameSurfaceRef}
      className={[
        "tetris-grid",
        isBoardFocused ? "is-keyboard-ready" : "",
        isPaused ? "is-paused" : "",
        pieceSpawnPulse ? "is-spawning" : "",
        rotatePulse ? "is-rotating" : "",
        softDropPulse ? "is-soft-dropping" : "",
        hardDropPulse ? "is-hard-dropping" : "",
        restartPulse ? "is-restarting" : "",
      ].filter(Boolean).join(" ")}
      tabIndex={0}
      onMouseDown={focusBoard}
      onTouchStart={handleBoardTouchStart}
      onTouchMove={handleBoardTouchMove}
      onTouchEnd={handleBoardTouchEnd}
      onTouchCancel={handleBoardTouchCancel}
      onFocus={() => onBoardFocusChange(true)}
      onBlur={() => onBoardFocusChange(false)}
      style={{
        "--tetris-cell-size": `${blockSize}px`,
        "--tetris-grid-inset": `${GRID_INSET_PX}px`,
        width: GRID_WIDTH * blockSize + GRID_INSET_PX * 2,
        height: GRID_HEIGHT * blockSize + GRID_INSET_PX * 2,
      }}
      aria-label="Tetris board"
    >
      {grid.map((row, rowIndex) =>
        row.map((tileId, colIndex) => (
          tileId !== null && (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="tetris-block"
              style={{
                left: GRID_INSET_PX + colIndex * blockSize,
                top: GRID_INSET_PX + rowIndex * blockSize,
                width: blockSize,
                height: blockSize,
                backgroundColor: getBrandColor(tileId),
              }}
              title={getBrandTile(tileId)?.name || "Brand block"}
            >
              {renderTileFace(tileId, true)}
            </div>
          )
        ))
      )}

      <TetrisGridEffectsLayer
        blockSize={blockSize}
        getBrandColor={getBrandColor}
        renderTileFace={renderTileFace}
        rowClearFlashRows={rowClearFlashRows}
        clearEffectVariant={clearEffectVariant}
        clearIntensity={clearIntensity}
        shimmerSweepRows={shimmerSweepRows}
        rowShiftBlocks={rowShiftBlocks}
        hardDropTrail={hardDropTrail}
        impactPulse={impactPulse}
        lockPulseCells={lockPulseCells}
        currentPiece={currentPiece}
        ghostPieceRow={ghostPieceRow}
        currentPieceRow={currentPieceRow}
        currentPieceCol={currentPieceCol}
        currentTileId={currentTileId}
        pointPopups={pointPopups}
        isPaused={isPaused}
        gameOver={gameOver}
      />

      {currentPiece && currentPiece.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          cell ? (
            <div
              key={`piece-${rowIndex}-${colIndex}`}
              className={[
                "tetris-block",
                "tetris-block-falling",
                pieceSpawnPulse ? "is-spawn-pulse" : "",
                rotatePulse ? "is-rotate-pulse" : "",
                softDropPulse ? "is-soft-drop-pulse" : "",
              ].filter(Boolean).join(" ")}
              style={{
                left: GRID_INSET_PX + (currentPieceCol + colIndex) * blockSize,
                top: GRID_INSET_PX + (currentPieceRow + rowIndex) * blockSize,
                width: blockSize,
                height: blockSize,
                backgroundColor: getBrandColor(currentTileId),
                opacity: 0.92,
              }}
              title={getBrandTile(currentTileId)?.name || "Current brand block"}
            >
              {renderTileFace(currentTileId, true)}
            </div>
          ) : null
        ))
      )}

    </div>
  );
}

