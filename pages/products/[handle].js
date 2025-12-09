import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import ProductCard from "../../components/ProductCard";
import WishlistButton from "../../components/WishlistButton";
import { fetchProductByHandle, fetchShopifyCollections, fetchShopifyMenuAsNavItems, createCart, addToCart } from "../../lib/shopify";
import { formatPrice } from "../../lib/productFormatter";
import { navLinks as baseNavLinks } from "../../lib/siteContent";
import { getNavItems } from "../../lib/navUtils";
import { getBestInstallmentOption } from "../../lib/shopifyInstallments";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useCart } from "../../context/CartContext";
import { useSlider } from "../../hooks/useSlider";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed";
import { useProductVariant } from "../../hooks/useProductVariant";
import { useHeaderHeight } from "../../hooks/useHeaderHeight";

const formatPriceRange = (product) => {
  const min = Number(product.priceRange?.min?.amount);
  const max = Number(product.priceRange?.max?.amount);
  const currency =
    product.priceRange?.min?.currencyCode || product.priceRange?.max?.currencyCode || "USD";

  if (Number.isFinite(min) && Number.isFinite(max) && max !== min) {
    return `${formatPrice(min, currency)} - ${formatPrice(max, currency)}`;
  }

  if (Number.isFinite(min)) {
    return formatPrice(min, currency);
  }

  return "";
};

const getGalleryImages = (product) => {
  const sources = [
    product.image?.src,
    ...(product.images || []).map((img) => img.src),
    // Include variant images
    ...(product.variants || [])
      .map((variant) => variant.image?.src)
      .filter(Boolean),
  ].filter(Boolean);

  // Remove duplicates
  return Array.from(new Set(sources));
};

