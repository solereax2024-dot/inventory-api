import { createPortal } from "react-dom";
import { Award, BarChart3, CalendarDays, Clock3, Trophy, X } from "lucide-react";

function getPlayerInitial(playerName) {
  const trimmedName = `${playerName || ""}`.trim();
  return trimmedName ? trimmedName.charAt(0).toUpperCase() : "?";
}

function getRankHighlight(rank) {
  if (rank === 1) return "Global leader";
  if (rank === 2) return "Elite runner-up";
  if (rank === 3) return "Top 3 finisher";
  if (rank <= 10) return "Top 10 contender";
  return `Ranked player #${rank}`;
}

function formatAverageLines(totalLinesCleared, totalGames) {
  if (!totalGames) return "0.0";
  return (totalLinesCleared / totalGames).toFixed(totalGames >= 10 ? 1 : 2);
}

function getRankThemeClass(rank) {
  if (rank === 1) return "is-rank-gold";
  if (rank === 2) return "is-rank-silver";
  if (rank === 3) return "is-rank-bronze";
  if (rank <= 10) return "is-rank-elite";
  return "";
}

function getPlayerAchievements({ rank, totalGames, highestLevel, bestScore, totalLinesCleared }) {
  const achievements = [];

  if (rank === 1) {
    achievements.push({ label: "World Leader", tone: "gold" });
  } else if (rank <= 10) {
    achievements.push({ label: "Top 10", tone: "cyan" });
  }

  if (totalGames >= 25) {
    achievements.push({ label: "Veteran", tone: "purple" });
  }

  if (highestLevel >= 10) {
    achievements.push({ label: "High Level Run", tone: "gold" });
  }

  if (bestScore >= 10000) {
    achievements.push({ label: "Score Chaser", tone: "pink" });
  }

  if (totalLinesCleared >= 200) {
    achievements.push({ label: "Line Breaker", tone: "cyan" });
  }

  if (achievements.length === 0) {
    achievements.push({ label: "Rising Player", tone: "neutral" });
  }

  return achievements.slice(0, 4);
}

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

  const rank = activePlayerStats?.rank || selectedLeaderboardEntry.displayRank || 1;
  const playerName = activePlayerStats?.playerName || selectedLeaderboardEntry?.playerName || "Player details";
  const bestScore = activePlayerStats?.highestScore || 0;
  const highestLevel = activePlayerStats?.highestLevel || 1;
  const totalGames = activePlayerStats?.totalGames || 0;
  const totalLinesCleared = activePlayerStats?.totalLinesCleared || 0;
  const lastPlayed = activePlayerStats?.lastPlayed;
  const createdAt = activePlayerStats?.createdAt;
  const averageLinesPerRun = formatAverageLines(totalLinesCleared, totalGames);
  const rankHighlight = getRankHighlight(rank);
  const rankThemeClass = getRankThemeClass(rank);
  const achievementChips = getPlayerAchievements({ rank, totalGames, highestLevel, bestScore, totalLinesCleared });

  const modalContent = (
    <div className="tetris-player-modal-backdrop" role="presentation" onClick={onClose}>
      <div className={["tetris-player-modal", rankThemeClass].filter(Boolean).join(" ")} role="dialog" aria-modal="true" aria-labelledby="tetris-player-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="tetris-player-modal-header">
          <div>
            <p className="tetris-board-kicker">Leaderboard spotlight</p>
            <h2 id="tetris-player-modal-title">Player spotlight</h2>
          </div>
          <button type="button" className="tetris-modal-close" onClick={onClose} aria-label="Close player details">
            <X size={18} />
          </button>
        </div>

        <section className="tetris-player-modal-hero tetris-player-modal-reveal is-delay-1" aria-label="Player spotlight summary">
          <div className="tetris-player-modal-player">
            <span className="tetris-player-modal-corner-rank">#{rank}</span>
            <div className="tetris-player-modal-avatar" aria-hidden="true">{getPlayerInitial(playerName)}</div>
            <div className="tetris-player-modal-copy">
              <p className="tetris-player-modal-name">{playerName}</p>
              <div className="tetris-player-modal-rank-row">
                <span className="tetris-player-rank-badge"><Trophy size={14} /> {rankHighlight}</span>
              </div>
              <span className="tetris-player-rank-meta">Last played {formatRelativeTime(lastPlayed)}</span>
            </div>
          </div>

          <div className="tetris-player-modal-score-card" aria-label="Best score">
            <span>Personal best</span>
            <strong>{bestScore.toLocaleString()}</strong>
            <p>Top recorded run on the {leaderboardTimeFilter === "all" ? "all-time" : leaderboardTimeFilter} leaderboard.</p>
          </div>

          <div className="tetris-player-modal-microstats" aria-label="Quick stats">
            <article className="tetris-player-modal-microstat">
              <span>Highest level</span>
              <strong>L{highestLevel}</strong>
            </article>
            <article className="tetris-player-modal-microstat">
              <span>Total games</span>
              <strong>{totalGames.toLocaleString()}</strong>
            </article>
            <article className="tetris-player-modal-microstat">
              <span>Total lines</span>
              <strong>{totalLinesCleared.toLocaleString()}</strong>
            </article>
            <article className="tetris-player-modal-microstat">
              <span>Avg lines / run</span>
              <strong>{averageLinesPerRun}</strong>
            </article>
          </div>

          <div className="tetris-player-modal-achievements" aria-label="Player achievements">
            <div className="tetris-player-modal-section-heading">
              <Award size={16} />
              <span>Player achievements</span>
            </div>
            <div className="tetris-player-achievement-chips">
              {achievementChips.map((achievement) => (
                <span
                  key={`${achievement.label}-${achievement.tone}`}
                  className={["tetris-player-achievement-chip", `is-${achievement.tone}`].join(" ")}
                >
                  {achievement.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="tetris-player-modal-section tetris-player-modal-reveal is-delay-2" aria-label="Player activity details">
          <div className="tetris-player-modal-section-heading">
            <BarChart3 size={16} />
            <span>Activity snapshot</span>
          </div>
          <div className="tetris-player-modal-detail-list">
            <article className="tetris-player-modal-detail">
              <div className="tetris-player-modal-detail-icon"><CalendarDays size={16} /></div>
              <div>
                <span className="tetris-player-modal-detail-label">Joined leaderboard</span>
                <strong className="tetris-player-modal-detail-value">{formatDateTime(createdAt)}</strong>
              </div>
            </article>
            <article className="tetris-player-modal-detail">
              <div className="tetris-player-modal-detail-icon"><Clock3 size={16} /></div>
              <div>
                <span className="tetris-player-modal-detail-label">Latest session</span>
                <strong className="tetris-player-modal-detail-value">{formatDateTime(lastPlayed)}</strong>
              </div>
            </article>
          </div>
        </section>

        {playerStatsLoading && <p className="tetris-player-modal-banner tetris-player-modal-reveal is-delay-3">Refreshing player details…</p>}
        {!playerStatsLoading && playerStatsError && <p className="tetris-player-modal-banner is-warning tetris-player-modal-reveal is-delay-3">{playerStatsError}</p>}
      </div>
    </div>
  );

  if (typeof document === "undefined") return modalContent;

  return createPortal(modalContent, document.body);
}


