import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, Hash, Heart, ImageIcon, Lock, Search, Share2, SlidersHorizontal, Star, Upload, UserRound, X } from "lucide-react";
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
import { useCountdown } from "../../hooks";
import "../../styles/giveaway-wheel.css";

const EMPTY_FORM = {
  id: null,
  fullName: "",
  entryPassword: "",
  passwordProtected: false,
  sourceTag: "",
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

function normalizeEntryFormData(data = {}, options = {}) {
  const prefilledPassword = String(options.prefilledPassword || "");
  return {
    id: data.id,
    fullName: data.fullName || "",
    entryPassword: prefilledPassword,
    passwordProtected: Boolean(data.passwordProtected),
    sourceTag: String(data.sourceTag || ""),
    followProofImagePath: data.followProof?.imagePath || data.followProofImagePath || "",
    commentProofImagePath: data.commentProof?.imagePath || data.commentProofImagePath || "",
    shareProofImagePath: data.shareProof?.imagePath || data.shareProofImagePath || "",
    reviewProofImagePath: data.reviewProof?.imagePath || data.reviewProofImagePath || "",
    facebookProfileImagePath: data.facebookProfile?.imagePath || data.facebookProfileImagePath || "",
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

const WHEEL_VIEWBOX_SIZE = 1000;
const WHEEL_CENTER = WHEEL_VIEWBOX_SIZE / 2;
const WHEEL_RADIUS = 440;
const WHEEL_CORE_RADIUS = 146;
const WHEEL_HUB_RADIUS = 60;
const WHEEL_LABEL_INNER_PADDING = 28;
const WHEEL_LABEL_OUTER_PADDING = 30;
const WHEEL_LABEL_FONT_WIDTH_RATIO = 0.56;
const WHEEL_LABEL_MIN_FONT_SIZE = 10;
const SPIN_DURATION_MS = 5600;
const WHEEL_HOST_SESSION_STORAGE_KEY = "giveawayWheelHostSession";
const WHEEL_DRAW_MODE_PREF_STORAGE_KEY = "giveawayWheelDrawModePref";
const WHEEL_SOUND_PREF_STORAGE_KEY = "giveawayWheelSoundPref";
const WHEEL_TICK_PROFILE_PREF_STORAGE_KEY = "giveawayWheelTickProfilePref";
const WHEEL_SOUND_VOLUME_PREF_STORAGE_KEY = "giveawayWheelSoundVolumePref";
const HOST_STATUS_NOTICE_DURATION_MS = 5000;
const MIN_UPLOAD_DIMENSION_PX = 120;
const ALL_PROOF_FIELD_KEYS = [...GIVEAWAY_WHEEL_PROOF_FIELDS.map((field) => field.key), GIVEAWAY_WHEEL_PROFILE_FIELD.key];
const SEGMENT_PALETTE = [
  { fill: "#6f3e43", text: "#ffffff" },
  { fill: "#f2ded5", text: "#3f262a" },
  { fill: "#d79b95", text: "#3f262a" },
  { fill: "#eac0bb", text: "#3f262a" },
];
const PH_TIMEZONE = "Asia/Manila";
const PH_OFFSET = "+08:00";

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function estimateWheelLabelLength(text, fontSize) {
  return String(text || "").trim().length * fontSize * WHEEL_LABEL_FONT_WIDTH_RATIO;
}

function splitWheelLabel(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return ["Guest"];

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    const midpoint = Math.ceil(normalized.length / 2);
    return [normalized.slice(0, midpoint), normalized.slice(midpoint)].filter(Boolean);
  }

  let bestSplitIndex = 1;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const left = words.slice(0, index).join(" ");
    const right = words.slice(index).join(" ");
    const delta = Math.abs(left.length - right.length);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestSplitIndex = index;
    }
  }

  return [
    words.slice(0, bestSplitIndex).join(" "),
    words.slice(bestSplitIndex).join(" "),
  ].filter(Boolean);
}

function buildWheelLabelLayout(text, segmentCount) {
  const normalizedText = String(text || "").trim() || "Guest";
  const densityOffset = segmentCount > 20 ? 10 : segmentCount > 12 ? 6 : 0;
  const innerRadius = WHEEL_CORE_RADIUS + WHEEL_LABEL_INNER_PADDING + densityOffset;
  const outerRadius = WHEEL_RADIUS - WHEEL_LABEL_OUTER_PADDING - densityOffset;
  const radialCapacity = Math.max(outerRadius - innerRadius, 48);
  const maxFontSize = clampNumber(230 / Math.max(segmentCount, 3), 16, 34);

  const singleLineFontSize = clampNumber(
    radialCapacity / Math.max(normalizedText.length * WHEEL_LABEL_FONT_WIDTH_RATIO, 1),
    WHEEL_LABEL_MIN_FONT_SIZE,
    maxFontSize
  );

  if (singleLineFontSize >= 12 || normalizedText.length <= 12) {
    return {
      lines: [{ text: normalizedText, angleOffset: 0 }],
      fontSize: singleLineFontSize,
      innerRadius,
      outerRadius,
      textLength: radialCapacity * 0.96,
    };
  }

  const splitLines = splitWheelLabel(normalizedText);
  const longestSplitLineLength = splitLines.reduce((longest, line) => Math.max(longest, line.length), 1);
  const splitFontSize = clampNumber(
    radialCapacity / Math.max(longestSplitLineLength * WHEEL_LABEL_FONT_WIDTH_RATIO, 1),
    WHEEL_LABEL_MIN_FONT_SIZE,
    Math.min(maxFontSize, 18)
  );
  const offset = segmentCount > 18 ? 1.2 : 0.85;

  return {
    lines: splitLines.map((lineText, index) => ({
      text: lineText,
      angleOffset: splitLines.length === 1 ? 0 : (index === 0 ? -offset : offset),
    })),
    fontSize: splitFontSize,
    innerRadius,
    outerRadius,
    textLength: radialCapacity * 0.94,
  };
}

function createInitialUploadFieldState() {
  return ALL_PROOF_FIELD_KEYS.reduce((accumulator, fieldKey) => {
    accumulator[fieldKey] = { isValidating: false, error: "", fileName: "" };
    return accumulator;
  }, {});
}

async function readImageDimensions(file) {
  const tempUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: Number(image.naturalWidth) || 0, height: Number(image.naturalHeight) || 0 });
      image.onerror = () => reject(new Error("Unable to read this image. Please choose another file."));
      image.src = tempUrl;
    });
    return dimensions;
  } finally {
    URL.revokeObjectURL(tempUrl);
  }
}

function sanitizeProofPreviewSrc(src) {
  const value = String(src || "").trim();
  if (!value) return "";
  if (/^(blob:|data:)/i.test(value)) return value;
  if (/^https?:\/\//i.test(value) || value.startsWith("//")) {
    return value.includes("/uploads/giveaway-wheel/") ? value : "";
  }
  return value.includes("/uploads/giveaway-wheel/") ? value : "";
}

function formatKilobytes(bytes) {
  const kb = Math.max(1, Math.round((Number(bytes) || 0) / 1024));
  return `${kb} KB`;
}

function extractFileName(src) {
  const value = String(src || "").trim();
  if (!value) return "";
  try {
    const normalized = value.startsWith("http") ? new URL(value).pathname : value;
    const name = normalized.split("/").pop() || "";
    return decodeURIComponent(name);
  } catch {
    const name = value.split("/").pop() || "";
    return name;
  }
}

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

