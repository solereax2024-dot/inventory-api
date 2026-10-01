import { X } from "lucide-react";

export default function TetrisMobileLeaderboardModal({
  isVisible,
  onClose,
  leaderboardListContent,
}) {
  if (!isVisible) return null;

  return (
    <div className="tetris-mobile-leaderboard-backdrop" role="presentation" onClick={onClose}>
      <div className="tetris-mobile-leaderboard-panel" role="dialog" aria-modal="true" aria-labelledby="tetris-mobile-leaderboard-title" onClick={(event) => event.stopPropagation()}>
        <div className="tetris-mobile-leaderboard-header">
          <div>
            <p className="tetris-board-kicker">Mobile view</p>
            <h2 id="tetris-mobile-leaderboard-title">Leaderboard</h2>
          </div>
          <button type="button" className="tetris-modal-close tetris-mobile-leaderboard-close" onClick={onClose} aria-label="Close leaderboard">
            <X size={18} />
          </button>
        </div>

        {leaderboardListContent}
      </div>
    </div>
  );
}

