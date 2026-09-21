import { useEffect, useMemo, useState } from "react";
import { ImagePlus, PlusCircle, RotateCcw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  US_SIZES,
  DEPARTMENT_OPTIONS,
  CATEGORY_OPTIONS,
  ADMIN_PAGE_SIZE
} from "../../constants";
import { apiRequest, uploadImage } from "../../utils/api";
import { formatColorwayLabel, formatEnumLabel, getProductTypeOptions } from "../../utils/format";
import { sanitizeColorways, normalizeColorwayValue } from "../../utils/colorway";
import { getAdminScopedColorway, getProductColorways, mapProductToForm } from "../../utils/productFormHelpers";
import { getStockStorageGroup } from "../../utils/stock";
import { buildFilteredReservations, buildReservationMopTotals, buildReservationStats } from "../../utils/reservationStatsHelpers";
import { aggregateStockSummaryTotals, filterStockSummaryRows, sortStockSummaryRows } from "../../utils/stockSummaryHelpers";
import { buildSizeSections, getDefaultSizeGroup, getDepartmentForColorway, isUnisexDepartment } from "../../utils/sizePresentation";
import { buildDefaultProductDescription } from "../../utils/productDescription";
import { CUSTOMER_MARKUP } from "../../utils/price";
import {
  decodeRoleFromToken,
  formatFileSize,
  formatPriceLabel,
  getFileFormatLabel
} from "../../utils/adminHelpers";
import { useModalState, useReservationEditorState } from "../../hooks";
import "../../styles/admin.css";
import "../../styles/stock.css";
import {
  AdminSizeGuideModal,
  AdminSuccessModal,
  ConfirmActionModal,
  DeleteModal,
  ManualReservationModal,
  NewBrandModal,
  NewAdminModal,
  NewProductNameModal,
  ProductActionModalShell,
  StockSummaryModal
} from "../../components/modals/admin";
import AdminLoginSection from "./components/AdminLoginSection.jsx";
import AdminProductsSection from "./components/AdminProductsSection.jsx";
import AdminSectionTabs from "./components/AdminSectionTabs.jsx";
import AdminUsersSection from "./components/AdminUsersSection.jsx";
import PromotionsSection from "./components/PromotionsSection.jsx";
import AdminReservationsTable from "./components/AdminReservationsTable.jsx";
import ReservationDashboardCards from "./components/ReservationDashboardCards.jsx";
import ReservationFilters from "./components/ReservationFilters.jsx";
import { getBrandSizeGuide, getGuideSectionForContext } from "../../utils/sizeGuide";


const DEFAULT_STOCK_SUMMARY_BULK_ACTION = {
  quantityChange: "",
  quantityMode: "ADD",
  supplier: "",
  price: "",
  markup: "",
  applying: false
};

const DEFAULT_STOCK_SUMMARY_RESET_MODAL = {
  isOpen: false,
  count: 0,
  colorway: "DEFAULT",
  productName: ""
};

const createManualReservationForm = () => ({
  customerName: "",
  customerContact: "",
  notes: "",
  mop: "GCASH",
  mopOther: "",
  promoCode: "",
  items: [{ productId: "", colorway: "DEFAULT", size: "", sizeGroup: "MEN", quantity: "1" }]
});

