import {
  Play,
  RotateCcw,
} from "lucide-react";

export default function TetrisTouchControls({
  gameStarted,
  gameOver,
  loading,
  playerName,
  onStartGame,
  onResetGame,
  canResetGame,
}) {
  const isLiveGame = gameStarted && !gameOver;
  const startButtonLabel = gameOver ? "Play Again" : "Start Game";

  // Don't show controls during active gameplay
  if (isLiveGame) return null;

  return (
    <aside
      className="tetris-touch-controls is-prestart"
      aria-label="Mobile game controls"
    >
      <div className="tetris-mobile-controls-grid">
        <section className="tetris-mobile-control-cluster" aria-label="Player setup and session controls">
          <div className="tetris-auth-summary-card" aria-label="Authenticated player">
            <span className="tetris-live-summary-label">Signed in as</span>
            <strong>{playerName || "Player"}</strong>
          </div>

          <div className="tetris-start-secondary-row">
            <button
              type="button"
              onClick={onStartGame}
              disabled={loading}
              className="tetris-button tetris-button-primary"
            >
              <Play size={16} />
              {startButtonLabel}
            </button>

            {canResetGame && (
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
      </div>
    </aside>
  );
}
