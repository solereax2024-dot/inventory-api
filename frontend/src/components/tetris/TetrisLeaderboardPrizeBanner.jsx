import { giveawayImageList, giveawayImageSrc } from "../../constants/giveaway";

export default function TetrisLeaderboardPrizeBanner({ giveawaySettings, compact = false }) {
  const prizeImages = giveawayImageList(giveawaySettings);
  const prizeLabel = giveawaySettings?.prizeLabel || "Featured Prize";
  const prizeImageAlt = giveawaySettings?.prizeImageAlt || prizeLabel;
  const prizeImageCountLabel = `${prizeImages.length} prize image${prizeImages.length === 1 ? "" : "s"}`;

  return (
    <section
      className={`tetris-leaderboard-prize-banner${compact ? " is-compact" : ""}`}
      aria-label="Leaderboard prize information"
    >
      <div className="tetris-leaderboard-prize-copy">
        <span className="tetris-leaderboard-prize-eyebrow">Prize to Win</span>
        <strong className="tetris-leaderboard-prize-title">{prizeLabel}</strong>
        <p className="tetris-leaderboard-prize-note">Win by reaching No. 1 on the leaderboard!</p>
        {prizeImages.length > 1 ? <span className="tetris-leaderboard-prize-count">{prizeImageCountLabel}</span> : null}
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