export default function AdminPage({ onAdminAuthChange = () => {} }) {
  const UNDO_WINDOW_MS = 5000;
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [adminRole, setAdminRole] = useState(() => {
    const storedRole = localStorage.getItem("adminRole") || "";
    return storedRole || decodeRoleFromToken(localStorage.getItem("adminToken") || "");
  });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [productForm, setProductForm] = useState({
    name: "",
    brand: "",
    mainColor: "",
    department: "UNISEX",
    category: "FOOTWEAR",
    productType: "LIFESTYLE_SNEAKERS",
    imageUrl: "",
    price: "",
    colorwayImages: {},
    description: ""
  });
  const [stockForm, setStockForm] = useState({
    productId: "",
    colorway: "DEFAULT",
    size: US_SIZES[0],
    sizeGroup: "MEN",
    actionType: "ADD",
    quantityChange: 1,
    price: "",
    supplier: ""
  });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [undoQueue, setUndoQueue] = useState([]);
  const [undoNow, setUndoNow] = useState(Date.now());
  const [productActionModal, setProductActionModal] = useState({ type: null, productId: "" });
  const [productImageFile, setProductImageFile] = useState(null);
  const [editProductImageFile, setEditProductImageFile] = useState(null);
  const [isCreateImageUploading, setIsCreateImageUploading] = useState(false);
  const [isEditImageUploading, setIsEditImageUploading] = useState(false);
  const [editProductId, setEditProductId] = useState("");
  const [editProductForm, setEditProductForm] = useState({
    name: "",
    brand: "",
    mainColor: "",
    department: "UNISEX",
    category: "FOOTWEAR",
    productType: "LIFESTYLE_SNEAKERS",
    imageUrl: "",
    price: "",
    colorwayPrice: "",
    colorwayImages: {},
    description: ""
  });
  const [editImageColorway, setEditImageColorway] = useState("DEFAULT");
  const [editDetailColorway, setEditDetailColorway] = useState("DEFAULT");
  const [tableFilters, setTableFilters] = useState({
    product: "",
    brand: "ALL"
  });
  const [reservationFilters, setReservationFilters] = useState({
    keyword: "",
    status: "ALL"
  });
  const {
    updatingOrderId,
    setUpdatingOrderId,
    mopOtherDrafts,
    setMopOtherDrafts,
    priceDrafts,
    setPriceDrafts,
    downpaymentDrafts,
    setDownpaymentDrafts,
    balanceDrafts,
    setBalanceDrafts,
    markReservationSaved,
    isReservationSaved,
    isReservationEditorOpen,
    setReservationEditorOpen,
    clearReservationStateForOrder
  } = useReservationEditorState();
  const [adminPage, setAdminPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null, confirmCode: "", userInput: "" });
  const [reservationDeleteModal, setReservationDeleteModal] = useState({
    isOpen: false,
    orderId: null,
    customerName: "",
    itemCount: 0
  });
  const [manualReservationModal, setManualReservationModal] = useState({ isOpen: false });
  const [manualReservationForm, setManualReservationForm] = useState(() => createManualReservationForm());
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);
  const [colorwayDeleteModal, setColorwayDeleteModal] = useState({ isOpen: false, productId: null, colorway: "" });
  const [newBrandModal, setNewBrandModal] = useState({ isOpen: false, brandName: "" });
  const [newAdminModal, setNewAdminModal] = useState({ isOpen: false });
  const [newProductNameModal, setNewProductNameModal] = useState({ isOpen: false, productName: "" });
  const [savedBrands, setSavedBrands] = useState([]);
  const [savedProductNames, setSavedProductNames] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [newAdminForm, setNewAdminForm] = useState({ username: "", password: "", role: "ADMIN" });
   const [activeAdminSection, setActiveAdminSection] = useState("products");
   const [isCreateDescriptionEdited, setIsCreateDescriptionEdited] = useState(false);
  const {
    isOpen: isStockGuideOpen,
    open: openStockGuideModal,
    close: closeStockGuideModal,
    setIsOpen: setStockGuideModalOpen
  } = useModalState(false);
  const {
    isOpen: isStockSummaryOpen,
    open: openStockSummaryModal,
    close: closeStockSummaryModal
  } = useModalState(false);
    const [stockSummaryQuickFilters, setStockSummaryQuickFilters] = useState({
      lowStockOnly: false,
          noSupplierOnly: false
    });
     const [stockSummarySortColumn, setStockSummarySortColumn] = useState("size");
    const [stockSummarySortAsc, setStockSummarySortAsc] = useState(true);
    const [stockSummarySelectedRows, setStockSummarySelectedRows] = useState(new Set());
    const [stockSummarySupplierSelections, setStockSummarySupplierSelections] = useState({});
    const [stockSummaryResetModal, setStockSummaryResetModal] = useState(() => ({ ...DEFAULT_STOCK_SUMMARY_RESET_MODAL }));
    const [stockSummaryBulkAction, setStockSummaryBulkAction] = useState(() => ({ ...DEFAULT_STOCK_SUMMARY_BULK_ACTION }));
  const [hasStockGuideOnboardingShown, setHasStockGuideOnboardingShown] = useState(
    () => localStorage.getItem("adminStockGuideOnboardingShown") === "1"
  );

  const isLoggedIn = useMemo(() => token.length > 0, [token]);
  const isSuperAdmin = useMemo(() => adminRole === "SUPER_ADMIN", [adminRole]);

  const getPreferredStockSelection = (product, colorway, preferredSize = null, preferredGroup = null) => {
    const department = getDepartmentForColorway(product, colorway);
    const sizeSections = buildSizeSections(product, colorway);
    const defaultGroup = getDefaultSizeGroup(department);
    const targetSection =
      sizeSections.find((section) => section.key === preferredGroup)
      || sizeSections.find((section) => section.key === defaultGroup)
      || sizeSections[0]
      || null;
    const rows = targetSection?.rows || [];
    const preferredRow = preferredSize ? rows.find((row) => row.baseSize === preferredSize) : null;

    return {
      sizeGroup: targetSection?.key || defaultGroup,
      size: preferredRow?.baseSize || rows[0]?.baseSize || US_SIZES[0],
      price: preferredRow?.price ?? rows[0]?.price ?? null,
      markup: preferredRow?.markup ?? rows[0]?.markup ?? CUSTOMER_MARKUP,
      supplier: preferredRow?.supplier || rows[0]?.supplier || ""
    };
  };

   const adminSections = useMemo(
      () => [
        { key: "products", label: "Products" },
        { key: "reservations", label: "Reservations" },
        ...(isSuperAdmin ? [{ key: "promotions", label: "Promotions" }, { key: "users", label: "Admin Users" }] : [])
      ],
      [isSuperAdmin]
    );

  const mergeUpdatedProduct = (updatedProduct) => {
    if (!updatedProduct?.id) {
      return;
    }
    setProducts((prev) => {
      const exists = prev.some((item) => String(item.id) === String(updatedProduct.id));
      if (!exists) {
        return prev;
      }
      return prev.map((item) => (String(item.id) === String(updatedProduct.id) ? updatedProduct : item));
    });
  };

  const adminColorwayOptions = useMemo(() => {
    const selectedProduct = products.find((product) => String(product.id) === String(stockForm.productId));
    return getProductColorways(selectedProduct);
  }, [products, stockForm.productId]);
  const createImageTargetColorway = useMemo(
    () => normalizeColorwayValue(productForm.mainColor || "DEFAULT"),
    [productForm.mainColor]
  );
  const editImageColorwayOptions = useMemo(() => {
    const product = products.find((item) => String(item.id) === String(editProductId));
    const fromStocks = (product?.stocks || []).map((stock) => stock.colorway);
    const fromMapped = Object.keys(editProductForm.colorwayImages || {});
    return [...new Set(["DEFAULT", ...sanitizeColorways([editProductForm.mainColor, ...fromStocks, ...fromMapped]).map(normalizeColorwayValue)])];
  }, [products, editProductId, editProductForm.mainColor, editProductForm.colorwayImages]);
  const editDetailColorwayOptions = useMemo(() => {
    const product = products.find((item) => String(item.id) === String(editProductId));
    return getProductColorways(product);
  }, [products, editProductId]);

  const brandOptions = useMemo(() => {
    const fromProducts = products.map((p) => (p.brand || "").trim()).filter(Boolean);
    const fromSaved = savedBrands.map((b) => b.name);
    return [...new Set([...fromProducts, ...fromSaved])].sort();
  }, [products, savedBrands]);

  const generatedCreateDescription = useMemo(
    () => buildDefaultProductDescription(productForm),
    [productForm.brand, productForm.name, productForm.mainColor, productForm.department, productForm.category, productForm.productType]
  );

  const nameOptions = useMemo(() => {
    const fromProducts = products.map((p) => (p.name || "").trim()).filter(Boolean);
    return [...new Set([...fromProducts, ...savedProductNames])].sort();
  }, [products, savedProductNames]);

  const loadAdminData = async (authToken, role = adminRole) => {
    setIsAdminLoading(true);
    try {
      const [productData, orderData, brandData, productNameData] = await Promise.all([
        apiRequest("/api/admin/products", "GET", undefined, authToken),
        apiRequest("/api/admin/orders", "GET", undefined, authToken),
        apiRequest("/api/admin/brands", "GET", undefined, authToken),
        apiRequest("/api/admin/product-names", "GET", undefined, authToken)
      ]);
      setProducts(productData);
      setOrders(orderData);
      setSavedBrands(brandData);
      setSavedProductNames(productNameData);
      setEditProductId((prev) => prev || (productData[0]?.id?.toString() ?? ""));
      setStockForm((prev) => ({ ...prev, productId: prev.productId || (productData[0]?.id?.toString() ?? "") }));
      if (role === "SUPER_ADMIN") {
        const users = await apiRequest("/api/admin/users", "GET", undefined, authToken);
        setAdminUsers(users);
      } else {
        setAdminUsers([]);
      }
    } finally {
      setIsAdminLoading(false);
    }
  };


  const pushUndoEntry = (type, value, label) => {
    const entry = {
      id: `${type}-${value}-${Date.now()}`,
      type,
      value,
      label,
      expiresAt: Date.now() + UNDO_WINDOW_MS
    };
    setUndoQueue((prev) => [entry, ...prev].slice(0, 3));
  };

  const deleteProduct = (productId) => {
    if (!isSuperAdmin) {
      setMessage("Only SUPER_ADMIN can delete stocks/products.");
      return;
    }
    const confirmCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setDeleteModal({ isOpen: true, productId, confirmCode, userInput: "" });
  };

  const confirmDelete = async () => {
    if (deleteModal.userInput !== deleteModal.confirmCode) {
      setMessage("Confirmation code does not match. Please try again.");
      return;
    }

    const productId = deleteModal.productId;
    setDeleteModal({ isOpen: false, productId: null, confirmCode: "", userInput: "" });

    try {
      await apiRequest(`/api/admin/products/${productId}`, "DELETE", undefined, token);
      setSuccessModal({ isOpen: true, message: "Product deleted successfully." });
      await loadAdminData(token, adminRole);
    } catch (err) {
      setMessage("Failed to delete product: " + err.message);
    }
  };

  const addNewBrand = async () => {
    const trimmedName = newBrandModal.brandName.trim();
    if (!trimmedName) {
      setMessage("Brand name cannot be empty.");
      return;
    }
    if (brandOptions.includes(trimmedName)) {
      setMessage("Brand already exists.");
      return;
    }
    try {
      const newBrand = await apiRequest("/api/admin/brands", "POST", { name: trimmedName }, token);
      setSavedBrands((prev) => [...prev, newBrand].sort((a, b) => a.name.localeCompare(b.name)));
      setProductForm({ ...productForm, brand: trimmedName });
      setNewBrandModal({ isOpen: false, brandName: "" });
      setSuccessModal({ isOpen: true, message: `Brand "${trimmedName}" saved.` });
    } catch (err) {
      setMessage("Failed to save brand: " + err.message);
    }
  };

  const deleteSavedBrand = async (brandName) => {
    const trimmedName = (brandName || "").trim();
    if (!trimmedName) {
      return;
    }
    try {
      await apiRequest(`/api/admin/brands/by-name?name=${encodeURIComponent(trimmedName)}`, "DELETE", undefined, token);
      setSavedBrands((prev) => prev.filter((b) => b.name.toLowerCase() !== trimmedName.toLowerCase()));
      setProductForm((prev) => (prev.brand.toLowerCase() === trimmedName.toLowerCase() ? { ...prev, brand: "" } : prev));
      setEditProductForm((prev) => (prev.brand.toLowerCase() === trimmedName.toLowerCase() ? { ...prev, brand: "" } : prev));
      pushUndoEntry("brand", trimmedName, `Brand "${trimmedName}" deleted.`);
      setMessage("Delete completed. Undo available below.");
    } catch (err) {
      setMessage("Failed to delete brand: " + err.message);
    }
  };

  const uploadBrandLogo = async (brandId, file) => {
    try {
      const updated = await uploadImage(`/api/admin/brands/${brandId}/logo`, file, token);
      setSavedBrands((prev) => prev.map((b) => (b.id === brandId ? updated : b)));
      setSuccessModal({ isOpen: true, message: "Brand logo updated." });
    } catch (err) {
      setMessage("Failed to upload brand logo: " + err.message);
    }
  };

  const addNewProductName = async () => {
    const trimmedName = newProductNameModal.productName.trim();
    if (!trimmedName) {
      setMessage("Product name cannot be empty.");
      return;
    }
    if (nameOptions.some((name) => name.toLowerCase() === trimmedName.toLowerCase())) {
      setMessage("Product name already exists.");
      return;
    }
    try {
      await apiRequest("/api/admin/product-names", "POST", { name: trimmedName }, token);
      setSavedProductNames((prev) => [...prev, trimmedName].sort());
      setProductForm({ ...productForm, name: trimmedName });
      setNewProductNameModal({ isOpen: false, productName: "" });
      setSuccessModal({ isOpen: true, message: `Product name "${trimmedName}" saved.` });
    } catch (err) {
      setMessage("Failed to save product name: " + err.message);
    }
  };

  const deleteSavedProductName = async (productName) => {
    const trimmedName = (productName || "").trim();
    if (!trimmedName) {
      return;
    }
    try {
      await apiRequest(`/api/admin/product-names/by-name?name=${encodeURIComponent(trimmedName)}`, "DELETE", undefined, token);
      setSavedProductNames((prev) => prev.filter((name) => name.toLowerCase() !== trimmedName.toLowerCase()));
      setProductForm((prev) => (prev.name.toLowerCase() === trimmedName.toLowerCase() ? { ...prev, name: "" } : prev));
      setEditProductForm((prev) => (prev.name.toLowerCase() === trimmedName.toLowerCase() ? { ...prev, name: "" } : prev));
      pushUndoEntry("name", trimmedName, `Product name "${trimmedName}" deleted.`);
      setMessage("Delete completed. Undo available below.");
    } catch (err) {
      setMessage("Failed to delete product name: " + err.message);
    }
  };

  const undoDelete = async (entryId) => {
    const entry = undoQueue.find((item) => item.id === entryId);
    if (!entry) {
      return;
    }

    try {
      if (entry.type === "brand") {
        const restored = await apiRequest("/api/admin/brands", "POST", { name: entry.value }, token);
        setSavedBrands((prev) => [...prev.filter((b) => b.name !== restored.name), restored].sort((a, b) => a.name.localeCompare(b.name)));
        setMessage(`Restored brand "${entry.value}".`);
      } else if (entry.type === "name") {
        await apiRequest("/api/admin/product-names", "POST", { name: entry.value }, token);
        setSavedProductNames((prev) => [...new Set([...prev, entry.value])].sort());
        setMessage(`Restored product name "${entry.value}".`);
      }
      setUndoQueue((prev) => prev.filter((item) => item.id !== entryId));
    } catch (err) {
      setMessage("Failed to undo delete: " + err.message);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    loadAdminData(token, adminRole || decodeRoleFromToken(token)).catch((err) => {
      setMessage(err.message);
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminRole");
      setToken("");
      setAdminRole("");
      onAdminAuthChange();
    });
  }, [token, adminRole, onAdminAuthChange]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => {
      setMessage("");
    }, undoQueue.length > 0 ? UNDO_WINDOW_MS : 2800);
    return () => window.clearTimeout(timer);
  }, [message, undoQueue.length]);

  useEffect(() => {
    if (undoQueue.length === 0) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      setUndoNow(now);
      setUndoQueue((prev) => prev.filter((item) => item.expiresAt > now));
    }, 250);

    return () => window.clearInterval(interval);
  }, [undoQueue.length]);

  const login = async () => {
    const data = await apiRequest("/api/auth/login", "POST", loginForm);
    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminRole", data.role || "");
    window.dispatchEvent(new Event("admin-auth-changed"));
    setToken(data.token);
    setAdminRole(data.role || "");
    onAdminAuthChange();
    setMessage("Login successful.");
  };

  const createProduct = async () => {
    await apiRequest(
      "/api/admin/products",
      "POST",
      {
        ...productForm,
        price: productForm.price === "" ? null : Number(productForm.price),
        active: true
      },
      token
    );
    setProductForm({
      name: "",
      brand: "",
      mainColor: "",
      department: "UNISEX",
      category: "FOOTWEAR",
      productType: "LIFESTYLE_SNEAKERS",
      imageUrl: "",
      price: "",
      colorwayImages: {},
      description: ""
    });
    setIsCreateDescriptionEdited(false);
    setSuccessModal({ isOpen: true, message: "Product created." });
    await loadAdminData(token, adminRole);
  };

  const uploadProductImage = async (fileOverride) => {
    const fileToUpload = fileOverride || productImageFile;
    if (!fileToUpload) {
      throw new Error("Please choose an image file first.");
    }
    setIsCreateImageUploading(true);
    try {
      const data = await uploadImage("/api/admin/media/product-image", fileToUpload, token);
      const targetColorway = createImageTargetColorway;
      setProductForm((prev) => ({
        ...prev,
        colorwayImages: { ...(prev.colorwayImages || {}), [targetColorway]: data.url }
      }));
      setSuccessModal({ isOpen: true, message: `Product image uploaded for ${formatColorwayLabel(targetColorway)}. Save Product to apply it.` });
    } finally {
      setIsCreateImageUploading(false);
    }
  };


  const uploadEditProductImage = async (fileOverride) => {
    const fileToUpload = fileOverride || editProductImageFile;
    if (!fileToUpload) {
      throw new Error("Please choose an image file first.");
    }
    if (!editProductId) {
      throw new Error("Please choose a product first.");
    }
    setIsEditImageUploading(true);
    try {
      const data = await uploadImage("/api/admin/media/product-image", fileToUpload, token);
      const targetColorway = normalizeColorwayValue(editImageColorway || editProductForm.mainColor);
      await apiRequest(
        `/api/admin/products/${editProductId}/colorway-image`,
        "PUT",
        { colorway: targetColorway, imageUrl: data.url },
        token
      );
      setEditProductForm((prev) => ({
        ...prev,
        colorwayImages: { ...(prev.colorwayImages || {}), [targetColorway]: data.url }
      }));
      setSuccessModal({ isOpen: true, message: `Image updated for ${formatColorwayLabel(targetColorway)}.` });
      await loadAdminData(token, adminRole);
    } finally {
      setIsEditImageUploading(false);
    }
  };

  const handleCreateProductImageChange = async (event) => {
    const file = event.target.files?.[0] || null;
    setProductImageFile(file);
    if (!file) {
      return;
    }
    try {
      await uploadProductImage(file);
    } catch (err) {
      setMessage(err.message);
    } finally {
      event.target.value = "";
    }
  };

  const handleEditProductImageChange = async (event) => {
    const file = event.target.files?.[0] || null;
    setEditProductImageFile(file);
    if (!file) {
      return;
    }
    try {
      await uploadEditProductImage(file);
    } catch (err) {
      setMessage(err.message);
    } finally {
      event.target.value = "";
    }
  };

  const updateProduct = async () => {
    if (!editProductId) {
      throw new Error("Please choose a product to update.");
    }
    const selectedProduct = products.find((product) => String(product.id) === String(editProductId));
    if (!selectedProduct) {
      throw new Error("Selected product could not be found.");
    }
    const targetColorway = getAdminScopedColorway(selectedProduct, editDetailColorway);
    await apiRequest(
      `/api/admin/products/${editProductId}`,
      "PUT",
      {
        name: editProductForm.name,
        brand: editProductForm.brand,
        description: selectedProduct.description || "",
        mainColor: editProductForm.mainColor,
        department: selectedProduct.department || "UNISEX",
        category: selectedProduct.category || "FOOTWEAR",
        productType: selectedProduct.productType || "LIFESTYLE_SNEAKERS",
        imageUrl: editProductForm.imageUrl,
        price: editProductForm.price === "" ? null : Number(editProductForm.price),
        colorwayImages: editProductForm.colorwayImages || {},
        active: true
      },
      token
    );
    await apiRequest(
      `/api/admin/products/${editProductId}/colorway-details`,
      "PUT",
      {
        colorway: targetColorway,
        description: editProductForm.description,
        department: editProductForm.department,
        category: editProductForm.category,
        productType: editProductForm.productType,
        price: editProductForm.colorwayPrice === "" ? null : Number(editProductForm.colorwayPrice)
      },
      token
    );
    setSuccessModal({ isOpen: true, message: "Product updated." });
    await loadAdminData(token, adminRole);
  };

  const openDeleteProductColorwayModal = () => {
    if (!editProductId) {
      setMessage("Please choose a product first.");
      return;
    }
    const selectedProduct = products.find((product) => String(product.id) === String(editProductId));
    if (!selectedProduct) {
      setMessage("Selected product could not be found.");
      return;
    }

    const targetColorway = getAdminScopedColorway(selectedProduct, editDetailColorway);
    setColorwayDeleteModal({
      isOpen: true,
      productId: String(editProductId),
      colorway: targetColorway
    });
  };

  const closeColorwayDeleteModal = () => {
    setColorwayDeleteModal({ isOpen: false, productId: null, colorway: "" });
  };

  const confirmDeleteProductColorway = async () => {
    if (!colorwayDeleteModal.productId || !colorwayDeleteModal.colorway) {
      return;
    }

    const colorwayLabel = formatColorwayLabel(colorwayDeleteModal.colorway);
    await apiRequest(
      `/api/admin/products/${colorwayDeleteModal.productId}/colorways/${encodeURIComponent(colorwayDeleteModal.colorway)}`,
      "DELETE",
      undefined,
      token
    );
    closeColorwayDeleteModal();
    setSuccessModal({ isOpen: true, message: `Colorway "${colorwayLabel}" deleted.` });
    await loadAdminData(token, adminRole);
  };

  useEffect(() => {
    const options = getProductTypeOptions(productForm.category);
    if (!options.includes(productForm.productType)) {
      setProductForm((prev) => ({ ...prev, productType: options[0] || "" }));
    }
  }, [productForm.category, productForm.productType]);

  useEffect(() => {
    if (isCreateDescriptionEdited && productForm.description.trim()) {
      return;
    }
    if (productForm.description !== generatedCreateDescription) {
      setProductForm((prev) => ({ ...prev, description: generatedCreateDescription }));
    }
  }, [generatedCreateDescription, isCreateDescriptionEdited, productForm.description]);

  useEffect(() => {
    const selected = products.find((product) => String(product.id) === String(editProductId));
    if (selected) {
      const scopedColorway = getAdminScopedColorway(selected, editDetailColorway);
      if (scopedColorway !== editDetailColorway) {
        setEditDetailColorway(scopedColorway);
        return;
      }
      setEditProductForm(mapProductToForm(selected, scopedColorway));
      return;
    }
    if (!editProductId && products.length > 0) {
      setEditProductId(String(products[0].id));
      const scopedColorway = getAdminScopedColorway(products[0]);
      setEditDetailColorway(scopedColorway);
      setEditProductForm(mapProductToForm(products[0], scopedColorway));
    }
  }, [products, editProductId, editDetailColorway]);

  useEffect(() => {
    const options = getProductTypeOptions(editProductForm.category);
    if (!options.includes(editProductForm.productType)) {
      setEditProductForm((prev) => ({ ...prev, productType: options[0] || "" }));
    }
  }, [editProductForm.category, editProductForm.productType]);

  useEffect(() => {
    if (!editImageColorwayOptions.includes(editImageColorway)) {
      setEditImageColorway(editImageColorwayOptions[0] || "DEFAULT");
    }
  }, [editImageColorwayOptions, editImageColorway]);

  useEffect(() => {
    if (!editDetailColorwayOptions.includes(editDetailColorway)) {
      setEditDetailColorway(editDetailColorwayOptions[0] || "DEFAULT");
    }
  }, [editDetailColorwayOptions, editDetailColorway]);

  // Keep image preview target in sync with the selected details colorway.
  useEffect(() => {
    if (editImageColorway !== editDetailColorway) {
      setEditImageColorway(editDetailColorway);
    }
  }, [editDetailColorway, editImageColorway]);


  const runStockSummaryQuickAction = async (row, action, options = {}) => {
    if (!row) {
      return;
    }
    const draft = options.values || {};
    const quantity = Number(draft.quantityChange) || 1;
    const supplier = String(draft.supplier || "").trim();
    const referenceSupplier = String(draft.referenceSupplier || "").trim();
    const priceRaw = String(draft.price ?? "").trim();
    const markupRaw = String(draft.markup ?? "").trim();

    let quantityChange = 0;
    let price = null;
    let markup = null;

    if (action === "add" || action === "remove") {
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Quantity must be at least 1.");
      }
      if (action === "add" && !supplier) {
        throw new Error("Supplier is required before adding stock.");
      }
      quantityChange = action === "remove" ? -quantity : quantity;
    }

    if (action === "price") {
      const parsedPrice = Number(priceRaw);
      const parsedMarkup = Number(markupRaw);
      const hasPrice = priceRaw.length > 0;
      const hasMarkup = markupRaw.length > 0;
      if (!hasPrice && !hasMarkup) {
        throw new Error("Enter supplier price and/or markup (0 or higher).");
      }
      if (hasPrice && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
        throw new Error("Enter a valid supplier price (0 or higher).");
      }
      if (hasMarkup && (!Number.isFinite(parsedMarkup) || parsedMarkup < 0)) {
        throw new Error("Enter a valid markup (0 or higher).");
      }
      price = hasPrice ? Number(parsedPrice.toFixed(2)) : null;
      markup = hasMarkup ? Number(parsedMarkup.toFixed(2)) : Number(CUSTOMER_MARKUP.toFixed(2));
    }

    if (action === "supplier" && !supplier) {
      throw new Error("Enter supplier/origin first.");
    }

    try {
      const updatedProduct = await apiRequest(
        `/api/admin/products/${stockForm.productId}/stocks`,
        "POST",
        {
          colorway: stockForm.colorway,
          size: row.baseSize,
          sizeGroup: getStockStorageGroup(stockModalDepartment, activeStockSizeGroup),
          quantityChange,
          price,
            markup,
            referenceSupplier: action === "remove" || action === "supplier" || action === "price"
              ? (referenceSupplier || null)
              : null,
            supplier: action === "add" || action === "supplier" || action === "price"
              ? (supplier || null)
              : null
        },
        token
      );
      mergeUpdatedProduct(updatedProduct);
      if (!options.skipReload) {
        if (action === "price") {
          setSuccessModal({ isOpen: true, message: `US ${row.displaySize} supplier price/markup updated.` });
        } else if (action === "supplier") {
          setSuccessModal({ isOpen: true, message: `US ${row.displaySize} supplier updated.` });
        } else {
          setSuccessModal({ isOpen: true, message: action === "remove" ? `US ${row.displaySize} stock removed.` : `US ${row.displaySize} stock added.` });
        }
        await loadAdminData(token, adminRole);
      }
    } finally {
    }
  };

  const createAdminUser = async () => {
    if (!isSuperAdmin) {
      throw new Error("Only SUPER_ADMIN can add new admins.");
    }
    const payload = {
      username: newAdminForm.username.trim(),
      password: newAdminForm.password,
      role: newAdminForm.role
    };
    if (!payload.username || !payload.password) {
      throw new Error("Username and password are required.");
    }
    await apiRequest("/api/admin/users/admins", "POST", payload, token);
    setNewAdminModal({ isOpen: false });
    setNewAdminForm({ username: "", password: "", role: "ADMIN" });
    setSuccessModal({ isOpen: true, message: "New admin user added." });
    await loadAdminData(token, adminRole);
  };

  const setAdminUserStatus = async (userId, enabled) => {
    if (!isSuperAdmin) {
      throw new Error("Only SUPER_ADMIN can update admin users.");
    }
    const action = enabled ? "enable" : "disable";
    await apiRequest(`/api/admin/users/admins/${userId}/${action}`, "PATCH", undefined, token);
    setSuccessModal({ isOpen: true, message: `Admin user ${enabled ? "enabled" : "disabled"}.` });
    await loadAdminData(token, adminRole);
  };

  const updateReservationStatus = async (orderId, payload, successMessage, savedField) => {
    setUpdatingOrderId(orderId);
    try {
      const updated = await apiRequest(`/api/admin/orders/${orderId}/status`, "PATCH", payload, token);
      setOrders((prev) => prev.map((order) => {
        if (order.id !== orderId) {
          return order;
        }
        const next = { ...order, ...updated };
        if (Object.prototype.hasOwnProperty.call(payload, "totalPrice")) {
          next.totalPrice = payload.totalPrice;
        }
        if (Object.prototype.hasOwnProperty.call(payload, "downpayment")) {
          next.downpayment = payload.downpayment;
        }
        if (Object.prototype.hasOwnProperty.call(payload, "balance")) {
          next.balance = payload.balance;
        }
        return next;
      }));
      markReservationSaved(orderId, savedField);
      if (successMessage) {
        setSuccessModal({ isOpen: true, message: successMessage });
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const saveReservationPrice = (orderId, draftValue) => {
    const trimmed = String(draftValue ?? "").trim();
    if (!trimmed) {
      setMessage("Enter a price first.");
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setMessage("Price must be 0 or higher.");
      return;
    }
    updateReservationStatus(
      orderId,
      { totalPrice: Number(parsed.toFixed(2)) },
      `Reservation #${orderId} price updated to ${formatPriceLabel(parsed)}.`,
      "price"
    ).then(() => {
      setPriceDrafts((prev) => ({ ...prev, [orderId]: parsed.toFixed(2) }));
      setReservationEditorOpen(orderId, "price", false);
    }).catch((err) => setMessage(err.message));
  };

  const saveReservationMonetary = (orderId, field, draftValue, label, setDrafts) => {
    const trimmed = String(draftValue ?? "").trim();
    if (!trimmed) {
      setMessage(`Enter ${label.toLowerCase()} first.`);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setMessage(`${label} must be 0 or higher.`);
      return;
    }
    updateReservationStatus(
      orderId,
      { [field]: Number(parsed.toFixed(2)) },
      `Reservation #${orderId} ${label.toLowerCase()} updated to ${formatPriceLabel(parsed)}.`,
      field
    ).then(() => {
      setDrafts((prev) => ({ ...prev, [orderId]: parsed.toFixed(2) }));
      setReservationEditorOpen(orderId, field, false);
    }).catch((err) => setMessage(err.message));
  };

  const openReservationDeleteModal = (order) => {
    if (!isSuperAdmin) {
      setMessage("Only SUPER_ADMIN can delete reservations.");
      return;
    }
    setReservationDeleteModal({
      isOpen: true,
      orderId: order.id,
      customerName: order.customerName || "",
      itemCount: Array.isArray(order.items) ? order.items.length : 0
    });
  };

  const closeReservationDeleteModal = () => {
    setReservationDeleteModal({ isOpen: false, orderId: null, customerName: "", itemCount: 0 });
  };

  const openManualReservationModal = () => {
    setManualReservationForm(createManualReservationForm());
    setManualReservationModal({ isOpen: true });
  };

  const closeManualReservationModal = () => {
    if (isCreatingReservation) {
      return;
    }
    setManualReservationModal({ isOpen: false });
    setManualReservationForm(createManualReservationForm());
  };

  const createManualReservation = async (payload) => {
    setIsCreatingReservation(true);
    try {
      const createdOrder = await apiRequest("/api/admin/orders", "POST", payload, token);
      setManualReservationModal({ isOpen: false });
      setManualReservationForm(createManualReservationForm());
      setSuccessModal({
        isOpen: true,
        message: `Reservation${createdOrder?.id ? ` #${createdOrder.id}` : ""} added successfully.`
      });
      await loadAdminData(token, adminRole);
    } finally {
      setIsCreatingReservation(false);
    }
  };

  const confirmDeleteReservation = async () => {
    if (!isSuperAdmin || !reservationDeleteModal.orderId) {
      return;
    }
    const orderId = reservationDeleteModal.orderId;
    setUpdatingOrderId(orderId);
    try {
      await apiRequest(`/api/admin/orders/${orderId}`, "DELETE", undefined, token);
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      clearReservationStateForOrder(orderId);
      setSuccessModal({ isOpen: true, message: `Reservation #${orderId} deleted and stock restored.` });
      closeReservationDeleteModal();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };


  const openCreateModal = () => {
    setProductImageFile(null);
    setIsCreateImageUploading(false);
    setProductForm({
      name: "",
      brand: "",
      mainColor: "",
      department: "UNISEX",
      category: "FOOTWEAR",
      productType: "LIFESTYLE_SNEAKERS",
      imageUrl: "",
      price: "",
      colorwayImages: {},
      description: ""
    });
    setIsCreateDescriptionEdited(false);
    setProductActionModal({ type: "create", productId: "" });
  };

  const openEditModal = (productId, selectedColorway) => {
    const selected = products.find((item) => String(item.id) === String(productId));
    if (!selected) {
      return;
    }
    const scopedColorway = getAdminScopedColorway(selected, selectedColorway);
    setEditProductImageFile(null);
    setIsEditImageUploading(false);
    setEditProductId(String(productId));
    setEditDetailColorway(scopedColorway);
    setEditProductForm(mapProductToForm(selected, scopedColorway));
    setEditImageColorway(scopedColorway);
    setProductActionModal({ type: "edit", productId: String(productId) });
  };

  const openStockModal = (productId, selectedColorway) => {
    const selectedProduct = products.find((item) => String(item.id) === String(productId));
    const nextColorway = selectedColorway || stockForm.colorway;
    const nextDepartment = getDepartmentForColorway(selectedProduct, nextColorway);
    const preferredSelection = getPreferredStockSelection(
      selectedProduct,
      nextColorway,
      String(stockForm.productId) === String(productId) ? stockForm.size : null,
      String(stockForm.productId) === String(productId) ? stockForm.sizeGroup : null
    );
    // Use preferred price, fallback to product base price, then empty
    let priceValue = "";
    if (preferredSelection.price !== null && preferredSelection.price !== undefined) {
      priceValue = String(preferredSelection.price);
    } else if (selectedProduct?.price) {
      priceValue = String(selectedProduct.price);
    }
    setStockForm((prev) => ({
      ...prev,
      productId: String(productId),
      colorway: nextColorway,
      size: preferredSelection.size,
      sizeGroup: preferredSelection.sizeGroup || getDefaultSizeGroup(nextDepartment),
      actionType: prev.actionType || "ADD",
      quantityChange: 1,
      price: priceValue,
      supplier: preferredSelection.supplier || ""
    }));
    const shouldAutoOpenGuide = !hasStockGuideOnboardingShown && Boolean(getBrandSizeGuide(selectedProduct?.brand));
    setStockGuideModalOpen(shouldAutoOpenGuide);
    if (shouldAutoOpenGuide) {
      setHasStockGuideOnboardingShown(true);
      localStorage.setItem("adminStockGuideOnboardingShown", "1");
    }
    closeStockSummaryModal();
    setStockSummaryQuickFilters({ lowStockOnly: false, noSupplierOnly: false });
    setStockSummaryBulkAction({
      ...DEFAULT_STOCK_SUMMARY_BULK_ACTION,
      supplier: preferredSelection.supplier || "",
      price: priceValue
    });
    setProductActionModal({ type: "stock", productId: String(productId) });
  };

  const closeStockSummaryView = () => {
    closeStockSummaryModal();
    setStockSummarySelectedRows(new Set());
    setStockSummarySupplierSelections({});
    setStockSummaryBulkAction({ ...DEFAULT_STOCK_SUMMARY_BULK_ACTION });
    setStockSummaryResetModal({ ...DEFAULT_STOCK_SUMMARY_RESET_MODAL });
    setProductActionModal({ type: null, productId: "" });
  };

  const handleStockSummaryColorwayChange = (nextColorway) => {
    setStockForm((prev) => ({ ...prev, colorway: nextColorway }));
    setStockSummarySelectedRows(new Set());
    setStockSummarySupplierSelections({});
  };

  const handleStockSummaryBulkFieldChange = (field, value) => {
    setStockSummaryBulkAction((prev) => ({ ...prev, [field]: value }));
  };

  const decrementStockSummaryQuantity = () => {
    setStockSummaryBulkAction((prev) => {
      const current = prev.quantityChange ? Number(prev.quantityChange) : 1;
      return { ...prev, quantityChange: String(Math.max(1, current - 1)) };
    });
  };

  const incrementStockSummaryQuantity = () => {
    setStockSummaryBulkAction((prev) => {
      const current = prev.quantityChange ? Number(prev.quantityChange) : 0;
      return { ...prev, quantityChange: String(current + 1) };
    });
  };

  const clearStockSummaryBulkAction = () => {
    setStockSummaryBulkAction({ ...DEFAULT_STOCK_SUMMARY_BULK_ACTION });
  };

  const handleStockSummarySortChange = (column) => {
    if (stockSummarySortColumn === column) {
      setStockSummarySortAsc((prev) => !prev);
      return;
    }
    setStockSummarySortColumn(column);
    setStockSummarySortAsc(column === "size" || column === "supplier");
  };

  const handleStockSummarySelectAllToggle = (checked) => {
    if (checked) {
      setStockSummarySelectedRows(new Set(sortedStockSummaryRows.map((row) => `${activeStockSizeGroup}-${row.baseSize}`)));
      return;
    }
    setStockSummarySelectedRows(new Set());
  };

  const handleStockSummaryRowToggle = (rowKey, checked) => {
    setStockSummarySelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(rowKey);
      } else {
        next.delete(rowKey);
      }
      return next;
    });
  };

  const handleStockSummarySupplierSelectionChange = (rowKey, supplier) => {
    setStockSummarySupplierSelections((prev) => ({ ...prev, [rowKey]: supplier }));
  };

  const applyStockSummaryBulkChanges = async () => {
    if (stockSummarySelectedRows.size === 0) return;

    const normalizedSupplier = String(stockSummaryBulkAction.supplier || "").trim();
    const priceRaw = String(stockSummaryBulkAction.price ?? "").trim();
    const markupRaw = String(stockSummaryBulkAction.markup ?? "").trim();
    const quantityValue = Number(stockSummaryBulkAction.quantityChange);
    const useQuantity = Number.isInteger(quantityValue) && quantityValue > 0;
    const useSupplier = Boolean(normalizedSupplier);
    const usePrice = priceRaw.length > 0;
    const useMarkup = markupRaw.length > 0;

    if (!useQuantity && !useSupplier && !usePrice && !useMarkup) {
      setMessage("Fill in at least one field before applying changes.");
      return;
    }

    if (usePrice && (!Number.isFinite(Number(priceRaw)) || Number(priceRaw) < 0)) {
      setMessage("Enter a valid supplier price (0 or higher).");
      return;
    }

    if (useMarkup && (!Number.isFinite(Number(markupRaw)) || Number(markupRaw) < 0)) {
      setMessage("Enter a valid markup (0 or higher).");
      return;
    }

    const isAdd = stockSummaryBulkAction.quantityMode !== "REMOVE";

    setStockSummaryBulkAction((prev) => ({ ...prev, applying: true }));
    try {
      let successCount = 0;
      const skippedQuantityRows = [];
      const failedRows = [];
      const rowsToUpdate = Array.from(stockSummarySelectedRows).map((rowKey) => {
        const [, baseSize] = rowKey.split("-");
        return sortedStockSummaryRows.find((candidate) => candidate.baseSize === baseSize) || null;
      }).filter(Boolean);

      for (const row of rowsToUpdate) {
        if (!row) continue;

        const rowKey = `${activeStockSizeGroup}-${row.baseSize}`;
        const selectedSupplier = String(
          stockSummarySupplierSelections[rowKey]
          ?? row.supplierEntries?.[0]?.supplier
          ?? row.supplier
          ?? ""
        ).trim();
        const rowSupplier = selectedSupplier || String(row.supplier || "").trim();
        const effectiveSupplier = normalizedSupplier || rowSupplier;
        let rowUpdated = false;

        try {
          const requestValues = {
            quantityChange: useQuantity ? quantityValue : "",
            supplier: effectiveSupplier,
            referenceSupplier: normalizedSupplier || rowSupplier || "",
            price: usePrice ? priceRaw : row.price ?? "",
            markup: useMarkup ? markupRaw : ""
          };

          if (useQuantity) {
            if (isAdd && !effectiveSupplier) {
              skippedQuantityRows.push(`US ${row.displaySize}`);
            } else {
              await runStockSummaryQuickAction(row, isAdd ? "add" : "remove", { skipReload: true, values: requestValues });
              rowUpdated = true;
            }
          }
          if (useSupplier) {
            await runStockSummaryQuickAction(row, "supplier", { skipReload: true, values: requestValues });
            rowUpdated = true;
          }
          if (usePrice || useMarkup) {
            await runStockSummaryQuickAction(row, "price", { skipReload: true, values: requestValues });
            rowUpdated = true;
          }
          if (rowUpdated) {
            successCount++;
          }
        } catch (err) {
          console.error(`Error updating size ${row.displaySize}:`, err);
          failedRows.push(`US ${row.displaySize}`);
        }
      }

      if (successCount > 0) {
        await loadAdminData(token, adminRole);
      }

      const summarizeSizes = (sizes) => {
        if (sizes.length <= 3) {
          return sizes.join(", ");
        }
        return `${sizes.slice(0, 3).join(", ")} +${sizes.length - 3} more`;
      };

      if (successCount === 0) {
        if (skippedQuantityRows.length > 0 && !useSupplier && !usePrice) {
          setMessage(`No stock was added. Missing supplier for ${summarizeSizes(skippedQuantityRows)}.`);
          return;
        }
        if (failedRows.length > 0) {
          setMessage(`No changes were applied. Failed sizes: ${summarizeSizes(failedRows)}.`);
          return;
        }
        setMessage("No changes were applied.");
        return;
      }

      const messageParts = [`Applied changes for ${successCount}/${stockSummarySelectedRows.size} sizes.`];

      if (skippedQuantityRows.length > 0) {
        messageParts.push(`Skipped quantity add for ${skippedQuantityRows.length} size(s) with no supplier: ${summarizeSizes(skippedQuantityRows)}.`);
      }
      if (failedRows.length > 0) {
        messageParts.push(`Failed to update ${failedRows.length} size(s): ${summarizeSizes(failedRows)}.`);
      }

      setMessage(messageParts.join(" "));
      setStockSummaryBulkAction((prev) => ({
        ...DEFAULT_STOCK_SUMMARY_BULK_ACTION,
        quantityMode: prev.quantityMode,
        applying: prev.applying
      }));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setStockSummaryBulkAction((prev) => ({ ...prev, applying: false }));
    }
  };

  const closeStockSummaryResetModal = () => {
    if (stockSummaryBulkAction.applying) return;
    setStockSummaryResetModal({ ...DEFAULT_STOCK_SUMMARY_RESET_MODAL });
  };

  const openStockSummaryResetModal = () => {
    if (stockSummarySelectedRows.size === 0) {
      setMessage("Please select at least one size to reset.");
      return;
    }
    setStockSummaryResetModal({
      isOpen: true,
      count: stockSummarySelectedRows.size,
      colorway: stockForm.colorway,
      productName: stockModalProduct?.name || ""
    });
  };

  const confirmStockSummaryReset = async () => {
    setStockSummaryBulkAction((prev) => ({ ...prev, applying: true }));
    try {
      let successCount = 0;
      const rowsToDelete = Array.from(stockSummarySelectedRows);

      for (const rowKey of rowsToDelete) {
        const [, baseSize] = rowKey.split("-");
        const row = sortedStockSummaryRows.find((r) => r.baseSize === baseSize);
        if (!row) continue;

        try {
          await apiRequest(
            `/api/admin/products/${stockForm.productId}/stocks`,
            "POST",
            {
              colorway: stockForm.colorway,
              size: row.baseSize,
              sizeGroup: getStockStorageGroup(stockModalDepartment, activeStockSizeGroup),
              quantityChange: 0,
              price: null,
              referenceSupplier: null,
              supplier: null,
              clearPrice: true,
              clearSupplier: true,
              forceResetAll: true
            },
            token
          );
          successCount++;
        } catch (err) {
          console.error(`Error resetting size ${row.displaySize}:`, err);
        }
      }

      await loadAdminData(token, adminRole);

      setMessage(`Reset stock data for ${successCount}/${stockSummarySelectedRows.size} sizes.`);
      setStockSummarySelectedRows(new Set());
      setStockSummaryResetModal({ ...DEFAULT_STOCK_SUMMARY_RESET_MODAL });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setStockSummaryBulkAction((prev) => ({ ...prev, applying: false }));
    }
  };

  const filteredAdminProducts = useMemo(() => {
    const productKeyword = tableFilters.product.trim().toLowerCase();
    return products.filter((product) => {
      if (productKeyword && !(product.name || "").toLowerCase().includes(productKeyword)) {
        return false;
      }
      return tableFilters.brand === "ALL" || (product.brand || "") === tableFilters.brand;
    });
  }, [products, tableFilters]);

  const stockModalProduct = useMemo(
    () => products.find((item) => String(item.id) === String(productActionModal.productId)),
    [products, productActionModal.productId]
  );
  const stockModalDepartment = useMemo(
    () => getDepartmentForColorway(stockModalProduct, stockForm.colorway),
    [stockModalProduct, stockForm.colorway]
  );
  const stockSizeSections = useMemo(
    () => buildSizeSections(stockModalProduct, stockForm.colorway),
    [stockModalProduct, stockForm.colorway]
  );
  const stockSizeGuide = useMemo(
    () => getBrandSizeGuide(stockModalProduct?.brand),
    [stockModalProduct?.brand]
  );
  const activeStockSizeGroup = isUnisexDepartment(stockModalDepartment)
    ? (stockForm.sizeGroup === "WOMEN" ? "WOMEN" : "MEN")
    : getDefaultSizeGroup(stockModalDepartment);
  const activeStockSizeSection = useMemo(
    () => stockSizeSections.find((section) => section.key === activeStockSizeGroup) || stockSizeSections[0] || null,
    [stockSizeSections, activeStockSizeGroup]
  );
  const selectedStockRow = useMemo(
    () => activeStockSizeSection?.rows?.find((row) => row.baseSize === stockForm.size) || null,
    [activeStockSizeSection, stockForm.size]
  );
  useEffect(() => {
    if (productActionModal.type !== "stock") {
      return;
    }
    const nextPrice = selectedStockRow?.price;
    setStockForm((prev) => {
      const normalized = nextPrice === null || nextPrice === undefined ? "" : String(nextPrice);
      return prev.price === normalized ? prev : { ...prev, price: normalized };
    });
  }, [productActionModal.type, selectedStockRow?.price, stockForm.size, stockForm.colorway, activeStockSizeGroup]);
  useEffect(() => {
    if (productActionModal.type !== "stock") {
      return;
    }
    const nextSupplier = String(selectedStockRow?.supplier || "");
    setStockForm((prev) => (prev.supplier === nextSupplier ? prev : { ...prev, supplier: nextSupplier }));
   }, [productActionModal.type, selectedStockRow?.supplier, stockForm.size, stockForm.colorway, activeStockSizeGroup]);

   // Auto-open stock summary when stock modal opens
   useEffect(() => {
     if (productActionModal.type === "stock") {
       const timer = setTimeout(() => {
         openStockSummaryModal();
       }, 100);
       return () => clearTimeout(timer);
     }
   }, [productActionModal.type]);

   const stockGuideSection = useMemo(
    () => getGuideSectionForContext(stockSizeGuide, { sizeGroup: activeStockSizeGroup, department: stockModalDepartment }),
    [stockSizeGuide, activeStockSizeGroup, stockModalDepartment]
  );
  const activeStockRows = useMemo(() => {
    if (!activeStockSizeSection?.rows) return [];
    return activeStockSizeSection.rows;
  }, [activeStockSizeSection]);
  const stockSummarySupplierSuggestions = useMemo(() => {
    const uniqueByLower = new Map();
    products.forEach((product) => {
      (product?.stocks || []).forEach((stock) => {
        const supplier = String(stock?.supplier || "").trim();
        if (!supplier) return;
        const key = supplier.toLowerCase();
        if (!uniqueByLower.has(key)) {
          uniqueByLower.set(key, supplier);
        }
      });
    });
    return Array.from(uniqueByLower.values()).sort((a, b) => a.localeCompare(b));
  }, [products]);

  useEffect(() => {
    if (!isStockSummaryOpen || productActionModal.type !== "stock") {
      return;
    }
    setStockSummarySupplierSelections((prev) => {
      const next = {};
      activeStockRows.forEach((row) => {
        const rowKey = `${activeStockSizeGroup}-${row.baseSize}`;
        const options = (row.supplierEntries || []).map((entry) => String(entry.supplier || ""));
        const previousValue = prev[rowKey];
        next[rowKey] = options.includes(previousValue)
          ? previousValue
          : (options[0] || "");
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[key] === next[key])) {
        return prev;
      }
      return next;
    });
  }, [activeStockRows, activeStockSizeGroup, isStockSummaryOpen, productActionModal.type]);
  const filteredStockSummaryRows = useMemo(
    () => filterStockSummaryRows(activeStockRows, stockSummaryQuickFilters),
    [activeStockRows, stockSummaryQuickFilters]
  );

  const sortedStockSummaryRows = useMemo(
    () => sortStockSummaryRows(filteredStockSummaryRows, stockSummarySortColumn, stockSummarySortAsc),
    [filteredStockSummaryRows, stockSummarySortColumn, stockSummarySortAsc]
  );

  const stockSummaryVisibleTotals = useMemo(
    () => aggregateStockSummaryTotals(filteredStockSummaryRows),
    [filteredStockSummaryRows]
  );

  const handleStockSizeGroupChange = (nextSizeGroup) => {
    const targetSection = stockSizeSections.find((section) => section.key === nextSizeGroup);
    const hasCurrentSize = targetSection?.rows?.some((row) => row.baseSize === stockForm.size);
    const fallbackSize = targetSection?.rows?.[0]?.baseSize || stockForm.size;
    setStockForm((prev) => ({
      ...prev,
      sizeGroup: nextSizeGroup,
      size: hasCurrentSize ? prev.size : fallbackSize
    }));
  };

  useEffect(() => {
    if (!stockModalProduct || stockSizeSections.length === 0) {
      return;
    }

    const availableRows = activeStockRows;
    const hasCurrentSize = availableRows.some((row) => row.baseSize === stockForm.size);
    const fallbackSize = availableRows[0]?.baseSize || US_SIZES[0];
    const nextSize = hasCurrentSize ? stockForm.size : fallbackSize;
    const nextSizeGroup = isUnisexDepartment(stockModalDepartment)
      ? (stockForm.sizeGroup === "WOMEN" ? "WOMEN" : "MEN")
      : getDefaultSizeGroup(stockModalDepartment);

    if (nextSize !== stockForm.size || nextSizeGroup !== stockForm.sizeGroup) {
      setStockForm((prev) => ({
        ...prev,
        size: nextSize,
        sizeGroup: nextSizeGroup
      }));
    }
  }, [stockModalProduct, stockSizeSections, stockModalDepartment, stockForm.size, stockForm.sizeGroup, activeStockSizeGroup, activeStockRows]);

  const adminTotalPages = useMemo(
    () => Math.ceil(filteredAdminProducts.length / ADMIN_PAGE_SIZE),
    [filteredAdminProducts.length]
  );
  const adminPaginatedProducts = useMemo(() => {
    const start = (adminPage - 1) * ADMIN_PAGE_SIZE;
    return filteredAdminProducts.slice(start, start + ADMIN_PAGE_SIZE);
  }, [filteredAdminProducts, adminPage]);
  const adminPaginationItems = useMemo(() => {
    if (adminTotalPages <= 5) {
      return Array.from({ length: adminTotalPages }, (_, index) => ({ type: "page", value: index + 1 }));
    }
    const items = [{ type: "page", value: 1 }];
    const start = Math.max(2, Math.min(adminPage - 1, adminTotalPages - 3));
    const end = Math.min(adminTotalPages - 1, Math.max(adminPage + 1, 4));
    if (start > 2) {
      items.push({ type: "ellipsis", value: "left" });
    }
    for (let page = start; page <= end; page += 1) {
      items.push({ type: "page", value: page });
    }
    if (end < adminTotalPages - 1) {
      items.push({ type: "ellipsis", value: "right" });
    }
    items.push({ type: "page", value: adminTotalPages });
    return items;
  }, [adminPage, adminTotalPages]);

  const reservationStats = useMemo(
    () => buildReservationStats(orders, products),
    [orders, products]
  );

  const filteredReservations = useMemo(
    () => buildFilteredReservations(orders, reservationFilters),
    [orders, reservationFilters]
  );
  const reservationTableColumnCount = isSuperAdmin ? 13 : 12;

  const reservationMopTotals = useMemo(
    () => buildReservationMopTotals(filteredReservations),
    [filteredReservations]
  );

  const productById = useMemo(() => {
    const map = {};
    products.forEach((product) => {
      map[String(product.id)] = product;
    });
    return map;
  }, [products]);

  useEffect(() => {
    if (!isSuperAdmin && (activeAdminSection === "users" || activeAdminSection === "promotions")) {
      setActiveAdminSection("products");
    }
  }, [isSuperAdmin, activeAdminSection]);

  const productActionModalTitle =
    productActionModal.type === "create"
      ? "Add Product"
      : productActionModal.type === "edit"
        ? `Update Product${editProductForm.name ? ` - ${editProductForm.name}` : ""}${editImageColorway ? ` (${formatColorwayLabel(editImageColorway)})` : ""}`
        : productActionModal.type === "stock"
          ? `Manage Stock${stockModalProduct ? ` - ${(stockModalProduct.brand || "").trim()} ${(stockModalProduct.name || "").trim()}`.trim() : ""}${stockForm.colorway ? ` (${formatColorwayLabel(stockForm.colorway)})` : ""}`
          : "";

  if (!isLoggedIn) {
    return (
      <AdminLoginSection
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        onLogin={() => login().catch((err) => setMessage(err.message))}
        onBackToCustomer={() => navigate("/")}
        message={message}
      />
    );
  }

  const handleProductFilterChange = (field, value) => {
    setTableFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <main className="container container-wide">
      <AdminSectionTabs
        adminSections={adminSections}
        activeAdminSection={activeAdminSection}
        onSelectSection={setActiveAdminSection}
      />

      {activeAdminSection === "products" ? (
        <AdminProductsSection
          adminRole={adminRole}
          tableFilters={tableFilters}
          brandOptions={brandOptions}
          isLoading={isAdminLoading}
          paginatedProducts={adminPaginatedProducts}
          currentPage={adminPage}
          totalPages={adminTotalPages}
          paginationItems={adminPaginationItems}
          isSuperAdmin={isSuperAdmin}
          resolveSelectedColorway={getAdminScopedColorway}
          onProductFilterChange={handleProductFilterChange}
          onAddProduct={openCreateModal}
          onEditProduct={openEditModal}
          onManageStock={openStockModal}
          onDeleteProduct={deleteProduct}
          onPageChange={setAdminPage}
        />
      ) : null}

      {activeAdminSection === "reservations" ? (
        <section className="card products-card admin-section">
          <div className="section-head">
            <div className="admin-section-heading-copy">
              <h2>Reservations</h2>
              <p className="field-hint" style={{ margin: 0 }}>
                Review customer reservations and update fulfillment status.
              </p>
            </div>
            <button type="button" className="btn-primary" onClick={openManualReservationModal}>
              <PlusCircle size={16} />
              <span>Add Reservation</span>
            </button>
          </div>

          <ReservationDashboardCards
            reservationStats={reservationStats}
            reservationMopTotals={reservationMopTotals}
            formatPriceLabel={formatPriceLabel}
          />

          <ReservationFilters
            reservationFilters={reservationFilters}
            setReservationFilters={setReservationFilters}
          />

          <AdminReservationsTable
            isAdminLoading={isAdminLoading}
            reservationTableColumnCount={reservationTableColumnCount}
            filteredReservations={filteredReservations}
            isSuperAdmin={isSuperAdmin}
            updatingOrderId={updatingOrderId}
            productById={productById}
            mopOtherDrafts={mopOtherDrafts}
            setMopOtherDrafts={setMopOtherDrafts}
            priceDrafts={priceDrafts}
            setPriceDrafts={setPriceDrafts}
            downpaymentDrafts={downpaymentDrafts}
            setDownpaymentDrafts={setDownpaymentDrafts}
            balanceDrafts={balanceDrafts}
            setBalanceDrafts={setBalanceDrafts}
            isReservationEditorOpen={isReservationEditorOpen}
            setReservationEditorOpen={setReservationEditorOpen}
            isReservationSaved={isReservationSaved}
            updateReservationStatus={updateReservationStatus}
            saveReservationPrice={saveReservationPrice}
            saveReservationMonetary={saveReservationMonetary}
            openReservationDeleteModal={openReservationDeleteModal}
            onError={setMessage}
          />
        </section>
      ) : null}

      {isSuperAdmin && activeAdminSection === "promotions" ? (
        <PromotionsSection token={token} isSuperAdmin={isSuperAdmin} brandOptions={brandOptions} products={products} />
      ) : null}

      {isSuperAdmin && activeAdminSection === "users" ? (
        <AdminUsersSection
          adminUsers={adminUsers}
          onAddAdmin={() => {
            setNewAdminForm({ username: "", password: "", role: "ADMIN" });
            setNewAdminModal({ isOpen: true });
          }}
          onToggleUserStatus={setAdminUserStatus}
          onError={setMessage}
        />
      ) : null}

      <ProductActionModalShell
        isOpen={Boolean(productActionModal.type)}
        title={productActionModalTitle}
        onClose={() => setProductActionModal({ type: null, productId: "" })}
        message={message}
      >

            {productActionModal.type === "create" ? (
              <>
                <section className="edit-modal-section create-modal-section">
                  <h3>Identity</h3>
                  <p className="field-hint">Choose product name, brand, and main color.</p>
                  <div className="add-product-manage-row">
                    <select
                      value={productForm.name}
                      onChange={(e) => {
                        if (e.target.value === "@@ADD_NEW_NAME@@") {
                          setNewProductNameModal({ isOpen: true, productName: "" });
                        } else {
                          setProductForm({ ...productForm, name: e.target.value });
                        }
                      }}
                    >
                      <option value="">Select Name...</option>
                      {nameOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      <option value="@@ADD_NEW_NAME@@" style={{ fontWeight: "bold", background: "#e3f2fd" }}>
                        + Add New Name
                      </option>
                    </select>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => setNewProductNameModal({ isOpen: true, productName: "" })}
                    >
                      Manage Names
                    </button>
                  </div>
                  <div className="add-product-manage-row">
                    <select
                      value={productForm.brand}
                      onChange={(e) => {
                        if (e.target.value === "@@ADD_NEW@@") {
                          setNewBrandModal({ isOpen: true, brandName: "" });
                        } else {
                          setProductForm({ ...productForm, brand: e.target.value });
                        }
                      }}
                    >
                      <option value="">Select Brand...</option>
                      {brandOptions.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                      <option value="@@ADD_NEW@@" style={{ fontWeight: "bold", background: "#e3f2fd" }}>
                        + Add New Brand
                      </option>
                    </select>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => setNewBrandModal({ isOpen: true, brandName: "" })}
                    >
                      Manage Brands
                    </button>
                  </div>
                  <input
                    placeholder="Color (ex: Black/White)"
                    value={productForm.mainColor}
                    onChange={(e) => setProductForm({ ...productForm, mainColor: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Base Price (PHP)"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  />
                </section>

                <section className="edit-modal-section create-modal-section">
                  <h3>Classification</h3>
                  <p className="field-hint">Set department, category, and product type.</p>
                  <div className="row">
                    <select value={productForm.department} onChange={(e) => setProductForm({ ...productForm, department: e.target.value })}>
                      {DEPARTMENT_OPTIONS.map((department) => (
                        <option key={department} value={department}>
                          {formatEnumLabel(department)}
                        </option>
                      ))}
                    </select>
                    <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}>
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {formatEnumLabel(category)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row">
                    <select value={productForm.productType} onChange={(e) => setProductForm({ ...productForm, productType: e.target.value })}>
                      {getProductTypeOptions(productForm.category).map((productType) => (
                        <option key={productType} value={productType}>
                          {formatEnumLabel(productType)}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>
                <div className="row add-product-upload-row">
                  <div className="image-upload-stack">
                    <div className="image-upload-headline">
                      <strong>Product Image</strong>
                      <small>Attach an image to the selected colorway.</small>
                    </div>
                    <div className="image-upload-section">
                      <input
                        id="create-product-image-file"
                        className="sr-only-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        onChange={handleCreateProductImageChange}
                      />
                      <div className="product-image-upload-tile-wrap">
                        <label htmlFor="create-product-image-file" className="product-image-upload-tile" title="Click to upload product image">
                          {(productForm.colorwayImages?.[createImageTargetColorway] || productForm.imageUrl)
                            ? (
                              <img
                                className="product-image-upload-tile-img"
                                src={productForm.colorwayImages?.[createImageTargetColorway] || productForm.imageUrl}
                                alt="Product preview"
                              />
                              )
                            : (
                              <span className="product-image-upload-placeholder">
                                <ImagePlus size={20} />
                              </span>
                              )}
                          {isCreateImageUploading ? <span className="product-image-uploading">•••</span> : null}
                        </label>
                        <div className="product-image-upload-copy">
                          <small className="field-hint image-upload-name">
                            {productImageFile
                              ? `${productImageFile.name} · ${formatFileSize(productImageFile.size)} · ${getFileFormatLabel(productImageFile)}`
                              : "No file selected"}
                          </small>
                          <small className="field-hint image-upload-note">
                            {isCreateImageUploading ? "Uploading image..." : (productImageFile ? "Uploaded. Click the tile to replace." : "Click the tile to upload. Auto-upload starts immediately.")}
                          </small>
                        </div>
                      </div>
                      <small className="field-hint image-upload-note">Supported formats: JPG/PNG/WEBP/GIF/AVIF (max 5MB).</small>
                    </div>
                  </div>
                </div>
                <section className="edit-modal-section create-modal-section">
                  <h3>Description</h3>
                  <p className="field-hint">Use a clear customer-facing description. You can generate a default draft anytime.</p>
                  <input
                    placeholder="Description"
                    value={productForm.description}
                    onChange={(e) => {
                      setIsCreateDescriptionEdited(true);
                      setProductForm({ ...productForm, description: e.target.value });
                    }}
                  />
                  <div className="create-product-actions-row">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => {
                        setIsCreateDescriptionEdited(false);
                        setProductForm((prev) => ({ ...prev, description: buildDefaultProductDescription(prev) }));
                      }}
                    >
                      Use Default Description
                    </button>
                    <button
                      className="create-product-save-btn"
                      onClick={() =>
                        createProduct()
                          .then(() => setProductActionModal({ type: null, productId: "" }))
                          .catch((err) => setMessage(err.message))
                      }
                    >
                      Save Product
                    </button>
                  </div>
                </section>
              </>
            ) : null}

            {productActionModal.type === "edit" ? (
              <div className="edit-modal-shell">
                <div className="edit-modal-sticky-head">
                  <p className="field-hint" style={{ margin: 0 }}>
                    Editing: <strong>{editProductForm.brand || "-"}</strong> <strong>{editProductForm.name || "-"}</strong>
                  </p>
                  <p className="field-hint" style={{ margin: 0 }}>
                    Details target: <strong>{formatColorwayLabel(editDetailColorway)}</strong>
                    {" "}· Image target: <strong>{formatColorwayLabel(editImageColorway)}</strong>
                  </p>
                </div>

                <section className="edit-modal-section">
                  <h3>Basic Info (Shared)</h3>
                  <p className="field-hint">These fields apply to the whole product, across all colorways.</p>
                  <p className="field-hint">If only one colorway has incorrect info, edit it under Details by Colorway below so other variants are not affected.</p>
                  <input
                    placeholder="Name"
                    value={editProductForm.name}
                    onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Base Price (PHP)"
                    value={editProductForm.price}
                    onChange={(e) => setEditProductForm({ ...editProductForm, price: e.target.value })}
                  />
                  <div className="row">
                    <select
                      value={editProductForm.brand}
                      onChange={(e) => {
                        if (e.target.value === "@@ADD_NEW@@") {
                          setNewBrandModal({ isOpen: true, brandName: "" });
                        } else {
                          setEditProductForm({ ...editProductForm, brand: e.target.value });
                        }
                      }}
                    >
                      <option value="">Select Brand...</option>
                      {brandOptions.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                      <option value="@@ADD_NEW@@" style={{ fontWeight: "bold", background: "#e3f2fd" }}>
                        + Add New Brand
                      </option>
                    </select>
                  </div>
                </section>

                <section className="edit-modal-section">
                  <h3>Details by Colorway</h3>
                  <p className="field-hint">Department, category, type, description, and price save only for the selected colorway.</p>
                  <div className="row">
                    <select value={editDetailColorway} onChange={(e) => setEditDetailColorway(e.target.value)}>
                      {editDetailColorwayOptions.map((colorway) => (
                        <option key={`edit-details-${colorway}`} value={colorway}>
                          Details: {formatColorwayLabel(colorway)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Colorway Price (PHP)"
                    value={editProductForm.colorwayPrice}
                    onChange={(e) => setEditProductForm({ ...editProductForm, colorwayPrice: e.target.value })}
                  />
                  <div className="row">
                    <select value={editProductForm.department} onChange={(e) => setEditProductForm({ ...editProductForm, department: e.target.value })}>
                      {DEPARTMENT_OPTIONS.map((department) => (
                        <option key={department} value={department}>
                          {formatEnumLabel(department)}
                        </option>
                      ))}
                    </select>
                    <select value={editProductForm.category} onChange={(e) => setEditProductForm({ ...editProductForm, category: e.target.value })}>
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {formatEnumLabel(category)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row">
                    <select value={editProductForm.productType} onChange={(e) => setEditProductForm({ ...editProductForm, productType: e.target.value })}>
                      {getProductTypeOptions(editProductForm.category).map((productType) => (
                        <option key={productType} value={productType}>
                          {formatEnumLabel(productType)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    placeholder="Description"
                    value={editProductForm.description}
                    onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })}
                  />
                  <div className="row">
                    <button
                      type="button"
                      className="btn-delete-confirm"
                      onClick={openDeleteProductColorwayModal}
                      disabled={!editProductId || editDetailColorwayOptions.length === 0}
                    >
                      <Trash2 size={16} />
                      <span>Delete Selected Colorway</span>
                    </button>
                  </div>
                </section>

                <section className="edit-modal-section">
                  <h3>Image by Colorway</h3>
                  <p className="field-hint">Upload design now matches Add Product.</p>
                  <p className="field-hint">Target colorway: <strong>{formatColorwayLabel(editImageColorway)}</strong></p>
                  <div className="row add-product-upload-row">
                    <div className="image-upload-stack">
                      <div className="image-upload-headline">
                        <strong>Product Image</strong>
                        <small>Attach an image to the selected colorway.</small>
                      </div>
                      <div className="image-upload-section">
                        <input
                          id="edit-product-image-file"
                          className="sr-only-file-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                          onChange={handleEditProductImageChange}
                        />
                        <div className="product-image-upload-tile-wrap">
                          <label htmlFor="edit-product-image-file" className="product-image-upload-tile" title="Click to upload product image">
                            {(editProductForm.colorwayImages?.[normalizeColorwayValue(editImageColorway)] || editProductForm.imageUrl)
                              ? (
                                <img
                                  className="product-image-upload-tile-img"
                                  src={editProductForm.colorwayImages?.[normalizeColorwayValue(editImageColorway)] || editProductForm.imageUrl}
                                  alt="Edit product preview"
                                />
                                )
                              : (
                                <span className="product-image-upload-placeholder">
                                  <ImagePlus size={20} />
                                </span>
                                )}
                            {isEditImageUploading ? <span className="product-image-uploading">•••</span> : null}
                          </label>
                          <div className="product-image-upload-copy">
                            <small className="field-hint image-upload-name">
                              {editProductImageFile
                                ? `${editProductImageFile.name} · ${formatFileSize(editProductImageFile.size)} · ${getFileFormatLabel(editProductImageFile)}`
                                : "No file selected"}
                            </small>
                            <small className="field-hint image-upload-note">
                              {isEditImageUploading ? "Uploading image..." : (editProductImageFile ? "Uploaded. Click the tile to replace." : "Click the tile to upload. Auto-upload starts immediately.")}
                            </small>
                          </div>
                        </div>
                        <small className="field-hint image-upload-note">Supported formats: JPG/PNG/WEBP/GIF/AVIF (max 5MB).</small>
                      </div>
                    </div>
                  </div>
                </section>

                <button
                  onClick={() =>
                    updateProduct()
                      .then(() => setProductActionModal({ type: null, productId: "" }))
                      .catch((err) => setMessage(err.message))
                  }
                >
                  Update Product
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  style={{ marginTop: "8px" }}
                  onClick={() => openStockModal(editProductId, editDetailColorway)}
                >
                  Manage Stock
                </button>
              </div>
            ) : null}

        {productActionModal.type === "stock" ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: "15px", color: "#64748b" }}>Loading stock summary...</p>
          </div>
        ) : null}
      </ProductActionModalShell>

      <StockSummaryModal
        isOpen={isStockSummaryOpen && productActionModal.type === "stock"}
        onClose={closeStockSummaryView}
        productName={stockModalProduct?.name || ""}
        colorway={stockForm.colorway}
        colorwayOptions={adminColorwayOptions}
        onColorwayChange={handleStockSummaryColorwayChange}
        stockModalDepartment={stockModalDepartment}
        activeStockSizeGroup={activeStockSizeGroup}
        stockSizeSections={stockSizeSections}
        onSizeGroupChange={handleStockSizeGroupChange}
        bulkAction={stockSummaryBulkAction}
        onBulkFieldChange={handleStockSummaryBulkFieldChange}
        onQuantityDecrement={decrementStockSummaryQuantity}
        onQuantityIncrement={incrementStockSummaryQuantity}
        onApply={() => applyStockSummaryBulkChanges().catch((err) => setMessage(err.message))}
        onClear={clearStockSummaryBulkAction}
        onResetClick={openStockSummaryResetModal}
        selectedRows={stockSummarySelectedRows}
        supplierSelections={stockSummarySupplierSelections}
        onSupplierSelectionChange={handleStockSummarySupplierSelectionChange}
        sortedRows={sortedStockSummaryRows}
        sortColumn={stockSummarySortColumn}
        sortAsc={stockSummarySortAsc}
        onSortChange={handleStockSummarySortChange}
        onToggleAllRows={handleStockSummarySelectAllToggle}
        onToggleRow={handleStockSummaryRowToggle}
        visibleTotals={stockSummaryVisibleTotals}
        resetModal={stockSummaryResetModal}
        onResetCancel={closeStockSummaryResetModal}
        onResetConfirm={() => confirmStockSummaryReset().catch((err) => setMessage(err.message))}
        formatPriceLabel={formatPriceLabel}
        customerMarkup={CUSTOMER_MARKUP}
        hasSizeGuide={Boolean(stockSizeGuide && stockGuideSection)}
        onOpenSizeGuide={openStockGuideModal}
        supplierSuggestions={stockSummarySupplierSuggestions}
      />

      <ManualReservationModal
        isOpen={manualReservationModal.isOpen}
        onClose={closeManualReservationModal}
        message={message}
        products={products}
        form={manualReservationForm}
        setForm={setManualReservationForm}
        isSubmitting={isCreatingReservation}
        onSubmit={createManualReservation}
        onError={setMessage}
      />

      <AdminSizeGuideModal
        isOpen={isStockGuideOpen && Boolean(stockSizeGuide) && Boolean(stockGuideSection)}
        onClose={closeStockGuideModal}
        sizeGuide={stockSizeGuide}
        guideSection={stockGuideSection}
      />

      <DeleteModal
        deleteModal={deleteModal}
        setDeleteModal={setDeleteModal}
        confirmDelete={confirmDelete}
      />

      <ConfirmActionModal
        isOpen={colorwayDeleteModal.isOpen}
        title="Delete Colorway"
        description="This will permanently remove the selected colorway’s details, images, and stock rows. Other colorways on the product will remain unchanged."
        targetLabel={colorwayDeleteModal.colorway ? formatColorwayLabel(colorwayDeleteModal.colorway) : ""}
        confirmLabel="Delete Colorway"
        onCancel={closeColorwayDeleteModal}
        onConfirm={() => confirmDeleteProductColorway().catch((err) => setMessage(err.message))}
      />

      <ConfirmActionModal
        isOpen={reservationDeleteModal.isOpen}
        title="Delete Reservation"
        description="This will permanently delete the reservation record and restore stock quantities for all its items."
        targetLabel={reservationDeleteModal.orderId
          ? `#${reservationDeleteModal.orderId}${reservationDeleteModal.customerName ? ` · ${reservationDeleteModal.customerName}` : ""}${reservationDeleteModal.itemCount ? ` · ${reservationDeleteModal.itemCount} item${reservationDeleteModal.itemCount === 1 ? "" : "s"}` : ""}`
          : ""}
        confirmLabel="Delete Reservation"
        onCancel={closeReservationDeleteModal}
        onConfirm={() => confirmDeleteReservation().catch((err) => setMessage(err.message))}
      />


      <NewBrandModal
        newBrandModal={newBrandModal}
        setNewBrandModal={setNewBrandModal}
        addNewBrand={addNewBrand}
        savedBrands={savedBrands}
        deleteSavedBrand={deleteSavedBrand}
        uploadBrandLogo={uploadBrandLogo}
      />

      <NewAdminModal
        newAdminModal={newAdminModal}
        setNewAdminModal={setNewAdminModal}
        newAdminForm={newAdminForm}
        setNewAdminForm={setNewAdminForm}
        createAdminUser={createAdminUser}
      />

      <NewProductNameModal
        newProductNameModal={newProductNameModal}
        setNewProductNameModal={setNewProductNameModal}
        addNewProductName={addNewProductName}
        savedProductNames={savedProductNames}
        deleteSavedProductName={deleteSavedProductName}
      />
      <AdminSuccessModal
        isOpen={successModal.isOpen}
        message={successModal.message}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
      />
      {message || undoQueue.length > 0 ? (
        <div className="toast-banner">
          {message ? <span className="toast-message-text">{message}</span> : null}
          {undoQueue.length > 0 ? (
            <div className="toast-undo-list">
              {undoQueue.map((entry) => {
                const secondsLeft = Math.max(1, Math.ceil((entry.expiresAt - undoNow) / 1000));
                return (
                  <div className="toast-undo-item" key={entry.id}>
                    <div className="toast-undo-copy">
                      <span className="toast-undo-label">{entry.label}</span>
                      <span className="toast-undo-timer">Undo in {secondsLeft}s</span>
                    </div>
                    <button
                      type="button"
                      className="toast-undo-btn"
                      onClick={() => undoDelete(entry.id).catch((err) => setMessage(err.message))}
                    >
                      <RotateCcw size={13} />
                      <span>Undo</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
