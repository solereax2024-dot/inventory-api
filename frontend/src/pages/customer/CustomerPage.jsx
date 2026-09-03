import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { US_SIZES, CATALOG_PAGE_SIZE } from "../../constants";
import { apiRequest } from "../../utils/api";
import { formatEnumLabel } from "../../utils/format";
import { getColorwayDetails, getColorwayImageUrl, normalizeColorwayValue, sanitizeColorways, sortColorways } from "../../utils/colorway";
import { getOrCreateViewSessionId, shouldTrackViewForScope } from "../../utils/viewSession";
import { trackMetaEvent } from "../../utils/metaPixel";
import { SlidersHorizontal } from "lucide-react";
import ProductCard from "../../components/ProductCard";
import BrandsMarquee from "../../components/BrandsMarquee";
import "../../styles/popular-rail.css";

export default function CustomerPage({ searchText, setSearchText, onCatalogNavChange = () => {} }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [productTypeFilter, setProductTypeFilter] = useState("ALL");
  const [colorwayFilter, setColorwayFilter] = useState("ALL");
  const [sizeFilter, setSizeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("BRAND_ASC");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isDesktopCatalog, setIsDesktopCatalog] = useState(() => window.innerWidth > 720);
  const [siteUniqueViews, setSiteUniqueViews] = useState(null);
  const [topViewedItems, setTopViewedItems] = useState([]);
  const [brandBannerItems, setBrandBannerItems] = useState([]);
  const [popularRailScrollRatio, setPopularRailScrollRatio] = useState(0);
  const [canScrollPopularRail, setCanScrollPopularRail] = useState(false);
  const popularRailRef = useRef(null);

  // Transform products into colorway variants
  const expandProductsByColorway = (productsData) => {
    if (!Array.isArray(productsData) || productsData.length === 0) {
      return [];
    }
    const expanded = [];
    productsData.forEach((product) => {
      const colorways = sortColorways(sanitizeColorways((product.stocks || []).map((stock) => stock.colorway)));
      if (colorways.length === 0) {
        expanded.push(product);
        return;
      }
      colorways.forEach((colorway) => {
        const colorwayDetails = getColorwayDetails(product, colorway);
        expanded.push({
          ...product,
          description: colorwayDetails.description || product.description,
          department: colorwayDetails.department || product.department,
          category: colorwayDetails.category || product.category,
          productType: colorwayDetails.productType || product.productType,
          _colorwayVariant: colorway,
          _variantId: `${product.id}-${colorway}`,
        });
      });
    });
    return expanded;
  };

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const data = await apiRequest("/api/public/products");
      const expandedProducts = expandProductsByColorway(Array.isArray(data) ? data : []);
      setProducts(expandedProducts);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts().catch((err) => setMessage(err.message));

    const sessionId = getOrCreateViewSessionId();
    if (shouldTrackViewForScope("site")) {
      apiRequest("/api/public/analytics/views/track", "POST", { sessionId }).catch(() => {});
    }
    apiRequest("/api/public/analytics/views")
      .then((data) => {
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
      .catch(() => {});

    apiRequest("/api/public/brands")
      .then((brandData) => {
        const next = Array.isArray(brandData)
          ? brandData.filter((brand) => (brand?.name || "").trim())
          : [];
        setBrandBannerItems(next);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const updateLayoutMode = () => setIsDesktopCatalog(window.innerWidth > 720);
    window.addEventListener("resize", updateLayoutMode);
    updateLayoutMode();
    return () => window.removeEventListener("resize", updateLayoutMode);
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  const brandOptions = useMemo(
    () => ["ALL", ...new Set(products.map((product) => (product.brand || "").trim()).filter(Boolean))],
    [products]
  );
  // Derive directly from URL — no intermediate state, no sync effects
  const brandFilter = useMemo(() => {
    const q = (searchParams.get("brand") || "").trim();
    if (!q) return "ALL";
    return brandOptions.find((b) => b.toLowerCase() === q.toLowerCase()) || "ALL";
  }, [searchParams, brandOptions]);
  const colorwayOptions = useMemo(() => {
     // Get all unique colorways from the original products, not variants
     const uniqueColorways = new Set();
     products.forEach((variant) => {
       if (variant._colorwayVariant) {
         uniqueColorways.add(variant._colorwayVariant);
       }
     });
     return ["ALL", ...sortColorways(sanitizeColorways(Array.from(uniqueColorways)))];
   }, [products]);
  const departmentOptions = useMemo(
    () => ["ALL", ...new Set(products.map((product) => (product.department || "").trim()).filter(Boolean))],
    [products]
  );
  // Derive directly from URL — no intermediate state, no sync effects
  const departmentFilter = useMemo(() => {
    const q = (searchParams.get("department") || "").trim();
    if (!q) return "ALL";
    return departmentOptions.find((d) => d.toLowerCase() === q.toLowerCase()) || "ALL";
  }, [searchParams, departmentOptions]);
  const stockFilter = useMemo(() => {
    const q = (searchParams.get("stock") || "").trim().toUpperCase();
    return ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"].includes(q) ? q : "ALL";
  }, [searchParams]);
  const categoryOptions = useMemo(
    () => ["ALL", ...new Set(products.map((product) => (product.category || "").trim()).filter(Boolean))],
    [products]
  );
  const productTypeOptions = useMemo(
    () => ["ALL", ...new Set(products.map((product) => (product.productType || "").trim()).filter(Boolean))],
    [products]
  );

  // One-way sync: URL ?q -> App-level searchText, only when URL params change.
  useEffect(() => {
    const queryKeyword = (searchParams.get("q") || "").trim();
    setSearchText((prev) => (prev === queryKeyword ? prev : queryKeyword));
  }, [searchParams, setSearchText]);

  useEffect(() => {
    onCatalogNavChange({
      brandOptions,
      brandFilter,
      onBrandChange: (brand) => {
        const next = new URLSearchParams(searchParams);
        if (brand !== "ALL") next.set("brand", brand);
        else next.delete("brand");
        setSearchParams(next, { replace: true });
      }
    });
  }, [brandOptions, brandFilter, onCatalogNavChange, searchParams, setSearchParams]);

  const visibleProducts = useMemo(() => {
    let next = [...products];

    if (brandFilter !== "ALL") {
      next = next.filter((product) => (product.brand || "").toLowerCase() === brandFilter.toLowerCase());
    }
    if (departmentFilter !== "ALL") {
      next = next.filter((product) => (product.department || "").toUpperCase() === departmentFilter);
    }
    if (categoryFilter !== "ALL") {
      next = next.filter((product) => (product.category || "").toUpperCase() === categoryFilter);
    }
    if (productTypeFilter !== "ALL") {
      next = next.filter((product) => (product.productType || "").toUpperCase() === productTypeFilter);
    }

    const keyword = (searchText || searchParams.get("q") || "").trim().toLowerCase();
    if (keyword) {
      next = next.filter((product) => {
        const name = (product.name || "").toLowerCase();
        const brand = (product.brand || "").toLowerCase();
        const department = formatEnumLabel(product.department).toLowerCase();
        const category = formatEnumLabel(product.category).toLowerCase();
        const productType = formatEnumLabel(product.productType).toLowerCase();
        return name.includes(keyword) || brand.includes(keyword) || department.includes(keyword) || category.includes(keyword) || productType.includes(keyword);
      });
    }

    if (sizeFilter !== "ALL") {
      next = next.filter((product) => (product.stocks || []).some((stock) => stock.size === sizeFilter));
    }

     if (colorwayFilter !== "ALL") {
       next = next.filter((product) => {
         const variantColorway = product._colorwayVariant;
         if (variantColorway) {
           return variantColorway === colorwayFilter;
         }
         return (product.stocks || []).some((stock) => stock.colorway === colorwayFilter);
       });
     }

     if (stockFilter !== "ALL") {
       next = next.filter((product) => {
         const stocks = product.stocks || [];
         let scopedStocks = stocks;
         
         // If this is a variant, filter to only that colorway
         if (product._colorwayVariant) {
           scopedStocks = stocks.filter((stock) => stock.colorway === product._colorwayVariant);
         } else if (colorwayFilter !== "ALL") {
           scopedStocks = stocks.filter((stock) => stock.colorway === colorwayFilter);
         }
         
         const sizeStock = sizeFilter === "ALL"
           ? null
           : scopedStocks.find((stock) => String(stock.size) === String(sizeFilter));
         const sizeQty = sizeStock ? Number(sizeStock.quantity) : 0;

         if (sizeFilter !== "ALL") {
           if (stockFilter === "OUT_OF_STOCK") {
             return sizeQty <= 0;
           }
           if (stockFilter === "LOW_STOCK") {
             return sizeQty > 0 && sizeQty <= 3;
           }
           return sizeQty > 0;
         }

         if (stockFilter === "OUT_OF_STOCK") {
           return scopedStocks.every((stock) => Number(stock.quantity) <= 0);
         }
         if (stockFilter === "LOW_STOCK") {
           return scopedStocks.some((stock) => Number(stock.quantity) > 0 && Number(stock.quantity) <= 3);
         }
         return scopedStocks.some((stock) => Number(stock.quantity) > 0);
       });
     }

    next.sort((a, b) => {
      const brandA = (a.brand || "").toLowerCase();
      const brandB = (b.brand || "").toLowerCase();
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();

      if (sortBy === "BRAND_DESC") {
        const brandCompare = brandB.localeCompare(brandA);
        return brandCompare !== 0 ? brandCompare : nameA.localeCompare(nameB);
      }
      if (sortBy === "NAME_ASC") {
        return nameA.localeCompare(nameB);
      }
      if (sortBy === "NAME_DESC") {
        return nameB.localeCompare(nameA);
      }
      const brandCompare = brandA.localeCompare(brandB);
      return brandCompare !== 0 ? brandCompare : nameA.localeCompare(nameB);
    });

    return next;
  }, [
    products,
    brandFilter,
    departmentFilter,
    categoryFilter,
    productTypeFilter,
    sortBy,
    searchText,
    searchParams,
    sizeFilter,
    stockFilter,
    colorwayFilter
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [brandFilter, departmentFilter, categoryFilter, productTypeFilter, sortBy, searchText, sizeFilter, stockFilter, colorwayFilter]);

  const catalogPageSize = isDesktopCatalog ? CATALOG_PAGE_SIZE : 12;
  const activeFilterCount = [
    brandFilter !== "ALL",
    departmentFilter !== "ALL",
    categoryFilter !== "ALL",
    productTypeFilter !== "ALL",
    sizeFilter !== "ALL",
    colorwayFilter !== "ALL",
    stockFilter !== "ALL",
    sortBy !== "BRAND_ASC",
    Boolean(searchText.trim())
  ].filter(Boolean).length;
  const shouldShowPopularRail = activeFilterCount === 0 && !searchText.trim();
  const popularProducts = useMemo(() => {
    if (!shouldShowPopularRail || !topViewedItems.length || !products.length) {
      return [];
    }

    const result = [];
    const usedProductIds = new Set();
    for (const topItem of topViewedItems) {
      if (usedProductIds.has(topItem.productId)) {
        continue;
      }
      const productMatches = products.filter((item) => item.id === topItem.productId);
      const exactMatch = topItem.hasColorwayKey
        ? productMatches.find(
            (item) => normalizeColorwayValue(item._colorwayVariant || "DEFAULT") === topItem.colorwayKey
          )
        : null;
      const fallbackMatch = productMatches.find(
        (item) => getColorwayImageUrl(item, item._colorwayVariant || "DEFAULT")
      ) || productMatches[0];
      const match = exactMatch || fallbackMatch;
      const resolvedColorway = topItem.hasColorwayKey
        ? topItem.colorwayKey
        : normalizeColorwayValue(match?._colorwayVariant || "DEFAULT");
      if (match && getColorwayImageUrl(match, resolvedColorway)) {
        usedProductIds.add(topItem.productId);
        result.push({
          ...match,
          _popularColorway: resolvedColorway,
          _popularUsesExactColorway: topItem.hasColorwayKey,
          _popularUniqueViews: topItem.uniqueViews
        });
      }
      if (result.length >= 6) {
        break;
      }
    }
    return result.sort((a, b) => {
      const viewDiff = Number(b?.viewCount || 0) - Number(a?.viewCount || 0);
      if (viewDiff !== 0) {
        return viewDiff;
      }
      return String(a?.name || "").localeCompare(String(b?.name || ""));
    });
  }, [shouldShowPopularRail, topViewedItems, products]);

  useEffect(() => {
    const rail = popularRailRef.current;
    if (!rail || !shouldShowPopularRail || popularProducts.length === 0) {
      setPopularRailScrollRatio(0);
      setCanScrollPopularRail(false);
      return undefined;
    }

    const updatePopularRailProgress = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      if (maxScrollLeft <= 1) {
        setPopularRailScrollRatio(0);
        setCanScrollPopularRail(false);
        return;
      }
      const ratio = Math.min(1, Math.max(0, rail.scrollLeft / maxScrollLeft));
      setPopularRailScrollRatio(ratio);
      setCanScrollPopularRail(true);
    };

    updatePopularRailProgress();
    rail.addEventListener("scroll", updatePopularRailProgress, { passive: true });
    window.addEventListener("resize", updatePopularRailProgress);

    return () => {
      rail.removeEventListener("scroll", updatePopularRailProgress);
      window.removeEventListener("resize", updatePopularRailProgress);
    };
  }, [shouldShowPopularRail, popularProducts.length]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(visibleProducts.length / catalogPageSize)), [visibleProducts.length, catalogPageSize]);
  const activePage = Math.min(currentPage, totalPages);
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
  const paginatedProducts = useMemo(() => {
    const start = (activePage - 1) * catalogPageSize;
    return visibleProducts.slice(start, start + catalogPageSize);
  }, [visibleProducts, activePage, catalogPageSize]);

  const openReservePage = (productId, initialColorway, preferredSize = US_SIZES[0]) => {
    const params = new URLSearchParams();
    if (initialColorway) params.set("colorway", initialColorway);
    if (preferredSize) params.set("size", preferredSize);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    navigate(`/reserve/${productId}?${params.toString()}`, {
      state: { fromCollectionsQuery: searchParams.toString() }
    });
  };

  const openBrandCollection = (brandName) => {
    navigate(`/collections?brand=${encodeURIComponent(brandName)}`);
  };

  useEffect(() => {
    const payload = {
      content_type: "product_catalog",
      page_path: "/collections"
    };
    if (brandFilter !== "ALL") payload.brand = brandFilter;
    if (departmentFilter !== "ALL") payload.department = departmentFilter;
    if (searchText.trim()) payload.search_string = searchText.trim();
    trackMetaEvent("ViewContent", payload);
  }, [brandFilter, departmentFilter, searchText]);

  const resetCatalogFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("brand");
    next.delete("department");
    next.delete("stock");
    next.delete("q");
    setSearchParams(next, { replace: true });
    setSearchText("");
    setCategoryFilter("ALL");
    setProductTypeFilter("ALL");
    setSizeFilter("ALL");
    setColorwayFilter("ALL");
    setSortBy("BRAND_ASC");
  };

  return (
    <main className="container container-customer">

      <section className="filter-bar">
        <div className="filter-bar-top">
          <div className="filter-results">
            <span className="filter-results-count">
              {visibleProducts.length} result{visibleProducts.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="filter-bar-actions">
            <button
              type="button"
              className={`filter-drawer-btn quick-tooltip${isFilterDrawerOpen ? " active" : ""}${!isDesktopCatalog ? " mobile-filter-btn-compact" : ""}`}
              onClick={() => setIsFilterDrawerOpen(true)}
              aria-label="Open filter and sort panel"
              data-tooltip="Filter & sort"
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {!isDesktopCatalog && activeFilterCount > 0 ? <span className="mobile-filter-count">{activeFilterCount}</span> : null}
            </button>
          </div>
        </div>
      </section>

      {shouldShowPopularRail && popularProducts.length > 0 ? (
        <section className="popular-rail" aria-label="Popular right now">
          <div className="popular-rail-head">
            <h2>Popular right now</h2>
            {siteUniqueViews !== null ? (
              <p>{siteUniqueViews.toLocaleString()} unique site visit{siteUniqueViews === 1 ? "" : "s"}</p>
            ) : null}
          </div>
          <div className="popular-rail-track" ref={popularRailRef}>
            {popularProducts.map((product) => (
              <article key={`popular-${product.id}-${product._popularColorway || product._colorwayVariant || "DEFAULT"}`} className="popular-rail-item">
                <ProductCard
                  product={product}
                  onReserveClick={openReservePage}
                  initialColorway={product._popularColorway || product._colorwayVariant}
                  autoCycleColorways
                  autoCycleOffsetMs={((product.id || 0) % 5) * 360}
                  autoCycleIntervalMs={2450 + (((product.id || 0) % 6) * 180)}
                  autoCycleJitterMs={520}
                />
              </article>
            ))}
          </div>
          {canScrollPopularRail ? (
            <div
              className="popular-rail-progress"
              aria-hidden="true"
              style={{ "--popular-scroll-ratio": String(popularRailScrollRatio) }}
            >
              <span className="popular-rail-progress-thumb" />
            </div>
          ) : null}
        </section>
      ) : null}

      {shouldShowPopularRail && brandBannerItems.length > 0 ? (
        <BrandsMarquee brands={brandBannerItems} onBrandClick={openBrandCollection} />
      ) : null}

      {isFilterDrawerOpen ? (
        <div className="filter-drawer-backdrop" onClick={() => setIsFilterDrawerOpen(false)}>
          <aside className="filter-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="filter-drawer-header">
              <h3>Filter & Sort</h3>
              <button type="button" className="close-btn" onClick={() => setIsFilterDrawerOpen(false)}>×</button>
            </div>
            <div className="filter-controls-grid">
              <label className="filter-control">
                <span className="filter-control-label">Sort</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="BRAND_ASC">Brand A-Z</option>
                  <option value="BRAND_DESC">Brand Z-A</option>
                  <option value="NAME_ASC">Name A-Z</option>
                  <option value="NAME_DESC">Name Z-A</option>
                </select>
              </label>
              <label className="filter-control">
                <span className="filter-control-label">Brand</span>
                <select value={brandFilter} onChange={(e) => {
                  const next = new URLSearchParams(searchParams);
                  if (e.target.value !== "ALL") next.set("brand", e.target.value);
                  else next.delete("brand");
                  setSearchParams(next, { replace: true });
                }}>
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand}>{brand === "ALL" ? "All brands" : brand}</option>
                  ))}
                </select>
              </label>
              <label className="filter-control">
                <span className="filter-control-label">Gender</span>
                <select value={departmentFilter} onChange={(e) => {
                  const next = new URLSearchParams(searchParams);
                  if (e.target.value !== "ALL") next.set("department", e.target.value);
                  else next.delete("department");
                  setSearchParams(next, { replace: true });
                }}>
                  {departmentOptions.map((dep) => (
                    <option key={dep} value={dep}>{dep === "ALL" ? "All genders" : formatEnumLabel(dep)}</option>
                  ))}
                </select>
              </label>
              <label className="filter-control">
                <span className="filter-control-label">Category</span>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat === "ALL" ? "All categories" : formatEnumLabel(cat)}</option>
                  ))}
                </select>
              </label>
              <label className="filter-control">
                <span className="filter-control-label">Type</span>
                <select value={productTypeFilter} onChange={(e) => setProductTypeFilter(e.target.value)}>
                  {productTypeOptions.map((productType) => (
                    <option key={productType} value={productType}>{productType === "ALL" ? "All types" : formatEnumLabel(productType)}</option>
                  ))}
                </select>
              </label>
              <label className="filter-control">
                <span className="filter-control-label">Colorway</span>
                <select value={colorwayFilter} onChange={(e) => setColorwayFilter(e.target.value)}>
                  {colorwayOptions.map((colorway) => (
                    <option key={colorway} value={colorway}>{colorway === "ALL" ? "All colorways" : colorway}</option>
                  ))}
                </select>
              </label>
              <label className="filter-control">
                <span className="filter-control-label">US Size</span>
                <select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)}>
                  <option value="ALL">All sizes</option>
                  {US_SIZES.map((size) => (
                    <option key={size} value={size}>US {size}</option>
                  ))}
                </select>
              </label>
              <label className="filter-control">
                <span className="filter-control-label">Stock</span>
                <select value={stockFilter} onChange={(e) => {
                  const next = new URLSearchParams(searchParams);
                  if (e.target.value !== "ALL") next.set("stock", e.target.value);
                  else next.delete("stock");
                  setSearchParams(next, { replace: true });
                }}>
                  <option value="ALL">All stock levels</option>
                  <option value="IN_STOCK">In stock</option>
                  <option value="LOW_STOCK">Low stock</option>
                  <option value="OUT_OF_STOCK">Out of stock</option>
                </select>
              </label>
            </div>
            <div className="filter-drawer-footer">
              <button type="button" className="filter-reset-btn" onClick={resetCatalogFilters}>
                Reset filters
              </button>
              <button type="button" className="filter-drawer-btn active" onClick={() => setIsFilterDrawerOpen(false)}>
                Show Results ({visibleProducts.length})
              </button>
            </div>
          </aside>
        </div>
      ) : null}

       <section className="catalog-section-head" aria-label="Collection heading">
         <div className="catalog-section-head-copy">
           <span className="catalog-section-label">Collections</span>
           <p>Explore standout pieces across featured brands.</p>
         </div>
       </section>

       <section className="grid">
         {isLoadingProducts
           ? Array.from({ length: 8 }, (_, index) => (
             <article key={`skeleton-${index}`} className="card product-card skeleton-card">
               <div className="skeleton-media" />
               <div className="skeleton-line" />
               <div className="skeleton-line short" />
             </article>
           ))
           : paginatedProducts.map((product) => (
             <ProductCard
               key={product._variantId || product.id}
               product={product}
               onReserveClick={openReservePage}
               initialColorway={product._colorwayVariant}
             />
           ))}
         {visibleProducts.length === 0 ? <p className="field-hint">No products match your filters.</p> : null}
       </section>

      <nav className="pagination-inline" aria-label="Collections pages">
        <ul className="pagination-numbers pages-items">
          {activePage > 1 ? (
            <>
              <li className="pages-item pages-item-first">
                <button
                  type="button"
                  className="page-number-btn page-nav-btn"
                  onClick={() => setCurrentPage(1)}
                  aria-label="First page"
                >
                  «
                </button>
              </li>
              <li className="pages-item pages-item-prev">
                <button
                  type="button"
                  className="page-number-btn page-nav-btn"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  aria-label="Previous page"
                >
                  ‹
                </button>
              </li>
            </>
          ) : null}
          {paginationItems.map((item) =>
            item.type === "ellipsis" ? (
              <li key={item.value} className="pages-item page-ellipsis" aria-hidden="true">…</li>
            ) : (
              <li key={item.value} className={`pages-item ${activePage === item.value ? "current" : ""}`}>
                <button
                  type="button"
                  className={`page-number-btn ${activePage === item.value ? "active" : ""}`}
                  onClick={() => setCurrentPage(item.value)}
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
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  aria-label="Next page"
                >
                  ›
                </button>
              </li>
              <li className="pages-item pages-item-last">
                <button
                  type="button"
                  className="page-number-btn page-nav-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  aria-label="Last page"
                >
                  »
                </button>
              </li>
            </>
          ) : null}
        </ul>
      </nav>
      {message ? <div className="toast-banner">{message}</div> : null}
    </main>
  );
}
