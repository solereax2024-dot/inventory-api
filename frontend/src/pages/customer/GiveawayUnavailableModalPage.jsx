import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function GiveawayUnavailableModalPage({
  title = "Giveaway unavailable",
  message = "Sorry, this giveaway is not available right now or has already ended.",
}) {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate("/collections", { replace: true });
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <section
        className="modal-panel modal-panel-compact giveaway-unavailable-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="giveaway-unavailable-title"
        aria-describedby="giveaway-unavailable-message"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="breakdown-header">
          <h2 id="giveaway-unavailable-title">{title}</h2>
          <button
            type="button"
            className="modal-close-btn"
            aria-label="Close giveaway unavailable modal"
            onClick={handleClose}
          >
            x
          </button>
        </div>

        <div className="giveaway-unavailable-copy">
          <AlertCircle size={24} aria-hidden="true" />
          <p id="giveaway-unavailable-message">{message}</p>
        </div>

        <button type="button" className="btn-primary giveaway-unavailable-cta" onClick={handleClose}>
          Back to collections
        </button>
      </section>
    </div>
  );
}

