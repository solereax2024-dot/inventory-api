import { Link } from "react-router-dom";

export default function HeroPage() {
  return (
    <main className="container container-customer">
      <section className="hero hero-collections">
        <div className="hero-collections-copy">
          <p className="eyebrow">Sole Reax Collections</p>
          <h1>Shop real. Stay real.</h1>
          <p className="hero-subcopy">Only authentic sneaker finds, curated for modern movement.</p>
          <div className="hero-service-line">
            <span>Nationwide Shipping</span>
            <span>Same-Day Delivery (Selected Areas)</span>
            <span>Cash on Delivery</span>
          </div>
          <div className="hero-actions">
            <Link className="hero-cta" to="/collection">
              Browse Collections
            </Link>
          </div>
        </div>
        <div className="hero-collections-visual">
          <article className="hero-collection-tile hero-collection-main">
            <p>Latest Drops</p>
            <span>Curated weekly</span>
          </article>
          <div className="hero-collection-row">
            <article className="hero-collection-tile">
              <p>Nike</p>
              <span>Performance Icons</span>
            </article>
            <article className="hero-collection-tile">
              <p>On</p>
              <span>Running Essentials</span>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
