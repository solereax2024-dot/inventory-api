import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProductCard } from "../../components/catalog";
import { apiRequest } from "../../utils/api";
import { getColorwayImageUrl, normalizeColorwayValue } from "../../utils/colorway";
import { trackMetaEvent } from "../../utils/tracking";
import "../../styles/featured-page.css";

export default function FeaturedPage({ onCatalogNavChange = () => {} }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [siteUniqueViews, setSiteUniqueViews] = useState(null);
  const [topViewedItems, setTopViewedItems] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiRequest("/api/public/catalog/facets")
      .then((data) => {
        if (cancelled) return;
        const brands = Array.isArray(data?.brands) ? data.brands.filter(Boolean) : [];
        onCatalogNavChange({
          brandOptions: ["ALL", ...brands],
          brandFilter: "ALL",
          onBrandChange: (brand) => {
            navigate(`/collections${brand && brand !== "ALL" ? `?brand=${encodeURIComponent(brand)}` : ""}`);
          }
        });
      })
      .catch(() => {
        if (!cancelled) {
          onCatalogNavChange({
            brandOptions: ["ALL"],
            brandFilter: "ALL",
            onBrandChange: () => navigate("/collections")
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, onCatalogNavChange]);

  useEffect(() => {
    let cancelled = false;

    apiRequest("/api/public/analytics/views")
      .then((data) => {
        if (cancelled) return;
        setSiteUniqueViews(Number(data?.siteUniqueViews || 0));
        const items = (data?.topViewedProducts || [])
          .map((item) => ({
            productId: Number(item?.productId || 0),
            colorwayKey: normalizeColorwayValue(item?.colorwayKey || "DEFAULT"),
            hasColorwayKey: Boolean((item?.colorwayKey || "").trim()),
            uniqueViews: Number(item?.uniqueViews || 0)
          }))
          .filter((item) => item.productId > 0);
        setTopViewedItems(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setMessage(err.message || "Unable to load featured products.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAnalyticsLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!analyticsLoaded) {
      return undefined;
    }

    if (!topViewedItems.length) {
      setPopularProducts([]);
      setIsLoading(false);
      return undefined;
    }

    const prioritizedTopItems = [];
    const seenProductIds = new Set();
    for (const topItem of topViewedItems) {
      if (seenProductIds.has(topItem.productId)) continue;
      seenProductIds.add(topItem.productId);
      prioritizedTopItems.push(topItem);
    }

    const ids = prioritizedTopItems.map((item) => item.productId).filter((id) => Number.isFinite(id) && id > 0);
    if (!ids.length) {
      setPopularProducts([]);
      setIsLoading(false);
      return undefined;
    }

    const params = new URLSearchParams();
    ids.forEach((id) => params.append("ids", String(id)));

    apiRequest(`/api/public/products/by-ids?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        const products = Array.isArray(data) ? data : [];
        const productsById = new Map(products.map((item) => [item.id, item]));
        const result = [];
        for (const topItem of prioritizedTopItems) {
          const match = productsById.get(topItem.productId);
          const resolvedColorway = topItem.hasColorwayKey ? topItem.colorwayKey : "DEFAULT";
          if (match && getColorwayImageUrl(match, resolvedColorway)) {
            result.push({
              ...match,
              _popularColorway: normalizeColorwayValue(resolvedColorway),
              _popularUsesExactColorway: topItem.hasColorwayKey,
              _popularUniqueViews: topItem.uniqueViews
            });
          }
        }
        setPopularProducts(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setMessage(err.message || "Unable to load featured products.");
          setPopularProducts([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [analyticsLoaded, topViewedItems]);

  useEffect(() => {
    trackMetaEvent("ViewContent", {
      content_type: "popular_products",
      page_path: "/featured"
    });
  }, []);

  const openReservePage = (productId, initialColorway, preferredSize = "") => {
    const params = new URLSearchParams();
    if (initialColorway) params.set("colorway", initialColorway);
    if (preferredSize) params.set("size", preferredSize);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    navigate(`/reserve/${productId}?${params.toString()}`, {
      state: { fromCollectionsQuery: "" }
    });
  };

  const totalPopular = popularProducts.length;

  return (
    <main className="container container-customer featured-page-shell">
      <nav className="reserve-breadcrumb" aria-label="Breadcrumb">
        <Link className="reserve-page-crumb-link reserve-back-link" to="/collections">
          <span className="reserve-back-arrow" aria-hidden="true">←</span>
          Collections
        </Link>
        <span className="reserve-page-crumb-separator" aria-hidden="true">/</span>
        <span className="reserve-page-crumb-current">Featured</span>
      </nav>

      <section className="card featured-page-hero">
        <div className="featured-page-hero-copy">
          <span className="eyebrow">Featured</span>
          <h1>Popular products in ranked order</h1>
          <p>These products are sorted by real customer view activity across the site.</p>
        </div>
        <div className="featured-page-hero-meta">
          <p>{totalPopular} product{totalPopular === 1 ? "" : "s"}</p>
          {siteUniqueViews !== null ? (
            <p>{siteUniqueViews.toLocaleString()} unique site visit{siteUniqueViews === 1 ? "" : "s"}</p>
          ) : null}
        </div>
      </section>

      <section className="featured-page-grid">
        {isLoading
          ? Array.from({ length: 8 }, (_, index) => (
            <article key={`featured-skeleton-${index}`} className="card product-card skeleton-card">
              <div className="skeleton-media" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </article>
          ))
          : popularProducts.map((product) => (
            <ProductCard
              key={`featured-${product.id}-${product._popularColorway || product._colorwayVariant || "DEFAULT"}`}
              product={product}
              onReserveClick={openReservePage}
              metaLayout="legacy"
              initialColorway={product._popularColorway || product._colorwayVariant}
              autoCycleColorways
              autoCycleOffsetMs={((product.id || 0) % 5) * 360}
              autoCycleIntervalMs={2450 + (((product.id || 0) % 6) * 180)}
              autoCycleJitterMs={520}
            />
          ))}
      </section>

      {!isLoading && popularProducts.length === 0 ? (
        <p className="field-hint">No featured products yet. Views will appear here once customers browse products.</p>
      ) : null}

      {message ? <div className="toast-banner">{message}</div> : null}
    </main>
  );
}

