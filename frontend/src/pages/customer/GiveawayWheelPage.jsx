import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Search, Upload } from "lucide-react";
import { apiRequest, getFriendlyUploadErrorMessage } from "../../utils/api";
import {
  GIVEAWAY_WHEEL_MAX_UPLOAD_SIZE_BYTES,
  GIVEAWAY_WHEEL_PROOF_FIELDS,
  GIVEAWAY_WHEEL_PROFILE_FIELD,
  GIVEAWAY_WHEEL_STORAGE_KEY,
  getGiveawayWheelImageSrc,
  getGiveawayWheelStatusLabel,
} from "../../constants/giveawayWheel";
import { DEFAULT_GIVEAWAY_WHEEL_SETTINGS, giveawayImageList, normalizeGiveawaySettings } from "../../constants/giveaway";
import "../../styles/giveaway-wheel.css";

const EMPTY_FORM = {
  id: null,
  fullName: "",
  followProofImagePath: "",
  commentProofImagePath: "",
  shareProofImagePath: "",
  reviewProofImagePath: "",
  facebookProfileImagePath: "",
  entryCount: 0,
  status: "PENDING",
  rejectionReason: "",
};

const EMPTY_FILES = {
  followProof: null,
  commentProof: null,
  shareProof: null,
  reviewProof: null,
  facebookProfile: null,
};

const EMPTY_PREVIEWS = {
  followProof: "",
  commentProof: "",
  shareProof: "",
  reviewProof: "",
  facebookProfile: "",
};

const EMPTY_PROOF_REVIEW = {
  followProof: { status: "NOT_UPLOADED", rejectionReason: "", imagePath: "" },
  commentProof: { status: "NOT_UPLOADED", rejectionReason: "", imagePath: "" },
  shareProof: { status: "NOT_UPLOADED", rejectionReason: "", imagePath: "" },
  reviewProof: { status: "NOT_UPLOADED", rejectionReason: "", imagePath: "" },
  facebookProfile: { status: "NOT_UPLOADED", rejectionReason: "", imagePath: "" },
};

function normalizeEntryFormData(data = {}) {
  return {
    id: data.id,
    fullName: data.fullName || "",
    followProofImagePath: data.followProofImagePath || "",
    commentProofImagePath: data.commentProofImagePath || "",
    shareProofImagePath: data.shareProofImagePath || "",
    reviewProofImagePath: data.reviewProofImagePath || "",
    facebookProfileImagePath: data.facebookProfileImagePath || "",
    entryCount: Number(data.entryCount) || 0,
    status: data.status || "PENDING",
    rejectionReason: data.rejectionReason || "",
  };
}

function normalizeProofReview(data = {}) {
  const normalizeProof = (proof) => ({
    status: String(proof?.status || "NOT_UPLOADED").toUpperCase(),
    rejectionReason: String(proof?.rejectionReason || ""),
    imagePath: String(proof?.imagePath || ""),
  });

  return {
    followProof: normalizeProof(data.followProof),
    commentProof: normalizeProof(data.commentProof),
    shareProof: normalizeProof(data.shareProof),
    reviewProof: normalizeProof(data.reviewProof),
    facebookProfile: normalizeProof(data.facebookProfile),
  };
}

function getPublicEntryStatus(entry) {
  const slotCount = Math.max(0, Number(entry?.entryCount) || 0);
  if (slotCount > 0) {
    return "APPROVED";
  }
  return String(entry?.status || "PENDING").toUpperCase();
}

const WHEEL_VIEWBOX_SIZE = 1000;
const WHEEL_CENTER = WHEEL_VIEWBOX_SIZE / 2;
const WHEEL_RADIUS = 440;
const WHEEL_CORE_RADIUS = 146;
const WHEEL_HUB_RADIUS = 60;
const SPIN_DURATION_MS = 5600;

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians)),
  };
}

function describeSector(startAngle, endAngle) {
  const start = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, WHEEL_RADIUS, endAngle);
  const end = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, WHEEL_RADIUS, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${WHEEL_CENTER} ${WHEEL_CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function describeRadialLabelPath(startRadius, endRadius, angleInDegrees) {
  const start = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, startRadius, angleInDegrees);
  const end = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, endRadius, angleInDegrees);
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

function getStatusClassName(status) {
  const normalized = String(status || "PENDING").toUpperCase();
  if (normalized === "APPROVED") return "is-approved";
  if (normalized === "REJECTED") return "is-rejected";
  return "is-pending";
}

