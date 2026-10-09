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

export default function RegisteredPlayersTable({ players = [], isLoading = false, onBonusAction, bonusActionKey = "" }) {
  const [revokeConfirm, setRevokeConfirm] = useState({ isOpen: false, playerId: null, bonusType: "", label: "" });
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

  return (
    <section className="admin-subsection">
      <div className="section-head">
        <div className="admin-section-heading-copy">
          <h3>Registered Players</h3>
          <p className="field-hint" style={{ margin: 0 }}>
            Customers who signed up for the giveaway-style game.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "flex-end" }}>
          <span style={{ display: "inline-flex", alignItems: "center", minHeight: "30px", padding: "0 0.8rem", borderRadius: "999px", background: "rgba(0, 217, 255, 0.12)", border: "1px solid rgba(0, 217, 255, 0.2)", color: "#0f172a", fontSize: "0.82rem", fontWeight: 700 }}>
            Total: {totalPlayers}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", minHeight: "30px", padding: "0 0.8rem", borderRadius: "999px", background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#14532d", fontSize: "0.82rem", fontWeight: 700 }}>
            Consent given: {consentedPlayers}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", minHeight: "30px", padding: "0 0.8rem", borderRadius: "999px", background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.2)", color: "#3730a3", fontSize: "0.82rem", fontWeight: 700 }}>
            With scores: {playersWithScores}
          </span>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table giveaway-players-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Username</th>
              <th>Full Name</th>
              <th>Highest Score</th>
              <th>Level</th>
              <th>Lines</th>
              <th>Games</th>
              <th>Last Played</th>
              <th>Contact Consent</th>
              <th>Bonus Proofs</th>
              <th>Action</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} style={{ textAlign: "center" }}>
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
                  const buttonClassName = ["admin-action-btn", state.action === "revoke" ? "btn-delete" : "btn-primary"].join(" ");

                  if (state.action === "revoke") {
                    return (
                      <button
                        type="button"
                        className={buttonClassName}
                        onClick={() => requestRevokeProof(player, bonusType, state)}
                        disabled={Boolean(bonusActionKey) && !isBusy}
                        style={{ marginTop: 0, opacity: isBusy ? 0.72 : 1 }}
                      >
                        {isBusy ? `${state.actionLabel}...` : `${state.actionLabel} ${bonusType === "follow" ? "Follow" : "Review"}`}
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
                      {isBusy ? `${state.actionLabel}...` : `${state.actionLabel} ${bonusType === "follow" ? "Follow" : "Review"}`}
                    </button>
                  );
                };

                return (
                  <tr key={player.id} style={isRevokedRow ? { background: "rgba(239, 68, 68, 0.06)" } : undefined}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "42px", minHeight: "32px", padding: "0 0.75rem", borderRadius: "999px", background: player.rank ? "rgba(251, 191, 36, 0.16)" : "rgba(148, 163, 184, 0.16)", border: `1px solid ${player.rank ? "rgba(251, 191, 36, 0.28)" : "rgba(148, 163, 184, 0.2)"}`, color: player.rank ? "#92400e" : "#475569", fontWeight: 800, fontSize: "0.82rem" }}>
                        {player.rank ? `#${player.rank}` : "—"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "12px", overflow: "hidden", flex: "0 0 auto", background: "linear-gradient(135deg, rgba(0, 217, 255, 0.18), rgba(124, 58, 237, 0.12))", border: "1px solid rgba(0, 217, 255, 0.18)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#0f172a", fontWeight: 800, fontSize: "0.8rem" }}>
                          {avatarSrc ? <img src={avatarSrc} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span>{initials}</span>}
                        </div>
                        <div style={{ display: "grid", gap: "0.15rem", minWidth: 0 }}>
                          <span style={{ fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis" }}>{player.username}</span>
                          <span style={{ fontSize: "0.78rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis" }}>ID #{player.id}</span>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontWeight: 700, color: "#0f172a" }}>{player.fullName || "—"}</span></td>
                    <td><strong style={{ color: "#0f172a" }}>{(player.highestScore || 0).toLocaleString()}</strong></td>
                    <td><strong style={{ color: "#0f172a" }}>{player.highestLevel || 1}</strong></td>
                    <td><strong style={{ color: "#0f172a" }}>{(player.totalLinesCleared || 0).toLocaleString()}</strong></td>
                    <td><strong style={{ color: "#0f172a" }}>{(player.totalGames || 0).toLocaleString()}</strong></td>
                    <td>
                      <div style={{ display: "grid", gap: "0.15rem" }}>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatDateTime(player.lastPlayed)}</span>
                        <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Most recent run</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", minHeight: "28px", padding: "0 0.75rem", borderRadius: "999px", background: player.facebookWinnerContactConsent ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)", border: `1px solid ${player.facebookWinnerContactConsent ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`, color: player.facebookWinnerContactConsent ? "#14532d" : "#7f1d1d", fontSize: "0.8rem", fontWeight: 700 }}>
                        {player.facebookWinnerContactConsent ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "grid", gap: "0.5rem" }}>
                        {[
                          { key: "follow", state: followState, title: "Follow" },
                          { key: "review", state: reviewState, title: "Review" }
                        ].map(({ key, state, title }) => (
                          <div key={key} style={{ display: "grid", gap: "0.35rem", padding: "0.5rem 0.65rem", borderRadius: "14px", background: "rgba(248, 250, 252, 0.95)", border: "1px solid rgba(148, 163, 184, 0.16)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>{title}</span>
                              <span style={{ display: "inline-flex", alignItems: "center", minHeight: "28px", padding: "0 0.75rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, ...getBonusBadgeStyle(state.tone) }}>{state.label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                              {state.imagePath ? (
                                <button
                                  type="button"
                                  className="button-secondary"
                                  onClick={() => openProofImage(state.imagePath, title)}
                                  style={{ marginTop: 0 }}
                                >
                                  View Image
                                </button>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No image</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="admin-actions-inline" style={{ flexWrap: "wrap", rowGap: "0.35rem", whiteSpace: "normal" }}>
                        {followState.action ? renderActionButton("follow", followState) : <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>}
                        {reviewState.action ? renderActionButton("review", reviewState) : <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "grid", gap: "0.15rem" }}>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatDateTime(player.createdAt)}</span>
                        <span style={{ fontSize: "0.78rem", color: player.enabled ? "#64748b" : "#b91c1c" }}>{player.enabled ? "Active account" : "Disabled account"}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={12} style={{ textAlign: "center" }}>No registered players yet.</td>
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
    </section>
  );
}
