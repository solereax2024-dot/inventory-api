import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { apiRequest, uploadImage } from "./utils/api";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import HeroPage from "./pages/customer/HeroPage";
import CustomerPage from "./pages/customer/CustomerPage";
import AdminPage from "./pages/admin/AdminPage";

export default function App() {
  const [branding, setBranding] = useState({ logoUrl: null });
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoModalMessage, setLogoModalMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [adminRole, setAdminRole] = useState(() => localStorage.getItem("adminRole") || "");
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("themeMode") || "light");

  useEffect(() => {
    apiRequest("/api/public/settings/branding")
      .then((data) => setBranding(data))
      .catch(() => setBranding({ logoUrl: null }));
  }, []);

  useEffect(() => {
    const syncAdminAuth = () => {
      setAdminToken(localStorage.getItem("adminToken") || "");
      setAdminRole(localStorage.getItem("adminRole") || "");
    };
    window.addEventListener("storage", syncAdminAuth);
    window.addEventListener("admin-auth-changed", syncAdminAuth);
    return () => {
      window.removeEventListener("storage", syncAdminAuth);
      window.removeEventListener("admin-auth-changed", syncAdminAuth);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", themeMode === "dark");
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  const handleAdminSignOut = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminRole");
    window.dispatchEvent(new Event("admin-auth-changed"));
    setAdminToken("");
    setAdminRole("");
  };

  const uploadLogoFromModal = async () => {
    if (!logoFile) {
      setLogoModalMessage("Please choose a logo file first.");
      return;
    }
    const token = localStorage.getItem("adminToken") || "";
    if (!token) {
      setLogoModalMessage("Please login as admin first.");
      return;
    }
    const data = await uploadImage("/api/admin/media/logo", logoFile, token);
    setBranding((prev) => ({ ...prev, logoUrl: data.url }));
    setLogoModalMessage("Logo updated.");
  };

  return (
    <div className="app-shell">
      <SiteHeader
        logoUrl={branding.logoUrl}
        onLogoClick={() => {
          setLogoFile(null);
          setLogoModalMessage("");
          setIsLogoModalOpen(true);
        }}
        searchValue={searchText}
        onSearchChange={setSearchText}
        isAdminLoggedIn={Boolean(adminToken)}
        onAdminSignOut={handleAdminSignOut}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))}
      />
      <Routes>
        <Route path="/" element={<HeroPage />} />
        <Route path="/shop" element={<CustomerPage searchText={searchText} setSearchText={setSearchText} />} />
        <Route
          path="/admin/*"
          element={
            <AdminPage
              onAdminAuthChange={() => {
                setAdminToken(localStorage.getItem("adminToken") || "");
                setAdminRole(localStorage.getItem("adminRole") || "");
              }}
            />
          }
        />
        <Route path="/admin.html/*" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isLogoModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsLogoModalOpen(false)}>
          <section className="modal-panel modal-panel-compact" onClick={(e) => e.stopPropagation()}>
            <div className="breakdown-header">
              <h2>Update Logo</h2>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close logo modal"
                onClick={() => setIsLogoModalOpen(false)}
              >
                ✕
              </button>
            </div>
            {branding?.logoUrl ? <img src={branding.logoUrl} alt="Current site logo" className="logo-preview" /> : null}
            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
            <button type="button" onClick={() => uploadLogoFromModal().catch((err) => setLogoModalMessage(err.message))}>
              Upload Logo
            </button>
            {logoModalMessage ? <p className="message">{logoModalMessage}</p> : null}
          </section>
        </div>
      ) : null}
      <SiteFooter />
    </div>
  );
}
