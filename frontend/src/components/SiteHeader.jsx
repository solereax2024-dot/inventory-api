import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LogOut, Palette, Search, UserRound } from "lucide-react";
import { THEMES } from "../constants/themes";
import "../styles/header.css";

export default function SiteHeader({
  logoUrl,
  onLogoClick,
  searchValue,
  onSearchChange,
  isAdminLoggedIn,
  onAdminSignOut,
  themeColor,
  onThemeColorClick
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPath = location.pathname.startsWith("/admin");
  const isCatalogPath = location.pathname === "/shop";
  const currentTheme = THEMES[themeColor];
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div>
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
              <Link className="site-logo-link" to="/" aria-label="Go to hero page">
                <img className="site-logo" src={logoUrl} alt="Sole Reax logo" />
              </Link>
            ) : null}
          </h1>
        </div>
        <nav className="nav">
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
          {isAdminLoggedIn ? (
            <button
              type="button"
              className="nav-link quick-tooltip"
                  data-tooltip="Logout"
              aria-label="Sign out admin"
              onClick={() => {
                onAdminSignOut();
                navigate("/");
              }}
            >
              <LogOut size={18} />
            </button>
          ) : (
            <Link
              className={`nav-link quick-tooltip ${isAdminPath ? "active" : ""}`}
              to="/admin"
              data-tooltip="Admin"
              aria-label="Admin sign in"
            >
              <UserRound size={18} />
            </Link>
          )}
          <button
            type="button"
            className={`nav-theme-toggle quick-tooltip`}
            aria-label="Choose theme color"
            data-tooltip="Theme"
            onClick={onThemeColorClick}
            style={{ '--theme-accent': currentTheme?.hex || '#4f46e5' }}
          >
            <Palette size={16} />
          </button>
        </nav>
      </div>
    </header>
  );
}
