import { Trophy } from "lucide-react";

export function TetrisLeaderboardList({
  leaderboardLoading,
  leaderboardError,
  filteredLeaderboard,
  leaderboardTimeFilter,
  leaderboardSortBy,
  openPlayerModal,
  getMedalIcon,
  formatRelativeTime,
}) {
  return (
    <>
      {leaderboardLoading && <p className="text-muted">Loading leaderboard...</p>}
      {!leaderboardLoading && leaderboardError && <p className="text-muted">{leaderboardError}</p>}
      {!leaderboardLoading && !leaderboardError && filteredLeaderboard.length === 0 && <p className="text-muted">Play a round to create the first score.</p>}

      {!leaderboardLoading && !leaderboardError && filteredLeaderboard.length > 0 && (
        <div className="tetris-mini-leaderboard" role="table" aria-label={`Top Tetris scores - ${leaderboardTimeFilter} - sorted by ${leaderboardSortBy}`}>
          {filteredLeaderboard.map((entry, index) => (
            <button
              key={entry.id || `${entry.playerName}-${index}`}
              type="button"
              className={index < 3 ? "tetris-mini-leaderboard-row is-medal is-clickable" : "tetris-mini-leaderboard-row is-clickable"}
              role="row"
              onClick={() => openPlayerModal(entry)}
              aria-label={`View leaderboard details for ${entry.playerName || "Anonymous"}`}
            >
              <span className="tetris-mini-leaderboard-rank" role="cell">{getMedalIcon(entry.displayRank) || `#${entry.displayRank}`}</span>
              <div className="tetris-mini-leaderboard-copy">
                <span className="tetris-mini-leaderboard-player" role="cell">{entry.playerName || "Anonymous"}</span>
                <span className="tetris-mini-leaderboard-subline" role="cell">
                  {(entry.totalGames || 0)} game{entry.totalGames !== 1 ? "s" : ""} • {entry.totalLinesCleared || 0} lines • {formatRelativeTime(entry.lastPlayed)}
                </span>
              </div>
              <div className="tetris-mini-leaderboard-score-stack">
                <span className="tetris-mini-leaderboard-score" role="cell">{entry.highestScore?.toLocaleString() || 0}</span>
                <span className="tetris-mini-leaderboard-level" role="cell">L{entry.highestLevel || 1}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function TetrisLeaderboardPanel({
  leaderboardTimeFilter,
  onFilterChange,
  leaderboardLoading,
  leaderboardError,
  filteredLeaderboard,
  leaderboardSortBy,
  openPlayerModal,
  getMedalIcon,
  formatRelativeTime,
}) {
  return (
    <aside className="tetris-layout-column tetris-leaderboard-column" aria-label="Leaderboard column">
      <section className="tetris-panel tetris-panel-compact tetris-panel-featured tetris-hud-card tetris-leaderboard-embed tetris-leaderboard-panel" aria-label="Embedded Tetris leaderboard">
        <div className="tetris-panel-heading tetris-panel-heading-compact">
          <h2 className="tetris-panel-title"><Trophy size={16} /> Leaderboard</h2>
        </div>

        <div className="tetris-leaderboard-filters" role="tablist" aria-label="Leaderboard time filters">
          <button
            type="button"
            role="tab"
            aria-selected={leaderboardTimeFilter === "all"}
            className={leaderboardTimeFilter === "all" ? "tetris-filter-tab is-active" : "tetris-filter-tab"}
            onClick={() => onFilterChange("all")}
          >
            All Time
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={leaderboardTimeFilter === "week"}
            className={leaderboardTimeFilter === "week" ? "tetris-filter-tab is-active" : "tetris-filter-tab"}
            onClick={() => onFilterChange("week")}
          >
            This Week
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={leaderboardTimeFilter === "today"}
            className={leaderboardTimeFilter === "today" ? "tetris-filter-tab is-active" : "tetris-filter-tab"}
            onClick={() => onFilterChange("today")}
          >
            Today
          </button>
        </div>

        <TetrisLeaderboardList
          leaderboardLoading={leaderboardLoading}
          leaderboardError={leaderboardError}
          filteredLeaderboard={filteredLeaderboard}
          leaderboardTimeFilter={leaderboardTimeFilter}
          leaderboardSortBy={leaderboardSortBy}
          openPlayerModal={openPlayerModal}
          getMedalIcon={getMedalIcon}
          formatRelativeTime={formatRelativeTime}
        />
      </section>
    </aside>
  );
}

