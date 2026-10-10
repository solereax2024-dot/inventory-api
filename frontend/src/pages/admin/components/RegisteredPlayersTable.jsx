import { useState } from "react";
import { formatDateTime } from "../../../utils/tetrisGame";
import { ConfirmActionModal } from "../../../components/modals/admin";

function getInitials(nameOrUsername = "") {
  const trimmed = String(nameOrUsername || "").trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts.map((part) => part[0]).join("").toUpperCase();
}

function getAvatarSrc(profileImagePath) {
  const value = String(profileImagePath || "").trim();
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
}

function getProofImageSrc(proofImagePath) {
  const value = String(proofImagePath || "").trim();
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
}

function getBonusProofState(bonusStatus, bonusType) {
  const prefix = `${bonusType}Proof`;
  const uploaded = Boolean(bonusStatus?.[`${prefix}Uploaded`]);
  const validated = Boolean(bonusStatus?.[`${prefix}Validated`]);
  const revoked = Boolean(bonusStatus?.[`${prefix}Revoked`]);
  const imagePath = getProofImageSrc(bonusStatus?.[`${prefix}ImagePath`]);

  if (!uploaded) {
    return { label: "No proof", tone: "neutral", action: null, actionLabel: null, imagePath, uploaded, validated, revoked };
  }

  if (revoked) {
    return { label: "Revoked", tone: "danger", action: "validate", actionLabel: "Validate", imagePath, uploaded, validated, revoked };
  }

  if (validated) {
    return { label: "Validated", tone: "success", action: "revoke", actionLabel: "Revoke", imagePath, uploaded, validated, revoked };
  }

  return { label: "Uploaded", tone: "info", action: "validate", actionLabel: "Validate", imagePath, uploaded, validated, revoked };
}

function getBonusBadgeStyle(tone) {
  if (tone === "success") {
    return {
      background: "rgba(34, 197, 94, 0.12)",
      border: "1px solid rgba(34, 197, 94, 0.2)",
      color: "#14532d",
    };
  }

  if (tone === "danger") {
    return {
      background: "rgba(239, 68, 68, 0.12)",
      border: "1px solid rgba(239, 68, 68, 0.2)",
      color: "#7f1d1d",
    };
  }

  if (tone === "info") {
    return {
      background: "rgba(0, 217, 255, 0.12)",
      border: "1px solid rgba(0, 217, 255, 0.2)",
      color: "#0f766e",
    };
  }

  return {
    background: "rgba(148, 163, 184, 0.16)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    color: "#475569",
  };
}

