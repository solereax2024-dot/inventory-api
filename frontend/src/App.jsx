import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ImagePlus } from "lucide-react";
import { apiRequest, uploadImage } from "./utils/api";
import { SiteFooter, SiteHeader } from "./components/layout";
import { ThemeColorPicker, WelcomeThemeModal } from "./components/theme";
import CustomerPage from "./pages/customer/CustomerPage";
import FeaturedPage from "./pages/customer/FeaturedPage";
import BrandsPage from "./pages/customer/BrandsPage";
import ReservePage from "./pages/customer/ReservePage";
import AdminPage from "./pages/admin/AdminPage";
import { DEFAULT_THEME, THEMES } from "./constants/themes";
import { trackMetaEvent } from "./utils/tracking";
import "./styles/modals.css";
import "./styles/theme-picker-modal.css";

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const parsed = Number.parseInt(normalized, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function mixRgb(a, b, weightB) {
  const weightA = 1 - weightB;
  return {
    r: Math.round(a.r * weightA + b.r * weightB),
    g: Math.round(a.g * weightA + b.g * weightB),
    b: Math.round(a.b * weightA + b.b * weightB),
  };
}

function rgbToCss(rgb) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function getReadableTextColor(rgb) {
  const luminance = (0.2126 * rgb.r) + (0.7152 * rgb.g) + (0.0722 * rgb.b);
  return luminance > 170 ? "#0f172a" : "#f8fafc";
}

const THEME_DEFAULT_MIGRATION_KEY = "themeDefaultMigrationV1";

export default function App() {
  const location = useLocation();
  const isThemeCustomizationEnabled = false;
  const [branding, setBranding] = useState({ logoUrl: null, logoDarkUrl: null });
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoDarkFile, setLogoDarkFile] = useState(null);
  const [logoModalMessage, setLogoModalMessage] = useState("");
  const [searchText, setSearchText] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("q") || "").trim();
  });
  const [catalogNav, setCatalogNav] = useState({
    brandOptions: ["ALL"],
    brandFilter: "ALL",
    onBrandChange: () => {}
  });
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [themeColor, setThemeColor] = useState(() => {
    const hasMigratedDefault = localStorage.getItem(THEME_DEFAULT_MIGRATION_KEY) === "1";
    const storedTheme = localStorage.getItem("themeColor") || "";
    if (!hasMigratedDefault) {
      localStorage.setItem(THEME_DEFAULT_MIGRATION_KEY, "1");
      localStorage.setItem("themeColor", DEFAULT_THEME);
      return DEFAULT_THEME;
    }
    return THEMES[storedTheme] ? storedTheme : DEFAULT_THEME;
  });
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  const [showWelcome, setShowWelcome] = useState(false);

  // Use dark logo variant when night mode is enabled.
  const activeLogoUrl = isDarkMode && branding.logoDarkUrl ? branding.logoDarkUrl : branding.logoUrl;

  useEffect(() => {
    apiRequest("/api/public/settings/branding")
      .then((data) => setBranding({ logoUrl: data.logoUrl || null, logoDarkUrl: data.logoDarkUrl || null }))
      .catch(() => setBranding({ logoUrl: null, logoDarkUrl: null }));
  }, []);

  useEffect(() => {
    const iconHref = activeLogoUrl || "/favicon.png";
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "icon");
      document.head.appendChild(link);
    }
    link.setAttribute("href", iconHref);
  }, [activeLogoUrl]);

  useEffect(() => {
    const syncAdminAuth = () => {
      setAdminToken(localStorage.getItem("adminToken") || "");
    };
    window.addEventListener("storage", syncAdminAuth);
    window.addEventListener("admin-auth-changed", syncAdminAuth);
    return () => {
      window.removeEventListener("storage", syncAdminAuth);
      window.removeEventListener("admin-auth-changed", syncAdminAuth);
    };
  }, []);

  useEffect(() => {
    const selectedTheme = THEMES[themeColor] || THEMES[DEFAULT_THEME];
    const primaryRgb = hexToRgb(selectedTheme.primary);
    const primaryDarkRgb = hexToRgb(selectedTheme.primaryDark);
    const white = { r: 255, g: 255, b: 255 };
    const slate = { r: 15, g: 23, b: 42 };

    document.body.classList.forEach((cls) => {
      if (cls.startsWith("theme-color-")) {
        document.body.classList.remove(cls);
      }
    });

    const resolvedThemeKey = THEMES[themeColor] ? themeColor : DEFAULT_THEME;
    document.body.classList.add(`theme-color-${resolvedThemeKey}`);

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--primary", selectedTheme.primary);
    rootStyle.setProperty("--primary-strong", selectedTheme.primaryStrong);
    rootStyle.setProperty("--primary-dark", selectedTheme.primaryDark);
    rootStyle.setProperty("--primary-soft", selectedTheme.primarySoft);
    rootStyle.setProperty("--primary-soft-2", selectedTheme.primarySoft2);
    rootStyle.setProperty("--on-primary-text", getReadableTextColor(primaryRgb));
    rootStyle.setProperty("--focus-ring", selectedTheme.focusRing);
    rootStyle.setProperty("--theme-accent", selectedTheme.hex);
    rootStyle.setProperty("--theme-gradient-start", selectedTheme.gradientStart);
    rootStyle.setProperty("--theme-gradient-end", selectedTheme.gradientEnd);
    rootStyle.setProperty("--theme-dark-bg", selectedTheme.darkBg);
    rootStyle.setProperty("--theme-dark-bg-2", selectedTheme.darkBg2);

    // Light mode tokens tinted by the selected palette.
    rootStyle.setProperty("--bg-base", "#ffffff");
    rootStyle.setProperty("--bg-accent", rgbToCss(mixRgb(primaryRgb, white, 0.86)));
    rootStyle.setProperty("--surface", rgbToCss(mixRgb(primaryRgb, white, 0.96)));
    rootStyle.setProperty("--surface-raised", rgbToCss(mixRgb(primaryRgb, white, 0.97)));
    rootStyle.setProperty("--surface-2", rgbToCss(mixRgb(primaryRgb, white, 0.9)));
    rootStyle.setProperty("--surface-tint", rgbToCss(mixRgb(primaryRgb, white, 0.85)));
    rootStyle.setProperty("--surface-3", rgbToCss(mixRgb(primaryRgb, white, 0.78)));
    rootStyle.setProperty("--border", rgbToCss(mixRgb(primaryRgb, white, 0.74)));
    rootStyle.setProperty("--border-strong", rgbToCss(mixRgb(primaryRgb, white, 0.63)));
    rootStyle.setProperty("--tooltip-bg", rgbToCss(mixRgb(primaryDarkRgb, slate, 0.54)));
    rootStyle.setProperty("--tooltip-border", rgbToCss(mixRgb(primaryDarkRgb, slate, 0.36)));
    rootStyle.setProperty("--footer-bg", `rgba(${mixRgb(primaryRgb, white, 0.93).r}, ${mixRgb(primaryRgb, white, 0.93).g}, ${mixRgb(primaryRgb, white, 0.93).b}, 0.92)`);

    // Dark mode tokens tinted by the selected palette.
    rootStyle.setProperty("--dark-bg-start", rgbToCss(mixRgb(primaryDarkRgb, slate, 0.74)));
    rootStyle.setProperty("--dark-bg-mid", rgbToCss(mixRgb(primaryDarkRgb, slate, 0.8)));
    rootStyle.setProperty("--dark-bg-end", rgbToCss(mixRgb(primaryDarkRgb, slate, 0.86)));
    rootStyle.setProperty("--dark-surface", rgbToCss(mixRgb(primaryDarkRgb, slate, 0.7)));
    rootStyle.setProperty("--dark-surface-2", rgbToCss(mixRgb(primaryDarkRgb, slate, 0.78)));
    rootStyle.setProperty("--dark-border", rgbToCss(mixRgb(primaryRgb, slate, 0.58)));
    rootStyle.setProperty("--dark-border-strong", rgbToCss(mixRgb(primaryRgb, slate, 0.48)));
    rootStyle.setProperty("--dark-hover", `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.24)`);
    rootStyle.setProperty("--dark-chip", `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.28)`);

    localStorage.setItem("themeColor", resolvedThemeKey);
  }, [themeColor]);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", isDarkMode);
    localStorage.setItem("darkMode", String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    document.title = "Sole Reax PH | Official Site";
  }, [location.pathname]);

  useEffect(() => {
    trackMetaEvent("PageView", {
      page_path: `${location.pathname}${location.search || ""}`
    });
  }, [location.pathname, location.search]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const handleAdminSignOut = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminRole");
    window.dispatchEvent(new Event("admin-auth-changed"));
    setAdminToken("");
  };

  const handleWelcomeClose = () => {
    localStorage.setItem("solereax-welcomed", "true");
    setShowWelcome(false);
  };

  const uploadLogoDay = async (file) => {
    if (!file) { setLogoModalMessage("Please choose a day logo file."); return; }
    const token = localStorage.getItem("adminToken") || "";
    if (!token) { setLogoModalMessage("Please login as admin first."); return; }
    const data = await uploadImage("/api/admin/media/logo", file, token);
    setBranding((prev) => ({ ...prev, logoUrl: data.url }));
    setLogoModalMessage("Day logo updated.");
  };

  const uploadLogoDark = async (file) => {
    if (!file) { setLogoModalMessage("Please choose a night logo file."); return; }
    const token = localStorage.getItem("adminToken") || "";
    if (!token) { setLogoModalMessage("Please login as admin first."); return; }
    const data = await uploadImage("/api/admin/media/logo-dark", file, token);
    setBranding((prev) => ({ ...prev, logoDarkUrl: data.url }));
    setLogoModalMessage("Night logo updated.");
  };

  const handleLogoDayChange = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    setLogoModalMessage("");
    setLogoFile(file);

    if (!file) {
      return;
    }

    uploadLogoDay(file)
      .then(() => setLogoFile(null))
      .catch((err) => setLogoModalMessage(err.message));
  };

  const handleLogoDarkChange = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    setLogoModalMessage("");
    setLogoDarkFile(file);

    if (!file) {
      return;
    }

    uploadLogoDark(file)
      .then(() => setLogoDarkFile(null))
      .catch((err) => setLogoModalMessage(err.message));
  };

  return (
    <div className="app-shell">
      <SiteHeader
        logoUrl={activeLogoUrl}
        isAdminLoggedIn={Boolean(adminToken)}
        catalogNav={catalogNav}
        onLogoClick={() => {
          setLogoFile(null);
          setLogoDarkFile(null);
          setLogoModalMessage("");
          setIsLogoModalOpen(true);
        }}
        searchValue={searchText}
        onSearchChange={setSearchText}
        onAdminSignOut={handleAdminSignOut}
        themeColor={themeColor}
        onThemeColorClick={isThemeCustomizationEnabled ? () => setIsThemePickerOpen(true) : undefined}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/collections" replace />} />
        <Route path="/collections" element={<CustomerPage searchText={searchText} setSearchText={setSearchText} onCatalogNavChange={setCatalogNav} />} />
        <Route path="/featured" element={<FeaturedPage onCatalogNavChange={setCatalogNav} />} />
        <Route path="/feature" element={<Navigate to="/featured" replace />} />
        <Route path="/collection" element={<Navigate to="/collections" replace />} />
        <Route path="/brands" element={<BrandsPage onCatalogNavChange={setCatalogNav} />} />
        <Route path="/shop" element={<Navigate to="/collections" replace />} />
        <Route path="/reserve" element={<Navigate to="/collections" replace />} />
        <Route path="/reserve/:productId" element={<ReservePage />} />
        <Route
          path="/admin/*"
          element={
            <AdminPage
              onAdminAuthChange={() => {
                setAdminToken(localStorage.getItem("adminToken") || "");
              }}
            />
          }
        />
        <Route path="/admin.html/*" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/collections" replace />} />
      </Routes>

      {isLogoModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsLogoModalOpen(false)}>
          <section className="modal-panel modal-panel-compact" onClick={(e) => e.stopPropagation()}>
            <div className="breakdown-header">
              <h2>Update Logos</h2>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close logo modal"
                onClick={() => setIsLogoModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="logo-upload-grid">
              {/* Day Logo */}
              <div className="logo-upload-section">
                <p className="logo-upload-label">☀️ Day Theme</p>
                <input
                  id="branding-logo-day-file"
                  className="sr-only-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  onChange={handleLogoDayChange}
                />
                <div className="product-image-upload-tile-wrap logo-upload-tile-wrap">
                  <label htmlFor="branding-logo-day-file" className="product-image-upload-tile logo-upload-tile" title="Click to upload day logo">
                    {branding.logoUrl
                      ? <img src={branding.logoUrl} alt="Day logo" className="product-image-upload-tile-img logo-preview" />
                      : <span className="product-image-upload-placeholder logo-preview-empty"><ImagePlus size={20} /></span>}
                  </label>
                  <div className="product-image-upload-copy logo-upload-copy">
                    <small className="field-hint image-upload-name">
                      {logoFile ? `${logoFile.name}` : (branding.logoUrl ? "Logo uploaded" : "No file selected")}
                    </small>
                    <small className="field-hint image-upload-note">
                      {logoFile ? "Uploading automatically..." : "Click the tile to choose a file."}
                    </small>
                  </div>
                </div>
              </div>

              {/* Night Logo */}
              <div className="logo-upload-section">
                <p className="logo-upload-label">🌙 Night Theme</p>
                <input
                  id="branding-logo-night-file"
                  className="sr-only-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  onChange={handleLogoDarkChange}
                />
                <div className="product-image-upload-tile-wrap logo-upload-tile-wrap">
                  <label htmlFor="branding-logo-night-file" className="product-image-upload-tile logo-upload-tile" title="Click to upload night logo">
                    {branding.logoDarkUrl
                      ? <img src={branding.logoDarkUrl} alt="Night logo" className="product-image-upload-tile-img logo-preview" />
                      : <span className="product-image-upload-placeholder logo-preview-empty"><ImagePlus size={20} /></span>}
                  </label>
                  <div className="product-image-upload-copy logo-upload-copy">
                    <small className="field-hint image-upload-name">
                      {logoDarkFile ? `${logoDarkFile.name}` : (branding.logoDarkUrl ? "Logo uploaded" : "No file selected")}
                    </small>
                    <small className="field-hint image-upload-note">
                      {logoDarkFile ? "Uploading automatically..." : "Click the tile to choose a file."}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {logoModalMessage ? <p className="message">{logoModalMessage}</p> : null}
          </section>
        </div>
      ) : null}

      {isThemeCustomizationEnabled && isThemePickerOpen ? (
        <div className="theme-picker-modal-backdrop" onClick={() => setIsThemePickerOpen(false)}>
          <div className="theme-picker-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="theme-picker-modal-close"
              aria-label="Close theme picker"
              onClick={() => setIsThemePickerOpen(false)}
            >
              ✕
            </button>
            <ThemeColorPicker
              activeTheme={themeColor}
              isDarkMode={isDarkMode}
              onModeChange={setIsDarkMode}
              onThemeChange={(newTheme) => {
                setThemeColor(newTheme);
                setIsThemePickerOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}

      <SiteFooter />

      {isThemeCustomizationEnabled && showWelcome && (
        <WelcomeThemeModal
          activeTheme={themeColor}
          isDarkMode={isDarkMode}
          onThemeChange={(newTheme) => {
            setThemeColor(newTheme);
          }}
          onModeChange={setIsDarkMode}
          onClose={handleWelcomeClose}
        />
      )}
    </div>
  );
}
