import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, Minus, Plus } from "lucide-react";
import { CUSTOMER_MOP_OPTIONS } from "../../constants";
import { apiRequest } from "../../utils/api";
import { getColorwayDetails, getColorwayImageUrl, normalizeColorwayValue } from "../../utils/colorway";
import { formatColorwayLabel, formatCountdownLabel, formatEnumLabel, formatSaleStartLabel } from "../../utils/format";
import { getSortedColorwaysFromStocks } from "../../utils/stock";
import { buildSizeSections, formatSelectedSizeLabel, getDefaultSizeGroup, getDepartmentForColorway, isUnisexDepartment } from "../../utils/sizePresentation";
import { getBrandSizeGuide, getGuideSectionForContext } from "../../utils/sizeGuide";
import { getOrCreateViewSessionId, shouldTrackViewForScope } from "../../utils/tracking";
import { applyPromotionPreviewPrice, formatMaskedPriceDisplay, PHP_CURRENCY, formatPriceDisplay } from "../../utils/price";
import { trackMetaEvent } from "../../utils/tracking";
import { stripColorwayFromDescription } from "../../utils/productDescription";
import { ProductCard } from "../../components/catalog";
import {
  ReserveConfirmModal,
  ReserveSizeGuideModal,
  ReserveSuccessModal
} from "../../components/modals/customer";
import { useCountdown, useModalState, useToggleState } from "../../hooks";

const ZOOM_LEVELS = [1, 2, 3];
const ZOOM_LABELS = ["Click to zoom", "2x · click for 3x", "3x · click to reset"];
const DESKTOP_BREAKPOINT = 901;
const DESKTOP_BASE_IMAGE_SCALE = 1;
const MOBILE_BASE_IMAGE_SCALE = 1;
const ENABLE_ONLINE_PAYMENT = String(import.meta.env.VITE_ENABLE_PAYMONGO_CHECKOUT || "").toLowerCase() === "true";

