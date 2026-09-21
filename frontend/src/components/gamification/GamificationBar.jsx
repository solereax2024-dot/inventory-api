import { useState, useEffect } from "react";
import { apiRequest } from "../../utils/api";
import "./GamificationBar.css";

export function GamificationBar() {
  const [username, setUsername] = useState(() => localStorage.getItem("customerUsername") || "");
  const [profile, setProfile] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showUsernameInput, setShowUsernameInput] = useState(!username);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSetUsername = async (newUsername) => {
    const trimmed = (newUsername || "").trim();

    if (!trimmed) {
      setError("Username cannot be empty");
      return;
    }

    if (trimmed.length < 3 || trimmed.length > 30) {
      setError("Username must be 3-30 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Call the new set-username endpoint for unique validation
      const data = await apiRequest(`/api/public/gamification/set-username?username=${trimmed}`, {
        method: "POST"
      });

      localStorage.setItem("customerUsername", trimmed);
      setUsername(trimmed);
      setInputValue("");
      setShowUsernameInput(false);
      setProfile(data);
    } catch (err) {
      setError(err.response?.data?.error || "Username already taken! Choose another one.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfile = async (user) => {
    try {
      const data = await apiRequest(`/api/public/gamification/profile?username=${user}`);
      setProfile(data);
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  useEffect(() => {
    if (username) {
      loadProfile(username);
    }
  }, []);

  if (!username || showUsernameInput) {
    return (
      <div className="gamification-bar">
        <button className="username-setup-btn" onClick={() => setShowUsernameInput(true)}>
          🎮 Set Username
        </button>
        {showUsernameInput && (
          <div className="username-modal">
            <input
              type="text"
              placeholder="Enter your username (3-30 chars)"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError("");
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleSetUsername(inputValue);
                }
              }}
              disabled={isLoading}
              autoFocus
            />
            <button
              onClick={() => handleSetUsername(inputValue)}
              disabled={isLoading}
            >
              {isLoading ? "..." : "Save"}
            </button>
            {error && <div className="username-error">{error}</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="gamification-bar">
      <button className="gamification-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span>⭐ {profile?.pointsBalance || 0} pts</span>
        <span className="badge-count">🏅 {profile?.unlockedBadgesCount || 0}</span>
      </button>

      {isOpen && profile && (
        <div className="gamification-panel">
          <div className="panel-header">
            <h3>🎮 {profile.username}</h3>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <div className="panel-content">
            <div className="stats-grid">
              <div className="stat">
                <div className="stat-value">{profile.pointsBalance}</div>
                <div className="stat-label">Points</div>
              </div>
              <div className="stat">
                <div className="stat-value">{profile.purchasesCount}</div>
                <div className="stat-label">Purchases</div>
              </div>
              <div className="stat">
                <div className="stat-value">{profile.reviewsCount}</div>
                <div className="stat-label">Reviews</div>
              </div>
              <div className="stat">
                <div className="stat-value">{profile.referralsCount}</div>
                <div className="stat-label">Referrals</div>
              </div>
            </div>

            <div className="badges-section">
              <h4>Badges ({profile.unlockedBadgesCount}/{profile.badges?.length || 0})</h4>
              <div className="badges-grid">
                {profile.badges?.map((badge) => (
                  <div key={badge.id} className={`badge-item ${badge.earned ? "earned" : "locked"}`}>
                    <div className="badge-icon">{badge.iconEmoji}</div>
                    <div className="badge-name">{badge.name}</div>
                    {badge.earned && <div className="earned-badge">✓</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

