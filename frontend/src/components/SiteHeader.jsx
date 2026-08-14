import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LogOut, Moon, Search, Sun, UserRound } from "lucide-react";

export default function SiteHeader({
  logoUrl,
  onLogoClick,
  searchValue,
  onSearchChange,
  isAdminLoggedIn,
  onAdminSignOut,
  themeMode,
  onToggleTheme
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPath = location.pathname.startsWith("/admin");
  const isCatalogPath = location.pathname === "/shop";
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div>
          <h1 className="site-title">
            {logoUrl && isAdminPath && isAdminLoggedIn ? (
              <button
                type="button"
                className="site-logo-button"
                onClick={onLogoClick}
                title="Update logo"
                aria-label="Update logo"
              >
                <img className="site-logo" src={logoUrl} alt="Sole Reax logo" />
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
                  className="nav-search-icon"
                  onClick={() => setIsSearchOpen(true)}
                  title="Search"
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
              className="nav-link"
              title="Sign Out"
              aria-label="Sign out admin"
              onClick={() => {
                onAdminSignOut();
                navigate("/");
              }}
            >
              <LogOut size={18} />
            </button>
          ) : (
            <Link className={`nav-link ${isAdminPath ? "active" : ""}`} to="/admin" title="Admin Sign In" aria-label="Admin sign in">
              <UserRound size={18} />
            </Link>
          )}
          <button
            type="button"
            className={`nav-theme-toggle ${themeMode === "dark" ? "active" : ""}`}
            title={themeMode === "dark" ? "Switch to light mode" : "Switch to night mode"}
            aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to night mode"}
            onClick={onToggleTheme}
          >
            {themeMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span>{themeMode === "dark" ? "Day Mode" : "Night Mode"}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
