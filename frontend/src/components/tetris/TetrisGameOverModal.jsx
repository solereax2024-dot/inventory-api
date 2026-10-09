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
            className="tetris-modal-close tetris-game-over-close-btn"
            aria-label="Close game over modal"
            title="Close"
          >
            <X size={18} />
          </button>
        )}
        <div className="tetris-game-over-content">
          <h2 id="tetris-game-over-title">Game Over</h2>
          <div className="tetris-game-over-primary-stat">
            <span>Score</span>
            <strong>{finalScore.toLocaleString()}</strong>
          </div>
          {isNewBest && <span className="tetris-game-over-highlight">New best run</span>}
          <div className="tetris-game-over-stats-compact">
            <div className="tetris-game-over-stat-compact">
              <span>Lines</span>
              <strong>{linesCleared}</strong>
            </div>
            {hasValidRank && (
              <div className="tetris-game-over-stat-compact">
                <span>Rank</span>
                <strong>#{playerRank}</strong>
              </div>
            )}
          </div>
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

