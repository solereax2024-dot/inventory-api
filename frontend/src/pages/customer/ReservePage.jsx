import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye } from "lucide-react";
import { US_SIZES } from "../../constants";
import { apiRequest } from "../../utils/api";
import { getColorwayDetails, getColorwayImageUrl, normalizeColorwayValue } from "../../utils/colorway";
import { formatColorwayLabel, formatEnumLabel } from "../../utils/format";
import { getSortedColorwaysFromStocks } from "../../utils/stock";
import { buildSizeSections, formatSelectedSizeLabel, getDefaultSizeGroup, getDepartmentForColorway, isUnisexDepartment } from "../../utils/sizePresentation";
import { getBrandSizeGuide, getGuideSectionForContext } from "../../utils/sizeGuide";
import { getOrCreateViewSessionId, shouldTrackViewForScope } from "../../utils/viewSession";
import { PHP_CURRENCY, formatPriceDisplay } from "../../utils/price";
import { trackMetaEvent } from "../../utils/metaPixel";
import ProductCard from "../../components/ProductCard";

const ZOOM_LEVELS = [1, 2, 3];
const ZOOM_LABELS = ["Click to zoom", "2x · click for 3x", "3x · click to reset"];
const DESKTOP_BREAKPOINT = 901;
const DESKTOP_BASE_IMAGE_SCALE = 1;
const MOBILE_BASE_IMAGE_SCALE = 1;
const ENABLE_ONLINE_PAYMENT = String(import.meta.env.VITE_ENABLE_PAYMONGO_CHECKOUT || "").toLowerCase() === "true";
const CUSTOMER_MOP_OPTIONS = [
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "BPI", label: "BPI" },
  { value: "BDO", label: "BDO" },
  { value: "MARIBANK", label: "MariBank" },
  { value: "PAYMONGO", label: "PayMongo Checkout" },
  { value: "OTHER", label: "Other" }
];

