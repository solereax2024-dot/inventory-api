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
  const validationMessage = String(bonusStatus?.[`${prefix}ValidationMessage`] || "").trim();

  if (!uploaded) {
    return { label: "No proof", tone: "neutral", action: null, actionLabel: null, imagePath, uploaded, validated, revoked, validationMessage };
  }

  if (revoked) {
    return { label: "Revoked", tone: "danger", action: "validate", actionLabel: "Validate", imagePath, uploaded, validated, revoked, validationMessage };
  }

  if (validated) {
    return { label: "Validated", tone: "success", action: "revoke", actionLabel: "Revoke", imagePath, uploaded, validated, revoked, validationMessage };
  }

  return { label: "Uploaded", tone: "info", action: "validate", actionLabel: "Validate", imagePath, uploaded, validated, revoked, validationMessage };
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

function getModerationTone(status) {
  const normalizedStatus = String(status || "NORMAL").toUpperCase();
  if (normalizedStatus === "DISQUALIFIED") return "danger";
  if (normalizedStatus === "ANOMALY_DETECTED") return "info";
  return "success";
}

function getModerationLabel(status) {
  const normalizedStatus = String(status || "NORMAL").toUpperCase();
  if (normalizedStatus === "DISQUALIFIED") return "Disqualified";
  if (normalizedStatus === "ANOMALY_DETECTED") return "Anomaly Detected";
  return "Normal";
}

