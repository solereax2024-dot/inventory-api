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
  prizeLabel: "Featured Prize",
  prizeImageUrl: "",
  prizeImageAlt: "Featured giveaway prize",
};

export function normalizeGiveawaySettings(settings = {}) {
  const sourceSteps = Array.isArray(settings.steps) ? settings.steps : [];

  return {
    title: cleanText(settings.title, DEFAULT_GIVEAWAY_SETTINGS.title),
    intro: cleanText(settings.intro, DEFAULT_GIVEAWAY_SETTINGS.intro),
    howToJoinTitle: cleanText(settings.howToJoinTitle, DEFAULT_GIVEAWAY_SETTINGS.howToJoinTitle),
    steps: DEFAULT_GIVEAWAY_STEPS.map((fallback, index) => cleanText(sourceSteps[index], fallback)),
    accountDeletionNote: cleanText(settings.accountDeletionNote, DEFAULT_GIVEAWAY_SETTINGS.accountDeletionNote),
    prizeLabel: cleanText(settings.prizeLabel, DEFAULT_GIVEAWAY_SETTINGS.prizeLabel),
    prizeImageUrl: cleanOptionalUrl(settings.prizeImageUrl),
    prizeImageAlt: cleanText(settings.prizeImageAlt, DEFAULT_GIVEAWAY_SETTINGS.prizeImageAlt),
  };
}

export function giveawayImageSrc(imageUrl) {
  const value = String(imageUrl || "").trim();
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
}

function cleanText(value, fallback) {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

function cleanOptionalUrl(value) {
  return String(value ?? "").trim();
}


