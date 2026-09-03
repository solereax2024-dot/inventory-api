import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Check, ImagePlus, Pencil, RotateCcw, Ruler, ShieldCheck, ShieldX, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { US_SIZES, DEPARTMENT_OPTIONS, CATEGORY_OPTIONS, ADMIN_PAGE_SIZE } from "../../constants";
import { apiRequest, uploadImage } from "../../utils/api";
import { formatEnumLabel, formatColorwayLabel, getProductTypeOptions } from "../../utils/format";
import { getColorwayDetails, sanitizeColorways, normalizeColorwayValue } from "../../utils/colorway";
import { getSortedColorwaysFromStocks, buildSizeStateRows, getStockStorageGroup } from "../../utils/stock";
import { buildSizeSections, formatSelectedSizeLabel, getDefaultSizeGroup, getDepartmentForColorway, isUnisexDepartment } from "../../utils/sizePresentation";
import { buildDefaultProductDescription } from "../../utils/productDescription";
import { CUSTOMER_MARKUP, PHP_CURRENCY } from "../../utils/price";
import "../../styles/admin.css";
import "../../styles/stock.css";
import ConfirmActionModal from "./ConfirmActionModal";
import DeleteModal from "./DeleteModal";
import NewBrandModal from "./NewBrandModal";
import NewAdminModal from "./NewAdminModal";
import NewProductNameModal from "./NewProductNameModal";
import StockSummaryModal from "./StockSummaryModal";
import { getBrandSizeGuide, getGuideSectionForContext } from "../../utils/sizeGuide";

const RESERVATION_STATUS_OPTIONS = [
  { value: "ORDERED", label: "Ordered" },
  { value: "PREPARING", label: "Preparing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "PAID", label: "Paid" }
];

const RESERVATION_COURIER_OPTIONS = [
  { value: "LALAMOVE", label: "Lalamove" },
  { value: "GRAB", label: "Grab" },
  { value: "LBC", label: "LBC" },
  { value: "OTHER", label: "Other" }
];

const RESERVATION_MOP_OPTIONS = [
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "BPI", label: "BPI" },
  { value: "MARIBANK", label: "MariBank" },
  { value: "OTHER", label: "Other" }
];

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

const PREORDER_SUPPLIER_BREAKDOWN_MARKER = "__PREORDER__";

function normalizeReservationStatus(status) {
  if (status === "RESERVED") return "ORDERED";
  return status;
}

function statusChipClass(status) {
  const normalized = normalizeReservationStatus(status);
  if (normalized === "PAID") return "status-paid";
  if (normalized === "DELIVERED") return "status-delivered";
  if (normalized === "SHIPPED") return "status-shipped";
  if (normalized === "PREPARING") return "status-preparing";
  return "status-ordered";
}

function formatReservationDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function decodeRoleFromToken(token) {
  if (!token) {
    return "";
  }
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
      return "";
    }
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(window.atob(base64));
    return typeof json.role === "string" ? json.role : "";
  } catch {
    return "";
  }
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileFormatLabel(file) {
  if (!file) return "";
  const byType = (file.type || "").split("/")[1];
  if (byType) return byType.toUpperCase();
  const name = String(file.name || "");
  const ext = name.includes(".") ? name.split(".").pop() : "";
  return ext ? ext.toUpperCase() : "UNKNOWN";
}

