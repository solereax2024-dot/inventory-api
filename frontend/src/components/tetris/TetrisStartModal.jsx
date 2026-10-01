import { useEffect, useRef } from "react";
import { Play, X } from "lucide-react";

export default function TetrisStartModal({
  isVisible,
  playerName,
  message,
  onPlayerNameChange,
  onStart,
  onCancel,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isVisible) return undefined;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="tetris-player-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="tetris-player-modal tetris-start-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tetris-start-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tetris-player-modal-header">
          <div className="tetris-start-modal-copy">
            <p className="tetris-start-modal-kicker">Ready to play</p>
            <h2 id="tetris-start-modal-title">Enter your username</h2>
          </div>
          <button type="button" className="tetris-modal-close" onClick={onCancel} aria-label="Close start modal">
            <X size={18} />
          </button>
        </div>

        <p className="tetris-start-modal-message" aria-live="polite">
          {message || "Choose a username before starting your run."}
        </p>

        <form
          className="tetris-start-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            onStart();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(event) => onPlayerNameChange(event.target.value)}
            className="tetris-input tetris-start-modal-input"
            autoComplete="nickname"
            maxLength={24}
          />

          <div className="tetris-start-modal-actions">
            <button type="submit" className="tetris-button tetris-button-primary">
              <Play size={16} /> Start Game
            </button>
            <button type="button" className="tetris-button tetris-button-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

