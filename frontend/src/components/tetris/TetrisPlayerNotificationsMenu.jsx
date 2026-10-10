import { AlertTriangle, BellRing, Info } from "lucide-react";

const ICON_BY_TONE = {
  danger: AlertTriangle,
  info: Info,
};

export default function TetrisPlayerNotificationsMenu({
  notices = [],
  onOpenPlayerNotices,
}) {
  if (!notices.length) {
    return null;
  }

  const primaryNotice = notices[0];
  const tone = primaryNotice?.tone === "danger" ? "danger" : "info";
  const Icon = ICON_BY_TONE[tone] || Info;
  const noticeCountLabel = `${notices.length} active ${notices.length === 1 ? "notice" : "notices"}`;

  return (
    <section
      className={[
        "tetris-player-notifications-feed",
        `is-${tone}`,
      ].join(" ")}
      aria-label="Admin notifications"
    >
      <div className="tetris-player-notifications-feed-summary">
        <span className="tetris-player-notifications-feed-bell" aria-hidden="true">
          <BellRing size={16} />
        </span>
        <div className="tetris-player-notifications-feed-summary-copy">
          <span className="tetris-player-notifications-feed-eyebrow">Admin updates</span>
          <strong>{noticeCountLabel}</strong>
        </div>
        <span className="tetris-player-notifications-feed-count" aria-hidden="true">{notices.length}</span>
      </div>

      <article className={["tetris-player-notifications-feed-card", `is-${tone}`].join(" ")}>
        <div className="tetris-player-notifications-feed-card-icon" aria-hidden="true">
          <Icon size={18} />
        </div>
        <div className="tetris-player-notifications-feed-card-copy">
          <strong>{primaryNotice?.title || "Admin notification"}</strong>
          <p>{primaryNotice?.message}</p>
          {primaryNotice?.helperText ? <small>{primaryNotice.helperText}</small> : null}
        </div>
      </article>

      <div className="tetris-player-notifications-feed-actions">

        {typeof onOpenPlayerNotices === "function" ? (
          <button
            type="button"
            className="tetris-button tetris-button-secondary tetris-player-notifications-feed-secondary-action"
            onClick={onOpenPlayerNotices}
          >
            View details
          </button>
        ) : null}
      </div>
    </section>
  );
}

