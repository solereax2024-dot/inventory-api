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
  playerNoticeCount,
  onOpenPlayerNotices,
}) {
  const isLiveGame = gameStarted && !gameOver;
  const mobileStateClassName = isLiveGame ? "is-gameplay" : gameOver ? "is-postgame" : "is-prestart";
  const startButtonLabel = gameOver ? "Play Again" : "Start Game";
  const totalBonusPoints = bonusStatus?.totalBonusPoints || 0;
  const formattedBonusPoints = new Intl.NumberFormat("en-US").format(totalBonusPoints);

  return (
    <aside
      className={`tetris-touch-controls ${mobileStateClassName}`}
      aria-label={isLiveGame ? "Mobile bonus controls" : "Mobile game controls"}
    >
      <div className="tetris-mobile-controls-grid">
        <section className="tetris-mobile-control-cluster" aria-label={isLiveGame ? "Bonus controls" : "Player setup and session controls"}>
          {!isLiveGame && (
            <>
              <div className="tetris-auth-summary-card" aria-label="Authenticated player">
                <span className="tetris-live-summary-label">Signed in as</span>
                <strong>{playerName || "Player"}</strong>
              </div>
            </>
          )}

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

          {!isLiveGame && (
            <div className="tetris-start-secondary-row">
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
          )}

        </section>
      </div>

      {!isLiveGame && (
        <div className="tetris-mobile-sticky-cta" role="complementary" aria-label="Quick game action">
          <button
            type="button"
            onClick={onStartGame}
            disabled={loading}
            className="tetris-button tetris-button-primary tetris-start-game-button tetris-mobile-sticky-cta-btn"
          >
            <Play size={16} aria-hidden="true" />
            {startButtonLabel}
          </button>
        </div>
      )}
    </aside>
  );
}
