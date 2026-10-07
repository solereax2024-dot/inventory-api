import { RotateCcw, Trophy, X } from "lucide-react";

/**
 * TetrisGameOverModal Component
 *
 * Modal shown when game is over
 *
 * Props:
 * - isVisible (boolean): Whether modal is visible
 * - playerName (string): Player name
 * - finalScore (number): Final score
 * - bestScore (number): Best score
 * - finalLevel (number): Final level
 * - linesCleared (number): Total lines cleared
 * - playerRank (number): Player's rank (if available)
 * - onPlayAgain (function): Callback to play again
 * - onOpenLeaderboard (function): Callback to open leaderboard
 * - onClose (function): Callback to close modal
 */
export default function TetrisGameOverModal({
  isVisible,
  playerName,
  finalScore,
  bestScore,
  finalLevel,
  linesCleared,
  playerRank,
  onPlayAgain,
  onOpenLeaderboard,
  onClose,
}) {
  if (!isVisible) return null;

  // Only show rank if it's a valid positive number
  const hasValidRank = typeof playerRank === 'number' && playerRank > 0 && isFinite(playerRank);
  const isNewBest = finalScore >= bestScore && finalScore > 0;

  return (
    <div className="tetris-game-over-overlay" role="dialog" aria-modal="true" aria-labelledby="tetris-game-over-title">
      <div className="tetris-game-over-layout">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="tetris-game-over-close-btn"
            aria-label="Close game over modal"
            title="Close"
          >
            <X size={20} />
          </button>
        )}
        <div className="tetris-game-over-content">
          <p className="tetris-game-over-kicker">Run complete</p>
          <h2 id="tetris-game-over-title">Game Over</h2>
          <div className="tetris-game-over-player">
            <p className="tetris-game-over-label">Player</p>
            <p className="tetris-game-over-value">{playerName || "Guest"}</p>
            {isNewBest && <span className="tetris-game-over-highlight">New best run</span>}
          </div>
          <div className="tetris-game-over-stats">
            <div className="tetris-game-over-stat">
              <span>Final Score</span>
              <strong>{finalScore.toLocaleString()}</strong>
            </div>
            <div className="tetris-game-over-stat">
              <span>Best Score</span>
              <strong>{bestScore.toLocaleString()}</strong>
            </div>
            <div className="tetris-game-over-stat">
              <span>Level</span>
              <strong>{finalLevel}</strong>
            </div>
            <div className="tetris-game-over-stat">
              <span>Lines</span>
              <strong>{linesCleared}</strong>
            </div>
          </div>
          {hasValidRank && (
            <div className="tetris-game-over-rank">
              <p className="tetris-game-over-label">🏆 Leaderboard Rank</p>
              <p className="tetris-game-over-value">#{playerRank}</p>
            </div>
          )}
          <div className="tetris-game-over-actions">
            <button
              type="button"
              onClick={onPlayAgain}
              className="tetris-restart-btn tetris-button-primary"
            >
              <RotateCcw size={16} /> Play Again
            </button>
            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="tetris-button tetris-button-secondary"
              >
                <Trophy size={16} /> Leaderboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

