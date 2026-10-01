import { X } from "lucide-react";

export default function TetrisPlayerDetailsModal({
  selectedLeaderboardEntry,
  activePlayerStats,
  formatRelativeTime,
  formatDateTime,
  leaderboardTimeFilter,
  playerStatsLoading,
  playerStatsError,
  onClose,
}) {
  if (!selectedLeaderboardEntry) return null;

  return (
    <div className="tetris-player-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="tetris-player-modal" role="dialog" aria-modal="true" aria-labelledby="tetris-player-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="tetris-player-modal-header">
          <div>
            <p className="tetris-board-kicker">Leaderboard spotlight</p>
            <h2 id="tetris-player-modal-title">{activePlayerStats?.playerName || "Player details"}</h2>
          </div>
          <button type="button" className="tetris-modal-close" onClick={onClose} aria-label="Close player details">
            <X size={18} />
          </button>
        </div>

        <div className="tetris-player-modal-rank-row">
          <span className="tetris-player-rank-pill">#{activePlayerStats?.rank || selectedLeaderboardEntry.displayRank || 1}</span>
          <span className="tetris-player-rank-meta">Last played {formatRelativeTime(activePlayerStats?.lastPlayed)}</span>
        </div>

        <div className="tetris-player-modal-grid">
          <article className="tetris-player-modal-stat">
            <span>Best score</span>
            <strong>{activePlayerStats?.highestScore?.toLocaleString() || 0}</strong>
          </article>
          <article className="tetris-player-modal-stat">
            <span>Highest level</span>
            <strong>L{activePlayerStats?.highestLevel || 1}</strong>
          </article>
          <article className="tetris-player-modal-stat">
            <span>Total games</span>
            <strong>{activePlayerStats?.totalGames || 0}</strong>
          </article>
          <article className="tetris-player-modal-stat">
            <span>Total lines</span>
            <strong>{activePlayerStats?.totalLinesCleared || 0}</strong>
          </article>
        </div>

        <div className="tetris-player-modal-notes">
          <p><strong>Joined:</strong> {formatDateTime(activePlayerStats?.createdAt)}</p>
          <p><strong>Latest session:</strong> {formatDateTime(activePlayerStats?.lastPlayed)}</p>
          <p><strong>Leaderboard scope:</strong> {leaderboardTimeFilter === "all" ? "All recorded runs" : `Filtered to ${leaderboardTimeFilter}`}</p>
        </div>

        {playerStatsLoading && <p className="text-muted">Refreshing player details…</p>}
        {!playerStatsLoading && playerStatsError && <p className="text-muted">{playerStatsError}</p>}
      </div>
    </div>
  );
}


