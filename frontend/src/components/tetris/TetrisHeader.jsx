import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";

export default function TetrisHeader({
  gameStarted,
  gameOver,
  soundEnabled,
  isFullscreen,
  onToggleSound,
  onToggleFullscreen,
}) {
  return (
    <header className={gameStarted && !gameOver ? "tetris-header is-live" : "tetris-header"}>
      <div className="tetris-header-copy">
        <p className="tetris-header-kicker">Arcade brand challenge</p>
        <h1>Brand Tetris</h1>
        <p className="tetris-header-subtitle">Stack sneaker brands, clear lines, and chase the top spot on the leaderboard.</p>
      </div>
      <div className="tetris-header-actions" aria-label="Game utilities">
        <button
          type="button"
          className="tetris-header-action-btn"
          onClick={onToggleSound}
          aria-label={soundEnabled ? "Mute game sound" : "Enable game sound"}
          title={soundEnabled ? "Sound on" : "Sound off"}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span>{soundEnabled ? "Sound" : "Muted"}</span>
        </button>
        <button
          type="button"
          className="tetris-header-action-btn"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          <span>{isFullscreen ? "Window" : "Focus"}</span>
        </button>
      </div>
    </header>
  );
}
