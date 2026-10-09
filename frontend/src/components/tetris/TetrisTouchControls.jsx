import {
  Gift,
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
  bonusStatus,
  bonusLoading,
  onOpenBonusModal,
}) {
  const isLiveGame = gameStarted && !gameOver;
  const startButtonLabel = gameOver ? "Play Again" : "Start Game";
  const totalBonusPoints = bonusStatus?.totalBonusPoints || 0;
  const formattedBonusPoints = new Intl.NumberFormat("en-US").format(totalBonusPoints);

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

          <button
            type="button"
            className="tetris-bonus-trigger is-mobile"
            onClick={onOpenBonusModal}
            aria-label={`Open bonus points details. Current bonus points: +${formattedBonusPoints}`}
          >
            <span className="tetris-bonus-trigger-icon" aria-hidden="true">
              <Gift size={18} />
            </span>
            <span className="tetris-bonus-trigger-copy">
              <span className="tetris-bonus-trigger-label">Bonus Points</span>
              <strong>{bonusLoading ? "Checking..." : `+${formattedBonusPoints}`}</strong>
            </span>
          </button>

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
