import { useState, useEffect, useRef } from "react";
import ProductCard from "./ProductCard";

/**
 * LazyProductCard - Lazy loads ProductCard when it enters viewport
 * Uses Intersection Observer API for efficient lazy loading
 * This reduces initial render cost and improves page load performance
 */
export default function LazyProductCard({ product, index = 0, variant = "flat", ...props }) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    // Skip if already loaded
    if (hasLoaded) return;

    // Check if IntersectionObserver is supported
    if (typeof window === "undefined" || !window.IntersectionObserver) {
      // Fallback: load immediately if IntersectionObserver is not supported
      setIsVisible(true);
      setHasLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setHasLoaded(true);
            // Disconnect observer once loaded to improve performance
            observer.disconnect();
          }
        });
      },
      {
        // Start loading when card is 200px away from viewport
        rootMargin: "200px",
        threshold: 0.01,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasLoaded]);

  return (
    <div ref={cardRef} style={{ minHeight: hasLoaded ? "auto" : "400px" }}>
      {isVisible || hasLoaded ? (
        <ProductCard product={product} index={index} variant={variant} {...props} />
      ) : (
        <div className="product-card-skeleton" style={{ minHeight: "400px" }} />
      )}
    </div>
  );
}

