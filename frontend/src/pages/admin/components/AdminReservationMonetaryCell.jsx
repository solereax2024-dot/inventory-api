import { Check, Pencil } from "lucide-react";

export default function AdminReservationMonetaryCell({
  orderId,
  fieldName,
  draftValue,
  trimmedDraftValue,
  normalizedValue,
  isDirty,
  hasValue,
  displayValue,
  chipClassWhenHasValue,
  chipClassWhenEmpty,
  openAriaLabel,
  closedAriaLabel,
  isDisabled,
  isSaved,
  setDrafts,
  setReservationEditorOpen,
  isReservationEditorOpen,
  onSaveDraft,
  extraInside,
  footer
}) {
  const isOpen = isReservationEditorOpen(orderId, fieldName);

  return (
    <td>
      <div className="reservation-field-cell">
        {isOpen ? (
          <div className="reservation-price-edit">
            <input
              className="reservation-price-input"
              type="number"
              min="0"
              step="0.01"
              value={draftValue}
              placeholder="0.00"
              disabled={isDisabled}
              onChange={(event) => setDrafts((prev) => ({ ...prev, [orderId]: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSaveDraft();
                }
              }}
              onBlur={() => {
                if (isDirty && trimmedDraftValue) {
                  onSaveDraft();
                }
              }}
            />
          </div>
        ) : (
          <span className={`order-status-chip reservation-final-chip reservation-price-chip ${hasValue ? chipClassWhenHasValue : chipClassWhenEmpty}`}>
            {displayValue}
          </span>
        )}
        {extraInside}
        <button
          type="button"
          className="reservation-inline-icon-btn"
          aria-label={isOpen ? openAriaLabel : closedAriaLabel}
          onClick={() => {
            if (isOpen && isDirty && trimmedDraftValue) {
              onSaveDraft();
              return;
            }
            const nextOpen = !isOpen;
            setReservationEditorOpen(orderId, fieldName, nextOpen);
            if (nextOpen) {
              setDrafts((prev) => ({ ...prev, [orderId]: normalizedValue }));
            }
          }}
          disabled={isDisabled}
        >
          <Pencil size={14} />
        </button>
        {isSaved ? (
          <small className="reservation-saved-inline"><Check size={12} />Saved</small>
        ) : null}
      </div>
      {footer}
    </td>
  );
}

