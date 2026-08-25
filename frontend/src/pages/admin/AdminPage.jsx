import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Check, ImagePlus, Pencil, RotateCcw, Ruler, ShieldCheck, ShieldX, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { US_SIZES, STOCK_SOURCE_TYPES, STOCK_SOURCE_LABELS, DEPARTMENT_OPTIONS, CATEGORY_OPTIONS, ADMIN_PAGE_SIZE } from "../../constants";
import { apiRequest, uploadImage } from "../../utils/api";
import { formatEnumLabel, formatColorwayLabel, getProductTypeOptions } from "../../utils/format";
import { getColorwayDetails, sanitizeColorways, normalizeColorwayValue } from "../../utils/colorway";
import { getSortedColorwaysFromStocks, buildSizeStateRows, getStockStorageGroup } from "../../utils/stock";
import { buildSizeSections, formatSelectedSizeLabel, getDefaultSizeGroup, getDepartmentForColorway, isUnisexDepartment } from "../../utils/sizePresentation";
import { buildDefaultProductDescription } from "../../utils/productDescription";
import "../../styles/admin.css";
import ConfirmActionModal from "./ConfirmActionModal";
import DeleteModal from "./DeleteModal";
import NewBrandModal from "./NewBrandModal";
import NewAdminModal from "./NewAdminModal";
import NewProductNameModal from "./NewProductNameModal";
import { getBrandSizeGuide, getGuideSectionForContext } from "../../utils/sizeGuide";