function formatFirstSpinDate(value) {
  const parsed = parseFirstSpinDate(value);
  if (!parsed) return "";
  return parsed.toLocaleString("en-PH", {
    timeZone: PH_TIMEZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) + " PHT";
}

function parseFirstSpinDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)
    ? `${raw}:00${PH_OFFSET}`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)
      ? `${raw}${PH_OFFSET}`
      : raw;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatWinnerWonAt(value) {
  const parsed = parseFirstSpinDate(value);
  if (!parsed) return "";
  return parsed.toLocaleString("en-PH", {
    timeZone: PH_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) + " PHT";
}

function getSegmentFill(index) {
  return SEGMENT_PALETTE[index % SEGMENT_PALETTE.length].fill;
}

function getSegmentTextFill(index) {
  return SEGMENT_PALETTE[index % SEGMENT_PALETTE.length].text;
}

function shuffleArray(items = []) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function readHostSessionFromStorage() {
  try {
    const raw = window.sessionStorage.getItem(WHEEL_HOST_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) {
      window.sessionStorage.removeItem(WHEEL_HOST_SESSION_STORAGE_KEY);
      return null;
    }
    return {
      token: String(parsed.token),
      role: String(parsed.role || ""),
      username: String(parsed.username || ""),
    };
  } catch {
    return null;
  }
}

function writeHostSessionToStorage(session) {
  if (!session?.token) {
    window.sessionStorage.removeItem(WHEEL_HOST_SESSION_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(WHEEL_HOST_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function readDrawModePreference() {
  try {
    const raw = window.sessionStorage.getItem(WHEEL_DRAW_MODE_PREF_STORAGE_KEY);
    if (!raw) {
      return { mode: "KEEP", remember: false };
    }
    const parsed = JSON.parse(raw);
    return {
      mode: parsed?.mode === "REMOVE" ? "REMOVE" : "KEEP",
      remember: Boolean(parsed?.remember),
    };
  } catch {
    return { mode: "KEEP", remember: false };
  }
}

function writeDrawModePreference(preference) {
  window.sessionStorage.setItem(WHEEL_DRAW_MODE_PREF_STORAGE_KEY, JSON.stringify(preference));
}

function readSoundPreference() {
  try {
    const raw = window.sessionStorage.getItem(WHEEL_SOUND_PREF_STORAGE_KEY);
    return raw === "1";
  } catch {
    return false;
  }
}

function writeSoundPreference(enabled) {
  window.sessionStorage.setItem(WHEEL_SOUND_PREF_STORAGE_KEY, enabled ? "1" : "0");
}

function readTickProfilePreference() {
  try {
    const raw = String(window.sessionStorage.getItem(WHEEL_TICK_PROFILE_PREF_STORAGE_KEY) || "").trim().toUpperCase();
    if (raw === "SOFT" || raw === "BALANCED" || raw === "CLICKY" || raw === "TURBO") {
      return raw;
    }
  } catch {
    // Ignore preference read errors.
  }
  return "BALANCED";
}

function writeTickProfilePreference(profile) {
  window.sessionStorage.setItem(WHEEL_TICK_PROFILE_PREF_STORAGE_KEY, String(profile || "BALANCED"));
}

function readSoundVolumePreference() {
  try {
    const raw = Number(window.sessionStorage.getItem(WHEEL_SOUND_VOLUME_PREF_STORAGE_KEY));
    if (Number.isFinite(raw)) {
      return Math.min(1, Math.max(0.15, raw));
    }
  } catch {
    // Ignore preference read errors.
  }
  return 0.72;
}

function writeSoundVolumePreference(volume) {
  const normalized = Math.min(1, Math.max(0.15, Number(volume) || 0.72));
  window.sessionStorage.setItem(WHEEL_SOUND_VOLUME_PREF_STORAGE_KEY, String(normalized));
}

function hexToRgb(hexColor) {
  const normalized = String(hexColor || "").replace("#", "").trim();
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return null;
  return { r, g, b };
}

function resolvePointerPingTone(fillColor) {
  const rgb = hexToRgb(fillColor);
  if (!rgb) return "warm";
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance < 0.48 ? "cool" : "warm";
}

function normalizeRotationDegrees(rotation) {
  const normalized = Number(rotation) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

const WHEEL_TICK_PROFILE_CONFIG = {
  SOFT: {
    segment: { type: "triangle", attackGain: 0.018, endGain: 0.0001, startFrequency: 640, endFrequency: 470, duration: 0.052 },
    winner: { type: "triangle", attackGain: 0.042, endGain: 0.0001, startFrequency: 820, endFrequency: 510, duration: 0.125 },
  },
  BALANCED: {
    segment: { type: "triangle", attackGain: 0.048, endGain: 0.0001, startFrequency: 800, endFrequency: 560, duration: 0.06 },
    winner: { type: "triangle", attackGain: 0.082, endGain: 0.0001, startFrequency: 930, endFrequency: 580, duration: 0.145 },
  },
  CLICKY: {
    segment: { type: "square", attackGain: 0.098, endGain: 0.0001, startFrequency: 1210, endFrequency: 730, duration: 0.038 },
    winner: { type: "square", attackGain: 0.125, endGain: 0.0001, startFrequency: 1330, endFrequency: 760, duration: 0.112 },
  },
  TURBO: {
    segment: { type: "square", attackGain: 0.14, endGain: 0.0001, startFrequency: 1480, endFrequency: 810, duration: 0.031 },
    winner: { type: "square", attackGain: 0.17, endGain: 0.0001, startFrequency: 1650, endFrequency: 880, duration: 0.104 },
  },
};

function buildFormDataPayload(entry, selectedFiles) {
  const payload = new FormData();
  payload.append("fullName", String(entry.fullName || "").trim());
  const normalizedEntryPassword = String(entry.entryPassword || "").trim();
  payload.append("entryPassword", normalizedEntryPassword);

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
  const entryModalRef = useRef(null);
  const lastFocusedElementRef = useRef(null);
  const wheelAudioContextRef = useRef(null);
  const spinTickTimeoutIdsRef = useRef([]);
  const pointerTickTimeoutRef = useRef(null);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isSearchResultsModalOpen, setIsSearchResultsModalOpen] = useState(false);
  const [activePrizeLightboxIndex, setActivePrizeLightboxIndex] = useState(null);
  const [openedFromSearchResult, setOpenedFromSearchResult] = useState(false);
  const [canScrollPrizeLeft, setCanScrollPrizeLeft] = useState(false);
  const [canScrollPrizeRight, setCanScrollPrizeRight] = useState(false);
  const [prizeScrollRatio, setPrizeScrollRatio] = useState(0);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false);
  const [uploadStateByField, setUploadStateByField] = useState(() => createInitialUploadFieldState());
  const [activeProofLightbox, setActiveProofLightbox] = useState(null);
  const [latestDrawResult, setLatestDrawResult] = useState(null);
  const [isHostGateOpen, setIsHostGateOpen] = useState(false);
  const [hostGateStep, setHostGateStep] = useState("prompt");
  const [hostLoginForm, setHostLoginForm] = useState({ username: "", password: "" });
  const [hostLoginError, setHostLoginError] = useState("");
  const [isHostLoggingIn, setIsHostLoggingIn] = useState(false);
  const [hostSession, setHostSession] = useState(() => readHostSessionFromStorage());
  const [isDrawModeModalOpen, setIsDrawModeModalOpen] = useState(false);
  const [drawModeSelection, setDrawModeSelection] = useState(() => readDrawModePreference().mode);
  const [rememberDrawMode, setRememberDrawMode] = useState(() => readDrawModePreference().remember);
  const [isDrawModeConfirmed, setIsDrawModeConfirmed] = useState(false);
  const [hostStatusNotice, setHostStatusNotice] = useState("");
  const [winnerPopup, setWinnerPopup] = useState({
    isOpen: false,
    winnerName: "",
    winnerImageSrc: "",
    removed: false,
  });
  const [isPointerPing, setIsPointerPing] = useState(false);
  const [isPointerTickPulse, setIsPointerTickPulse] = useState(false);
  const [pointerPingTone, setPointerPingTone] = useState("warm");
  const [isWheelSoundEnabled, setIsWheelSoundEnabled] = useState(() => readSoundPreference());
  const [wheelTickProfile, setWheelTickProfile] = useState(() => readTickProfilePreference());
  const [wheelSoundVolume, setWheelSoundVolume] = useState(() => readSoundVolumePreference());
  const [showEntryPassword, setShowEntryPassword] = useState(false);

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
      if (isSpinning) {
        return;
      }
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
  }, [isSpinning]);

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
    writeDrawModePreference({ mode: drawModeSelection, remember: rememberDrawMode });
  }, [drawModeSelection, rememberDrawMode]);

  useEffect(() => {
    writeSoundPreference(isWheelSoundEnabled);
  }, [isWheelSoundEnabled]);

  useEffect(() => {
    writeTickProfilePreference(wheelTickProfile);
  }, [wheelTickProfile]);

  useEffect(() => {
    writeSoundVolumePreference(wheelSoundVolume);
  }, [wheelSoundVolume]);

  useEffect(() => {
    if (!winnerPopup.isOpen) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      setWinnerPopup((previous) => ({ ...previous, isOpen: false }));
    }, 7000);
    return () => window.clearTimeout(timeoutId);
  }, [winnerPopup.isOpen]);

  useEffect(() => {
    return () => {
      spinTickTimeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      spinTickTimeoutIdsRef.current = [];
      if (pointerTickTimeoutRef.current) {
        window.clearTimeout(pointerTickTimeoutRef.current);
        pointerTickTimeoutRef.current = null;
      }
      try {
        wheelAudioContextRef.current?.close?.();
      } catch {
        // Ignore close failures.
      }
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

  const weightedSegmentsBase = useMemo(() => {
    return approvedWheelEntries.flatMap((entry) => Array.from(
      { length: Math.max(1, Number(entry.entryCount) || 0) },
      () => ({ ...entry })
    ));
  }, [approvedWheelEntries]);

  const [weightedSegments, setWeightedSegments] = useState([]);

  useEffect(() => {
    setWeightedSegments(weightedSegmentsBase);
  }, [weightedSegmentsBase]);

  const approvedSegments = useMemo(() => {
    return weightedSegments.map((segment, index) => ({ ...segment, wheelIndex: index }));
  }, [weightedSegments]);

  const hasActiveHostSession = Boolean(hostSession?.token);


  const prizeImages = useMemo(() => giveawayImageList(giveawaySettings), [giveawaySettings]);

  const sidePrizeKicker = "Grand Prize";
  const rawPrizeTitle = String(giveawaySettings?.prizeLabel || "").trim();
  const sidePrizeTitle = ["", "prize", "featured prize"].includes(rawPrizeTitle.toLowerCase())
    ? "Nike Vapor Pro 3"
    : rawPrizeTitle;
  const sidePrizeDescription = String(giveawaySettings?.leaderboardPrizeNote || "").trim() || "Featured Prize";
  const sideJoinKicker = "Join";
  const sideJoinTitle = "Join";
  const sideJoinDescription = "Submit your entry.";
  const sideSearchKicker = "Search";
  const sideSearchTitle = "Check Your Entry";
  const sideSearchDescription = "Check your status.";
  const firstSpinAt = String(giveawaySettings?.firstSpinAt || "").trim();
  const firstSpinDate = parseFirstSpinDate(firstSpinAt);
  const firstSpinLabel = formatFirstSpinDate(firstSpinAt);
  const firstSpinCountdown = useCountdown(firstSpinDate ? firstSpinDate.toISOString() : null, Boolean(firstSpinDate));
  const consolationTitle = String(giveawaySettings?.consolationTitle || "").trim() || "Consolation Winners";
  const consolationPrizes = [
    String(giveawaySettings?.consolationPrizeOne || "").trim() || "₱1,000 Cash Prize",
    String(giveawaySettings?.consolationPrizeTwo || "").trim() || "₱500 Cash Prize",
    String(giveawaySettings?.consolationPrizeThree || "").trim() || "₱300 Cash Prize",
  ].filter(Boolean);

  useEffect(() => {
    const container = prizeGridRef.current;
    if (!container) {
      setCanScrollPrizeLeft(false);
      setCanScrollPrizeRight(false);
      setPrizeScrollRatio(0);
      return undefined;
    }

    container.scrollLeft = 0;

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      const currentScrollLeft = Math.max(0, container.scrollLeft);
      setCanScrollPrizeLeft(currentScrollLeft > 2);
      setCanScrollPrizeRight(maxScrollLeft - currentScrollLeft > 2);
      setPrizeScrollRatio(maxScrollLeft > 0 ? Math.min(1, currentScrollLeft / maxScrollLeft) : 0);
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
    const persistedCount = Math.max(0, Number(entryForm.entryCount) || 0);
    if (persistedCount > 0) {
      return persistedCount;
    }

    return GIVEAWAY_WHEEL_PROOF_FIELDS.reduce((total, field) => {
      const isApprovedProof = String(proofReview[field.key]?.status || "").toUpperCase() === "APPROVED";
      return total + (isApprovedProof ? field.weight : 0);
    }, 0);
  }, [entryForm.entryCount, proofReview]);

  const scrollPrizeGrid = (direction) => {
    const container = prizeGridRef.current;
    if (!container) return;
    const step = Math.max(140, Math.floor(container.clientWidth * 0.72));
    container.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const handleFileChange = async (fieldKey, event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    setFormError("");
    setFormMessage("");

    if (!file) {
      return;
    }

    setUploadStateByField((previous) => ({
      ...previous,
      [fieldKey]: { isValidating: true, error: "", fileName: file.name || "" },
    }));

    if (!file.type.startsWith("image/")) {
      setUploadStateByField((previous) => ({
        ...previous,
        [fieldKey]: { isValidating: false, error: "Image files only please.", fileName: "" },
      }));
      return;
    }

    if (file.size > GIVEAWAY_WHEEL_MAX_UPLOAD_SIZE_BYTES) {
      setUploadStateByField((previous) => ({
        ...previous,
        [fieldKey]: { isValidating: false, error: "This image is too large. Please upload an image up to 25MB.", fileName: "" },
      }));
      return;
    }

    try {
      const { width, height } = await readImageDimensions(file);
      if (width < MIN_UPLOAD_DIMENSION_PX || height < MIN_UPLOAD_DIMENSION_PX) {
        setUploadStateByField((previous) => ({
          ...previous,
          [fieldKey]: {
            isValidating: false,
            error: `Image is too small. Minimum size is ${MIN_UPLOAD_DIMENSION_PX}x${MIN_UPLOAD_DIMENSION_PX}px.`,
            fileName: "",
          },
        }));
        return;
      }
    } catch (validationError) {
      setUploadStateByField((previous) => ({
        ...previous,
        [fieldKey]: {
          isValidating: false,
          error: validationError.message || "Unable to read this image. Please choose another file.",
          fileName: "",
        },
      }));
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
    setUploadStateByField((previous) => ({
      ...previous,
      [fieldKey]: { isValidating: false, error: "", fileName: file.name || "" },
    }));
  };

  const clearUploadFieldState = (fieldKey) => {
    setUploadStateByField((previous) => ({
      ...previous,
      [fieldKey]: { isValidating: false, error: "", fileName: "" },
    }));
  };

  const triggerFilePicker = (inputId) => {
    const inputElement = document.getElementById(inputId);
    if (inputElement) {
      inputElement.click();
    }
  };

  const clearSelectedFile = (fieldKey) => {
    const existingPreview = filePreviews[fieldKey];
    if (existingPreview?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(existingPreview);
      } catch {
        // Ignore revocation failures.
      }
      previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== existingPreview);
    }

    setSelectedFiles((previous) => ({ ...previous, [fieldKey]: null }));
    setFilePreviews((previous) => ({ ...previous, [fieldKey]: "" }));
    clearUploadFieldState(fieldKey);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (String(entryForm.status || "").toUpperCase() === "APPROVED") {
      return;
    }

    setFormError("");
    setFormMessage("");

    const hasPendingValidation = ALL_PROOF_FIELD_KEYS.some((fieldKey) => uploadStateByField[fieldKey]?.isValidating);
    if (hasPendingValidation) {
      setFormError("Please wait until all selected images finish validating.");
      return;
    }

    const failedValidationField = ALL_PROOF_FIELD_KEYS.find((fieldKey) => Boolean(uploadStateByField[fieldKey]?.error));
    if (failedValidationField) {
      setFormError("Please fix image upload errors before submitting.");
      return;
    }

    const normalizedFullName = String(entryForm.fullName || "").trim();
    const normalizedEntryPassword = String(entryForm.entryPassword || "").trim();
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

    if (!normalizedEntryPassword) {
      setFormError("Please enter your entry password.");
      return;
    }

    if (normalizedEntryPassword.length < 4) {
      setFormError("Entry password must be at least 4 characters.");
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

    const isEditing = Boolean(entryForm.id);

    setIsSubmitting(true);

    try {
      const url = isEditing ? `/api/public/giveaway-wheel/entries/${entryForm.id}` : "/api/public/giveaway-wheel/entries";
      const method = isEditing ? "PUT" : "POST";
      const saveEntryWithPassword = async (passwordOverride = undefined) => {
        const payloadEntry = passwordOverride === undefined
          ? entryForm
          : { ...entryForm, entryPassword: passwordOverride };
        return submitMultipartEntry(url, method, payloadEntry, selectedFiles);
      };

      let effectivePassword = String(entryForm.entryPassword || "");
      let response;

      try {
        response = await saveEntryWithPassword();
      } catch (error) {
        const message = String(error?.message || "");
        const requiresPassword = isEditing && /password/i.test(message);
        if (!requiresPassword) {
          throw error;
        }

        const promptedPassword = window.prompt("This entry is password-protected. Enter password to save changes:");
        if (promptedPassword === null) {
          throw new Error("Entry update cancelled. Password is required for protected entries.");
        }
        effectivePassword = String(promptedPassword || "").trim();
        response = await saveEntryWithPassword(effectivePassword);
      }

      setEntryForm(normalizeEntryFormData(response, { prefilledPassword: effectivePassword }));
      setProofReview(normalizeProofReview(response));
      setIsFeedbackExpanded(false);
      setSelectedFiles(EMPTY_FILES);
      setFilePreviews(EMPTY_PREVIEWS);
      setUploadStateByField(createInitialUploadFieldState());
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

  const flashHostStatusNotice = (message) => {
    setHostStatusNotice(String(message || ""));
    if (!message) {
      return;
    }
    window.setTimeout(() => {
      setHostStatusNotice("");
    }, HOST_STATUS_NOTICE_DURATION_MS);
  };

  const playWheelWinnerTick = () => {
    if (!isWheelSoundEnabled) {
      return;
    }
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }
    if (!wheelAudioContextRef.current) {
      wheelAudioContextRef.current = new AudioContextCtor();
    }

    const context = wheelAudioContextRef.current;
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }

    const playTickTone = (toneMode) => {
      const selectedProfile = WHEEL_TICK_PROFILE_CONFIG[wheelTickProfile] || WHEEL_TICK_PROFILE_CONFIG.BALANCED;
      const tickConfig = selectedProfile[toneMode] || selectedProfile.segment;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = tickConfig.type;
      oscillator.frequency.setValueAtTime(tickConfig.startFrequency, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(tickConfig.endFrequency, context.currentTime + tickConfig.duration * 0.9);

      gainNode.gain.setValueAtTime(0.0001, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(tickConfig.attackGain * wheelSoundVolume, context.currentTime + 0.008);
      gainNode.gain.exponentialRampToValueAtTime(tickConfig.endGain, context.currentTime + tickConfig.duration);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + tickConfig.duration + 0.01);
    };

    playTickTone("winner");
  };

  const clearScheduledSpinTicks = () => {
    spinTickTimeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    spinTickTimeoutIdsRef.current = [];
  };

  const triggerPointerTickPulse = (tone = "warm") => {
    setPointerPingTone(tone);
    if (pointerTickTimeoutRef.current) {
      window.clearTimeout(pointerTickTimeoutRef.current);
      pointerTickTimeoutRef.current = null;
    }
    setIsPointerTickPulse(true);
    pointerTickTimeoutRef.current = window.setTimeout(() => {
      setIsPointerTickPulse(false);
    }, 120);
  };

  const playWheelSegmentTick = (tone = "warm") => {
    if (!isWheelSoundEnabled) {
      return;
    }
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }
    if (!wheelAudioContextRef.current) {
      wheelAudioContextRef.current = new AudioContextCtor();
    }

    const context = wheelAudioContextRef.current;
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }

    const selectedProfile = WHEEL_TICK_PROFILE_CONFIG[wheelTickProfile] || WHEEL_TICK_PROFILE_CONFIG.BALANCED;
    const config = selectedProfile.segment;
    const toneOffset = tone === "cool" ? 36 : -10;

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(Math.max(180, config.startFrequency + toneOffset), context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(160, config.endFrequency + toneOffset * 0.4), context.currentTime + config.duration * 0.9);

    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(config.attackGain * wheelSoundVolume, context.currentTime + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(config.endGain, context.currentTime + config.duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + config.duration + 0.01);
  };

  const scheduleSpinSegmentTicks = ({ fromRotation, toRotation, segmentCount, durationMs }) => {
    clearScheduledSpinTicks();
    if (!isWheelSoundEnabled || segmentCount <= 0 || durationMs <= 0) {
      return;
    }

    const anglePerSegment = 360 / segmentCount;
    const totalAngle = Math.abs(toRotation - fromRotation);
    const tickCount = Math.max(1, Math.round(totalAngle / anglePerSegment));
    const baseSegmentIndex = Math.floor(normalizeRotationDegrees(fromRotation) / anglePerSegment);

    for (let tickNumber = 1; tickNumber <= tickCount; tickNumber += 1) {
      const linearProgress = tickNumber / tickCount;
      const easedProgress = 1 - Math.pow(1 - linearProgress, 2.2);
      const fireAtMs = Math.max(0, Math.min(durationMs - 36, Math.round(durationMs * easedProgress)));
      const currentSegmentIndex = (baseSegmentIndex + tickNumber) % segmentCount;
      const tone = resolvePointerPingTone(getSegmentFill(currentSegmentIndex));
      const timeoutId = window.setTimeout(() => {
        triggerPointerTickPulse(tone);
        playWheelSegmentTick(tone);
      }, fireAtMs);
      spinTickTimeoutIdsRef.current.push(timeoutId);
    }
  };

  const toggleWheelSound = () => {
    setIsWheelSoundEnabled((previous) => {
      const next = !previous;
      flashHostStatusNotice(next ? "Wheel sound enabled." : "Wheel sound muted.");
      return next;
    });
  };

  const cycleWheelTickProfile = () => {
    const nextByCurrent = {
      SOFT: "BALANCED",
      BALANCED: "CLICKY",
      CLICKY: "TURBO",
      TURBO: "SOFT",
    };
    setWheelTickProfile((previous) => {
      const current = previous in nextByCurrent ? previous : "BALANCED";
      const next = nextByCurrent[current];
      const labelByMode = {
        SOFT: "Soft",
        BALANCED: "Balanced",
        CLICKY: "Clicky",
        TURBO: "Turbo",
      };
      flashHostStatusNotice(`Tick tone: ${labelByMode[next]}.`);
      return next;
    });
  };

  const handleWheelSoundVolumeChange = (event) => {
    const sliderValue = Number(event.target.value);
    if (!Number.isFinite(sliderValue)) {
      return;
    }
    setWheelSoundVolume(Math.min(1, Math.max(0.15, sliderValue / 100)));
  };

  const closeHostGate = () => {
    setIsHostGateOpen(false);
    setHostGateStep("prompt");
    setHostLoginError("");
    setHostLoginForm({ username: "", password: "" });
  };

  const lockHostSession = (noticeMessage = "Host session ended.") => {
    setHostSession(null);
    setIsDrawModeConfirmed(false);
    writeHostSessionToStorage(null);
    flashHostStatusNotice(noticeMessage);
  };

  const handleHostLogout = () => {
    lockHostSession("Admin logged out from wheel controls.");
    setIsDrawModeModalOpen(false);
  };

  const handleHostLoginSubmit = async (event) => {
    event.preventDefault();
    const username = String(hostLoginForm.username || "").trim();
    const password = String(hostLoginForm.password || "");
    if (!username || !password) {
      setHostLoginError("Enter admin username and password.");
      return;
    }

    setIsHostLoggingIn(true);
    setHostLoginError("");
    try {
      const response = await apiRequest("/api/auth/login", "POST", { username, password });
      const role = String(response?.role || "").toUpperCase();
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        throw new Error("Admin access required to run the wheel draw.");
      }

      const nextSession = {
        token: String(response?.token || ""),
        role,
        username: String(response?.username || username),
      };
      setHostSession(nextSession);
      setIsDrawModeConfirmed(false);
      writeHostSessionToStorage(nextSession);
      closeHostGate();
      flashHostStatusNotice("Host unlocked. Choose draw mode before spinning.");
    } catch (error) {
      setHostLoginError(error?.message || "Unable to verify admin login.");
    } finally {
      setIsHostLoggingIn(false);
    }
  };

  const runAdminDraw = async (removeWinnerFromWheel) => {
    if (isSpinning || approvedSegments.length === 0 || weightedSegments.length === 0) {
      return;
    }
    if (!hasActiveHostSession) {
      setIsDrawModeModalOpen(false);
      setHostGateStep("prompt");
      setIsHostGateOpen(true);
      return;
    }

    setIsDrawModeModalOpen(false);
    setIsSpinning(true);

    let drawResult;
    try {
      drawResult = await apiRequest(
        "/api/admin/settings/gaming/giveaway-wheel/draw",
        "POST",
        { removeWinnerFromWheel: Boolean(removeWinnerFromWheel) },
        hostSession.token
      );
    } catch (error) {
      setIsSpinning(false);
      const message = String(error?.message || "");
      if (/unauthorized|forbidden|invalid|expired/i.test(message)) {
        setHostSession(null);
        setIsDrawModeConfirmed(false);
        writeHostSessionToStorage(null);
        flashHostStatusNotice("Admin session expired or invalid. Login again to continue.");
      }
      window.alert(error?.message || "Unable to draw a winner right now. Please try again.");
      return;
    }

    const winnerEntryId = Number(drawResult?.winnerEntryId) || 0;
    const winnerTicketOffset = Math.max(0, Number(drawResult?.winnerTicketOffset) || 0);
    const winnerSegments = approvedSegments.filter((segment) => Number(segment.id) === winnerEntryId);
    const winningSegment = winnerSegments.length > 0
      ? winnerSegments[winnerTicketOffset % winnerSegments.length]
      : approvedSegments.find((segment) => Number(segment.id) === winnerEntryId);

    if (!winningSegment) {
      setIsSpinning(false);
      window.alert("Winner was selected, but your wheel data changed. Refresh page and spin again.");
      await loadWheelEntries();
      return;
    }

    setPointerPingTone(resolvePointerPingTone(getSegmentFill(winningSegment.wheelIndex)));

    setLatestDrawResult({
      ...drawResult,
      winnerRemovedFromWheel: Boolean(drawResult?.winnerRemovedFromWheel),
    });

    const anglePerSegment = 360 / weightedSegments.length;
    const targetAngle = (winningSegment.wheelIndex + 0.5) * anglePerSegment;
    const extraTurns = 6 * 360;
    const randomOffset = 0;
    const nextRotation = activeRotation + extraTurns - targetAngle + randomOffset;

    scheduleSpinSegmentTicks({
      fromRotation: activeRotation,
      toRotation: nextRotation,
      segmentCount: weightedSegments.length,
      durationMs: SPIN_DURATION_MS,
    });
    setActiveRotation(nextRotation);
    window.setTimeout(() => {
      clearScheduledSpinTicks();
      setIsPointerTickPulse(false);
      setIsSpinning(false);
      setIsPointerPing(true);
      playWheelWinnerTick();
      window.setTimeout(() => setIsPointerPing(false), 700);
      loadWheelEntries().catch(() => undefined);
      setWinnerPopup({
        isOpen: true,
        winnerName: formatEntryDisplayName(
          winningSegment?.fullName || drawResult?.winnerFullName || "Winner",
          winningSegment?.sourceTag
        ),
        winnerImageSrc: getGiveawayWheelImageSrc(
          winningSegment?.facebookProfileImagePath
            || drawResult?.winnerProfileImagePath
            || drawResult?.winnerFacebookProfileImagePath
        ),
        removed: Boolean(drawResult?.winnerRemovedFromWheel),
      });
    }, SPIN_DURATION_MS);
  };

  const handleDrawModeAction = (mode) => {
    const normalizedMode = mode === "REMOVE" ? "REMOVE" : "KEEP";
    setDrawModeSelection(normalizedMode);
    setIsDrawModeConfirmed(true);
    setIsDrawModeModalOpen(false);
    flashHostStatusNotice(`Draw mode saved: ${normalizedMode === "REMOVE" ? "Remove Winner" : "Keep Winner"}. Tap center wheel to spin.`);
  };

  const handleSpinAttempt = () => {
    if (isSpinning || approvedSegments.length === 0 || weightedSegments.length === 0) {
      return;
    }
    if (!hasActiveHostSession) {
      setHostGateStep("prompt");
      setIsHostGateOpen(true);
      return;
    }

    if (!isDrawModeConfirmed) {
      flashHostStatusNotice("Set draw mode first via the options icon.");
      return;
    }

    runAdminDraw(drawModeSelection === "REMOVE");
  };

  const handleVisualShuffle = () => {
    if (isSpinning || weightedSegments.length === 0) {
      return;
    }
    setWeightedSegments((previous) => shuffleArray(previous));
  };

  const handleOpenHostControls = () => {
    if (!hasActiveHostSession) {
      setHostGateStep("prompt");
      setIsHostGateOpen(true);
      return;
    }
    setIsDrawModeModalOpen(true);
  };

  const openModal = (nextModal) => {
    lastFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpenedFromSearchResult(false);
    setActiveModal(nextModal);
    setUploadStateByField(createInitialUploadFieldState());
    setShowEntryPassword(false);
    setFormError("");
    setFormMessage("");
  };

  const closeModal = ({ force = false } = {}) => {
    if (!force) {
      const hasUnsavedUploads = ALL_PROOF_FIELD_KEYS.some((fieldKey) => Boolean(selectedFiles[fieldKey]));
      if (hasUnsavedUploads && !isSubmitting) {
        const shouldClose = window.confirm("You have selected uploads that are not submitted yet. Close anyway?");
        if (!shouldClose) {
          return;
        }
      }
    }

    setActiveModal(null);
    setActiveProofLightbox(null);
    if (openedFromSearchResult) {
      setEntryForm(EMPTY_FORM);
      setProofReview(EMPTY_PROOF_REVIEW);
      setSelectedFiles(EMPTY_FILES);
      setFilePreviews(EMPTY_PREVIEWS);
      setOpenedFromSearchResult(false);
    }
    setUploadStateByField(createInitialUploadFieldState());
    setShowEntryPassword(false);
    setFormError("");
    setFormMessage("");
    setIsFeedbackExpanded(false);
  };

  const closeSearchResultsModal = () => {
    setIsSearchResultsModalOpen(false);
  };

  const handleOpenSearchResult = async (entryId) => {
    setSearchError("");
    setFormError("");
    setFormMessage("");

    const selectedSearchResult = searchResults.find((entry) => entry.id === entryId) || null;
    let providedPassword = "";

    try {
      if (selectedSearchResult?.passwordProtected) {
        const promptedPassword = window.prompt("This entry is password-protected. Enter password to open:");
        if (promptedPassword === null) {
          return;
        }
        providedPassword = String(promptedPassword || "").trim();
      }

      const loadEntry = async () => {
        const passwordQuery = providedPassword ? `?password=${encodeURIComponent(providedPassword)}` : "";
        return apiRequest(`/api/public/giveaway-wheel/entries/${entryId}/search-open${passwordQuery}`);
      };

      let data;
      while (true) {
        try {
          data = await loadEntry();
          break;
        } catch (error) {
          const message = String(error?.message || "");
          const isPasswordError = /password/i.test(message);
          if (!isPasswordError) {
            throw error;
          }
          const promptedPassword = window.prompt(message.includes("Invalid")
            ? "Incorrect password. Please try again:"
            : "This entry is password-protected. Enter password:");
          if (promptedPassword === null) {
            return;
          }
          providedPassword = String(promptedPassword || "").trim();
        }
      }

      if (!data?.id) {
        setSearchError("Entry details are not available right now.");
        return;
      }

      const normalizedStatus = String(data.status || "").toUpperCase();
      if (normalizedStatus !== "APPROVED" && normalizedStatus !== "REJECTED") {
        setSearchError("Only approved or rejected entries can be opened in view-only mode.");
        return;
      }

      setEntryForm(normalizeEntryFormData(data, { prefilledPassword: providedPassword }));
      setProofReview(normalizeProofReview(data));
      const sourceTag = String(data?.sourceTag || "").trim().toUpperCase();
      if (sourceTag === "GIVEAWAY_1") {
        setFormMessage("This entry is from Giveaway 1 and already has 1 wheel entry.");
      }
      setIsFeedbackExpanded(false);
      setSelectedFiles(EMPTY_FILES);
      setFilePreviews(EMPTY_PREVIEWS);
      setUploadStateByField(createInitialUploadFieldState());
      setOpenedFromSearchResult(true);
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
  const isGiveaway1ImportedEntry = String(entryForm.sourceTag || "").trim().toUpperCase() === "GIVEAWAY_1";
  const isApprovedReadOnly = readOnlyStatus === "APPROVED";
  const isEntryReadOnly = isApprovedReadOnly || isGiveaway1ImportedEntry;
  const rejectionFeedback = String(entryForm.rejectionReason || "").trim();
  const parsedRejectionFeedback = useMemo(() => rejectionFeedback
    .split("|")
    .map((line) => line.trim())
    .filter(Boolean), [rejectionFeedback]);
  const shouldShowFeedbackToggle = rejectionFeedback.length > 96 || parsedRejectionFeedback.length > 1;
  const hasFieldLevelRejectionFeedback = [GIVEAWAY_WHEEL_PROFILE_FIELD, ...GIVEAWAY_WHEEL_PROOF_FIELDS].some((field) => {
    const review = proofReview[field.key];
    return String(review?.status || "").toUpperCase() === "REJECTED" && Boolean(String(review?.rejectionReason || "").trim());
  });
  const getProofVisualStatus = (status, hasImage) => {
    const normalizedStatus = String(status || "").toUpperCase();
    if (normalizedStatus === "REJECTED") {
      return { tone: "rejected", label: "Rejected" };
    }
    if (hasImage || normalizedStatus === "APPROVED") {
      return { tone: "completed", label: "Completed" };
    }
    return { tone: "pending", label: "Pending" };
  };
  const getFileDescriptor = (fieldKey, imageSrc) => {
    const selectedFile = selectedFiles[fieldKey];
    if (selectedFile) {
      return {
        hasFile: true,
        fileName: selectedFile.name || "Uploaded image",
        fileSize: formatKilobytes(selectedFile.size),
        thumbSrc: filePreviews[fieldKey] || imageSrc || "",
        canClear: true,
      };
    }
    if (imageSrc) {
      return {
        hasFile: true,
        fileName: extractFileName(imageSrc) || "Uploaded image",
        fileSize: "",
        thumbSrc: imageSrc,
        canClear: false,
      };
    }
    return {
      hasFile: false,
      fileName: "No file uploaded",
      fileSize: "",
      thumbSrc: "",
      canClear: false,
    };
  };
  const rawProfileImageSrc = sanitizeProofPreviewSrc(
    filePreviews.facebookProfile
    || getGiveawayWheelImageSrc(proofReview.facebookProfile?.imagePath || entryForm.facebookProfileImagePath)
  );
  const profileImageSrc = rawProfileImageSrc;
  const hasValidationInProgress = ALL_PROOF_FIELD_KEYS.some((fieldKey) => uploadStateByField[fieldKey]?.isValidating);
  const hasValidationErrors = ALL_PROOF_FIELD_KEYS.some((fieldKey) => Boolean(uploadStateByField[fieldKey]?.error));

  useEffect(() => {
    if (!activeModal) {
      const previouslyFocused = lastFocusedElementRef.current;
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
      return undefined;
    }

    const modalElement = entryModalRef.current;
    if (!modalElement) {
      return undefined;
    }

    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const focusFirstElement = () => {
      const firstFocusable = modalElement.querySelector("[data-autofocus]") || modalElement.querySelector(focusableSelector);
      if (firstFocusable instanceof HTMLElement) {
        firstFocusable.focus();
      }
    };

    const handleDocumentKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(modalElement.querySelectorAll(focusableSelector))
        .filter((element) => element instanceof HTMLElement && !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !modalElement.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else if (activeElement === lastElement || !modalElement.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const frameId = window.requestAnimationFrame(focusFirstElement);
    document.addEventListener("keydown", handleDocumentKeydown);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("keydown", handleDocumentKeydown);
    };
  }, [activeModal]);

  return (
    <main className="giveaway-wheel-page">
      <section className="giveaway-wheel-hero giveaway-wheel-hero-compact">
        <div className="giveaway-wheel-hero-panel giveaway-wheel-hero-panel-compact">
          <div
            className="giveaway-wheel-stage giveaway-wheel-stage-compact"
            aria-label="Giveaway wheel preview"
          >
            <div className="giveaway-wheel-wheel-wrap">
              <button
                type="button"
                className="giveaway-wheel-corner-shuffle is-right"
                onClick={handleVisualShuffle}
                disabled={isSpinning || weightedSegments.length === 0}
                aria-label="Shuffle wheel entries"
              >
                Shuffle
              </button>
              <button
                type="button"
                className="giveaway-wheel-corner-options"
                onClick={handleOpenHostControls}
                aria-label="Open host controls"
              >
                <SlidersHorizontal size={14} aria-hidden="true" />
              </button>
              <div className={`giveaway-wheel-pointer is-${pointerPingTone}${isPointerTickPulse ? " is-tick" : ""}${isPointerPing ? " is-ping" : ""}`} aria-hidden="true" />
              <div className={`giveaway-wheel-svg-shell giveaway-wheel-svg-shell-compact${isSpinning ? " is-spinning" : ""}`}>
                <svg
                  className="giveaway-wheel-svg"
                  viewBox={`0 0 ${WHEEL_VIEWBOX_SIZE} ${WHEEL_VIEWBOX_SIZE}`}
                  role="img"
                  aria-label="Giveaway spin wheel"
                  style={{ transform: `rotate(${activeRotation}deg)` }}
                >
                  <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={WHEEL_RADIUS} fill="url(#wheelOuterBase)" stroke="url(#wheelRimStroke)" strokeWidth="14" />
                  {weightedSegments.length > 0 ? weightedSegments.map((segment, index) => {
                    const anglePerSegment = 360 / weightedSegments.length;
                    const startAngle = index * anglePerSegment;
                    const endAngle = (index + 1) * anglePerSegment;
                    const midAngle = startAngle + (anglePerSegment / 2);
                    const fullLabelText = formatEntryDisplayName(segment.fullName, segment.sourceTag);
                    const labelLayout = buildWheelLabelLayout(fullLabelText, weightedSegments.length);
                    const statusClass = getStatusClassName(segment.status);
                    const normalizedAngle = ((midAngle % 360) + 360) % 360;
                    const isLeftSide = normalizedAngle > 180;

                    return (
                      <g key={`${segment.id}-${index}`} className={`giveaway-wheel-segment ${statusClass}`}>
                        <path d={describeSector(startAngle, endAngle)} fill={getSegmentFill(index)} stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
                        {labelLayout.lines.map((line, lineIndex) => {
                          const labelPathId = `wheel-label-path-${index}-${lineIndex}`;
                          const lineAngle = midAngle + line.angleOffset;
                          const labelPath = isLeftSide
                            ? describeRadialLabelPath(labelLayout.outerRadius, labelLayout.innerRadius, lineAngle)
                            : describeRadialLabelPath(labelLayout.innerRadius, labelLayout.outerRadius, lineAngle);

                          return (
                            <g key={labelPathId}>
                              <path id={labelPathId} d={labelPath} fill="none" stroke="none" />
                              <text
                                fill={getSegmentTextFill(index)}
                                stroke="rgba(255,255,255,0.55)"
                                strokeWidth="2.4"
                                paintOrder="stroke"
                                strokeLinejoin="round"
                                fontSize={labelLayout.fontSize}
                                fontWeight="800"
                                letterSpacing="0.01em"
                              >
                                <textPath
                                  href={`#${labelPathId}`}
                                  startOffset="50%"
                                  textAnchor="middle"
                                  lengthAdjust="spacingAndGlyphs"
                                  textLength={labelLayout.textLength}
                                >
                                  {line.text}
                                </textPath>
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  }) : (
                    <text x="500" y="470" textAnchor="middle" fill="#cbd5e1" fontSize="28" fontWeight="700">
                      Waiting for entries
                    </text>
                  )}
                  {weightedSegments.length > 0 ? weightedSegments.map((segment, index) => {
                    const anglePerSegment = 360 / weightedSegments.length;
                    const markerPoint = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, WHEEL_RADIUS + 1, index * anglePerSegment);
                    return (
                      <circle
                        key={`wheel-marker-${segment.id}-${index}`}
                        cx={markerPoint.x}
                        cy={markerPoint.y}
                        r="6"
                        fill="#ffffff"
                        stroke="rgba(205, 173, 169, 0.9)"
                        strokeWidth="1.5"
                      />
                    );
                  }) : null}
                  <defs>
                    <radialGradient id="wheelOuterBase" cx="50%" cy="45%" r="62%">
                      <stop offset="0%" stopColor="#f6e7e0" />
                      <stop offset="72%" stopColor="#f0ddd7" />
                      <stop offset="100%" stopColor="#ead5cf" />
                    </radialGradient>
                    <linearGradient id="wheelRimStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="45%" stopColor="#f4e8e5" />
                      <stop offset="100%" stopColor="#d8beb9" />
                    </linearGradient>
                    <radialGradient id="wheelCoreGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.96)" />
                      <stop offset="68%" stopColor="rgba(248, 240, 236, 0.98)" />
                      <stop offset="100%" stopColor="rgba(230, 214, 208, 1)" />
                    </radialGradient>
                    <radialGradient id="wheelHubMetal" cx="40%" cy="34%" r="64%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="44%" stopColor="#f4ece8" />
                      <stop offset="100%" stopColor="#e4d6d1" />
                    </radialGradient>
                  </defs>
                  <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={WHEEL_RADIUS - 8} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="8" />
                  <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={WHEEL_CORE_RADIUS} fill="url(#wheelCoreGlow)" stroke="rgba(241,226,222,0.9)" strokeWidth="10" />
                  <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={WHEEL_HUB_RADIUS} fill="url(#wheelHubMetal)" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
                </svg>
              </div>
              <button
                type="button"
                className="giveaway-wheel-center-cta"
                onClick={handleSpinAttempt}
                disabled={isSpinning || weightedSegments.length === 0}
                aria-label={isSpinning ? "Drawing winner" : "Spin wheel"}
              >
                <span className="giveaway-wheel-center-title is-top">SOLE</span>
                <span className="giveaway-wheel-center-title is-bottom">REAX</span>
                <small className="giveaway-wheel-center-mark" />
              </button>
            </div>

            <div className="giveaway-wheel-stage-copy">
              <span>{sidePrizeKicker}</span>
              <h3>{sidePrizeTitle}</h3>
            </div>

          </div>

          <aside className="giveaway-wheel-sidebar">
            <div className="giveaway-wheel-side-card giveaway-wheel-status-panel">
              <div className="giveaway-wheel-side-card giveaway-wheel-prize-panel">
                <span className="giveaway-wheel-side-kicker">{sidePrizeKicker}</span>
                <h2>Grand Prize: {sidePrizeTitle}</h2>
                <p>{sidePrizeDescription}</p>
                {firstSpinLabel ? (
                  <div className="giveaway-wheel-first-spin-card" aria-live="polite">
                    <span className="giveaway-wheel-first-spin-kicker">First Spin</span>
                    <strong>{firstSpinLabel}</strong>
                    <span className="giveaway-wheel-first-spin-countdown">
                      Countdown: {firstSpinCountdown.label || "Live now"}
                    </span>
                  </div>
                ) : null}
                {consolationPrizes.length > 0 ? (
                  <div className="giveaway-wheel-consolation-card" aria-live="polite">
                    <span className="giveaway-wheel-consolation-kicker">{consolationTitle}</span>
                    <ul>
                      {consolationPrizes.map((prize, index) => (
                        <li key={`${prize}-${index}`}>{prize}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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

                    {prizeImages.length > 4 ? (
                      <div className="giveaway-wheel-prize-progress" aria-hidden="true">
                        <span
                          className="giveaway-wheel-prize-progress-thumb"
                          style={{ "--giveaway-prize-scroll-ratio": prizeScrollRatio }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="giveaway-wheel-prize-visual is-empty">
                    <span>No prize image yet</span>
                  </div>
                )}
                {prizeImages.length > 0 ? <small className="giveaway-wheel-prize-meta">{prizeImages.length} image{prizeImages.length === 1 ? "" : "s"}</small> : null}
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

              <div className="giveaway-wheel-side-card giveaway-wheel-join-panel">
                <span className="giveaway-wheel-side-kicker">{sideJoinKicker}</span>
                <h2>{sideJoinTitle}</h2>
                <p>{sideJoinDescription}</p>

                <div className="giveaway-wheel-action-row giveaway-wheel-action-row-sidebar">
                  <button type="button" className="btn-primary giveaway-wheel-action-primary" onClick={() => openModal("join")}>
                    Join Giveaway
                  </button>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </section>

      {activeModal ? (
        <div className="giveaway-wheel-modal-overlay" onClick={() => closeModal()}>
          <section
            ref={entryModalRef}
            className="giveaway-entry-modal-v4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="giveaway-entry-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="giveaway-entry-modal-v4-head">
              <div className="giveaway-entry-modal-v4-titleblock">
                <div className="giveaway-entry-modal-v4-title-row-main">
                  <h2 id="giveaway-entry-modal-title">{isGiveaway1ImportedEntry ? "Giveaway 1 Entry" : isApprovedReadOnly ? "Approved Entry" : entryForm.id ? "Edit Entry" : "Join Giveaway"}</h2>
                  <span className="giveaway-entry-modal-v4-chip giveaway-entry-modal-v4-chip-total">
                    {estimatedEntryCount} Active {estimatedEntryCount === 1 ? "Entry" : "Entries"}
                  </span>
                </div>
              </div>
              <div className="giveaway-entry-modal-v4-head-actions">
                <button type="button" className="modal-close-btn" onClick={() => closeModal()} aria-label="Close modal">
                  ✕
                </button>
              </div>
            </div>
            <div className="giveaway-entry-modal-v4-scroll">
              <div className="giveaway-entry-modal-v4-panel">
                  {entryForm.status === "REJECTED" && entryForm.rejectionReason && !hasFieldLevelRejectionFeedback ? (
                    <div className="giveaway-wheel-form-alert giveaway-entry-modal-v4-alert is-danger">
                      <AlertCircle size={18} />
                      <div className="giveaway-wheel-alert-copy">
                        <div className="giveaway-wheel-alert-head">
                          <strong>Admin feedback</strong>
                          {shouldShowFeedbackToggle ? (
                            <button
                              type="button"
                              className="giveaway-wheel-alert-toggle"
                              onClick={() => setIsFeedbackExpanded((previous) => !previous)}
                            >
                              {isFeedbackExpanded ? "Hide details" : "Show details"}
                            </button>
                          ) : null}
                        </div>
                        {parsedRejectionFeedback.length > 1 ? (
                          isFeedbackExpanded ? (
                            <ul className="giveaway-entry-modal-v4-feedback-list">
                              {parsedRejectionFeedback.map((line, index) => (
                                <li key={`${line}-${index}`}>{line}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="is-collapsed">{parsedRejectionFeedback[0]}</p>
                          )
                        ) : (
                          <p className={isFeedbackExpanded ? "" : "is-collapsed"}>{rejectionFeedback}</p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {formMessage ? (
                    <div className="giveaway-wheel-form-alert giveaway-entry-modal-v4-alert is-success">
                      <CheckCircle2 size={18} />
                      <div>
                        <strong>Saved</strong>
                        <p>{formMessage}</p>
                      </div>
                    </div>
                  ) : null}

                  {formError ? (
                    <div className="giveaway-wheel-form-alert giveaway-entry-modal-v4-alert is-danger">
                      <AlertCircle size={18} />
                      <div>
                        <strong>Check your form</strong>
                        <p>{formError}</p>
                      </div>
                    </div>
                  ) : null}

                  {isGiveaway1ImportedEntry ? (
                    <div className="giveaway-wheel-form-alert giveaway-entry-modal-v4-alert is-success">
                      <CheckCircle2 size={18} />
                      <div>
                        <strong>Giveaway 1 Entry</strong>
                        <p>This entry is from Giveaway 1 and already has 1 wheel entry.</p>
                      </div>
                    </div>
                  ) : null}

                  <form id="giveaway-entry-modal-v4-form" className="giveaway-entry-modal-v4-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
                    <label className="giveaway-entry-modal-v4-field">
                      <span>Full Name</span>
                      <div className="giveaway-entry-modal-v4-input-shell">
                        <input
                          data-autofocus
                          type="text"
                          value={entryForm.fullName}
                          onChange={(event) => setEntryForm((previous) => ({ ...previous, fullName: event.target.value }))}
                          placeholder="Juan Dela Cruz"
                          disabled={isEntryReadOnly}
                        />
                      </div>
                    </label>

                    {entryForm.id ? null : (
                      <label className="giveaway-entry-modal-v4-field giveaway-entry-modal-v4-password-field">
                        <span>Entry Password <em>*</em></span>
                        <div className="giveaway-entry-modal-v4-input-shell">
                          <input
                            type={showEntryPassword ? "text" : "password"}
                            value={entryForm.entryPassword}
                            onChange={(event) => setEntryForm((previous) => ({ ...previous, entryPassword: event.target.value }))}
                            placeholder="Create your password"
                            disabled={isEntryReadOnly}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="giveaway-entry-modal-v4-action-btn is-view"
                            onClick={() => setShowEntryPassword((previous) => !previous)}
                            aria-label={showEntryPassword ? "Hide password" : "Show password"}
                            title={showEntryPassword ? "Hide password" : "Show password"}
                            style={{ marginLeft: 8 }}
                          >
                            {showEntryPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            {showEntryPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        <small className="giveaway-entry-modal-v4-password-note">
                          Required. Use this password to open or edit your entry from search results.
                        </small>
                      </label>
                    )}

                    <div className="giveaway-entry-modal-v4-grid">
                      <label className={`giveaway-entry-modal-v4-card is-required${isEntryReadOnly ? " is-readonly" : ""}${uploadStateByField.facebookProfile?.error ? " has-error" : ""}${proofReview.facebookProfile.status === "REJECTED" ? " is-rejected" : ""}`}>
                        {(() => {
                          const file = getFileDescriptor(GIVEAWAY_WHEEL_PROFILE_FIELD.key, profileImageSrc);
                          const profileStatus = getProofVisualStatus(proofReview.facebookProfile?.status, Boolean(profileImageSrc));
                          const profileReviewStatus = String(proofReview.facebookProfile?.status || "").toUpperCase();
                          const isProfileApproved = profileReviewStatus === "APPROVED";
                          const isProfileUploadLocked = isEntryReadOnly || isProfileApproved;
                          const profileUploadLabel = file.hasFile ? "Re-upload" : "Upload";
                          const profileUploadLockHint = isProfileApproved
                            ? "Approved by admin. Re-upload is disabled."
                            : "";
                          return (
                            <>
                        <div className="giveaway-entry-modal-v4-card-head">
                          <div className="giveaway-entry-modal-v4-card-icon is-profile"><UserRound size={20} /></div>
                          <div>
                            <div className="giveaway-entry-modal-v4-title-row">
                              <strong>{GIVEAWAY_WHEEL_PROFILE_FIELD.label} {!isEntryReadOnly ? <em>*</em> : null}</strong>
                              <span className="giveaway-entry-modal-v4-entry-chip is-noticeable">Required</span>
                            </div>
                            <small className={`giveaway-entry-modal-v4-proof-status is-${profileStatus.tone}`}>
                              <span className="status-dot" aria-hidden="true" />
                              {profileStatus.label}
                            </small>
                            <small className="giveaway-entry-modal-v4-proof-helper">{GIVEAWAY_WHEEL_PROFILE_FIELD.helper}</small>
                          </div>
                        </div>
                        <input id="giveaway-wheel-facebookProfile" className="sr-only-file-input" type="file" accept="image/*" disabled={isProfileUploadLocked} onChange={(event) => handleFileChange(GIVEAWAY_WHEEL_PROFILE_FIELD.key, event)} />
                        {file.hasFile ? (
                          <div className="giveaway-entry-modal-v4-file-pill has-file">
                            <img src={file.thumbSrc} alt={GIVEAWAY_WHEEL_PROFILE_FIELD.label} className="giveaway-entry-modal-v4-file-thumb" />
                            <div className="giveaway-entry-modal-v4-file-copy">
                              <strong>{file.fileName}</strong>
                              {file.fileSize ? <small>{file.fileSize}</small> : null}
                            </div>
                            {file.canClear && !isEntryReadOnly ? (
                              <button
                                type="button"
                                className="giveaway-entry-modal-v4-file-clear"
                                aria-label="Remove selected file"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  clearSelectedFile(GIVEAWAY_WHEEL_PROFILE_FIELD.key);
                                }}
                              >
                                <X size={14} />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="giveaway-entry-modal-v4-actions">
                          <button
                            type="button"
                            className={`giveaway-entry-modal-v4-action-btn is-upload${profileStatus.tone === "rejected" && !isProfileUploadLocked ? " is-emphasis" : ""}`}
                            disabled={isProfileUploadLocked}
                            title={isProfileUploadLocked ? (profileUploadLockHint || "This upload is locked.") : ""}
                            aria-label={isProfileUploadLocked ? (profileUploadLockHint || "This upload is locked.") : "Upload file"}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (isProfileUploadLocked) {
                                return;
                              }
                              triggerFilePicker("giveaway-wheel-facebookProfile");
                            }}
                          >
                            <Upload size={15} />
                            {isProfileApproved ? "Approved" : profileUploadLabel}
                          </button>
                          <button
                            type="button"
                            className="giveaway-entry-modal-v4-action-btn is-view"
                            disabled={!profileImageSrc}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (!profileImageSrc) {
                                return;
                              }
                              setActiveProofLightbox({ src: profileImageSrc, label: GIVEAWAY_WHEEL_PROFILE_FIELD.label });
                            }}
                          >
                            <Eye size={15} />
                            View
                          </button>
                        </div>
                            </>
                          );
                        })()}
                      </label>

                      {GIVEAWAY_WHEEL_PROOF_FIELDS.map((field) => {
                        const rawImageSrc = sanitizeProofPreviewSrc(
                          filePreviews[field.key]
                          || getGiveawayWheelImageSrc(proofReview[field.key]?.imagePath || entryForm[field.pathKey])
                        );
                        const imageSrc = rawImageSrc;
                        const file = getFileDescriptor(field.key, imageSrc);
                        const inputId = `giveaway-wheel-${field.key}`;
                        const proofReviewStatus = String(proofReview[field.key]?.status || "").toUpperCase();
                        const isProofApproved = proofReviewStatus === "APPROVED";
                        const isProofUploadLocked = isEntryReadOnly || isProofApproved;
                        const proofUploadLabel = file.hasFile ? "Re-upload" : "Upload";
                        const proofUploadLockHint = isProofApproved
                          ? "Approved by admin. Re-upload is disabled."
                          : "";
                        const proofStatus = getProofVisualStatus(proofReview[field.key]?.status, Boolean(imageSrc));
                        const iconByField = {
                          followProof: Heart,
                          commentProof: Hash,
                          shareProof: Share2,
                          reviewProof: Star,
                        };
                        const FieldIcon = iconByField[field.key] || ImageIcon;
                        return (
                          <label key={field.key} className={`giveaway-entry-modal-v4-card${isProofUploadLocked ? " is-readonly" : ""}${uploadStateByField[field.key]?.error ? " has-error" : ""}${proofReview[field.key]?.status === "REJECTED" ? " is-rejected" : ""}`}>
                            <div className="giveaway-entry-modal-v4-card-head">
                              <div className={`giveaway-entry-modal-v4-card-icon is-${field.key}`}><FieldIcon size={20} /></div>
                              <div>
                                <div className="giveaway-entry-modal-v4-title-row">
                                  <strong>{field.label} {!isEntryReadOnly ? <em>*</em> : null}</strong>
                                  <span className="giveaway-entry-modal-v4-entry-chip is-noticeable">{field.weightLabel}</span>
                                </div>
                                <small className={`giveaway-entry-modal-v4-proof-status is-${proofStatus.tone}`}>
                                  <span className="status-dot" aria-hidden="true" />
                                  {proofStatus.label}
                                </small>
                                <small className="giveaway-entry-modal-v4-proof-helper">{field.helper}</small>
                              </div>
                            </div>
                            <input
                              id={inputId}
                              className="sr-only-file-input"
                              type="file"
                              accept="image/*"
                              disabled={isProofUploadLocked}
                              onChange={(event) => handleFileChange(field.key, event)}
                            />
                            {file.hasFile ? (
                              <div className="giveaway-entry-modal-v4-file-pill has-file">
                                <img src={file.thumbSrc} alt={field.label} className="giveaway-entry-modal-v4-file-thumb" />
                                <div className="giveaway-entry-modal-v4-file-copy">
                                  <strong>{file.fileName}</strong>
                                  {file.fileSize ? <small>{file.fileSize}</small> : null}
                                </div>
                                {file.canClear && !isEntryReadOnly ? (
                                  <button
                                    type="button"
                                    className="giveaway-entry-modal-v4-file-clear"
                                    aria-label="Remove selected file"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      clearSelectedFile(field.key);
                                    }}
                                  >
                                    <X size={14} />
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                            <div className="giveaway-entry-modal-v4-actions">
                              <button
                                type="button"
                                className={`giveaway-entry-modal-v4-action-btn is-upload${proofStatus.tone === "rejected" && !isProofUploadLocked ? " is-emphasis" : ""}`}
                                disabled={isProofUploadLocked}
                                title={isProofUploadLocked ? (proofUploadLockHint || "This upload is locked.") : ""}
                                aria-label={isProofUploadLocked ? (proofUploadLockHint || "This upload is locked.") : "Upload file"}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  if (isProofUploadLocked) {
                                    return;
                                  }
                                  triggerFilePicker(inputId);
                                }}
                              >
                                <Upload size={15} />
                                {isProofApproved ? "Approved" : proofUploadLabel}
                              </button>
                              <button
                                type="button"
                                className="giveaway-entry-modal-v4-action-btn is-view"
                                disabled={!imageSrc}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  if (!imageSrc) {
                                    return;
                                  }
                                  setActiveProofLightbox({ src: imageSrc, label: field.label });
                                }}
                              >
                                <Eye size={15} />
                                View
                              </button>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                  </form>
              </div>
            </div>
            {isEntryReadOnly ? null : (
              <div className="giveaway-entry-modal-v4-footer">
                <button type="button" className="giveaway-entry-modal-v4-cancel" onClick={() => closeModal()}>
                  Cancel
                </button>
                <button
                  type="submit"
                  form="giveaway-entry-modal-v4-form"
                  className="giveaway-entry-modal-v4-submit"
                  disabled={isSubmitting || hasValidationInProgress || hasValidationErrors}
                >
                  {isSubmitting ? "Saving..." : entryForm.id ? "Save Changes" : "Submit My Entry"}
                </button>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isHostGateOpen ? (
        <div className="modal-overlay" onClick={closeHostGate}>
          <section className="modal-panel modal-panel-compact confirm-action-modal" onClick={(event) => event.stopPropagation()}>
            {hostGateStep === "prompt" ? (
              <>
                <div className="confirm-action-head">
                  <h3>Admin Host Required</h3>
                  <button type="button" className="modal-close-btn" onClick={closeHostGate} aria-label="Close host login modal">✕</button>
                </div>
                <div className="confirm-action-body">
                  <p className="confirm-action-copy">Only admin host can run the official winner draw.</p>
                </div>
                <div className="confirm-action-footer modal-sticky-footer">
                  <button type="button" className="button-secondary" onClick={closeHostGate}>Cancel</button>
                  <button type="button" className="btn-primary" onClick={() => setHostGateStep("login")}>Yes, I am admin</button>
                </div>
              </>
            ) : (
              <>
                <div className="confirm-action-head">
                  <h3>Admin Login</h3>
                  <button type="button" className="modal-close-btn" onClick={closeHostGate} aria-label="Close host login modal">✕</button>
                </div>
                <form className="confirm-action-body" onSubmit={handleHostLoginSubmit}>
                  <label className="confirm-action-field">
                    <span>Username</span>
                    <input
                      type="text"
                      value={hostLoginForm.username}
                      onChange={(event) => setHostLoginForm((previous) => ({ ...previous, username: event.target.value }))}
                      autoComplete="username"
                    />
                  </label>
                  <label className="confirm-action-field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={hostLoginForm.password}
                      onChange={(event) => setHostLoginForm((previous) => ({ ...previous, password: event.target.value }))}
                      autoComplete="current-password"
                    />
                  </label>
                  {hostLoginError ? <p className="field-hint" style={{ color: "#ef4444" }}>{hostLoginError}</p> : null}
                  <div className="confirm-action-footer modal-sticky-footer">
                    <button type="button" className="button-secondary" onClick={closeHostGate}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={isHostLoggingIn}>
                      {isHostLoggingIn ? "Verifying..." : "Unlock Spin"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}

      {isDrawModeModalOpen ? (
        <div className="modal-overlay" onClick={() => setIsDrawModeModalOpen(false)}>
          <section className="modal-panel modal-panel-compact confirm-action-modal giveaway-wheel-host-controls-modal" onClick={(event) => event.stopPropagation()}>
            <div className="confirm-action-head">
              <h3>Choose Draw Mode</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsDrawModeModalOpen(false)} aria-label="Close draw mode modal">✕</button>
            </div>
            <div className="confirm-action-body giveaway-wheel-host-controls-body">
              <p className="confirm-action-copy">For fairness, decide if winner should stay in the wheel or be removed after winning.</p>
              <div className="giveaway-wheel-draw-mode-grid">
                <button
                  type="button"
                  className={`giveaway-wheel-draw-mode-card${drawModeSelection === "KEEP" ? " is-selected" : ""}`}
                  onClick={() => setDrawModeSelection("KEEP")}
                >
                  <strong>Keep Winner</strong>
                  <p>Winner stays in the wheel and can win again in future draws.</p>
                </button>
                <button
                  type="button"
                  className={`giveaway-wheel-draw-mode-card${drawModeSelection === "REMOVE" ? " is-selected" : ""}`}
                  onClick={() => setDrawModeSelection("REMOVE")}
                >
                  <strong>Remove Winner</strong>
                  <p>Winner is excluded from the next draws after winning.</p>
                </button>
              </div>
              <label className="confirm-action-field giveaway-wheel-draw-mode-remember">
                <input
                  type="checkbox"
                  checked={rememberDrawMode}
                  onChange={(event) => setRememberDrawMode(event.target.checked)}
                />
                <span>Remember this draw mode for this session</span>
              </label>
              <div className="giveaway-wheel-host-audio-controls">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={toggleWheelSound}
                >
                  {isWheelSoundEnabled ? "Sound On" : "Sound Off"}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={cycleWheelTickProfile}
                  disabled={!isWheelSoundEnabled}
                >
                  Tick {wheelTickProfile === "CLICKY" ? "Clicky" : wheelTickProfile === "SOFT" ? "Soft" : wheelTickProfile === "TURBO" ? "Turbo" : "Balanced"}
                </button>
                <label className="giveaway-wheel-host-volume">
                  <span>Vol {Math.round(wheelSoundVolume * 100)}%</span>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    step="1"
                    value={Math.round(wheelSoundVolume * 100)}
                    onChange={handleWheelSoundVolumeChange}
                    disabled={!isWheelSoundEnabled}
                  />
                </label>
              </div>
              <div className="giveaway-wheel-host-session-actions">
                <button
                  type="button"
                  className="button-secondary giveaway-wheel-modal-btn"
                  onClick={() => lockHostSession()}
                >
                  End Session
                </button>
                <button
                  type="button"
                  className="button-secondary giveaway-wheel-modal-btn"
                  onClick={handleHostLogout}
                >
                  Logout Admin
                </button>
              </div>
            </div>
            <div className="confirm-action-footer modal-sticky-footer giveaway-wheel-draw-mode-footer">
              <button type="button" className="button-secondary giveaway-wheel-modal-btn" onClick={() => setIsDrawModeModalOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary giveaway-wheel-modal-btn"
                onClick={() => handleDrawModeAction(drawModeSelection)}
                disabled={isSpinning}
              >
                Save Draw Mode
              </button>
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
                  const winnerWonAtLabel = formatWinnerWonAt(entry?.wonAt);
                  const sourceTagLabel = getSourceTagLabel(entry?.sourceTag);

                  return (
                    <div key={entry.id} className={`giveaway-wheel-search-result ${statusClass}`}>
                      <div className="giveaway-wheel-search-result-copy">
                        <strong>{formatEntryDisplayName(entry.fullName, entry.sourceTag)}</strong>
                        <small className="giveaway-wheel-search-result-status">{getGiveawayWheelStatusLabel(publicStatus)}</small>
                        {sourceTagLabel ? (
                          <small className="giveaway-wheel-search-winner-badge is-source-g1">{sourceTagLabel}</small>
                        ) : null}
                        {entry.winner ? (
                          <>
                            <small className="giveaway-wheel-search-winner-badge">Winner</small>
                            {winnerWonAtLabel ? (
                              <small className="giveaway-wheel-search-winner-meta">Won: {winnerWonAtLabel}</small>
                            ) : null}
                          </>
                        ) : null}
                        {entry.passwordProtected ? (
                          <small className="giveaway-wheel-search-lock-badge"><Lock size={12} />Password protected</small>
                        ) : null}
                      </div>
                      <div className="giveaway-wheel-search-result-meta">
                        <small className="giveaway-wheel-search-result-slots">{entry.entryCount} {entry.entryCount === 1 ? "slot" : "slots"}</small>
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

      {activeProofLightbox?.src ? (
        <div className="giveaway-wheel-modal-overlay" role="dialog" aria-modal="true" onClick={() => setActiveProofLightbox(null)}>
          <section className="giveaway-wheel-modal-panel giveaway-wheel-prize-lightbox-panel giveaway-entry-modal-v4-proof-lightbox" onClick={(event) => event.stopPropagation()}>
            <div className="giveaway-wheel-modal-head">
              <div className="giveaway-wheel-modal-titleblock">
                <h2>{activeProofLightbox.label || "Uploaded proof"}</h2>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveProofLightbox(null)} aria-label="Close uploaded proof preview">
                ✕
              </button>
            </div>
            <div className="giveaway-wheel-prize-lightbox-body">
              <img src={activeProofLightbox.src} alt={activeProofLightbox.label || "Uploaded proof"} className="giveaway-wheel-prize-lightbox-image" />
            </div>
          </section>
        </div>
      ) : null}

      {activePrizeLightboxIndex !== null && prizeImages.length > 0 ? (
        <div className="giveaway-wheel-modal-overlay" role="dialog" aria-modal="true" onClick={() => setActivePrizeLightboxIndex(null)}>
          <section className="giveaway-wheel-modal-panel giveaway-wheel-prize-lightbox-panel" onClick={(event) => event.stopPropagation()}>
            <div className="giveaway-wheel-modal-head">
              <div className="giveaway-wheel-modal-titleblock">
                <h2>{giveawaySettings?.prizeLabel || "Nike Vapor Pro 3"}</h2>
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

      {hostStatusNotice ? (
        <div className="giveaway-wheel-host-toast" role="status" aria-live="polite">
          {hostStatusNotice}
        </div>
      ) : null}

      {winnerPopup.isOpen ? (
        <div className="giveaway-wheel-winner-popup-overlay" onClick={() => setWinnerPopup((previous) => ({ ...previous, isOpen: false }))}>
          <section className="giveaway-wheel-winner-popup" onClick={(event) => event.stopPropagation()}>
            <div className="giveaway-wheel-winner-confetti" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, index) => <span key={`winner-confetti-${index}`} />)}
            </div>
            <div className="giveaway-wheel-winner-popup-kicker">
              <div className="giveaway-wheel-winner-avatar" title="Winner profile image">
                {winnerPopup.winnerImageSrc ? (
                  <img src={winnerPopup.winnerImageSrc} alt={`${winnerPopup.winnerName || "Winner"} profile`} />
                ) : (
                  <span>{String(winnerPopup.winnerName || "W").trim().charAt(0).toUpperCase() || "W"}</span>
                )}
              </div>
              <div className="giveaway-wheel-winner-popup-meta">
                <p className="giveaway-wheel-winner-popup-label">Winner Selected</p>
                <h3>{winnerPopup.winnerName}</h3>
                <p className="giveaway-wheel-winner-popup-sub">Winner profile confirmed for this draw.</p>
              </div>
            </div>
            <p>{winnerPopup.removed ? "Removed from wheel for next draws." : "Stays on wheel for next draws."}</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setWinnerPopup((previous) => ({ ...previous, isOpen: false }))}
            >
              Nice!
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}

