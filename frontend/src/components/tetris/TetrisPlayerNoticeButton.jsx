import { BellRing } from "lucide-react";

export default function TetrisPlayerNoticeButton({
  noticeCount = 0,
  label = "Admin Notice",
  title,
  tone = "info",
  onClick,
  className = "",
  compact = false,
}) {
  if (!noticeCount) {
    return null;
  }

  return (
    <button
      type="button"
      className={[
        "tetris-player-notice-btn",
        `is-${tone}`,
        compact ? "is-compact" : "",
        className,
      ].filter(Boolean).join(" ")}
      onClick={onClick}
      aria-label={title || `${noticeCount} admin notification${noticeCount === 1 ? "" : "s"}`}
      title={title || `${noticeCount} admin notification${noticeCount === 1 ? "" : "s"}`}
    >
      <span className="tetris-player-notice-btn-icon" aria-hidden="true">
        <BellRing size={compact ? 15 : 16} />
      </span>
      <span className="tetris-player-notice-btn-copy">
        <span className="tetris-player-notice-btn-label">{label}</span>
      </span>
      <span className="tetris-player-notice-btn-badge" aria-hidden="true">{noticeCount}</span>
    </button>
  );
}

