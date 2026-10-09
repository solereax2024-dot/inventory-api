import { isMobile } from "../../utils/deviceDetection";

export default function TetrisHeader({
  gameStarted,
  gameOver,
  soundEnabled,
  isFullscreen,
  onToggleSound,
  onToggleFullscreen,
  playerName,
}) {
  // Show mobile header with username during gameplay
  const isLiveGame = gameStarted && !gameOver;
  const isMobileView = isMobile();

  if (!isMobileView || !isLiveGame) {
    return null;
  }

  return (
    <header className="tetris-header is-live">
      <div className="tetris-header-copy">
        <span className="tetris-header-username">{playerName || "Player"}</span>
      </div>
    </header>
  );
}



