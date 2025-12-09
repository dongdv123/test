import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import WishlistButton from "./WishlistButton";

/**
 * LazyCollectionProductCard - Lazy loads collection product card when it enters viewport
 * Uses Intersection Observer API for efficient lazy loading
 */
export default function LazyCollectionProductCard({ 
  product, 
  index = 0, 
  badgeTop, 
  badgePill, 
  rating 
}) {
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

  if (!isVisible && !hasLoaded) {
    return (
      <article 
        ref={cardRef} 
        className="collection-product-card collection-card-flat"
        style={{ minHeight: "400px" }}
      >
        <div className="product-card-skeleton" style={{ minHeight: "400px" }} />
      </article>
    );
  }

  return (
    <article 
      ref={cardRef}
      className="collection-product-card collection-card-flat"
    >
      <div className="collection-card-media">
        {badgeTop && <span className="collection-badge-top">{badgeTop}</span>}
        <WishlistButton product={product} />
        <div className="product-card-image-wrapper">
          <img 
            src={product.img} 
            alt={product.title} 
            loading="lazy"
            width="400"
            height="400"
            decoding="async"
          />
        </div>
      </div>
      <div className="collection-card-body">
        {badgePill && <span className="collection-card-pill">{badgePill}</span>}
        <h4>{product.title}</h4>
        <div className="collection-price-row">
          {product.price && <span className="price">{product.price}</span>}
        </div>
        {rating && (
          <div className="collection-rating-row">
            <span className="star-icons">{rating.stars}</span>
            <span className="rating-count">{rating.count}</span>
          </div>
        )}
      </div>
      {product.handle && (
        <Link
          href={`/products/${product.handle}`}
          className="card-overlay"
          aria-label={`View ${product.title}`}
        />
      )}
    </article>
  );
}

