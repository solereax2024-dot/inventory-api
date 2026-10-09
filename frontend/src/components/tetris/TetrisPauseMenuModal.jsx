/**
 * TetrisPauseMenuModal Component
 *
 * Displays pause menu with options:
 * - Resume Game
 * - How to Play (Tutorial)
 * - Settings/Options
 * - Quit Game
 */

import { X, RotateCcw, HelpCircle, Settings, LogOut } from "lucide-react";

export default function TetrisPauseMenuModal({
  isVisible,
  onResume,
  onHowToPlay,
  onSettings,
  onQuit,
  gameState = "paused", // paused, playing, gameOver
}) {
  if (!isVisible) return null;

  return (
    <div className="tetris-pause-overlay">
      <div className="tetris-pause-modal">
        <div className="tetris-pause-modal-header">
          <h2>GAME PAUSED</h2>
          <button
            type="button"
            className="tetris-modal-close tetris-pause-close-btn"
            onClick={onResume}
            aria-label="Close pause menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="tetris-pause-menu-options">
          {/* Resume Button */}
          <button
            type="button"
            className="tetris-menu-option tetris-menu-option-resume"
            onClick={onResume}
          >
            <RotateCcw size={20} />
            <span>Resume Game</span>
          </button>

          {/* How to Play Button */}
          <button
            type="button"
            className="tetris-menu-option tetris-menu-option-help"
            onClick={onHowToPlay}
          >
            <HelpCircle size={20} />
            <span>How to Play</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            className="tetris-menu-option tetris-menu-option-settings"
            onClick={onSettings}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>

          {/* Quit Button */}
          <button
            type="button"
            className="tetris-menu-option tetris-menu-option-quit"
            onClick={onQuit}
          >
            <LogOut size={20} />
            <span>Quit Game</span>
          </button>
        </div>

        <div className="tetris-pause-modal-footer">
          <p className="tetris-pause-hint">Press <kbd>P</kbd> or click Resume to continue</p>
        </div>
      </div>
    </div>
  );
}

