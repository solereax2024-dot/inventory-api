import "../../styles/sale-promos-marquee.css";

export default function SalePromosMarquee({ names = [], itemCount = 0, variant = "minimal" }) {
  const cleanedNames = Array.from(new Set((names || []).map((name) => String(name || "").trim()).filter(Boolean)));
  if (!cleanedNames.length) {
    return null;
  }

  void itemCount;

  return (
    <section className={`sale-promos-marquee sale-promos-marquee--${variant}`} aria-label="Ongoing sale promotions">
      <div className="sale-promos-marquee-track-wrap">
        <div className="sale-promos-marquee-track">
          {[0, 1].map((copyIndex) => (
            <ul key={`promo-copy-${copyIndex}`} className="sale-promos-marquee-group" aria-hidden={copyIndex === 1 ? "true" : undefined}>
              {cleanedNames.map((name, index) => (
                <li key={`${copyIndex}-${name}-${index}`} className="sale-promos-marquee-pill">
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

