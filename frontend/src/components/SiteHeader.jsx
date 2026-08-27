import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, Palette, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { apiRequest } from "../utils/api";
import "../styles/header.css";

const TRENDING_SEARCHES = ["Jordan", "Nike", "Samba", "Dunk", "Yeezy", "New Balance"];
const SEARCH_INTENTS = ["Running Shoes", "Lifestyle Sneakers", "Basketball Shoes", "Training Shoes"];
const VISUAL_SUGGESTION_BLUEPRINTS = [
  { brand: "On", label: "On Cloud Running", query: "On running shoes" },
  { brand: "Nike", label: "Nike Performance", query: "Nike training shoes" },
  { brand: "Adidas", label: "Adidas Lifestyle", query: "Adidas sneakers" },
  { brand: "New Balance", label: "New Balance Picks", query: "New Balance shoes" }
];

export default function SiteHeader({
  logoUrl,
  onLogoClick,
  searchValue,
  onSearchChange,
  isAdminLoggedIn,
  onAdminSignOut,
  onThemeColorClick,
  catalogNav = { brandOptions: ["ALL"], brandFilter: "ALL", onBrandChange: () => {} }
}) {
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth <= 720);
  const [visualSuggestions, setVisualSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const raw = window.localStorage.getItem("recentCatalogSearches") || "[]";
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 6) : [];
    } catch {
      return [];
    }
  });
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPath = location.pathname.startsWith("/admin");
  const isCatalogPath =
    location.pathname === "/collections" ||
    location.pathname.startsWith("/collections/") ||
    location.pathname === "/collection" ||
    location.pathname.startsWith("/collection/");
  const activeDepartment = (new URLSearchParams(location.search).get("department") || "").toUpperCase();
  const activeStock = (new URLSearchParams(location.search).get("stock") || "").toUpperCase();
  const activeKeyword = (new URLSearchParams(location.search).get("q") || "").trim().toLowerCase();

  const navLinks = [
    { label: "Brands",   to: "/brands",                       isActive: location.pathname.startsWith("/brands") },
    { label: "Men",      to: "/collections?department=MEN",   isActive: isCatalogPath && activeDepartment === "MEN" },
    { label: "Women",    to: "/collections?department=WOMEN", isActive: isCatalogPath && activeDepartment === "WOMEN" },
    { label: "Kids",     to: "/collections?q=kids",           isActive: isCatalogPath && activeKeyword === "kids" },
    { label: "Sale",     to: "/collections?stock=LOW_STOCK",  isActive: isCatalogPath && activeStock === "LOW_STOCK",  soon: true },
    { label: "Featured", to: "/collections?stock=IN_STOCK",   isActive: isCatalogPath && activeStock === "IN_STOCK",   soon: true },
  ];
  const quickBrandOptions = (catalogNav.brandOptions || []).filter((brand) => brand && brand !== "ALL").slice(0, 6);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => setIsMobileViewport(window.innerWidth <= 720);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveProductText = (product) => [
      product?.name,
      product?.brand,
      product?.category,
      product?.productType,
      product?.description
    ].join(" ").toLowerCase();

    const loadVisualSuggestions = async () => {
      try {
        const data = await apiRequest("/api/public/products");
        const products = Array.isArray(data) ? data.filter((item) => item?.imageUrl) : [];
        if (!products.length || cancelled) {
          return;
        }

        const catalog = products.map((product) => ({
          product,
          text: resolveProductText(product)
        }));
        const usedIds = new Set();

        const pickImage = (matcher) => {
          const hit = catalog.find(({ product, text }) => !usedIds.has(product.id) && matcher({ product, text }));
          if (hit) {
            usedIds.add(hit.product.id);
            return hit.product.imageUrl;
          }
          const fallback = catalog.find(({ product }) => !usedIds.has(product.id));
          if (!fallback) {
            return null;
          }
          usedIds.add(fallback.product.id);
          return fallback.product.imageUrl;
        };

        const findByBrand = (brandName) => {
          const normalizedBrand = String(brandName || "").trim().toLowerCase();
          return pickImage(({ product, text }) => {
            const productBrand = String(product?.brand || "").trim().toLowerCase();
            if (productBrand && productBrand === normalizedBrand) {
              return true;
            }
            return text.includes(normalizedBrand);
          });
        };

        const nextSuggestions = VISUAL_SUGGESTION_BLUEPRINTS
          .map((item) => {
            const imageUrl = findByBrand(item.brand) || pickImage(() => true);
            if (!imageUrl) {
              return null;
            }
            return {
              label: item.label,
              query: item.query,
              imageUrl
            };
          })
          .filter(Boolean);

        if (!cancelled && nextSuggestions.length > 0) {
          setVisualSuggestions(nextSuggestions);
        }
      } catch {
        // Keep visual suggestions hidden if products are unavailable.
      }
    };

    loadVisualSuggestions().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);


  const saveRecentSearch = (value) => {
    const term = String(value || "").trim();
    if (!term) return;
    setRecentSearches((prev) => {
      const next = [term, ...prev.filter((entry) => entry.toLowerCase() !== term.toLowerCase())].slice(0, 6);
      window.localStorage.setItem("recentCatalogSearches", JSON.stringify(next));
      return next;
    });
  };

  const syncSearchToUrl = (term) => {
    if (!isCatalogPath) {
      return;
    }
    const next = new URLSearchParams(location.search);
    if (term) {
      next.set("q", term);
    } else {
      next.delete("q");
    }
    const queryString = next.toString();
    navigate(`${location.pathname}${queryString ? `?${queryString}` : ""}`, { replace: true });
  };

  const submitSearch = () => {
    const term = String(searchValue || "").trim();
    onSearchChange(term);
    if (term) {
      saveRecentSearch(term);
    }
    syncSearchToUrl(term);
    setIsSearchDrawerOpen(false);
  };

  const clearRecentSearches = () => {
    window.localStorage.removeItem("recentCatalogSearches");
    setRecentSearches([]);
  };

  const applySuggestedSearch = (term) => {
    const cleanTerm = String(term || "").trim();
    onSearchChange(cleanTerm);
    if (cleanTerm) {
      saveRecentSearch(cleanTerm);
    }
    syncSearchToUrl(cleanTerm);
    setIsSearchDrawerOpen(false);
  };

  const applyBrandShortcut = (brand) => {
    onSearchChange("");
    syncSearchToUrl("");
    catalogNav.onBrandChange(brand);
    setIsSearchDrawerOpen(false);
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-left">
          <h1 className="site-title">
            {isAdminPath && isAdminLoggedIn ? (
              <button
                type="button"
                className="site-logo-button quick-tooltip"
                onClick={onLogoClick}
                data-tooltip="Update logo"
                aria-label="Update logo"
              >
                {logoUrl
                  ? <img className="site-logo" src={logoUrl} alt="Sole Reax logo" />
                  : <span className="site-logo-placeholder">🖼</span>}
              </button>
            ) : null}
            {logoUrl && (!isAdminPath || !isAdminLoggedIn) ? (
              <Link className="site-logo-link" to="/collections" aria-label="Go to collections">
                <img className="site-logo" src={logoUrl} alt="Sole Reax logo" />
              </Link>
            ) : null}
          </h1>
        </div>

        <div className="site-header-center">
          <nav className="site-center-nav" aria-label="Primary catalog links">
            {navLinks.map(({ label, to, isActive, soon }) =>
              soon ? (
                <span key={label} className="site-center-nav-link site-center-nav-link-soon" aria-disabled="true">
                  {label}
                  <span className="nav-soon-badge">Soon</span>
                </span>
              ) : (
                <Link key={label} className={`site-center-nav-link${isActive ? " active" : ""}`} to={to}>{label}</Link>
              )
            )}
          </nav>
        </div>

        <div className="site-header-right">
          {isCatalogPath && (
            <div className="nav-search-container">
              <button
                type="button"
                className={`nav-search-icon quick-tooltip${isSearchDrawerOpen ? " active" : ""}`}
                onClick={() => setIsSearchDrawerOpen(true)}
                data-tooltip="Search"
                aria-label="Open search"
                aria-expanded={isSearchDrawerOpen}
              >
                <Search size={18} />
              </button>
            </div>
          )}
          <button
            type="button"
            className={`menu-trigger quick-tooltip${isMenuOpen ? " active" : ""}`}
            data-tooltip="Menu"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {isCatalogPath && isSearchDrawerOpen ? (
        <div
          className={`search-drawer-backdrop${!isMobileViewport ? " search-drawer-backdrop-desktop" : ""}`}
          onClick={() => setIsSearchDrawerOpen(false)}
        >
          <section
            className={`search-drawer-panel${!isMobileViewport ? " search-drawer-panel-right" : ""}`}
            onClick={(e) => e.stopPropagation()}
            aria-label="Search drawer"
          >
            <div className="search-drawer-handle" aria-hidden="true" />
            <div className="search-drawer-header-row">
              <div className="search-drawer-header-copy">
                <span className="search-drawer-eyebrow">Smart search</span>
                <h3>Find Your Pair</h3>
                <p>Search by model, brand, or category with curated shortcuts.</p>
              </div>
              <button
                type="button"
                className="search-drawer-close"
                aria-label="Close search drawer"
                onClick={() => setIsSearchDrawerOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="search-drawer-input-row">
              <div className="search-drawer-input-shell">
                <input
                  className="search-drawer-input"
                  type="search"
                  placeholder="Search shoes, brand, type"
                  value={searchValue || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitSearch();
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="search-drawer-input-action"
                  aria-label="Search now"
                  onClick={submitSearch}
                >
                  <Search size={18} />
                </button>
              </div>
            </div>
            {visualSuggestions.length > 0 ? (
              <div className="search-drawer-section search-drawer-section-card">
                <p>Suggested for you</p>
                <div className="search-visual-suggestions-grid">
                  {visualSuggestions.map((item) => (
                    <button
                      key={`visual-${item.label}`}
                      type="button"
                      className="search-visual-card"
                      onClick={() => applySuggestedSearch(item.query)}
                    >
                      <span className="search-visual-image-wrap">
                        <img src={item.imageUrl} alt={item.label} className="search-visual-image" />
                      </span>
                      <span className="search-visual-copy">
                        <strong>{item.label}</strong>
                        <small>{item.query}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="search-drawer-content-grid">
              <div className="search-drawer-section search-drawer-section-card search-drawer-section-primary">
                <p>Shop by category</p>
                <div className="search-drawer-chip-list search-drawer-chip-grid">
                  {SEARCH_INTENTS.map((term) => (
                    <button
                      key={`intent-${term}`}
                      type="button"
                      className="search-drawer-chip search-drawer-chip-intent"
                      onClick={() => applySuggestedSearch(term)}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
              <div className="search-drawer-section search-drawer-section-card">
                <p>Trending searches</p>
                <div className="search-drawer-chip-list">
                  {TRENDING_SEARCHES.map((term) => (
                    <button
                      key={`trend-${term}`}
                      type="button"
                      className="search-drawer-chip"
                      onClick={() => applySuggestedSearch(term)}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
              {quickBrandOptions.length > 0 ? (
                <div className="search-drawer-section search-drawer-section-card">
                  <p>Shop by brand</p>
                  <div className="search-drawer-chip-list">
                    {quickBrandOptions.map((brand) => (
                      <button
                        key={`brand-${brand}`}
                        type="button"
                        className="search-drawer-chip search-drawer-chip-brand"
                        onClick={() => applyBrandShortcut(brand)}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {recentSearches.length > 0 ? (
                <div className="search-drawer-section search-drawer-section-card">
                  <div className="search-drawer-section-head">
                    <p>Recent searches</p>
                    <button
                      type="button"
                      className="search-drawer-clear-btn"
                      onClick={clearRecentSearches}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="search-drawer-chip-list">
                    {recentSearches.map((term) => (
                      <button
                        key={`recent-${term}`}
                        type="button"
                        className="search-drawer-chip search-drawer-chip-recent"
                        onClick={() => applySuggestedSearch(term)}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {isMenuOpen ? (
        <div className="site-menu-backdrop" onClick={() => setIsMenuOpen(false)}>
          <aside className="site-menu-panel" role="menu" aria-label="Header menu" onClick={(e) => e.stopPropagation()}>
            <div className="site-menu-panel-header">
              <button
                type="button"
                className="site-menu-close-btn"
                aria-label="Close menu"
                onClick={() => setIsMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
          <div className="site-menu-nav-links" role="group" aria-label="Page navigation">
            {navLinks.map(({ label, to, isActive, soon }) =>
              soon ? (
                <span key={label} className="site-menu-action site-menu-action-soon" aria-disabled="true">
                  <span>{label}</span>
                  <span className="nav-soon-badge">Soon</span>
                </span>
              ) : (
                <Link
                  key={label}
                  className={`site-menu-action${isActive ? " site-menu-action-open" : ""}`}
                  to={to}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>{label}</span>
                </Link>
              )
            )}
          </div>


          <div className="site-menu-lower">
            <button
              type="button"
              className="site-menu-action"
              onClick={() => {
                onThemeColorClick();
                setIsMenuOpen(false);
              }}
            >
              <Palette size={16} />
              <span>Theme</span>
            </button>
            {isAdminLoggedIn && isAdminPath && (
              <Link
                className="site-menu-action"
                to="/collections"
                onClick={() => setIsMenuOpen(false)}
              >
                <ShoppingBag size={16} />
                <span>View Collections</span>
              </Link>
            )}
            {isAdminLoggedIn && !isAdminPath && (
              <Link
                className="site-menu-action"
                to="/admin"
                onClick={() => setIsMenuOpen(false)}
              >
                <LayoutDashboard size={16} />
                <span>Admin Dashboard</span>
              </Link>
            )}
            {isAdminLoggedIn ? (
              <button
                type="button"
                className="site-menu-action"
                onClick={() => {
                  onAdminSignOut();
                  navigate("/collections");
                  setIsMenuOpen(false);
                }}
              >
                <LogOut size={16} />
                <span>Logout Admin</span>
              </button>
            ) : (
              <Link
                className="site-menu-action"
                to="/admin"
                onClick={() => setIsMenuOpen(false)}
              >
                <UserRound size={16} />
                <span>Admin Login</span>
              </Link>
            )}
          </div>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
