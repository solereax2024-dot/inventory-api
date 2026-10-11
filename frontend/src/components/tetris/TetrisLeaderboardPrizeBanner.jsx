import { useState } from "react";
import { giveawayImageList, giveawayImageSrc } from "../../constants/giveaway";

export default function TetrisLeaderboardPrizeBanner({ giveawaySettings, compact = false }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const prizeImages = giveawayImageList(giveawaySettings);
  const prizeEyebrow = giveawaySettings?.leaderboardPrizeEyebrow || "Prize to Win";
  const prizeLabel = giveawaySettings?.prizeLabel || "Featured Prize";
  const prizeNote = giveawaySettings?.leaderboardPrizeNote || "Climb to No. 1 to claim this prize.";
  const prizeImageAlt = giveawaySettings?.prizeImageAlt || prizeLabel;
  const prizeImageCountLabel = `${prizeImages.length} prize image${prizeImages.length === 1 ? "" : "s"}`;

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedImageIndex(null);
  };

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) =>
      prev === 0 ? prizeImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) =>
      prev === prizeImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <>
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
              <button
                key={`${imageSrc}-${index}`}
                className="tetris-leaderboard-prize-visual"
                onClick={() => handleImageClick(index)}
                type="button"
                aria-label={`View ${prizeImages.length > 1 ? `${prizeImageAlt} ${index + 1}` : prizeImageAlt}`}
              >
                <img
                  src={imageSrc || giveawayImageSrc(giveawaySettings?.prizeImageUrl)}
                  alt={prizeImages.length > 1 ? `${prizeImageAlt} ${index + 1}` : prizeImageAlt}
                  className="tetris-leaderboard-prize-image"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {selectedImageIndex !== null && (
        <div className="tetris-prize-image-lightbox-backdrop" onClick={handleCloseModal}>
          <div
            className="tetris-prize-image-lightbox-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="tetris-prize-lightbox-close-btn"
              onClick={handleCloseModal}
              type="button"
              aria-label="Close image viewer"
            >
              ✕
            </button>

            <div className="tetris-prize-lightbox-container">
              <img
                src={
                  prizeImages[selectedImageIndex] ||
                  giveawayImageSrc(giveawaySettings?.prizeImageUrl)
                }
                alt={
                  prizeImages.length > 1
                    ? `${prizeImageAlt} ${selectedImageIndex + 1}`
                    : prizeImageAlt
                }
                className="tetris-prize-lightbox-image"
              />
            </div>

            {prizeImages.length > 1 && (
              <>
                <button
                  className="tetris-prize-lightbox-nav tetris-prize-lightbox-prev"
                  onClick={handlePrevImage}
                  type="button"
                  aria-label="Previous image"
                >
                  ←
                </button>
                <button
                  className="tetris-prize-lightbox-nav tetris-prize-lightbox-next"
                  onClick={handleNextImage}
                  type="button"
                  aria-label="Next image"
                >
                  →
                </button>
                <div className="tetris-prize-lightbox-counter">
                  {selectedImageIndex + 1} / {prizeImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

