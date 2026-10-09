import { AlertCircle, LogOut } from "lucide-react";

/**
 * TetrisConfirmModal Component
 *
 * Generic confirmation modal for critical actions (sign out, reset, etc.)
 *
 * Props:
 * - isVisible (boolean): Whether modal is visible
 * - title (string): Modal title
 * - message (string): Confirmation message
 * - confirmText (string): Text for confirm button (default: "Confirm")
 * - cancelText (string): Text for cancel button (default: "Cancel")
 * - isDanger (boolean): If true, confirm button shows danger styling (default: false)
 * - onConfirm (function): Callback when user confirms
 * - onCancel (function): Callback when user cancels
 * - icon (component): Optional lucide icon to display
 */
export default function TetrisConfirmModal({
  isVisible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  onConfirm,
  onCancel,
  icon: Icon = AlertCircle,
}) {
  if (!isVisible) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="tetris-confirm-modal-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className={["tetris-confirm-modal", isDanger ? "is-danger" : ""].filter(Boolean).join(" ")}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tetris-confirm-modal-title"
        aria-describedby="tetris-confirm-modal-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tetris-confirm-modal-content">
          <div className="tetris-confirm-modal-icon-wrapper">
            <Icon size={28} className="tetris-confirm-modal-icon" />
          </div>

          <div className="tetris-confirm-modal-text">
            <h2 id="tetris-confirm-modal-title" className="tetris-confirm-modal-title">
              {title}
            </h2>
            <p id="tetris-confirm-modal-message" className="tetris-confirm-modal-message">
              {message}
            </p>
          </div>
        </div>

        <div className="tetris-confirm-modal-actions">
          <button
            type="button"
            className="tetris-confirm-modal-btn tetris-confirm-modal-btn-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={["tetris-confirm-modal-btn", isDanger ? "tetris-confirm-modal-btn-danger" : "tetris-confirm-modal-btn-confirm"].filter(Boolean).join(" ")}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

