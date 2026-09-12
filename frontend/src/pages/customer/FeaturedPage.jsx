import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProductCard } from "../../components/catalog";
import { apiRequest } from "../../utils/api";
import { getColorwayImageUrl, normalizeColorwayValue } from "../../utils/colorway";
import { trackMetaEvent } from "../../utils/tracking";
import "../../styles/featured-page.css";

const FEATURED_PAGE_SIZE = 12;

export default function FeaturedPage({ onCatalogNavChange = () => {} }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [siteUniqueViews, setSiteUniqueViews] = useState(null);
  const [topViewedItems, setTopViewedItems] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const featuredTopRef = useRef(null);

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
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalPopular / FEATURED_PAGE_SIZE)), [totalPopular]);
  const activePage = Math.min(currentPage, totalPages);
  const paginatedPopularProducts = useMemo(() => {
    const start = (activePage - 1) * FEATURED_PAGE_SIZE;
    return popularProducts.slice(start, start + FEATURED_PAGE_SIZE);
  }, [activePage, popularProducts]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [popularProducts.length]);

  const paginationItems = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => ({ type: "page", value: index + 1 }));
    }
    const items = [{ type: "page", value: 1 }];
    const start = Math.max(2, Math.min(activePage - 1, totalPages - 3));
    const end = Math.min(totalPages - 1, Math.max(activePage + 1, 4));
    if (start > 2) {
      items.push({ type: "ellipsis", value: "left" });
    }
    for (let page = start; page <= end; page += 1) {
      items.push({ type: "page", value: page });
    }
    if (end < totalPages - 1) {
      items.push({ type: "ellipsis", value: "right" });
    }
    items.push({ type: "page", value: totalPages });
    return items;
  }, [activePage, totalPages]);

  const handleFeaturedPageChange = (nextPageOrUpdater) => {
    setCurrentPage((prevPage) => {
      const resolvedPage = typeof nextPageOrUpdater === "function"
        ? nextPageOrUpdater(prevPage)
        : nextPageOrUpdater;
      return Math.max(1, Math.min(totalPages, resolvedPage));
    });

    window.requestAnimationFrame(() => {
      const targetTop = featuredTopRef.current
        ? window.scrollY + featuredTopRef.current.getBoundingClientRect().top - 16
        : 0;
      window.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: "auto" });
    });
  };

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

      <section className="catalog-section-head" aria-label="Featured heading">
        <div className="catalog-section-head-copy">
          <span className="catalog-section-label">Featured</span>
          <p>Popular products ranked by real customer view activity.</p>
        </div>
      </section>

      <section className="filter-bar" ref={featuredTopRef}>
        <div className="filter-bar-top">
          <div className="filter-results">
            <span className="filter-results-count">
              {totalPopular} product{totalPopular === 1 ? "" : "s"}
            </span>
            {siteUniqueViews !== null ? (
              <span className="featured-page-views-meta">
                {siteUniqueViews.toLocaleString()} unique site visit{siteUniqueViews === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid featured-products-grid">
        {isLoading
          ? Array.from({ length: FEATURED_PAGE_SIZE }, (_, index) => (
            <article key={`featured-skeleton-${index}`} className="card product-card skeleton-card">
              <div className="skeleton-media" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </article>
          ))
          : paginatedPopularProducts.map((product) => (
            <ProductCard
              key={`featured-${product.id}-${product._popularColorway || product._colorwayVariant || "DEFAULT"}`}
              product={product}
              onReserveClick={openReservePage}
              metaLayout="legacy"
              initialColorway={product._popularColorway || product._colorwayVariant}
            />
          ))}
      </section>

      {!isLoading && totalPopular > 0 ? (
        <nav className="pagination-inline" aria-label="Featured pages">
          <ul className="pagination-numbers pages-items">
            {activePage > 1 ? (
              <>
                <li className="pages-item pages-item-first">
                  <button
                    type="button"
                    className="page-number-btn page-nav-btn"
                    onClick={() => handleFeaturedPageChange(1)}
                    aria-label="First page"
                  >
                    {"<<"}
                  </button>
                </li>
                <li className="pages-item pages-item-prev">
                  <button
                    type="button"
                    className="page-number-btn page-nav-btn"
                    onClick={() => handleFeaturedPageChange((prev) => Math.max(1, prev - 1))}
                    aria-label="Previous page"
                  >
                    {"<"}
                  </button>
                </li>
              </>
            ) : null}
            {paginationItems.map((item) =>
              item.type === "ellipsis" ? (
                <li key={item.value} className="pages-item page-ellipsis" aria-hidden="true">...</li>
              ) : (
                <li key={item.value} className={`pages-item ${activePage === item.value ? "current" : ""}`}>
                  <button
                    type="button"
                    className={`page-number-btn ${activePage === item.value ? "active" : ""}`}
                    onClick={() => handleFeaturedPageChange(item.value)}
                    aria-current={activePage === item.value ? "page" : undefined}
                  >
                    {item.value}
                  </button>
                </li>
              )
            )}
            {activePage < totalPages ? (
              <>
                <li className="pages-item pages-item-next">
                  <button
                    type="button"
                    className="page-number-btn page-nav-btn"
                    onClick={() => handleFeaturedPageChange((prev) => Math.min(totalPages, prev + 1))}
                    aria-label="Next page"
                  >
                    {">"}
                  </button>
                </li>
                <li className="pages-item pages-item-last">
                  <button
                    type="button"
                    className="page-number-btn page-nav-btn"
                    onClick={() => handleFeaturedPageChange(totalPages)}
                    aria-label="Last page"
                  >
                    {">>"}
                  </button>
                </li>
              </>
            ) : null}
          </ul>
        </nav>
      ) : null}

      {!isLoading && popularProducts.length === 0 ? (
        <p className="field-hint">No featured products yet. Views will appear here once customers browse products.</p>
      ) : null}

      {message ? <div className="toast-banner">{message}</div> : null}
    </main>
  );
}

