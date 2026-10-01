import { Maximize2, Minimize2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

export default function TetrisSideDetailsPanel({
  gameStarted,
  gameOver,
  loading,
  message,
  playerName,
  score,
  linesCleared,
  onPlayerNameChange,
  onStartGame,
  onResetGame,
  isPaused,
  comboCount,
  backToBackActive,
  soundEnabled,
  isFullscreen,
  namedPlayerBestEntry,
  globalBestEntry,
  togglePauseGame,
  toggleSound,
  toggleFullscreen,
  playerNameInputRef,
  renderCompactStatsBar,
}) {
  const startState = gameStarted ? (gameOver ? "game-over" : "live") : "prestart";

  return (
    <aside className="tetris-layout-column tetris-side-details" aria-label="Game details" data-state={startState}>
      <div className="tetris-playfield-topbar">
        {renderCompactStatsBar("tetris-stats-bar tetris-stats-bar-compact")}
      </div>

      <section className={gameStarted ? "tetris-panel tetris-panel-secondary tetris-panel-recessed tetris-start-panel-compact is-live" : "tetris-panel tetris-panel-secondary tetris-panel-recessed tetris-start-panel-compact"} data-state={startState}>
        <div className="tetris-panel-heading">
          <h2 className="tetris-panel-title">Start</h2>
          <span className="tetris-panel-badge">{loading ? "Loading" : gameStarted ? "Live" : "Ready"}</span>
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
              <div className="tetris-start-secondary-row tetris-start-secondary-row-live">
                <button type="button" onClick={togglePauseGame} className="tetris-button tetris-button-secondary">
                  {isPaused ? <Play size={16} /> : <Pause size={16} />} {isPaused ? "Resume" : "Pause"}
                </button>
                <button type="button" onClick={onResetGame} className="tetris-button tetris-button-secondary">
                  <RotateCcw size={16} /> Reset
                </button>
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
              <input
                ref={playerNameInputRef}
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(event) => onPlayerNameChange(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && onStartGame()}
                disabled={gameStarted}
                className="tetris-input"
              />
              <div className="tetris-action-row">
                <button
                  type="button"
                  onClick={onStartGame}
                  disabled={loading}
                  className="tetris-button tetris-button-primary"
                >
                  Start Game
                </button>
                <button type="button" onClick={onResetGame} className="tetris-button tetris-button-secondary" disabled={!gameStarted && !gameOver && score === 0 && linesCleared === 0}>
                  <RotateCcw size={16} /> Reset
                </button>
              </div>
              <div className="tetris-session-chip-row" aria-label="Best score summary">
                <span className="tetris-session-chip is-highlighted">Best {namedPlayerBestEntry?.highestScore?.toLocaleString() || 0}</span>
                <span className="tetris-session-chip">Leader {(globalBestEntry?.highestScore || 0).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="tetris-panel tetris-panel-secondary tetris-panel-recessed tetris-utility-panel" aria-label="Game utilities" data-state="utility">
        <div className="tetris-panel-heading">
          <h2 className="tetris-panel-title">Quick toggles</h2>
          <span className="tetris-panel-badge">Game tools</span>
        </div>
        <div className="tetris-utility-actions">
          <button
            type="button"
            className={`tetris-header-action-btn tetris-utility-btn ${soundEnabled ? "is-sound-enabled" : "is-sound-disabled"}`}
            onClick={toggleSound}
            data-state={soundEnabled ? "sound-on" : "sound-off"}
            aria-label={soundEnabled ? "Mute game sound" : "Enable game sound"}
            aria-pressed={soundEnabled}
            title={soundEnabled ? "Sound on (click to mute)" : "Sound off (click to enable)"}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span>{soundEnabled ? "Sound On" : "Muted"}</span>
          </button>
          <button
            type="button"
            className="tetris-header-action-btn tetris-utility-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            <span>{isFullscreen ? "Window" : "Fullscreen"}</span>
          </button>
        </div>
      </section>
    </aside>
  );
}

