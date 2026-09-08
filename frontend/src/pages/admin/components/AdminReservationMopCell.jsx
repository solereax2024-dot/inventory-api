import { Check, Pencil } from "lucide-react";
import { RESERVATION_MOP_OPTIONS } from "../../../constants";
import { formatEnumLabel } from "../../../utils/format";

export default function AdminReservationMopCell({
  order,
  normalizedMop,
  mopOtherDraft,
  trimmedMopOtherDraft,
  hasUnsavedMopOther,
  isDisabled,
  isReservationEditorOpen,
  setReservationEditorOpen,
  isReservationSaved,
  setMopOtherDrafts,
  updateReservationStatus,
  onError
}) {
  const isMopOpen = isReservationEditorOpen(order.id, "mop");

  return (
    <td>
      <div className="reservation-mop-cell">
        <div className="reservation-field-cell">
          {isMopOpen ? (
            <select
              className="reservation-status-select"
              value={normalizedMop}
              disabled={isDisabled}
              onChange={(event) => updateReservationStatus(
                order.id,
                { mop: event.target.value },
                `Reservation #${order.id} MOP set to ${formatEnumLabel(event.target.value)}.`,
                "mop"
              ).then(() => {
                if (event.target.value !== "OTHER") {
                  setReservationEditorOpen(order.id, "mop", false);
                }
              }).catch((err) => onError(err.message))}
            >
              <option value="">Select MOP</option>
              {RESERVATION_MOP_OPTIONS.map((option) => (
                <option key={`reservation-mop-${order.id}-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <span className={`order-status-chip reservation-final-chip ${normalizedMop ? "status-preparing" : "status-ordered"}`}>
              {normalizedMop ? formatEnumLabel(normalizedMop) : "No MOP"}
            </span>
          )}
          <button
            type="button"
            className="reservation-inline-icon-btn"
            aria-label={isMopOpen ? "Close MOP selector" : "Set MOP"}
            onClick={() => setReservationEditorOpen(order.id, "mop", !isMopOpen)}
            disabled={isDisabled}
          >
            <Pencil size={14} />
          </button>
          {isReservationSaved(order.id, "mop") || isReservationSaved(order.id, "mopOther") ? (
            <small className="reservation-saved-inline"><Check size={12} />Saved</small>
          ) : null}
        </div>
        {normalizedMop === "OTHER" && isMopOpen ? (
          <>
            <input
              className="reservation-other-input"
              value={mopOtherDraft}
              placeholder="Specify other MOP"
              onChange={(event) => setMopOtherDrafts((prev) => ({ ...prev, [order.id]: event.target.value }))}
              onBlur={() => {
                const trimmed = mopOtherDraft.trim();
                if (!trimmed || trimmed === (order.mopOther || "")) {
                  return;
                }
                updateReservationStatus(
                  order.id,
                  { mop: "OTHER", mopOther: trimmed },
                  `Reservation #${order.id} MOP details updated.`,
                  "mopOther"
                ).catch((err) => onError(err.message));
              }}
              disabled={isDisabled}
            />
            {hasUnsavedMopOther ? (
              <button
                type="button"
                className="reservation-other-save-btn"
                onClick={() => updateReservationStatus(
                  order.id,
                  { mop: "OTHER", mopOther: trimmedMopOtherDraft },
                  `Reservation #${order.id} MOP details updated.`,
                  "mopOther"
                ).catch((err) => onError(err.message))}
                disabled={isDisabled}
              >
                Save Other MOP
              </button>
            ) : null}
          </>
        ) : normalizedMop === "OTHER" && order.mopOther ? (
          <small className="field-hint">Other: {order.mopOther}</small>
        ) : null}
      </div>
    </td>
  );
}

