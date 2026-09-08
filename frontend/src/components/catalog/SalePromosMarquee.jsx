import "../../styles/sale-promos-marquee.css";

export default function SalePromosMarquee({ names = [], itemCount = 0, variant = "minimal" }) {
  const cleanedNames = Array.from(new Set((names || []).map((name) => String(name || "").trim()).filter(Boolean)));
  if (!cleanedNames.length) {
    return null;
  }

  // Duplicate items so the marquee can loop seamlessly.
  const repeatCount = cleanedNames.length < 3 ? 5 : cleanedNames.length < 5 ? 4 : 3;
  const loopNames = Array.from({ length: repeatCount }, () => cleanedNames).flat();

  return (
    <section className={`sale-promos-marquee sale-promos-marquee--${variant}`} aria-label="Ongoing sale promotions">
      <div className="sale-promos-marquee-track-wrap">
        <ul className="sale-promos-marquee-track">
          {loopNames.map((name, index) => (
            <li key={`${name}-${index}`} className="sale-promos-marquee-pill">
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

