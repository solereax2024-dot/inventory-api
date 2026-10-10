import { giveawayImageList, giveawayImageSrc } from "../../constants/giveaway";

export default function TetrisLeaderboardPrizeBanner({ giveawaySettings, compact = false }) {
  const prizeImages = giveawayImageList(giveawaySettings);
  const fallbackImage = giveawayImageSrc(giveawaySettings?.prizeImageUrl);
  const primaryImage = prizeImages[0] || fallbackImage;
  const prizeLabel = giveawaySettings?.prizeLabel || "Featured Prize";
  const prizeImageAlt = giveawaySettings?.prizeImageAlt || prizeLabel;

  return (
    <section
      className={`tetris-leaderboard-prize-banner${compact ? " is-compact" : ""}`}
      aria-label="Leaderboard prize information"
    >
      <div className="tetris-leaderboard-prize-copy">
        <span className="tetris-leaderboard-prize-eyebrow">Prize to Win</span>
        <strong className="tetris-leaderboard-prize-title">{prizeLabel}</strong>
        <p className="tetris-leaderboard-prize-note">Win by reaching No. 1 on the leaderboard!</p>
      </div>

      {primaryImage ? (
        <div className="tetris-leaderboard-prize-visual">
          <img
            src={primaryImage}
            alt={prizeImageAlt}
            className="tetris-leaderboard-prize-image"
            loading="lazy"
          />
        </div>
      ) : null}
    </section>
  );
}

