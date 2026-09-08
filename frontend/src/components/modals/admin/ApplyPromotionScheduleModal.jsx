import { CalendarClock } from "lucide-react";

export default function ApplyPromotionScheduleModal({
  isOpen,
  startsAt,
  endsAt,
  onStartsAtChange,
  onEndsAtChange,
  onApply,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-panel modal-panel-compact promo-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-header reserve-confirm-header">
          <h2>Apply Schedule</h2>
          <button type="button" className="modal-close-btn" aria-label="Close apply schedule" onClick={onClose}>✕</button>
        </div>
        <div className="modal-grid-gap-10">
          <div>
            <label className="field-label">Start Date</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => onStartsAtChange(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">End Date</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => onEndsAtChange(e.target.value)}
            />
          </div>
            <small className="field-hint">Set both dates for a strict promo window, then click Apply to activate the promotion.</small>
        </div>
        <div className="confirm-action-footer promo-modal-footer promo-modal-footer-tight modal-sticky-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={onApply}>
            <CalendarClock size={16} />
            <span>Apply</span>
          </button>
        </div>
      </section>
    </div>
  );
}

