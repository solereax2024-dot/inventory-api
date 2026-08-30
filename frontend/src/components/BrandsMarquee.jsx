import "../styles/brands-marquee.css";

export default function BrandsMarquee({ brands = [], onBrandClick = () => {} }) {
  const brandsWithLogo = brands.filter((brand) => Boolean(brand?.logoUrl));
  if (!brandsWithLogo.length) return null;

  // Ensure the track is long enough for seamless motion even with a small brand set.
  const repeatCount = brandsWithLogo.length < 6 ? 4 : 2;
  const loopBrands = Array.from({ length: repeatCount }, () => brandsWithLogo).flat();

  return (
    <section className="brands-marquee" aria-label="Featured brands">
      <p className="brands-marquee-label">Featured Brands</p>
      <div className="brands-marquee-track-wrap">
        <ul className="brands-marquee-track">
          {loopBrands.map((brand, index) => (
            <li key={`${brand.id || brand.name}-${index}`} className="brands-marquee-pill">
              <button
                type="button"
                className="brands-marquee-link"
                onClick={() => onBrandClick(brand.name)}
                aria-label={`Shop ${brand.name}`}
                title={`Shop ${brand.name}`}
              >
                <img className="brands-marquee-logo" src={brand.logoUrl} alt={brand.name} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}


