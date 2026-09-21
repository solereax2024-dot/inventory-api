import { useState } from "react";
import { apiRequest } from "../../utils/api";
import "./CheckPointsWidget.css";

export function CheckPointsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await apiRequest(`/api/public/gamification/profile?username=${username}`);
      setProfile(data);
    } catch (err) {
      setError("Username not found. Try spinning the wheel first!");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleCheck();
    }
  };

  const resetForm = () => {
    setUsername("");
    setProfile(null);
    setError("");
  };

  const closeModal = () => {
    resetForm();
    setIsOpen(false);
  };

  return (
    <>
      <button className="check-points-btn" onClick={() => setIsOpen(true)}>
        💎 Check Your Points
      </button>

      {isOpen && (
        <div className="check-points-backdrop" onClick={closeModal}>
          <div className="check-points-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💎 Check Your Points</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {!profile ? (
              <div className="modal-input-section">
                <p className="modal-subtitle">Enter your username to see your rewards</p>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Enter your username..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoFocus
                    disabled={loading}
                  />
                  <button
                    className="check-btn"
                    onClick={handleCheck}
                    disabled={loading}
                  >
                    {loading ? "Checking..." : "Check"}
                  </button>
                </div>
                {error && <p className="error-message">{error}</p>}
                <p className="hint-text">💡 Tip: Click "Check Your Points" to see results without setting a permanent username!</p>
              </div>
            ) : (
              <div className="modal-profile-section">
                <div className="profile-header">
                  <h3>👤 {profile.username}</h3>
                  <button className="check-again-btn" onClick={resetForm}>Check Another User</button>
                </div>

                <div className="stats-grid">
                  <div className="stat-card primary">
                    <div className="stat-icon">⭐</div>
                    <div className="stat-value">{profile.pointsBalance}</div>
                    <div className="stat-label">Current Points</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🛍️</div>
                    <div className="stat-value">{profile.purchasesCount}</div>
                    <div className="stat-label">Purchases</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-value">{profile.reviewsCount}</div>
                    <div className="stat-label">Reviews</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">{profile.referralsCount}</div>
                    <div className="stat-label">Referrals</div>
                  </div>
                </div>

                <div className="badges-section">
                  <div className="badges-header">
                    <h4>🏅 Badges Unlocked ({profile.unlockedBadgesCount}/{profile.badges?.length || 0})</h4>
                  </div>
                  <div className="badges-list">
                    {profile.badges?.map((badge) => (
                      <div
                        key={badge.id}
                        className={`badge-item ${badge.earned ? "earned" : "locked"}`}
                        title={badge.description}
                      >
                        <div className="badge-icon">{badge.iconEmoji}</div>
                        <div className="badge-name">{badge.name}</div>
                        {badge.earned && <div className="check-mark">✓</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="redemption-info">
                  <div className="redemption-card">
                    <span className="redemption-label">Points to Discount:</span>
                    <span className="redemption-value">{Math.floor(profile.pointsBalance / 100)} × ₱10</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