function getSegmentFill(status, index) {
  const normalized = String(status || "PENDING").toUpperCase();
  if (normalized === "APPROVED") {
    return index % 2 === 0 ? "#8b5cf6" : "#ec4899";
  }
  if (normalized === "REJECTED") {
    return index % 2 === 0 ? "rgba(148, 163, 184, 0.45)" : "rgba(100, 116, 139, 0.34)";
  }
  return index % 2 === 0 ? "rgba(250, 204, 21, 0.78)" : "rgba(251, 146, 60, 0.72)";
}

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

function getSearchEntryMessage(entry) {
  const status = getPublicEntryStatus(entry);
  const slotCount = Math.max(0, Number(entry?.entryCount) || 0);
  const slotLabel = slotCount === 1 ? "slot" : "slots";

  if (status === "APPROVED") {
    return `Approved. Your ${slotCount} ${slotLabel} are active in the public wheel.`;
  }

  if (status === "REJECTED") {
    return entry?.rejectionReason || "Rejected. Please read the admin feedback and update your submission.";
  }

  return "Pending review. Your entry is waiting for admin approval.";
}

function buildFormDataPayload(entry, selectedFiles) {
  const payload = new FormData();
  payload.append("fullName", String(entry.fullName || "").trim());

  [...GIVEAWAY_WHEEL_PROOF_FIELDS, GIVEAWAY_WHEEL_PROFILE_FIELD].forEach((field) => {
    const file = selectedFiles[field.key];
    if (file) {
      payload.append(field.key, file);
    }
  });

  return payload;
}

