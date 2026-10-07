import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronsDown,
  Hand,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react";

export default function TetrisTouchControls({
  gameStarted,
  gameOver,
  loading,
  playerName,
  onPlayerNameChange,
  playerNameInputRef,
  onStartGame,
  onResetGame,
  isPaused,
  togglePauseGame,
  onMoveLeft,
  onMoveRight,
  onRotateCw,
  onSoftDrop,
  onHardDrop,
  onHoldPiece,
  canResetGame,
}) {
  const isLiveGame = gameStarted && !gameOver;
  const startButtonLabel = gameOver ? "Play Again" : "Start Game";

  return (
    <aside
      className={[
        "tetris-touch-controls",
        isLiveGame ? "is-gameplay" : "is-prestart",
      ].filter(Boolean).join(" ")}
      aria-label="Mobile game controls"
    >
      <div className="tetris-mobile-controls-grid">
        <section className="tetris-mobile-control-cluster" aria-label="Player setup and session controls">
          <div className="tetris-mobile-control-cluster-header">
            <span className="tetris-mobile-control-cluster-title">Player</span>
            <span className="tetris-session-chip is-highlighted">
              {gameOver ? "Game over" : isLiveGame ? "Live" : "Ready"}
            </span>
          </div>

          {isLiveGame ? (
            <div className="tetris-live-summary" aria-label="Current session summary">
              <div className="tetris-live-summary-item">
                <span className="tetris-live-summary-label">Player</span>
                <strong>{playerName || "Guest"}</strong>
              </div>
              <div className="tetris-live-summary-item">
                <span className="tetris-live-summary-label">Session</span>
                <strong>Running</strong>
              </div>
            </div>
          ) : (
            <div className="tetris-start-primary-row">
              <input
                ref={playerNameInputRef}
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(event) => onPlayerNameChange(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && onStartGame()}
                disabled={loading}
                className="tetris-input"
                aria-label="Player name"
              />
            </div>
          )}

           <div className="tetris-start-secondary-row tetris-start-secondary-row-live">
             {!isLiveGame && (
               <button
                 type="button"
                 onClick={onStartGame}
                 disabled={loading}
                 className="tetris-button tetris-button-primary"
               >
                 <Play size={16} />
                 {startButtonLabel}
               </button>
             )}

             {canResetGame && !isLiveGame && (
               <button
                 type="button"
                 onClick={onResetGame}
                 className="tetris-button tetris-button-secondary"
               >
                 <RotateCcw size={16} /> Reset
               </button>
             )}
           </div>
        </section>

        {isLiveGame && (
          <section className="tetris-mobile-control-cluster" aria-label="Game controls">
            <div className="tetris-control-row tetris-control-row-main-1">
              <button
                type="button"
                className="tetris-control-btn tetris-control-btn-move"
                onClick={onMoveLeft}
                disabled={!isLiveGame}
                aria-label="Move piece left"
                title="Move left"
              >
                <ArrowLeft size={16} />
                <span className="tetris-control-label">Left</span>
              </button>
              <button
                type="button"
                className="tetris-control-btn tetris-control-btn-rotate"
                onClick={onRotateCw}
                disabled={!isLiveGame}
                aria-label="Rotate piece clockwise"
                title="Rotate clockwise"
              >
                <RotateCw size={16} />
                <span className="tetris-control-label">CW</span>
              </button>
              <button
                type="button"
                className="tetris-control-btn tetris-control-btn-move"
                onClick={onMoveRight}
                disabled={!isLiveGame}
                aria-label="Move piece right"
                title="Move right"
              >
                <ArrowRight size={16} />
                <span className="tetris-control-label">Right</span>
              </button>
            </div>

            <div className="tetris-control-row tetris-control-row-main-2">
              <button
                type="button"
                className="tetris-control-btn tetris-control-btn-hold"
                onClick={onHoldPiece}
                disabled={!isLiveGame}
                aria-label="Hold current piece"
                title="Hold"
              >
                <Hand size={16} />
                <span className="tetris-control-label">Hold</span>
              </button>
              <button
                type="button"
                className="tetris-control-btn tetris-control-btn-drop"
                onClick={onSoftDrop}
                disabled={!isLiveGame}
                aria-label="Soft drop piece"
                title="Soft drop"
              >
                <ChevronDown size={16} />
                <span className="tetris-control-label">Drop</span>
              </button>
              <button
                type="button"
                className="tetris-control-btn tetris-control-btn-hard-drop"
                onClick={onHardDrop}
                disabled={!isLiveGame}
                aria-label="Hard drop piece"
                title="Hard drop"
              >
                <ChevronsDown size={16} />
                <span className="tetris-control-label">Hard Drop</span>
              </button>
            </div>

             <div className="tetris-control-row tetris-control-row-main-3">
               {/* Pause button hidden on mobile */}
             </div>
          </section>
        )}
      </div>
    </aside>
  );
}
