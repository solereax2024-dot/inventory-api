import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import RegisteredPlayersTable from "./RegisteredPlayersTable.jsx";
import { DEFAULT_GIVEAWAY_SETTINGS, giveawayImageSrc, normalizeGiveawaySettings } from "../../../constants/giveaway";

export default function GamingSettingsSection({
  gamingSectionVisible,
  isSaving,
  onToggleVisibility,
  onPlayAsAdmin,
  giveawaySettings,
  isGiveawaySettingsSaving,
  isGiveawayPrizeUploading,
  activeGiveawayPrizeUploadSlot,
  onGiveawaySettingChange,
  onGiveawayPrizeImageCountChange,
  onGiveawayStepChange,
  onSaveGiveawaySettings,
  onGiveawayPrizeImageChange,
  onClearGiveawayPrizeImage,
  registeredPlayers = [],
  isLoadingPlayers = false,
  onBonusAction,
  bonusActionKey,
  onDeletePlayer,
  onDeleteAllPlayers,
  isDeletingPlayers = false,
}) {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState({ isOpen: false });
  const safeGiveawaySettings = normalizeGiveawaySettings(giveawaySettings || DEFAULT_GIVEAWAY_SETTINGS);
  const prizeImageSlots = Array.from(
    { length: Math.max(1, Math.min(10, Number.parseInt(safeGiveawaySettings.prizeImageCount, 10) || 1)) },
    (_, index) => giveawayImageSrc(safeGiveawaySettings.prizeImageUrls?.[index])
  );

  return (
    <section className="card products-card admin-section">
      <div className="section-head">
        <div className="admin-section-heading-copy">
          <h2>Giveaway</h2>
          <p className="field-hint" style={{ margin: 0 }}>
            Control whether customers can see the giveaway game in the customer nav bar.
          </p>
        </div>
        <div className="giveaway-visibility-actions">
          <button type="button" className="button-secondary" onClick={onPlayAsAdmin}>
            Play as Admin
          </button>
          <button type="button" className="btn-primary" onClick={onToggleVisibility} disabled={isSaving}>
            {gamingSectionVisible ? "Hide from customers" : "Show to customers"}
          </button>
        </div>
      </div>

      <div className="giveaway-settings-editor">
        <div className="giveaway-settings-card">
          <div className="giveaway-settings-card-head">
            <div>
              <h3>Giveaway Settings</h3>
              <p className="field-hint" style={{ margin: 0 }}>
                Configure the giveaway setup and prize image.
              </p>
            </div>
            <button type="button" className="btn-primary" onClick={() => setIsSettingsModalOpen(true)}>
              Edit Settings
            </button>
           </div>
         </div>
      </div>

      <RegisteredPlayersTable
        players={registeredPlayers}
        isLoading={isLoadingPlayers}
        onBonusAction={onBonusAction}
        bonusActionKey={bonusActionKey}
        onDeletePlayer={onDeletePlayer}
        onDeleteAllPlayers={() => setDeleteAllConfirm({ isOpen: true })}
        isDeletingPlayers={isDeletingPlayers}
      />

      {deleteAllConfirm.isOpen && onDeleteAllPlayers ? (
        <div className="modal-overlay" onClick={() => setDeleteAllConfirm({ isOpen: false })}>
          <section className="modal-panel confirm-action-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Delete All Players</h3>
            <p style={{ color: "#64748b", marginBottom: "20px" }}>
              Are you sure you want to delete all registered players? This action cannot be undone. All player accounts, game stats, and related data will be permanently removed.
            </p>
            <div className="confirm-action-buttons">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setDeleteAllConfirm({ isOpen: false })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-delete"
                onClick={() => {
                  setDeleteAllConfirm({ isOpen: false });
                  onDeleteAllPlayers();
                }}
              >
                Delete All Players
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isSettingsModalOpen ? (
        <div className="modal-overlay" onClick={() => setIsSettingsModalOpen(false)}>
          <section className="modal-panel giveaway-settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="giveaway-settings-modal-head">
              <div>
                <h3>Giveaway Settings</h3>
                <p className="field-hint" style={{ margin: 0 }}>
                  Update the content customers see and configure the prize image.
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setIsSettingsModalOpen(false)} aria-label="Close giveaway settings editor">
                ✕
              </button>
            </div>

            <div className="giveaway-settings-modal-body">
              <div className="giveaway-settings-section">
                <h4>Setup & Content</h4>
                <div className="giveaway-settings-grid">
                  <label className="giveaway-settings-field">
                    <span>Title</span>
                    <input
                      type="text"
                      value={safeGiveawaySettings.title}
                      onChange={(event) => onGiveawaySettingChange("title", event.target.value)}
                      placeholder="Join the Giveaway"
                    />
                  </label>

                  <label className="giveaway-settings-field">
                    <span>Heading</span>
                    <input
                      type="text"
                      value={safeGiveawaySettings.howToJoinTitle}
                      onChange={(event) => onGiveawaySettingChange("howToJoinTitle", event.target.value)}
                      placeholder="How to Join"
                    />
                  </label>

                  <label className="giveaway-settings-field giveaway-settings-field-wide">
                    <span>Intro</span>
                    <textarea
                      rows={3}
                      value={safeGiveawaySettings.intro}
                      onChange={(event) => onGiveawaySettingChange("intro", event.target.value)}
                      placeholder="Play the Giveaway challenge for a chance to win..."
                    />
                  </label>

                  <label className="giveaway-settings-field">
                    <span>Prize Image Alt Text</span>
                    <input
                      type="text"
                      value={safeGiveawaySettings.prizeImageAlt}
                      onChange={(event) => onGiveawaySettingChange("prizeImageAlt", event.target.value)}
                      placeholder="Featured giveaway prize"
                    />
                  </label>

                  <label className="giveaway-settings-field giveaway-settings-field-wide">
                    <span>Account Deletion Note</span>
                    <textarea
                      rows={3}
                      value={safeGiveawaySettings.accountDeletionNote}
                      onChange={(event) => onGiveawaySettingChange("accountDeletionNote", event.target.value)}
                      placeholder="After the giveaway ends, giveaway accounts will be deleted..."
                    />
                  </label>
                </div>

                <div className="giveaway-settings-steps">
                  {safeGiveawaySettings.steps.map((step, index) => (
                    <label key={index} className="giveaway-settings-field giveaway-settings-field-wide">
                      <span>Step {index + 1}</span>
                      <textarea
                        rows={2}
                        value={step}
                        onChange={(event) => onGiveawayStepChange(index, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="giveaway-settings-section">
                <div className="giveaway-settings-panel-head giveaway-prize-panel-head">
                  <div className="giveaway-prize-panel-copy">
                    <h4>Prize Images</h4>
                    <p className="field-hint" style={{ margin: 0 }}>
                      Arrange the giveaway visuals here. Customers will see these images rotate automatically in the giveaway section.
                    </p>
                  </div>
                  <label className="giveaway-settings-field giveaway-image-count-field">
                    <span>Number of images</span>
                    <select
                      value={safeGiveawaySettings.prizeImageCount}
                      onChange={(event) => onGiveawayPrizeImageCountChange(event.target.value)}
                    >
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="giveaway-prize-upload-summary">
                  <span className="giveaway-settings-badge">{prizeImageSlots.length} slot{prizeImageSlots.length === 1 ? "" : "s"} active</span>
                  <small className="field-hint image-upload-note">
                    Recommended: use the same image ratio for cleaner rotation. Max 10 images.
                  </small>
                </div>

                <div className="giveaway-prize-upload-grid">
                  {prizeImageSlots.map((prizeImageSrc, index) => {
                    const inputId = `giveaway-prize-image-file-${index}`;
                    const isUploadingCurrentSlot = isGiveawayPrizeUploading && activeGiveawayPrizeUploadSlot === index;

                    return (
                      <div key={inputId} className="giveaway-prize-upload-card">
                        <input
                          id={inputId}
                          className="sr-only-file-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                          onChange={(event) => onGiveawayPrizeImageChange(index, event)}
                        />
                        <div className="giveaway-prize-upload-card-head">
                          <div>
                            <strong>Image {index + 1}</strong>
                            <small className="field-hint">{prizeImageSrc ? "Ready for rotation" : "Waiting for upload"}</small>
                          </div>
                          {prizeImageSrc ? (
                            <button
                              type="button"
                              className="button-secondary giveaway-prize-remove-btn"
                              onClick={() => onClearGiveawayPrizeImage(index)}
                              aria-label={`Remove giveaway image ${index + 1}`}
                              title={`Remove image ${index + 1}`}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                              <span className="giveaway-prize-remove-btn-label">Remove</span>
                            </button>
                          ) : null}
                        </div>
                        <label htmlFor={inputId} className="product-image-upload-tile giveaway-prize-upload-tile" title={`Click to upload giveaway image ${index + 1}`}>
                          {prizeImageSrc ? (
                            <img className="product-image-upload-tile-img" src={prizeImageSrc} alt={`${safeGiveawaySettings.prizeImageAlt} ${index + 1}`} />
                          ) : (
                            <span className="product-image-upload-placeholder">
                              <ImagePlus size={20} />
                            </span>
                          )}
                          <span className="giveaway-prize-upload-slot-label">Slot {index + 1}</span>
                          {isUploadingCurrentSlot ? <span className="product-image-uploading">•••</span> : null}
                        </label>
                        <div className="giveaway-prize-upload-actions">
                          <small className="field-hint image-upload-note">
                            {prizeImageSrc ? "Click the tile to replace this image." : "Upload an image for this slot."}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <small className="field-hint image-upload-note">
                  Upload up to 10 giveaway images. The customer giveaway view will rotate through the uploaded images automatically.
                </small>
              </div>
            </div>

            <div className="giveaway-settings-modal-footer modal-sticky-footer">
              <button type="button" className="button-secondary" onClick={() => setIsSettingsModalOpen(false)}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={onSaveGiveawaySettings} disabled={isGiveawaySettingsSaving}>
                {isGiveawaySettingsSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

