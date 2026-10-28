import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ConfirmActionModal } from "../../../components/modals/admin";
import {
  GIVEAWAY_WHEEL_PROOF_FIELDS,
  getGiveawayWheelImageSrc,
  getGiveawayWheelStatusLabel,
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

function getEntryBadgeStyle(status) {
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
  return {
    background: "rgba(245, 158, 11, 0.14)",
    border: "1px solid rgba(245, 158, 11, 0.22)",
    color: "#92400e",
  };
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

const PROOF_FIELD_BY_PATH_KEY = Object.fromEntries(
  GIVEAWAY_WHEEL_PROOF_FIELDS.map((field) => [field.pathKey, field])
);

const IMAGE_COLUMNS = [
  { key: "followProofImagePath", proofKey: "followProof", proofType: "follow", label: "Following", weightLabel: PROOF_FIELD_BY_PATH_KEY.followProofImagePath?.weightLabel || "1 entry" },
  { key: "commentProofImagePath", proofKey: "commentProof", proofType: "comment", label: "Tag Friend", weightLabel: PROOF_FIELD_BY_PATH_KEY.commentProofImagePath?.weightLabel || "2 entries" },
  { key: "shareProofImagePath", proofKey: "shareProof", proofType: "share", label: "Share Post", weightLabel: PROOF_FIELD_BY_PATH_KEY.shareProofImagePath?.weightLabel || "3 entries" },
  { key: "reviewProofImagePath", proofKey: "reviewProof", proofType: "review", label: "Review", weightLabel: PROOF_FIELD_BY_PATH_KEY.reviewProofImagePath?.weightLabel || "5 entries" },
  { key: "facebookProfileImagePath", proofKey: "facebookProfile", proofType: "profile", label: "FB Profile", weightLabel: "Required" },
];

export default function GiveawayWheelEntriesTable({
  entries = [],
  isLoading = false,
  actionKey = "",
  onApproveProof,
  onRejectProof,
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [imageViewer, setImageViewer] = useState({ isOpen: false, src: "", alt: "" });
  const [approveConfirm, setApproveConfirm] = useState({ isOpen: false, entry: null, proofType: "", proofLabel: "" });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, entry: null, proofType: "", proofLabel: "", message: "" });

  const filteredEntries = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesQuery = !keyword || String(entry.fullName || "").toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "ALL" || String(entry.status || "").toUpperCase() === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [entries, query, statusFilter]);

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
              return (
                <tr key={entry.id} className={`giveaway-wheel-admin-row ${statusClass}`}>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong>{entry.fullName}</strong>
                      <small className="field-hint">Created {formatDateTime(entry.createdAt)}</small>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong>{entry.entryCount}</strong>
                      <small className="field-hint">Visible on wheel</small>
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
    </section>
  );
}


