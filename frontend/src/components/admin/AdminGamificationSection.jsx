import { useState, useEffect } from "react";
import { apiRequest } from "../../utils/api";
import "./AdminGamification.css";

export function AdminGamificationSection() {
  const [customers, setCustomers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState("customers");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    if (activeTab === "customers") {
      loadCustomers();
    } else if (activeTab === "leaderboard") {
      loadLeaderboard();
    }
  }, [activeTab]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/admin/gamification/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/admin/gamification/leaderboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaderboard(data);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-gamification-section">
      <h2>🎮 Gamification Management</h2>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "customers" ? "active" : ""}`}
          onClick={() => setActiveTab("customers")}
        >
          👥 All Customers ({customers.length})
        </button>
        <button
          className={`tab ${activeTab === "leaderboard" ? "active" : ""}`}
          onClick={() => setActiveTab("leaderboard")}
        >
          🏆 Leaderboard
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : activeTab === "customers" ? (
        <div className="customers-table">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Points</th>
                <th>Purchases</th>
                <th>Reviews</th>
                <th>Referrals</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.username}</td>
                  <td className="points">{customer.pointsBalance}</td>
                  <td>{customer.purchasesCount}</td>
                  <td>{customer.reviewsCount}</td>
                  <td>{customer.referralsCount}</td>
                  <td>
                    <button className="action-btn">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="leaderboard-table">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Username</th>
                <th>Points</th>
                <th>Badges</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((customer, index) => (
                <tr key={customer.id}>
                  <td className="rank">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                  </td>
                  <td>{customer.username}</td>
                  <td className="points">{customer.pointsBalance}</td>
                  <td>{customer.unlockedBadgesCount}/{customer.badges?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

