import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronsDown,
  Hand,
  Play,
  RotateCcw,
  RotateCw,
  HelpCircle,
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
  onOpenHowToPlay,
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
            <span className="tetris-mobile-control-cluster-title">Brand Tetris</span>
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

           <div className="tetris-start-tertiary-row">
             <button
               type="button"
               onClick={onOpenHowToPlay}
               className="tetris-button tetris-button-outline"
               aria-label="Open how to play guide"
               title="How to Play"
             >
               <HelpCircle size={16} />
               How to Play
             </button>
           </div>
        </section>
      </div>
    </aside>
  );
}
