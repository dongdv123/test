import Head from "next/head";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import LazyProductCard from "../components/LazyProductCard";
import { fetchShopifyProducts, fetchShopifyCollections, fetchShopifyMenuAsNavItems } from "../lib/shopify";
import { normalizeProduct } from "../lib/productFormatter";
import { useCart } from "../context/CartContext";
import { useHeaderHeightState } from "../hooks/useHeaderHeightState";
import { getNavItems } from "../lib/navUtils";
import { navLinks as baseNavLinks } from "../lib/siteContent";

const MAX_BUNDLE_ITEMS = 3;
const MIN_BUNDLE_ITEMS = 2;

export default function BundleBuilderPage({ shopifyProducts = [], navItems = baseNavLinks }) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [bundleName, setBundleName] = useState("");
  const [isPanelFixed, setIsPanelFixed] = useState(false);
  const [panelLeft, setPanelLeft] = useState(0);
  const headerHeight = useHeaderHeightState();
  const { cartId, refreshCart } = useCart();
  const router = useRouter();
  const panelRef = useRef(null);

  // Create a map for quick lookup of full product data
  const productsMap = useMemo(() => {
    const map = new Map();
    (shopifyProducts || []).forEach((product) => {
      if (product && product.id) {
        // Use both string and original ID as keys
        const idStr = String(product.id);
        map.set(idStr, product);
        if (typeof product.id !== "string") {
          map.set(product.id, product);
        }
      }
    });
    return map;
  }, [shopifyProducts]);

  const normalizedProducts = useMemo(
    () => (shopifyProducts || []).map(normalizeProduct).filter(Boolean),
    [shopifyProducts]
  );

  const toggleProduct = (normalizedProduct) => {
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.id === normalizedProduct.id);
      if (exists) {
        // Remove product
        return prev.filter((p) => p.id !== normalizedProduct.id);
      } else {
        // Add product (max 3)
        if (prev.length >= MAX_BUNDLE_ITEMS) {
          return prev; // Don't add if already at max
        }
        // Find full product data to keep variants
        const fullProduct = productsMap.get(normalizedProduct.id) || productsMap.get(String(normalizedProduct.id));
        return [...prev, { ...normalizedProduct, variants: fullProduct?.variants || [] }];
      }
    });
  };

  const handleBuildBundle = async () => {
    if (selectedProducts.length < MIN_BUNDLE_ITEMS) {
      alert(`Please select at least ${MIN_BUNDLE_ITEMS} products`);
      return;
    }

    setIsBuilding(true);

    try {
      // Get variant IDs from selected products
      // Use the first variant of each product (or variantId if available)
      const variantIds = selectedProducts
        .map((product) => {
          // Try variantId first, then first variant ID
          if (product.variantId) return product.variantId;
          if (product.variants && product.variants.length > 0) {
            const firstVariant = product.variants[0];
            if (firstVariant?.id) return firstVariant.id;
          }
          return null; // Don't use product.id as fallback - it's not a variant ID
        })
        .filter(Boolean);

      if (variantIds.length < MIN_BUNDLE_ITEMS) {
        throw new Error("Could not get variant IDs for selected products. Please ensure all products have variants.");
      }

      const response = await fetch("/api/build-bundle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cartId,
          variantIds,
          bundleName: bundleName || `Bundle ${new Date().toLocaleDateString()}`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create bundle");
      }

      // Save cart ID if we got a new one
      if (data.cartId && typeof window !== "undefined") {
        window.localStorage.setItem("shopify-cart-id", data.cartId);
      }

      // Refresh cart context to show new items
      await refreshCart();

      // Success - redirect to cart
      router.push("/cart");
    } catch (error) {
      console.error("Bundle creation error:", error);
      alert(error.message || "Failed to create bundle. Please try again.");
    } finally {
      setIsBuilding(false);
    }
  };

  const canBuildBundle = selectedProducts.length >= MIN_BUNDLE_ITEMS && selectedProducts.length <= MAX_BUNDLE_ITEMS;

  // Handle sticky panel when scrolling past header
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      // Disable fixed panel on mobile (screens smaller than 1024px)
      if (window.innerWidth < 1024) {
        setIsPanelFixed(false);
        return;
      }

      const header = document.querySelector(".header");
      const panel = panelRef.current;
      
      if (!header || !panel) return;

      const headerRect = header.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      
      // When panel is sticky, check if header bottom has reached or passed panel top
      const headerBottom = headerRect.bottom;
      const panelTop = panelRect.top;
      
      // When header bottom reaches panel top, fix panel at top (below header)
      if (headerBottom >= panelTop) {
        setIsPanelFixed(true);
        setPanelLeft(panelRect.left);
      } else {
        setIsPanelFixed(false);
      }
    };

    const handleResize = () => {
      // Disable fixed panel on mobile when resizing
      if (window.innerWidth < 1024) {
        setIsPanelFixed(false);
        return;
      }

      const panel = panelRef.current;
      if (!panel) return;
      
      const panelRect = panel.getBoundingClientRect();
      if (isPanelFixed) {
        setPanelLeft(panelRect.left);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    
    // Initial check with small delay to ensure DOM is ready
    setTimeout(() => {
      handleScroll();
    }, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [isPanelFixed]);

  return (
    <>
      <Head>
        <title>Bundle Builder - Mix & Match | Gikzo</title>
        <meta name="description" content="Create your custom bundle by selecting 2-3 products" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Layout navItems={navItems}>
        <div className="bundle-builder-page">
          <div className="bundle-builder-header">
            <h1>Bundle Builder</h1>
            <p className="bundle-builder-subtitle">Select 2-3 products to create your custom bundle</p>
          </div>

          <div className="bundle-builder-content">
            <div 
              ref={panelRef}
              className={`bundle-selection-panel-wrapper ${isPanelFixed ? "panel-fixed" : ""}`}
            >
              <div 
                className={`bundle-selection-panel ${isPanelFixed ? "fixed-top" : ""}`}
                style={isPanelFixed ? { 
                  left: `${panelLeft}px`,
                  top: `${headerHeight}px`,
                  maxHeight: `calc(100vh - ${headerHeight}px)`
                } : {}}
              >
              <div className="bundle-selection-header">
                <h2>Selected Products ({selectedProducts.length}/{MAX_BUNDLE_ITEMS})</h2>
                {selectedProducts.length > 0 && (
                  <button
                    type="button"
                    className="bundle-clear-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedProducts([]);
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedProducts.length === 0 ? (
                <div className="bundle-empty-state">
                  <p>No products selected yet. Choose products from the list below.</p>
                </div>
              ) : (
                <div className="bundle-selected-products">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="bundle-selected-item">
                      <img 
                        src={product.img} 
                        alt={product.title} 
                        loading="lazy"
                        width="80"
                        height="80"
                        decoding="async"
                      />
                      <div className="bundle-selected-info">
                        <h4>{product.title}</h4>
                        <span className="bundle-selected-price">{product.price}</span>
                      </div>
                      <button
                        type="button"
                        className="bundle-remove-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleProduct(product);
                        }}
                        aria-label="Remove product"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedProducts.length > 0 && (
                <div className="bundle-actions">
                  <input
                    type="text"
                    placeholder="Bundle name (optional)"
                    value={bundleName}
                    onChange={(e) => setBundleName(e.target.value)}
                    className="bundle-name-input"
                  />
                  <button
                    type="button"
                    className="btn btn-primary bundle-build-btn"
                    onClick={handleBuildBundle}
                    disabled={!canBuildBundle || isBuilding}
                  >
                    {isBuilding ? "Adding to Cart..." : "Add Bundle to Cart"}
                  </button>
                </div>
              )}
              </div>
            </div>

            <div className="bundle-products-grid">
              <h2>Available Products</h2>
              <div className="collection-grid">
                {normalizedProducts.map((product, index) => {
                  const isSelected = selectedProducts.some((p) => p.id === product.id);
                  const canSelect = !isSelected && selectedProducts.length < MAX_BUNDLE_ITEMS;

                  return (
                    <div
                      key={product.id}
                      className={`bundle-product-card ${isSelected ? "selected" : ""} ${!canSelect && !isSelected ? "disabled" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (canSelect || isSelected) {
                          toggleProduct(product);
                        }
                      }}
                    >
                      <LazyProductCard product={product} index={index} variant="flat" />
                      {isSelected && (
                        <div className="bundle-product-selected-badge">
                          <span className="material-icons">check_circle</span>
                          Selected
                        </div>
                      )}
                      {!canSelect && !isSelected && (
                        <div className="bundle-product-disabled-overlay">
                          Maximum {MAX_BUNDLE_ITEMS} products
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

export async function getServerSideProps() {
  try {
    const [products, collections, menuItems] = await Promise.all([
      fetchShopifyProducts(50), // Fetch products for bundle builder
      fetchShopifyCollections(20),
      fetchShopifyMenuAsNavItems("main-menu").catch((err) => {
        console.error("Failed to fetch menu:", err);
        return [];
      }),
    ]);
    const navItems = getNavItems(menuItems, collections, baseNavLinks);
    return {
      props: {
        shopifyProducts: products || [],
        navItems,
      },
    };
  } catch (error) {
    console.error("Failed to fetch data for bundle builder", error);
    return {
      props: {
        shopifyProducts: [],
        navItems: baseNavLinks,
      },
    };
  }
}

