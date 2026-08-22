import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, Palette, Search, ShoppingBag, UserRound, X } from "lucide-react";
import "../styles/header.css";

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBrandsExpanded, setIsBrandsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPath = location.pathname.startsWith("/admin");
  const isCatalogPath = location.pathname === "/collection" || location.pathname.startsWith("/collection/");
  const effectiveBrandOptions = Array.isArray(catalogNav.brandOptions) && catalogNav.brandOptions.length > 0
    ? catalogNav.brandOptions
    : ["ALL"];
  const selectableBrandOptions = effectiveBrandOptions.filter((brand) => brand !== "ALL");
  const brandsReady = selectableBrandOptions.length > 0;

  useEffect(() => {
    setIsMenuOpen(false);
    setIsBrandsExpanded(false);
  }, [location.pathname]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-left">
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

        <div className="site-header-center">
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
              <Link className="site-logo-link" to="/collection" aria-label="Go to collections">
                <img className="site-logo" src={logoUrl} alt="Sole Reax logo" />
              </Link>
            ) : null}
          </h1>
        </div>

        <div className="site-header-right">
          {isCatalogPath && (
            <div className="nav-search-container">
              {isSearchOpen ? (
                <input
                  className="nav-search-input"
                  type="search"
                  placeholder="Search products..."
                  value={searchValue || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onBlur={() => setIsSearchOpen(false)}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className="nav-search-icon quick-tooltip"
                  onClick={() => setIsSearchOpen(true)}
                  data-tooltip="Search"
                  aria-label="Open search"
                >
                  <Search size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

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
          <div className="site-menu-brands" role="group" aria-label="Brand selections">
            {!isAdminPath ? (
              brandsReady ? (
              <>
                <button
                  type="button"
                  className="site-menu-action site-menu-action-disclosure"
                  onClick={() => setIsBrandsExpanded((prev) => !prev)}
                  aria-expanded={isBrandsExpanded}
                >
                  <span>Brands</span>
                  <span className="site-menu-disclosure-icon" aria-hidden="true">{isBrandsExpanded ? "−" : "+"}</span>
                </button>
                {isBrandsExpanded ? (
                  <div className="site-menu-brand-list">
                    {selectableBrandOptions.map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        className={`site-menu-brand-item ${catalogNav.brandFilter === brand ? "active" : ""}`}
                        onClick={() => {
                          catalogNav.onBrandChange?.(brand);
                          setIsMenuOpen(false);
                        }}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <span className="site-menu-brands-loading">Loading brands…</span>
            )
            ) : null}
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
                to="/collection"
                onClick={() => setIsMenuOpen(false)}
              >
                <ShoppingBag size={16} />
                <span>View Collection</span>
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
                  navigate("/collection");
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
