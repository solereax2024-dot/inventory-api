import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Layers3 } from "lucide-react";
import { apiRequest } from "../../utils/api";
import "../../styles/brands-page.css";

export default function BrandsPage({ onCatalogNavChange = () => {} }) {
  const navigate = useNavigate();
  const [brandData, setBrandData] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const brandRes = await apiRequest("/api/public/brands");
        setBrandData(Array.isArray(brandRes) ? brandRes : []);
      } catch (err) {
        setMessage(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadData().catch((err) => setMessage(err.message));
  }, []);

  useEffect(() => {
    const brandOptions = ["ALL", ...brandData.map((b) => b.name)];
    onCatalogNavChange({
      brandOptions,
      brandFilter: "ALL",
      onBrandChange: (brand) => navigate(`/collections${brand && brand !== "ALL" ? `?brand=${encodeURIComponent(brand)}` : ""}`)
    });
  }, [brandData, navigate, onCatalogNavChange]);

  const openBrandCollection = (brand) => {
    navigate(`/collections?brand=${encodeURIComponent(brand)}`);
  };

  return (
    <main className="container container-customer brands-page-shell">
      <section className="hero brands-hero">
        <div className="brands-hero-copy">
          <span className="eyebrow">Brand Directory</span>
          <h1>Shop the world’s leading brands.</h1>
          <p>
            Explore the collection through a cleaner brand-first experience inspired by premium global retail catalogs.
          </p>
          <div className="brands-hero-meta">
            <span><Layers3 size={15} /> {brandData.length} brands</span>
          </div>
        </div>
        <div className="brands-hero-panel card">
          <strong>Curated Directory</strong>
          <p>Choose a brand below to enter its collection instantly.</p>
          <Link className="hero-cta brands-hero-cta" to="/collections">View full collection</Link>
        </div>
      </section>

      <section className="brands-directory card">
        <div className="brands-directory-head">
          <div>
            <span className="eyebrow">All Brands</span>
            <h2>Shop by brand</h2>
          </div>
          <p>{brandData.length} brand{brandData.length === 1 ? "" : "s"}</p>
        </div>

        {isLoading ? (
          <div className="brands-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <article key={`brand-skeleton-${index}`} className="brand-card brand-card-skeleton">
                <div className="skeleton-logo" />
              </article>
            ))}
          </div>
        ) : brandData.length > 0 ? (
          <div className="brands-grid">
            {brandData.map((brand) => (
              <button
                key={brand.id}
                type="button"
                className="brand-card"
                onClick={() => openBrandCollection(brand.name)}
                title={`Shop ${brand.name}`}
              >
                {brand.logoUrl ? (
                  <div className="brand-card-logo-large">
                    <img src={brand.logoUrl} alt={brand.name} />
                  </div>
                ) : (
                  <div className="brand-card-logo-large brand-card-logo-empty">
                    <span className="brand-card-name-fallback">{brand.name}</span>
                  </div>
                )}
                <div className="brand-card-footer">
                  <span className="brand-card-name">{brand.name}</span>
                  <span className="brand-card-action">
                    Explore
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="field-hint">No brands available right now.</p>
        )}
      </section>

      {message ? <div className="toast-banner">{message}</div> : null}
    </main>
  );
}
