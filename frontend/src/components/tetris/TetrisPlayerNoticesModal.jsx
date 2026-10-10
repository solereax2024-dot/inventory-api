import { AlertTriangle, BellRing, CheckCircle2, Info, X } from "lucide-react";
import { createPortal } from "react-dom";

const ICON_BY_TONE = {
  danger: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

export default function TetrisPlayerNoticesModal({
  isVisible,
  notices = [],
  onClose,
}) {
  if (!isVisible) {
    return null;
  }

  const content = (
    <div className="tetris-player-notice-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tetris-player-notice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tetris-player-notice-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tetris-player-notice-modal-header">
          <div>
            <p className="tetris-board-kicker">Player alerts</p>
            <h2 id="tetris-player-notice-modal-title">Notifications</h2>
          </div>
          <button
            type="button"
            className="tetris-modal-close"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <X size={18} />
          </button>
        </div>

        <div className="tetris-player-notice-modal-summary">
          <span className="tetris-player-notice-modal-summary-icon" aria-hidden="true">
            <BellRing size={18} />
          </span>
          <strong>{notices.length} active {notices.length === 1 ? "notice" : "notices"}</strong>
        </div>

        <div className="tetris-player-notice-list">
          {notices.map((notice) => {
            const Icon = ICON_BY_TONE[notice.tone] || Info;
            return (
              <article key={notice.id} className={["tetris-player-notice-card", `is-${notice.tone || "info"}`].join(" ")}>
                <div className="tetris-player-notice-card-icon" aria-hidden="true">
                  <Icon size={18} />
                </div>
                <div className="tetris-player-notice-card-copy">
                  <strong>{notice.title}</strong>
                  {notice.metaText ? <small className="tetris-player-notice-card-meta">{notice.unread ? `New • ${notice.metaText}` : notice.metaText}</small> : null}
                  <p>{notice.message}</p>
                  {notice.helperText ? <small>{notice.helperText}</small> : null}
                </div>
              </article>
            );
          })}
        </div>

      </div>
    </div>
  );

  return typeof document === "undefined" ? content : createPortal(content, document.body);
}

