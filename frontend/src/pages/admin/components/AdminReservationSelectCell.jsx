import { Check, Pencil } from "lucide-react";

export default function AdminReservationSelectCell({
  orderId,
  fieldName,
  value,
  options,
  isOpen,
  isDisabled,
  isSaved,
  onToggle,
  onChangeValue,
  selectPlaceholder,
  displayText,
  displayChipClass,
  openAriaLabel,
  closedAriaLabel,
  containerClassName = "reservation-field-cell"
}) {
  return (
    <td>
      <div className={containerClassName}>
        {isOpen ? (
          <select
            className="reservation-status-select"
            value={value}
            disabled={isDisabled}
            onChange={(event) => onChangeValue(event.target.value)}
          >
            {selectPlaceholder ? <option value="">{selectPlaceholder}</option> : null}
            {options.map((option) => (
              <option key={`reservation-${fieldName}-${orderId}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span className={displayChipClass}>{displayText}</span>
        )}
        <button
          type="button"
          className="reservation-inline-icon-btn"
          aria-label={isOpen ? openAriaLabel : closedAriaLabel}
          onClick={onToggle}
          disabled={isDisabled}
        >
          <Pencil size={14} />
        </button>
        {isSaved ? (
          <small className="reservation-saved-inline"><Check size={12} />Saved</small>
        ) : null}
      </div>
    </td>
  );
}


