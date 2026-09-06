import { useRef, useState } from "react";
import "../styles/brands-marquee.css";

export default function BrandsMarquee({ brands = [], onBrandClick = () => {} }) {
  const MOUSE_DRAG_THRESHOLD_PX = 12;
  const TOUCH_DRAG_THRESHOLD_PX = 10;
  const wrapRef = useRef(null);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const dragMovedRef = useRef(0);
  const isPointerDownRef = useRef(false);
  const didDragRef = useRef(false);
  const pointerTypeRef = useRef("mouse");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const brandsWithLogo = brands.filter((brand) => Boolean(brand?.logoUrl));
  if (!brandsWithLogo.length) return null;

  // Ensure the track is long enough for seamless motion even with a small brand set.
  const repeatCount = brandsWithLogo.length < 6 ? 4 : 2;
  const loopBrands = Array.from({ length: repeatCount }, () => brandsWithLogo).flat();

  const normalizeOffset = (value) => {
    const track = wrapRef.current?.querySelector(".brands-marquee-track");
    const loopWidth = (track?.scrollWidth || 0) / 2;
    if (!Number.isFinite(loopWidth) || loopWidth <= 0) {
      return value;
    }
    let normalized = value % loopWidth;
    if (normalized > 0) {
      normalized -= loopWidth;
    }
    return normalized;
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    if (event.pointerType === "mouse") {
      // Desktop prioritizes logo clicks; drag gesture remains for touch/pen.
      return;
    }
    dragMovedRef.current = 0;
    didDragRef.current = false;
    isPointerDownRef.current = true;
    pointerTypeRef.current = event.pointerType || "mouse";
    dragStartXRef.current = event.clientX;
    dragStartOffsetRef.current = dragOffsetRef.current;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!isPointerDownRef.current) {
      return;
    }
    const deltaX = event.clientX - dragStartXRef.current;
    const moved = Math.abs(deltaX);
    dragMovedRef.current = Math.max(dragMovedRef.current, moved);
    const dragThreshold = pointerTypeRef.current === "mouse"
      ? MOUSE_DRAG_THRESHOLD_PX
      : TOUCH_DRAG_THRESHOLD_PX;
    if (!didDragRef.current && moved >= dragThreshold) {
      didDragRef.current = true;
      setIsDragging(true);
    }
    if (!didDragRef.current) {
      return;
    }
    const nextOffset = dragStartOffsetRef.current + deltaX;
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  };

  const stopDragging = () => {
    isPointerDownRef.current = false;
    if (!didDragRef.current) {
      return;
    }
    didDragRef.current = false;
    setIsDragging(false);
    const normalized = normalizeOffset(dragOffsetRef.current);
    dragOffsetRef.current = normalized;
    setDragOffset(normalized);
  };

  const handleLogoClick = (event, brandName) => {
    if (didDragRef.current || isDragging) {
      event.preventDefault();
      return;
    }
    onBrandClick(brandName);
  };

  return (
    <section className="brands-marquee" aria-label="Featured brands">
      <p className="brands-marquee-label">Featured Brands</p>
      <div
        ref={wrapRef}
        className={`brands-marquee-track-wrap${isDragging ? " is-dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <div className="brands-marquee-track-offset" style={{ "--brands-marquee-drag-offset": `${dragOffset}px` }}>
          <ul className="brands-marquee-track">
            {loopBrands.map((brand, index) => (
              <li key={`${brand.id || brand.name}-${index}`} className="brands-marquee-pill">
                <button
                  type="button"
                  className="brands-marquee-link"
                  onClick={(event) => handleLogoClick(event, brand.name)}
                  aria-label={`Shop ${brand.name}`}
                  title={`Shop ${brand.name}`}
                >
                  <img className="brands-marquee-logo" src={brand.logoUrl} alt={brand.name} loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}


