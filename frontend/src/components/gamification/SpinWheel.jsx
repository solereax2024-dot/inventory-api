import { useState } from "react";
import { apiRequest } from "../../utils/api";
import "./SpinWheel.css";

export function SpinWheel() {
  const [username, setUsername] = useState(() => localStorage.getItem("customerUsername") || "");
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const handleSpin = async () => {
    if (!username) {
      alert("Please set your username first!");
      return;
    }

    setIsSpinning(true);
    try {
      const data = await apiRequest(`/api/public/gamification/spin?username=${username}`, {
        method: "POST",
      });
      setResult(data);
      setShowResult(true);
      setIsSpinning(false);

      // Hide result after 3 seconds
      setTimeout(() => setShowResult(false), 3000);
    } catch (err) {
      console.error("Spin failed:", err);
      setResult({ message: "❌ Spin failed, try again!", pointsEarned: 0, newBalance: 0 });
      setShowResult(true);
      setIsSpinning(false);
    }
  };

  return (
    <div className="spin-wheel-container">
      <div className="spin-wheel-card">
        <h2>🎡 Daily Spin Wheel</h2>
        <p className="spin-subtitle">Spin once per day to earn points!</p>

        <div className={`wheel ${isSpinning ? "spinning" : ""}`}>
          <div className="wheel-segments">
            <div className="segment" style={{ "--rotation": "0deg" }}>
              <span>5</span>
            </div>
            <div className="segment" style={{ "--rotation": "45deg" }}>
              <span>10</span>
            </div>
            <div className="segment" style={{ "--rotation": "90deg" }}>
              <span>15</span>
            </div>
            <div className="segment" style={{ "--rotation": "135deg" }}>
              <span>20</span>
            </div>
            <div className="segment" style={{ "--rotation": "180deg" }}>
              <span>25</span>
            </div>
            <div className="segment" style={{ "--rotation": "225deg" }}>
              <span>10</span>
            </div>
            <div className="segment" style={{ "--rotation": "270deg" }}>
              <span>15</span>
            </div>
            <div className="segment" style={{ "--rotation": "315deg" }}>
              <span>30</span>
            </div>
          </div>
          <div className="wheel-pointer"></div>
        </div>

        <button
          className="spin-btn"
          onClick={handleSpin}
          disabled={isSpinning}
        >
          {isSpinning ? "Spinning..." : "SPIN NOW! 🎯"}
        </button>

        {showResult && result && (
          <div className={`spin-result ${result.pointsEarned > 0 ? "success" : "info"}`}>
            <div className="result-message">{result.message}</div>
            {result.pointsEarned > 0 && (
              <div className="result-points">+{result.pointsEarned} pts</div>
            )}
            <div className="result-balance">Balance: {result.newBalance}</div>
          </div>
        )}
      </div>
    </div>
  );
}

