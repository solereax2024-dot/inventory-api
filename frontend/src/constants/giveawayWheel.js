export const GIVEAWAY_WHEEL_ROUTE = "/giveaway-wheel";
export const GIVEAWAY_WHEEL_ALIAS_ROUTE = "/giveaway-2";
export const GIVEAWAY_WHEEL_STORAGE_KEY = "giveawayWheelLastEntryId";
export const GIVEAWAY_WHEEL_MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

export const GIVEAWAY_WHEEL_PROOF_FIELDS = [
  {
    key: "followProof",
    pathKey: "followProofImagePath",
    label: "Follow",
    helper: "Follow the Sole Reax page.",
    weight: 1,
    weightLabel: "1 entry",
  },
  {
    key: "commentProof",
    pathKey: "commentProofImagePath",
    label: "Tag",
    helper: "Tag a friend in the giveaway post.",
    weight: 2,
    weightLabel: "2 entries",
  },
  {
    key: "shareProof",
    pathKey: "shareProofImagePath",
    label: "Share",
    helper: "Share the giveaway post.",
    weight: 3,
    weightLabel: "3 entries",
  },
  {
    key: "reviewProof",
    pathKey: "reviewProofImagePath",
    label: "Review",
    helper: "Post a page review.",
    weight: 5,
    weightLabel: "5 entries",
  },
];

export const GIVEAWAY_WHEEL_PROFILE_FIELD = {
  key: "facebookProfile",
  pathKey: "facebookProfileImagePath",
  label: "Profile",
  helper: "Required so we can contact winners.",
  weight: 0,
  weightLabel: "Needed for winner contact",
};

export function getGiveawayWheelStatusLabel(status) {
  const normalized = String(status || "PENDING").toUpperCase();
  if (normalized === "APPROVED") return "Approved";
  if (normalized === "REJECTED") return "Rejected";
  return "Pending Review";
}

export function computeGiveawayWheelEntryCount(entry = {}) {
  return GIVEAWAY_WHEEL_PROOF_FIELDS.reduce((total, field) => total + (entry?.[field.pathKey] ? field.weight : 0), 0);
}

export function getGiveawayWheelImageSrc(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  if (/^(https?:|blob:|data:|\/\/)/i.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
}