function formatPriceLabel(value) {
  if (value === null || value === undefined || value === "") {
    return PHP_CURRENCY.format(0);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return PHP_CURRENCY.format(0);
  }
  return PHP_CURRENCY.format(parsed);
}

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
  const [reservationEditors, setReservationEditors] = useState({});
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [mopOtherDrafts, setMopOtherDrafts] = useState({});
  const [priceDrafts, setPriceDrafts] = useState({});
  const [downpaymentDrafts, setDownpaymentDrafts] = useState({});
  const [balanceDrafts, setBalanceDrafts] = useState({});
  const [reservationSavedMap, setReservationSavedMap] = useState({});
  const reservationSavedTimersRef = useRef({});
  const [adminPage, setAdminPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null, confirmCode: "", userInput: "" });
  const [reservationDeleteModal, setReservationDeleteModal] = useState({
    isOpen: false,
    orderId: null,
    customerName: "",
    itemCount: 0
  });
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
   const [productImageColorway, setProductImageColorway] = useState("DEFAULT");
   const [isStockGuideOpen, setIsStockGuideOpen] = useState(false);
  const [isStockSummaryOpen, setIsStockSummaryOpen] = useState(false);
    const [stockSummaryQuickFilters, setStockSummaryQuickFilters] = useState({
      lowStockOnly: false,
          noSupplierOnly: false
    });
     const [stockSummarySavingRow, setStockSummarySavingRow] = useState("");
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
  const getProductColorways = (product) => {
    const values = sanitizeColorways([
      ...((product?.stocks || []).map((stock) => stock.colorway)),
      ...Object.keys(product?.colorwayImages || {}),
      ...Object.keys(product?.colorwayDetails || {}),
      product?.mainColor
    ]).map(normalizeColorwayValue);
    return values.length > 0 ? [...new Set(values)] : ["DEFAULT"];
  };

  const getAdminScopedColorway = (product, explicitColorway) => {
    const available = getProductColorways(product);
    const preferred = normalizeColorwayValue(
      explicitColorway || product?.mainColor || available[0] || "DEFAULT"
    );
    return available.includes(preferred) ? preferred : available[0] || "DEFAULT";
  };

  const getAdminScopedDetails = (product, explicitColorway) =>
    getColorwayDetails(product, getAdminScopedColorway(product, explicitColorway));

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
        ...(isSuperAdmin ? [{ key: "users", label: "Admin Users" }] : [])
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

  const mapProductToForm = (product, colorway) => {
    const details = getAdminScopedDetails(product, colorway);
    return ({
    name: product?.name || "",
    brand: product?.brand || "",
    mainColor: product?.mainColor || "",
    department: details.department || "UNISEX",
    category: details.category || "FOOTWEAR",
    productType: details.productType || "LIFESTYLE_SNEAKERS",
    imageUrl: product?.imageUrl || "",
    price: product?.price === null || product?.price === undefined ? "" : String(product.price),
    colorwayPrice: details?.price === null || details?.price === undefined ? "" : String(details.price),
    colorwayImages: product?.colorwayImages || {},
    description: details.description || ""
  });
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
    setProductImageColorway("DEFAULT");
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

  const applyPriceToAllSizes = async () => {
    const parsedPrice = Number(stockForm.price);
    const hasPriceInput = String(stockForm.price).trim() !== "";
    if (!hasPriceInput || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      throw new Error("Enter a valid price (0 or higher) first.");
    }
    const allSections = stockSizeSections;
    if (!allSections || allSections.length === 0) {
      throw new Error("No sizes found for this product.");
    }
    const requests = [];
    for (const section of allSections) {
      for (const row of (section.rows || [])) {
        requests.push(
          apiRequest(
            `/api/admin/products/${stockForm.productId}/stocks`,
            "POST",
            {
              colorway: stockForm.colorway,
              size: row.baseSize,
              sizeGroup: getStockStorageGroup(stockModalDepartment, section.key),
              quantityChange: 0,
              price: Number(parsedPrice.toFixed(2))
            },
            token
          )
        );
      }
    }
    await Promise.all(requests);
    setSuccessModal({ isOpen: true, message: `Price ${formatPriceLabel(parsedPrice)} applied to all sizes.` });
    await loadAdminData(token, adminRole);
  };

  const adjustStock = async () => {
    const mode = stockForm.actionType === "REMOVE" ? "remove" : stockForm.actionType === "PRICE" ? "price" : "add";
    const requestedQuantity = Number(stockForm.quantityChange);
    const parsedPrice = Number(stockForm.price);
    const hasPriceInput = String(stockForm.price).trim() !== "";
    const normalizedSupplier = String(stockForm.supplier || "").trim();

    if (mode === "price") {
      if (!hasPriceInput || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
        throw new Error("Enter a valid size price (0 or higher).");
      }
    } else if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      throw new Error("Enter a stock quantity of at least 1.");
    }

    if (mode === "add" && !normalizedSupplier) {
      throw new Error("Enter supplier/source before adding stock.");
    }

    const quantityChange = mode === "price"
      ? 0
      : (mode === "remove" ? -requestedQuantity : requestedQuantity);

    const updatedProduct = await apiRequest(
      `/api/admin/products/${stockForm.productId}/stocks`,
      "POST",
      {
        colorway: stockForm.colorway,
        size: stockForm.size,
        sizeGroup: getStockStorageGroup(stockModalDepartment, activeStockSizeGroup),
        quantityChange,
        price: hasPriceInput ? Number(parsedPrice.toFixed(2)) : null,
        supplier: normalizedSupplier || null
      },
      token
    );
    mergeUpdatedProduct(updatedProduct);
    // Preserve selected size and group so user can continue adjusting same size
    setStockForm((prev) => ({
      ...prev,
      size: prev.size,
      sizeGroup: prev.sizeGroup,
      quantityChange: 1,
      actionType: prev.actionType,
      price: prev.price,
      supplier: prev.supplier
    }));
    if (mode === "price") {
      setSuccessModal({ isOpen: true, message: `Size price saved: ${formatPriceLabel(parsedPrice)}.` });
    } else {
      setSuccessModal({ isOpen: true, message: mode === "remove" ? "Stock removed." : "Stock added." });
    }
    await loadAdminData(token, adminRole);
  };

  const runStockSummaryQuickAction = async (row, action, options = {}) => {
    if (!row) {
      return;
    }
    const rowKey = `${activeStockSizeGroup}-${row.baseSize}`;
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

    setStockSummarySavingRow(`${rowKey}:${action}`);
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
      setStockSummarySavingRow("");
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

  const markReservationSaved = (orderId, field) => {
    if (!field) return;
    const key = `${orderId}:${field}`;
    const existingTimer = reservationSavedTimersRef.current[key];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }
    setReservationSavedMap((prev) => ({ ...prev, [key]: true }));
    reservationSavedTimersRef.current[key] = window.setTimeout(() => {
      setReservationSavedMap((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      delete reservationSavedTimersRef.current[key];
    }, 1600);
  };

  const isReservationSaved = (orderId, field) => Boolean(reservationSavedMap[`${orderId}:${field}`]);

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

  const confirmDeleteReservation = async () => {
    if (!isSuperAdmin || !reservationDeleteModal.orderId) {
      return;
    }
    const orderId = reservationDeleteModal.orderId;
    setUpdatingOrderId(orderId);
    try {
      await apiRequest(`/api/admin/orders/${orderId}`, "DELETE", undefined, token);
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setReservationEditors((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setMopOtherDrafts((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setPriceDrafts((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setDownpaymentDrafts((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setBalanceDrafts((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setReservationSavedMap((prev) => {
        const next = { ...prev };
        ["status", "courier", "mop", "mopOther", "price", "downpayment", "balance"].forEach((field) => {
          delete next[`${orderId}:${field}`];
        });
        return next;
      });
      setSuccessModal({ isOpen: true, message: `Reservation #${orderId} deleted and stock restored.` });
      closeReservationDeleteModal();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const isReservationEditorOpen = (orderId, field) => Boolean(reservationEditors?.[orderId]?.[field]);

  const setReservationEditorOpen = (orderId, field, isOpen) => {
    setReservationEditors((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [field]: isOpen
      }
    }));
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const rowElement = event.target.closest("[data-reservation-row-id]");
      const clickedOrderId = rowElement?.getAttribute("data-reservation-row-id");
      setReservationEditors((prev) => {
        const entries = Object.entries(prev || {});
        if (entries.length === 0) {
          return prev;
        }
        if (!clickedOrderId) {
          return {};
        }
        const next = Object.fromEntries(entries.filter(([orderId]) => String(orderId) === String(clickedOrderId)));
        return Object.keys(next).length === entries.length ? prev : next;
      });
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => () => {
    Object.values(reservationSavedTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
  }, []);

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
    setIsStockGuideOpen(shouldAutoOpenGuide);
    if (shouldAutoOpenGuide) {
      setHasStockGuideOnboardingShown(true);
      localStorage.setItem("adminStockGuideOnboardingShown", "1");
    }
    setIsStockSummaryOpen(false);
    setStockSummaryQuickFilters({ lowStockOnly: false, noSupplierOnly: false });
    setStockSummaryBulkAction({
      ...DEFAULT_STOCK_SUMMARY_BULK_ACTION,
      supplier: preferredSelection.supplier || "",
      price: priceValue
    });
    setStockSummarySavingRow("");
    setProductActionModal({ type: "stock", productId: String(productId) });
  };

  const closeStockSummaryView = () => {
    setIsStockSummaryOpen(false);
    setStockSummarySelectedRows(new Set());
    setStockSummarySupplierSelections({});
    setStockSummarySavingRow("");
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
          const supplierEntries = row.supplierEntries?.length
            ? row.supplierEntries
            : [{ supplier: row.supplier || "", quantity: Number(row.total || 0) }];

          for (const entry of supplierEntries) {
            await apiRequest(
              `/api/admin/products/${stockForm.productId}/stocks`,
              "POST",
              {
                colorway: stockForm.colorway,
                size: row.baseSize,
                sizeGroup: getStockStorageGroup(stockModalDepartment, activeStockSizeGroup),
                quantityChange: Number(entry.quantity || 0) > 0 ? -Number(entry.quantity || 0) : 0,
                price: null,
                referenceSupplier: entry.supplier || null,
                supplier: null,
                clearPrice: true,
                clearSupplier: true
              },
              token
            );
          }
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
      if (tableFilters.brand !== "ALL" && (product.brand || "") !== tableFilters.brand) {
        return false;
      }
      return true;
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
  const selectedStockSizeLabel = useMemo(
    () => formatSelectedSizeLabel(stockForm.size, activeStockSizeGroup, stockModalDepartment),
    [stockForm.size, activeStockSizeGroup, stockModalDepartment]
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
         setIsStockSummaryOpen(true);
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
    activeStockRows.forEach((row) => {
      const entries = Array.isArray(row.supplierEntries) && row.supplierEntries.length
        ? row.supplierEntries
        : [{ supplier: row.supplier || "" }];
      entries.forEach((entry) => {
        const supplier = String(entry?.supplier || "").trim();
        if (!supplier) return;
        const key = supplier.toLowerCase();
        if (!uniqueByLower.has(key)) {
          uniqueByLower.set(key, supplier);
        }
      });
    });
    return Array.from(uniqueByLower.values()).sort((a, b) => a.localeCompare(b));
  }, [activeStockRows]);

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
  const filteredStockSummaryRows = useMemo(() => activeStockRows.filter((row) => {
    if (stockSummaryQuickFilters.lowStockOnly && !(Number(row.total || 0) > 0 && Number(row.total || 0) <= 3)) {
      return false;
    }
    if (stockSummaryQuickFilters.noSupplierOnly && (row.supplierEntries || []).some((entry) => String(entry.supplier || "").trim())) {
      return false;
    }
    return true;
  }), [activeStockRows, stockSummaryQuickFilters]);

  const sortedStockSummaryRows = useMemo(() => {
    const sorted = [...filteredStockSummaryRows];
    sorted.sort((a, b) => {
      let aVal, bVal;
      switch (stockSummarySortColumn) {
        case "size":
          aVal = Number(a.baseSize || 0);
          bVal = Number(b.baseSize || 0);
          break;
        case "total":
          aVal = Number(a.total || 0);
          bVal = Number(b.total || 0);
          break;
        case "supplier":
          aVal = String(a.supplier || "");
          bVal = String(b.supplier || "");
          return stockSummarySortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case "price":
          aVal = Number(a.price || 0);
          bVal = Number(b.price || 0);
          break;
        default:
          return 0;
      }
      return stockSummarySortAsc ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [filteredStockSummaryRows, stockSummarySortColumn, stockSummarySortAsc]);

  const stockSummaryVisibleTotals = useMemo(() => filteredStockSummaryRows.reduce((acc, row) => ({
    total: acc.total + (row.total || 0)
  }), {
    total: 0
  }), [filteredStockSummaryRows]);

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

  const reservationStats = useMemo(() => {
    const totalReservations = orders.length;
    const preparingCount = orders.filter((order) => normalizeReservationStatus(order.status) === "PREPARING").length;
    const shippedCount = orders.filter((order) => normalizeReservationStatus(order.status) === "SHIPPED").length;
    const paidCount = orders.filter((order) => normalizeReservationStatus(order.status) === "PAID").length;
    const totalSalesAll = orders.reduce((sum, order) => {
      const parsed = Number(order.totalPrice);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return sum;
      }
      return sum + parsed;
    }, 0);
    const totalSalesPaid = orders.reduce((sum, order) => {
      if (normalizeReservationStatus(order.status) !== "PAID") {
        return sum;
      }
      const parsed = Number(order.totalPrice);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return sum;
      }
      return sum + parsed;
    }, 0);
    const activeProducts = products.length;
    const lowStockSizes = products.reduce((count, product) => {
      const colorways = getSortedColorwaysFromStocks(product.stocks);
      return count + colorways.reduce((nestedCount, colorway) => (
        nestedCount + buildSizeStateRows(product, colorway).filter((row) => row.total > 0 && row.total <= 3).length
      ), 0);
    }, 0);
    return {
      totalReservations,
      preparingCount,
      shippedCount,
      paidCount,
      totalSalesAll,
      totalSalesPaid,
      activeProducts,
      lowStockSizes
    };
  }, [orders, products]);

  const filteredReservations = useMemo(() => {
    const keyword = reservationFilters.keyword.trim().toLowerCase();
    const statusFilter = reservationFilters.status;

    return [...orders]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .filter((order) => {
        const normalizedStatus = normalizeReservationStatus(order.status);
        if (statusFilter !== "ALL" && normalizedStatus !== statusFilter) {
          return false;
        }
        if (!keyword) {
          return true;
        }
        const itemText = (order.items || []).map((item) => (
          `${item.productName || ""} ${item.colorway || ""} ${item.size || ""} ${item.sizeGroup || ""}`
        )).join(" ").toLowerCase();
        const haystack = [
          String(order.id || ""),
          order.customerName || "",
          order.customerContact || "",
          order.notes || "",
          order.status || "",
          itemText
        ].join(" ").toLowerCase();
        return haystack.includes(keyword);
      });
  }, [orders, reservationFilters.keyword, reservationFilters.status]);
  const reservationTableColumnCount = isSuperAdmin ? 12 : 11;

  const reservationMopTotals = useMemo(() => {
    const totals = new Map();
    const otherLabels = new Map();
    filteredReservations.forEach((order) => {
      const rawMop = String(order.mop || "").trim().toUpperCase();
      let key = rawMop || "NO_MOP";
      if (rawMop === "OTHER") {
        const rawOther = String(order.mopOther || "").trim();
        const normalizedOther = rawOther.toUpperCase() || "UNSPECIFIED";
        key = `OTHER:${normalizedOther}`;
        if (!otherLabels.has(key)) {
          otherLabels.set(key, rawOther || "Other (Unspecified)");
        }
      }
      const parsed = Number(order.totalPrice);
      const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      totals.set(key, (totals.get(key) || 0) + amount);
    });

    const standardKeys = RESERVATION_MOP_OPTIONS
      .map((option) => option.value)
      .filter((value) => value !== "OTHER");
    const otherKeys = [...totals.keys()].filter((key) => key.startsWith("OTHER:")).sort();
    const orderedKeys = [
      ...standardKeys,
      ...otherKeys,
      "NO_MOP"
    ];

    return orderedKeys
      .filter((key) => totals.has(key))
      .map((key) => ({
        key,
        label: key === "NO_MOP"
          ? "No MOP"
          : (key.startsWith("OTHER:")
            ? otherLabels.get(key)
            : (RESERVATION_MOP_OPTIONS.find((option) => option.value === key)?.label || formatEnumLabel(key))),
        total: totals.get(key) || 0
      }));
  }, [filteredReservations]);

  const productById = useMemo(() => {
    const map = {};
    products.forEach((product) => {
      map[String(product.id)] = product;
    });
    return map;
  }, [products]);

  const resolveOriginalUnitPrice = (item) => {
    const product = productById[String(item?.productId)];
    if (!product) {
      return null;
    }
    const department = getDepartmentForColorway(product, item?.colorway);
    const normalizedItemSizeGroup = String(item?.sizeGroup || "").toUpperCase();
    const storageSizeGroup = getStockStorageGroup(department, normalizedItemSizeGroup);
    const exactStock = (product.stocks || []).find((stock) => (
      String(stock.colorway || "").toUpperCase() === String(item.colorway || "").toUpperCase()
      && String(stock.size) === String(item.size)
      && String(stock.sizeGroup || "").toUpperCase() === storageSizeGroup
    ));
    const stockPrice = Number(exactStock?.price);
    if (Number.isFinite(stockPrice) && stockPrice >= 0) {
      return stockPrice;
    }
    const colorwayPrice = Number(getColorwayDetails(product, item.colorway)?.price);
    if (Number.isFinite(colorwayPrice) && colorwayPrice >= 0) {
      return colorwayPrice;
    }
    const productPrice = Number(product?.price);
    return Number.isFinite(productPrice) && productPrice >= 0 ? productPrice : null;
  };

  const formatReservationItemSizeLabel = (item) => {
    const normalizedSizeGroup = String(item?.sizeGroup || "").toUpperCase();
    const product = productById[String(item?.productId)];
    const department = product ? getDepartmentForColorway(product, item?.colorway) : normalizedSizeGroup;
    if (String(department || "").toUpperCase() === "UNISEX" && normalizedSizeGroup === "STANDARD") {
      return `US ${item?.size || "-"}`;
    }
    const formatted = formatSelectedSizeLabel(item?.size, normalizedSizeGroup, department);
    if (formatted) {
      return formatted;
    }
    if (normalizedSizeGroup === "WOMEN") {
      return `Women's US ${item?.size || "-"}`;
    }
    if (normalizedSizeGroup === "KIDS") {
      return `Kids' US ${item?.size || "-"}`;
    }
    return `Men's US ${item?.size || "-"}`;
  };

  useEffect(() => {
    if (!isSuperAdmin && activeAdminSection === "users") {
      setActiveAdminSection("products");
    }
  }, [isSuperAdmin, activeAdminSection]);

  if (!isLoggedIn) {
    return (
      <main className="container container-wide">
        <section className="card admin-login-card">
          <h2>Admin Login</h2>
          <input
            placeholder="Username"
            value={loginForm.username}
            onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <input
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            autoComplete="current-password"
          />
          <button onClick={() => login().catch((err) => setMessage(err.message))}>Login</button>
          <button type="button" className="button-secondary" onClick={() => navigate("/")}>
            Back to Customer Page
          </button>
          <p className="message">{message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="container container-wide">
      <section className="card admin-subnav">
        <div className="admin-subnav-tabs">
          {adminSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`admin-subnav-tab ${activeAdminSection === section.key ? "active" : ""}`}
              onClick={() => setActiveAdminSection(section.key)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </section>

      {activeAdminSection === "products" ? (
      <section className="card products-card admin-section">
        <div className="section-head">
          <h2>Products</h2>
          <p className="field-hint" style={{ margin: 0 }}>
            Role: <strong>{adminRole || "ADMIN"}</strong>
          </p>
          <button type="button" onClick={openCreateModal}>Add Product</button>
        </div>
        <div className="products-table-wrap">
        <table className="products-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Brand</th>
              <th>Actions</th>
            </tr>
            <tr>
              <th>
                <input
                  value={tableFilters.product}
                  onChange={(e) => setTableFilters((prev) => ({ ...prev, product: e.target.value }))}
                  placeholder="Filter product"
                />
              </th>
              <th>
                <select
                  value={tableFilters.brand}
                  onChange={(e) => setTableFilters((prev) => ({ ...prev, brand: e.target.value }))}
                >
                  <option value="ALL">All</option>
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(isAdminLoading
              ? Array.from({ length: 6 }, (_, index) => ({ id: `loading-${index}` }))
              : adminPaginatedProducts
            ).map((product) => {
              if (isAdminLoading) {
                return (
                  <tr key={product.id}>
                    <td colSpan="3"><div className="skeleton-line" /></td>
                  </tr>
                );
              }
              const selectedColorway =
                getAdminScopedColorway(product);
              return (
                <tr
                  key={product.id}
                  className="clickable-product-row"
                  onClick={() => openEditModal(product.id, selectedColorway)}
                >
                  <td>{product.name}</td>
                  <td>{product.brand}</td>
                  <td>
                    <div className="actions-inline admin-actions-inline">
                      <button
                        type="button"
                        className="admin-action-btn quick-tooltip"
                        data-tooltip="Manage Stock"
                        aria-label="Manage stock"
                        onClick={(event) => {
                          event.stopPropagation();
                          openStockModal(product.id, selectedColorway);
                        }}
                      >
                        <Boxes size={15} />
                        <span className="admin-action-label">Manage Stock</span>
                      </button>
                      {isSuperAdmin ? (
                        <button
                          type="button"
                          className="btn-delete admin-action-btn quick-tooltip"
                          data-tooltip="Delete"
                          aria-label="Delete product"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteProduct(product.id);
                          }}
                        >
                          <Trash2 size={15} />
                          <span className="admin-action-label">Delete</span>
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <div className="pagination-bar card" style={{ marginTop: "8px" }}>
          <nav aria-label="Admin products pages">
            <ul className="pagination-numbers pages-items">
              {adminPage > 1 ? (
                <>
                  <li className="pages-item pages-item-first">
                    <button
                      type="button"
                      className="page-number-btn page-nav-btn"
                      onClick={() => setAdminPage(1)}
                      aria-label="First page"
                    >
                      «
                    </button>
                  </li>
                  <li className="pages-item pages-item-prev">
                    <button
                      type="button"
                      className="page-number-btn page-nav-btn"
                      onClick={() => setAdminPage((prev) => Math.max(1, prev - 1))}
                      aria-label="Previous page"
                    >
                      ‹
                    </button>
                  </li>
                </>
              ) : null}
              {adminPaginationItems.map((item) =>
                item.type === "ellipsis" ? (
                  <li key={item.value} className="pages-item page-ellipsis" aria-hidden="true">…</li>
                ) : (
                  <li key={item.value} className={`pages-item ${adminPage === item.value ? "current" : ""}`}>
                    <button
                      type="button"
                      className={`page-number-btn ${adminPage === item.value ? "active" : ""}`}
                      onClick={() => setAdminPage(item.value)}
                      aria-label={`Page ${item.value}`}
                      aria-current={adminPage === item.value ? "page" : undefined}
                    >
                      {item.value}
                    </button>
                  </li>
                )
              )}
              {adminPage < adminTotalPages ? (
                <>
                  <li className="pages-item pages-item-next">
                    <button
                      type="button"
                      className="page-number-btn page-nav-btn"
                      onClick={() => setAdminPage((prev) => Math.min(adminTotalPages, prev + 1))}
                      aria-label="Next page"
                    >
                      ›
                    </button>
                  </li>
                  <li className="pages-item pages-item-last">
                    <button
                      type="button"
                      className="page-number-btn page-nav-btn"
                      onClick={() => setAdminPage(adminTotalPages)}
                      aria-label="Last page"
                    >
                      »
                    </button>
                  </li>
                </>
              ) : null}
            </ul>
          </nav>
        </div>
      </section>
      ) : null}

      {activeAdminSection === "reservations" ? (
        <section className="card products-card admin-section">
          <div className="section-head">
            <h2>Reservations</h2>
            <p className="field-hint" style={{ margin: 0 }}>
              Review customer reservations and update fulfillment status.
            </p>
          </div>

          <div className="admin-summary-grid">
            <article className="admin-summary-card">
              <p>Total</p>
              <h3>{reservationStats.totalReservations}</h3>
            </article>
            <article className="admin-summary-card">
              <p>Preparing</p>
              <h3>{reservationStats.preparingCount}</h3>
            </article>
            <article className="admin-summary-card">
              <p>Total Sales (Paid only)</p>
              <h3 className="admin-summary-value admin-summary-value-price">{formatPriceLabel(reservationStats.totalSalesPaid)}</h3>
            </article>
            <article className="admin-summary-card">
              <p>Total Sales (All reservations)</p>
              <h3 className="admin-summary-value admin-summary-value-price">{formatPriceLabel(reservationStats.totalSalesAll)}</h3>
            </article>
            <article className="admin-summary-card">
              <p>Shipped</p>
              <h3>{reservationStats.shippedCount}</h3>
            </article>
            <article className="admin-summary-card">
              <p>Paid</p>
              <h3>{reservationStats.paidCount}</h3>
            </article>
            {reservationMopTotals.map((entry) => (
              <article key={`mop-total-${entry.key}`} className="admin-summary-card admin-summary-card-accent">
                <p>{entry.label} Total</p>
                <h3 className="admin-summary-value admin-summary-value-price">{formatPriceLabel(entry.total)}</h3>
              </article>
            ))}
          </div>

          <div className="reservation-filter-row">
            <input
              value={reservationFilters.keyword}
              onChange={(e) => setReservationFilters((prev) => ({ ...prev, keyword: e.target.value }))}
              placeholder="Search by customer, contact, product, colorway, or order #"
            />
            <select
              value={reservationFilters.status}
              onChange={(e) => setReservationFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="ALL">All statuses</option>
              {RESERVATION_STATUS_OPTIONS.map((option) => (
                <option key={`reservation-status-filter-${option.value}`} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table reservations-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Items</th>
                  <th>Created</th>
                  <th>Courier</th>
                  <th>MOP</th>
                  <th>Price</th>
                  <th>Downpayment</th>
                  <th>Balance</th>
                  <th>Status</th>
                  {isSuperAdmin ? <th>Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {isAdminLoading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <tr key={`reservation-loading-${index}`}>
                      <td colSpan={reservationTableColumnCount}><div className="skeleton-line" /></td>
                    </tr>
                  ))
                ) : filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={reservationTableColumnCount}>No reservations found.</td>
                  </tr>
                ) : (
                  filteredReservations.map((order) => {
                    const normalizedStatus = normalizeReservationStatus(order.status);
                    const normalizedCourier = String(order.courier || "").toUpperCase();
                    const normalizedMop = String(order.mop || "").toUpperCase();
                    const mopOtherDraft = mopOtherDrafts[order.id] ?? order.mopOther ?? "";
                    const trimmedMopOtherDraft = mopOtherDraft.trim();
                    const hasOrderPrice = order.totalPrice !== null && order.totalPrice !== undefined && order.totalPrice !== "";
                    const normalizedOrderPrice = hasOrderPrice ? Number(order.totalPrice).toFixed(2) : "";
                    const originalPriceTotal = (order.items || []).reduce((sum, item) => {
                      const basePrice = resolveOriginalUnitPrice(item);
                      const quantity = Number(item.quantity || 0);
                      if (!Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(quantity) || quantity <= 0) {
                        return sum;
                      }
                      return sum + (basePrice * quantity);
                    }, 0);
                    const hasOriginalPrice = originalPriceTotal > 0;
                    const hasCustomPrice = hasOrderPrice && hasOriginalPrice
                      && Math.abs(Number(order.totalPrice) - originalPriceTotal) >= 0.01;
                    const priceDraft = String(priceDrafts[order.id] ?? normalizedOrderPrice);
                    const trimmedPriceDraft = priceDraft.trim();
                    const isPriceDirty = trimmedPriceDraft !== normalizedOrderPrice;
                    const hasDownpayment = order.downpayment !== null && order.downpayment !== undefined && order.downpayment !== "";
                    const normalizedDownpayment = hasDownpayment ? Number(order.downpayment).toFixed(2) : "";
                    const downpaymentDraft = String(downpaymentDrafts[order.id] ?? normalizedDownpayment);
                    const trimmedDownpaymentDraft = downpaymentDraft.trim();
                    const isDownpaymentDirty = trimmedDownpaymentDraft !== normalizedDownpayment;

                    const computedBalance = hasOrderPrice
                      ? Math.max(0, Number(order.totalPrice) - Number(order.downpayment || 0))
                      : null;
                    const hasBalance = order.balance !== null && order.balance !== undefined && order.balance !== "";
                    const balanceDisplayValue = hasBalance
                      ? Number(order.balance)
                      : computedBalance;
                    const normalizedBalance = hasBalance
                      ? Number(order.balance).toFixed(2)
                      : (computedBalance !== null ? Number(computedBalance).toFixed(2) : "");
                    const balanceDraft = String(balanceDrafts[order.id] ?? normalizedBalance);
                    const trimmedBalanceDraft = balanceDraft.trim();
                    const isBalanceDirty = trimmedBalanceDraft !== normalizedBalance;
                    const hasUnsavedMopOther = normalizedMop === "OTHER"
                      && trimmedMopOtherDraft
                      && trimmedMopOtherDraft !== (order.mopOther || "");
                    return (
                      <tr key={order.id} data-reservation-row-id={String(order.id)}>
                        <td>#{order.id}</td>
                        <td className="reservation-customer-cell">
                          <strong>{order.customerName || "-"}</strong>
                          {order.notes ? <small>Note: {order.notes}</small> : null}
                        </td>
                        <td>{order.customerContact || "-"}</td>
                        <td className="reservation-items-cell">
                          {(order.items || []).map((item, index) => (
                            <div key={`${order.id}-${item.productId || item.productName}-${index}`} className="reservation-item-line">
                              <strong>
                                {item.productName}
                                {item.supplierBreakdown === PREORDER_SUPPLIER_BREAKDOWN_MARKER ? (
                                  <span className="reservation-preorder-badge">Pre-Order</span>
                                ) : null}
                              </strong>
                              <span>
                                {formatColorwayLabel(item.colorway)} · {formatReservationItemSizeLabel(item)} · Qty {item.quantity}
                              </span>
                            </div>
                          ))}
                        </td>
                        <td className="reservation-created-cell">{formatReservationDateTime(order.createdAt)}</td>
                        <td>
                          <div className="reservation-field-cell">
                            {isReservationEditorOpen(order.id, "courier") ? (
                              <select
                                className="reservation-status-select"
                                value={normalizedCourier}
                                disabled={updatingOrderId === order.id}
                                onChange={(e) => updateReservationStatus(
                                  order.id,
                                  { courier: e.target.value },
                                  `Reservation #${order.id} courier set to ${formatEnumLabel(e.target.value)}.`,
                                  "courier"
                                ).then(() => setReservationEditorOpen(order.id, "courier", false)).catch((err) => setMessage(err.message))}
                              >
                                <option value="">Select courier</option>
                                {RESERVATION_COURIER_OPTIONS.map((option) => (
                                  <option key={`reservation-courier-${order.id}-${option.value}`} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className={`order-status-chip reservation-final-chip ${normalizedCourier ? "status-shipped" : "status-ordered"}`}>
                                {normalizedCourier ? formatEnumLabel(normalizedCourier) : "No Courier"}
                              </span>
                            )}
                            <button
                              type="button"
                              className="reservation-inline-icon-btn"
                              aria-label={isReservationEditorOpen(order.id, "courier") ? "Close courier selector" : "Set courier"}
                              onClick={() => setReservationEditorOpen(order.id, "courier", !isReservationEditorOpen(order.id, "courier"))}
                              disabled={updatingOrderId === order.id}
                            >
                              <Pencil size={14} />
                            </button>
                            {isReservationSaved(order.id, "courier") ? (
                              <small className="reservation-saved-inline"><Check size={12} />Saved</small>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="reservation-mop-cell">
                            <div className="reservation-field-cell">
                              {isReservationEditorOpen(order.id, "mop") ? (
                                <select
                                  className="reservation-status-select"
                                  value={normalizedMop}
                                  disabled={updatingOrderId === order.id}
                                  onChange={(e) => updateReservationStatus(
                                    order.id,
                                    { mop: e.target.value },
                                    `Reservation #${order.id} MOP set to ${formatEnumLabel(e.target.value)}.`,
                                    "mop"
                                  ).then(() => {
                                    if (e.target.value !== "OTHER") {
                                      setReservationEditorOpen(order.id, "mop", false);
                                    }
                                  }).catch((err) => setMessage(err.message))}
                                >
                                  <option value="">Select MOP</option>
                                  {RESERVATION_MOP_OPTIONS.map((option) => (
                                    <option key={`reservation-mop-${order.id}-${option.value}`} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`order-status-chip reservation-final-chip ${normalizedMop ? "status-preparing" : "status-ordered"}`}>
                                  {normalizedMop ? formatEnumLabel(normalizedMop) : "No MOP"}
                                </span>
                              )}
                              <button
                                type="button"
                                className="reservation-inline-icon-btn"
                                aria-label={isReservationEditorOpen(order.id, "mop") ? "Close MOP selector" : "Set MOP"}
                                onClick={() => setReservationEditorOpen(order.id, "mop", !isReservationEditorOpen(order.id, "mop"))}
                                disabled={updatingOrderId === order.id}
                              >
                                <Pencil size={14} />
                              </button>
                              {isReservationSaved(order.id, "mop") || isReservationSaved(order.id, "mopOther") ? (
                                <small className="reservation-saved-inline"><Check size={12} />Saved</small>
                              ) : null}
                            </div>
                            {normalizedMop === "OTHER" && isReservationEditorOpen(order.id, "mop") ? (
                              <>
                                <input
                                  className="reservation-other-input"
                                  value={mopOtherDraft}
                                  placeholder="Specify other MOP"
                                  onChange={(e) => setMopOtherDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                  onBlur={() => {
                                    const trimmed = mopOtherDraft.trim();
                                    if (!trimmed || trimmed === (order.mopOther || "")) {
                                      return;
                                    }
                                    updateReservationStatus(
                                      order.id,
                                      { mop: "OTHER", mopOther: trimmed },
                                      `Reservation #${order.id} MOP details updated.`,
                                      "mopOther"
                                    ).catch((err) => setMessage(err.message));
                                  }}
                                  disabled={updatingOrderId === order.id}
                                />
                                {hasUnsavedMopOther ? (
                                  <button
                                    type="button"
                                    className="reservation-other-save-btn"
                                    onClick={() => updateReservationStatus(
                                      order.id,
                                      { mop: "OTHER", mopOther: trimmedMopOtherDraft },
                                      `Reservation #${order.id} MOP details updated.`,
                                      "mopOther"
                                    ).catch((err) => setMessage(err.message))}
                                    disabled={updatingOrderId === order.id}
                                  >
                                    Save Other MOP
                                  </button>
                                ) : null}
                              </>
                            ) : normalizedMop === "OTHER" && order.mopOther ? (
                              <small className="field-hint">Other: {order.mopOther}</small>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="reservation-field-cell">
                            {isReservationEditorOpen(order.id, "price") ? (
                              <div className="reservation-price-edit">
                                <input
                                  className="reservation-price-input"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={priceDraft}
                                  placeholder="0.00"
                                  disabled={updatingOrderId === order.id}
                                  onChange={(e) => setPriceDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      saveReservationPrice(order.id, priceDraft);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (isPriceDirty && trimmedPriceDraft) {
                                      saveReservationPrice(order.id, priceDraft);
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <span className={`order-status-chip reservation-final-chip reservation-price-chip ${hasOrderPrice ? "status-delivered" : "status-ordered"}`}>
                                {formatPriceLabel(order.totalPrice)}
                              </span>
                            )}
                            <button
                              type="button"
                              className="reservation-inline-icon-btn"
                              aria-label={isReservationEditorOpen(order.id, "price") ? "Close price editor" : "Set price"}
                              onClick={() => {
                                if (isReservationEditorOpen(order.id, "price") && isPriceDirty && trimmedPriceDraft) {
                                  saveReservationPrice(order.id, priceDraft);
                                  return;
                                }
                                const nextOpen = !isReservationEditorOpen(order.id, "price");
                                setReservationEditorOpen(order.id, "price", nextOpen);
                                if (nextOpen) {
                                  setPriceDrafts((prev) => ({ ...prev, [order.id]: normalizedOrderPrice }));
                                }
                              }}
                              disabled={updatingOrderId === order.id}
                            >
                              <Pencil size={14} />
                            </button>
                            {isReservationSaved(order.id, "price") ? (
                              <small className="reservation-saved-inline"><Check size={12} />Saved</small>
                            ) : null}
                          </div>
                          {hasOriginalPrice ? (
                            <small className={`reservation-original-price ${hasCustomPrice ? "is-overridden" : ""}`}>
                              Original: {formatPriceLabel(originalPriceTotal)}
                            </small>
                          ) : null}
                        </td>
                        <td>
                          <div className="reservation-field-cell">
                            {isReservationEditorOpen(order.id, "downpayment") ? (
                              <div className="reservation-price-edit">
                                <input
                                  className="reservation-price-input"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={downpaymentDraft}
                                  placeholder="0.00"
                                  disabled={updatingOrderId === order.id}
                                  onChange={(e) => setDownpaymentDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      saveReservationMonetary(order.id, "downpayment", downpaymentDraft, "Downpayment", setDownpaymentDrafts);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (isDownpaymentDirty && trimmedDownpaymentDraft) {
                                      saveReservationMonetary(order.id, "downpayment", downpaymentDraft, "Downpayment", setDownpaymentDrafts);
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <span className={`order-status-chip reservation-final-chip reservation-price-chip ${hasDownpayment ? "status-delivered" : "status-ordered"}`}>
                                {formatPriceLabel(order.downpayment)}
                              </span>
                            )}
                            <button
                              type="button"
                              className="reservation-inline-icon-btn"
                              aria-label={isReservationEditorOpen(order.id, "downpayment") ? "Close downpayment editor" : "Set downpayment"}
                              onClick={() => {
                                if (isReservationEditorOpen(order.id, "downpayment") && isDownpaymentDirty && trimmedDownpaymentDraft) {
                                  saveReservationMonetary(order.id, "downpayment", downpaymentDraft, "Downpayment", setDownpaymentDrafts);
                                  return;
                                }
                                const nextOpen = !isReservationEditorOpen(order.id, "downpayment");
                                setReservationEditorOpen(order.id, "downpayment", nextOpen);
                                if (nextOpen) {
                                  setDownpaymentDrafts((prev) => ({ ...prev, [order.id]: normalizedDownpayment }));
                                }
                              }}
                              disabled={updatingOrderId === order.id}
                            >
                              <Pencil size={14} />
                            </button>
                            {isReservationSaved(order.id, "downpayment") ? (
                              <small className="reservation-saved-inline"><Check size={12} />Saved</small>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="reservation-field-cell">
                            {isReservationEditorOpen(order.id, "balance") ? (
                              <div className="reservation-price-edit">
                                <input
                                  className="reservation-price-input"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={balanceDraft}
                                  placeholder="0.00"
                                  disabled={updatingOrderId === order.id}
                                  onChange={(e) => setBalanceDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      saveReservationMonetary(order.id, "balance", balanceDraft, "Balance", setBalanceDrafts);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (isBalanceDirty && trimmedBalanceDraft) {
                                      saveReservationMonetary(order.id, "balance", balanceDraft, "Balance", setBalanceDrafts);
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <span className={`order-status-chip reservation-final-chip reservation-price-chip ${balanceDisplayValue !== null ? "status-preparing" : "status-ordered"}`}>
                                {formatPriceLabel(balanceDisplayValue)}
                              </span>
                            )}
                            <button
                              type="button"
                              className="reservation-inline-icon-btn"
                              aria-label={isReservationEditorOpen(order.id, "balance") ? "Close balance editor" : "Set balance"}
                              onClick={() => {
                                if (isReservationEditorOpen(order.id, "balance") && isBalanceDirty && trimmedBalanceDraft) {
                                  saveReservationMonetary(order.id, "balance", balanceDraft, "Balance", setBalanceDrafts);
                                  return;
                                }
                                const nextOpen = !isReservationEditorOpen(order.id, "balance");
                                setReservationEditorOpen(order.id, "balance", nextOpen);
                                if (nextOpen) {
                                  setBalanceDrafts((prev) => ({ ...prev, [order.id]: normalizedBalance }));
                                }
                              }}
                              disabled={updatingOrderId === order.id}
                            >
                              <Pencil size={14} />
                            </button>
                            {isReservationSaved(order.id, "balance") ? (
                              <small className="reservation-saved-inline"><Check size={12} />Saved</small>
                            ) : null}
                          </div>
                          {!hasBalance && computedBalance !== null ? (
                            <small className="reservation-original-price">Auto: {formatPriceLabel(computedBalance)}</small>
                          ) : null}
                        </td>
                        <td>
                          <div className="reservation-status-cell">
                            {isReservationEditorOpen(order.id, "status") ? (
                              <select
                                className="reservation-status-select"
                                value={normalizedStatus}
                                disabled={updatingOrderId === order.id}
                                onChange={(e) => updateReservationStatus(
                                  order.id,
                                  { status: e.target.value },
                                  `Reservation #${order.id} updated to ${formatEnumLabel(e.target.value)}.`,
                                  "status"
                                ).then(() => setReservationEditorOpen(order.id, "status", false)).catch((err) => setMessage(err.message))}
                              >
                                {RESERVATION_STATUS_OPTIONS.map((option) => (
                                  <option key={`reservation-status-${order.id}-${option.value}`} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className={`order-status-chip ${statusChipClass(normalizedStatus)}`}>
                                {formatEnumLabel(normalizedStatus)}
                              </span>
                            )}
                            <button
                              type="button"
                              className="reservation-inline-icon-btn"
                              aria-label={isReservationEditorOpen(order.id, "status") ? "Close status selector" : "Set status"}
                              onClick={() => setReservationEditorOpen(order.id, "status", !isReservationEditorOpen(order.id, "status"))}
                              disabled={updatingOrderId === order.id}
                            >
                              <Pencil size={14} />
                            </button>
                            {isReservationSaved(order.id, "status") ? (
                              <small className="reservation-saved-inline"><Check size={12} />Saved</small>
                            ) : null}
                          </div>
                        </td>
                        {isSuperAdmin ? (
                          <td>
                            <button
                              type="button"
                              className="reservation-delete-btn"
                              onClick={() => openReservationDeleteModal(order)}
                              disabled={updatingOrderId === order.id}
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {isSuperAdmin && activeAdminSection === "users" ? (
        <section className="card products-card admin-section">
          <div className="section-head">
            <h2>Admin Users</h2>
            <button
              type="button"
              onClick={() => {
                setNewAdminForm({ username: "", password: "", role: "ADMIN" });
                setNewAdminModal({ isOpen: true });
              }}
            >
              Add Admin
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.role}</td>
                    <td>{user.enabled ? "Active" : "Disabled"}</td>
                    <td>
                      {user.role === "ADMIN" ? (
                        <div className="admin-user-action">
                          {user.enabled ? (
                            <button
                              type="button"
                              className="btn-delete admin-action-btn quick-tooltip"
                              data-tooltip="Disable"
                              aria-label="Disable admin"
                              onClick={() => setAdminUserStatus(user.id, false).catch((err) => setMessage(err.message))}
                            >
                              <ShieldX size={15} />
                              <span className="admin-action-label">Disable</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-action-btn quick-tooltip"
                              data-tooltip="Enable"
                              aria-label="Enable admin"
                              onClick={() => setAdminUserStatus(user.id, true).catch((err) => setMessage(err.message))}
                            >
                              <ShieldCheck size={15} />
                              <span className="admin-action-label">Enable</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {productActionModal.type ? (
        <div className="modal-backdrop" onClick={() => setProductActionModal({ type: null, productId: "" })}>
          <section className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="breakdown-header stock-summary-header">
              <h2>
                {productActionModal.type === "create" ? "Add Product" : null}
                {productActionModal.type === "edit"
                  ? `Update Product${editProductForm.name ? ` - ${editProductForm.name}` : ""}${editImageColorway ? ` (${formatColorwayLabel(editImageColorway)})` : ""}`
                  : null}
                {productActionModal.type === "stock"
                  ? `Manage Stock${stockModalProduct ? ` - ${(stockModalProduct.brand || "").trim()} ${(stockModalProduct.name || "").trim()}`.trim() : ""}${stockForm.colorway ? ` (${formatColorwayLabel(stockForm.colorway)})` : ""}`
                  : null}
              </h2>
              <button type="button" className="modal-close-btn" onClick={() => setProductActionModal({ type: null, productId: "" })}>
                ✕
              </button>
            </div>

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
            <p className="message">{message}</p>
          </section>
        </div>
      ) : null}

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
        onOpenSizeGuide={() => setIsStockGuideOpen(true)}
        supplierSuggestions={stockSummarySupplierSuggestions}
      />

      {isStockGuideOpen && stockSizeGuide && stockGuideSection ? (
        <div className="modal-overlay" onClick={() => setIsStockGuideOpen(false)}>
          <section className="modal-panel modal-panel-compact size-guide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="breakdown-header">
              <h2>{stockSizeGuide.brandLabel} Size Guide</h2>
              <button type="button" className="modal-close-btn" aria-label="Close size guide" onClick={() => setIsStockGuideOpen(false)}>✕</button>
            </div>
            <div className="size-guide-table-wrap">
              <table className="size-guide-table">
                <thead>
                  <tr>
                    {stockGuideSection.columns.map((column) => (
                      <th key={`stock-guide-head-modal-${column.key}`}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockGuideSection.rows.map((row, index) => (
                    <tr key={`stock-guide-row-modal-${index}`}>
                      {stockGuideSection.columns.map((column) => (
                        <td key={`stock-guide-cell-modal-${column.key}-${index}`}>{row[column.key] || "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <small className="field-hint" style={{ marginTop: 4 }}>
              Reference from {stockSizeGuide.sourceLabel}. Actual fit may vary by model.
            </small>
            {stockSizeGuide.fitNote ? (
              <small className="field-hint" style={{ marginTop: 0 }}>{stockSizeGuide.fitNote}</small>
            ) : null}
          </section>
        </div>
      ) : null}

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
      {successModal.isOpen ? (
        <div className="modal-overlay" onClick={() => setSuccessModal({ isOpen: false, message: "" })}>
          <section className="modal-panel modal-panel-compact" onClick={(e) => e.stopPropagation()}>
            <div className="breakdown-header">
              <h2>Success</h2>
              <button type="button" className="modal-close-btn" aria-label="Close success modal" onClick={() => setSuccessModal({ isOpen: false, message: "" })}>✕</button>
            </div>
            <div className="modal-success-content">
              <p style={{ margin: "16px 0", textAlign: "center" }}>{successModal.message}</p>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button type="button" onClick={() => setSuccessModal({ isOpen: false, message: "" })} style={{ minWidth: "120px" }}>OK</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
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