async function submitMultipartEntry(url, method, entry, selectedFiles) {
  const response = await fetch(url, {
    method,
    body: buildFormDataPayload(entry, selectedFiles),
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(
      (isJson ? body?.message : body) || getFriendlyUploadErrorMessage(response, "Unable to save giveaway entry.")
    );
  }

  return body;
}

export default function GiveawayWheelPage() {
  const previewUrlsRef = useRef([]);
  const prizeGridRef = useRef(null);
  const [wheelEntries, setWheelEntries] = useState([]);
  const [entryForm, setEntryForm] = useState(EMPTY_FORM);
  const [proofReview, setProofReview] = useState(EMPTY_PROOF_REVIEW);
  const [selectedFiles, setSelectedFiles] = useState(EMPTY_FILES);
  const [filePreviews, setFilePreviews] = useState(EMPTY_PREVIEWS);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRotation, setActiveRotation] = useState(0);
  const [giveawaySettings, setGiveawaySettings] = useState(DEFAULT_GIVEAWAY_WHEEL_SETTINGS);
  const [isSpinning, setIsSpinning] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isSearchResultsModalOpen, setIsSearchResultsModalOpen] = useState(false);
  const [activePrizeLightboxIndex, setActivePrizeLightboxIndex] = useState(null);
  const [openedFromSearchResult, setOpenedFromSearchResult] = useState(false);
  const [canScrollPrizeLeft, setCanScrollPrizeLeft] = useState(false);
  const [canScrollPrizeRight, setCanScrollPrizeRight] = useState(false);

  const loadWheelEntries = async () => {
    try {
      const data = await apiRequest("/api/public/giveaway-wheel/entries/wheel");
      setWheelEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      // Keep the page usable even if wheel feed refresh fails.
    }
  };

  useEffect(() => {
    loadWheelEntries().catch(() => undefined);
  }, []);

  useEffect(() => {
    apiRequest("/api/public/settings/giveaway/2")
      .then((data) => {
        setGiveawaySettings(normalizeGiveawaySettings(data));
      })
      .catch(() => {
        apiRequest("/api/public/settings/giveaway")
          .then((data) => {
            setGiveawaySettings(normalizeGiveawaySettings(data));
          })
          .catch(() => {
            setGiveawaySettings(DEFAULT_GIVEAWAY_WHEEL_SETTINGS);
          });
      });
  }, []);

  useEffect(() => {
    const refreshWheelEntries = () => {
      loadWheelEntries().catch(() => undefined);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshWheelEntries();
      }
    };

    window.addEventListener("focus", refreshWheelEntries);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        refreshWheelEntries();
      }
    }, 30000);

    return () => {
      window.removeEventListener("focus", refreshWheelEntries);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const savedEntryId = window.localStorage.getItem(GIVEAWAY_WHEEL_STORAGE_KEY);
    if (!savedEntryId) {
      return;
    }

    apiRequest(`/api/public/giveaway-wheel/entries/${savedEntryId}`)
      .then((data) => {
        if (!data?.id) return;
        setEntryForm(normalizeEntryFormData(data));
        setProofReview(normalizeProofReview(data));
      })
      .catch(() => {
        window.localStorage.removeItem(GIVEAWAY_WHEEL_STORAGE_KEY);
      });
  }, []);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const approvedWheelEntries = useMemo(() => {
    return wheelEntries
      .filter((entry) => getPublicEntryStatus(entry) === "APPROVED" && Math.max(0, Number(entry?.entryCount) || 0) > 0)
      .map((entry) => ({ ...entry, status: "APPROVED" }));
  }, [wheelEntries]);

  const weightedSegments = useMemo(() => {
    return approvedWheelEntries.flatMap((entry) => Array.from(
      { length: Math.max(1, Number(entry.entryCount) || 0) },
      () => ({ ...entry })
    ));
  }, [approvedWheelEntries]);

  const approvedSegments = useMemo(() => {
    return weightedSegments.map((segment, index) => ({ ...segment, wheelIndex: index }));
  }, [weightedSegments]);


  const prizeImages = useMemo(() => giveawayImageList(giveawaySettings), [giveawaySettings]);

  const sidePrizeKicker = String(giveawaySettings?.leaderboardPrizeEyebrow || "").trim() || "Prize";
  const sidePrizeTitle = String(giveawaySettings?.prizeLabel || "").trim() || "Prize";
  const sidePrizeDescription = String(giveawaySettings?.leaderboardPrizeNote || "").trim() || "Featured Prize";
  const sideJoinKicker = String(giveawaySettings?.title || "").trim() || "Join";
  const sideJoinTitle = String(giveawaySettings?.howToJoinTitle || "").trim() || "Join";
  const sideJoinDescription = String(giveawaySettings?.intro || "").trim() || "Submit your entry.";
  const sideSearchKicker = String(giveawaySettings?.leaderboardGoalMessage || "").trim() || "Search";
  const sideSearchTitle = String(giveawaySettings?.accountDeletionNote || "").trim() || "Search";
  const sideSearchDescription = String(giveawaySettings?.steps?.[0] || "").trim() || "Check your status.";

  useEffect(() => {
    const container = prizeGridRef.current;
    if (!container) {
      setCanScrollPrizeLeft(false);
      setCanScrollPrizeRight(false);
      return undefined;
    }

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      const currentScrollLeft = Math.max(0, container.scrollLeft);
      setCanScrollPrizeLeft(currentScrollLeft > 2);
      setCanScrollPrizeRight(maxScrollLeft - currentScrollLeft > 2);
    };

    updateScrollState();
    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [prizeImages]);

  const estimatedEntryCount = useMemo(() => {
    return GIVEAWAY_WHEEL_PROOF_FIELDS.reduce((total, field) => {
      const hasProof = Boolean(selectedFiles[field.key] || entryForm[field.pathKey] || proofReview[field.key]?.imagePath);
      return total + (hasProof ? field.weight : 0);
    }, 0);
  }, [entryForm, proofReview, selectedFiles]);

  const scrollPrizeGrid = (direction) => {
    const container = prizeGridRef.current;
    if (!container) return;
    const step = Math.max(140, Math.floor(container.clientWidth * 0.72));
    container.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const handleFileChange = (fieldKey, event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    setFormError("");
    setFormMessage("");

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormError("Image files only please.");
      return;
    }

    if (file.size > GIVEAWAY_WHEEL_MAX_UPLOAD_SIZE_BYTES) {
      setFormError("This image is too large. Please upload an image up to 25MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    previewUrlsRef.current.push(objectUrl);
    setSelectedFiles((previous) => ({ ...previous, [fieldKey]: file }));
    setFilePreviews((previous) => ({ ...previous, [fieldKey]: objectUrl }));
    setProofReview((previous) => ({
      ...previous,
      [fieldKey]: { status: "PENDING", rejectionReason: "" },
    }));
  };


  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isViewOnlyMode) {
      return;
    }

    setFormError("");
    setFormMessage("");

    const normalizedFullName = String(entryForm.fullName || "").trim();
    const hasAtLeastOneEntryProof = GIVEAWAY_WHEEL_PROOF_FIELDS.some(
      (field) => Boolean(selectedFiles[field.key] || entryForm[field.pathKey] || proofReview[field.key]?.imagePath)
    );
    const hasFacebookProfile = Boolean(
      selectedFiles.facebookProfile
      || entryForm.facebookProfileImagePath
      || proofReview.facebookProfile?.imagePath
    );

    if (normalizedFullName.length < 2) {
      setFormError("Please enter your full name.");
      return;
    }

    if (!hasAtLeastOneEntryProof) {
      setFormError("Upload at least one giveaway proof to get your wheel entries.");
      return;
    }

    if (!hasFacebookProfile) {
      setFormError("Facebook profile screenshot is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const isEditing = Boolean(entryForm.id);
      const url = isEditing ? `/api/public/giveaway-wheel/entries/${entryForm.id}` : "/api/public/giveaway-wheel/entries";
      const method = isEditing ? "PUT" : "POST";
      const response = await submitMultipartEntry(url, method, entryForm, selectedFiles);

      setEntryForm(normalizeEntryFormData(response));
      setProofReview(normalizeProofReview(response));
      setSelectedFiles(EMPTY_FILES);
      setFilePreviews(EMPTY_PREVIEWS);
      setIsViewOnlyMode(false);
      setFormMessage(isEditing
        ? "Your giveaway entry was updated and sent back for admin review."
        : "You are now in the giveaway queue. Your wheel slots will turn active after admin approval.");
      window.localStorage.setItem(GIVEAWAY_WHEEL_STORAGE_KEY, String(response.id));
      await loadWheelEntries();
    } catch (error) {
      setFormError(error.message || "Unable to save your entry right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const spinWheel = () => {
    if (isSpinning || approvedSegments.length === 0 || weightedSegments.length === 0) {
      return;
    }

    const winningSegment = approvedSegments[Math.floor(Math.random() * approvedSegments.length)];
    const anglePerSegment = 360 / weightedSegments.length;
    const targetAngle = (winningSegment.wheelIndex + 0.5) * anglePerSegment;
    const extraTurns = 6 * 360;
    const randomOffset = (Math.random() - 0.5) * Math.min(12, anglePerSegment * 0.45);
    const nextRotation = activeRotation + extraTurns - targetAngle + randomOffset;

    setIsSpinning(true);
    setActiveRotation(nextRotation);

    window.setTimeout(() => {
      setIsSpinning(false);
    }, SPIN_DURATION_MS);
  };

  const openModal = (nextModal) => {
    setOpenedFromSearchResult(false);
    setIsViewOnlyMode(false);
    setActiveModal(nextModal);
    setFormError("");
    setFormMessage("");
  };

  const closeModal = () => {
    setActiveModal(null);
    setIsViewOnlyMode(false);
    if (openedFromSearchResult) {
      setEntryForm(EMPTY_FORM);
      setProofReview(EMPTY_PROOF_REVIEW);
      setSelectedFiles(EMPTY_FILES);
      setFilePreviews(EMPTY_PREVIEWS);
      setOpenedFromSearchResult(false);
    }
    setFormError("");
    setFormMessage("");
  };

  const closeSearchResultsModal = () => {
    setIsSearchResultsModalOpen(false);
  };

  const handleOpenSearchResult = async (entryId) => {
    setSearchError("");
    setFormError("");
    setFormMessage("");

    try {
      const data = await apiRequest(`/api/public/giveaway-wheel/entries/${entryId}`);
      if (!data?.id) {
        setSearchError("Entry details are not available right now.");
        return;
      }

      const normalizedStatus = String(data.status || "").toUpperCase();
      if (normalizedStatus !== "APPROVED" && normalizedStatus !== "REJECTED") {
        setSearchError("Only approved or rejected entries can be opened in view-only mode.");
        return;
      }

      setEntryForm(normalizeEntryFormData(data));
      setProofReview(normalizeProofReview(data));
      setSelectedFiles(EMPTY_FILES);
      setFilePreviews(EMPTY_PREVIEWS);
      setOpenedFromSearchResult(true);
      setIsViewOnlyMode(normalizedStatus === "APPROVED");
      setIsSearchResultsModalOpen(false);
      setActiveModal("join");
    } catch (error) {
      setSearchError(error.message || "Unable to open this giveaway entry right now.");
    }
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();

    const normalizedQuery = searchQuery.trim();
    if (normalizedQuery.length < 2) {
      setSearchError("Please enter at least 2 characters.");
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const data = await apiRequest(`/api/public/giveaway-wheel/entries/search?q=${encodeURIComponent(normalizedQuery)}`);
      const results = Array.isArray(data) ? data : [];
      setSearchResults(results);
      setIsSearchResultsModalOpen(results.length > 0);

      if (results.length === 0) {
        setSearchError("No giveaway entry matched that name.");
      }
    } catch (error) {
      setSearchResults([]);
      setIsSearchResultsModalOpen(false);
      setSearchError(error.message || "Unable to search right now.");
    } finally {
      setIsSearching(false);
    }
  };

  const readOnlyStatus = String(entryForm.status || "").toUpperCase();
  const isApprovedReadOnly = isViewOnlyMode && readOnlyStatus === "APPROVED";
  const profileImageSrc = filePreviews.facebookProfile
    || getGiveawayWheelImageSrc(entryForm.facebookProfileImagePath || proofReview.facebookProfile?.imagePath);

  return (
    <main className="giveaway-wheel-page">
      <section className="giveaway-wheel-hero giveaway-wheel-hero-compact">
        <div className="giveaway-wheel-hero-panel giveaway-wheel-hero-panel-compact">
          <div
            className="giveaway-wheel-stage giveaway-wheel-stage-compact"
            role="button"
            tabIndex={0}
            aria-label="Spin the giveaway wheel"
            onClick={spinWheel}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                spinWheel();
              }
            }}
          >
            <div className="giveaway-wheel-wheel-wrap">
              <div className="giveaway-wheel-pointer" aria-hidden="true" />
              <div className={`giveaway-wheel-svg-shell giveaway-wheel-svg-shell-compact${isSpinning ? " is-spinning" : ""}`}>
                <svg
                  className="giveaway-wheel-svg"
                  viewBox={`0 0 ${WHEEL_VIEWBOX_SIZE} ${WHEEL_VIEWBOX_SIZE}`}
                  role="img"
                  aria-label="Giveaway spin wheel"
                  style={{ transform: `rotate(${activeRotation}deg)` }}
                >
                  <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={WHEEL_RADIUS} fill="#0f172a" stroke="rgba(255,255,255,0.12)" strokeWidth="12" />
                  {weightedSegments.length > 0 ? weightedSegments.map((segment, index) => {
                    const anglePerSegment = 360 / weightedSegments.length;
                    const startAngle = index * anglePerSegment;
                    const endAngle = (index + 1) * anglePerSegment;
                    const midAngle = startAngle + (anglePerSegment / 2);
                    const labelStartRadius = weightedSegments.length > 8 ? WHEEL_RADIUS * 0.38 : WHEEL_RADIUS * 0.34;
                    const labelEndRadius = weightedSegments.length > 8 ? WHEEL_RADIUS * 0.84 : WHEEL_RADIUS * 0.8;
                    const fullLabelText = String(segment.fullName || "").trim() || "Guest";
                    const baseFontSize = Math.max(22, Math.min(36, 240 / Math.max(weightedSegments.length, 3)));
                    const fontSize = Math.max(18, Math.min(baseFontSize, 320 / Math.max(fullLabelText.length, 4)));
                    const statusClass = getStatusClassName(segment.status);
                    const labelText = fullLabelText;
                    const normalizedAngle = ((midAngle % 360) + 360) % 360;
                    const isLeftSide = normalizedAngle > 180;
                    const labelPathId = `wheel-label-path-${index}`;
                    const labelPath = isLeftSide
                      ? describeRadialLabelPath(labelEndRadius, labelStartRadius, midAngle)
                      : describeRadialLabelPath(labelStartRadius, labelEndRadius, midAngle);

                    return (
                      <g key={`${segment.id}-${index}`} className={`giveaway-wheel-segment ${statusClass}`}>
                        <path d={describeSector(startAngle, endAngle)} fill={getSegmentFill(segment.status, index)} stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
                        <path id={labelPathId} d={labelPath} fill="none" stroke="none" />
                        <text
                          fill={String(segment.status).toUpperCase() === "REJECTED" ? "rgba(226,232,240,0.82)" : "#ffffff"}
                          stroke="rgba(15,23,42,0.35)"
                          strokeWidth="6"
                          paintOrder="stroke"
                          strokeLinejoin="round"
                          fontSize={fontSize}
                          fontWeight="800"
                          letterSpacing="0.02em"
                        >
                          <textPath href={`#${labelPathId}`} startOffset="50%" textAnchor="middle">
                            {labelText}
                          </textPath>
                        </text>
                      </g>
                    );
                  }) : (
                    <text x="500" y="470" textAnchor="middle" fill="#cbd5e1" fontSize="28" fontWeight="700">
                      Waiting for entries
                    </text>
                  )}
                  <defs>
                    <radialGradient id="wheelCoreGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                      <stop offset="55%" stopColor="rgba(124,58,237,0.18)" />
                      <stop offset="100%" stopColor="rgba(15,23,42,0.98)" />
                    </radialGradient>
                  </defs>
                  <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={WHEEL_CORE_RADIUS} fill="url(#wheelCoreGlow)" stroke="rgba(255,255,255,0.24)" strokeWidth="8" />
                  <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={WHEEL_HUB_RADIUS} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
                </svg>
              </div>
            </div>

          </div>

          <aside className="giveaway-wheel-sidebar">
            <div className="giveaway-wheel-side-card giveaway-wheel-status-panel">
              <div className="giveaway-wheel-side-card giveaway-wheel-prize-panel">
                <span className="giveaway-wheel-side-kicker">{sidePrizeKicker}</span>
                <h2>{sidePrizeTitle}</h2>
                <p>{sidePrizeDescription}</p>
                {prizeImages.length > 0 ? (
                  <div className="giveaway-wheel-prize-strip-shell">
                    {prizeImages.length > 4 && canScrollPrizeLeft ? (
                      <button
                        type="button"
                        className="giveaway-wheel-prize-strip-nav is-left"
                        onClick={() => scrollPrizeGrid(-1)}
                        aria-label="Scroll prize images left"
                      >
                        <ChevronLeft size={14} />
                      </button>
                    ) : null}

                    <div className="giveaway-wheel-prize-grid" ref={prizeGridRef}>
                      {prizeImages.map((imageSrc, index) => (
                        <button
                          key={`${imageSrc}-${index}`}
                          type="button"
                          className="giveaway-wheel-prize-visual giveaway-wheel-prize-visual-btn"
                          onClick={() => setActivePrizeLightboxIndex(index)}
                          aria-label={`View prize image ${index + 1}`}
                        >
                          <img
                            src={imageSrc}
                            alt={prizeImages.length > 1
                              ? `${giveawaySettings?.prizeImageAlt || giveawaySettings?.prizeLabel || "Giveaway prize"} ${index + 1}`
                              : giveawaySettings?.prizeImageAlt || giveawaySettings?.prizeLabel || "Giveaway prize"}
                          />
                        </button>
                      ))}
                    </div>

                    {prizeImages.length > 4 && canScrollPrizeRight ? (
                      <button
                        type="button"
                        className="giveaway-wheel-prize-strip-nav is-right"
                        onClick={() => scrollPrizeGrid(1)}
                        aria-label="Scroll prize images right"
                      >
                        <ChevronRight size={14} />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="giveaway-wheel-prize-visual is-empty">
                    <span>No prize image yet</span>
                  </div>
                )}
                {prizeImages.length > 0 ? <small className="giveaway-wheel-prize-meta">{prizeImages.length} image{prizeImages.length === 1 ? "" : "s"}</small> : null}
              </div>

              <div className="giveaway-wheel-side-card giveaway-wheel-join-panel">
                <span className="giveaway-wheel-side-kicker">{sideJoinKicker}</span>
                <h2>{sideJoinTitle}</h2>
                <p>{sideJoinDescription}</p>

                <div className="giveaway-wheel-action-row giveaway-wheel-action-row-sidebar">
                  <button type="button" className="btn-primary giveaway-wheel-action-primary" onClick={() => openModal("join")}>
                    Join giveaway
                  </button>
                </div>
              </div>

              <div className="giveaway-wheel-side-card giveaway-wheel-search-panel">
                <span className="giveaway-wheel-side-kicker">{sideSearchKicker}</span>
                <h2>{sideSearchTitle}</h2>
                <p>{sideSearchDescription}</p>

                <form className="giveaway-wheel-search-form giveaway-wheel-search-form-compact" onSubmit={handleSearchSubmit}>
                  <label className="giveaway-wheel-search-input">
                    <Search size={16} aria-hidden="true" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Juan Dela Cruz"
                    />
                  </label>
                  <button type="submit" className="btn-primary" disabled={isSearching}>
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </form>

                {searchError ? <div className="giveaway-wheel-inline-error">{searchError}</div> : null}
                {searchResults.length > 0 ? (
                  <button
                    type="button"
                    className="button-secondary giveaway-wheel-search-results-trigger"
                    onClick={() => setIsSearchResultsModalOpen(true)}
                  >
                    View {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
                  </button>
                ) : null}
              </div>
            </div>
          </aside>

        </div>
      </section>

      {activeModal ? (
        <div className="giveaway-wheel-modal-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
          <section className="giveaway-wheel-modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="giveaway-wheel-modal-head">
              <div className="giveaway-wheel-modal-titleblock">
                <h2>{isApprovedReadOnly ? "Approved entry" : entryForm.id ? "Edit your entry" : "Join giveaway"}</h2>
              </div>
              <div className="giveaway-wheel-modal-head-actions">
                {isApprovedReadOnly ? (
                  <span className="giveaway-wheel-modal-status-chip is-approved">
                    Approved / View only
                  </span>
                ) : null}
                <span className="giveaway-wheel-modal-total-chip">
                  Total: {estimatedEntryCount} {estimatedEntryCount === 1 ? "entry" : "entries"}
                </span>
                <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="Close modal">
                  ✕
                </button>
              </div>
            </div>
            <div className="giveaway-wheel-modal-scroll">
              <div className="giveaway-wheel-form-card giveaway-wheel-form-card-compact giveaway-wheel-modal-surface giveaway-wheel-join-form-panel">
                  {isApprovedReadOnly ? (
                    <div className="giveaway-wheel-readonly-note">
                      This entry is approved and active on the wheel. Re-upload is disabled.
                    </div>
                  ) : null}

                  {entryForm.status === "REJECTED" && entryForm.rejectionReason ? (
                    <div className="giveaway-wheel-form-alert is-danger">
                      <AlertCircle size={18} />
                      <div>
                        <strong>Admin feedback</strong>
                        <p>{entryForm.rejectionReason}</p>
                      </div>
                    </div>
                  ) : null}

                  {formMessage ? (
                    <div className="giveaway-wheel-form-alert is-success">
                      <CheckCircle2 size={18} />
                      <div>
                        <strong>Saved</strong>
                        <p>{formMessage}</p>
                      </div>
                    </div>
                  ) : null}

                  {formError ? (
                    <div className="giveaway-wheel-form-alert is-danger">
                      <AlertCircle size={18} />
                      <div>
                        <strong>Check your form</strong>
                        <p>{formError}</p>
                      </div>
                    </div>
                  ) : null}

                  <form className="giveaway-wheel-form giveaway-wheel-form-compact" onSubmit={handleSubmit}>
                    <label className="giveaway-wheel-field giveaway-wheel-field-wide">
                      <span>Name</span>
                      <div className="giveaway-wheel-input-shell">
                        <input
                          type="text"
                          value={entryForm.fullName}
                          onChange={(event) => setEntryForm((previous) => ({ ...previous, fullName: event.target.value }))}
                          placeholder="Juan Dela Cruz"
                          disabled={isApprovedReadOnly}
                        />
                      </div>
                    </label>

                    <div className="giveaway-wheel-proof-grid giveaway-wheel-proof-grid-compact">
                      <label className={`giveaway-wheel-proof-card giveaway-wheel-proof-card-compact is-required${isApprovedReadOnly ? " is-readonly" : ""}`}>
                        <div className="giveaway-wheel-proof-head">
                          <div>
                            <div className="giveaway-wheel-proof-title-row">
                              <strong>{GIVEAWAY_WHEEL_PROFILE_FIELD.label}</strong>
                              <span className="giveaway-wheel-entry-chip is-required">Required</span>
                              {proofReview.facebookProfile.status === "REJECTED" ? (
                                <span className="giveaway-wheel-entry-chip is-reupload">Needs re-upload</span>
                              ) : null}
                            </div>
                            <small>{GIVEAWAY_WHEEL_PROFILE_FIELD.helper}</small>
                            {proofReview.facebookProfile.status === "REJECTED" && proofReview.facebookProfile.rejectionReason ? (
                              <small className="giveaway-wheel-proof-rejection">Rejected: {proofReview.facebookProfile.rejectionReason}</small>
                            ) : null}
                          </div>
                        </div>
                        <input id="giveaway-wheel-facebookProfile" className="sr-only-file-input" type="file" accept="image/*" disabled={isApprovedReadOnly} onChange={(event) => handleFileChange(GIVEAWAY_WHEEL_PROFILE_FIELD.key, event)} />
                        <div className={`giveaway-wheel-proof-preview giveaway-wheel-proof-preview-compact giveaway-wheel-proof-preview--profile${profileImageSrc ? "" : " is-empty"}`}>
                          {profileImageSrc
                            ? <img src={profileImageSrc} alt={GIVEAWAY_WHEEL_PROFILE_FIELD.label} />
                            : (
                              <div className="giveaway-wheel-proof-empty-state">
                                <Upload size={20} />
                                <span className="giveaway-wheel-proof-empty-label">Upload image</span>
                              </div>
                            )}
                        </div>
                      </label>

                      {GIVEAWAY_WHEEL_PROOF_FIELDS.map((field) => {
                        const imageSrc = filePreviews[field.key]
                          || getGiveawayWheelImageSrc(entryForm[field.pathKey] || proofReview[field.key]?.imagePath);
                        const inputId = `giveaway-wheel-${field.key}`;
                        return (
                          <label key={field.key} className={`giveaway-wheel-proof-card giveaway-wheel-proof-card-compact${isApprovedReadOnly ? " is-readonly" : ""}`}>
                            <div className="giveaway-wheel-proof-head">
                              <div>
                                <div className="giveaway-wheel-proof-title-row">
                                  <strong>{field.label}</strong>
                                  <span className="giveaway-wheel-entry-chip">{field.weightLabel}</span>
                                  {proofReview[field.key]?.status === "REJECTED" ? (
                                    <span className="giveaway-wheel-entry-chip is-reupload">Needs re-upload</span>
                                  ) : null}
                                </div>
                                <small>{field.helper}</small>
                                {proofReview[field.key]?.status === "REJECTED" && proofReview[field.key]?.rejectionReason ? (
                                  <small className="giveaway-wheel-proof-rejection">Rejected: {proofReview[field.key].rejectionReason}</small>
                                ) : null}
                              </div>
                            </div>
                            <input id={inputId} className="sr-only-file-input" type="file" accept="image/*" disabled={isApprovedReadOnly} onChange={(event) => handleFileChange(field.key, event)} />
                            <div className={`giveaway-wheel-proof-preview giveaway-wheel-proof-preview-compact giveaway-wheel-proof-preview--post${imageSrc ? "" : " is-empty"}`}>
                              {imageSrc ? (
                                <img src={imageSrc} alt={field.label} />
                              ) : (
                                <div className="giveaway-wheel-proof-empty-state">
                                  <Upload size={20} />
                                  <span className="giveaway-wheel-proof-empty-label">Upload image</span>
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {isApprovedReadOnly ? null : (
                      <div className="giveaway-wheel-form-footer giveaway-wheel-form-footer-compact">
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                          {isSubmitting ? "Saving..." : entryForm.id ? "Update My Entry" : "Submit My Entry"}
                        </button>
                      </div>
                    )}
                  </form>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isSearchResultsModalOpen && searchResults.length > 0 ? (
        <div className="giveaway-wheel-modal-overlay" role="dialog" aria-modal="true" onClick={closeSearchResultsModal}>
          <section className="giveaway-wheel-modal-panel giveaway-wheel-search-results-modal" onClick={(event) => event.stopPropagation()}>
            <div className="giveaway-wheel-modal-head">
              <div className="giveaway-wheel-modal-titleblock">
                <h2>Search results</h2>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeSearchResultsModal} aria-label="Close search results">
                ✕
              </button>
            </div>
            <div className="giveaway-wheel-modal-scroll">
              <div className="giveaway-wheel-search-results giveaway-wheel-search-results-block">
                {searchResults.map((entry) => {
                  const publicStatus = getPublicEntryStatus(entry);
                  const statusClass = getStatusClassName(publicStatus);
                  const normalizedStatus = String(entry?.status || "").toUpperCase();
                  const canOpenReadOnly = normalizedStatus === "APPROVED" || normalizedStatus === "REJECTED";

                  return (
                    <div key={entry.id} className={`giveaway-wheel-search-result ${statusClass}`}>
                      <div className="giveaway-wheel-search-result-copy">
                        <strong>{entry.fullName}</strong>
                        <small className="giveaway-wheel-search-result-status">{getGiveawayWheelStatusLabel(publicStatus)}</small>
                        <small className="giveaway-wheel-search-result-message">{getSearchEntryMessage(entry)}</small>
                      </div>
                      <div className="giveaway-wheel-search-result-meta">
                        <strong>{entry.entryCount} {entry.entryCount === 1 ? "slot" : "slots"}</strong>
                        <small>Updated {formatDateTime(entry.updatedAt)}</small>
                        {canOpenReadOnly ? (
                          <button
                            type="button"
                            className="button-secondary giveaway-wheel-search-open-btn"
                            onClick={() => handleOpenSearchResult(entry.id)}
                          >
                            Open
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activePrizeLightboxIndex !== null && prizeImages.length > 0 ? (
        <div className="giveaway-wheel-modal-overlay" role="dialog" aria-modal="true" onClick={() => setActivePrizeLightboxIndex(null)}>
          <section className="giveaway-wheel-modal-panel giveaway-wheel-prize-lightbox-panel" onClick={(event) => event.stopPropagation()}>
            <div className="giveaway-wheel-modal-head">
              <div className="giveaway-wheel-modal-titleblock">
                <h2>{giveawaySettings?.prizeLabel || "Prize"}</h2>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActivePrizeLightboxIndex(null)} aria-label="Close prize preview">
                ✕
              </button>
            </div>
            <div className="giveaway-wheel-prize-lightbox-body">
              <img
                src={prizeImages[activePrizeLightboxIndex]}
                alt={prizeImages.length > 1
                  ? `${giveawaySettings?.prizeImageAlt || giveawaySettings?.prizeLabel || "Giveaway prize"} ${activePrizeLightboxIndex + 1}`
                  : giveawaySettings?.prizeImageAlt || giveawaySettings?.prizeLabel || "Giveaway prize"}
                className="giveaway-wheel-prize-lightbox-image"
              />
              {prizeImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="giveaway-wheel-prize-lightbox-nav is-prev"
                    onClick={() => setActivePrizeLightboxIndex((previous) => (previous === 0 ? prizeImages.length - 1 : previous - 1))}
                    aria-label="Previous prize image"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="giveaway-wheel-prize-lightbox-nav is-next"
                    onClick={() => setActivePrizeLightboxIndex((previous) => (previous === prizeImages.length - 1 ? 0 : previous + 1))}
                    aria-label="Next prize image"
                  >
                    →
                  </button>
                </>
              ) : null}
            </div>
            {prizeImages.length > 1 ? (
              <div className="giveaway-wheel-prize-lightbox-counter">
                {activePrizeLightboxIndex + 1} / {prizeImages.length}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}

