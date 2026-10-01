import { ArrowBigDown, ArrowLeft, ArrowRight, Pause, Play, RotateCcw, RotateCw } from "lucide-react";

export default function TetrisMobileControls({
  className,
  isMobileGameplayActive,
  gameStarted,
  gameOver,
  isPaused,
  canHoldPiece,
  openStartModal,
  movePieceHorizontal,
  rotateCurrentPiece,
  softDropCurrentPiece,
  hardDropCurrentPiece,
  holdCurrentPiece,
  togglePauseGame,
  resetGame,
}) {
  return (
    <div className={className} data-state={isMobileGameplayActive ? "gameplay" : "prestart"}>
      {!isMobileGameplayActive && (
        <section className="tetris-mobile-start-panel tetris-mobile-start-panel-minimal" aria-label="Mobile pre-game panel">
          <button type="button" className="tetris-control-btn tetris-control-btn-primary tetris-mobile-start-trigger" onClick={openStartModal}>
            <Play size={18} /> <span className="tetris-control-label">{gameOver ? "Play Again" : "Play"}</span>
          </button>
        </section>
      )}

      {isMobileGameplayActive && (
        <div className="tetris-mobile-controls-grid" aria-label="Gameplay touch controls">
          <section className="tetris-mobile-control-cluster" aria-label="Movement controls">
            <div className="tetris-mobile-control-cluster-header">
              <span className="tetris-mobile-control-cluster-title">Move</span>
            </div>
            <div className="tetris-control-row tetris-control-row-move">
              <button type="button" className="tetris-control-btn tetris-control-btn-move" aria-label="Move left" onClick={() => movePieceHorizontal(-1)} disabled={!gameStarted || gameOver}>
                <ArrowLeft size={18} /> <span className="tetris-control-label">Left</span>
              </button>
              <button type="button" className="tetris-control-btn tetris-control-btn-rotate" aria-label="Rotate piece" onClick={rotateCurrentPiece} disabled={!gameStarted || gameOver}>
                <RotateCw size={18} /> <span className="tetris-control-label">Rotate</span>
              </button>
              <button type="button" className="tetris-control-btn tetris-control-btn-move" aria-label="Move right" onClick={() => movePieceHorizontal(1)} disabled={!gameStarted || gameOver}>
                <span className="tetris-control-label">Right</span> <ArrowRight size={18} />
              </button>
            </div>
          </section>

          <section className="tetris-mobile-control-cluster" aria-label="Drop controls">
            <div className="tetris-mobile-control-cluster-header">
              <span className="tetris-mobile-control-cluster-title">Drop</span>
            </div>
            <div className="tetris-control-row tetris-control-row-drop">
              <button type="button" className="tetris-control-btn tetris-control-btn-secondary tetris-control-btn-drop" aria-label="Soft drop" onClick={softDropCurrentPiece} disabled={!gameStarted || gameOver}>
                <ArrowBigDown size={18} /> <span className="tetris-control-label">Soft Drop</span>
              </button>
              <button type="button" className="tetris-control-btn tetris-control-btn-primary tetris-control-btn-hard-drop" aria-label="Hard drop" onClick={hardDropCurrentPiece} disabled={!gameStarted || gameOver}>
                <span className="tetris-control-label">Hard Drop</span>
              </button>
            </div>
          </section>

          <section className="tetris-mobile-control-cluster" aria-label="Utility controls">
            <div className="tetris-mobile-control-cluster-header">
              <span className="tetris-mobile-control-cluster-title">Actions</span>
            </div>
            <div className="tetris-control-row tetris-control-row-actions">
              <button type="button" className="tetris-control-btn tetris-control-btn-secondary tetris-control-btn-hold" aria-label="Hold piece" onClick={holdCurrentPiece} disabled={!gameStarted || gameOver || !canHoldPiece}>
                <span className="tetris-control-label">Hold</span>
              </button>
              <button type="button" className={`tetris-control-btn tetris-control-btn-secondary tetris-control-btn-pause ${isPaused ? "is-paused" : ""}`} aria-label={isPaused ? "Resume game" : "Pause game"} onClick={togglePauseGame} disabled={!gameStarted || gameOver}>
                {isPaused ? <Play size={18} /> : <Pause size={18} />} <span className="tetris-control-label">{isPaused ? "Resume" : "Pause"}</span>
              </button>
              <button type="button" className="tetris-control-btn tetris-control-btn-secondary" aria-label="Reset game" onClick={resetGame} disabled={!gameStarted || gameOver}>
                <RotateCcw size={18} /> <span className="tetris-control-label">Reset</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