const RESERVATION_STATUS_OPTIONS = [
  { value: "ORDERED", label: "Ordered" },
  { value: "PREPARING", label: "Preparing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" }
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

function normalizeReservationStatus(status) {
  return status === "RESERVED" ? "ORDERED" : status;
}

function statusChipClass(status) {
  const normalized = normalizeReservationStatus(status);
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

const PHP_CURRENCY = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function formatPriceLabel(value) {
  if (value === null || value === undefined || value === "") {
    return "No Price";
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "No Price";
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
    quantityChange: 1,
    stockSourceType: "ON_HAND",
    price: ""
  });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [undoQueue, setUndoQueue] = useState([]);
  const [undoNow, setUndoNow] = useState(Date.now());
  const [productActionModal, setProductActionModal] = useState({ type: null, productId: "" });
  const [productImageFile, setProductImageFile] = useState(null);
  const [editProductImageFile, setEditProductImageFile] = useState(null);
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
  const [productImageColorway, setProductImageColorway] = useState("DEFAULT");
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
  const [reservationSavedMap, setReservationSavedMap] = useState({});
  const reservationSavedTimersRef = useRef({});
  const [adminPage, setAdminPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null, confirmCode: "", userInput: "" });
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
  const [isStockGuideOpen, setIsStockGuideOpen] = useState(false);
  const [isStockSummaryOpen, setIsStockSummaryOpen] = useState(false);
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
      price: preferredRow?.price ?? rows[0]?.price ?? null
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
  const adminColorwayOptions = useMemo(() => {
    const selectedProduct = products.find((product) => String(product.id) === String(stockForm.productId));
    return getProductColorways(selectedProduct);
  }, [products, stockForm.productId]);
  const createImageColorwayOptions = useMemo(
    () =>
      [...new Set(["DEFAULT", ...sanitizeColorways([productForm.mainColor, ...Object.keys(productForm.colorwayImages || {})]).map(normalizeColorwayValue)])],
    [productForm.mainColor, productForm.colorwayImages]
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
    return [...new Set([...fromProducts, ...savedBrands])].sort();
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
    console.log("Delete clicked for product:", productId);
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
      setMessage("Product deleted successfully.");
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
      await apiRequest("/api/admin/brands", "POST", { name: trimmedName }, token);
      setSavedBrands((prev) => [...prev, trimmedName].sort());
      setProductForm({ ...productForm, brand: trimmedName });
      setNewBrandModal({ isOpen: false, brandName: "" });
      setMessage(`Brand "${trimmedName}" saved.`);
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
      setSavedBrands((prev) => prev.filter((brand) => brand.toLowerCase() !== trimmedName.toLowerCase()));
      setProductForm((prev) => (prev.brand.toLowerCase() === trimmedName.toLowerCase() ? { ...prev, brand: "" } : prev));
      setEditProductForm((prev) => (prev.brand.toLowerCase() === trimmedName.toLowerCase() ? { ...prev, brand: "" } : prev));
      pushUndoEntry("brand", trimmedName, `Brand "${trimmedName}" deleted.`);
      setMessage("Delete completed. Undo available below.");
    } catch (err) {
      setMessage("Failed to delete brand: " + err.message);
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
      setMessage(`Product name "${trimmedName}" saved.`);
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
        await apiRequest("/api/admin/brands", "POST", { name: entry.value }, token);
        setSavedBrands((prev) => [...new Set([...prev, entry.value])].sort());
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
    setMessage("Product created.");
    await loadAdminData(token, adminRole);
  };

  const uploadProductImage = async () => {
    if (!productImageFile) {
      throw new Error("Please choose an image file first.");
    }
    const data = await uploadImage("/api/admin/media/product-image", productImageFile, token);
    const targetColorway = normalizeColorwayValue(productImageColorway || productForm.mainColor);
    setProductForm((prev) => ({
      ...prev,
      colorwayImages: { ...(prev.colorwayImages || {}), [targetColorway]: data.url }
    }));
    setMessage(`Product image uploaded for ${formatColorwayLabel(targetColorway)}. Save Product to apply it.`);
  };


  const uploadEditProductImage = async () => {
    if (!editProductImageFile) {
      throw new Error("Please choose an image file first.");
    }
    if (!editProductId) {
      throw new Error("Please choose a product first.");
    }
    const data = await uploadImage("/api/admin/media/product-image", editProductImageFile, token);
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
    setMessage(`Image updated for ${formatColorwayLabel(targetColorway)}.`);
    await loadAdminData(token, adminRole);
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
    setMessage("Product updated.");
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
    setMessage(`Colorway "${colorwayLabel}" deleted.`);
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
    if (!createImageColorwayOptions.includes(productImageColorway)) {
      setProductImageColorway(createImageColorwayOptions[0] || "DEFAULT");
    }
  }, [createImageColorwayOptions, productImageColorway]);


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

  const adjustStock = async (mode) => {
    const requestedQuantity = Number(stockForm.quantityChange);
    const parsedPrice = Number(stockForm.price);
    const hasPriceInput = String(stockForm.price).trim() !== "";

    if (mode === "price") {
      if (!hasPriceInput || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
        throw new Error("Enter a valid size price (0 or higher).");
      }
    } else if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      throw new Error("Enter a stock quantity of at least 1.");
    }

    const quantityChange = mode === "price"
      ? 0
      : (mode === "remove" ? -requestedQuantity : requestedQuantity);

    await apiRequest(
      `/api/admin/products/${stockForm.productId}/stocks`,
      "POST",
      {
        colorway: stockForm.colorway,
        size: stockForm.size,
        sizeGroup: getStockStorageGroup(stockModalDepartment, activeStockSizeGroup),
        quantityChange,
        stockSourceType: stockForm.stockSourceType,
        price: hasPriceInput ? Number(parsedPrice.toFixed(2)) : null
      },
      token
    );
    // Preserve selected size and group so user can continue adjusting same size
    setStockForm((prev) => ({
      ...prev,
      size: prev.size,
      sizeGroup: prev.sizeGroup,
      quantityChange: 1,
      stockSourceType: prev.stockSourceType,
      price: prev.price
    }));
    if (mode === "price") {
      setMessage(`Size price saved: ${formatPriceLabel(parsedPrice)}.`);
    } else {
      setMessage(mode === "remove" ? "Stock removed." : "Stock added.");
    }
    await loadAdminData(token, adminRole);
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
    setMessage("New admin user added.");
    await loadAdminData(token, adminRole);
  };

  const setAdminUserStatus = async (userId, enabled) => {
    if (!isSuperAdmin) {
      throw new Error("Only SUPER_ADMIN can update admin users.");
    }
    const action = enabled ? "enable" : "disable";
    await apiRequest(`/api/admin/users/admins/${userId}/${action}`, "PATCH", undefined, token);
    setMessage(`Admin user ${enabled ? "enabled" : "disabled"}.`);
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
        return next;
      }));
      markReservationSaved(orderId, savedField);
      if (successMessage) {
        setMessage(successMessage);
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
    setProductImageColorway("DEFAULT");
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
    setStockForm((prev) => ({
      ...prev,
      productId: String(productId),
      colorway: nextColorway,
      size: preferredSelection.size,
      sizeGroup: preferredSelection.sizeGroup || getDefaultSizeGroup(nextDepartment),
      quantityChange: 1,
      stockSourceType: "ON_HAND",
      price: preferredSelection.price === null || preferredSelection.price === undefined ? "" : String(preferredSelection.price)
    }));
    const shouldAutoOpenGuide = !hasStockGuideOnboardingShown && Boolean(getBrandSizeGuide(selectedProduct?.brand));
    setIsStockGuideOpen(shouldAutoOpenGuide);
    if (shouldAutoOpenGuide) {
      setHasStockGuideOnboardingShown(true);
      localStorage.setItem("adminStockGuideOnboardingShown", "1");
    }
    setIsStockSummaryOpen(false);
    setProductActionModal({ type: "stock", productId: String(productId) });
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
  const selectedStockSourceQuantity = useMemo(() => {
    if (!selectedStockRow) {
      return 0;
    }
    if (stockForm.stockSourceType === "IN_TRANSIT") {
      return selectedStockRow.inTransit;
    }
    if (stockForm.stockSourceType === "PRE_ORDER") {
      return selectedStockRow.preOrder;
    }
    return selectedStockRow.onHand;
  }, [selectedStockRow, stockForm.stockSourceType]);

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
  const stockGuideSection = useMemo(
    () => getGuideSectionForContext(stockSizeGuide, { sizeGroup: activeStockSizeGroup, department: stockModalDepartment }),
    [stockSizeGuide, activeStockSizeGroup, stockModalDepartment]
  );
  const activeStockRows = useMemo(() => {
    if (!activeStockSizeSection?.rows) return [];
    return activeStockSizeSection.rows;
  }, [activeStockSizeSection]);
  const stockSummaryTotals = useMemo(() => activeStockRows.reduce((acc, row) => ({
    onHand: acc.onHand + (row.onHand || 0),
    inTransit: acc.inTransit + (row.inTransit || 0),
    preOrder: acc.preOrder + (row.preOrder || 0),
    total: acc.total + (row.total || 0)
  }), {
    onHand: 0,
    inTransit: 0,
    preOrder: 0,
    total: 0
  }), [activeStockRows]);
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
    const deliveredCount = orders.filter((order) => normalizeReservationStatus(order.status) === "DELIVERED").length;
    const totalSalesAll = orders.reduce((sum, order) => {
      const parsed = Number(order.totalPrice);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return sum;
      }
      return sum + parsed;
    }, 0);
    const totalSalesDelivered = orders.reduce((sum, order) => {
      if (normalizeReservationStatus(order.status) !== "DELIVERED") {
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
      deliveredCount,
      totalSalesAll,
      totalSalesDelivered,
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
    const exactStock = (product.stocks || []).find((stock) => (
      String(stock.colorway || "").toUpperCase() === String(item.colorway || "").toUpperCase()
      && String(stock.size) === String(item.size)
      && String(stock.sizeGroup || "").toUpperCase() === String(item.sizeGroup || "").toUpperCase()
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
                        data-tooltip="Stock"
                        aria-label="Open stock manager"
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
              <p>Total Sales (Delivered only)</p>
              <h3>{formatPriceLabel(reservationStats.totalSalesDelivered)}</h3>
            </article>
            <article className="admin-summary-card">
              <p>Total Sales (All reservations)</p>
              <h3>{formatPriceLabel(reservationStats.totalSalesAll)}</h3>
            </article>
            <article className="admin-summary-card">
              <p>Shipped</p>
              <h3>{reservationStats.shippedCount}</h3>
            </article>
            <article className="admin-summary-card">
              <p>Delivered</p>
              <h3>{reservationStats.deliveredCount}</h3>
            </article>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isAdminLoading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <tr key={`reservation-loading-${index}`}>
                      <td colSpan="9"><div className="skeleton-line" /></td>
                    </tr>
                  ))
                ) : filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan="9">No reservations found.</td>
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
                              <strong>{item.productName}</strong>
                              <span>
                                {formatColorwayLabel(item.colorway)} · {item.sizeGroup === "WOMEN" ? "Women" : "Men"} US {item.size} · Qty {item.quantity}
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
                              <span className={`order-status-chip reservation-final-chip ${hasOrderPrice ? "status-delivered" : "status-ordered"}`}>
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
            <div className="breakdown-header">
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
                      <span className="image-upload-field-label">Colorway target</span>
                      <select value={productImageColorway} onChange={(e) => setProductImageColorway(e.target.value)}>
                        {createImageColorwayOptions.map((colorway) => (
                          <option key={`create-image-${colorway}`} value={colorway}>
                            {colorway === "DEFAULT" ? "Main Color (Default)" : formatColorwayLabel(colorway)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="image-upload-section">
                      <input
                        id="create-product-image-file"
                        className="sr-only-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        onChange={(e) => setProductImageFile(e.target.files?.[0] || null)}
                      />
                      <span className="image-upload-field-label">Image file</span>
                      <label htmlFor="create-product-image-file" className="image-upload-trigger-enterprise">
                        <ImagePlus size={16} />
                        <span>{productImageFile ? "Change Image File" : "Choose Product Image"}</span>
                      </label>
                      <div className="image-upload-meta-row">
                        <small className="field-hint image-upload-name">
                          {productImageFile
                            ? `${productImageFile.name} · ${formatFileSize(productImageFile.size)} · ${getFileFormatLabel(productImageFile)}`
                            : "No file selected"}
                        </small>
                        <button
                          type="button"
                          className="image-upload-submit-btn"
                          onClick={() => uploadProductImage().catch((err) => setMessage(err.message))}
                          disabled={!productImageFile}
                        >
                          Upload Product Image
                        </button>
                      </div>
                      <small className="field-hint image-upload-note">Supported formats: JPG/PNG/WEBP/GIF/AVIF (max 5MB).</small>
                    </div>
                  </div>
                </div>
                {(productForm.colorwayImages?.[normalizeColorwayValue(productImageColorway)] || productForm.imageUrl)
                  ? (
                    <img
                      className="logo-preview"
                      src={productForm.colorwayImages?.[normalizeColorwayValue(productImageColorway)] || productForm.imageUrl}
                      alt="Product preview"
                    />
                    )
                  : null}
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
                  <p className="field-hint">Image preview follows the selected colorway target in real time.</p>
                  <div className="row">
                    <input
                      placeholder="Image URL"
                      value={editProductForm.imageUrl}
                      onChange={(e) => setEditProductForm({ ...editProductForm, imageUrl: e.target.value })}
                    />
                  </div>
                  <div className="row">
                    <select value={editImageColorway} disabled>
                      {editImageColorwayOptions.map((colorway) => (
                        <option key={`edit-image-${colorway}`} value={colorway}>
                          {formatColorwayLabel(colorway)}
                        </option>
                      ))}
                    </select>
                    <input
                      id="edit-product-image-file"
                      className="sr-only-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      onChange={(e) => setEditProductImageFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="edit-product-image-file" className="image-upload-trigger-enterprise">
                      <ImagePlus size={16} />
                      <span>{editProductImageFile ? "Change Image File" : "Choose Product Image"}</span>
                    </label>
                    <div className="image-upload-meta-row">
                      <small className="field-hint image-upload-name">
                        {editProductImageFile
                          ? `${editProductImageFile.name} · ${formatFileSize(editProductImageFile.size)} · ${getFileFormatLabel(editProductImageFile)}`
                          : "No file selected"}
                      </small>
                      <button
                        type="button"
                        className="image-upload-submit-btn"
                        onClick={() => uploadEditProductImage().catch((err) => setMessage(err.message))}
                        disabled={!editProductImageFile}
                      >
                        Upload New Image
                      </button>
                    </div>
                    <small className="field-hint image-upload-note">Supported formats: JPG/PNG/WEBP/GIF/AVIF (max 5MB).</small>
                  </div>
                  {(editProductForm.colorwayImages?.[normalizeColorwayValue(editImageColorway)] || editProductForm.imageUrl)
                    ? (
                      <img
                        className="logo-preview"
                        src={editProductForm.colorwayImages?.[normalizeColorwayValue(editImageColorway)] || editProductForm.imageUrl}
                        alt="Edit product preview"
                      />
                      )
                    : null}
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
              </div>
            ) : null}

            {productActionModal.type === "stock" ? (
              <>
                <p className="field-hint">Choose colorway/size, set quantity or price, then run the matching action below.</p>
                {stockModalProduct ? (
                  <p className="field-hint stock-size-selection-note">
                    Product: <strong>{`${stockModalProduct.brand || ""} ${stockModalProduct.name || ""}`.trim() || `#${stockModalProduct.id}`}</strong>
                  </p>
                ) : null}
                <section className="stock-controls-card">
                  <div className="stock-controls-grid">
                    <label className="stock-field">
                      <span className="stock-field-label">Colorway</span>
                      <select value={stockForm.colorway} onChange={(e) => setStockForm({ ...stockForm, colorway: e.target.value })}>
                        {adminColorwayOptions.map((colorway) => (
                          <option key={colorway} value={colorway}>
                            {formatColorwayLabel(colorway)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="stock-field">
                      <span className="stock-field-label">Stock source</span>
                      <select
                        value={stockForm.stockSourceType}
                        onChange={(e) => setStockForm({ ...stockForm, stockSourceType: e.target.value })}
                      >
                        {STOCK_SOURCE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {STOCK_SOURCE_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </label>

                    {isUnisexDepartment(stockModalDepartment) ? (
                      <label className="stock-field">
                        <span className="stock-field-label">Size view</span>
                        <select value={activeStockSizeGroup} onChange={(e) => handleStockSizeGroupChange(e.target.value)}>
                          {stockSizeSections.map((section) => (
                            <option key={`stock-group-${section.key}`} value={section.key}>
                              {section.key === "WOMEN" ? "Women's size group" : "Men's size group"}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <label className="stock-field">
                      <span className="stock-field-label">Size</span>
                      <select
                        value={stockForm.size}
                        onChange={(e) => setStockForm({ ...stockForm, size: e.target.value, sizeGroup: activeStockSizeGroup })}
                      >
                        {activeStockRows.length === 0 ? (
                          <option value={stockForm.size}>US {stockForm.size}</option>
                        ) : (
                          activeStockRows.map((row) => (
                            <option key={`stock-size-${activeStockSizeGroup}-${row.baseSize}`} value={row.baseSize}>
                              US {row.displaySize}
                            </option>
                          ))
                        )}
                      </select>
                    </label>

                    <label className="stock-field">
                      <span className="stock-field-label">Quantity change</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="ex: 2"
                        value={stockForm.quantityChange}
                        onChange={(e) => setStockForm({ ...stockForm, quantityChange: Number(e.target.value) || 0 })}
                      />
                    </label>

                    <label className="stock-field">
                      <span className="stock-field-label">Size price (PHP)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="ex: 5699"
                        value={stockForm.price}
                        onChange={(e) => setStockForm({ ...stockForm, price: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="stock-action-cluster">
                    <button
                      type="button"
                      className="stock-mode-toggle stock-mode-add"
                      onClick={() => adjustStock("add").catch((err) => setMessage(err.message))}
                    >
                      + Add Stock
                    </button>
                    <button
                      type="button"
                      className="stock-mode-toggle stock-mode-remove"
                      onClick={() => adjustStock("remove").catch((err) => setMessage(err.message))}
                    >
                      − Remove Stock
                    </button>
                    <button
                      type="button"
                      className="stock-mode-toggle stock-mode-price"
                      onClick={() => adjustStock("price").catch((err) => setMessage(err.message))}
                    >
                      Save Size Price
                    </button>
                  </div>
                </section>

                <div className="stock-meta-list">
                  <p className="field-hint stock-size-selection-note">
                    Selected size: <strong>{selectedStockSizeLabel || `US ${stockForm.size}`}</strong>
                    {isUnisexDepartment(stockModalDepartment) ? ` · ${activeStockSizeGroup === "WOMEN" ? "women's" : "men's"} stock group` : ""}
                  </p>
                  <p className="field-hint stock-size-selection-note">
                    Current {STOCK_SOURCE_LABELS[stockForm.stockSourceType]}: <strong>{selectedStockSourceQuantity}</strong>
                    {selectedStockRow ? ` · Total: ${selectedStockRow.total}` : ""}
                  </p>
                  {stockForm.price !== "" ? (
                    <p className="field-hint stock-size-selection-note">
                      Selected size price: <strong>{formatPriceLabel(stockForm.price)}</strong>
                    </p>
                  ) : null}
                </div>
                <p className="field-hint stock-size-guide-helper">
                  Tip: Check the brand size guide before updating stock so sizes stay accurate.
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setIsStockSummaryOpen(true)}
                  >
                    View Stock Summary
                  </button>
                </div>
                {stockSizeGuide && stockGuideSection ? (
                  <button type="button" className="button-secondary stock-size-guide-cta" onClick={() => setIsStockGuideOpen(true)}>
                    <Ruler size={16} />
                    <span>Open Size Guide</span>
                  </button>
                ) : null}
              </>
            ) : null}
            <p className="message">{message}</p>
          </section>
        </div>
      ) : null}

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

      {isStockSummaryOpen && productActionModal.type === "stock" ? (
        <div className="modal-overlay" onClick={() => setIsStockSummaryOpen(false)}>
          <section className="modal-panel stock-summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="breakdown-header">
              <h2>
                Stock Summary - {formatColorwayLabel(stockForm.colorway)}
                {isUnisexDepartment(stockModalDepartment) ? ` (${activeStockSizeGroup === "WOMEN" ? "Women's" : "Men's"})` : ""}
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close stock summary"
                onClick={() => setIsStockSummaryOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>US Size</th>
                    <th>On-hand</th>
                    <th>In-transit</th>
                    <th>Pre-order</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStockRows.map((row) => (
                    <tr key={`stock-summary-${activeStockSizeGroup}-${row.baseSize}`}>
                      <td>US {row.displaySize}</td>
                      <td>{row.onHand}</td>
                      <td>{row.inTransit}</td>
                      <td>{row.preOrder}</td>
                      <td>{row.total}</td>
                    </tr>
                  ))}
                  <tr>
                    <td><strong>Total</strong></td>
                    <td><strong>{stockSummaryTotals.onHand}</strong></td>
                    <td><strong>{stockSummaryTotals.inTransit}</strong></td>
                    <td><strong>{stockSummaryTotals.preOrder}</strong></td>
                    <td><strong>{stockSummaryTotals.total}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
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


      <NewBrandModal
        newBrandModal={newBrandModal}
        setNewBrandModal={setNewBrandModal}
        addNewBrand={addNewBrand}
        savedBrands={savedBrands}
        deleteSavedBrand={deleteSavedBrand}
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
