import { CheckCircle2, Gift, Loader, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

const FOLLOW_BONUS_POINTS = 2500;
const REVIEW_BONUS_POINTS = 5000;

export default function TetrisBonusModal({
  isVisible,
  onClose,
  bonusStatus,
  bonusLoading,
  bonusUploadingType,
  bonusError,
  bonusFeedback,
  onBonusProofSelected,
}) {
  const followProofInputRef = useRef(null);
  const reviewProofInputRef = useRef(null);
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const safeBonusStatus = bonusStatus || {};
  const totalBonusPoints = safeBonusStatus.totalBonusPoints || 0;
  const formatBonusPoints = (points) => `+${numberFormatter.format(points || 0)}`;

  const bonusItems = [
    {
      key: "follow",
      label: "Follow Proof",
      description: "Upload a screenshot showing you follow the page.",
      uploaded: Boolean(safeBonusStatus.followProofUploaded),
      validated: Boolean(safeBonusStatus.followProofValidated),
      revoked: Boolean(safeBonusStatus.followProofRevoked),
      points: FOLLOW_BONUS_POINTS,
      inputRef: followProofInputRef,
    },
    {
      key: "review",
      label: "Review Proof",
      description: "For customers who purchased from us, upload a screenshot of your posted review.",
      uploaded: Boolean(safeBonusStatus.reviewProofUploaded),
      validated: Boolean(safeBonusStatus.reviewProofValidated),
      revoked: Boolean(safeBonusStatus.reviewProofRevoked),
      points: REVIEW_BONUS_POINTS,
      inputRef: reviewProofInputRef,
    },
  ];

  useEffect(() => {
    if (!isVisible) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleBonusFileChange = (bonusType) => (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file && onBonusProofSelected) {
      onBonusProofSelected(bonusType, file);
    }
  };

  return (
    <div
      className="tetris-bonus-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tetris-bonus-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="tetris-bonus-modal">
        <div className="tetris-bonus-modal-header">
          <div className="tetris-bonus-modal-copy">
            <div className="tetris-bonus-modal-title-row">
              <span className="tetris-bonus-modal-icon" aria-hidden="true">
                <Gift size={20} />
              </span>
              <div className="tetris-bonus-modal-title-stack">
                <h2 id="tetris-bonus-modal-title">Bonus Proof</h2>
                <p className="tetris-bonus-modal-description">Upload proof once and your bonus points will be added automatically.</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="tetris-modal-close"
            onClick={onClose}
            aria-label="Close giveaway bonuses"
          >
            <X size={18} />
          </button>
        </div>

        <div className="tetris-bonus-modal-summary">
          <span className="tetris-bonus-modal-summary-label">Active total bonus</span>
          <strong>{formatBonusPoints(totalBonusPoints)}</strong>
        </div>

        <div className="tetris-bonus-list" aria-live="polite">
          {bonusItems.map((bonusItem) => {
            const isUploading = bonusUploadingType === bonusItem.key;

            return (
              <div
                key={bonusItem.key}
                className={[
                  "tetris-bonus-item",
                  bonusItem.uploaded ? "is-active" : "",
                  bonusItem.revoked ? "is-revoked" : "",
                  isUploading ? "is-uploading" : "",
                ].filter(Boolean).join(" ")}
              >
                <div className="tetris-bonus-item-copy">
                  <div className="tetris-bonus-item-heading">
                    <strong>{bonusItem.label}</strong>
                    <span className="tetris-bonus-points">{formatBonusPoints(bonusItem.points)}</span>
                  </div>
                  <span className="tetris-bonus-description">{bonusItem.description}</span>
                  <span className={[
                    "tetris-bonus-status",
                    bonusItem.revoked ? "is-revoked" : "",
                  ].filter(Boolean).join(" ")}>
                    {bonusItem.revoked ? (
                      <><X size={14} /> Revoked — please re-upload</>
                    ) : bonusItem.validated ? (
                      <><CheckCircle2 size={14} /> Validated</>
                    ) : bonusItem.uploaded ? (
                      <><CheckCircle2 size={14} /> Uploaded</>
                    ) : (
                      "Not uploaded yet"
                    )}
                  </span>
                </div>
                <input
                  ref={bonusItem.inputRef}
                  type="file"
                  accept="image/*"
                  className="tetris-bonus-file-input"
                  onChange={handleBonusFileChange(bonusItem.key)}
                  disabled={bonusLoading || Boolean(bonusUploadingType)}
                />
                <button
                  type="button"
                  className="tetris-button tetris-button-primary tetris-bonus-upload-btn"
                  onClick={() => bonusItem.inputRef.current?.click()}
                  disabled={bonusLoading || Boolean(bonusUploadingType)}
                >
                  {isUploading ? (
                    <><Loader size={16} className="tetris-spinner" /> Uploading...</>
                  ) : (
                    <><Upload size={16} /> {bonusItem.revoked ? "Re-upload" : bonusItem.uploaded ? "Replace" : "Upload"}</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {bonusLoading && <p className="tetris-bonus-feedback">Checking your active bonuses...</p>}
        {!bonusLoading && bonusFeedback && <p className="tetris-bonus-feedback is-success">{bonusFeedback}</p>}
        {!bonusLoading && bonusError && <p className="tetris-bonus-feedback is-error">{bonusError}</p>}
      </div>
    </div>
  );
}

