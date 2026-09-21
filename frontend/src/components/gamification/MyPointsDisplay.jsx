import { useEffect, useState } from "react";
import { apiRequest } from "../../utils/api";
import "./MyPointsDisplay.css";

export function MyPointsDisplay() {
  const [username, setUsername] = useState(() => localStorage.getItem("customerUsername") || "");
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (username) {
      loadPoints();
      // Refresh points every 30 seconds
      const interval = setInterval(loadPoints, 30000);
      return () => clearInterval(interval);
    }
  }, [username]);

  const loadPoints = async () => {
    if (!username) return;
    try {
      const data = await apiRequest(`/api/public/gamification/profile?username=${username}`);
      setPoints(data.pointsBalance || 0);
    } catch (err) {
      console.error("Failed to load points:", err);
    }
  };

  if (!username) {
    return null;
  }

  return (
    <div className="my-points-display">
      <div className="points-badge">
        <span className="points-icon">⭐</span>
        <span className="points-value">{points}</span>
      </div>
    </div>
  );
}

