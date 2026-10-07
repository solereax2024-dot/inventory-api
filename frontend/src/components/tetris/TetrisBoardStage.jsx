export default function TetrisBoardStage({
  boardFrameRef,
  boardShellStyle,
  boardTopStatsBar,
  holdPiece,
  holdPiecePreview,
  holdTileId,
  holdBrandTile,
  getBrandColor,
  renderTileFace,
  nextQueuePreviewEntries,
  afterGridContent,
  children,
}) {
  const renderPreviewPiece = (matrix, tileId, title, emptyLabel = "Empty") => {
    const rotateClockwise = (m) => m[0].map((_, colIndex) => m.map((row) => row[colIndex]).reverse());

    const rotateForPreview = (m) => {
      // Check if it's a horizontal I piece: 1 row, 4 columns
      if (m.length === 1 && m[0].length === 4) {
        // Rotate to vertical: [[1], [1], [1], [1]]
        return m[0].map(cell => [cell]);
      }

      const isTShape = m.length === 2 && m[0].length === 3 && m[0][1] === 1 && m[1][0] === 1 && m[1][1] === 1 && m[1][2] === 1;
      const isZShape = m.length === 2 && m[0].length === 3 && m[0][0] === 1 && m[0][1] === 1 && m[1][1] === 1 && m[1][2] === 1;

      if (isTShape || isZShape) {
        // Rotate T sideways and Z upright for hold/next previews
        return rotateClockwise(m);
      }

      // Check if it's a horizontal S piece (2 rows, 3 columns)
      if (m.length === 2 && m[0].length === 3) {
        // These can stay as-is, they fit fine
        return m;
      }
      return m;
    };

    const displayMatrix = rotateForPreview(matrix);
    const rowCount2 = displayMatrix.length || 1;
    const columnCount = Math.max(1, ...displayMatrix.map((row) => row.length || 0));
    const hasActiveCells = matrix.some((row) => row.some(Boolean));

    if (!hasActiveCells) {
      return <p className="text-muted">{emptyLabel}</p>;
    }

    return (
      <div
        className="tetris-mini-preview-board"
        style={{
          width: `calc(${columnCount} * var(--tetris-mini-block-size))`,
          height: `calc(${rowCount2} * var(--tetris-mini-block-size))`,
        }}
      >
        {displayMatrix.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            cell ? (
              <div
                key={`${title || "preview"}-${rowIndex}-${colIndex}`}
                className="tetris-block tetris-mini-block-preview"
                style={{
                  left: `calc(${colIndex} * var(--tetris-mini-block-size))`,
                  top: `calc(${rowIndex} * var(--tetris-mini-block-size))`,
                  width: "var(--tetris-mini-block-size)",
                  height: "var(--tetris-mini-block-size)",
                  backgroundColor: getBrandColor(tileId),
                }}
                title={title}
              >
                {renderTileFace(tileId, true)}
              </div>
            ) : null
          ))
        )}
      </div>
    );
  };

  return (
    <div ref={boardFrameRef} className="tetris-board-shell tetris-board-shell-unified" style={boardShellStyle}>
      {/* HOLD PANEL - Left Side */}
      <section className="tetris-board-side-panel tetris-board-side-panel-hold tetris-detail-panel tetris-panel tetris-panel-compact tetris-panel-priority tetris-panel-featured tetris-hud-card" aria-label="Held piece preview">
        <div className="tetris-panel-heading tetris-panel-heading-compact">
          <h3 className="tetris-panel-title">Hold</h3>
        </div>
        <div className="tetris-board-side-panel-body tetris-board-side-panel-body-single">
          <div className="tetris-board-side-panel-slot">
             <div className="tetris-next-preview tetris-next-preview-compact tetris-hud-preview is-updated">
               {holdPiece
                 ? renderPreviewPiece(holdPiecePreview, holdTileId, holdBrandTile?.name || "Held brand block")
                 : null}
             </div>
          </div>
        </div>
      </section>

      {/* BOARD - Center */}
      <div className="tetris-board-center">
        {boardTopStatsBar}
        {children}
        {afterGridContent}
      </div>

      {/* NEXT PANEL - Right Side */}
      <section className="tetris-board-side-panel tetris-board-side-panel-next tetris-detail-panel tetris-panel tetris-panel-compact tetris-panel-priority tetris-panel-featured tetris-hud-card" aria-label="Next piece preview queue">
        <div className="tetris-panel-heading tetris-panel-heading-compact">
          <h3 className="tetris-panel-title">Next</h3>
        </div>
        <div className="tetris-next-queue tetris-board-side-panel-body" role="list" aria-label="Next three pieces">
          {nextQueuePreviewEntries.map((entry) => (
            <div key={entry.id} className="tetris-next-queue-slot tetris-board-side-panel-slot" role="listitem">
              <div className="tetris-next-preview tetris-next-preview-compact tetris-hud-preview is-updated">
                {entry.piece
                  ? renderPreviewPiece(entry.preview, entry.tileId, entry.brandTile?.name || "Next brand block", "Next")
                  : <p className="text-muted">Next</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


