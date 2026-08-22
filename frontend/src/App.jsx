import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { apiRequest, uploadImage } from "./utils/api";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import CustomerPage from "./pages/customer/CustomerPage";
import ReservePage from "./pages/customer/ReservePage";
import AdminPage from "./pages/admin/AdminPage";
import ThemeColorPicker from "./components/ThemeColorPicker";
import { DEFAULT_THEME, THEMES } from "./constants/themes";
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

export default function App() {
  const location = useLocation();
  const [branding, setBranding] = useState({ logoUrl: null, logoDarkUrl: null });
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoDarkFile, setLogoDarkFile] = useState(null);
  const [logoModalMessage, setLogoModalMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [catalogNav, setCatalogNav] = useState({
    brandOptions: ["ALL"],
    brandFilter: "ALL",
    onBrandChange: () => {}
  });
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem("themeColor") || DEFAULT_THEME);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");

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
    rootStyle.setProperty("--focus-ring", selectedTheme.focusRing);
    rootStyle.setProperty("--theme-accent", selectedTheme.hex);
    rootStyle.setProperty("--theme-gradient-start", selectedTheme.gradientStart);
    rootStyle.setProperty("--theme-gradient-end", selectedTheme.gradientEnd);
    rootStyle.setProperty("--theme-dark-bg", selectedTheme.darkBg);
    rootStyle.setProperty("--theme-dark-bg-2", selectedTheme.darkBg2);

    // Light mode tokens tinted by the selected palette.
    rootStyle.setProperty("--bg-base", rgbToCss(mixRgb(primaryRgb, white, 0.93)));
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

  const handleAdminSignOut = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminRole");
    window.dispatchEvent(new Event("admin-auth-changed"));
    setAdminToken("");
  };

  const uploadLogoDay = async () => {
    if (!logoFile) { setLogoModalMessage("Please choose a day logo file."); return; }
    const token = localStorage.getItem("adminToken") || "";
    if (!token) { setLogoModalMessage("Please login as admin first."); return; }
    const data = await uploadImage("/api/admin/media/logo", logoFile, token);
    setBranding((prev) => ({ ...prev, logoUrl: data.url }));
    setLogoFile(null);
    setLogoModalMessage("Day logo updated.");
  };

  const uploadLogoDark = async () => {
    if (!logoDarkFile) { setLogoModalMessage("Please choose a night logo file."); return; }
    const token = localStorage.getItem("adminToken") || "";
    if (!token) { setLogoModalMessage("Please login as admin first."); return; }
    const data = await uploadImage("/api/admin/media/logo-dark", logoDarkFile, token);
    setBranding((prev) => ({ ...prev, logoDarkUrl: data.url }));
    setLogoDarkFile(null);
    setLogoModalMessage("Night logo updated.");
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
        onThemeColorClick={() => setIsThemePickerOpen(true)}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/collection" replace />} />
        <Route path="/collection" element={<CustomerPage searchText={searchText} setSearchText={setSearchText} onCatalogNavChange={setCatalogNav} />} />
        <Route path="/shop" element={<Navigate to="/collection" replace />} />
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
        <Route path="*" element={<Navigate to="/collection" replace />} />
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
                {branding.logoUrl
                  ? <img src={branding.logoUrl} alt="Day logo" className="logo-preview" />
                  : <div className="logo-preview-empty">No logo</div>}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => uploadLogoDay().catch((err) => setLogoModalMessage(err.message))}
                >
                  Upload Day Logo
                </button>
              </div>

              {/* Night Logo */}
              <div className="logo-upload-section">
                <p className="logo-upload-label">🌙 Night Theme</p>
                {branding.logoDarkUrl
                  ? <img src={branding.logoDarkUrl} alt="Night logo" className="logo-preview" />
                  : <div className="logo-preview-empty">No logo</div>}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  onChange={(e) => setLogoDarkFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => uploadLogoDark().catch((err) => setLogoModalMessage(err.message))}
                >
                  Upload Night Logo
                </button>
              </div>
            </div>

            {logoModalMessage ? <p className="message">{logoModalMessage}</p> : null}
          </section>
        </div>
      ) : null}

      {isThemePickerOpen ? (
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
    </div>
  );
}
