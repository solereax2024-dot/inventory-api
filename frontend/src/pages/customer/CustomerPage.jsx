import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { US_SIZES, CATALOG_PAGE_SIZE } from "../../constants";
import { apiRequest } from "../../utils/api";
import { formatEnumLabel } from "../../utils/format";
import { getColorwayDetails, sanitizeColorways } from "../../utils/colorway";
import { SlidersHorizontal } from "lucide-react";
import ProductCard from "../../components/ProductCard";

export default function CustomerPage({ searchText, setSearchText }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [productTypeFilter, setProductTypeFilter] = useState("ALL");
  const [colorwayFilter, setColorwayFilter] = useState("ALL");
  const [sizeFilter, setSizeFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("BRAND_ASC");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null, confirmCode: "", userInput: "" });

  // Transform products into colorway variants
  const expandProductsByColorway = (productsData) => {
    const expanded = [];
    productsData.forEach((product) => {
      const colorways = [...new Set((product.stocks || []).map((stock) => stock.colorway))];
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
      const expandedProducts = expandProductsByColorway(data);
      setProducts(expandedProducts);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts().catch((err) => setMessage(err.message));
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
   const colorwayOptions = useMemo(() => {
     // Get all unique colorways from the original products, not variants
     const uniqueColorways = new Set();
     products.forEach((variant) => {
       if (variant._colorwayVariant) {
         uniqueColorways.add(variant._colorwayVariant);
       }
     });
     return ["ALL", ...sanitizeColorways(Array.from(uniqueColorways))];
   }, [products]);
  const departmentOptions = useMemo(
    () => ["ALL", ...new Set(products.map((product) => (product.department || "").trim()).filter(Boolean))],
    [products]
  );
  const categoryOptions = useMemo(
    () => ["ALL", ...new Set(products.map((product) => (product.category || "").trim()).filter(Boolean))],
    [products]
  );
  const productTypeOptions = useMemo(
    () => ["ALL", ...new Set(products.map((product) => (product.productType || "").trim()).filter(Boolean))],
    [products]
  );
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

    const keyword = searchText.trim().toLowerCase();
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

     if (stateFilter !== "ALL") {
       next = next.filter((product) => {
         if (sizeFilter !== "ALL") {
           const sizeStatesByColorway = product.stockStateBySize || {};
           let scopedColorways = colorwayFilter === "ALL"
             ? Object.keys(sizeStatesByColorway)
             : [colorwayFilter];
           
           // If this is a variant, only use the variant colorway
           if (product._colorwayVariant) {
             scopedColorways = [product._colorwayVariant];
           }
           
           return scopedColorways.some((colorway) => Number(sizeStatesByColorway?.[colorway]?.[sizeFilter]?.[stateFilter] || 0) > 0);
         }
         const stateByColorway = product.stockStates || {};
         let scopedColorways = colorwayFilter === "ALL"
           ? Object.keys(stateByColorway)
           : [colorwayFilter];
         
         // If this is a variant, only use the variant colorway
         if (product._colorwayVariant) {
           scopedColorways = [product._colorwayVariant];
         }
         
         return scopedColorways.some((colorway) => Number(stateByColorway?.[colorway]?.[stateFilter] || 0) > 0);
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
    sizeFilter,
    stockFilter,
    colorwayFilter,
    stateFilter
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [brandFilter, departmentFilter, categoryFilter, productTypeFilter, sortBy, searchText, sizeFilter, stockFilter, colorwayFilter, stateFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(visibleProducts.length / CATALOG_PAGE_SIZE)), [visibleProducts]);
  const activePage = Math.min(currentPage, totalPages);
  const activeFilterCount = [
    brandFilter !== "ALL",
    departmentFilter !== "ALL",
    categoryFilter !== "ALL",
    productTypeFilter !== "ALL",
    sizeFilter !== "ALL",
    colorwayFilter !== "ALL",
    stockFilter !== "ALL",
    stateFilter !== "ALL",
    sortBy !== "BRAND_ASC",
    Boolean(searchText.trim())
  ].filter(Boolean).length;
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
    const start = (activePage - 1) * CATALOG_PAGE_SIZE;
    return visibleProducts.slice(start, start + CATALOG_PAGE_SIZE);
  }, [visibleProducts, activePage]);

  const openReservePage = (productId, initialColorway, preferredSize = US_SIZES[0]) => {
    const params = new URLSearchParams();
    if (initialColorway) params.set("colorway", initialColorway);
    if (preferredSize) params.set("size", preferredSize);
    navigate(`/reserve/${productId}?${params.toString()}`);
  };

  const resetCatalogFilters = () => {
    setBrandFilter("ALL");
    setDepartmentFilter("ALL");
    setCategoryFilter("ALL");
    setProductTypeFilter("ALL");
    setSizeFilter("ALL");
    setColorwayFilter("ALL");
    setStockFilter("ALL");
    setStateFilter("ALL");
    setSearchText("");
  };

  return (
    <main className="container container-customer">
      <section className="filter-bar">
        <div className="filter-bar-top">
          <div className="filter-results">
            <span className="filter-results-count">
              {visibleProducts.length} result{visibleProducts.length === 1 ? "" : "s"}
            </span>
            <span className="filter-results-meta">
              of {products.length} total
            </span>
            {activeFilterCount > 0 ? (
              <span className="filter-results-meta filter-results-chip">
                {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
              </span>
            ) : null}
          </div>
          <div className="filter-bar-actions">
            <button
              type="button"
              className={`filter-drawer-btn quick-tooltip${isFilterDrawerOpen ? " active" : ""}`}
              onClick={() => setIsFilterDrawerOpen(true)}
              aria-label="Open filter and sort panel"
              data-tooltip="Filter & sort"
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
            </button>
          </div>
        </div>
      </section>
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
                <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand}>{brand === "ALL" ? "All brands" : brand}</option>
                  ))}
                </select>
              </label>
              <label className="filter-control">
                <span className="filter-control-label">Gender</span>
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
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
                <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
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
                Done
              </button>
            </div>
          </aside>
        </div>
      ) : null}

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

      <section className="pagination-bar card">
        <div className="pagination-numbers">
          <button
            type="button"
            className="page-number-btn page-nav-btn"
            disabled={activePage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            aria-label="Previous page"
          >
            ‹
          </button>
          {paginationItems.map((item) =>
            item.type === "ellipsis" ? (
              <span key={item.value} className="page-ellipsis">…</span>
            ) : (
              <button
                key={item.value}
                type="button"
                className={`page-number-btn ${activePage === item.value ? "active" : ""}`}
                onClick={() => setCurrentPage(item.value)}
              >
                {item.value}
              </button>
            )
          )}
          <button
            type="button"
            className="page-number-btn page-nav-btn"
            disabled={activePage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </section>


      {deleteModal.isOpen && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ isOpen: false, productId: null, confirmCode: "", userInput: "" })}>
          <section className="modal-panel delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <h2>Delete Product</h2>
              <button className="close-btn" onClick={() => setDeleteModal({ isOpen: false, productId: null, confirmCode: "", userInput: "" })}>×</button>
            </div>

            <div className="delete-modal-body">
              <div className="warning-box">
                <div className="warning-icon">⚠️</div>
                <div className="warning-text">
                  <p><strong>This action cannot be undone.</strong></p>
                  <p>This will permanently delete the product and all associated stock records.</p>
                </div>
              </div>

              <div className="confirm-code-section">
                <p className="confirm-instruction">To confirm deletion, enter the code below:</p>
                <div className="confirm-code-display">{deleteModal.confirmCode}</div>

                <input
                  type="text"
                  className="confirm-code-input"
                  placeholder="Enter the code here"
                  value={deleteModal.userInput}
                  onChange={(e) => setDeleteModal({ ...deleteModal, userInput: e.target.value.toUpperCase() })}
                  autoFocus
                />
              </div>

              <div className="delete-modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setDeleteModal({ isOpen: false, productId: null, confirmCode: "", userInput: "" })}
                >
                  Cancel
                </button>
                <button
                  className="btn-delete-confirm"
                  onClick={confirmDelete}
                  disabled={deleteModal.userInput !== deleteModal.confirmCode}
                >
                  Delete Product
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      {message ? <div className="toast-banner">{message}</div> : null}
    </main>
  );
}
