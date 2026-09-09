import "../../styles/sale-promos-marquee.css";

export default function SalePromosMarquee({ names = [], itemCount = 0, variant = "minimal" }) {
  const cleanedNames = Array.from(new Set((names || []).map((name) => String(name || "").trim()).filter(Boolean)));
  if (!cleanedNames.length) {
    return null;
  }

  // Render exactly two identical halves so translateX(-50%) lands on the start
  // of the second copy without cutting a label mid-loop.
  const loopNames = [...cleanedNames, ...cleanedNames];

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