export default function ReservePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { productId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successReference, setSuccessReference] = useState("");
  const [successOrderId, setSuccessOrderId] = useState(null);
  const [isPaymentRedirecting, setIsPaymentRedirecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [mobileOpenSection, setMobileOpenSection] = useState("size");
  const [entryColorway, setEntryColorway] = useState("");
  const [reserve, setReserve] = useState({
    customerName: "",
    customerContact: "",
    notes: "",
    mop: "",
    mopOther: "",
    colorway: "",
    size: String(US_SIZES[0]),
    sizeGroup: "MEN",
    quantity: 1
  });
  const [zoomIdx, setZoomIdx] = useState(0);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [baseImageScale, setBaseImageScale] = useState(() => (
    window.innerWidth >= DESKTOP_BREAKPOINT ? DESKTOP_BASE_IMAGE_SCALE : MOBILE_BASE_IMAGE_SCALE
  ));
  const imgWrapRef = useRef(null);
  const thumbnailRailRef = useRef(null);
  const relatedRailRef = useRef(null);
  const sizeSectionRef = useRef(null);
  const customerNameInputRef = useRef(null);
  const customerContactInputRef = useRef(null);
  const customerMopInputRef = useRef(null);
  const customerMopOtherInputRef = useRef(null);
  const trackedMetaViewRef = useRef("");
  const [thumbnailRailScrollRatio, setThumbnailRailScrollRatio] = useState(0);
  const [canScrollThumbnailRail, setCanScrollThumbnailRail] = useState(false);
  const [relatedRailScrollRatio, setRelatedRailScrollRatio] = useState(0);
  const [canScrollRelatedRail, setCanScrollRelatedRail] = useState(false);

  useEffect(() => {
    const updateScaleByViewport = () => {
      setBaseImageScale(window.innerWidth >= DESKTOP_BREAKPOINT ? DESKTOP_BASE_IMAGE_SCALE : MOBILE_BASE_IMAGE_SCALE);
    };
    window.addEventListener("resize", updateScaleByViewport);
    return () => window.removeEventListener("resize", updateScaleByViewport);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const selectedProduct = await apiRequest(`/api/public/products/${productId}`);
        if (cancelled) {
          return;
        }

        setProducts(selectedProduct ? [selectedProduct] : []);
        setIsLoading(false);

        apiRequest("/api/public/products")
          .then((data) => {
            if (cancelled) {
              return;
            }
            setProducts(Array.isArray(data) ? data : (selectedProduct ? [selectedProduct] : []));
          })
          .catch(() => {});
      } catch (err) {
        if (!cancelled) {
          setMessage(err.message);
          setIsLoading(false);
        }
      }
    };
    loadProducts().catch((err) => setMessage(err.message));

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const product = useMemo(
    () => products.find((p) => String(p.id) === String(productId)),
    [products, productId]
  );

  useEffect(() => {
    if (!product?.id || !reserve.colorway) {
      return;
    }
    const scopeKey = `product-${product.id}-${reserve.colorway}`;
    if (!shouldTrackViewForScope(scopeKey)) {
      return;
    }
    const sessionId = getOrCreateViewSessionId();
    apiRequest("/api/public/analytics/views/track", "POST", {
      sessionId,
      productId: Number(product.id),
      colorwayKey: reserve.colorway
    }).catch(() => {});
  }, [product?.id, reserve.colorway]);

  const colorways = useMemo(
    () => (product ? getSortedColorwaysFromStocks(product.stocks) : []),
    [product]
  );
  const prioritizedColorways = useMemo(() => {
    if (colorways.length === 0) return [];
    if (!entryColorway) return colorways;
    const matchingEntryColorway = colorways.find(
      (colorway) => normalizeColorwayValue(colorway) === normalizeColorwayValue(entryColorway)
    );
    if (!matchingEntryColorway) return colorways;
    return [matchingEntryColorway, ...colorways.filter((colorway) => colorway !== matchingEntryColorway)];
  }, [colorways, entryColorway]);
  const selectedDepartment = useMemo(
    () => getDepartmentForColorway(product, reserve.colorway),
    [product, reserve.colorway]
  );
  const selectedColorwayDetails = useMemo(
    () => getColorwayDetails(product, reserve.colorway),
    [product, reserve.colorway]
  );
  const defaultSizeGroup = useMemo(
    () => getDefaultSizeGroup(selectedDepartment),
    [selectedDepartment]
  );
  const sizeSections = useMemo(
    () => buildSizeSections(product, reserve.colorway),
    [product, reserve.colorway]
  );
  const activeSizeGroup = isUnisexDepartment(selectedDepartment)
    ? (reserve.sizeGroup === "WOMEN" ? "WOMEN" : "MEN")
    : defaultSizeGroup;
  const activeSizeSection = useMemo(
    () => sizeSections.find((section) => section.key === activeSizeGroup) || sizeSections[0] || null,
    [sizeSections, activeSizeGroup]
  );
  const selectedSizeLabel = useMemo(
    () => formatSelectedSizeLabel(reserve.size, activeSizeGroup, selectedDepartment),
    [reserve.size, activeSizeGroup, selectedDepartment]
  );
  const selectedSizePrice = useMemo(() => {
    const selectedRow = (activeSizeSection?.rows || []).find((row) => row.baseSize === reserve.size);
    const parsed = Number(selectedRow?.price);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }, [activeSizeSection, reserve.size]);
  const selectedSizePriceLabel = useMemo(
    () => (selectedSizePrice !== null ? PHP_CURRENCY.format(selectedSizePrice) : ""),
    [selectedSizePrice]
  );
  const selectedSizeAvailableQuantity = useMemo(() => {
    const selectedRow = (activeSizeSection?.rows || []).find((row) => row.baseSize === reserve.size);
    return Number(selectedRow?.total || 0);
  }, [activeSizeSection, reserve.size]);
  const isSelectedSizePreOrder = selectedSizeAvailableQuantity <= 0;
  const primaryActionLabel = isSelectedSizePreOrder ? "Pre-Order Now" : "Reserve Now";
  const selectedColorwayPriceRange = useMemo(
    () => formatPriceDisplay(selectedColorwayDetails?.minPrice, selectedColorwayDetails?.maxPrice),
    [selectedColorwayDetails]
  );
  const selectedColorwayPriceLabel = selectedSizePriceLabel || selectedColorwayPriceRange;
  const estimatedReservationValue = useMemo(() => {
    if (selectedSizePrice === null) {
      return null;
    }
    const quantity = Number(reserve.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return selectedSizePrice;
    }
    return selectedSizePrice * quantity;
  }, [selectedSizePrice, reserve.quantity]);

  useEffect(() => {
    if (!product?.id || !reserve.colorway) {
      return;
    }
    const viewKey = `${product.id}:${reserve.colorway}`;
    if (trackedMetaViewRef.current === viewKey) {
      return;
    }
    trackedMetaViewRef.current = viewKey;
    const payload = {
      content_ids: [String(product.id)],
      content_name: product.name || "",
      content_type: "product",
      currency: "PHP"
    };
    if (product.brand) {
      payload.brand = product.brand;
    }
    if (estimatedReservationValue !== null) {
      payload.value = estimatedReservationValue;
    }
    trackMetaEvent("ViewContent", payload);
  }, [product?.id, product?.name, product?.brand, reserve.colorway, estimatedReservationValue]);

  const selectReserveSize = (baseSize, sizeGroup) => {
    setReserve((prev) => ({
      ...prev,
      size: baseSize,
      sizeGroup
    }));
  };
  const sizeGuide = useMemo(() => getBrandSizeGuide(product?.brand), [product?.brand]);
  const sizeGuideSection = useMemo(
    () => getGuideSectionForContext(sizeGuide, { sizeGroup: activeSizeGroup, department: selectedDepartment }),
    [sizeGuide, activeSizeGroup, selectedDepartment]
  );
  const zoomLevel = ZOOM_LEVELS[zoomIdx];

  const relatedProducts = useMemo(() => {
    if (!product) return [];

    const baseDetails = getColorwayDetails(product, reserve.colorway);
    const baseBrand = (product.brand || "").trim().toLowerCase();
    const baseCategory = (baseDetails.category || product.category || "").trim().toUpperCase();
    const baseDepartment = (baseDetails.department || product.department || "").trim().toUpperCase();
    const baseType = (baseDetails.productType || product.productType || "").trim().toUpperCase();

    return products
      .filter((candidate) => candidate.id !== product.id)
      .map((candidate) => {
        const candidateDetails = getColorwayDetails(candidate, candidate.stocks?.[0]?.colorway || "DEFAULT");
        const candidateBrand = (candidate.brand || "").trim().toLowerCase();
        const candidateCategory = (candidateDetails.category || candidate.category || "").trim().toUpperCase();
        const candidateDepartment = (candidateDetails.department || candidate.department || "").trim().toUpperCase();
        const candidateType = (candidateDetails.productType || candidate.productType || "").trim().toUpperCase();

        let score = 0;
        const reasons = [];
        if (baseBrand && candidateBrand === baseBrand) {
          score += 5;
          reasons.push("Same brand");
        }
        if (baseCategory && candidateCategory === baseCategory) {
          score += 3;
          reasons.push("Same category");
        }
        if (baseDepartment && candidateDepartment === baseDepartment) {
          score += 2;
          reasons.push("Same sizing");
        }
        if (baseType && candidateType === baseType) {
          score += 1;
        }

        return { candidate, score, reasons };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.candidate.name || "").localeCompare(b.candidate.name || "");
      })
      .slice(0, 8)
      .map((entry) => ({
        product: entry.candidate,
        reasons: entry.reasons.slice(0, 2)
      }));
  }, [products, product, reserve.colorway]);

  useEffect(() => {
    const rail = thumbnailRailRef.current;
    if (!rail || colorways.length <= 1) {
      setThumbnailRailScrollRatio(0);
      setCanScrollThumbnailRail(false);
      return undefined;
    }

    const updateThumbnailRailProgress = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      if (maxScrollLeft <= 1) {
        setThumbnailRailScrollRatio(0);
        setCanScrollThumbnailRail(false);
        return;
      }

      const ratio = Math.min(1, Math.max(0, rail.scrollLeft / maxScrollLeft));
      setThumbnailRailScrollRatio(ratio);
      setCanScrollThumbnailRail(true);
    };

    updateThumbnailRailProgress();
    rail.addEventListener("scroll", updateThumbnailRailProgress, { passive: true });
    window.addEventListener("resize", updateThumbnailRailProgress);

    return () => {
      rail.removeEventListener("scroll", updateThumbnailRailProgress);
      window.removeEventListener("resize", updateThumbnailRailProgress);
    };
  }, [colorways.length]);

  useEffect(() => {
    const rail = relatedRailRef.current;
    if (!rail || relatedProducts.length === 0) {
      setRelatedRailScrollRatio(0);
      setCanScrollRelatedRail(false);
      return undefined;
    }

    const updateRelatedRailProgress = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      if (maxScrollLeft <= 1) {
        setRelatedRailScrollRatio(0);
        setCanScrollRelatedRail(false);
        return;
      }

      const ratio = Math.min(1, Math.max(0, rail.scrollLeft / maxScrollLeft));
      setRelatedRailScrollRatio(ratio);
      setCanScrollRelatedRail(true);
    };

    updateRelatedRailProgress();
    rail.addEventListener("scroll", updateRelatedRailProgress, { passive: true });
    window.addEventListener("resize", updateRelatedRailProgress);

    return () => {
      rail.removeEventListener("scroll", updateRelatedRailProgress);
      window.removeEventListener("resize", updateRelatedRailProgress);
    };
  }, [relatedProducts.length]);

  const openSimilarCollections = () => {
    const details = getColorwayDetails(product, reserve.colorway);
    const next = new URLSearchParams();
    if (product?.brand) next.set("brand", product.brand);
    if (details?.department) next.set("department", details.department);
    navigate(`/collections?${next.toString()}`);
  };

  const backToCollectionsPath = useMemo(() => {
    const raw = (location.state && location.state.fromCollectionsQuery) || "";
    return raw ? `/collections?${raw}` : "/collections";
  }, [location.state]);

  const brandCollectionsPath = useMemo(() => {
    if (!product?.brand) return "/collections";
    const params = new URLSearchParams();
    params.set("brand", product.brand);
    return `/collections?${params.toString()}`;
  }, [product?.brand]);

  const navigateToReserve = (nextProductId, colorway) => {
    const params = new URLSearchParams();
    if (colorway) params.set("colorway", colorway);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    navigate(`/reserve/${nextProductId}?${params.toString()}`, {
      state: { fromCollectionsQuery: (location.state && location.state.fromCollectionsQuery) || "" }
    });
  };

   useEffect(() => {
     if (!product || colorways.length === 0) return;
     const preferredColorway = searchParams.get("colorway");
     const preferredSize = searchParams.get("size") || String(US_SIZES[0]);
     const matchedPreferredColorway = colorways.find(
       (colorway) => normalizeColorwayValue(colorway) === normalizeColorwayValue(preferredColorway)
     );
     const selectedColorway = matchedPreferredColorway ? matchedPreferredColorway : colorways[0];

     // Keep the entry colorway pinned for thumbnail ordering.
     setEntryColorway(selectedColorway);
     setReserve((prev) => ({
       ...prev,
       colorway: selectedColorway,
       size: prev.size || preferredSize,
       sizeGroup: prev.sizeGroup || "MEN"
     }));
   }, [product?.id, colorways]);


  useEffect(() => {
    if (!product?.id) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [product?.id]);

  useEffect(() => {
    if (!product || sizeSections.length === 0) return;

    const activeSection = sizeSections.find((section) => section.key === activeSizeGroup) || sizeSections[0];
    const availableRows = activeSection?.rows || [];
    const hasCurrentSize = availableRows.some((row) => row.baseSize === reserve.size);
    const fallbackRow = availableRows.find((row) => row.total > 0) || availableRows[0];
    const nextSize = hasCurrentSize ? reserve.size : (fallbackRow?.baseSize || "");
    const nextSizeGroup = isUnisexDepartment(selectedDepartment)
      ? (reserve.sizeGroup === "WOMEN" ? "WOMEN" : "MEN")
      : defaultSizeGroup;

    if (nextSize !== reserve.size || nextSizeGroup !== reserve.sizeGroup) {
      setReserve((prev) => ({
        ...prev,
        size: nextSize,
        sizeGroup: nextSizeGroup
      }));
    }
  }, [product, reserve.size, reserve.sizeGroup, sizeSections, selectedDepartment, defaultSizeGroup, activeSizeGroup]);

  useEffect(() => {
    const paymentState = searchParams.get("payment");
    if (paymentState === "success") {
      setMessage("Payment completed. We will verify and update your reservation status shortly.");
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("payment");
      setSearchParams(nextParams, { replace: true });
    } else if (paymentState === "cancel") {
      setMessage("Payment was cancelled. You can try again anytime.");
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("payment");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    setIsSizeGuideOpen(false);
  }, [product?.id, product?.brand]);

  useEffect(() => {
    setMobileOpenSection("size");
  }, [product?.id]);

  const toggleMobileSection = (sectionKey) => {
    setMobileOpenSection((prev) => (prev === sectionKey ? "" : sectionKey));
  };

  const isMobileSectionOpen = (sectionKey) => mobileOpenSection === sectionKey;

  const sizeSectionId = "reserve-accordion-size";
  const quantitySectionId = "reserve-accordion-quantity";
  const infoSectionId = "reserve-accordion-info";

  const getOriginFromPoint = (clientX, clientY) => {
    const el = imgWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setOrigin({ x, y });
  };

  const resetZoom = () => {
    setZoomIdx(0);
    setOrigin({ x: 50, y: 50 });
  };

  const handleSizeGroupChange = (nextSizeGroup) => {
    const targetSection = sizeSections.find((section) => section.key === nextSizeGroup);
    const hasCurrentSize = targetSection?.rows?.some((row) => row.baseSize === reserve.size);
    const fallbackSize = (targetSection?.rows?.find((row) => row.total > 0) || targetSection?.rows?.[0])?.baseSize || reserve.size;
    setReserve((prev) => ({
      ...prev,
      sizeGroup: nextSizeGroup,
      size: hasCurrentSize ? prev.size : fallbackSize
    }));
  };

   const validateReserve = () => {
     if (!product || !reserve.colorway || !reserve.size) {
       const error = new Error("Please select a product, colorway, and size.");
       error.fieldId = "size";
       throw error;
     }

     const selectedRow = (activeSizeSection?.rows || []).find((row) => row.baseSize === reserve.size);
     if (!selectedRow) {
       const error = new Error("Please select an available size.");
       error.fieldId = "size";
       throw error;
     }
     if (!reserve.customerName || reserve.customerName.trim() === "") {
       const error = new Error("Please enter your name.");
       error.fieldId = "customerName";
       throw error;
     }
     if (!reserve.customerContact || reserve.customerContact.trim() === "") {
       const error = new Error("Please enter your contact (number, FB, or IG).");
       error.fieldId = "customerContact";
       throw error;
     }
     if (!reserve.mop || reserve.mop.trim() === "") {
       const error = new Error("Please select your preferred payment method.");
       error.fieldId = "mop";
       throw error;
     }
     if (reserve.mop === "OTHER" && (!reserve.mopOther || reserve.mopOther.trim() === "")) {
       const error = new Error("Please specify your payment method.");
       error.fieldId = "mopOther";
       throw error;
     }

     const quantity = Number(reserve.quantity);
     if (!Number.isFinite(quantity) || quantity <= 0) {
       const error = new Error("Please enter a valid quantity.");
       error.fieldId = "quantity";
       throw error;
     }

     return {
       customerName: reserve.customerName.trim(),
       customerContact: reserve.customerContact.trim(),
       notes: reserve.notes.trim(),
       mop: reserve.mop,
       mopOther: reserve.mop === "OTHER" ? reserve.mopOther.trim() : "",
       items: [
         {
           productId: Number(product.id),
           colorway: reserve.colorway,
           size: reserve.size,
           sizeGroup: activeSizeGroup,
           quantity
         }
       ]
     };
   };

   const scrollToField = (fieldId) => {
     let targetElement = null;
     let scrollOptions = { behavior: "smooth", block: "center" };

     if (fieldId === "size" && sizeSectionRef.current) {
       targetElement = sizeSectionRef.current;
     } else if (fieldId === "customerName" && customerNameInputRef.current) {
       if (window.innerWidth < DESKTOP_BREAKPOINT) {
         setMobileOpenSection("info");
       }
       targetElement = customerNameInputRef.current;
       scrollOptions = { behavior: "smooth", block: "nearest" };
     } else if (fieldId === "customerContact" && customerContactInputRef.current) {
       if (window.innerWidth < DESKTOP_BREAKPOINT) {
         setMobileOpenSection("info");
       }
       targetElement = customerContactInputRef.current;
       scrollOptions = { behavior: "smooth", block: "nearest" };
     } else if (fieldId === "mop" && customerMopInputRef.current) {
       if (window.innerWidth < DESKTOP_BREAKPOINT) {
         setMobileOpenSection("info");
       }
       targetElement = customerMopInputRef.current;
       scrollOptions = { behavior: "smooth", block: "nearest" };
     } else if (fieldId === "mopOther" && customerMopOtherInputRef.current) {
       if (window.innerWidth < DESKTOP_BREAKPOINT) {
         setMobileOpenSection("info");
       }
       targetElement = customerMopOtherInputRef.current;
       scrollOptions = { behavior: "smooth", block: "nearest" };
     }

     if (targetElement) {
       // Scroll into view with smooth behavior
       targetElement.scrollIntoView(scrollOptions);

       // Focus on input fields for better UX
       if (fieldId === "customerName" || fieldId === "customerContact" || fieldId === "mop" || fieldId === "mopOther") {
         setTimeout(() => targetElement?.focus(), 300);
       }
     }
   };

   const openConfirmation = () => {
     const isMobileView = window.innerWidth < DESKTOP_BREAKPOINT;
     if (isMobileView) {
       const missingFieldId = !reserve.customerName.trim()
         ? "customerName"
         : !reserve.customerContact.trim()
           ? "customerContact"
           : !reserve.mop.trim()
             ? "mop"
             : (reserve.mop === "OTHER" && !reserve.mopOther.trim() ? "mopOther" : "");
       if (missingFieldId) {
         setMobileOpenSection("info");
         scrollToField(missingFieldId);
         return;
       }
     }
     try {
       const payload = validateReserve();
       const metaPayload = {
         content_ids: [String(product.id)],
         content_name: product.name || "",
         content_type: "product",
         currency: "PHP",
         quantity: Number(payload?.items?.[0]?.quantity || reserve.quantity || 1)
       };
       if (estimatedReservationValue !== null) {
         metaPayload.value = estimatedReservationValue;
       }
       trackMetaEvent("AddToCart", metaPayload);
       setIsConfirmOpen(true);
     } catch (err) {
       setMessage(err.message);
       // Scroll to the field that caused the error
       if (err.fieldId) {
         scrollToField(err.fieldId);
       }
     }
   };

  const reserveNow = async () => {
    const payload = validateReserve();

    setIsSubmitting(true);
    try {
      const response = await apiRequest("/api/public/orders/reserve", "POST", payload);
      const reservationRef = String(response?.orderCode || response?.reference || response?.id || "").trim();
      setIsConfirmOpen(false);
      setSuccessReference(reservationRef);
      setSuccessOrderId(response?.id ?? null);
      setIsSuccessOpen(true);
      const metaPayload = {
        content_ids: [String(product.id)],
        content_name: product.name || "",
        content_type: "product",
        currency: "PHP",
        quantity: Number(payload?.items?.[0]?.quantity || reserve.quantity || 1)
      };
      if (estimatedReservationValue !== null) {
        metaPayload.value = estimatedReservationValue;
      }
      if (reservationRef) {
        metaPayload.order_id = reservationRef;
      }
      trackMetaEvent("Lead", metaPayload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReserveAnother = () => {
    setIsSuccessOpen(false);
    setSuccessOrderId(null);
    setSuccessReference("");
    setReserve((prev) => ({
      ...prev,
      customerName: "",
      customerContact: "",
      notes: "",
        mop: "",
        mopOther: "",
      quantity: 1
    }));
  };

  const startOnlinePayment = async () => {
    if (!ENABLE_ONLINE_PAYMENT) {
      setMessage("Online payment is coming soon.");
      return;
    }
    if (!successOrderId) {
      setMessage("Missing reservation ID. Please refresh and try again.");
      return;
    }

    setIsPaymentRedirecting(true);
    try {
      const currentPath = `${window.location.origin}${location.pathname}`;
      const response = await apiRequest("/api/public/payments/paymongo/checkout", "POST", {
        orderId: Number(successOrderId),
        successUrl: `${currentPath}?payment=success`,
        cancelUrl: `${currentPath}?payment=cancel`
      });
      const checkoutUrl = String(response?.checkoutUrl || "").trim();
      if (!checkoutUrl) {
        throw new Error("No checkout URL received.");
      }
      window.location.assign(checkoutUrl);
    } catch (err) {
      setMessage(err.message || "Unable to start online payment.");
      setIsPaymentRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="container container-wide reserve-page-shell">
        <section className="reserve-page-panel">
          {/* Skeleton breadcrumb */}
          <div className="skeleton-breadcrumb">
            <span className="skeleton-line" style={{ width: 80 }} />
            <span className="skeleton-line" style={{ width: 6 }} />
            <span className="skeleton-line" style={{ width: 120 }} />
          </div>
          <div className="reserve-page-content">
            {/* Skeleton image column */}
            <div className="reserve-page-media-column">
              <div className="skeleton-media reserve-skeleton-image" />
              <div className="skeleton-thumbnail-row">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="skeleton-media reserve-skeleton-thumb" />
                ))}
              </div>
            </div>
            {/* Skeleton form column */}
            <div className="reserve-page-form-column">
              <div className="skeleton-line" style={{ width: "60%", height: 14, marginBottom: 6 }} />
              <div className="skeleton-line" style={{ width: "85%", height: 26, marginBottom: 20 }} />
              <div className="skeleton-line" style={{ width: "40%", height: 20, marginBottom: 12 }} />
              <div className="skeleton-size-row">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="skeleton-media" style={{ height: 38, borderRadius: 8 }} />
                ))}
              </div>
              <div className="skeleton-line" style={{ width: "100%", height: 44, borderRadius: 10, marginTop: 20 }} />
              <div className="skeleton-line" style={{ width: "100%", height: 44, borderRadius: 10, marginTop: 10 }} />
              <div className="skeleton-line" style={{ width: "100%", height: 80, borderRadius: 10, marginTop: 10 }} />
              <div className="skeleton-line" style={{ width: "100%", height: 48, borderRadius: 10, marginTop: 16 }} />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container container-customer">
        <div className="card">
          <h2>Product not found</h2>
          <p className="field-hint">This product may have been removed.</p>
          <button type="button" className="btn-cancel" onClick={() => navigate(backToCollectionsPath)}>Back to collections</button>
        </div>
      </main>
    );
  }

  return (
    <main className="container container-wide reserve-page-shell">
      <section className="reserve-page-panel">

        {/* Breadcrumb */}
        <nav className="reserve-breadcrumb" aria-label="Breadcrumb">
          <Link className="reserve-page-crumb-link reserve-back-link" to="/collections">
            <span className="reserve-back-arrow" aria-hidden="true">←</span>
            Collections
          </Link>
          <span className="reserve-page-crumb-separator" aria-hidden="true">/</span>
          {product.brand ? (
            <>
              <Link className="reserve-page-crumb-link reserve-page-crumb-brand-link" to={brandCollectionsPath}>
                {product.brand}
              </Link>
              <span className="reserve-page-crumb-separator" aria-hidden="true">/</span>
            </>
          ) : null}
          <span className="reserve-page-crumb-current" aria-current="page">{product.name}</span>
        </nav>

        <div className="reserve-page-content">
          {/* ── Media column ── */}
          <div className="reserve-page-media-column">
            <div
              ref={imgWrapRef}
              className={`reserve-modal-image${zoomLevel > 1 ? " zoomed" : ""}`}
              onMouseMove={(e) => getOriginFromPoint(e.clientX, e.clientY)}
              onMouseLeave={() => zoomLevel === 1 && setOrigin({ x: 50, y: 50 })}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                if (!touch) return;
                getOriginFromPoint(touch.clientX, touch.clientY);
              }}
              onTouchMove={(e) => {
                if (zoomLevel <= 1) return;
                const touch = e.touches[0];
                if (!touch) return;
                getOriginFromPoint(touch.clientX, touch.clientY);
              }}
              onClick={() => setZoomIdx((prev) => (prev + 1) % ZOOM_LEVELS.length)}
            >
              {(() => {
                const imgUrl = getColorwayImageUrl(product, reserve.colorway);
                if (imgUrl) {
                  return (
                    <img
                      src={imgUrl}
                      alt={reserve.colorway}
                      style={{
                        transform: `scale(${zoomLevel * baseImageScale})`,
                        transformOrigin: `${origin.x}% ${origin.y}%`
                      }}
                    />
                  );
                }
                return (
                  <div className="reserve-image-fallback">
                    <div className="reserve-image-fallback-icon">👟</div>
                    <div className="reserve-image-fallback-name">{product.name}</div>
                    <div className="reserve-image-fallback-colorway">{reserve.colorway}</div>
                  </div>
                );
              })()}
              <span className="zoom-hint">{ZOOM_LABELS[zoomIdx]}</span>
            </div>

            <div className="reserve-media-meta">
              <span className="colorway-display">{formatColorwayLabel(reserve.colorway)}</span>
              {selectedColorwayPriceLabel ? (
                <span className="reserve-size-price-badge">{selectedColorwayPriceLabel}</span>
              ) : null}
            </div>

            {colorways.length > 1 ? (
                <div className="reserve-thumbnail-row" aria-label="Colorway thumbnails" ref={thumbnailRailRef}>
                  {prioritizedColorways.map((colorway) => {
                   const thumbUrl = getColorwayImageUrl(product, colorway);
                   return (
                     <button
                       key={`${product.id}-${colorway}`}
                       type="button"
                       className={`reserve-thumb-btn quick-tooltip ${reserve.colorway === colorway ? "active" : ""}`}
                       onClick={() => {
                          setReserve((prev) => ({ ...prev, colorway }));
                         const nextParams = new URLSearchParams(searchParams);
                         nextParams.set("colorway", colorway);
                         if (reserve.size) nextParams.set("size", reserve.size);
                         setSearchParams(nextParams, { replace: true });
                         resetZoom();
                       }}
                       data-tooltip={formatColorwayLabel(colorway)}
                       aria-label={formatColorwayLabel(colorway)}
                     >
                       {thumbUrl ? <img src={thumbUrl} alt={colorway} loading="lazy" /> : <span className="reserve-thumb-fallback">👟</span>}
                     </button>
                   );
                 })}
               </div>
             ) : null}
             {canScrollThumbnailRail ? (
               <div
                 className="reserve-thumbnail-progress"
                 aria-hidden="true"
                 style={{ "--thumbnail-scroll-ratio": String(thumbnailRailScrollRatio) }}
               >
                 <span className="reserve-thumbnail-progress-thumb" />
               </div>
             ) : null}
          </div>

          {/* ── Form column ── */}
          <div className="reserve-modal-form reserve-page-form-column">

            {/* Product header */}
            <div className="reserve-product-header">
              <div className="reserve-product-meta-row">
                {product.brand ? <span className="reserve-brand-chip">{product.brand}</span> : null}
                {selectedColorwayDetails?.department ? (
                  <span className="reserve-dept-chip">{formatEnumLabel(selectedColorwayDetails.department)}</span>
                ) : null}
                {Number(product.viewCount || 0) > 0 ? (
                  <span className="reserve-view-badge">
                    <Eye size={11} strokeWidth={2.2} />
                    {Number(product.viewCount).toLocaleString()} views
                  </span>
                ) : null}
              </div>
              <h1 className="reserve-product-title">{product.name}</h1>
              {selectedColorwayDetails?.description ? (
                <p className="reserve-product-desc">{selectedColorwayDetails.description}</p>
              ) : null}
              {selectedColorwayPriceLabel ? (
                <div className="reserve-product-price-display">{selectedColorwayPriceLabel}</div>
              ) : null}
            </div>

             {/* Size & Availability */}
             <div 
               ref={sizeSectionRef}
               className={`form-section reserve-accordion-section ${isMobileSectionOpen("size") ? "open" : ""}`}
             >
              <button
                type="button"
                className="reserve-accordion-toggle"
                onClick={() => toggleMobileSection("size")}
                aria-expanded={isMobileSectionOpen("size")}
                aria-controls={sizeSectionId}
              >
                <span>Size &amp; Availability</span>
                <span className="reserve-accordion-icon" aria-hidden="true">▾</span>
              </button>
              <div className="reserve-accordion-body" id={sizeSectionId}>
              <div className="size-label-row">
                <label>Size &amp; Availability</label>
                <div className="size-label-actions">
                  {sizeGuide ? (
                    <button
                      type="button"
                      className="size-guide-pill-btn"
                      onClick={() => setIsSizeGuideOpen((prev) => !prev)}
                    >
                      {isSizeGuideOpen ? "✕ Hide Size Guide" : "📏 Size Guide"}
                    </button>
                  ) : null}
                </div>
              </div>
              {isUnisexDepartment(selectedDepartment) ? (
                <div className="size-group-toggle" role="tablist" aria-label="Choose sizing view">
                  {sizeSections.map((section) => (
                    <button
                      key={section.key}
                      type="button"
                      role="tab"
                      aria-selected={activeSizeGroup === section.key}
                      className={`size-group-btn ${activeSizeGroup === section.key ? "active" : ""}`}
                      onClick={() => handleSizeGroupChange(section.key)}
                    >
                      {section.key === "WOMEN" ? "Women's" : "Men's"}
                    </button>
                  ))}
                </div>
              ) : null}
              {activeSizeSection ? (
                <div className="size-section-card">
                  <p className="size-section-heading">{activeSizeSection.label}</p>
                  <div className="size-grid">
                    {activeSizeSection.rows.map((row) => {
                      const available = row.total > 0;
                      const isActive = reserve.size === row.baseSize && activeSizeGroup === activeSizeSection.key;
                      return (
                        <button
                          key={`${activeSizeSection.key}-${row.baseSize}`}
                          type="button"
                          className={`size-btn ${isActive ? "active" : ""} ${!available ? "unavailable" : ""}`}
                          onClick={() => selectReserveSize(row.baseSize, activeSizeSection.key)}
                        >
                          <span className="size-label">US {row.displaySize}</span>
                          <span className="size-stock">
                            {row.total > 0 ? `${row.total} available` : "Out of stock"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <small className="field-hint">
                {isUnisexDepartment(selectedDepartment) ? "Unisex — shows both Men's & Women's sizing." : selectedDepartment === "WOMEN" ? "Women's sizing." : "Men's sizing."}
              </small>
              {selectedSizePriceLabel ? (
                <div className="size-price-hint">Selected size: <strong>{selectedSizePriceLabel}</strong></div>
              ) : null}
              {isSizeGuideOpen && sizeGuide && sizeGuideSection ? (
                <div className="modal-overlay" onClick={() => setIsSizeGuideOpen(false)}>
                  <section className="modal-panel modal-panel-compact size-guide-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="breakdown-header">
                      <h2>{sizeGuide.brandLabel} Size Guide</h2>
                      <button type="button" className="modal-close-btn" aria-label="Close size guide" onClick={() => setIsSizeGuideOpen(false)}>✕</button>
                    </div>
                    <div className="size-guide-table-wrap">
                      <table className="size-guide-table">
                        <thead>
                          <tr>
                            {sizeGuideSection.columns.map((column) => (
                              <th key={`guide-head-${column.key}`}>{column.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sizeGuideSection.rows.map((row, index) => (
                            <tr key={`${sizeGuide.brandLabel}-${sizeGuideSection.label || "guide"}-${index}`}>
                              {sizeGuideSection.columns.map((column) => (
                                <td key={`guide-cell-${column.key}-${index}`}>{row[column.key] || "-"}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <small className="field-hint" style={{ marginTop: 4 }}>
                      Reference from {sizeGuide.sourceLabel}. Actual fit may vary by model.
                    </small>
                    {sizeGuide.fitNote ? (
                      <small className="field-hint" style={{ marginTop: 0 }}>{sizeGuide.fitNote}</small>
                    ) : null}
                  </section>
                </div>
              ) : null}
              </div>
            </div>

            {/* Quantity stepper */}
            <div className={`form-section reserve-accordion-section ${isMobileSectionOpen("quantity") ? "open" : ""}`}>
              <button
                type="button"
                className="reserve-accordion-toggle"
                onClick={() => toggleMobileSection("quantity")}
                aria-expanded={isMobileSectionOpen("quantity")}
                aria-controls={quantitySectionId}
              >
                <span>Quantity</span>
                <span className="reserve-accordion-icon" aria-hidden="true">▾</span>
              </button>
              <div className="reserve-accordion-body" id={quantitySectionId}>
              <label>Quantity</label>
              <div className="qty-stepper">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setReserve({ ...reserve, quantity: Math.max(1, Number(reserve.quantity) - 1) })}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="qty-value">{reserve.quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setReserve({ ...reserve, quantity: Number(reserve.quantity) + 1 })}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              </div>
            </div>

            {/* Customer Info — merged section */}
            <div className={`form-section reserve-customer-section reserve-accordion-section ${isMobileSectionOpen("info") ? "open" : ""}`}>
              <button
                type="button"
                className="reserve-accordion-toggle"
                onClick={() => toggleMobileSection("info")}
                aria-expanded={isMobileSectionOpen("info")}
                aria-controls={infoSectionId}
              >
                <span>Your Info</span>
                <span className="reserve-accordion-icon" aria-hidden="true">▾</span>
              </button>
              <div className="reserve-accordion-body" id={infoSectionId}>
              <label>Your Info</label>
              <div className="customer-info-grid">
                 <div className="customer-info-field">
                   <span className="customer-field-label">Name <span className="required">*</span></span>
                   <input
                     ref={customerNameInputRef}
                     placeholder="Enter your name"
                     value={reserve.customerName}
                     onChange={(e) => setReserve({ ...reserve, customerName: e.target.value })}
                     required
                   />
                 </div>
                 <div className="customer-info-field">
                   <span className="customer-field-label">Contact (Number / FB / IG) <span className="required">*</span></span>
                   <input
                     ref={customerContactInputRef}
                     placeholder="Enter your contact"
                     value={reserve.customerContact}
                     onChange={(e) => setReserve({ ...reserve, customerContact: e.target.value })}
                     required
                   />
                 </div>
                 <div className="customer-info-field">
                   <span className="customer-field-label">Preferred MOP <span className="required">*</span></span>
                   <select
                     ref={customerMopInputRef}
                     value={reserve.mop}
                     onChange={(e) => {
                       const nextMop = e.target.value;
                       setReserve((prev) => ({
                         ...prev,
                         mop: nextMop,
                         mopOther: nextMop === "OTHER" ? prev.mopOther : ""
                       }));
                     }}
                     required
                   >
                     <option value="">Select payment method</option>
                     {CUSTOMER_MOP_OPTIONS.map((option) => (
                       <option key={`customer-mop-${option.value}`} value={option.value}>{option.label}</option>
                     ))}
                   </select>
                 </div>
                 {reserve.mop === "OTHER" ? (
                   <div className="customer-info-field">
                     <span className="customer-field-label">Specify MOP <span className="required">*</span></span>
                     <input
                       ref={customerMopOtherInputRef}
                       placeholder="Example: Bank transfer"
                       maxLength={120}
                       value={reserve.mopOther}
                       onChange={(e) => setReserve((prev) => ({ ...prev, mopOther: e.target.value }))}
                       required
                     />
                   </div>
                 ) : null}
              </div>
              <div className="customer-notes-field">
                <span className="customer-field-label">Notes <span className="field-hint-inline">(optional)</span></span>
                <textarea
                  className="notes-textarea"
                  placeholder="Any special requests or notes?"
                  value={reserve.notes}
                  onChange={(e) => setReserve({ ...reserve, notes: e.target.value })}
                  rows={2}
                />
              </div>
              </div>
            </div>

            <div className="reserve-form-actions">
              <button
                className="btn-primary reserve-submit-btn"
                onClick={openConfirmation}
              >
                {primaryActionLabel}
              </button>
            </div>
          </div>
        </div>

        <div className="reserve-sticky-cta" role="complementary" aria-label="Quick reserve">
          <div className="reserve-sticky-cta-meta">
            <span className="reserve-sticky-cta-size">{selectedSizeLabel || `US ${reserve.size}`}</span>
            <span className="reserve-sticky-cta-price">{selectedColorwayPriceLabel || "Select size"}</span>
          </div>
          <button type="button" className="btn-primary reserve-sticky-cta-btn" onClick={openConfirmation}>
            {primaryActionLabel}
          </button>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 ? (
          <section className="reserve-related-section">
            <div className="reserve-related-header">
              <div>
                <h3 className="reserve-related-title">You may also like</h3>
                <p className="reserve-related-subtitle">Picked by similarity in brand, category, and sizing context.</p>
              </div>
              <button type="button" className="reserve-related-link-btn" onClick={openSimilarCollections}>
                View Similar
              </button>
            </div>
            <div className="reserve-related-grid" ref={relatedRailRef}>
              {relatedProducts.map((entry) => (
                <div key={entry.product.id} className="reserve-related-item">
                  <ProductCard
                    product={entry.product}
                    onReserveClick={navigateToReserve}
                  />
                  {entry.reasons.length > 0 ? (
                    <div className="reserve-related-reasons" aria-label="Recommendation reasons">
                      <span className="reserve-related-reason-chip">{entry.reasons.join(" • ")}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {canScrollRelatedRail ? (
              <div
                className="reserve-related-progress"
                aria-hidden="true"
                style={{ "--related-scroll-ratio": String(relatedRailScrollRatio) }}
              >
                <span className="reserve-related-progress-thumb" />
              </div>
            ) : null}
          </section>
        ) : null}
      </section>

      {/* Confirm modal */}
      {isConfirmOpen ? (
        <div className="modal-overlay" onClick={() => !isSubmitting && setIsConfirmOpen(false)}>
          <section className="modal-panel reserve-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="breakdown-header reserve-confirm-header">
              <h2>Confirm Reservation</h2>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close reservation confirmation"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>

            <div className="reserve-confirm-summary">
              {/* Product visual */}
              <div className="reserve-confirm-product-visual">
                {(() => {
                  const imgUrl = getColorwayImageUrl(product, reserve.colorway);
                  return imgUrl
                    ? <img src={imgUrl} alt={reserve.colorway} className="reserve-confirm-thumb" />
                    : <div className="reserve-confirm-thumb-fallback">👟</div>;
                })()}
                <div className="reserve-confirm-product-info">
                  <div className="reserve-confirm-product-name">{product.name}</div>
                  {product.brand ? <div className="reserve-confirm-product-brand">{product.brand}</div> : null}
                  {isSelectedSizePreOrder ? <span className="reserve-confirm-preorder-badge">Pre-Order Item</span> : null}
                  {selectedColorwayPriceLabel ? (
                    <div className="reserve-confirm-price-hint">{selectedColorwayPriceLabel}</div>
                  ) : null}
                </div>
              </div>

              <div className="reserve-confirm-grid">
                <div className="reserve-confirm-item">
                  <span className="reserve-confirm-label">Colorway</span>
                  <strong>{formatColorwayLabel(reserve.colorway)}</strong>
                </div>
                <div className="reserve-confirm-item">
                  <span className="reserve-confirm-label">Size</span>
                  <strong>{selectedSizeLabel || `US ${reserve.size}`}</strong>
                </div>
                <div className="reserve-confirm-item">
                  <span className="reserve-confirm-label">Quantity</span>
                  <strong>{reserve.quantity}</strong>
                </div>
                {selectedSizePrice !== null ? (
                  <div className="reserve-confirm-item">
                    <span className="reserve-confirm-label">Unit Price</span>
                    <strong>{selectedSizePriceLabel}</strong>
                  </div>
                ) : null}
                <div className="reserve-confirm-item">
                  <span className="reserve-confirm-label">Name</span>
                  <strong>{reserve.customerName.trim()}</strong>
                </div>
                <div className="reserve-confirm-item">
                  <span className="reserve-confirm-label">Contact</span>
                  <strong>{reserve.customerContact.trim()}</strong>
                </div>
                <div className="reserve-confirm-item">
                  <span className="reserve-confirm-label">MOP</span>
                  <strong>
                    {reserve.mop === "OTHER"
                      ? (reserve.mopOther.trim() || "Other")
                      : (CUSTOMER_MOP_OPTIONS.find((option) => option.value === reserve.mop)?.label || reserve.mop || "-")}
                  </strong>
                </div>
                <div className="reserve-confirm-item reserve-confirm-item-wide">
                  <span className="reserve-confirm-label">Notes</span>
                  <strong>{reserve.notes.trim() || "No notes provided"}</strong>
                </div>
              </div>
              <p className="field-hint" style={{ marginTop: 10 }}>
                Sole Reax will contact you once the item is ship.
              </p>
            </div>

            <div className="reserve-confirm-actions">
              <button
                type="button"
                className="btn-cancel reserve-confirm-cancel-btn"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
              >
                Edit Details
              </button>
              <button
                type="button"
                className="btn-primary reserve-confirm-submit-btn"
                onClick={() => reserveNow().catch((err) => setMessage(err.message))}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Confirm Reservation"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {isSuccessOpen ? (
        <div className="modal-overlay" onClick={() => setIsSuccessOpen(false)}>
          <section className="modal-panel reserve-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reserve-success-content">
              <div className="reserve-success-icon" aria-hidden="true">✓</div>
              <h2>Reservation sent</h2>
              <p className="reserve-success-copy">
                Thanks! We received your reservation request. Sole Reax will contact you once the item is ship.
              </p>
              {successReference ? (
                <p className="reserve-success-ref">
                  Reference: <strong>{successReference}</strong>
                </p>
              ) : null}
              <div className="reserve-success-actions">
                <button
                  type="button"
                  className="btn-cancel reserve-success-secondary-btn"
                  onClick={handleReserveAnother}
                  disabled={isPaymentRedirecting}
                >
                  Reserve Another
                </button>
                {ENABLE_ONLINE_PAYMENT ? (
                  <button
                    type="button"
                    className="btn-primary reserve-success-primary-btn"
                    onClick={() => startOnlinePayment().catch((err) => setMessage(err.message))}
                    disabled={!successOrderId || isPaymentRedirecting}
                  >
                    {isPaymentRedirecting ? "Redirecting..." : "Pay Online (GCash/Maya/Banks)"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-cancel reserve-success-secondary-btn"
                    disabled
                    title="Online payment is coming soon"
                  >
                    Pay Online (Soon)
                  </button>
                )}
                <button
                  type="button"
                  className="btn-cancel reserve-success-secondary-btn"
                  onClick={() => navigate(backToCollectionsPath)}
                  disabled={isPaymentRedirecting}
                >
                  Back to Collections
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {message ? <div className="toast-banner">{message}</div> : null}
    </main>
  );
}
