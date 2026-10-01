export default function TetrisBoardStage({
  boardFrameRef,
  boardShellClassName,
  boardShellStyle,
  isBoardFocused,
  holdPiece,
  holdPiecePreview,
  holdTileId,
  holdBrandTile,
  getPreviewGridStyle,
  getBrandColor,
  renderTileFace,
  nextQueuePreviewEntries,
  afterGridContent,
  children,
}) {
  return (
    <div className="tetris-playfield">
      <div className="tetris-playfield-layout">
        <div className="tetris-playfield-board" ref={boardFrameRef}>
          <div className={boardShellClassName} style={boardShellStyle}>
            <div className="tetris-board-chrome">
              <div>
                <p className="tetris-board-kicker">Main playfield</p>
                <h2 className="tetris-board-title">Game Board</h2>
              </div>
              <div className="tetris-board-meta" aria-label="Board details">
                <span className="tetris-board-chip">10 × 20 grid</span>
                <span className={`tetris-board-chip ${isBoardFocused ? "is-active" : ""}`}>
                  {isBoardFocused ? "Keyboard ready" : "Touch ready"}
                </span>
              </div>
            </div>

            <div className="tetris-grid-stage">
              <section className="tetris-board-side-panel tetris-board-side-panel-hold tetris-detail-panel tetris-panel tetris-panel-compact tetris-panel-subtle tetris-hud-card" aria-label="Held piece preview">
                <div className="tetris-panel-heading tetris-panel-heading-compact">
                  <h3 className="tetris-panel-title">Hold</h3>
                </div>
                <div className="tetris-next-preview tetris-next-preview-compact tetris-hud-preview is-updated">
                  {holdPiece ? (
                    <div className="tetris-mini-grid tetris-mini-grid-compact-view" style={getPreviewGridStyle(holdPiecePreview)}>
                      {holdPiecePreview.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                          <div
                            key={`inline-hold-${rowIndex}-${colIndex}`}
                            className={cell ? "tetris-mini-block active" : "tetris-mini-block"}
                            style={{ backgroundColor: cell ? getBrandColor(holdTileId) : "transparent" }}
                            title={cell ? holdBrandTile?.name || "Held brand block" : undefined}
                          >
                            {cell ? renderTileFace(holdTileId, true) : null}
                          </div>
                        ))
                      )}
                    </div>
                  ) : <p className="text-muted">Empty</p>}
                </div>
              </section>

              <div className="tetris-grid-core">
                {children}
              </div>

              {afterGridContent}

              <section className="tetris-board-side-panel tetris-board-side-panel-next tetris-detail-panel tetris-panel tetris-panel-compact tetris-panel-priority tetris-panel-featured tetris-hud-card" aria-label="Next piece preview queue">
                <div className="tetris-panel-heading tetris-panel-heading-compact">
                  <h3 className="tetris-panel-title">Next</h3>
                </div>
                <div className="tetris-next-queue" role="list" aria-label="Next three pieces">
                  {nextQueuePreviewEntries.map((entry) => (
                    <div key={entry.id} className="tetris-next-queue-slot" role="listitem">
                      <div className="tetris-next-queue-slot-meta">
                        <span className="tetris-next-queue-slot-label">#{entry.slot}</span>
                      </div>
                      <div className="tetris-next-preview tetris-next-preview-compact tetris-hud-preview is-updated">
                        {entry.piece ? (
                          <div className="tetris-mini-grid tetris-mini-grid-compact-view" style={getPreviewGridStyle(entry.preview)}>
                            {entry.preview.map((row, rowIndex) =>
                              row.map((cell, colIndex) => (
                                <div
                                  key={`inline-next-${entry.slot}-${rowIndex}-${colIndex}`}
                                  className={cell ? "tetris-mini-block active" : "tetris-mini-block"}
                                  style={{ backgroundColor: cell ? getBrandColor(entry.tileId) : "transparent" }}
                                  title={cell ? entry.brandTile?.name || "Next brand block" : undefined}
                                >
                                  {cell ? renderTileFace(entry.tileId, true) : null}
                                </div>
                              ))
                            )}
                          </div>
                        ) : (
                          <p className="text-muted">Next</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


