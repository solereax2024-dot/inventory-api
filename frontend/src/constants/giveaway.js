const DEFAULT_GIVEAWAY_STEPS = [
  "Play the Giveaway challenge for a chance to win our featured prize.",
  "You must be following our official page.",
  "You will upload a screenshot showing that you follow us.",
  "If you win, we may contact you using the follower details shown in your submitted screenshot.",
];

export const DEFAULT_GIVEAWAY_SETTINGS = {
  title: "Join the Giveaway",
  intro: "Play the Giveaway challenge for a chance to win. Before you continue, please confirm that you follow our page and can upload proof.",
  howToJoinTitle: "How to Join",
  steps: DEFAULT_GIVEAWAY_STEPS,
  accountDeletionNote: "After the giveaway ends, giveaway accounts will be deleted and you will no longer be able to access the game using that account.",
  leaderboardPrizeEyebrow: "Prize to Win",
  prizeLabel: "Featured Prize",
  leaderboardPrizeNote: "Climb to No. 1 to claim this prize.",
  leaderboardGoalMessage: "Win by reaching No. 1 on the leaderboard!",
  prizeImageUrl: "",
  prizeImageUrls: [],
  prizeImageCount: 1,
  prizeImageAlt: "Featured giveaway prize",
};

export function normalizeGiveawaySettings(settings = {}) {
  const sourceSteps = Array.isArray(settings.steps) ? settings.steps : [];
  const prizeImageUrls = normalizePrizeImageUrls(settings.prizeImageUrls, settings.prizeImageUrl);
  const prizeImageCount = clampPrizeImageCount(settings.prizeImageCount, prizeImageUrls.length);

  return {
    title: cleanText(settings.title),
    intro: cleanText(settings.intro),
    howToJoinTitle: cleanText(settings.howToJoinTitle),
    steps: DEFAULT_GIVEAWAY_STEPS.map((_, index) => cleanText(sourceSteps[index])),
    accountDeletionNote: cleanText(settings.accountDeletionNote),
    leaderboardPrizeEyebrow: cleanText(settings.leaderboardPrizeEyebrow),
    prizeLabel: cleanText(settings.prizeLabel),
    leaderboardPrizeNote: cleanText(settings.leaderboardPrizeNote),
    leaderboardGoalMessage: cleanText(settings.leaderboardGoalMessage),
    prizeImageUrl: prizeImageUrls[0] || cleanOptionalUrl(settings.prizeImageUrl),
    prizeImageUrls,
    prizeImageCount,
    prizeImageAlt: cleanText(settings.prizeImageAlt),
  };
}

export function giveawayImageSrc(imageUrl) {
  const value = String(imageUrl || "").trim();
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
}

export function giveawayImageList(settings = {}) {
  const normalized = normalizeGiveawaySettings(settings);
  return normalized.prizeImageUrls.map(giveawayImageSrc).filter(Boolean);
}

function cleanText(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed;
}

function cleanOptionalUrl(value) {
  return String(value ?? "").trim();
}

function normalizePrizeImageUrls(prizeImageUrls, prizeImageUrl) {
  const fromList = Array.isArray(prizeImageUrls)
    ? prizeImageUrls.map(cleanOptionalUrl).filter(Boolean)
    : [];

  if (fromList.length > 0) {
    return fromList.slice(0, 10);
  }

  const singleImage = cleanOptionalUrl(prizeImageUrl);
  return singleImage ? [singleImage] : [];
}

function clampPrizeImageCount(value, imageCount = 0) {
  const parsed = Number.parseInt(value, 10);
  const fallback = Math.max(imageCount || 0, 1);
  if (!Number.isFinite(parsed)) {
    return Math.min(10, fallback);
  }
  return Math.max(1, Math.min(10, parsed));
}


