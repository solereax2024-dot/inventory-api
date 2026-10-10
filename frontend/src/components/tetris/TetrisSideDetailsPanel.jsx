import TetrisOptionsMenu from "./TetrisOptionsMenu";
import { Gift, Play } from "lucide-react";
import TetrisPlayerNotificationsMenu from "./TetrisPlayerNotificationsMenu";

export default function TetrisSideDetailsPanel({
  gameStarted,
  gameOver,
  loading,
  message,
  playerName,
  onStartGame,
  isPaused,
  comboCount,
  backToBackActive,
  isFullscreen,
  isMobileViewport,
  togglePauseGame,
  toggleFullscreen,
  onOpenSettings,
  onOpenHowToPlay,
  onOpenProfileUpdate,
  onOpenPlayerNotices,
  onReset,
  onSignOut,
  bonusStatus,
  bonusLoading,
  onOpenBonusModal,
  playerNotices,
  unreadNoticeCount,
}) {
  const startState = gameStarted ? (gameOver ? "game-over" : "live") : "prestart";
  const sessionStatusLabel = gameStarted
    ? (gameOver ? "Finished" : isPaused ? "Paused" : "Running")
    : "Waiting";
  const totalBonusPoints = bonusStatus?.totalBonusPoints || 0;
  const formattedBonusPoints = new Intl.NumberFormat("en-US").format(totalBonusPoints);
  return (
    <aside className="tetris-layout-column tetris-side-details" aria-label="Game details" data-state={startState}>

      <section className={gameStarted ? "tetris-panel tetris-panel-secondary tetris-panel-recessed tetris-start-panel-compact tetris-detail-panel tetris-side-details-primary is-live" : "tetris-panel tetris-panel-secondary tetris-panel-recessed tetris-start-panel-compact tetris-detail-panel tetris-side-details-primary"} data-state={startState}>
        <div className="tetris-panel-heading tetris-panel-heading-compact">
          {!isMobileViewport && (
            <TetrisOptionsMenu
              isFullscreen={isFullscreen}
              gameStarted={gameStarted}
              gameOver={gameOver}
              isPaused={isPaused}
              isMobileViewport={isMobileViewport}
              onOpenSettings={onOpenSettings}
              onOpenHowToPlay={onOpenHowToPlay}
              onOpenProfileUpdate={onOpenProfileUpdate}
              onOpenPlayerNotices={onOpenPlayerNotices}
              onReset={onReset}
              onToggleFullscreen={toggleFullscreen}
              onTogglePause={togglePauseGame}
              onSignOut={onSignOut}
              unreadNoticeCount={unreadNoticeCount}
            />
          )}
          <h2 className="tetris-panel-title">Game Session</h2>
          <span className="tetris-panel-badge">{loading ? "Loading" : sessionStatusLabel}</span>
        </div>
        <TetrisPlayerNotificationsMenu
          notices={playerNotices}
          onOpenPlayerNotices={onOpenPlayerNotices}
        />
        <p className="tetris-session-note" aria-live="polite">{message}</p>
        <div className="tetris-input-group">
          {gameStarted ? (
            <>
              <div className="tetris-live-summary" aria-label="Current session summary">
                <div className="tetris-live-summary-item">
                  <span className="tetris-live-summary-label">Player</span>
                  <strong>{playerName || "Guest"}</strong>
                </div>
                <div className="tetris-live-summary-item">
                  <span className="tetris-live-summary-label">Session</span>
                  <strong>{gameOver ? "Finished" : "Running"}</strong>
                </div>
              </div>
              {(comboCount > 1 || backToBackActive) && (
                <div className="tetris-session-chip-row" aria-label="Live momentum">
                  {comboCount > 1 && <span className="tetris-session-chip is-highlighted">Combo x{comboCount}</span>}
                  {backToBackActive && <span className="tetris-session-chip is-live">Back-to-Back</span>}
                </div>
              )}
            </>
          ) : (
            <div className="tetris-start-primary-row">
              <div className="tetris-start-profile-row">
                <div className="tetris-auth-summary-card" aria-label="Authenticated player">
                  <span className="tetris-live-summary-label">Signed in as</span>
                  <strong>{playerName || "Player"}</strong>
                </div>
              </div>
              <button
                type="button"
                className="tetris-bonus-trigger"
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
              <div className="tetris-start-hero-card" aria-label="Start game call to action">
                <div className="tetris-start-hero-copy">
                  <span className="tetris-start-hero-eyebrow">Ready to play?</span>
                  <strong className="tetris-start-hero-title">Start your run</strong>
                  <p className="tetris-start-hero-text">Jump in now and chase the top spot on the leaderboard.</p>
                </div>
                <div className="tetris-action-row tetris-start-hero-actions">
                  <button
                    type="button"
                    onClick={onStartGame}
                    disabled={loading}
                    className="tetris-button tetris-button-primary tetris-start-game-button"
                  >
                    <Play size={16} aria-hidden="true" />
                    Start Game
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

    </aside>
  );
}

