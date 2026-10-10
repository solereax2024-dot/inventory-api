import { useState } from "react";
import { ImagePlus } from "lucide-react";
import RegisteredPlayersTable from "./RegisteredPlayersTable.jsx";
import { DEFAULT_GIVEAWAY_SETTINGS, giveawayImageSrc, normalizeGiveawaySettings } from "../../../constants/giveaway";

export default function GamingSettingsSection({
  gamingSectionVisible,
  isSaving,
  onToggleVisibility,
  onPlayAsAdmin,
  giveawaySettings,
  giveawayPrizeFile,
  isGiveawaySettingsSaving,
  isGiveawayPrizeUploading,
  onGiveawaySettingChange,
  onGiveawayStepChange,
  onSaveGiveawaySettings,
  onGiveawayPrizeImageChange,
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
  const prizeImageSrc = giveawayImageSrc(safeGiveawaySettings.prizeImageUrl);

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
                    <span>Prize Label</span>
                    <input
                      type="text"
                      value={safeGiveawaySettings.prizeLabel}
                      onChange={(event) => onGiveawaySettingChange("prizeLabel", event.target.value)}
                      placeholder="Featured Prize"
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
                <h4>Prize Image</h4>
                <input
                  id="giveaway-prize-image-file"
                  className="sr-only-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  onChange={onGiveawayPrizeImageChange}
                />
                <div className="product-image-upload-tile-wrap">
                  <label htmlFor="giveaway-prize-image-file" className="product-image-upload-tile" title="Click to upload prize image">
                    {prizeImageSrc ? (
                      <img className="product-image-upload-tile-img" src={prizeImageSrc} alt={safeGiveawaySettings.prizeImageAlt} />
                    ) : (
                      <span className="product-image-upload-placeholder">
                        <ImagePlus size={20} />
                      </span>
                    )}
                    {isGiveawayPrizeUploading ? <span className="product-image-uploading">•••</span> : null}
                  </label>
                  <div className="product-image-upload-copy">
                    <small className="field-hint image-upload-name">
                      {giveawayPrizeFile
                        ? `${giveawayPrizeFile.name}`
                        : (prizeImageSrc ? "Prize image uploaded" : "No file selected")}
                    </small>
                    <small className="field-hint image-upload-note">
                      {isGiveawayPrizeUploading ? "Uploading prize image..." : (prizeImageSrc ? "Click the tile to replace the prize image." : "Click the tile to upload the prize image. Auto-upload starts immediately.")}
                    </small>
                  </div>
                </div>
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

