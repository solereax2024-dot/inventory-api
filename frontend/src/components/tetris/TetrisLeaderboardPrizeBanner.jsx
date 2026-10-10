import { giveawayImageList, giveawayImageSrc } from "../../constants/giveaway";

export default function TetrisLeaderboardPrizeBanner({ giveawaySettings, compact = false }) {
  const prizeImages = giveawayImageList(giveawaySettings);
  const prizeEyebrow = giveawaySettings?.leaderboardPrizeEyebrow || "Prize to Win";
  const prizeLabel = giveawaySettings?.prizeLabel || "Featured Prize";
  const prizeNote = giveawaySettings?.leaderboardPrizeNote || "Climb to No. 1 to claim this prize.";
  const prizeImageAlt = giveawaySettings?.prizeImageAlt || prizeLabel;
  const prizeImageCountLabel = `${prizeImages.length} prize image${prizeImages.length === 1 ? "" : "s"}`;

  return (
    <section
      className={`tetris-leaderboard-prize-banner${compact ? " is-compact" : ""}`}
      aria-label="Leaderboard prize information"
    >
      <div className="tetris-leaderboard-prize-copy">
        <span className="tetris-leaderboard-prize-eyebrow">{prizeEyebrow}</span>
        <strong className="tetris-leaderboard-prize-title">{prizeLabel}</strong>
        <p className="tetris-leaderboard-prize-note">{prizeNote}</p>
      </div>

      {prizeImages.length > 0 ? (
        <div
          className={[
            "tetris-leaderboard-prize-gallery",
            compact ? "is-compact" : "",
            `has-${Math.min(prizeImages.length, 4)}`,
          ].filter(Boolean).join(" ")}
          aria-label={prizeImageCountLabel}
        >
          {prizeImages.map((imageSrc, index) => (
            <div
              key={`${imageSrc}-${index}`}
              className="tetris-leaderboard-prize-visual"
            >
              <img
                src={imageSrc || giveawayImageSrc(giveawaySettings?.prizeImageUrl)}
                alt={prizeImages.length > 1 ? `${prizeImageAlt} ${index + 1}` : prizeImageAlt}
                className="tetris-leaderboard-prize-image"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