export default function ReservePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { productId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const {
    isOpen: isConfirmOpen,
    open: openConfirmModal,
    close: closeConfirmModal
  } = useModalState(false);
  const {
    isOpen: isSuccessOpen,
    open: openSuccessModal,
    close: closeSuccessModal
  } = useModalState(false);
  const [successReference, setSuccessReference] = useState("");
  const [successOrderId, setSuccessOrderId] = useState(null);
  const [isPaymentRedirecting, setIsPaymentRedirecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    isOpen: isSizeGuideOpen,
    toggle: toggleSizeGuideModal,
    close: closeSizeGuideModal
  } = useModalState(false);
  const {
    value: mobileOpenSection,
    setValue: setMobileOpenSection,
    toggle: toggleMobileSection,
    reset: resetMobileSection
  } = useToggleState("");
  const [entryColorway, setEntryColorway] = useState("");
  const [reserve, setReserve] = useState({
    customerName: "",
    customerContact: "",
    notes: "",
    mop: "",
    mopOther: "",
    colorway: "",
    size: "",
    sizeGroup: "MEN",
    quantity: 0
  });
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [autoSalePromotion, setAutoSalePromotion] = useState(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [hasConfirmedQuantity, setHasConfirmedQuantity] = useState(false);
  const [quantityPulseDirection, setQuantityPulseDirection] = useState("neutral");
  const [quantityPulseTick, setQuantityPulseTick] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [baseImageScale, setBaseImageScale] = useState(() => (
    window.innerWidth >= DESKTOP_BREAKPOINT ? DESKTOP_BASE_IMAGE_SCALE : MOBILE_BASE_IMAGE_SCALE
  ));
  const imgWrapRef = useRef(null);
  const thumbnailRailRef = useRef(null);
  const relatedRailRef = useRef(null);
  const sizeSectionRef = useRef(null);
  const quantitySectionRef = useRef(null);
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
      if (window.innerWidth < DESKTOP_BREAKPOINT) {
        setZoomIdx(0);
      }
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
  const hasValidSelectedSize = useMemo(() => {
    if (!reserve.size) {
      return false;
    }
    return (activeSizeSection?.rows || []).some((row) => row.baseSize === reserve.size);
  }, [activeSizeSection, reserve.size]);
  const hasValidConfirmedQuantity = useMemo(() => {
    const quantity = Number(reserve.quantity);
    return hasConfirmedQuantity && Number.isFinite(quantity) && quantity > 0;
  }, [hasConfirmedQuantity, reserve.quantity]);
  const hasCompletedInfoStep = useMemo(() => {
    return Boolean(
      reserve.customerName?.trim()
      && reserve.customerContact?.trim()
      && reserve.mop?.trim()
      && (reserve.mop !== "OTHER" || reserve.mopOther?.trim())
    );
  }, [reserve.customerContact, reserve.customerName, reserve.mop, reserve.mopOther]);
  const isSelectedSizePreOrder = Boolean(reserve.size) && selectedSizeAvailableQuantity <= 0;
  const primaryActionLabel = isSelectedSizePreOrder ? "Pre-Order Now" : "Reserve Now";
  const guidedActionLabel = !hasValidSelectedSize
    ? "Select Size First"
    : !hasValidConfirmedQuantity
      ? "Confirm Quantity"
      : !hasCompletedInfoStep
        ? "Complete Your Info"
        : primaryActionLabel;
  const guidedActionStep = !hasValidSelectedSize
    ? "size"
    : !hasValidConfirmedQuantity
      ? "quantity"
      : !hasCompletedInfoStep
        ? "info"
        : "ready";
  const guidedActionClassName = `reserve-step-${guidedActionStep}`;
  const guidedActionProgressLabel = guidedActionStep === "size"
    ? "Step 1 of 4"
    : guidedActionStep === "quantity"
      ? "Step 2 of 4"
      : guidedActionStep === "info"
        ? "Step 3 of 4"
        : "Step 4 of 4";
  const isDecrementDisabled = Number(reserve.quantity) <= 0;
  const selectedColorwayPriceRange = useMemo(
    () => formatPriceDisplay(selectedColorwayDetails?.minPrice, selectedColorwayDetails?.maxPrice),
    [selectedColorwayDetails]
  );
  const selectedProductDescription = useMemo(
    () => stripColorwayFromDescription(selectedColorwayDetails?.description),
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
  const promoAppliedTotal = useMemo(() => {
    const effectivePromotion = appliedPromotion || autoSalePromotion;
    if (estimatedReservationValue === null) {
      return null;
    }
    if (!effectivePromotion) {
      return estimatedReservationValue;
    }
    const parsed = Number(effectivePromotion.totalAfterDiscount);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : estimatedReservationValue;
  }, [appliedPromotion, autoSalePromotion, estimatedReservationValue]);
  const promoAppliedDiscount = useMemo(() => {
    const effectivePromotion = appliedPromotion || autoSalePromotion;
    if (!effectivePromotion) {
      return 0;
    }
    const parsed = Number(effectivePromotion.discountAmount);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [appliedPromotion, autoSalePromotion]);
  const hasAutoSaleApplied = !appliedPromotion && Boolean(autoSalePromotion?.valid);
  const primarySalePromotion = Array.isArray(product?.salePromotions) && product.salePromotions.length > 0
    ? product.salePromotions[0]
    : null;
  const hasSalePromoAvailable = Boolean(primarySalePromotion);
  const isUpcomingSalePromotion = hasSalePromoAvailable && !primarySalePromotion.activeNow;
  const saleCountdown = useCountdown(primarySalePromotion?.startsAt, isUpcomingSalePromotion);
  const visibleSalePromoName = autoSalePromotion?.name || primarySalePromotion?.name || "Sale Promo";
  const upcomingCountdownLabel = isUpcomingSalePromotion
    ? (saleCountdown.label || formatCountdownLabel((new Date(primarySalePromotion?.startsAt || 0)).getTime() - Date.now()))
    : "";
  const teaserSalePriceLabel = isUpcomingSalePromotion && primarySalePromotion && !primarySalePromotion.buyOneTakeOne
    ? formatMaskedPriceDisplay(
      applyPromotionPreviewPrice(selectedColorwayDetails?.minPrice ?? selectedColorwayDetails?.price, primarySalePromotion),
      applyPromotionPreviewPrice(selectedColorwayDetails?.maxPrice ?? selectedColorwayDetails?.price, primarySalePromotion)
    )
    : "";
  const pendingSalePreviewLabel = primarySalePromotion
    ? (isUpcomingSalePromotion
      ? `${visibleSalePromoName} is scheduled. ${formatSaleStartLabel(primarySalePromotion.startsAt)}.`
      : (primarySalePromotion.buyOneTakeOne
      ? "Buy 1 Take 1 promo available for this product."
      : (primarySalePromotion.discountType === "PERCENT"
        ? `${Number(primarySalePromotion.discountValue || 0)}% off promo available.`
        : "Fixed-amount sale promo available.")))
    : "Sale promo available.";
  const autoSaleDiscountPreview = hasAutoSaleApplied && promoAppliedDiscount > 0
    ? `- ${PHP_CURRENCY.format(promoAppliedDiscount)} off`
    : "Discount will be calculated automatically.";
  const autoSaleTotalPreview = hasAutoSaleApplied && Number.isFinite(promoAppliedTotal)
    ? `Total now ${PHP_CURRENCY.format(promoAppliedTotal)}.`
    : "";

  useEffect(() => {
    if (appliedPromotion || autoSalePromotion) {
      setAppliedPromotion(null);
      setAutoSalePromotion(null);
      setPromoMessage("");
    }
  }, [product?.id, reserve.colorway, reserve.size, reserve.quantity]);

  const buildPromoValidationItems = () => {
    const normalizedCategory = String(selectedColorwayDetails?.category || product?.category || "").trim().toUpperCase();
    const normalizedProductType = String(selectedColorwayDetails?.productType || product?.productType || "").trim().toUpperCase();
    const normalizedQuantity = Math.max(1, Number(reserve.quantity || 0));
    const isLowStockSelection = selectedSizeAvailableQuantity > 0 && selectedSizeAvailableQuantity <= 3;
    return [{
      productId: product?.id,
      brand: product?.brand || "",
      category: normalizedCategory,
      productType: normalizedProductType,
      lowStock: isLowStockSelection,
      quantity: normalizedQuantity
    }];
  };

  const resolveAutoSalePromotion = async () => {
    if (estimatedReservationValue === null) {
      setAutoSalePromotion(null);
      return null;
    }
    if (isUpcomingSalePromotion) {
      setAutoSalePromotion(null);
      return null;
    }
    try {
      const response = await apiRequest("/api/public/promotions/auto-sale", "POST", {
        subtotal: estimatedReservationValue,
        items: buildPromoValidationItems()
      });
      if (response?.valid) {
        setAutoSalePromotion(response);
        return response;
      }
      setAutoSalePromotion(null);
      return null;
    } catch {
      setAutoSalePromotion(null);
      return null;
    }
  };

  useEffect(() => {
    if (appliedPromotion) {
      return;
    }
    if (!hasValidSelectedSize || !hasValidConfirmedQuantity || estimatedReservationValue === null) {
      setAutoSalePromotion(null);
      return;
    }
    resolveAutoSalePromotion().catch(() => {
      // Keep UI resilient if auto-sale lookup fails.
    });
  }, [
    appliedPromotion,
    estimatedReservationValue,
    hasValidConfirmedQuantity,
    hasValidSelectedSize,
    isUpcomingSalePromotion,
    product?.id,
    reserve.colorway,
    reserve.size,
    reserve.quantity
  ]);

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
    if (promoAppliedTotal !== null) {
      payload.value = promoAppliedTotal;
    }
    trackMetaEvent("ViewContent", payload);
  }, [product?.id, product?.name, product?.brand, reserve.colorway, promoAppliedTotal]);

  const selectReserveSize = (baseSize, sizeGroup) => {
    setReserve((prev) => ({
      ...prev,
      size: baseSize,
      sizeGroup
    }));
    setHasConfirmedQuantity(false);
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
     const matchedPreferredColorway = colorways.find(
       (colorway) => normalizeColorwayValue(colorway) === normalizeColorwayValue(preferredColorway)
     );
     const selectedColorway = matchedPreferredColorway ? matchedPreferredColorway : colorways[0];

     // Keep the entry colorway pinned for thumbnail ordering.
     setEntryColorway(selectedColorway);
     setReserve((prev) => ({
       ...prev,
       colorway: selectedColorway,
        size: "",
       sizeGroup: prev.sizeGroup || "MEN"
     }));
     setHasConfirmedQuantity(false);
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
    const nextSize = hasCurrentSize ? reserve.size : "";
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
    closeSizeGuideModal();
  }, [product?.id, product?.brand, closeSizeGuideModal]);

  useEffect(() => {
    resetMobileSection();
  }, [product?.id, resetMobileSection]);

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
     const quantity = Number(reserve.quantity);
     if (!hasConfirmedQuantity || !Number.isFinite(quantity) || quantity <= 0) {
       const error = new Error("Please confirm your quantity.");
       error.fieldId = "quantity";
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

     return {
       customerName: reserve.customerName.trim(),
       customerContact: reserve.customerContact.trim(),
       notes: reserve.notes.trim(),
       mop: reserve.mop,
       mopOther: reserve.mop === "OTHER" ? reserve.mopOther.trim() : "",
        promoCode: (appliedPromotion?.code || promoCode).trim(),
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
       if (window.innerWidth < DESKTOP_BREAKPOINT) {
          setMobileOpenSection("size");
       }
       targetElement = sizeSectionRef.current;
     } else if (fieldId === "quantity" && quantitySectionRef.current) {
       if (window.innerWidth < DESKTOP_BREAKPOINT) {
          setMobileOpenSection("quantity");
       }
       targetElement = quantitySectionRef.current;
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

   const applyPromoVoucher = async () => {
     const code = promoCode.trim();
     if (!code) {
       setPromoMessage("Enter a promo code first.");
       return;
     }
     if (estimatedReservationValue === null) {
       setPromoMessage("Select a size and quantity first.");
       return;
     }

     setIsApplyingPromo(true);
     setPromoMessage("");
     try {
       const response = await apiRequest("/api/public/promotions/validate", "POST", {
         code,
         subtotal: estimatedReservationValue,
          items: buildPromoValidationItems()
       });
       setAppliedPromotion(response);
       setPromoCode(String(response?.code || code).toUpperCase());
       setPromoMessage(`Voucher ${String(response?.code || code).toUpperCase()} applied.`);
     } catch (err) {
       setAppliedPromotion(null);
       setPromoMessage(err.message || "Invalid promo code.");
     } finally {
       setIsApplyingPromo(false);
     }
   };

   const openConfirmation = async () => {
     try {
       const payload = validateReserve();
        if (!appliedPromotion) {
          await resolveAutoSalePromotion();
        }
       const metaPayload = {
         content_ids: [String(product.id)],
         content_name: product.name || "",
         content_type: "product",
         currency: "PHP",
         quantity: Number(payload?.items?.[0]?.quantity || reserve.quantity || 1)
       };
        if (promoAppliedTotal !== null) {
          metaPayload.value = promoAppliedTotal;
       }
       trackMetaEvent("AddToCart", metaPayload);
       openConfirmModal();
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
      closeConfirmModal();
      setSuccessReference(reservationRef);
      setSuccessOrderId(response?.id ?? null);
      openSuccessModal();
      const metaPayload = {
        content_ids: [String(product.id)],
        content_name: product.name || "",
        content_type: "product",
        currency: "PHP",
        quantity: Number(payload?.items?.[0]?.quantity || reserve.quantity || 1)
      };
      if (promoAppliedTotal !== null) {
        metaPayload.value = promoAppliedTotal;
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
    closeSuccessModal();
    setSuccessOrderId(null);
    setSuccessReference("");
    setReserve((prev) => ({
      ...prev,
      customerName: "",
      customerContact: "",
      notes: "",
        mop: "",
        mopOther: "",
      quantity: 0
    }));
    setPromoCode("");
    setAppliedPromotion(null);
    setAutoSalePromotion(null);
    setPromoMessage("");
    setHasConfirmedQuantity(false);
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
        setMessage("No checkout URL received.");
        setIsPaymentRedirecting(false);
        return;
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
                if (window.innerWidth < DESKTOP_BREAKPOINT) return;
                const touch = e.touches[0];
                if (!touch) return;
                getOriginFromPoint(touch.clientX, touch.clientY);
              }}
              onTouchMove={(e) => {
                if (window.innerWidth < DESKTOP_BREAKPOINT) return;
                if (zoomLevel <= 1) return;
                const touch = e.touches[0];
                if (!touch) return;
                getOriginFromPoint(touch.clientX, touch.clientY);
              }}
              onClick={() => {
                if (window.innerWidth < DESKTOP_BREAKPOINT) {
                  return;
                }
                setZoomIdx((prev) => (prev + 1) % ZOOM_LEVELS.length);
              }}
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
              {window.innerWidth >= DESKTOP_BREAKPOINT ? <span className="zoom-hint">{ZOOM_LABELS[zoomIdx]}</span> : null}
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
              <h1 className="reserve-product-title">{product.name}</h1>
              <div className="reserve-product-meta-row">
                {product.brand ? <span className="reserve-brand-chip">{product.brand}</span> : null}
                {selectedColorwayDetails?.department ? (
                  <span className="reserve-dept-chip">{formatEnumLabel(selectedColorwayDetails.department)}</span>
                ) : null}
                {Number(product.viewCount || 0) > 0 ? (
                  <span className="reserve-view-badge">
                    <Eye size={10} strokeWidth={2.1} />
                    {Number(product.viewCount).toLocaleString()} views
                  </span>
                ) : null}
              </div>
              {selectedProductDescription ? (
                <p className="reserve-product-desc">{selectedProductDescription}</p>
              ) : null}
              {selectedColorwayPriceLabel ? (
                <div className="reserve-product-price-display">{selectedColorwayPriceLabel}</div>
              ) : null}
              {teaserSalePriceLabel ? (
                <div className="reserve-upcoming-sale-price-row">
                  <span className="reserve-upcoming-sale-price-label">Teaser sale price</span>
                  <span className="reserve-upcoming-sale-price-value">{teaserSalePriceLabel}</span>
                </div>
              ) : null}
              {hasAutoSaleApplied ? (
                <div className="reserve-sale-indicator" role="status" aria-live="polite">
                  <span className="reserve-sale-indicator-chip">Sale Auto Applied</span>
                  <span className="reserve-sale-indicator-text">
                    {visibleSalePromoName}: {autoSaleDiscountPreview} {autoSaleTotalPreview}
                  </span>
                </div>
              ) : hasSalePromoAvailable ? (
                <div className="reserve-sale-indicator">
                  <span className="reserve-sale-indicator-chip reserve-sale-indicator-chip-pending">{isUpcomingSalePromotion ? "Sale Coming Soon" : "Sale Promo Available"}</span>
                  <span className="reserve-sale-indicator-text">
                    {pendingSalePreviewLabel}
                    {!isUpcomingSalePromotion ? " Select size and quantity to preview exact discount." : " The discount will apply automatically once the sale goes live."}
                  </span>
                  {isUpcomingSalePromotion ? (
                    <span className="reserve-sale-countdown" aria-live="polite">
                      Countdown: {upcomingCountdownLabel}
                    </span>
                  ) : null}
                </div>
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
                      onClick={toggleSizeGuideModal}
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
              <ReserveSizeGuideModal
                isOpen={isSizeGuideOpen && Boolean(sizeGuide) && Boolean(sizeGuideSection)}
                onClose={closeSizeGuideModal}
                sizeGuide={sizeGuide}
                sizeGuideSection={sizeGuideSection}
              />
              </div>
            </div>

            {/* Quantity stepper */}
            <div ref={quantitySectionRef} className={`form-section reserve-accordion-section ${isMobileSectionOpen("quantity") ? "open" : ""}`}>
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
                  className="qty-btn qty-btn-minus"
                  disabled={isDecrementDisabled}
                  onClick={() => {
                    setReserve({ ...reserve, quantity: Math.max(0, Number(reserve.quantity) - 1) });
                    setHasConfirmedQuantity(true);
                    setQuantityPulseDirection("down");
                    setQuantityPulseTick((prev) => prev + 1);
                  }}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <div className={`qty-value-stack qty-value-${quantityPulseDirection}`} key={`qty-${quantityPulseTick}`}>
                  <span className="qty-caption">Qty</span>
                  <span className="qty-value">{reserve.quantity}</span>
                </div>
                <button
                  type="button"
                  className="qty-btn qty-btn-plus"
                  onClick={() => {
                    setReserve({ ...reserve, quantity: Number(reserve.quantity) + 1 });
                    setHasConfirmedQuantity(true);
                    setQuantityPulseDirection("up");
                    setQuantityPulseTick((prev) => prev + 1);
                  }}
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
              <small className="qty-helper field-hint">
                {isSelectedSizePreOrder
                  ? "Pre-order mode: quantity will be requested from supplier."
                  : `Available now: ${selectedSizeAvailableQuantity}`}
              </small>
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
                className={`btn-primary reserve-submit-btn ${guidedActionClassName}`}
                onClick={() => openConfirmation().catch((err) => setMessage(err.message))}
              >
                <span className="reserve-cta-content">
                  <span className="reserve-cta-step">{guidedActionProgressLabel}</span>
                  <span>{guidedActionLabel}</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="reserve-sticky-cta" role="complementary" aria-label="Quick reserve">
          <div className="reserve-sticky-cta-meta">
            <span className="reserve-sticky-cta-size">{selectedSizeLabel || `US ${reserve.size}`}</span>
            <span className="reserve-sticky-cta-price">{selectedColorwayPriceLabel || "Select size"}</span>
          </div>
          <button
            type="button"
            className={`btn-primary reserve-sticky-cta-btn ${guidedActionClassName}`}
            onClick={() => openConfirmation().catch((err) => setMessage(err.message))}
          >
            <span className="reserve-cta-content">
              <span className="reserve-cta-step">{guidedActionProgressLabel}</span>
              <span>{guidedActionLabel}</span>
            </span>
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

      <ReserveConfirmModal
        isOpen={isConfirmOpen}
        isSubmitting={isSubmitting}
        onClose={closeConfirmModal}
        onSubmit={() => reserveNow().catch((err) => setMessage(err.message))}
        product={product}
        reserve={reserve}
        isSelectedSizePreOrder={isSelectedSizePreOrder}
        selectedColorwayPriceLabel={selectedColorwayPriceLabel}
        selectedSizeLabel={selectedSizeLabel}
        selectedSizePrice={selectedSizePrice}
        selectedSizePriceLabel={selectedSizePriceLabel}
        CUSTOMER_MOP_OPTIONS={CUSTOMER_MOP_OPTIONS}
        promoCode={promoCode}
        onPromoCodeChange={(nextValue) => {
          setPromoCode(nextValue);
          if (appliedPromotion && nextValue.trim() !== String(appliedPromotion.code || "").toUpperCase()) {
            setAppliedPromotion(null);
            setPromoMessage("");
          }
        }}
        appliedPromotion={appliedPromotion}
        autoSalePromotion={autoSalePromotion}
        onApplyPromo={() => applyPromoVoucher().catch((err) => setPromoMessage(err.message))}
        isApplyingPromo={isApplyingPromo}
        promoMessage={promoMessage}
        estimatedReservationValue={estimatedReservationValue}
        promoAppliedDiscount={promoAppliedDiscount}
        promoAppliedTotal={promoAppliedTotal}
      />

      <ReserveSuccessModal
        isOpen={isSuccessOpen}
        onClose={closeSuccessModal}
        successReference={successReference}
        onReserveAnother={handleReserveAnother}
        enableOnlinePayment={ENABLE_ONLINE_PAYMENT}
        onPayment={() => startOnlinePayment().catch((err) => setMessage(err.message))}
        successOrderId={successOrderId}
        isPaymentRedirecting={isPaymentRedirecting}
        onBackToCollections={() => navigate(backToCollectionsPath)}
      />
      {message ? <div className="toast-banner">{message}</div> : null}
    </main>
  );
}
