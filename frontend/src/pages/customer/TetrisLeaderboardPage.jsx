import { useEffect, useState } from "react";
import { Trophy, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import "../../styles/tetris-leaderboard.css";

export default function TetrisLeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await apiRequest("/api/public/games/tetris/leaderboard");
      setLeaderboard(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError("Failed to load leaderboard. Please try again.");
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return null;
    }
  };

  return (
    <div className="tetris-leaderboard-container">
      <div className="tetris-leaderboard-shell">
        <header className="tetris-leaderboard-header">
          <button
            type="button"
            className="tetris-leaderboard-back-btn"
            onClick={() => navigate("/tetris-game")}
            aria-label="Back to Tetris game"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="tetris-leaderboard-title-group">
            <Trophy size={32} className="tetris-leaderboard-icon" />
            <h1>Tetris Leaderboard</h1>
          </div>
          <div style={{ width: "40px" }} />
        </header>

        <div className="tetris-leaderboard-content">
          {loading && <div className="tetris-leaderboard-loading">Loading leaderboard...</div>}

          {error && <div className="tetris-leaderboard-error">{error}</div>}

          {!loading && leaderboard.length === 0 && !error && (
            <div className="tetris-leaderboard-empty">
              <p>No scores yet. Be the first to play!</p>
            </div>
          )}

          {!loading && leaderboard.length > 0 && (
            <div className="tetris-leaderboard-table-wrapper">
              <table className="tetris-leaderboard-table">
                <thead>
                  <tr>
                    <th className="tetris-leaderboard-col-rank">Rank</th>
                    <th className="tetris-leaderboard-col-player">Player</th>
                    <th className="tetris-leaderboard-col-score">Score</th>
                    <th className="tetris-leaderboard-col-level">Level</th>
                    <th className="tetris-leaderboard-col-lines">Lines</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={entry.id || index}
                      className={`tetris-leaderboard-row ${index === 0 ? "is-top" : ""} ${index < 3 ? "is-medal" : ""}`}
                    >
                      <td className="tetris-leaderboard-col-rank">
                        <span className="tetris-leaderboard-rank-badge">
                          {getMedalIcon(index + 1) || `#${index + 1}`}
                        </span>
                      </td>
                      <td className="tetris-leaderboard-col-player">
                        <span className="tetris-leaderboard-player-name">{entry.playerName || "Anonymous"}</span>
                      </td>
                      <td className="tetris-leaderboard-col-score">
                        <span className="tetris-leaderboard-score">{entry.highestScore?.toLocaleString() || 0}</span>
                      </td>
                      <td className="tetris-leaderboard-col-level">
                        <span className="tetris-leaderboard-level">{entry.highestLevel || 1}</span>
                      </td>
                      <td className="tetris-leaderboard-col-lines">
                        <span className="tetris-leaderboard-lines">{entry.totalLinesCleared?.toLocaleString() || 0}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="tetris-leaderboard-footer">
          <button type="button" className="tetris-leaderboard-refresh-btn" onClick={fetchLeaderboard} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>
    </div>
  );
}

