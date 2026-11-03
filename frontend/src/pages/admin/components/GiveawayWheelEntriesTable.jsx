import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ConfirmActionModal } from "../../../components/modals/admin";
import {
  GIVEAWAY_WHEEL_PROOF_FIELDS,
  getGiveawayWheelImageSrc,
} from "../../../constants/giveawayWheel";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusClassName(status) {
  const normalized = String(status || "PENDING").toUpperCase();
  if (normalized === "APPROVED") return "is-approved";
  if (normalized === "REJECTED") return "is-rejected";
  return "is-pending";
}


function getProofStatusLabel(status) {
  const normalized = String(status || "PENDING").toUpperCase();
  if (normalized === "APPROVED") return "Approved";
  if (normalized === "REJECTED") return "Rejected";
  if (normalized === "NOT_UPLOADED") return "Not Uploaded";
  return "Pending";
}

function getProofBadgeStyle(status) {
  const normalized = String(status || "PENDING").toUpperCase();
  if (normalized === "APPROVED") {
    return {
      background: "rgba(34, 197, 94, 0.12)",
      border: "1px solid rgba(34, 197, 94, 0.2)",
      color: "#166534",
    };
  }
  if (normalized === "REJECTED") {
    return {
      background: "rgba(239, 68, 68, 0.12)",
      border: "1px solid rgba(239, 68, 68, 0.2)",
      color: "#991b1b",
    };
  }
  if (normalized === "NOT_UPLOADED") {
    return {
      background: "rgba(148, 163, 184, 0.12)",
      border: "1px solid rgba(148, 163, 184, 0.2)",
      color: "#475569",
    };
  }
  return {
    background: "rgba(245, 158, 11, 0.14)",
    border: "1px solid rgba(245, 158, 11, 0.22)",
    color: "#92400e",
  };
}

function getInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) return "GW";
  return words.map((word) => word.charAt(0).toUpperCase()).join("");
}

function getCompactWeightLabel(value) {
  const normalized = String(value || "").trim();
  const match = normalized.match(/^(\d+)/);
  if (match) {
    return `+${match[1]}`;
  }
  return normalized;
}

function getSourceTagLabel(sourceTag) {
  const normalized = String(sourceTag || "").trim().toUpperCase();
  if (normalized === "GIVEAWAY_1") return "G1";
  return String(sourceTag || "").trim();
}

function formatEntryDisplayName(fullName, sourceTag) {
  const baseName = String(fullName || "").trim() || "Guest";
  const sourceLabel = getSourceTagLabel(sourceTag);
  if (!sourceLabel) return baseName;
  return `${baseName}-${sourceLabel}`;
}

function getEntryProofStatuses(entry) {
  return IMAGE_COLUMNS.map((column) => String(entry?.[column.proofKey]?.status || "NOT_UPLOADED").toUpperCase());
}

function matchesProofFilter(entry, proofFilter) {
  if (proofFilter === "ALL") return true;

  const proofStatuses = getEntryProofStatuses(entry);
  if (proofFilter === "HAS_REJECTED") {
    return proofStatuses.includes("REJECTED");
  }
  if (proofFilter === "HAS_PENDING") {
    return proofStatuses.includes("PENDING");
  }
  if (proofFilter === "MISSING_UPLOAD") {
    return proofStatuses.includes("NOT_UPLOADED");
  }
  return true;
}

const PROOF_FIELD_BY_PATH_KEY = Object.fromEntries(
  GIVEAWAY_WHEEL_PROOF_FIELDS.map((field) => [field.pathKey, field])
);

