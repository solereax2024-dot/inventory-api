import { X, Trophy } from "lucide-react";

export default function TetrisLeaderboardModal({
  isVisible,
  leaderboard,
  leaderboardLoading,
  leaderboardError,
  onClose,
  leaderboardListContent,
}) {
  if (!isVisible) return null;

  return (
    <div className="tetris-leaderboard-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tetris-leaderboard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tetris-leaderboard-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tetris-leaderboard-modal-header">
          <h2 id="tetris-leaderboard-modal-title" className="tetris-leaderboard-modal-title">
            <Trophy size={20} /> Leaderboard
          </h2>
          <button type="button" className="tetris-modal-close tetris-leaderboard-modal-close" onClick={onClose} aria-label="Close leaderboard">
            <X size={18} />
          </button>
        </div>

        <div className="tetris-leaderboard-modal-content">
          {leaderboardLoading && <p className="text-muted">Loading leaderboard...</p>}
          {!leaderboardLoading && leaderboardError && <p className="text-muted">{leaderboardError}</p>}
          {!leaderboardLoading && !leaderboardError && leaderboard.length === 0 && (
            <p className="text-muted">Play a round to create the first score.</p>
          )}
          {leaderboardListContent}
        </div>
      </div>
    </div>
  );
}

