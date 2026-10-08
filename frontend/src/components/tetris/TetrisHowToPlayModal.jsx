/**
 * TetrisHowToPlayModal Component
 *
 * Displays game instructions and tutorials
 */

import { X } from "lucide-react";

export default function TetrisHowToPlayModal({
  isVisible,
  onClose,
}) {
  if (!isVisible) return null;

  return (
    <div className="tetris-howtoplay-overlay">
      <div className="tetris-howtoplay-modal">
        <div className="tetris-howtoplay-header">
          <h2>How to Play</h2>
          <button
            type="button"
            className="tetris-howtoplay-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="tetris-howtoplay-content">
          {/* Objective */}
          <section className="tetris-howtoplay-section">
            <h3>Objective</h3>
            <p>
              Stack falling tetromino blocks to complete horizontal lines.
              Clear lines to score points and advance levels.
            </p>
          </section>

          {/* Desktop Controls */}
          <section className="tetris-howtoplay-section">
            <h3>Desktop Controls</h3>
            <div className="tetris-controls-list">
              <div className="tetris-control-item">
                <span className="tetris-control-key">← →</span>
                <span>Move left/right</span>
              </div>
              <div className="tetris-control-item">
                <span className="tetris-control-key">↓</span>
                <span>Soft drop</span>
              </div>
              <div className="tetris-control-item">
                <span className="tetris-control-key">Space</span>
                <span>Hard drop</span>
              </div>
              <div className="tetris-control-item">
                <span className="tetris-control-key">Z</span>
                <span>Rotate counter-clockwise</span>
              </div>
              <div className="tetris-control-item">
                <span className="tetris-control-key">X</span>
                <span>Rotate clockwise</span>
              </div>
              <div className="tetris-control-item">
                <span className="tetris-control-key">C / Shift</span>
                <span>Hold piece</span>
              </div>
              <div className="tetris-control-item">
                <span className="tetris-control-key">P</span>
                <span>Pause/Resume</span>
              </div>
              <div className="tetris-control-item">
                <span className="tetris-control-key">R</span>
                <span>Reset game</span>
              </div>
            </div>
          </section>

           {/* Mobile Gestures */}
           <section className="tetris-howtoplay-section">
             <h3>Mobile Gestures Only</h3>
             <div className="tetris-controls-list">
               <div className="tetris-control-item">
                 <span className="tetris-control-key">Swipe Left/Right</span>
                 <span>Move piece</span>
               </div>
               <div className="tetris-control-item">
                 <span className="tetris-control-key">Swipe Down</span>
                 <span>Soft drop</span>
               </div>
               <div className="tetris-control-item">
                 <span className="tetris-control-key">Flick Down</span>
                 <span>Hard drop</span>
               </div>
               <div className="tetris-control-item">
                 <span className="tetris-control-key">Tap Piece</span>
                 <span>Rotate clockwise</span>
               </div>
                <div className="tetris-control-item">
                  <span className="tetris-control-key">Swipe Up</span>
                  <span>Hold piece</span>
                </div>
             </div>
           </section>

          {/* Scoring */}
          <section className="tetris-howtoplay-section">
            <h3>Scoring</h3>
            <div className="tetris-scoring-list">
              <div className="tetris-score-item">
                <span className="tetris-score-label">Single Line:</span>
                <span>100 points</span>
              </div>
              <div className="tetris-score-item">
                <span className="tetris-score-label">Double Line:</span>
                <span>300 points</span>
              </div>
              <div className="tetris-score-item">
                <span className="tetris-score-label">Triple Line:</span>
                <span>500 points</span>
              </div>
              <div className="tetris-score-item">
                <span className="tetris-score-label">Tetris (4 lines):</span>
                <span>800 points</span>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="tetris-howtoplay-section">
            <h3>Tips</h3>
            <ul className="tetris-tips-list">
              <li>Plan ahead - watch the next pieces in queue</li>
              <li>Use the hold feature to save pieces for later</li>
              <li>Clear multiple lines at once for bonus points</li>
              <li>Create gaps for I-pieces to earn high scores</li>
              <li>Stay focused as speed increases with each level</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

