import { Volume2, VolumeX, Vibrate } from "lucide-react";
import TetrisOptionsMenu from "./TetrisOptionsMenu";

export default function TetrisSideDetailsPanel({
  gameStarted,
  gameOver,
  loading,
  message,
  playerName,
  score,
  linesCleared,
  onStartGame,
  isPaused,
  comboCount,
  backToBackActive,
  soundEnabled,
  isFullscreen,
  isMobileViewport,
  namedPlayerBestEntry,
  globalBestEntry,
  togglePauseGame,
  toggleSound,
  toggleFullscreen,
  renderCompactStatsBar,
  hapticEnabled,
  onHapticToggle,
  onOpenSettings,
  onOpenHowToPlay,
  onReset,
  onSignOut,
}) {
  const startState = gameStarted ? (gameOver ? "game-over" : "live") : "prestart";
  const playerBestScore = namedPlayerBestEntry?.highestScore || 0;
  const globalBestScore = globalBestEntry?.highestScore || 0;
  const sessionStatusLabel = gameStarted
    ? (gameOver ? "Finished" : isPaused ? "Paused" : "Running")
    : "Waiting";
  const momentumLabel = comboCount > 1
    ? `Combo x${comboCount}`
    : backToBackActive
      ? "Back-to-Back"
      : gameStarted
        ? "Building"
        : "Ready";

  return (
    <aside className="tetris-layout-column tetris-side-details" aria-label="Game details" data-state={startState}>

      <section className={gameStarted ? "tetris-panel tetris-panel-secondary tetris-panel-recessed tetris-start-panel-compact tetris-detail-panel tetris-side-details-primary is-live" : "tetris-panel tetris-panel-secondary tetris-panel-recessed tetris-start-panel-compact tetris-detail-panel tetris-side-details-primary"} data-state={startState}>
        <div className="tetris-panel-heading">
          {!isMobileViewport && (
            <TetrisOptionsMenu
              isFullscreen={isFullscreen}
              gameStarted={gameStarted}
              gameOver={gameOver}
              isPaused={isPaused}
              isMobileViewport={isMobileViewport}
              onOpenSettings={onOpenSettings}
              onOpenHowToPlay={onOpenHowToPlay}
              onReset={onReset}
              onToggleFullscreen={toggleFullscreen}
              onTogglePause={togglePauseGame}
              onSignOut={onSignOut}
            />
          )}
          <h2 className="tetris-panel-title">Game Session</h2>
          <span className="tetris-panel-badge">{loading ? "Loading" : sessionStatusLabel}</span>
        </div>
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
              <div className="tetris-auth-summary-card" aria-label="Authenticated player">
                <span className="tetris-live-summary-label">Signed in as</span>
                <strong>{playerName || "Player"}</strong>
              </div>
              <div className="tetris-action-row">
                <button
                  type="button"
                  onClick={onStartGame}
                  disabled={loading}
                  className="tetris-button tetris-button-primary"
                >
                  Start Game
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}

