import { SpinWheel } from "../../components/gamification/SpinWheel";
import { GamificationBar } from "../../components/gamification/GamificationBar";
import { CheckPointsWidget } from "../../components/gamification/CheckPointsWidget";
import { BasketballGame } from "../../components/gamification/SportsMinigames";
import "./GamificationPage.css";

export default function GamificationPage() {
  const username = localStorage.getItem("customerUsername");

  return (
    <div className="gamification-page">
      <div className="gamification-page-container">
        <section className="gamification-hero">
          <h1>🎮 Earn Rewards & Badges</h1>
          <p>Collect points, unlock badges, and climb the leaderboard!</p>

          <div className="hero-cta">
            <CheckPointsWidget />
          </div>
        </section>

        <div className="gamification-content">
          <SpinWheel />

          <section className="sports-games-section">
            <h2>⚽ Play Sports Games</h2>
            <p className="section-subtitle">Try our fun sports mini-games to earn extra points!</p>
            <BasketballGame />
          </section>

          <section className="how-it-works">
            <h2>How It Works</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🛍️</div>
                <h3>Shop & Earn</h3>
                <p>Every purchase earns you points. More purchases = more rewards!</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⭐</div>
                <h3>Leave Reviews</h3>
                <p>Rate products 5 stars and earn bonus points instantly</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">👥</div>
                <h3>Refer Friends</h3>
                <p>Share your unique code and earn when they purchase</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🏅</div>
                <h3>Unlock Badges</h3>
                <p>Collect badges as you reach milestones</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🎡</div>
                <h3>Daily Spin</h3>
                <p>Spin the wheel once per day for random rewards</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💰</div>
                <h3>Redeem Points</h3>
                <p>Convert your points into discounts on your next purchase</p>
              </div>
            </div>
          </section>

          {username && (
            <section className="badges-showcase">
              <h2>Your Badges</h2>
              <div className="badges-info">
                <p>Sign in to see and manage your badges!</p>
              </div>
            </section>
          )}

          <section className="points-system">
            <h2>Points & Redemption</h2>
            <div className="points-table">
              <div className="points-row">
                <div className="points-activity">💳 Purchase</div>
                <div className="points-value">1 point per ₱10 spent</div>
              </div>
              <div className="points-row">
                <div className="points-activity">⭐ 5-Star Review</div>
                <div className="points-value">20 points</div>
              </div>
              <div className="points-row">
                <div className="points-activity">👥 Successful Referral</div>
                <div className="points-value">50 points</div>
              </div>
              <div className="points-row">
                <div className="points-activity">🎯 100 Points</div>
                <div className="points-value">≈ ₱10 discount</div>
              </div>
            </div>
          </section>

          <section className="badges-info-section">
            <h2>Available Badges</h2>
            <div className="badges-list">
              <div className="badge-info-card">
                <div className="badge-emoji">🥾</div>
                <h3>Sneakerhead</h3>
                <p>Buy 5+ items → +50 bonus points</p>
              </div>
              <div className="badge-info-card">
                <div className="badge-emoji">👟</div>
                <h3>Collector</h3>
                <p>Buy all colors of one shoe → +30 bonus points</p>
              </div>
              <div className="badge-info-card">
                <div className="badge-emoji">⭐</div>
                <h3>5-Star Reviewer</h3>
                <p>Leave a 5-star review → +20 bonus points</p>
              </div>
              <div className="badge-info-card">
                <div className="badge-emoji">🎯</div>
                <h3>Early Bird</h3>
                <p>Make purchase on first day → +15 bonus points</p>
              </div>
              <div className="badge-info-card">
                <div className="badge-emoji">💝</div>
                <h3>Gift Giver</h3>
                <p>Refer 3+ friends → +75 bonus points</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