export default function RegisteredPlayersTable({ players = [], isLoading = false, onBonusAction, bonusActionKey = "", onDeletePlayer, onDeleteAllPlayers, isDeletingPlayers = false }) {
  const [revokeConfirm, setRevokeConfirm] = useState({ isOpen: false, playerId: null, bonusType: "", label: "" });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, playerId: null, playerName: "" });
  const [profileImageViewer, setProfileImageViewer] = useState({ isOpen: false, imageSrc: "", playerName: "" });
  const totalPlayers = players.length;
  const consentedPlayers = players.filter((player) => player.facebookWinnerContactConsent).length;
  const playersWithScores = players.filter((player) => (player.highestScore || 0) > 0).length;

  const openProofImage = (imagePath) => {
    if (!imagePath) return;
    const popup = window.open(imagePath, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.href = imagePath;
    }
  };

  const openProfileImageViewer = (imageSrc, playerName) => {
    if (!imageSrc) return;
    setProfileImageViewer({
      isOpen: true,
      imageSrc,
      playerName
    });
  };

  const requestRevokeProof = (player, bonusType) => {
    if (!onBonusAction) return;
    setRevokeConfirm({
      isOpen: true,
      playerId: player.id,
      bonusType,
      label: `${player.username || player.fullName || `#${player.id}`} · ${bonusType === "follow" ? "Follow" : "Review"} proof`
    });
  };

  const confirmRevokeProof = async () => {
    if (!revokeConfirm.playerId || !onBonusAction) return;
    const { playerId, bonusType } = revokeConfirm;
    setRevokeConfirm({ isOpen: false, playerId: null, bonusType: "", label: "" });
    await onBonusAction(playerId, bonusType, "revoke");
  };

  const requestDeletePlayer = (player) => {
    if (!onDeletePlayer) return;
    setDeleteConfirm({
      isOpen: true,
      playerId: player.id,
      playerName: player.username || player.fullName || `#${player.id}`
    });
  };

  const confirmDeletePlayer = async () => {
    if (!deleteConfirm.playerId || !onDeletePlayer) return;
    const playerId = deleteConfirm.playerId;
    setDeleteConfirm({ isOpen: false, playerId: null, playerName: "" });
    await onDeletePlayer(playerId);
  };

  return (
    <section className="admin-subsection">
      <div className="section-head">
        <div className="admin-section-heading-copy">
          <h3>Registered Players</h3>
          <p className="field-hint" style={{ margin: 0 }}>
            Customers who signed up for the giveaway-style game.
          </p>
        </div>

        <div className="giveaway-player-actions-head">
          <div className="giveaway-player-summary-row">
            <span className="giveaway-player-summary-chip is-total">
              Total: {totalPlayers}
            </span>
            <span className="giveaway-player-summary-chip is-success">
              Consent given: {consentedPlayers}
            </span>
            <span className="giveaway-player-summary-chip is-accent">
              With scores: {playersWithScores}
            </span>
          </div>
          {onDeleteAllPlayers && totalPlayers > 0 ? (
            <button
              type="button"
              className="btn-delete"
              onClick={onDeleteAllPlayers}
              disabled={isDeletingPlayers}
              title="Delete all registered players"
            >
              Delete All Players
            </button>
          ) : null}
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table giveaway-players-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Profile</th>
              <th>Username</th>
              <th>Full Name</th>
              <th>Score</th>
              <th>Level</th>
              <th>Lines</th>
              <th>Games</th>
              <th>Last Played</th>
              <th>Consent</th>
              <th>Proofs</th>
              <th>Action</th>
              <th>Delete</th>
              <th>Registered</th>
            </tr>
          </thead>
           <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={14} style={{ textAlign: "center" }}>
                  Loading registered players...
                </td>
              </tr>
            ) : players.length ? (
              players.map((player) => {
                const avatarSrc = getAvatarSrc(player.profileImagePath);
                const displayName = (player.fullName || player.username || "Player").trim();
                const initials = getInitials(displayName);
                const bonusStatus = player.bonusStatus || {};
                const followState = getBonusProofState(bonusStatus, "follow");
                const reviewState = getBonusProofState(bonusStatus, "review");
                const isRevokedRow = followState.revoked || reviewState.revoked;

                const renderActionButton = (bonusType, state) => {
                  if (!state.action || !onBonusAction) return null;

                  const actionKey = `${player.id}:${bonusType}:${state.action}`;
                  const isBusy = bonusActionKey === actionKey;
                  const buttonClassName = ["admin-action-btn", "giveaway-player-action-btn", state.action === "revoke" ? "btn-delete" : "btn-primary"].join(" ");

                   if (state.action === "revoke") {
                     return (
                       <button
                         type="button"
                         className={buttonClassName}
                         onClick={() => requestRevokeProof(player, bonusType, state)}
                         disabled={Boolean(bonusActionKey) && !isBusy}
                         style={{ marginTop: 0, opacity: isBusy ? 0.72 : 1 }}
                       >
                         {isBusy ? `${state.actionLabel}...` : state.actionLabel}
                       </button>
                     );
                   }

                   return (
                     <button
                       type="button"
                       className={buttonClassName}
                       onClick={() => onBonusAction(player.id, bonusType, state.action)}
                       disabled={Boolean(bonusActionKey) && !isBusy}
                       style={{ marginTop: 0, opacity: isBusy ? 0.72 : 1 }}
                     >
                       {isBusy ? `${state.actionLabel}...` : state.actionLabel}
                     </button>
                   );
                };

                return (
                  <tr key={player.id} style={isRevokedRow ? { background: "rgba(239, 68, 68, 0.06)" } : undefined}>
                    <td>
                      <span className={["giveaway-player-rank-chip", player.rank ? "is-ranked" : ""].filter(Boolean).join(" ")}>
                        {player.rank ? `#${player.rank}` : "—"}
                      </span>
                    </td>
                    <td>
                      <div className="giveaway-player-profile-cell">
                        {avatarSrc ? (
                          <button
                            type="button"
                            className="giveaway-player-profile-button"
                            onClick={() => openProfileImageViewer(avatarSrc, displayName)}
                            title={`Click to view ${displayName}'s profile image`}
                          >
                            <img src={avatarSrc} alt={displayName} className="giveaway-player-profile-image" />
                          </button>
                        ) : (
                          <div className="giveaway-player-profile-empty">
                            <span>{initials}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="giveaway-player-user-cell">
                        <span className="giveaway-player-user-name">{player.username}</span>
                        <span className="giveaway-player-user-meta">ID #{player.id}</span>
                      </div>
                    </td>
                    <td><span className="giveaway-player-strong-text">{player.fullName || "—"}</span></td>
                    <td><strong className="giveaway-player-strong-text">{(player.highestScore || 0).toLocaleString()}</strong></td>
                    <td><strong className="giveaway-player-strong-text">{player.highestLevel || 1}</strong></td>
                    <td><strong className="giveaway-player-strong-text">{(player.totalLinesCleared || 0).toLocaleString()}</strong></td>
                    <td><strong className="giveaway-player-strong-text">{(player.totalGames || 0).toLocaleString()}</strong></td>
                    <td>
                      <div className="giveaway-player-date-cell">
                        <span className="giveaway-player-strong-text">{formatDateTime(player.lastPlayed)}</span>
                        <span className="giveaway-player-muted-text">Most recent run</span>
                      </div>
                    </td>
                    <td>
                      <span className={["giveaway-player-consent-chip", player.facebookWinnerContactConsent ? "is-yes" : "is-no"].filter(Boolean).join(" ")}>
                        {player.facebookWinnerContactConsent ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>
                      <div className="giveaway-player-proof-list">
                        {[
                          { key: "follow", state: followState, title: "Follow" },
                          { key: "review", state: reviewState, title: "Review" }
                        ].map(({ key, state, title }) => (
                          <div key={key} className="giveaway-player-proof-row">
                            <span className="giveaway-player-proof-title">{title}</span>
                            <span className="giveaway-player-proof-badge" style={getBonusBadgeStyle(state.tone)}>{state.label}</span>
                            <div className="giveaway-player-proof-actions">
                              {state.imagePath ? (
                                <button
                                  type="button"
                                  className="button-secondary giveaway-player-proof-btn"
                                  onClick={() => openProofImage(state.imagePath, title)}
                                >
                                  View
                                </button>
                              ) : (
                                <span className="giveaway-player-muted-text">No image</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="giveaway-player-actions">
                        {followState.action ? renderActionButton("follow", followState) : <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>}
                        {reviewState.action ? renderActionButton("review", reviewState) : <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>}
                      </div>
                    </td>
                    <td>
                      {onDeletePlayer ? (
                        <button
                          type="button"
                          className="admin-action-btn btn-delete"
                          onClick={() => requestDeletePlayer(player)}
                          disabled={isDeletingPlayers}
                          title={`Delete ${player.username}`}
                        >
                          Delete
                        </button>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="giveaway-player-date-cell">
                        <span className="giveaway-player-strong-text">{formatDateTime(player.createdAt)}</span>
                        <span className={["giveaway-player-muted-text", player.enabled ? "" : "is-danger"].filter(Boolean).join(" ")}>{player.enabled ? "Active account" : "Disabled account"}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={14} style={{ textAlign: "center" }}>No registered players yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmActionModal
        isOpen={revokeConfirm.isOpen}
        title="Revoke Proof"
        description="Are you sure you want to revoke this proof? The player will see the revoked status and a re-upload prompt right away."
        targetLabel={revokeConfirm.label}
        confirmLabel="Revoke Proof"
        onCancel={() => setRevokeConfirm({ isOpen: false, playerId: null, bonusType: "", label: "" })}
        onConfirm={() => confirmRevokeProof().catch(() => setRevokeConfirm({ isOpen: false, playerId: null, bonusType: "", label: "" }))}
      />

      <ConfirmActionModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Player"
        description="Are you sure you want to delete this player? This action cannot be undone. The player account, game stats, and all related data will be permanently removed."
        targetLabel={deleteConfirm.playerName}
        confirmLabel="Delete Player"
        onCancel={() => setDeleteConfirm({ isOpen: false, playerId: null, playerName: "" })}
        onConfirm={() => confirmDeletePlayer().catch(() => setDeleteConfirm({ isOpen: false, playerId: null, playerName: "" }))}
      />

      {profileImageViewer.isOpen ? (
        <div className="modal-overlay" onClick={() => setProfileImageViewer({ isOpen: false, imageSrc: "", playerName: "" })}>
          <div className="modal-panel profile-image-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-image-viewer-head">
              <h3>{profileImageViewer.playerName}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setProfileImageViewer({ isOpen: false, imageSrc: "", playerName: "" })}
                aria-label="Close profile image"
              >
                ✕
              </button>
            </div>
            <div className="profile-image-viewer-body">
              <img
                src={profileImageViewer.imageSrc}
                alt={profileImageViewer.playerName}
                className="profile-image-viewer-image"
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