export default function ProductDetailPage({ product, navItems }) {
  // Get images including variant images - recalculate when product changes
  const images = useMemo(() => getGalleryImages(product), [product]);
  const priceText = formatPriceRange(product);

  // Generate deterministic viewer count based on product ID to avoid SSR/CSR mismatch
  const viewerCount = useMemo(() => {
    const source = product?.id || product?.handle || "default";
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
      hash = (hash << 5) - hash + source.charCodeAt(i);
      hash |= 0; // convert to 32-bit int
    }
    const min = 8;
    const max = 22;
    const normalized = Math.abs(hash % 1000) / 1000; // 0..0.999
    return Math.floor(normalized * (max - min + 1)) + min;
  }, [product?.id, product?.handle]);

  const [showDrawer, setShowDrawer] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [activeImage, setActiveImage] = useState(() => images.length > 0 ? images[0] : null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [clickToNavigate, setClickToNavigate] = useState(true);
  const [showZoomPopup, setShowZoomPopup] = useState(false);
  const [popupTouchStart, setPopupTouchStart] = useState(null);
  const [popupTouchEnd, setPopupTouchEnd] = useState(null);
  const [activeTab, setActiveTab] = useState('reviews');
  const [expandedSections, setExpandedSections] = useState({});
  const [showDeliveryTimeline, setShowDeliveryTimeline] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [isBuyNowLoading, setIsBuyNowLoading] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [countdownTime, setCountdownTime] = useState(null);
  const [installmentOption, setInstallmentOption] = useState(null);
  const [isLoadingInstallment, setIsLoadingInstallment] = useState(false);

  // Check if product has countdown tag (used in both useEffect and render)
  const hasCountdown = useMemo(() => {
    return product.tags?.some(tag => 
      tag.toLowerCase().includes('countdown') || 
      tag.toLowerCase().includes('limited-time') ||
      tag.toLowerCase().includes('flash-sale')
    ) || false;
  }, [product.tags]);

  // Countdown timer effect
  useEffect(() => {
    if (!hasCountdown) return;

    // Set countdown to 24 hours from now (or extract from tag if available)
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 24);
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = endTime - now;
      
      if (diff <= 0) {
        setCountdownTime({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdownTime({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [hasCountdown]);

  // Calculate header height and set CSS variable for sticky gallery
  useHeaderHeight();
  
  // Custom hooks
  const { registerTrack, slide, hasMultipleSlides } = useSlider();
  const recentlyViewed = useRecentlyViewed(product);
  const { 
    selectedOptions, 
    setSelectedOptions, 
    quantity, 
    setQuantity, 
    activeVariant,
    incrementQuantity,
    decrementQuantity,
    setQuantityValue
  } = useProductVariant(product);

  // Fetch installment pricing when variant or quantity changes
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;
    
    if (!activeVariant?.id) {
      setInstallmentOption(null);
      setIsLoadingInstallment(false);
      return;
    }

    let cancelled = false;
    
    // Debounce API call
    const timeoutId = setTimeout(() => {
      setIsLoadingInstallment(true);
      
      // Call API route instead of direct function (for server-side env vars)
      fetch("/api/installment-pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variantId: activeVariant.id,
          quantity: quantity,
        }),
      })
        .then((res) => res.json())
        .then((result) => {
          if (cancelled) return;
          
          if (result?.data) {
            const bestOption = getBestInstallmentOption(result.data);
            setInstallmentOption(bestOption);
          } else {
            setInstallmentOption(null);
          }
        })
        .catch((error) => {
          if (cancelled) return;
          // Silently fail - fallback to hardcoded pricing
          setInstallmentOption(null);
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoadingInstallment(false);
          }
        });
    }, 300); // 300ms debounce

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [activeVariant?.id, quantity]);

  // Find collection link for category - only link if collection exists
  const categoryLink = useMemo(() => {
    if (!product.productType) return null;
    const productTypeLower = product.productType.toLowerCase();
    // Try to find matching collection in navItems by title
    const matchingNav = navItems.find(
      (nav) => nav.title?.toLowerCase() === productTypeLower
    );
    // Only return link if we found a real collection with href
    if (matchingNav?.href) {
      return matchingNav.href;
    }
    // Don't create fake links - return null if no match
    return null;
  }, [product.productType, navItems]);

  // Track if user manually selected an image
  const [manualImageSelection, setManualImageSelection] = useState(false);

  // Update active image when variant changes (only if user hasn't manually selected)
  useEffect(() => {
    // Skip if no images or user manually selected an image
    if (images.length === 0 || manualImageSelection) return;

    if (activeVariant?.image?.src) {
      // Variant has its own image - check if it exists in images array
      // Normalize URLs for comparison (remove query params, trailing slashes, etc.)
      const normalizeUrl = (url) => {
        if (!url) return '';
        try {
          const urlObj = new URL(url);
          return urlObj.origin + urlObj.pathname;
        } catch {
          return url.split('?')[0].replace(/\/$/, '');
        }
      };

      const variantImageUrl = normalizeUrl(activeVariant.image.src);

      // Find matching image in gallery
      const variantImageIndex = images.findIndex(img => {
        const imgUrl = normalizeUrl(img);
        return imgUrl === variantImageUrl || img === activeVariant.image.src;
      });

      if (variantImageIndex !== -1) {
        // Image exists in gallery, use it
        setActiveImageIndex(variantImageIndex);
        setActiveImage(images[variantImageIndex]);
      } else {
        // Variant image not found in gallery - use first image
        console.warn('Variant image not found in gallery:', activeVariant.image.src, 'Available images:', images);
        setActiveImageIndex(0);
        setActiveImage(images[0]);
      }
    } else {
      // Variant has no image, use first product image
      // But only update if current image is not in the product images list
      if (!activeImage || !images.includes(activeImage)) {
        setActiveImageIndex(0);
        setActiveImage(images[0]);
      }
    }
  }, [activeVariant?.id, activeVariant?.image?.src, images, manualImageSelection]); // Removed activeImage from dependencies to prevent loop

  // Reset manual selection flag when variant changes
  useEffect(() => {
    setManualImageSelection(false);
  }, [activeVariant?.id]);

  // Initialize activeImage when images first load and validate activeImageIndex
  useEffect(() => {
    if (images.length === 0) {
      setActiveImage(null);
      setActiveImageIndex(0);
      return;
    }

    // If no active image or active image is not in the new images array, reset to first image
    if (!activeImage || !images.includes(activeImage)) {
      setActiveImage(images[0]);
      setActiveImageIndex(0);
      return;
    }

    // Validate activeImageIndex is within bounds
    if (activeImageIndex >= images.length) {
      const correctIndex = images.indexOf(activeImage);
      if (correctIndex !== -1) {
        setActiveImageIndex(correctIndex);
      } else {
        setActiveImage(images[0]);
        setActiveImageIndex(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]); // Run when images array changes

  // Sync activeImageIndex with activeImage (only when activeImage changes externally)
  useEffect(() => {
    if (!activeImage || images.length === 0) return;
    const index = images.indexOf(activeImage);
    if (index !== -1 && index !== activeImageIndex) {
      setActiveImageIndex(index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImage]); // Only depend on activeImage to avoid loops - images and activeImageIndex are checked inside

  // Handle swipe gestures
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    if (images.length === 0) return;
    if (e.touches.length === 1) {
      setTouchStart(e.touches[0].clientX);
      setTouchEnd(null);
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 1) {
      setTouchEnd(e.touches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    if (images.length === 0) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }

    if (touchStart && touchEnd !== null) {
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe && activeImageIndex < images.length - 1) {
        const nextIndex = activeImageIndex + 1;
        setActiveImageIndex(nextIndex);
        setActiveImage(images[nextIndex]);
        setManualImageSelection(true);
      }
      if (isRightSwipe && activeImageIndex > 0) {
        const prevIndex = activeImageIndex - 1;
        setActiveImageIndex(prevIndex);
        setActiveImage(images[prevIndex]);
        setManualImageSelection(true);
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Handle click - navigate or open zoom popup based on clickToNavigate setting
  const handleImageClick = (e) => {
    if (images.length === 0) return;

    // Prevent click when swiping
    if (touchStart && touchEnd && Math.abs(touchStart - touchEnd) > 10) {
      return;
    }

    // If clickToNavigate is enabled, navigate to next/previous image
    if (clickToNavigate && images.length > 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;

      // Click on left half -> previous image
      if (clickX < width / 2 && activeImageIndex > 0) {
        const prevIndex = activeImageIndex - 1;
        setActiveImageIndex(prevIndex);
        setActiveImage(images[prevIndex]);
        setManualImageSelection(true);
        return;
      }
      // Click on right half -> next image
      if (clickX >= width / 2 && activeImageIndex < images.length - 1) {
        const nextIndex = activeImageIndex + 1;
        setActiveImageIndex(nextIndex);
        setActiveImage(images[nextIndex]);
        setManualImageSelection(true);
        return;
      }
    } else {
      // If clickToNavigate is disabled, open zoom popup
      setShowZoomPopup(true);
    }
  };

  // Close zoom popup
  const closeZoomPopup = () => {
    setShowZoomPopup(false);
  };

  // Handle swipe in popup
  const onPopupTouchStart = (e) => {
    if (e.touches.length === 1) {
      setPopupTouchStart(e.touches[0].clientX);
      setPopupTouchEnd(null);
    }
  };

  const onPopupTouchMove = (e) => {
    if (e.touches.length === 1) {
      setPopupTouchEnd(e.touches[0].clientX);
    }
  };

  const onPopupTouchEnd = () => {
    if (images.length === 0) {
      setPopupTouchStart(null);
      setPopupTouchEnd(null);
      return;
    }

    if (popupTouchStart && popupTouchEnd !== null) {
      const distance = popupTouchStart - popupTouchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe && activeImageIndex < images.length - 1) {
        const nextIndex = activeImageIndex + 1;
        setActiveImageIndex(nextIndex);
        setActiveImage(images[nextIndex]);
        setManualImageSelection(true);
      }
      if (isRightSwipe && activeImageIndex > 0) {
        const prevIndex = activeImageIndex - 1;
        setActiveImageIndex(prevIndex);
        setActiveImage(images[prevIndex]);
        setManualImageSelection(true);
      }
    }
    setPopupTouchStart(null);
    setPopupTouchEnd(null);
  };

  // Handle keyboard escape to close popup
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showZoomPopup) {
        closeZoomPopup();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showZoomPopup]);

  // Sticky CTA visibility - show only when Add to Cart button is completely hidden from viewport (minus header height)
  useEffect(() => {
    const handleScroll = () => {
      const ctaElement = document.querySelector('.product-cta-row');
      const headerElement = document.querySelector('.header');

      if (ctaElement) {
        const rect = ctaElement.getBoundingClientRect();
        // Get header height, default to 0 if not found
        const headerHeight = headerElement ? headerElement.offsetHeight : 0;

        // Show sticky bar only when the CTA row is completely out of viewport
        // Account for header height: element is hidden when its bottom is above (header height)
        // or when its top is below the bottom of viewport
        const isCompletelyHidden = rect.bottom < headerHeight || rect.top > window.innerHeight;
        setShowStickyCTA(isCompletelyHidden);
      }
    };
    // Initial check
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const currency =
    activeVariant?.currency_code ||
    product.priceRange?.min?.currencyCode ||
    product.priceRange?.max?.currencyCode ||
    "USD";
  const displayPrice = activeVariant?.price ? formatPrice(Number(activeVariant.price), currency) : priceText;
  const { addItem, items: cartItems } = useCart();

  const handleAddToCart = useCallback(async () => {
    if (!activeVariant?.id) {
      console.error("Cannot add to cart: no active variant", { activeVariant, product });
      alert("Please select a variant before adding to cart");
      return;
    }

    if (!activeVariant.available) {
      alert("This variant is currently out of stock");
      return;
    }

    setIsAddingToCart(true);
    setShowDrawer(true); // Open drawer immediately to show loading state

    const unitPrice = Number(activeVariant?.price ?? product.priceRange?.min?.amount ?? 0);

    try {
      await addItem(
        {
          id: activeVariant.id,
          variantId: activeVariant.id, // Shopify variant ID for API (should be base64 GID)
          title: product.title,
          handle: product.handle,
          image: activeImage,
          unitPrice,
          currency,
          priceFormatted: formatPrice(unitPrice || 0, currency),
          variantTitle: activeVariant?.title || null,
        },
        quantity,
      );
    } catch (error) {
      console.error("Failed to add item to cart:", error);
      alert("Failed to add item to cart. Please try again.");
      setShowDrawer(false); // Close drawer on error
    } finally {
      setIsAddingToCart(false);
    }
  }, [activeVariant, product, activeImage, currency, quantity, addItem]);

  // Buy Now handler - create a fresh temp cart and go straight to Shopify checkout
  const handleBuyNow = useCallback(async () => {
    if (!activeVariant?.id) {
      alert("Please select a variant before purchasing");
      return;
    }

    if (!activeVariant.available) {
      alert("This variant is currently out of stock");
      return;
    }

    setIsBuyNowLoading(true);

    try {
      // Create a temporary cart that is isolated from the main cart
      const tempCart = await createCart();
      if (!tempCart?.id) {
        throw new Error("Unable to create temporary cart for Buy Now");
      }

      // Add only the current variant to that temp cart
      const cartWithItem = await addToCart(tempCart.id, activeVariant.id, quantity);
      const checkoutUrl = cartWithItem?.checkoutUrl || tempCart?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error("Missing checkout URL for Buy Now");
      }

      // Redirect directly to Shopify checkout for this single-item cart
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Failed to process Buy Now:", error);
      alert("Failed to start checkout. Please try again.");
      setIsBuyNowLoading(false);
    }
  }, [activeVariant?.id, activeVariant?.available, quantity]);

  // Handle notify me when back in stock
  const handleNotifyMe = async () => {
    if (!notifyEmail || !notifyEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    // TODO: Connect to actual back-in-stock notification API
    // Notify when available functionality - to be implemented
    alert(`We'll notify you at ${notifyEmail} when this product is back in stock!`);
    setShowNotifyModal(false);
    setNotifyEmail('');
  };

  const lastCartItem = cartItems[cartItems.length - 1];

  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    description: product.description || product.title,
    image: images,
    offers: {
      "@type": "Offer",
      price: activeVariant?.price || product.priceRange?.min?.amount || "0",
      priceCurrency: currency,
      availability: activeVariant?.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <Head>
        <title>{product.title} | Gikzo</title>
        <meta name="description" content={product.description || `${product.title} - Available at Gikzo`} />
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={product.description || product.title} />
        <meta property="og:type" content="product" />
        {images[0] && <meta property="og:image" content={images[0]} />}
        <meta property="product:price:amount" content={activeVariant?.price || product.priceRange?.min?.amount || "0"} />
        <meta property="product:price:currency" content={currency} />
        <link rel="canonical" href={`https://gikzo.com/products/${product.handle}`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      </Head>
      <Layout navItems={navItems}>
        <nav className="collection-breadcrumb container">
        <span>
          <Link href="/">home</Link>
          <span className="breadcrumb-divider"> / </span>
        </span>
        {product.productType && (
          <span>
            {categoryLink ? (
              <Link href={categoryLink}>{product.productType.toLowerCase()}</Link>
            ) : (
              product.productType.toLowerCase()
            )}
            <span className="breadcrumb-divider"> / </span>
          </span>
        )}
        <span>{product.title}</span>
      </nav>

      <section className="product-hero">
        <div className="product-gallery sticky-element">
            {activeImage && images.length > 0 && (
              <div
                className={`product-main-image-container ${clickToNavigate ? 'click-to-navigate' : ''}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClick={handleImageClick}
              >
            <div className="product-main-image">
              <WishlistButton product={product} className="product-wishlist-button" />
                  {images.length > 1 && (
                    <div className="product-gallery-controls">
                      <button
                        type="button"
                        className={`product-gallery-toggle-btn ${clickToNavigate ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setClickToNavigate(!clickToNavigate);
                        }}
                        title={clickToNavigate ? "Click to navigate images (On)" : "Click to zoom image (Off)"}
                        aria-label={clickToNavigate ? "Disable click to navigate" : "Enable click to navigate"}
                      >
                        <span className="material-icons">{clickToNavigate ? 'touch_app' : 'pan_tool'}</span>
                        <span className="product-gallery-toggle-label">
                          {clickToNavigate ? 'Click to navigate' : 'Click to zoom'}
                        </span>
                      </button>
                    </div>
                  )}
                  <div className="product-gallery-slider-wrapper">
                    <div
                      className="product-gallery-slider"
                      style={{
                        transform: `translateX(-${activeImageIndex * 100}%)`,
                        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      {images.map((src, index) => (
                        <div
                          key={src}
                          className="product-gallery-slide"
                        >
                          <div className="product-image-zoom-wrapper">
                            <img
                              src={src}
                              alt={`${product.title} - Image ${index + 1}`}
                              loading={index === 0 ? "eager" : "lazy"}
                              decoding="async"
                              className="product-main-image-img"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {images.length > 1 && (
                  <>
                    <button
                      className="product-gallery-nav product-gallery-prev"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeImageIndex > 0) {
                          const prevIndex = activeImageIndex - 1;
                          setActiveImageIndex(prevIndex);
                          setActiveImage(images[prevIndex]);
                          setManualImageSelection(true);
                        }
                      }}
                      aria-label="Previous image"
                      disabled={activeImageIndex === 0}
                    >
                      <span className="material-icons">chevron_left</span>
                    </button>
                    <button
                      className="product-gallery-nav product-gallery-next"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeImageIndex < images.length - 1) {
                          const nextIndex = activeImageIndex + 1;
                          setActiveImageIndex(nextIndex);
                          setActiveImage(images[nextIndex]);
                          setManualImageSelection(true);
                        }
                      }}
                      aria-label="Next image"
                      disabled={activeImageIndex === images.length - 1}
                    >
                      <span className="material-icons">chevron_right</span>
                    </button>
                  </>
                )}
              </div>
            )}
            {images.length > 1 && (
              <div className="product-gallery-pagination">
                {images.map((_, index) => (
                  <button
                    key={index}
                    className={`product-gallery-dot ${index === activeImageIndex ? 'active' : ''}`}
                    onClick={() => {
                      setActiveImageIndex(index);
                      setActiveImage(images[index]);
                      setManualImageSelection(true);
                    }}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
            </div>
          )}
          {images.length > 1 && (
            <div className="product-thumbnails">
                {images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                    className={activeImageIndex === index ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                      setActiveImageIndex(index);
                    setActiveImage(src);
                    setManualImageSelection(true);
                  }}
                >
                  <img src={src} alt={`${product.title} thumbnail`} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          <h1>{product.title}</h1>
            {/* Emotional Hook */}
          <div className="product-brand-rating">
            <div className="product-brand">Created by {product.vendor || 'Uncommon Goods'}</div>
            <div className="product-rating-summary">
              <div className="product-rating-stars">
                <span className="star-icons">★★★★★</span>
                <span className="rating-text">5</span>
              </div>
              <a 
                href="#reviews" 
                className="product-reviews-link" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  setActiveTab('reviews');
                  document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Based on 3 Reviews
              </a>
            </div>
          </div>
            
            {/* Product Hook - Emotional connection early */}
            <p className="product-hook">
              {product.description
                ? product.description.split('.')[0] + '.'
                : "A perfect gift for plant lovers"}
            </p>
            
          {product.tags?.includes('exclusive') && (
            <div className="product-exclusive-badge">
              <span className="exclusive-icon">U</span>
              <span>Exclusive</span>
            </div>
          )}
            {/* Price with Urgency */}
            {displayPrice && (
              <div className="product-price-section">
                <div className="price-wrapper">
                  {product.compareAtPrice && (
                    <span className="compare-price">${Number(product.compareAtPrice).toFixed(2)}</span>
                  )}
                  <div className="product-price-large">{displayPrice}</div>
                </div>
                {product.compareAtPrice && Number(product.compareAtPrice) > Number(activeVariant?.price || product.priceRange?.min?.amount) && (
                  <div className="savings-badge">
                    Save ${(Number(product.compareAtPrice) - Number(activeVariant?.price || product.priceRange?.min?.amount)).toFixed(2)}
                    ({Math.round(((Number(product.compareAtPrice) - Number(activeVariant?.price || product.priceRange?.min?.amount)) / Number(product.compareAtPrice)) * 100)}% OFF)
                  </div>
                )}

                {/* Stock Indicator */}
                {activeVariant?.available ? (
                  activeVariant?.inventoryQuantity && activeVariant.inventoryQuantity <= 20 ? (
                    <div className="stock-indicator">
                      <div className="stock-warning">
                        <span className="warning-icon">⚠️</span>
                        <span className="urgency-text">
                          {activeVariant.inventoryQuantity <= 5
                            ? `Only ${activeVariant.inventoryQuantity} left in stock!`
                            : `Low stock - Only ${activeVariant.inventoryQuantity} remaining`}
                        </span>
                      </div>
                      <div className="stock-progress-bar">
                        <div
                          className="stock-fill"
                          style={{ width: `${Math.min((activeVariant.inventoryQuantity / 20) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="urgency-viewers">
                        {viewerCount} people viewing this product
                      </div>
                    </div>
                  ) : (
                    <div className="product-urgency">
                      <span className="stock-available">✓ In Stock - Ready to Ship</span>
                      <span className="urgency-viewers">
                        {viewerCount} people viewing this product
                      </span>
                    </div>
                  )
                ) : (
                  <div className="out-of-stock-indicator">
                    <span className="out-of-stock-text">Currently Out of Stock</span>
                  </div>
                )}

                {/* Special Offers Section */}
                {(() => {
                  const offers = [];
                  
                  // Check for discount/promo tags
                  const hasDiscount = product.tags?.some(tag => 
                    tag.toLowerCase().includes('discount') || 
                    tag.toLowerCase().includes('promo') ||
                    tag.toLowerCase().includes('sale') ||
                    tag.toLowerCase().includes('off')
                  );
                  
                  // Check for free gift tags
                  const hasFreeGift = product.tags?.some(tag => 
                    tag.toLowerCase().includes('free-gift') || 
                    tag.toLowerCase().includes('gift-with-purchase')
                  );
                  
                  // Check for free shipping (already in trust badges, but can highlight)
                  const hasFreeShipping = product.tags?.some(tag => 
                    tag.toLowerCase().includes('free-shipping')
                  );
                  
                  // Check for bundle discount
                  const hasBundleDiscount = product.tags?.some(tag => 
                    tag.toLowerCase().includes('bundle') && 
                    (tag.toLowerCase().includes('save') || tag.toLowerCase().includes('discount'))
                  );
                  
                  // Check for countdown/limited time tags (use the memoized value)
                  const hasCountdownTag = hasCountdown;
                  
                  // Calculate discount percentage if compareAtPrice exists
                  const discountPercent = product.compareAtPrice && activeVariant?.price
                    ? Math.round(((Number(product.compareAtPrice) - Number(activeVariant.price)) / Number(product.compareAtPrice)) * 100)
                    : null;
                  
                  if (discountPercent && discountPercent > 0) {
                    offers.push({
                      type: 'discount',
                      title: `Save ${discountPercent}%`,
                      description: 'Limited time offer',
                      highlight: true
                    });
                  }
                  
                  if (hasFreeGift) {
                    offers.push({
                      type: 'gift',
                      title: 'Free Gift Included',
                      description: 'Get a free gift with your purchase',
                      highlight: true
                    });
                  }
                  
                  if (hasBundleDiscount) {
                    offers.push({
                      type: 'bundle',
                      title: 'Bundle & Save',
                      description: 'Save more when you bundle',
                      highlight: false
                    });
                  }
                  
                  if (hasDiscount && !discountPercent) {
                    offers.push({
                      type: 'promo',
                      title: 'Special Promotion',
                      description: 'Check out our special offers',
                      highlight: false
                    });
                  }
                  
                  if (offers.length === 0 && !hasCountdownTag) return null;
                  
                  const getOfferIcon = (type) => {
                    switch(type) {
                      case 'discount':
                        return (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                            <path d="M7 9l5 3 5-3" />
                            <path d="M12 12v10" />
                            <path d="M7 9v10" />
                            <path d="M17 9v10" />
                          </svg>
                        );
                      case 'gift':
                        return (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 12 20 22 4 22 4 12" />
                            <rect x="2" y="7" width="20" height="5" />
                            <line x1="12" y1="22" x2="12" y2="7" />
                            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                          </svg>
                        );
                      case 'bundle':
                        return (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                          </svg>
                        );
                      case 'promo':
                        return (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        );
                      default:
                        return null;
                    }
                  };
                  
                  return (
                    <div className="product-special-offers">
                      <div className="special-offers-header">
                        <span className="offers-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                        </span>
                        <span className="offers-title">Special Offers</span>
                      </div>
                      
                      {/* Countdown Timer */}
                      {hasCountdownTag && countdownTime && (
                        <div className="offer-countdown">
                          <div className="countdown-label">
                            <span className="countdown-label-icon" aria-hidden="true">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                              </svg>
                            </span>
                            <span>Limited Time Offer - Ends in:</span>
                          </div>
                          <div className="countdown-timer">
                            <div className="countdown-item">
                              <span className="countdown-value">{String(countdownTime.hours).padStart(2, '0')}</span>
                              <span className="countdown-unit">Hours</span>
                            </div>
                            <span className="countdown-separator">:</span>
                            <div className="countdown-item">
                              <span className="countdown-value">{String(countdownTime.minutes).padStart(2, '0')}</span>
                              <span className="countdown-unit">Minutes</span>
                            </div>
                            <span className="countdown-separator">:</span>
                            <div className="countdown-item">
                              <span className="countdown-value">{String(countdownTime.seconds).padStart(2, '0')}</span>
                              <span className="countdown-unit">Seconds</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="special-offers-list">
                        {offers.map((offer, index) => (
                          <div 
                            key={index} 
                            className={`special-offer-item ${offer.highlight ? 'highlight' : ''}`}
                          >
                            <span className="offer-icon" aria-hidden="true">
                              {getOfferIcon(offer.type)}
                            </span>
                            <div className="offer-content">
                              <div className="offer-title">{offer.title}</div>
                              <div className="offer-description">{offer.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Trust Badges */}
                <div className="product-trust-badges">
                  <div className="trust-badge">
                    <span className="trust-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="7" width="13" height="10" rx="2" />
                        <path d="M16 11h2.5a1.5 1.5 0 0 1 1.32.82l1.18 2.36A1 1 0 0 1 20.1 16H16" />
                        <circle cx="7.5" cy="17.5" r="1.5" />
                        <circle cx="17" cy="17.5" r="1.5" />
                      </svg>
                    </span>
                    <span className="trust-text">
                      Free Shipping
                    </span>
                  </div>
                  <div className="trust-badge">
                    <span className="trust-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="11" width="12" height="9" rx="2" />
                        <path d="M9 11V8a3 3 0 0 1 6 0v3" />
                      </svg>
                    </span>
                    <span className="trust-text">
                      Secure Checkout
                    </span>
                  </div>
                  <div className="trust-badge">
                    <span className="trust-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 1 2.64 6.36" />
                        <polyline points="3 12 3 17 8 17" />
                      </svg>
                    </span>
                    <span className="trust-text">
                      30-Day Returns
                    </span>
                  </div>
                  <div className="trust-badge">
                    <span className="trust-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4z" />
                        <path d="m9.5 12.5 2 2 3-3.5" />
                      </svg>
                    </span>
                    <span className="trust-text">
                      Money-Back Guarantee
                    </span>
                  </div>
                </div>
              </div>
            )}
          {product.options?.length ? (
            <div className="product-options">
              {product.options
                .filter((option) => option.values && option.values.length)
                  .map((option) => {
                    // Check if this option has images
                    const optionNameLower = option.name?.toLowerCase() || '';
                    const hasImageOption = option.values.some((value) => {
                      const tempOptions = { ...selectedOptions, [option.name]: value };
                      let matchingVariant = product.variants?.find((variant) =>
                        (variant.selectedOptions || []).every(
                          (opt) => tempOptions[opt.name] === opt.value
                        )
                      );
                      if (!matchingVariant) {
                        matchingVariant = product.variants?.find((variant) => {
                          const optionMatch = variant.selectedOptions?.find(
                            (opt) => opt.name === option.name && opt.value === value
                          );
                          return optionMatch !== undefined;
                        });
                      }
                      const variantImage = matchingVariant?.image?.src;
                      return variantImage && (
                        optionNameLower.includes('material') ||
                        optionNameLower.includes('color') ||
                        optionNameLower.includes('colour')
                      );
                    });

                    // Get selected value for this option
                    const selectedValue = selectedOptions[option.name];
                    const selectedValueText = hasImageOption && selectedValue 
                      ? `${option.name} - ${selectedValue}` 
                      : option.name;

                    return (
                  <div key={option.name}>
                        <div className="option-label">{selectedValueText}</div>
                    <div className="option-values">
                      {option.values.map((value) => {
                        // Find variant that matches this option value
                        // Try to find variant with this specific option value, considering other selected options
                        let matchingVariant = null;
                        
                        // First, try to find variant with this option value AND other selected options
                        const tempOptions = { ...selectedOptions, [option.name]: value };
                        matchingVariant = product.variants?.find((variant) =>
                          (variant.selectedOptions || []).every(
                            (opt) => tempOptions[opt.name] === opt.value
                          )
                        );
                        
                        // If not found, try to find any variant with this option value (ignore other options)
                        if (!matchingVariant) {
                          matchingVariant = product.variants?.find((variant) => {
                            const optionMatch = variant.selectedOptions?.find(
                              (opt) => opt.name === option.name && opt.value === value
                            );
                            return optionMatch !== undefined;
                          });
                        }
                        
                        // Get variant image if exists
                        // Only show image for Material and Color options, not for Size
                        const variantImage = matchingVariant?.image?.src;
                        const shouldShowImage = variantImage && 
                                              (optionNameLower.includes('material') || 
                                               optionNameLower.includes('color') || 
                                               optionNameLower.includes('colour'));

                        return (
                          <button
                            key={value}
                            type="button"
                            className={selectedOptions[option.name] === value ? "active" : ""}
                            onClick={() =>
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [option.name]: value,
                              }))
                            }
                          >
                            {shouldShowImage ? (
                              <span className="option-value-with-image">
                                <img src={variantImage} alt={value} loading="lazy" />
                              </span>
                            ) : (
                              <span>{value}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                    );
                  })}
            </div>
          ) : null}

          {/* Bundle section */}
          {product.tags?.some(tag => tag.toLowerCase().includes('bundle')) && (
            <div className="product-bundle-section">
              <div className="bundle-header">
                <h3 className="bundle-title">Create Your Bundle</h3>
                <p className="bundle-description">Save more when you bundle this product with others</p>
              </div>
              <a href="/bundle-builder" className="btn btn-secondary bundle-link">
                Build Your Bundle
              </a>
            </div>
          )}

          {/* Get it by section */}
          <div className="product-get-it-by">
            {(() => {
              // Get shipping info from product tags or use defaults based on country
              const hasExpressShipping = product.tags?.some(tag => 
                tag.toLowerCase().includes('express') || tag.toLowerCase().includes('fast')
              );
              const hasInternationalShipping = product.tags?.some(tag => 
                tag.toLowerCase().includes('international') || tag.toLowerCase().includes('global')
              );
              
              // Calculate shipping days based on country and product tags
              let shippingDays = 2;
              let deliveryDays = 15;
              
              if (selectedCountry === 'US') {
                shippingDays = hasExpressShipping ? 1 : 2;
                deliveryDays = hasExpressShipping ? 3 : 7;
              } else {
                shippingDays = hasExpressShipping ? 2 : 3;
                deliveryDays = hasInternationalShipping ? 10 : 15;
              }
              
              // Calculate delivery dates
              const today = new Date();
              const orderPlacedDate = new Date(today);
              const orderPlacedFormatted = orderPlacedDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric'
              });
              
              // Order ships
              let daysAdded = 0;
              let shipStartDate = new Date(today);
              while (daysAdded < shippingDays) {
                shipStartDate.setDate(shipStartDate.getDate() + 1);
                if (shipStartDate.getDay() !== 0 && shipStartDate.getDay() !== 6) {
                  daysAdded++;
                }
              }
              let shipEndDate = new Date(shipStartDate);
              daysAdded = 0;
              while (daysAdded < 1) {
                shipEndDate.setDate(shipEndDate.getDate() + 1);
                if (shipEndDate.getDay() !== 0 && shipEndDate.getDay() !== 6) {
                  daysAdded++;
                }
              }
              
              const shipStartFormatted = shipStartDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric'
              });
              const shipEndFormatted = shipEndDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric'
              });
              
              // Delivered
              let deliveryDaysAdded = 0;
              let deliveryStartDate = new Date(shipEndDate);
              while (deliveryDaysAdded < deliveryDays) {
                deliveryStartDate.setDate(deliveryStartDate.getDate() + 1);
                if (deliveryStartDate.getDay() !== 0 && deliveryStartDate.getDay() !== 6) {
                  deliveryDaysAdded++;
                }
              }
              let deliveryEndDate = new Date(deliveryStartDate);
              deliveryDaysAdded = 0;
              while (deliveryDaysAdded < 5) {
                deliveryEndDate.setDate(deliveryEndDate.getDate() + 1);
                if (deliveryEndDate.getDay() !== 0 && deliveryEndDate.getDay() !== 6) {
                  deliveryDaysAdded++;
                }
              }
              
              const deliveryStartFormatted = deliveryStartDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric'
              });
              const deliveryEndFormatted = deliveryEndDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric'
              });
              
              const finalDeliveryDate = deliveryEndDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              
              const countries = [
                { code: 'US', name: 'United States' },
                { code: 'CA', name: 'Canada' },
                { code: 'GB', name: 'United Kingdom' },
                { code: 'AU', name: 'Australia' },
                { code: 'DE', name: 'Germany' },
                { code: 'FR', name: 'France' },
                { code: 'IT', name: 'Italy' },
                { code: 'ES', name: 'Spain' },
                { code: 'JP', name: 'Japan' },
                { code: 'CN', name: 'China' },
              ];
              
              return (
                <>
                  <div className="get-it-by-header">
                    <div className="get-it-by-text">
                      <span className="get-it-by-label">Get it by</span>
                      <span 
                        className="get-it-by-date"
                        onMouseEnter={() => setShowDeliveryTimeline(true)}
                        onMouseLeave={() => setShowDeliveryTimeline(false)}
                      >
                        {finalDeliveryDate}
                      </span>
                    </div>
                    <div className="get-it-by-country">
                      <select 
                        value={selectedCountry} 
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="country-select"
                      >
                        {countries.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {showDeliveryTimeline && (
                    <div 
                      className="delivery-timeline-popup"
                      onMouseEnter={() => setShowDeliveryTimeline(true)}
                      onMouseLeave={() => setShowDeliveryTimeline(false)}
                    >
                      <div className="delivery-timeline">
                        <div className="timeline-item">
                          <div className="timeline-icon">
                            <span className="icon-hand">✋</span>
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-date">{orderPlacedFormatted}</div>
                            <div className="timeline-label">Order placed</div>
                          </div>
                        </div>
                        
                        <div className="timeline-item">
                          <div className="timeline-icon">
                            <span className="icon-truck">🚚</span>
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-date">{shipStartFormatted === shipEndFormatted ? shipStartFormatted : `${shipStartFormatted} - ${shipEndFormatted}`}</div>
                            <div className="timeline-label">Order ships</div>
                          </div>
                        </div>
                        
                        <div className="timeline-item">
                          <div className="timeline-icon">
                            <span className="icon-gift">🎁</span>
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-date">{deliveryStartFormatted === deliveryEndFormatted ? deliveryStartFormatted : `${deliveryStartFormatted} - ${deliveryEndFormatted}`}</div>
                            <div className="timeline-label">Delivered!</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="delivery-notes">
                        <div className="delivery-note">Orders can be cancelled or modified within 2 hours after being placed.</div>
                        <div className="delivery-note">Canvas/ Poster/ Metal Sign: These packages cannot be delivered to a PO box.</div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="product-cta-row">
            <div className="quantity-row">
              <div className="quantity-controls">
                <button type="button" onClick={decrementQuantity}>
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantityValue(e.target.value)}
                />
                <button type="button" onClick={incrementQuantity}>
                  +
                </button>
              </div>
            </div>
            <div className="product-cta">
                {activeVariant?.available ? (
                  <>
                    <button className="btn btn-primary product-add-to-cart-btn" onClick={handleAddToCart}>
                add to cart
              </button>
                    <button
                      className="btn btn-buy-now product-buy-now-btn"
                      onClick={handleBuyNow}
                      disabled={isBuyNowLoading}
                    >
                      {isBuyNowLoading ? (
                        <>Processing...</>
                      ) : (
                        <>buy now</>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-secondary product-notify-btn"
                    onClick={() => setShowNotifyModal(true)}
                  >
                    notify when available
                  </button>
                )}
            </div>
          </div>

            {/* Payment Options & Gift Wrap */}
            {activeVariant?.available && (
              <div className="product-payment-options">
                {isLoadingInstallment ? (
                  <div className="payment-installments">
                    <span className="installment-text">Loading payment options...</span>
                  </div>
                ) : installmentOption ? (
                  <div className="payment-installments">
                    <span className="installment-text">or {installmentOption.count} interest-free payments of </span>
                    <strong className="installment-price">
                      {installmentOption.formattedInstallment}
                    </strong>
                    <span className="installment-provider"> with </span>
                    <span className="payment-logo">💳 Shop Pay</span>
                  </div>
                ) : (
                  <div className="payment-installments">
                    <span className="installment-text">or 4 interest-free payments of </span>
                    <strong className="installment-price">
                      {formatPrice((Number(activeVariant?.price || product.priceRange?.min?.amount || 0) / 4), currency)}
                    </strong>
                    <span className="installment-provider"> with </span>
                    <span className="payment-logo">💳 Affirm</span>
                  </div>
                )}

                <label className="gift-option">
                  <input type="checkbox" />
                  <span className="gift-icon">🎁</span>
                  <span>Add gift wrap (+$5.00)</span>
                </label>
              </div>
            )}

            {/* Sticky CTA Bar - Fixed at bottom when scrolled past */}
            {showStickyCTA && (
              <div className="product-sticky-cta show">
                <div className="product-sticky-cta-content">
                  <div className="product-sticky-info">
                    <div className="product-sticky-price">{displayPrice}</div>
                    {activeVariant?.inventoryQuantity && activeVariant.inventoryQuantity <= 10 && (
                      <div className="sticky-stock-warning">Only {activeVariant.inventoryQuantity} left!</div>
                    )}
                  </div>
                  {activeVariant?.available ? (
                    <div className="sticky-cta-buttons">
                      <button className="btn btn-primary product-sticky-add-btn" onClick={handleAddToCart}>
                        add to cart
                      </button>
                      <button className="btn btn-buy-now product-sticky-buy-btn" onClick={handleBuyNow}>
                        buy now
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary product-sticky-notify-btn" onClick={() => setShowNotifyModal(true)}>
                      notify me
                    </button>
                  )}
                </div>
              </div>
            )}

        </div>
      </section>

      <section className="product-details container">
        <div className="product-details-grid">
          <div className="product-details-main">
            <h2>What Makes It Uncommon</h2>
            <p>
              {product.description || "Hand-selected by our curators, this product brings together workmanship, storytelling, and thoughtful design. Perfect for gifting or treating yourself."}
            </p>
            <ul className="product-features-list">
              <li>Made in small batches by an independent maker</li>
              <li>Materials sourced responsibly</li>
              <li>Ships worldwide from our Brooklyn warehouse</li>
              {product.vendor && <li>Created by {product.vendor}</li>}
            </ul>
            {product.productType && (
              <a 
                href="#" 
                className="product-size-guide-link"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Open size guide modal or navigate to size guide page
                  alert('Size guide will be displayed here');
                }}
              >
                {product.productType} size guide
              </a>
            )}
          </div>

          <div className="product-details-sidebar">
            <div className="product-spec-item">
              <strong>MADE FROM:</strong> {product.vendor || 'Premium materials'}
            </div>
            <div className="product-spec-item">
              <strong>MEASUREMENTS:</strong> {product.options?.find(opt => opt.name.toLowerCase() === 'size')?.values?.join(', ') || 'Various sizes'} 
              {product.productType && (
                <span> (<a 
                  href="#" 
                  className="product-size-guide-link-inline"
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Open size guide modal or navigate to size guide page
                    alert('Size guide will be displayed here');
                  }}
                >click here for size guide</a>)</span>
              )}
            </div>
            <div className="product-spec-item">
              <strong>CARE:</strong> Care instructions - Follow washing recommendations for best results
            </div>
            <div className="product-spec-item">
              <strong>ITEM ID:</strong> {product.id?.split('/').pop() || 'N/A'}
            </div>
            <a 
              href="#qa" 
              className="product-qa-link" 
              onClick={(e) => { 
                e.preventDefault(); 
                setActiveTab('qa');
                document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Product Q&A
            </a>
          </div>
        </div>

        <div className="product-collapsible-sections">
          <div className="product-collapsible-item">
            <button
              type="button"
              className="product-collapsible-header"
              onClick={() => setExpandedSections(prev => ({ ...prev, maker: !prev.maker }))}
            >
              <span>About the Maker</span>
              <span className="collapsible-icon">{expandedSections.maker ? '−' : '+'}</span>
            </button>
            {expandedSections.maker && (
              <div className="product-collapsible-content">
                <p>Learn more about the independent makers who create our unique products.</p>
              </div>
            )}
          </div>

          <div className="product-collapsible-item">
            <button
              type="button"
              className="product-collapsible-header"
              onClick={() => setExpandedSections(prev => ({ ...prev, shipping: !prev.shipping }))}
            >
              <span>Shipping & Returns</span>
              <span className="collapsible-icon">{expandedSections.shipping ? '−' : '+'}</span>
            </button>
            {expandedSections.shipping && (
              <div className="product-collapsible-content">
                <p><strong>Shipping:</strong> Ships in 3-5 business days. Free shipping for Perks members.</p>
                <p><strong>Returns:</strong> Free returns for 30 days. Items must be in original condition.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="product-reviews-section container" id="reviews">
        <div className="product-reviews-tabs">
          <button
            type="button"
            className={`product-reviews-tab ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews (3)
          </button>
          <button
            type="button"
            className={`product-reviews-tab ${activeTab === 'qa' ? 'active' : ''}`}
            onClick={() => setActiveTab('qa')}
            id="qa"
          >
            Product Q&A (1)
          </button>
        </div>

        {activeTab === 'reviews' && (
          <div className="product-reviews-content">
            <div className="product-reviews-summary">
              <div className="product-reviews-rating-overview">
                <div className="product-reviews-rating-number">5</div>
                <div className="product-reviews-rating-stars-large">★★★★★</div>
                <div className="product-reviews-rating-count">Based on 3 reviews</div>
                <div className="product-reviews-recommend">100% of respondents would recommend this to a friend</div>
              </div>
              <div className="product-reviews-chart">
                <div className="product-reviews-chart-bar">
                  <span>5 stars</span>
                  <div className="product-reviews-chart-bar-container">
                    <div className="product-reviews-chart-fill" style={{ width: '100%' }}></div>
                  </div>
                  <span>3</span>
                </div>
                <div className="product-reviews-chart-bar">
                  <span>4 stars</span>
                  <div className="product-reviews-chart-bar-container">
                    <div className="product-reviews-chart-fill" style={{ width: '0%' }}></div>
                  </div>
                  <span>0</span>
                </div>
                <div className="product-reviews-chart-bar">
                  <span>3 stars</span>
                  <div className="product-reviews-chart-bar-container">
                    <div className="product-reviews-chart-fill" style={{ width: '0%' }}></div>
                  </div>
                  <span>0</span>
                </div>
                <div className="product-reviews-chart-bar">
                  <span>2 stars</span>
                  <div className="product-reviews-chart-bar-container">
                    <div className="product-reviews-chart-fill" style={{ width: '0%' }}></div>
                  </div>
                  <span>0</span>
                </div>
                <div className="product-reviews-chart-bar">
                  <span>1 star</span>
                  <div className="product-reviews-chart-bar-container">
                    <div className="product-reviews-chart-fill" style={{ width: '0%' }}></div>
                  </div>
                  <span>0</span>
                </div>
              </div>
            </div>

            <button 
              type="button" 
              className="btn btn-secondary product-write-review-btn"
              onClick={() => {
                // TODO: Open write review modal or navigate to review page
                alert('Write review form will be displayed here');
              }}
            >
              Write a review
            </button>

            <div className="product-reviews-list">
              {[1, 2, 3].map((review) => (
                <div key={review} className="product-review-item">
                  <div className="product-review-header">
                    <div className="product-review-rating">★★★★★</div>
                    <div className="product-review-meta">
                      <strong>Customer {review}</strong>
                      <span className="product-review-location">from Location {review}</span>
                    </div>
                  </div>
                  <h3 className="product-review-title">Great product!</h3>
                  <p className="product-review-text">
                    This is an excellent product. I highly recommend it to anyone looking for quality items.
                  </p>
                  <div className="product-review-date">Reviewed {review} week{review > 1 ? 's' : ''} ago</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'qa' && (
          <div className="product-qa-content">
            <div className="product-qa-item">
              <div className="product-qa-question">
                <strong>Q:</strong> What is the return policy?
              </div>
              <div className="product-qa-answer">
                <strong>A:</strong> We offer free returns for 30 days. Items must be in original condition.
              </div>
            </div>
          </div>
        )}
      </section>

      {product.relatedProducts && product.relatedProducts.length > 0 && (
        <section className="product-related-section container slider-full">
          <h2 className="section-head">Customers also bought</h2>
          <div className="slider-shell">
            <button 
              className="slider-nav prev" 
              disabled={!hasMultipleSlides(product.relatedProducts, 5)} 
              onClick={() => slide("related", -1)}
            >
              ‹
            </button>
            <div className="slider-track" ref={registerTrack("related")}>
              {product.relatedProducts.map((related, idx) => (
                <ProductCard key={related.id || related.handle || idx} product={related} index={idx} variant="simple" />
              ))}
            </div>
            <button 
              className="slider-nav next" 
              disabled={!hasMultipleSlides(product.relatedProducts, 5)} 
              onClick={() => slide("related", 1)}
            >
              ›
            </button>
          </div>
        </section>
      )}

      {product.vendorProducts && product.vendorProducts.length > 0 && (
        <section className="product-related-section container slider-full">
          <h2 className="section-head">Also by {product.vendor || 'Uncommon Goods'}</h2>
          <div className="slider-shell">
            <button 
              className="slider-nav prev" 
              disabled={!hasMultipleSlides(product.vendorProducts, 5)} 
              onClick={() => slide("vendor", -1)}
            >
              ‹
            </button>
            <div className="slider-track" ref={registerTrack("vendor")}>
              {product.vendorProducts.map((related, idx) => (
                <ProductCard key={related.id || related.handle || idx} product={related} index={idx} variant="simple" />
              ))}
            </div>
            <button 
              className="slider-nav next" 
              disabled={!hasMultipleSlides(product.vendorProducts, 5)} 
              onClick={() => slide("vendor", 1)}
            >
              ›
            </button>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary product-see-collection-btn"
            onClick={() => {
              // Navigate to collection page if vendor exists
              if (product.vendor) {
                window.location.href = `/collections/${product.vendor.toLowerCase().replace(/\s+/g, '-')}`;
              } else {
                // Fallback to all products
                window.location.href = '/';
              }
            }}
          >
            see the full collection
          </button>
        </section>
      )}

      {product.tags && product.tags.length > 0 && (
        <section className="product-categories-section container">
          <div className="product-categories-tags">
            {product.tags.map((tag) => (
              <Link key={tag} href={`/collections/${tag.toLowerCase().replace(/\s+/g, '-')}`} className="product-category-tag">
                {tag}
              </Link>
            ))}
          </div>
        </section>
      )}

      {recentlyViewed && recentlyViewed.length > 0 && (
        <section className="product-recently-viewed container slider-full">
          <h2 className="section-head">Recently viewed</h2>
          <div className="slider-shell">
            <button 
              className="slider-nav prev" 
              disabled={!hasMultipleSlides(recentlyViewed, 5)} 
              onClick={() => slide("recent", -1)}
            >
              ‹
            </button>
            <div className="slider-track" ref={registerTrack("recent")}>
              {recentlyViewed.map((item, idx) => (
                <ProductCard key={item.id || item.handle || idx} product={item} index={idx} variant="simple" />
              ))}
            </div>
            <button 
              className="slider-nav next" 
              disabled={!hasMultipleSlides(recentlyViewed, 5)} 
              onClick={() => slide("recent", 1)}
            >
              ›
            </button>
          </div>
        </section>
      )}

      <div
        className={`cart-drawer ${showDrawer ? "open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDrawer(false);
          }
        }}
      >
          <div className="cart-drawer-body-wrapper">
            <div className="cart-drawer-header">
              <strong>Added to your cart</strong>
              <button type="button" onClick={() => setShowDrawer(false)}>
                ✕
              </button>
            </div>
            {isAddingToCart ? (
              <div className="cart-drawer-skeleton-wrapper">
                <div className="cart-drawer-body">
                  <div className="cart-drawer-skeleton">
                    <div className="cart-item">
                      <span className="skeleton-block" style={{ width: 80, height: 80, borderRadius: "var(--card-radius)" }} aria-hidden="true" />
                      <div style={{ flex: 1 }}>
                        <span className="skeleton-block" style={{ width: "80%", height: 18, marginBottom: 8 }} aria-hidden="true" />
                        <span className="skeleton-block" style={{ width: "60%", height: 16, marginBottom: 4 }} aria-hidden="true" />
                        <span className="skeleton-block" style={{ width: "40%", height: 14 }} aria-hidden="true" />
                      </div>
                    </div>
                    <div className="cart-drawer-actions">
                      <span className="skeleton-block btn" style={{ width: "100%", height: 44 }} aria-hidden="true" />
                      <span className="skeleton-block btn" style={{ width: "100%", height: 44 }} aria-hidden="true" />
                    </div>
                  </div>
                </div>
                {product.relatedProducts && product.relatedProducts.length > 0 && (
                  <div className="cart-drawer-related">
                    <span className="skeleton-block" style={{ width: "60%", height: 24, marginBottom: 16, margin: "0 auto 16px" }} aria-hidden="true" />
                    <div className="cart-drawer-related-products">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <div key={`skeleton-related-${idx}`} className="cart-drawer-related-item">
                          <span className="skeleton-block" style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "var(--radius-md)" }} aria-hidden="true" />
                          <div className="cart-drawer-related-info">
                            <span className="skeleton-block" style={{ width: "90%", height: 14, marginBottom: 6 }} aria-hidden="true" />
                            <span className="skeleton-block" style={{ width: "70%", height: 14 }} aria-hidden="true" />
                          </div>
                        </div>
                      ))}
                    </div>
                    {product.relatedProducts.length > 6 && (
                      <span className="skeleton-block btn" style={{ width: "100%", height: 44, marginTop: 20 }} aria-hidden="true" />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="cart-drawer-body">
                  {lastCartItem ? (
                    <>
                      <div className="cart-item">
                        <img src={lastCartItem.image} alt={lastCartItem.title} />
                        <div>
                          <div className="cart-item-title">{lastCartItem.title}</div>
                          <div className="cart-item-price">
                            {formatPrice(lastCartItem.unitPrice)} · Qty {lastCartItem.quantity}
                          </div>
                          {lastCartItem.variantTitle && <div className="cart-item-variant">{lastCartItem.variantTitle}</div>}
                        </div>
                      </div>
                      <div className="cart-drawer-actions">
                        <button
                          type="button"
                          className="btn btn-outline drawer-keep-shopping"
                          onClick={() => setShowDrawer(false)}
                        >
                          keep shopping
                        </button>
                        <Link href="/cart" className="btn btn-primary drawer-go-to-cart">
                          go to cart
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p>Your cart is empty.</p>
                  )}
                </div>
                {product.relatedProducts && product.relatedProducts.length > 0 && (
                  <div className="cart-drawer-related">
                    <h3 className="cart-drawer-related-title">You may also like</h3>
                    <div className="cart-drawer-related-products">
                      {product.relatedProducts.slice(0, 6).map((related, idx) => (
                        <Link
                          key={related.id || related.handle || idx}
                          href={`/products/${related.handle}`}
                          className="cart-drawer-related-item"
                          onClick={() => setShowDrawer(false)}
                        >
                          <img src={related.image?.src || related.featuredImage?.src || "/placeholder.jpg"} alt={related.title} />
                          <div className="cart-drawer-related-info">
                            <div className="cart-drawer-related-name">{related.title}</div>
                            <div className="cart-drawer-related-price">
                              {formatPriceRange(related)}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {product.relatedProducts.length > 6 && (
                      <Link
                        href={`/products/${product.handle}`}
                        className="btn cart-drawer-view-more"
                        onClick={() => setShowDrawer(false)}
                      >
                        see the full collection
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
      </div>
      </Layout>

      {/* Back in Stock Notification Modal */}
      {showNotifyModal && (
        <div className="notify-modal-overlay" onClick={() => setShowNotifyModal(false)}>
          <div className="notify-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="notify-modal-close"
              onClick={() => setShowNotifyModal(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="notify-modal-header">
              <span className="notify-icon">🔔</span>
              <h3>Notify Me When Available</h3>
            </div>
            <p className="notify-modal-text">
              Enter your email and we'll send you a notification when this product is back in stock.
            </p>
            <div className="notify-modal-product">
              <img src={activeImage} alt={product.title} />
              <div className="notify-product-info">
                <div className="notify-product-title">{product.title}</div>
                {activeVariant?.title && (
                  <div className="notify-variant-title">{activeVariant.title}</div>
                )}
              </div>
            </div>
            <input
              type="email"
              placeholder="Enter your email address"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              className="notify-email-input"
            />
            <button
              className="btn btn-primary notify-submit-btn"
              onClick={handleNotifyMe}
            >
              Notify Me
            </button>
          </div>
        </div>
      )}

      {/* Zoom Popup */}
      {showZoomPopup && images.length > 0 && activeImage && (
        <div className="product-zoom-popup" onClick={closeZoomPopup}>
          <button
            className="product-zoom-popup-close"
            onClick={(e) => {
              e.stopPropagation();
              closeZoomPopup();
            }}
            aria-label="Close zoom"
          >
            <span className="material-icons">close</span>
          </button>
          {images.length > 1 && (
            <>
              <button
                className="product-zoom-popup-nav product-zoom-popup-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeImageIndex > 0) {
                    const prevIndex = activeImageIndex - 1;
                    setActiveImageIndex(prevIndex);
                    setActiveImage(images[prevIndex]);
                    setManualImageSelection(true);
                  }
                }}
                aria-label="Previous image"
                disabled={activeImageIndex === 0}
              >
                <span className="material-icons">chevron_left</span>
              </button>
              <button
                className="product-zoom-popup-nav product-zoom-popup-next"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeImageIndex < images.length - 1) {
                    const nextIndex = activeImageIndex + 1;
                    setActiveImageIndex(nextIndex);
                    setActiveImage(images[nextIndex]);
                    setManualImageSelection(true);
                  }
                }}
                aria-label="Next image"
                disabled={activeImageIndex === images.length - 1}
              >
                <span className="material-icons">chevron_right</span>
              </button>
            </>
          )}
          <div
            className="product-zoom-popup-content"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onPopupTouchStart}
            onTouchMove={onPopupTouchMove}
            onTouchEnd={onPopupTouchEnd}
          >
            <div className="product-zoom-popup-slider-wrapper">
              <div
                className="product-zoom-popup-slider"
                style={{
                  transform: `translateX(-${activeImageIndex * 100}%)`,
                  transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {images.map((src, index) => (
                  <div key={src} className="product-zoom-popup-slide">
                    <img
                      src={src}
                      alt={`${product.title} - Image ${index + 1}`}
                      className="product-zoom-popup-image"
                    />
                  </div>
                ))}
              </div>
            </div>
            {images.length > 1 && (
              <div className="product-zoom-popup-pagination">
                {images.map((_, index) => (
                  <button
                    key={index}
                    className={`product-zoom-popup-dot ${index === activeImageIndex ? 'active' : ''}`}
                    onClick={() => {
                      setActiveImageIndex(index);
                      setActiveImage(images[index]);
                      setManualImageSelection(true);
                    }}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export async function getServerSideProps({ params }) {
  const handle = params?.handle;
  if (!handle) {
    return { notFound: true };
  }

  try {
    const [product, navCollections, menuItems] = await Promise.all([
      fetchProductByHandle(handle),
      fetchShopifyCollections(20),
      fetchShopifyMenuAsNavItems("main-menu").catch((err) => {
        console.error("Failed to fetch menu:", err);
        return [];
      }),
    ]);
    if (!product) {
      return { notFound: true };
    }
    const navItems = getNavItems(menuItems, navCollections, baseNavLinks);

    return {
      props: {
        product,
        navItems,
      },
    };
  } catch (error) {
    console.error("Failed to fetch product detail", error);
    return { notFound: true };
  }
}

