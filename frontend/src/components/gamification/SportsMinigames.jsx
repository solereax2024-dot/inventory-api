import { useState, useEffect, useRef } from "react";
import { apiRequest } from "../../utils/api";
import "./SportsMinigames.css";

export function BasketballGame() {
  const [username, setUsername] = useState(() => localStorage.getItem("customerUsername") || "");
  const [gameState, setGameState] = useState("menu"); // menu, playing, result
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 30 });
  const [basketPosition] = useState({ x: 75, y: 20 });
  const gameContainerRef = useRef(null);

  // Timer effect
  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState("result");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setTimeLeft(30);
    setBallPosition({ x: 50, y: 30 });
  };

  const shootBall = async () => {
    if (gameState !== "playing") return;

    // Random position for basket
    const randomX = Math.random() * 30 + 60; // 60-90
    const randomY = Math.random() * 20 + 10; // 10-30

    // Animate ball to random position
    setBallPosition({ x: randomX, y: randomY });

    // Check if scored (within basket area)
    const distToBasket = Math.sqrt(
      Math.pow(randomX - basketPosition.x, 2) +
      Math.pow(randomY - basketPosition.y, 2)
    );

    if (distToBasket < 8) {
      // Scored! 🏀
      const pointsForShot = 3; // 3 pointer
      setScore((prev) => prev + pointsForShot);
      setPointsEarned((prev) => prev + pointsForShot * 10); // 3 points = 30 reward points
    }

    // Reset ball position
    setTimeout(() => {
      setBallPosition({ x: 50, y: 30 });
    }, 500);
  };

  const finishGame = async () => {
    if (username && pointsEarned > 0) {
      try {
        await apiRequest(
          `/api/public/gamification/record-purchase?username=${username}&points=${pointsEarned}`,
          { method: "POST" }
        );
      } catch (err) {
        console.error("Failed to record points:", err);
      }
    }
  };

  if (!username) {
    return (
      <div className="sports-game-card">
        <p className="error-message">Please set your username first! 🎮</p>
      </div>
    );
  }

  return (
    <div className="sports-game-card basketball-game">
      <div className="game-header">
        <h3>🏀 Basketball Hoops</h3>
        <p className="game-subtitle">Shoot as many baskets as you can in 30 seconds!</p>
      </div>

      {gameState === "menu" && (
        <div className="game-menu">
          <div className="game-info">
            <p>⏱️ 30 Seconds</p>
            <p>🏆 Score 10+ = 100 points!</p>
            <p>🏆 Score 15+ = 200 points!</p>
            <p>🏆 Score 20+ = 500 points!</p>
          </div>
          <button className="play-btn" onClick={startGame}>
            Start Game 🎮
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="game-container" ref={gameContainerRef}>
          <div className="game-stats">
            <div className="stat">
              <span className="label">Score:</span>
              <span className="value">{score}</span>
            </div>
            <div className="stat">
              <span className="label">Time:</span>
              <span className="value">{timeLeft}s</span>
            </div>
            <div className="stat">
              <span className="label">Points:</span>
              <span className="value">{pointsEarned}</span>
            </div>
          </div>

          <div className="basketball-court">
            {/* Basket */}
            <div
              className="basket"
              style={{
                left: `${basketPosition.x}%`,
                top: `${basketPosition.y}%`,
              }}
            >
              🧺
            </div>

            {/* Ball */}
            <div
              className="basketball"
              style={{
                left: `${ballPosition.x}%`,
                top: `${ballPosition.y}%`,
              }}
              onClick={shootBall}
            >
              🏀
            </div>

            <div className="court-text">Click/Tap the ball to shoot! 👆</div>
          </div>

          <button className="shoot-btn" onClick={shootBall}>
            SHOOT! 🎯
          </button>
        </div>
      )}

      {gameState === "result" && (
        <div className="game-result">
          <div className="result-header">
            {score >= 20 ? (
              <>
                <h3>🏆 AMAZING!</h3>
                <p className="score-text">Score: {score}</p>
              </>
            ) : score >= 15 ? (
              <>
                <h3>🎉 GREAT!</h3>
                <p className="score-text">Score: {score}</p>
              </>
            ) : score >= 10 ? (
              <>
                <h3>👍 NICE!</h3>
                <p className="score-text">Score: {score}</p>
              </>
            ) : (
              <>
                <h3>Good try!</h3>
                <p className="score-text">Score: {score}</p>
              </>
            )}
          </div>

          <div className="points-awarded">
            <p className="label">Points Earned:</p>
            <p className="value">+{pointsEarned} pts</p>
          </div>

          <button
            className="play-btn"
            onClick={() => {
              finishGame();
              setGameState("menu");
            }}
          >
            Play Again 🔄
          </button>
        </div>
      )}
    </div>
  );
}