export default function RegisteredPlayersTable({ players = [], totalRegisteredPlayers: totalRegisteredPlayersProp, isLoading = false, onBonusAction, bonusActionKey = "", onDeletePlayer, onDeleteAllPlayers, isDeletingPlayers = false, onProfileImageAction, profileImageActionKey = "", onSendPlayerNotification, onBroadcastNotification, notificationActionKey = "", onModerationAction, moderationActionKey = "", onLoadModerationHistory }) {
  const [revokeConfirm, setRevokeConfirm] = useState({ isOpen: false, playerId: null, bonusType: "", label: "", message: "" });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, playerId: null, playerName: "" });
  const [profileImageViewer, setProfileImageViewer] = useState({ isOpen: false, imageSrc: "", playerName: "", imageAlt: "" });
  const [profileImageReject, setProfileImageReject] = useState({ isOpen: false, playerId: null, message: "", playerName: "" });
  const [messageComposer, setMessageComposer] = useState({ isOpen: false, isBroadcast: false, playerId: null, playerName: "", title: "", message: "" });
  const [moderationConfirm, setModerationConfirm] = useState({
    isOpen: false,
    playerId: null,
    playerName: "",
    status: "NORMAL",
    reason: "",
    requiresReason: false,
  });
  const [moderationHistoryModal, setModerationHistoryModal] = useState({
    isOpen: false,
    playerName: "",
    loading: false,
    entries: [],
    error: "",
  });
  const totalPlayers = players.length;
  const totalRegisteredPlayers = Number.isFinite(totalRegisteredPlayersProp) ? totalRegisteredPlayersProp : totalPlayers;
  const consentedPlayers = players.filter((player) => player.facebookWinnerContactConsent).length;
  const playersWithScores = players.filter((player) => (player.totalScore || 0) > 0).length;

  const openImageViewer = (imagePath, playerName, imageAlt = "") => {
    if (!imagePath) return;
    setProfileImageViewer({
      isOpen: true,
      imageSrc: imagePath,
      playerName,
      imageAlt: imageAlt || playerName,
    });
  };

  const requestRevokeProof = (player, bonusType) => {
    if (!onBonusAction) return;
    setRevokeConfirm({
      isOpen: true,
      playerId: player.id,
      bonusType,
      label: `${player.username || player.fullName || `#${player.id}`} · ${bonusType === "follow" ? "Follow" : "Review"} proof`,
      message: ""
    });
  };

  const confirmRevokeProof = async () => {
    if (!revokeConfirm.playerId || !onBonusAction) return;
    const { playerId, bonusType, message } = revokeConfirm;
    setRevokeConfirm({ isOpen: false, playerId: null, bonusType: "", label: "", message: "" });
    await onBonusAction(playerId, bonusType, "revoke", message);
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

   const requestRejectProfileImage = (player) => {
     if (!onProfileImageAction) return;
     setProfileImageReject({
       isOpen: true,
       playerId: player.id,
       playerName: player.username || player.fullName || `#${player.id}`,
       message: ""
     });
   };

   const confirmRejectProfileImage = async () => {
     if (!profileImageReject.playerId || !onProfileImageAction) return;
     const { playerId, message } = profileImageReject;
     setProfileImageReject({ isOpen: false, playerId: null, message: "", playerName: "" });
     await onProfileImageAction(playerId, "reject", message);
   };

   const handleValidateProfileImage = async (playerId) => {
     if (!onProfileImageAction) return;
     await onProfileImageAction(playerId, "validate");
   };

   const openPlayerMessageComposer = (player) => {
     if (!onSendPlayerNotification) return;
     setMessageComposer({
       isOpen: true,
       isBroadcast: false,
       playerId: player.id,
       playerName: player.username || player.fullName || `#${player.id}`,
       title: "",
       message: ""
     });
   };

   const openBroadcastComposer = () => {
     if (!onBroadcastNotification) return;
     setMessageComposer({
       isOpen: true,
       isBroadcast: true,
       playerId: null,
       playerName: "All active giveaway players",
       title: "",
       message: ""
     });
   };

   const confirmSendMessage = async () => {
     const payload = {
       title: messageComposer.title,
       message: messageComposer.message,
     };

     if (messageComposer.isBroadcast) {
       if (!onBroadcastNotification) return;
       await onBroadcastNotification(payload);
     } else {
       if (!messageComposer.playerId || !onSendPlayerNotification) return;
       await onSendPlayerNotification(messageComposer.playerId, payload);
     }

     setMessageComposer({ isOpen: false, isBroadcast: false, playerId: null, playerName: "", title: "", message: "" });
   };

  const requestModerationAction = (player, status) => {
    if (!onModerationAction) return;
    const normalizedStatus = String(status || "NORMAL").toUpperCase();
    const requiresReason = normalizedStatus !== "NORMAL";
    setModerationConfirm({
      isOpen: true,
      playerId: player.id,
      playerName: player.username || player.fullName || `#${player.id}`,
      status: normalizedStatus,
      reason: "",
      requiresReason,
    });
  };

  const confirmModerationAction = async () => {
    if (!moderationConfirm.playerId || !onModerationAction) return;
    const { playerId, status, reason, requiresReason } = moderationConfirm;
    if (requiresReason && !reason.trim()) return;

    setModerationConfirm({ isOpen: false, playerId: null, playerName: "", status: "NORMAL", reason: "", requiresReason: false });
    await onModerationAction(playerId, status, reason);
  };

  const openModerationHistory = async (player) => {
    if (!onLoadModerationHistory) return;

    const playerName = player.username || player.fullName || `#${player.id}`;
    setModerationHistoryModal({
      isOpen: true,
      playerName,
      loading: true,
      entries: [],
      error: "",
    });

    try {
      const data = await onLoadModerationHistory(player.id);
      setModerationHistoryModal({
        isOpen: true,
        playerName,
        loading: false,
        entries: Array.isArray(data) ? data : [],
        error: "",
      });
    } catch (error) {
      setModerationHistoryModal({
        isOpen: true,
        playerName,
        loading: false,
        entries: [],
        error: error?.message || "Unable to load moderation history.",
      });
    }
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
              Registered: {totalRegisteredPlayers}
            </span>
            <span className="giveaway-player-summary-chip is-success">
              Consent given: {consentedPlayers}
            </span>
            <span className="giveaway-player-summary-chip is-accent">
              With scores: {playersWithScores}
            </span>
            {totalRegisteredPlayers !== totalPlayers ? (
              <span className="giveaway-player-summary-chip is-muted">
                Top 10 shown: {totalPlayers}
              </span>
            ) : null}
          </div>

          {onBroadcastNotification || (onDeleteAllPlayers && totalPlayers > 0) ? (
            <div className="giveaway-player-actions-toolbar">
              {onBroadcastNotification ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={openBroadcastComposer}
                  disabled={notificationActionKey === "broadcast"}
                  title="Send a message to all active giveaway players"
                >
                  {notificationActionKey === "broadcast" ? "Sending Broadcast..." : "Broadcast Message"}
                </button>
              ) : null}
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
               <th>Bonus Points</th>
                <th>Total Score</th>
               <th>Last Played</th>
               <th>Consent</th>
                <th>Proofs</th>
                   <th>Action</th>
                 <th>Notify</th>
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
                const moderationStatus = String(player.tetrisModerationStatus || "NORMAL").toUpperCase();
                const moderationLabel = getModerationLabel(moderationStatus);
                const moderationTone = getModerationTone(moderationStatus);
                const moderationReason = String(player.tetrisModerationReason || "").trim();

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
                      <div className="giveaway-player-profile-cell is-detailed is-stacked">
                        <span
                          className="giveaway-player-proof-badge giveaway-player-profile-status"
                          style={getBonusBadgeStyle(player.profileImageValidated ? "success" : player.profileImageValidationMessage ? "danger" : "info")}
                          title={player.profileImageValidationMessage || "Profile image status"}
                        >
                          {player.profileImageValidated ? "Approved" : player.profileImageValidationMessage ? "Rejected" : "Pending"}
                        </span>

                        {avatarSrc ? (
                          <button
                            type="button"
                            className="giveaway-player-profile-button"
                            onClick={() => openImageViewer(avatarSrc, displayName, `${displayName} profile image`)}
                            title={`Click to view ${displayName}'s profile image`}
                          >
                            <img src={avatarSrc} alt={displayName} className="giveaway-player-profile-image" />
                          </button>
                        ) : (
                          <div className="giveaway-player-profile-empty">
                            <span>{initials}</span>
                          </div>
                        )}

                        <div className="giveaway-player-profile-actions">
                          {onProfileImageAction ? (
                            <>
                              <button
                                type="button"
                                className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn"
                                onClick={() => handleValidateProfileImage(player.id)}
                                disabled={Boolean(profileImageActionKey) && profileImageActionKey !== `${player.id}:validate`}
                                style={{ opacity: profileImageActionKey === `${player.id}:validate` ? 0.72 : 1 }}
                                title="Approve this profile image"
                              >
                                <span className="btn-label">{profileImageActionKey === `${player.id}:validate` ? "Approving..." : "Approve"}</span>
                                <span className="btn-icon">✓</span>
                              </button>
                              <button
                                type="button"
                                className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn btn-delete"
                                onClick={() => requestRejectProfileImage(player)}
                                disabled={Boolean(profileImageActionKey)}
                                title="Reject this profile image"
                              >
                                <span className="btn-label">Reject</span>
                                <span className="btn-icon">✕</span>
                              </button>
                            </>
                          ) : null}
                        </div>
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
                    <td><strong className="giveaway-player-strong-text">{(player.totalBonusPoints || 0).toLocaleString()}</strong></td>
                    <td><strong className="giveaway-player-strong-text">{(player.totalScore || 0).toLocaleString()}</strong></td>
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
                            { key: "comment", state: getBonusProofState(bonusStatus, "comment"), title: "Comment" },
                            { key: "follow", state: followState, title: "Follow" },
                            { key: "review", state: reviewState, title: "Review" }
                          ].map(({ key, state, title }) => (
                            <div key={key} className="giveaway-player-proof-row is-stacked">
                              <span className="giveaway-player-proof-title">{title}</span>
                              <span
                                className="giveaway-player-proof-badge giveaway-player-proof-status"
                                style={getBonusBadgeStyle(state.tone)}
                                title={state.validationMessage || `${title} proof status`}
                              >
                                {state.label}
                              </span>
                              {state.imagePath ? (
                                <button
                                  type="button"
                                  className="giveaway-player-proof-thumbnail-button"
                                  onClick={() => openImageViewer(state.imagePath, `${displayName} · ${title} proof`, `${title} proof for ${displayName}`)}
                                  title={`View ${title.toLowerCase()} proof for ${displayName}`}
                                >
                                  <img
                                    src={state.imagePath}
                                    alt={`${title} proof for ${displayName}`}
                                    className="giveaway-player-proof-thumbnail"
                                  />
                                </button>
                              ) : (
                                <span className="giveaway-player-muted-text giveaway-player-proof-empty" title={`No ${title.toLowerCase()} proof uploaded`}>No image</span>
                              )}
                                <div className="giveaway-player-proof-actions giveaway-player-proof-actions-grid tetris-moderation-actions">
                                {onBonusAction && state.uploaded ? (
                                  <>
                                    <button
                                      type="button"
                                      className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn"
                                      onClick={() => onBonusAction(player.id, key, "validate")}
                                      disabled={Boolean(bonusActionKey) && bonusActionKey !== `${player.id}:${key}:validate`}
                                      style={{ opacity: bonusActionKey === `${player.id}:${key}:validate` ? 0.72 : 1 }}
                                      title="Approve this proof"
                                    >
                                      <span className="btn-label">{bonusActionKey === `${player.id}:${key}:validate` ? "Approving..." : "Approve"}</span>
                                      <span className="btn-icon">✓</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn btn-delete"
                                      onClick={() => requestRevokeProof(player, key)}
                                      disabled={Boolean(bonusActionKey)}
                                      title="Reject this proof"
                                    >
                                      <span className="btn-label">Reject</span>
                                      <span className="btn-icon">✕</span>
                                    </button>
                                  </>
                                ) : null}
                                  {onLoadModerationHistory ? (
                                    <button
                                      type="button"
                                      className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn tetris-moderation-history-btn"
                                      onClick={() => openModerationHistory(player)}
                                      title="View moderation history"
                                    >
                                      <span className="btn-label">History</span>
                                    </button>
                                  ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                     <td>
                       <div className="giveaway-player-proof-list">
                         <div className="giveaway-player-proof-row is-stacked">
                           <span className="giveaway-player-proof-title">Status</span>
                           <span
                             className="giveaway-player-proof-badge giveaway-player-proof-status"
                             style={getBonusBadgeStyle(moderationTone)}
                             title={moderationReason || "Tetris moderation status"}
                           >
                             {moderationLabel}
                           </span>
                           <div className="giveaway-player-proof-actions giveaway-player-proof-actions-grid">
                             {onModerationAction ? (
                               <>
                                 <button
                                   type="button"
                                   className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn"
                                   onClick={() => requestModerationAction(player, "ANOMALY_DETECTED")}
                                   disabled={Boolean(moderationActionKey) || moderationStatus === "ANOMALY_DETECTED"}
                                   title="Mark player as anomaly detected"
                                 >
                                   <span className="btn-label">Anomaly</span>
                                 </button>
                                 <button
                                   type="button"
                                   className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn btn-delete"
                                   onClick={() => requestModerationAction(player, "DISQUALIFIED")}
                                   disabled={Boolean(moderationActionKey) || moderationStatus === "DISQUALIFIED"}
                                   title="Disqualify player from Tetris"
                                 >
                                   <span className="btn-label">Disqualify</span>
                                 </button>
                                 <button
                                   type="button"
                                   className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn"
                                   onClick={() => requestModerationAction(player, "NORMAL")}
                                   disabled={Boolean(moderationActionKey) || moderationStatus === "NORMAL"}
                                   title="Restore player access"
                                 >
                                   <span className="btn-label">Restore</span>
                                 </button>
                               </>
                             ) : null}
                           </div>
                           {moderationReason ? (
                             <span className="giveaway-player-muted-text" title={moderationReason}>{moderationReason}</span>
                           ) : null}
                         </div>
                       </div>
                     </td>
                     <td>
                       {onSendPlayerNotification ? (
                        <button
                          type="button"
                          className="admin-action-btn button-secondary"
                          onClick={() => openPlayerMessageComposer(player)}
                          disabled={Boolean(notificationActionKey)}
                          title={`Send a custom message to ${player.username}`}
                        >
                          {notificationActionKey === `player:${player.id}` ? "Sending..." : "Message"}
                        </button>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                      )}
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

      {revokeConfirm.isOpen ? (
        <div className="modal-overlay" onClick={() => setRevokeConfirm({ isOpen: false, playerId: null, bonusType: "", label: "", message: "" })}>
          <div className="modal-panel confirm-action-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-action-head">
              <h3>Revoke Proof</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRevokeConfirm({ isOpen: false, playerId: null, bonusType: "", label: "", message: "" })}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="confirm-action-body">
              <p className="confirm-action-target">{revokeConfirm.label}</p>
              <p className="confirm-action-copy">Explain why this proof was revoked so the player knows what to fix before re-uploading.</p>
              <label className="confirm-action-field">
                <span>Reason</span>
              <textarea
                value={revokeConfirm.message}
                onChange={(e) => setRevokeConfirm({ ...revokeConfirm, message: e.target.value })}
                placeholder="Example: The screenshot does not clearly show your account follow status. Please upload a clearer image."
                className="confirm-action-textarea"
              />
              </label>
            </div>
            <div className="confirm-action-footer modal-sticky-footer">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setRevokeConfirm({ isOpen: false, playerId: null, bonusType: "", label: "", message: "" })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-action-danger-btn"
                onClick={confirmRevokeProof}
                disabled={Boolean(bonusActionKey) || !revokeConfirm.message.trim()}
              >
                {bonusActionKey === `${revokeConfirm.playerId}:${revokeConfirm.bonusType}:revoke` ? "Revoking..." : "Revoke Proof"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
         <div className="modal-overlay" onClick={() => setProfileImageViewer({ isOpen: false, imageSrc: "", playerName: "", imageAlt: "" })}>
           <div className="modal-panel profile-image-viewer-modal" onClick={(e) => e.stopPropagation()}>
             <div className="profile-image-viewer-head">
               <h3>{profileImageViewer.playerName}</h3>
               <button
                 type="button"
                 className="modal-close-btn"
                  onClick={() => setProfileImageViewer({ isOpen: false, imageSrc: "", playerName: "", imageAlt: "" })}
                 aria-label="Close profile image"
               >
                 ✕
               </button>
             </div>
             <div className="profile-image-viewer-body">
               <img
                 src={profileImageViewer.imageSrc}
                  alt={profileImageViewer.imageAlt || profileImageViewer.playerName}
                 className="profile-image-viewer-image"
               />
             </div>
           </div>
         </div>
       ) : null}

       {profileImageReject.isOpen ? (
         <div className="modal-overlay" onClick={() => setProfileImageReject({ isOpen: false, playerId: null, message: "", playerName: "" })}>
           <div className="modal-panel confirm-action-modal" onClick={(e) => e.stopPropagation()}>
             <div className="confirm-action-head">
               <h3>Reject Profile Image</h3>
               <button
                 type="button"
                 className="modal-close-btn"
                 onClick={() => setProfileImageReject({ isOpen: false, playerId: null, message: "", playerName: "" })}
                 aria-label="Close modal"
               >
                 ✕
               </button>
             </div>
              <div className="confirm-action-body">
                <p className="confirm-action-target">{profileImageReject.playerName}</p>
                <p className="confirm-action-copy">Send a message to the player explaining why their image was rejected.</p>
                <label className="confirm-action-field">
                  <span>Reason</span>
               <textarea
                 value={profileImageReject.message}
                 onChange={(e) => setProfileImageReject({ ...profileImageReject, message: e.target.value })}
                 placeholder="Example: The image is not clearly visible. Please upload a clearer photo of your Facebook profile."
                  className="confirm-action-textarea"
               />
                </label>
             </div>
              <div className="confirm-action-footer modal-sticky-footer">
               <button
                 type="button"
                  className="button-secondary"
                 onClick={() => setProfileImageReject({ isOpen: false, playerId: null, message: "", playerName: "" })}
               >
                 Cancel
               </button>
               <button
                 type="button"
                  className="confirm-action-danger-btn"
                 onClick={confirmRejectProfileImage}
                  disabled={Boolean(profileImageActionKey) || !profileImageReject.message.trim()}
               >
                 {profileImageActionKey === `${profileImageReject.playerId}:reject` ? "Rejecting..." : "Reject Image"}
               </button>
             </div>
           </div>
         </div>
       ) : null}

       {messageComposer.isOpen ? (
         <div className="modal-overlay" onClick={() => setMessageComposer({ isOpen: false, isBroadcast: false, playerId: null, playerName: "", title: "", message: "" })}>
           <div className="modal-panel confirm-action-modal" onClick={(e) => e.stopPropagation()}>
             <div className="modal-head">
               <h3>{messageComposer.isBroadcast ? "Broadcast Message" : "Send Custom Message"}</h3>
               <button
                 type="button"
                 className="modal-close-btn"
                 onClick={() => setMessageComposer({ isOpen: false, isBroadcast: false, playerId: null, playerName: "", title: "", message: "" })}
                 aria-label="Close modal"
               >
                 ✕
               </button>
             </div>
             <div className="modal-body">
               <p>
                 <strong>Target:</strong> {messageComposer.playerName}
               </p>
               {messageComposer.isBroadcast ? (
                 <p>This message will be delivered to all active giveaway players, including players not shown in the current top 10 table.</p>
               ) : (
                 <p>Send a direct admin message to this player. It will appear in their player notification feed.</p>
               )}
               <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                 <span style={{ fontWeight: 600 }}>Title</span>
                 <input
                   type="text"
                   value={messageComposer.title}
                   onChange={(e) => setMessageComposer({ ...messageComposer, title: e.target.value })}
                   placeholder="Example: Profile reminder"
                   style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
                 />
               </label>
               <label style={{ display: "grid", gap: 6 }}>
                 <span style={{ fontWeight: 600 }}>Message</span>
                 <textarea
                   value={messageComposer.message}
                   onChange={(e) => setMessageComposer({ ...messageComposer, message: e.target.value })}
                   placeholder="Type the admin message that the player should see."
                   style={{ width: "100%", minHeight: "110px", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "inherit", fontSize: 14 }}
                 />
               </label>
             </div>
             <div className="modal-actions">
               <button
                 type="button"
                 className="btn-secondary"
                 onClick={() => setMessageComposer({ isOpen: false, isBroadcast: false, playerId: null, playerName: "", title: "", message: "" })}
               >
                 Cancel
               </button>
               <button
                 type="button"
                 className="btn-primary"
                 onClick={confirmSendMessage}
                 disabled={Boolean(notificationActionKey) || !messageComposer.title.trim() || !messageComposer.message.trim()}
               >
                 {notificationActionKey === (messageComposer.isBroadcast ? "broadcast" : `player:${messageComposer.playerId}`)
                   ? "Sending..."
                   : messageComposer.isBroadcast ? "Send Broadcast" : "Send Message"}
               </button>
             </div>
           </div>
         </div>
       ) : null}

       {moderationConfirm.isOpen ? (
         <div className="modal-overlay" onClick={() => setModerationConfirm({ isOpen: false, playerId: null, playerName: "", status: "NORMAL", reason: "", requiresReason: false })}>
           <div className="modal-panel confirm-action-modal" onClick={(e) => e.stopPropagation()}>
             <div className="confirm-action-head">
               <h3>Update Player Action</h3>
               <button
                 type="button"
                 className="modal-close-btn"
                 onClick={() => setModerationConfirm({ isOpen: false, playerId: null, playerName: "", status: "NORMAL", reason: "", requiresReason: false })}
                 aria-label="Close modal"
               >
                 ✕
               </button>
             </div>
             <div className="confirm-action-body">
               <p className="confirm-action-target">{moderationConfirm.playerName}</p>
               <p className="confirm-action-copy">Set status to <strong>{getModerationLabel(moderationConfirm.status)}</strong>.</p>
               <label className="confirm-action-field">
                 <span>{moderationConfirm.requiresReason ? "Reason (required)" : "Reason (optional)"}</span>
                 <textarea
                   value={moderationConfirm.reason}
                   onChange={(e) => setModerationConfirm({ ...moderationConfirm, reason: e.target.value })}
                   placeholder="Example: Run timing and gravity cadence indicates scripted slowdown."
                   className="confirm-action-textarea"
                 />
               </label>
             </div>
             <div className="confirm-action-footer modal-sticky-footer">
               <button
                 type="button"
                 className="button-secondary"
                 onClick={() => setModerationConfirm({ isOpen: false, playerId: null, playerName: "", status: "NORMAL", reason: "", requiresReason: false })}
               >
                 Cancel
               </button>
               <button
                 type="button"
                 className={moderationConfirm.status === "NORMAL" ? "btn-primary" : "confirm-action-danger-btn"}
                 onClick={confirmModerationAction}
                 disabled={Boolean(moderationActionKey) || (moderationConfirm.requiresReason && !moderationConfirm.reason.trim())}
               >
                 {moderationActionKey === `${moderationConfirm.playerId}:${moderationConfirm.status}` ? "Saving..." : "Save Action"}
               </button>
             </div>
           </div>
         </div>
       ) : null}

       {moderationHistoryModal.isOpen ? (
         <div className="modal-overlay" onClick={() => setModerationHistoryModal({ isOpen: false, playerName: "", loading: false, entries: [], error: "" })}>
           <div className="modal-panel confirm-action-modal tetris-moderation-history-modal" onClick={(e) => e.stopPropagation()}>
             <div className="confirm-action-head">
               <h3>Moderation History</h3>
               <button
                 type="button"
                 className="modal-close-btn"
                 onClick={() => setModerationHistoryModal({ isOpen: false, playerName: "", loading: false, entries: [], error: "" })}
                 aria-label="Close modal"
               >
                 ✕
               </button>
             </div>
             <div className="confirm-action-body">
               <p className="confirm-action-target">{moderationHistoryModal.playerName}</p>
               {moderationHistoryModal.loading ? <p className="giveaway-player-muted-text">Loading history...</p> : null}
               {!moderationHistoryModal.loading && moderationHistoryModal.error ? <p className="giveaway-player-muted-text is-danger">{moderationHistoryModal.error}</p> : null}
               {!moderationHistoryModal.loading && !moderationHistoryModal.error && moderationHistoryModal.entries.length === 0 ? (
                 <p className="giveaway-player-muted-text">No moderation actions recorded yet.</p>
               ) : null}
               {!moderationHistoryModal.loading && moderationHistoryModal.entries.length > 0 ? (
                 <div className="tetris-moderation-history-list">
                   {moderationHistoryModal.entries.map((entry) => (
                     <div key={entry.id} className="tetris-moderation-history-item">
                       <div className="tetris-moderation-history-row">
                         <strong>{entry.previousStatus || "NORMAL"} → {entry.newStatus || "NORMAL"}</strong>
                         <span>{formatDateTime(entry.actedAt)}</span>
                       </div>
                       <p>{entry.reason || "No reason provided."}</p>
                       <small>By: {entry.actedBy || "SYSTEM"}</small>
                     </div>
                   ))}
                 </div>
               ) : null}
             </div>
             <div className="confirm-action-footer modal-sticky-footer">
               <button
                 type="button"
                 className="button-secondary"
                 onClick={() => setModerationHistoryModal({ isOpen: false, playerName: "", loading: false, entries: [], error: "" })}
               >
                 Close
               </button>
             </div>
           </div>
         </div>
       ) : null}
     </section>
  );
}
