import { useEffect, useMemo, useState } from "react";
import { Boxes, RotateCcw, ShieldCheck, ShieldX, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { US_SIZES, COLORWAY_OPTIONS, STOCK_SOURCE_TYPES, STOCK_SOURCE_LABELS, DEPARTMENT_OPTIONS, CATEGORY_OPTIONS, ADMIN_PAGE_SIZE } from "../../constants";
import { apiRequest, uploadImage } from "../../utils/api";
import { formatEnumLabel, formatColorwayLabel, getProductTypeOptions } from "../../utils/format";
import { getColorwayDetails, sanitizeColorways, normalizeColorwayValue } from "../../utils/colorway";
import { getSortedColorwaysFromStocks, buildSizeStateRows, getStockStorageGroup } from "../../utils/stock";
import { buildSizeSections, formatSelectedSizeLabel, getDefaultSizeGroup, getDepartmentForColorway, isUnisexDepartment } from "../../utils/sizePresentation";
import { buildDefaultProductDescription } from "../../utils/productDescription";
import "../../styles/admin.css";
import DeleteModal from "./DeleteModal";
import ConfirmActionModal from "./ConfirmActionModal";
import NewBrandModal from "./NewBrandModal";
import NewAdminModal from "./NewAdminModal";
import NewProductNameModal from "./NewProductNameModal";

const RESERVATION_STATUS_OPTIONS = [
  { value: "ORDERED", label: "Ordered" },
  { value: "PREPARING", label: "Preparing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" }
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
    colorwayImages: {},
    description: ""
  });
  const [stockForm, setStockForm] = useState({
    productId: "",
    colorway: COLORWAY_OPTIONS[0],
    size: US_SIZES[0],
    sizeGroup: "MEN",
    quantityChange: 1,
    stockSourceType: "ON_HAND"
  });
  const [stockAction, setStockAction] = useState("add");
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
  const [adminPage, setAdminPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null, confirmCode: "", userInput: "" });
  const [colorwayDeleteModal, setColorwayDeleteModal] = useState({ isOpen: false, colorway: "DEFAULT" });
  const [newBrandModal, setNewBrandModal] = useState({ isOpen: false, brandName: "" });
  const [newAdminModal, setNewAdminModal] = useState({ isOpen: false });
  const [newProductNameModal, setNewProductNameModal] = useState({ isOpen: false, productName: "" });
  const [savedBrands, setSavedBrands] = useState([]);
  const [savedProductNames, setSavedProductNames] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [newAdminForm, setNewAdminForm] = useState({ username: "", password: "", role: "ADMIN" });
  const [activeAdminSection, setActiveAdminSection] = useState("products");
  const [isCreateDescriptionEdited, setIsCreateDescriptionEdited] = useState(false);

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

   const adminSections = useMemo(
      () => [
        { key: "products", label: "Products" },
        { key: "reservations", label: "Reservations" },
        ...(isSuperAdmin ? [{ key: "users", label: "Admin Users" }] : [])
      ],
      [isSuperAdmin]
    );
  const adminColorwayOptions = useMemo(() => {
    const dynamicColorways =
      products.find((product) => String(product.id) === String(stockForm.productId))?.stocks?.map((stock) => stock.colorway) || [];
    return sanitizeColorways([...COLORWAY_OPTIONS, ...dynamicColorways]);
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
    await apiRequest("/api/admin/products", "POST", { ...productForm, active: true }, token);
    setProductForm({
      name: "",
      brand: "",
      mainColor: "",
      department: "UNISEX",
      category: "FOOTWEAR",
      productType: "LIFESTYLE_SNEAKERS",
      imageUrl: "",
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

  const closeCreateColorwayDeleteModal = () => {
    setColorwayDeleteModal({ isOpen: false, colorway: "DEFAULT" });
  };

  const removeCreateColorway = () => {
    const targetColorway = normalizeColorwayValue(productImageColorway || productForm.mainColor);
    if (targetColorway === "DEFAULT") {
      setMessage("DEFAULT colorway cannot be removed.");
      return;
    }
    setColorwayDeleteModal({ isOpen: true, colorway: targetColorway });
  };

  const confirmRemoveCreateColorway = () => {
    const targetColorway = normalizeColorwayValue(colorwayDeleteModal.colorway);
    if (targetColorway === "DEFAULT") {
      closeCreateColorwayDeleteModal();
      setMessage("DEFAULT colorway cannot be removed.");
      return;
    }

    const nextImages = { ...(productForm.colorwayImages || {}) };
    const hadDraftImage = Object.prototype.hasOwnProperty.call(nextImages, targetColorway);
    delete nextImages[targetColorway];
    setProductForm((prev) => ({
      ...prev,
      colorwayImages: nextImages
    }));
    if (productImageColorway === targetColorway) {
      setProductImageColorway("DEFAULT");
    }
    closeCreateColorwayDeleteModal();
    setMessage(
      hadDraftImage
        ? `Removed ${formatColorwayLabel(targetColorway)} from draft colorways.`
        : `Cleared ${formatColorwayLabel(targetColorway)} selection (no draft image was attached).`
    );
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
        productType: editProductForm.productType
      },
      token
    );
    setMessage("Product updated.");
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

  const adjustStock = async () => {
    const requestedQuantity = Number(stockForm.quantityChange);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      throw new Error("Enter a stock quantity of at least 1.");
    }

    const quantityChange = stockAction === "remove" ? -requestedQuantity : requestedQuantity;

    await apiRequest(
      `/api/admin/products/${stockForm.productId}/stocks`,
      "POST",
      {
        colorway: stockForm.colorway,
        size: stockForm.size,
        sizeGroup: getStockStorageGroup(stockModalDepartment, activeStockSizeGroup),
        quantityChange,
        stockSourceType: stockForm.stockSourceType
      },
      token
    );
    // Preserve selected size and group so user can continue adjusting same size
    setStockForm((prev) => ({
      ...prev,
      size: prev.size,
      sizeGroup: prev.sizeGroup,
      quantityChange: 1,
      stockSourceType: prev.stockSourceType
    }));
    setMessage(stockAction === "remove" ? "Stock removed." : "Stock added.");
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

  const updateReservationStatus = async (orderId, status) => {
    await apiRequest(`/api/admin/orders/${orderId}/status`, "PATCH", { status }, token);
    setMessage("Reservation status updated.");
    await loadAdminData(token, adminRole);
  };

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
    setStockForm((prev) => ({
      ...prev,
      productId: String(productId),
      colorway: nextColorway,
      size: US_SIZES[0],
      sizeGroup: getDefaultSizeGroup(nextDepartment),
      quantityChange: 1,
      stockSourceType: "ON_HAND"
    }));
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
  const handleStockSizeGroupChange = (nextSizeGroup) => {
    const targetSection = stockSizeSections.find((section) => section.key === nextSizeGroup);
    const hasCurrentSize = targetSection?.rows?.some((row) => row.baseSize === stockForm.size);
    const fallbackSize = (targetSection?.rows?.find((row) => row.total > 0) || targetSection?.rows?.[0])?.baseSize || stockForm.size;
    setStockForm({
      ...stockForm,
      sizeGroup: nextSizeGroup,
      size: hasCurrentSize ? stockForm.size : fallbackSize
    });
  };

  useEffect(() => {
    if (!stockModalProduct || stockSizeSections.length === 0) {
      return;
    }

    const activeSection = stockSizeSections.find((section) => section.key === activeStockSizeGroup) || stockSizeSections[0];
    const availableRows = activeSection?.rows || [];
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
  }, [stockModalProduct, stockSizeSections, stockModalDepartment, stockForm.size, stockForm.sizeGroup, activeStockSizeGroup]);

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
      activeProducts,
      lowStockSizes
    };
  }, [orders, products]);

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
                        aria-label="Open stock and breakdown"
                        onClick={(event) => {
                          event.stopPropagation();
                          openStockModal(product.id, selectedColorway);
                        }}
                      >
                        <Boxes size={15} />
                        <span className="admin-action-label">Stock &amp; Breakdown</span>
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
        <div className="pagination-bar card" style={{ marginTop: '8px' }}>
          <div className="pagination-numbers">
            <button
              type="button"
              className="page-number-btn page-nav-btn"
              disabled={adminPage === 1}
              onClick={() => setAdminPage((prev) => Math.max(1, prev - 1))}
              aria-label="Previous page"
            >
              ‹
            </button>
            {adminPaginationItems.map((item) =>
              item.type === "ellipsis" ? (
                <span key={item.value} className="page-ellipsis">…</span>
              ) : (
                <button
                  key={item.value}
                  type="button"
                  className={`page-number-btn ${adminPage === item.value ? "active" : ""}`}
                  onClick={() => setAdminPage(item.value)}
                  aria-label={`Page ${item.value}`}
                  aria-current={adminPage === item.value ? "page" : undefined}
                >
                  {item.value}
                </button>
              )
            )}
            <button
              type="button"
              className="page-number-btn page-nav-btn"
              disabled={adminPage === adminTotalPages}
              onClick={() => setAdminPage((prev) => Math.min(adminTotalPages, prev + 1))}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
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
                {productActionModal.type === "stock" ? "Stock & Breakdown" : null}
              </h2>
              <button type="button" className="modal-close-btn" onClick={() => setProductActionModal({ type: null, productId: "" })}>
                ✕
              </button>
            </div>

            {productActionModal.type === "create" ? (
              <>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <select
                    value={productForm.name}
                    onChange={(e) => {
                      if (e.target.value === "@@ADD_NEW_NAME@@") {
                        setNewProductNameModal({ isOpen: true, productName: "" });
                      } else {
                        setProductForm({ ...productForm, name: e.target.value });
                      }
                    }}
                    style={{ flex: 1, marginTop: 0 }}
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
                    style={{ width: "auto", whiteSpace: "nowrap", marginTop: 0 }}
                    onClick={() => setNewProductNameModal({ isOpen: true, productName: "" })}
                  >
                    Manage Names
                  </button>
                </div>
                <div className="row">
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                      value={productForm.brand}
                      onChange={(e) => {
                        if (e.target.value === "@@ADD_NEW@@") {
                          setNewBrandModal({ isOpen: true, brandName: "" });
                        } else {
                          setProductForm({ ...productForm, brand: e.target.value });
                        }
                      }}
                      style={{ flex: 1, marginTop: 0 }}
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
                      style={{ width: "auto", whiteSpace: "nowrap", marginTop: 0 }}
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
                </div>
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
                <div className="row">
                  <input
                    placeholder="Image URL"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  />
                </div>
                <div className="row">
                  <select value={productImageColorway} onChange={(e) => setProductImageColorway(e.target.value)}>
                    {createImageColorwayOptions.map((colorway) => (
                      <option key={`create-image-${colorway}`} value={colorway}>
                        {formatColorwayLabel(colorway)}
                      </option>
                    ))}
                  </select>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(e) => setProductImageFile(e.target.files?.[0] || null)} />
                  <small className="field-hint">📐 Recommended: <strong>800×800px</strong> square image (JPG/PNG/WEBP/AVIF, max 5MB) for best display.</small>
                  <button type="button" onClick={() => uploadProductImage().catch((err) => setMessage(err.message))}>
                    Upload Product Image
                  </button>
                  <button
                    type="button"
                    className="button-secondary remove-colorway-btn"
                    onClick={removeCreateColorway}
                    disabled={normalizeColorwayValue(productImageColorway || productForm.mainColor) === "DEFAULT"}
                  >
                    Remove Selected Colorway
                  </button>
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
                <input
                  placeholder="Description"
                  value={productForm.description}
                  onChange={(e) => {
                    setIsCreateDescriptionEdited(true);
                    setProductForm({ ...productForm, description: e.target.value });
                  }}
                />
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
                  onClick={() =>
                    createProduct()
                      .then(() => setProductActionModal({ type: null, productId: "" }))
                      .catch((err) => setMessage(err.message))
                  }
                >
                  Save Product
                </button>
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
                  <p className="field-hint">These fields apply to the whole product.</p>
                  <input
                    placeholder="Name"
                    value={editProductForm.name}
                    onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
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
                  <p className="field-hint">Department, category, type, and description save only for the selected colorway.</p>
                  <div className="row">
                    <select value={editDetailColorway} onChange={(e) => setEditDetailColorway(e.target.value)}>
                      {editDetailColorwayOptions.map((colorway) => (
                        <option key={`edit-details-${colorway}`} value={colorway}>
                          Details: {formatColorwayLabel(colorway)}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(e) => setEditProductImageFile(e.target.files?.[0] || null)} />
                    <small className="field-hint">📐 Recommended: <strong>800×800px</strong> square (JPG/PNG/WEBP/AVIF, max 5MB).</small>
                    <button type="button" onClick={() => uploadEditProductImage().catch((err) => setMessage(err.message))}>
                      Upload New Image
                    </button>
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
                <p className="field-hint">Choose a colorway, size view, and stock source, then add or remove stock from the selected size.</p>
                <div className="row">
                  <button
                    type="button"
                    className={`stock-mode-toggle ${stockAction === "add" ? "active" : ""}`}
                    onClick={() => setStockAction("add")}
                  >
                    + Add Stock
                  </button>
                  <button
                    type="button"
                    className={`stock-mode-toggle ${stockAction === "remove" ? "active" : ""}`}
                    onClick={() => setStockAction("remove")}
                  >
                    − Remove Stock
                  </button>
                </div>
                <div className="row">
                  <select value={stockForm.colorway} onChange={(e) => setStockForm({ ...stockForm, colorway: e.target.value })}>
                    {adminColorwayOptions.map((colorway) => (
                      <option key={colorway} value={colorway}>
                        {colorway}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="qty"
                    value={stockForm.quantityChange}
                    onChange={(e) => setStockForm({ ...stockForm, quantityChange: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="stock-size-picker">
                  <p className="field-hint stock-size-selection-note">
                    Selected size: <strong>{selectedStockSizeLabel || `US ${stockForm.size}`}</strong>
                    {isUnisexDepartment(stockModalDepartment) ? ` · stored in ${activeStockSizeGroup === "WOMEN" ? "women's" : "men's"} unisex stock` : ""}
                  </p>
                  {isUnisexDepartment(stockModalDepartment) ? (
                    <p className="field-hint stock-size-selection-note">
                      Men&apos;s and women&apos;s unisex sizes are tracked separately.
                    </p>
                  ) : null}
                  <p className="field-hint stock-size-selection-note">
                    Current {STOCK_SOURCE_LABELS[stockForm.stockSourceType]}: <strong>{selectedStockSourceQuantity}</strong>
                    {selectedStockRow ? ` · Total: ${selectedStockRow.total}` : ""}
                  </p>
                  {isUnisexDepartment(stockModalDepartment) ? (
                    <div className="size-group-toggle" role="tablist" aria-label="Choose sizing view">
                      {stockSizeSections.map((section) => (
                        <button
                          key={section.key}
                          type="button"
                          role="tab"
                          aria-selected={activeStockSizeGroup === section.key}
                          className={`size-group-btn ${activeStockSizeGroup === section.key ? "active" : ""}`}
                          onClick={() => handleStockSizeGroupChange(section.key)}
                        >
                          {section.key === "WOMEN" ? "Women's" : "Men's"}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {activeStockSizeSection ? (
                    <div className="size-section-card">
                      {isUnisexDepartment(stockModalDepartment) ? <p className="size-section-heading">{activeStockSizeSection.label}</p> : null}
                      <div className="size-grid">
                        {activeStockSizeSection.rows.map((row) => (
                          <button
                            key={`${activeStockSizeSection.key}-${row.baseSize}`}
                            type="button"
                            className={`size-btn ${stockForm.size === row.baseSize && activeStockSizeGroup === activeStockSizeSection.key ? "active" : ""}`}
                            onClick={() => setStockForm({ ...stockForm, size: row.baseSize, sizeGroup: activeStockSizeSection.key })}
                          >
                            <span className="size-label">US {row.displaySize}</span>
                            <span className="size-stock">Total {row.total}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
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
                <button
                  onClick={() =>
                    adjustStock()
                      .catch((err) => setMessage(err.message))
                  }
                >
                  {stockAction === "remove" ? "Remove Stock" : "Add Stock"}
                </button>
                {stockModalProduct ? (
                  <div className="stock-breakdown-sections">
                    {activeStockSizeSection ? (
                      <div key={`breakdown-${activeStockSizeSection.key}`} className="stock-breakdown-panel modal-table-wrap">
                        {isUnisexDepartment(stockModalDepartment) ? <p className="size-section-heading">{activeStockSizeSection.label}</p> : null}
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
                            {activeStockSizeSection.rows.map((row) => (
                              <tr key={`${stockModalProduct.id}-${stockForm.colorway}-${activeStockSizeSection.key}-${row.baseSize}`}>
                                <td>US {row.displaySize}</td>
                                <td>{row.onHand}</td>
                                <td>{row.inTransit}</td>
                                <td>{row.preOrder}</td>
                                <td>{row.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="modal-table-wrap">
                        <table>
                          <tbody>
                            <tr>
                              <td>No size breakdown yet for this colorway.</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            ) : null}
            <p className="message">{message}</p>
          </section>
        </div>
      ) : null}

      {activeAdminSection === "reservations" ? (
      <section className="card products-card admin-section">
        <div className="section-head">
          <h2>Customer Reservations</h2>
        </div>
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <p>Total Reservations</p>
            <h3>{reservationStats.totalReservations}</h3>
          </article>
          <article className="admin-summary-card">
            <p>Preparing / Shipped</p>
            <h3>{reservationStats.preparingCount} / {reservationStats.shippedCount}</h3>
          </article>
          <article className="admin-summary-card">
            <p>Delivered</p>
            <h3>{reservationStats.deliveredCount}</h3>
          </article>
          <article className="admin-summary-card">
            <p>Low-stock Sizes</p>
            <h3>{reservationStats.lowStockSizes}</h3>
          </article>
          <article className="admin-summary-card">
            <p>Active Products</p>
            <h3>{reservationStats.activeProducts}</h3>
          </article>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Items</th>
                <th>Updated By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(isAdminLoading
                ? Array.from({ length: 6 }, (_, index) => ({ id: `order-loading-${index}` }))
                : orders
              ).map((order) => (
                <tr key={order.id}>
                  {isAdminLoading ? (
                    <td colSpan="6"><div className="skeleton-line" /></td>
                  ) : (
                    <>
                      <td>#{order.id}</td>
                      <td>{order.customerName}</td>
                      <td>{order.customerContact}</td>
                      <td>
                        {(order.items || [])
                          .map((item) => `${item.productName} (${item.colorway}, ${formatSelectedSizeLabel(item.size, item.sizeGroup === "WOMEN" ? "WOMEN" : "MEN", item.sizeGroup === "WOMEN" ? "UNISEX" : "")}) x${item.quantity}`)
                          .join(", ")}
                      </td>
                      <td>{order.statusUpdatedBy || "-"}</td>
                       <td>
                         <div className="reservation-status-cell">
                           <span className={`order-status-chip ${statusChipClass(order.status)}`}>
                             {normalizeReservationStatus(order.status)}
                           </span>
                           <select
                             className="reservation-status-select"
                             value={normalizeReservationStatus(order.status)}
                             onChange={(e) => updateReservationStatus(order.id, e.target.value).catch((err) => setMessage(err.message))}
                           >
                             {RESERVATION_STATUS_OPTIONS.map((option) => (
                               <option key={option.value} value={option.value}>
                                 {option.label}
                               </option>
                             ))}
                           </select>
                         </div>
                       </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      <DeleteModal
        deleteModal={deleteModal}
        setDeleteModal={setDeleteModal}
        confirmDelete={confirmDelete}
      />

      <ConfirmActionModal
        isOpen={colorwayDeleteModal.isOpen}
        title="Remove Draft Colorway"
        description="This removes the selected colorway from the current Add Product draft."
        targetLabel={formatColorwayLabel(colorwayDeleteModal.colorway)}
        confirmLabel="Remove Colorway"
        onCancel={closeCreateColorwayDeleteModal}
        onConfirm={confirmRemoveCreateColorway}
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
