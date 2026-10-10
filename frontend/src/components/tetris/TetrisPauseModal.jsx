import { Play, RotateCcw, Trophy } from "lucide-react";

/**
 * TetrisPauseModal Component
 *
 * Modal shown when game is paused
 *
 * Props:
 * - isVisible (boolean): Whether modal is visible
 * - onResume (function): Callback to resume
 * - onRestart (function): Callback to restart
 * - onOpenLeaderboard (function): Callback to open leaderboard
 */
export default function TetrisPauseModal({
  isVisible,
  onResume,
  onRestart,
  onOpenLeaderboard,
  isMobileViewport = false,
}) {
  if (!isVisible) return null;

  return (
    <div className="tetris-pause-modal-backdrop" role="presentation" onClick={onResume}>
      <div
        className="tetris-pause-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tetris-pause-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="tetris-pause-modal-title">Paused</h2>
        <p className="tetris-pause-modal-message">Game paused. What would you like to do?</p>
        <div className="tetris-pause-modal-actions">
          <button
            type="button"
            onClick={onResume}
            className="tetris-button tetris-button-primary"
          >
            <Play size={16} /> Resume Game
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="tetris-button tetris-button-secondary"
          >
            <RotateCcw size={16} /> Restart Game
          </button>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="tetris-button tetris-button-secondary"
          >
            <Trophy size={16} /> Leaderboard
          </button>
         </div>
         {!isMobileViewport && (
           <p className="tetris-pause-modal-hint">Press P or Esc to resume</p>
         )}
      </div>
    </div>
  );
}