const IMAGE_COLUMNS = [
  { key: "facebookProfileImagePath", proofKey: "facebookProfile", proofType: "profile", label: "FB Profile", weightLabel: "Required" },
  { key: "followProofImagePath", proofKey: "followProof", proofType: "follow", label: "Following", weightLabel: PROOF_FIELD_BY_PATH_KEY.followProofImagePath?.weightLabel || "1 entry" },
  { key: "commentProofImagePath", proofKey: "commentProof", proofType: "comment", label: "Tag Friend", weightLabel: PROOF_FIELD_BY_PATH_KEY.commentProofImagePath?.weightLabel || "2 entries" },
  { key: "shareProofImagePath", proofKey: "shareProof", proofType: "share", label: "Share Post", weightLabel: PROOF_FIELD_BY_PATH_KEY.shareProofImagePath?.weightLabel || "3 entries" },
  { key: "reviewProofImagePath", proofKey: "reviewProof", proofType: "review", label: "Review", weightLabel: PROOF_FIELD_BY_PATH_KEY.reviewProofImagePath?.weightLabel || "5 entries" },
];

export default function GiveawayWheelEntriesTable({
  entries = [],
  isLoading = false,
  actionKey = "",
  onApproveProof,
  onRejectProof,
  onClearEntries,
  onResetWinnerStatus,
  onDeleteEntry,
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [proofFilter, setProofFilter] = useState("ALL");
  const [imageViewer, setImageViewer] = useState({ isOpen: false, src: "", alt: "" });
  const [approveConfirm, setApproveConfirm] = useState({ isOpen: false, entry: null, proofType: "", proofLabel: "" });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, entry: null, proofType: "", proofLabel: "", message: "" });
  const [clearEntriesModal, setClearEntriesModal] = useState({ isOpen: false, challenge: "", error: "" });
  const [deleteEntryModal, setDeleteEntryModal] = useState({ isOpen: false, entry: null, challenge: "", error: "" });
  const [resetWinnerModal, setResetWinnerModal] = useState({ isOpen: false, entry: null });
  const [latestDrawAudit, setLatestDrawAudit] = useState(null);

  const isDrawingWinner = actionKey === "draw-wheel";
  const isShufflingWheel = actionKey === "shuffle-wheel";
  const isClearingEntries = actionKey === "clear-wheel-entries";
  const isResettingWinner = String(actionKey || "").startsWith("reset-winner-");
  const isWheelActionBusy = isDrawingWinner || isShufflingWheel || isResettingWinner;

  const filteredEntries = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesQuery = !keyword || String(entry.fullName || "").toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "ALL" || String(entry.status || "").toUpperCase() === statusFilter;
      const matchesProof = matchesProofFilter(entry, proofFilter);
      return matchesQuery && matchesStatus && matchesProof;
    });
  }, [entries, query, statusFilter, proofFilter]);

  const stats = useMemo(() => ({
    total: entries.length,
    approved: entries.filter((entry) => String(entry.status).toUpperCase() === "APPROVED").length,
    pending: entries.filter((entry) => String(entry.status).toUpperCase() === "PENDING").length,
    rejected: entries.filter((entry) => String(entry.status).toUpperCase() === "REJECTED").length,
  }), [entries]);

  const confirmApprove = async () => {
    if (!approveConfirm.entry || !approveConfirm.proofType || !onApproveProof) return;
    const entryId = approveConfirm.entry.id;
    const proofType = approveConfirm.proofType;
    setApproveConfirm({ isOpen: false, entry: null, proofType: "", proofLabel: "" });
    await onApproveProof(entryId, proofType);
  };

  const confirmReject = async () => {
    if (!rejectModal.entry || !rejectModal.proofType || !onRejectProof) return;
    const message = String(rejectModal.message || "").trim();
    if (!message) return;
    const entryId = rejectModal.entry.id;
    const proofType = rejectModal.proofType;
    setRejectModal({ isOpen: false, entry: null, proofType: "", proofLabel: "", message: "" });
    await onRejectProof(entryId, proofType, message);
  };

  const handleClearEntries = async () => {
    if (!onClearEntries || isClearingEntries) return;
    if (String(clearEntriesModal.challenge || "").trim().toUpperCase() !== "DELETE") {
      setClearEntriesModal((previous) => ({ ...previous, error: "Type DELETE to continue." }));
      return;
    }
    await onClearEntries();
    setClearEntriesModal({ isOpen: false, challenge: "", error: "" });
    setLatestDrawAudit(null);
  };

  const handleDeleteEntry = async () => {
    const entryId = deleteEntryModal.entry?.id;
    if (!entryId || !onDeleteEntry) return;
    if (String(deleteEntryModal.challenge || "").trim().toUpperCase() !== "DELETE") {
      setDeleteEntryModal((previous) => ({ ...previous, error: "Type DELETE to continue." }));
      return;
    }
    await onDeleteEntry(entryId);
    setDeleteEntryModal({ isOpen: false, entry: null, challenge: "", error: "" });
  };

  const handleResetWinnerStatus = async () => {
    const entryId = resetWinnerModal.entry?.id;
    if (!onResetWinnerStatus || !entryId) return;
    await onResetWinnerStatus(entryId);
    setResetWinnerModal({ isOpen: false, entry: null });
  };

  return (
    <section className="admin-subsection">
      <div className="section-head">
        <div className="admin-section-heading-copy">
          <h3>Giveaway 2 Entries</h3>
          <p className="field-hint" style={{ margin: 0 }}>
            Review public spin-the-wheel entries, approve valid uploads, or reject entries so users can correct them.
          </p>
        </div>

        <div className="giveaway-player-actions-head">
          <div className="giveaway-player-summary-row">
            <span className="giveaway-player-summary-chip is-total">Entries: {stats.total}</span>
            <span className="giveaway-player-summary-chip is-success">Approved: {stats.approved}</span>
            <span className="giveaway-player-summary-chip is-accent">Pending: {stats.pending}</span>
            <span className="giveaway-player-summary-chip is-muted">Rejected: {stats.rejected}</span>
          </div>
          <div className="giveaway-wheel-actions-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn-delete"
              onClick={() => setClearEntriesModal({ isOpen: true, challenge: "", error: "" })}
              disabled={isWheelActionBusy || isClearingEntries || !onClearEntries || entries.length === 0}
            >
              {isClearingEntries ? "Clearing..." : "Clean Up Joiners"}
            </button>
          </div>
          {latestDrawAudit ? (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                border: "1px solid #dbe5f2",
                borderRadius: 12,
                background: "#f8fafc",
                display: "grid",
                gap: 4,
              }}
            >
              <strong style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "#334155" }}>Draw Audit</strong>
              <small className="field-hint">Draw ID: {latestDrawAudit.drawId || "—"} • Winner: {latestDrawAudit.winnerFullName || "—"}</small>
              <small className="field-hint">
                Eligible entries: {Number(latestDrawAudit.eligibleEntryCount) || 0} • Total tickets: {Number(latestDrawAudit.totalTickets) || 0}
              </small>
              <small className="field-hint">
                Winning ticket: #{(Number(latestDrawAudit.winningTicketIndex) || 0) + 1} • Offset: {Number(latestDrawAudit.winnerTicketOffset) || 0}
              </small>
              <small className="field-hint">Drawn at: {formatDateTime(latestDrawAudit.drawnAt)}</small>
              <small className="field-hint" style={{ wordBreak: "break-all" }}>
                Snapshot hash: {latestDrawAudit.drawSnapshotHash || "—"}
              </small>
            </div>
          ) : null}
        </div>
      </div>

      <div className="admin-toolbar" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <label className="admin-search" style={{ position: "relative", minWidth: 260, flex: "1 1 320px" }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search full name"
            style={{ paddingLeft: 40 }}
          />
        </label>

        <label className="field" style={{ minWidth: 180 }}>
          <span className="field-hint" style={{ display: "block", marginBottom: 6 }}>Filter status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>

        <label className="field" style={{ minWidth: 220 }}>
          <span className="field-hint" style={{ display: "block", marginBottom: 6 }}>Filter proof review</span>
          <select value={proofFilter} onChange={(event) => setProofFilter(event.target.value)}>
            <option value="ALL">All proof states</option>
            <option value="HAS_REJECTED">May rejected proof</option>
            <option value="HAS_PENDING">May pending proof</option>
            <option value="MISSING_UPLOAD">May missing upload</option>
          </select>
        </label>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table giveaway-players-table giveaway-wheel-entries-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Total Entry</th>
              {IMAGE_COLUMNS.map((column) => <th key={column.key}>{column.label}</th>)}
              <th>Rejected Reason</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10}>Loading giveaway entries...</td>
              </tr>
            ) : filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={10}>No giveaway entries found for the current filters.</td>
              </tr>
            ) : filteredEntries.map((entry) => {
              const statusClass = getStatusClassName(entry.status);
              const initials = getInitials(entry.fullName);
              const sourceTagLabel = getSourceTagLabel(entry.sourceTag);
              const displayName = formatEntryDisplayName(entry.fullName, entry.sourceTag);
              const deleteBusy = actionKey === `delete-entry-${entry.id}`;
              const isDeleteLocked = (Boolean(actionKey) && !deleteBusy) || isWheelActionBusy || isClearingEntries;
              return (
                <tr key={entry.id} className={`giveaway-wheel-admin-row ${statusClass}`}>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong>{displayName}</strong>
                      {sourceTagLabel ? (
                        <span className="giveaway-player-proof-badge giveaway-wheel-entry-chip is-source-g1" style={{ width: "fit-content" }}>
                          {sourceTagLabel}
                        </span>
                      ) : null}
                      <small className="field-hint">Created {formatDateTime(entry.createdAt)}</small>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong>{entry.entryCount}</strong>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {entry.winner ? (
                          <span className="giveaway-player-proof-badge giveaway-wheel-entry-chip is-winner">
                            Winner
                          </span>
                        ) : null}
                        <span className={`giveaway-player-proof-badge giveaway-wheel-entry-chip ${entry.excludedFromWheel ? "is-excluded" : "is-active"}`}>
                          {entry.excludedFromWheel ? "Wheel Excluded" : "Wheel Active"}
                        </span>
                        {entry.winner ? (
                          <small className="field-hint">
                            {entry.winMode === "remove" ? "Remove Winner mode" : "Keep Winner mode"}
                          </small>
                        ) : null}
                        {(entry.winner || entry.excludedFromWheel) ? (
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => setResetWinnerModal({ isOpen: true, entry })}
                            disabled={isWheelActionBusy || isClearingEntries || !onResetWinnerStatus || actionKey === `reset-winner-${entry.id}`}
                          >
                            {actionKey === `reset-winner-${entry.id}` ? "Resetting..." : "Reset Winner"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button-secondary btn-delete"
                          onClick={() => setDeleteEntryModal({ isOpen: true, entry, challenge: "", error: "" })}
                          disabled={isDeleteLocked || !onDeleteEntry}
                        >
                          {deleteBusy ? "Deleting..." : "Delete Joiner"}
                        </button>
                      </div>
                    </div>
                  </td>
                  {IMAGE_COLUMNS.map((column) => {
                    const proof = entry?.[column.proofKey] || null;
                    const proofStatus = String(proof?.status || "NOT_UPLOADED").toUpperCase();
                    const imageSrc = getGiveawayWheelImageSrc(proof?.imagePath || entry[column.key]);
                    const hasImage = Boolean(imageSrc);
                    const proofLabel = column.label;
                    const badgeStyle = getProofBadgeStyle(proofStatus);
                    const statusLabel = getProofStatusLabel(proofStatus);
                    const approveBusy = actionKey === `approve-${entry.id}-${column.proofType}`;
                    const rejectBusy = actionKey === `reject-${entry.id}-${column.proofType}`;
                    const isActionLocked = Boolean(actionKey) && !approveBusy && !rejectBusy;
                    const isProfileColumn = column.key === "facebookProfileImagePath";

                    return (
                      <td key={`${entry.id}-${column.key}`}>
                        {isProfileColumn ? (
                          <div className="giveaway-player-profile-cell is-detailed is-stacked">
                            <span
                              className="giveaway-player-proof-badge giveaway-player-profile-status"
                              style={badgeStyle}
                              title={proof?.rejectionReason || `${column.label} status`}
                            >
                              {statusLabel}
                            </span>

                            <span className="giveaway-player-muted-text giveaway-player-proof-message giveaway-wheel-entry-value">
                              {column.weightLabel}
                            </span>

                            {hasImage ? (
                              <button
                                type="button"
                                className="giveaway-player-profile-button"
                                onClick={() => setImageViewer({ isOpen: true, src: imageSrc, alt: `${entry.fullName} - ${column.label}` })}
                                title={`View ${column.label.toLowerCase()} for ${entry.fullName}`}
                              >
                                <img src={imageSrc} alt={`${entry.fullName} - ${column.label}`} className="giveaway-player-profile-image" />
                              </button>
                            ) : (
                              <div className="giveaway-player-profile-empty" title={`No ${column.label.toLowerCase()} uploaded`}>
                                <span>{initials}</span>
                              </div>
                            )}

                            <div className="giveaway-player-profile-actions">
                              <button
                                type="button"
                                className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn"
                                disabled={isActionLocked || !hasImage || proofStatus === "APPROVED"}
                                onClick={() => setApproveConfirm({ isOpen: true, entry, proofType: column.proofType, proofLabel })}
                                style={{ opacity: approveBusy ? 0.72 : 1 }}
                                title={`Approve ${column.label.toLowerCase()} proof`}
                              >
                                <span className="btn-label">{approveBusy ? "Approving..." : "Approve"}</span>
                                <span className="btn-icon">✓</span>
                              </button>
                              <button
                                type="button"
                                className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn btn-delete"
                                disabled={isActionLocked || !hasImage}
                                onClick={() => setRejectModal({
                                  isOpen: true,
                                  entry,
                                  proofType: column.proofType,
                                  proofLabel,
                                  message: proof?.rejectionReason || "",
                                })}
                                style={{ opacity: rejectBusy ? 0.72 : 1 }}
                                title={`Reject ${column.label.toLowerCase()} proof`}
                              >
                                <span className="btn-label">{rejectBusy ? "Rejecting..." : "Reject"}</span>
                                <span className="btn-icon">✕</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="giveaway-player-proof-row is-stacked">
                            <span className="giveaway-player-proof-title">{column.label}</span>
                            <span
                              className="giveaway-player-proof-badge giveaway-player-proof-status"
                              style={badgeStyle}
                              title={proof?.rejectionReason || `${column.label} status`}
                            >
                              {statusLabel}
                            </span>

                            <span className="giveaway-player-muted-text giveaway-player-proof-message giveaway-wheel-entry-value">
                              {hasImage ? `Entry value ${getCompactWeightLabel(column.weightLabel)}` : `Worth ${getCompactWeightLabel(column.weightLabel)}`}
                            </span>

                            {hasImage ? (
                              <button
                                type="button"
                                className="giveaway-player-proof-thumbnail-button"
                                onClick={() => setImageViewer({ isOpen: true, src: imageSrc, alt: `${entry.fullName} - ${column.label}` })}
                                title={`View ${column.label.toLowerCase()} proof for ${entry.fullName}`}
                              >
                                <img src={imageSrc} alt={`${entry.fullName} - ${column.label}`} className="giveaway-player-proof-thumbnail" />
                              </button>
                            ) : (
                              <span className="giveaway-player-muted-text giveaway-player-proof-empty" title={`No ${column.label.toLowerCase()} uploaded`}>
                                No image
                              </span>
                            )}

                            <div className="giveaway-player-profile-actions">
                              <button
                                type="button"
                                className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn"
                                disabled={isActionLocked || !hasImage || proofStatus === "APPROVED"}
                                onClick={() => setApproveConfirm({ isOpen: true, entry, proofType: column.proofType, proofLabel })}
                                style={{ opacity: approveBusy ? 0.72 : 1 }}
                                title={`Approve ${column.label.toLowerCase()} proof`}
                              >
                                <span className="btn-label">{approveBusy ? "Approving..." : "Approve"}</span>
                                <span className="btn-icon">✓</span>
                              </button>
                              <button
                                type="button"
                                className="button-secondary giveaway-player-proof-btn giveaway-profile-action-btn btn-delete"
                                disabled={isActionLocked || !hasImage}
                                onClick={() => setRejectModal({
                                  isOpen: true,
                                  entry,
                                  proofType: column.proofType,
                                  proofLabel,
                                  message: proof?.rejectionReason || "",
                                })}
                                style={{ opacity: rejectBusy ? 0.72 : 1 }}
                                title={`Reject ${column.label.toLowerCase()} proof`}
                              >
                                <span className="btn-label">{rejectBusy ? "Rejecting..." : "Reject"}</span>
                                <span className="btn-icon">✕</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <span className="field-hint">{entry.rejectionReason || "—"}</span>
                  </td>
                  <td>{formatDateTime(entry.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmActionModal
        isOpen={approveConfirm.isOpen}
        title={`Approve ${approveConfirm.proofLabel || "proof"}`}
        description="This will approve only the selected proof and update wheel slot totals automatically."
        targetLabel={approveConfirm.entry?.fullName || ""}
        confirmLabel="Approve Proof"
        onCancel={() => setApproveConfirm({ isOpen: false, entry: null, proofType: "", proofLabel: "" })}
        onConfirm={confirmApprove}
      />

      {rejectModal.isOpen ? (
        <div className="modal-overlay" onClick={() => setRejectModal({ isOpen: false, entry: null, proofType: "", proofLabel: "", message: "" })}>
          <section className="modal-panel modal-panel-compact confirm-action-modal" onClick={(event) => event.stopPropagation()}>
            <div className="confirm-action-head">
              <h3>Reject {rejectModal.proofLabel || "proof"}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setRejectModal({ isOpen: false, entry: null, proofType: "", proofLabel: "", message: "" })} aria-label="Close reject modal">
                ✕
              </button>
            </div>
            <div className="confirm-action-body">
              <p className="confirm-action-target">{rejectModal.entry?.fullName || ""}</p>
              <p className="confirm-action-copy">
                Tell the user what to correct for this specific proof. They can search their name on the public page and update uploads.
              </p>
              <label className="confirm-action-field">
                <span>Reason</span>
                <textarea
                  rows={4}
                  className="confirm-action-textarea"
                  value={rejectModal.message}
                  onChange={(event) => setRejectModal((previous) => ({ ...previous, message: event.target.value }))}
                  placeholder="Example: Your shared post screenshot is cropped. Please upload the full post with your account visible."
                />
              </label>
            </div>
            <div className="confirm-action-footer modal-sticky-footer">
              <button type="button" className="button-secondary" onClick={() => setRejectModal({ isOpen: false, entry: null, proofType: "", proofLabel: "", message: "" })}>
                Cancel
              </button>
              <button type="button" className="confirm-action-danger-btn" onClick={confirmReject} disabled={!String(rejectModal.message || "").trim()}>
                Reject Proof
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {imageViewer.isOpen ? (
        <div className="modal-overlay" onClick={() => setImageViewer({ isOpen: false, src: "", alt: "" })}>
          <section className="modal-panel modal-panel-compact" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="confirm-action-head">
              <h3>Entry Proof Viewer</h3>
              <button type="button" className="modal-close-btn" onClick={() => setImageViewer({ isOpen: false, src: "", alt: "" })} aria-label="Close image viewer">
                ✕
              </button>
            </div>
            <img src={imageViewer.src} alt={imageViewer.alt} style={{ width: "100%", borderRadius: 18 }} />
          </section>
        </div>
      ) : null}

      {clearEntriesModal.isOpen ? (
        <div className="modal-overlay" onClick={() => setClearEntriesModal({ isOpen: false, challenge: "", error: "" })}>
          <section className="modal-panel modal-panel-compact confirm-action-modal" onClick={(event) => event.stopPropagation()}>
            <div className="confirm-action-head">
              <h3>Clean Up Giveaway Joiners</h3>
              <button type="button" className="modal-close-btn" onClick={() => setClearEntriesModal({ isOpen: false, challenge: "", error: "" })} aria-label="Close cleanup modal">
                ✕
              </button>
            </div>
            <p className="confirm-action-copy">
              This permanently deletes all Giveaway 2 joiners, draw history, and uploaded giveaway-wheel proof images.
            </p>
            <p className="confirm-action-target">{`${entries.length} joiner${entries.length === 1 ? "" : "s"}`}</p>
            <label className="confirm-action-field">
              <span>Security check: type DELETE</span>
              <input
                type="text"
                value={clearEntriesModal.challenge}
                onChange={(event) => setClearEntriesModal((previous) => ({ ...previous, challenge: event.target.value, error: "" }))}
                placeholder="DELETE"
              />
            </label>
            {clearEntriesModal.error ? <p className="field-hint" style={{ color: "#dc2626", marginTop: 8 }}>{clearEntriesModal.error}</p> : null}
            <div className="confirm-action-footer modal-sticky-footer">
              <button type="button" className="button-secondary" onClick={() => setClearEntriesModal({ isOpen: false, challenge: "", error: "" })}>
                Cancel
              </button>
              <button type="button" className="confirm-action-danger-btn" onClick={handleClearEntries} disabled={isClearingEntries}>
                {isClearingEntries ? "Cleaning..." : "Clean Up"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteEntryModal.isOpen ? (
        <div className="modal-overlay" onClick={() => setDeleteEntryModal({ isOpen: false, entry: null, challenge: "", error: "" })}>
          <section className="modal-panel modal-panel-compact confirm-action-modal" onClick={(event) => event.stopPropagation()}>
            <div className="confirm-action-head">
              <h3>Delete Joiner</h3>
              <button type="button" className="modal-close-btn" onClick={() => setDeleteEntryModal({ isOpen: false, entry: null, challenge: "", error: "" })} aria-label="Close delete joiner modal">
                ✕
              </button>
            </div>
            <p className="confirm-action-copy">This permanently deletes this joiner and all uploaded giveaway-wheel proof images.</p>
            <p className="confirm-action-target">{deleteEntryModal.entry?.fullName || ""}</p>
            <label className="confirm-action-field">
              <span>Security check: type DELETE</span>
              <input
                type="text"
                value={deleteEntryModal.challenge}
                onChange={(event) => setDeleteEntryModal((previous) => ({ ...previous, challenge: event.target.value, error: "" }))}
                placeholder="DELETE"
              />
            </label>
            {deleteEntryModal.error ? <p className="field-hint" style={{ color: "#dc2626", marginTop: 8 }}>{deleteEntryModal.error}</p> : null}
            <div className="confirm-action-footer modal-sticky-footer">
              <button type="button" className="button-secondary" onClick={() => setDeleteEntryModal({ isOpen: false, entry: null, challenge: "", error: "" })}>
                Cancel
              </button>
              <button
                type="button"
                className="confirm-action-danger-btn"
                onClick={handleDeleteEntry}
                disabled={actionKey === `delete-entry-${deleteEntryModal.entry?.id}`}
              >
                {actionKey === `delete-entry-${deleteEntryModal.entry?.id}` ? "Deleting..." : "Delete Joiner"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmActionModal
        isOpen={resetWinnerModal.isOpen}
        title="Reset Winner Status"
        description="This clears Winner and Wheel Excluded flags for this user and returns them to active wheel entries if their proofs are approved."
        targetLabel={resetWinnerModal.entry?.fullName || ""}
        confirmLabel={resetWinnerModal.entry?.id && actionKey === `reset-winner-${resetWinnerModal.entry.id}` ? "Resetting..." : "Reset Status"}
        onCancel={() => setResetWinnerModal({ isOpen: false, entry: null })}
        onConfirm={handleResetWinnerStatus}
      />
    </section>
  );
}


