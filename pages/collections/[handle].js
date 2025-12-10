import Head from "next/head";
import Link from "next/link";
import { useState, useMemo, useRef, useEffect } from "react";
import Layout from "../../components/Layout";
import LazyCollectionProductCard from "../../components/LazyCollectionProductCard";
import FeaturedReviews from "../../components/FeaturedReviews";
import { fetchShopifyCollections, fetchShopifyMenuAsNavItems, fetchShopifyProducts } from "../../lib/shopify";
import { fetchCollectionByHandleLightweight } from "../../lib/shopifyLightweight";
import { normalizeProduct } from "../../lib/productFormatter";
import { navLinks as baseNavLinks } from "../../lib/siteContent";
import { getNavItems } from "../../lib/navUtils";
import { calculateTrendTabs, calculatePopularSearches } from "../../lib/trendingUtils";

const badgePresets = [
  {
    pill: "EXPERIENCE",
    top: "Customer favorite",
    rating: { stars: "★★★★★", count: "34" },
  },
  {
    pill: "EXPERIENCE",
    top: "Trending Now. Sold 86 times in the last 24 hours",
    rating: { stars: "★★★★★", count: "23" },
  },
  {
    pill: "EXPERIENCE",
    top: "Trending Now. Sold 40 times in the last 24 hours",
    rating: { stars: "★★★★★", count: "14" },
  },
  {
    pill: "EXPERIENCE",
    top: "Trending Now. Sold 34 times in the last 24 hours",
    rating: { stars: "★★★★★", count: "44" },
  },
];

const FIRST_ROW_PRODUCT_LIMIT = 4;

// Sort options
const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
  { value: "newest", label: "Newest First" },
];

export default function CollectionPage({ collection, navItems, trendTabs, popularSearches }) {
  const allProducts = (collection?.products || [])
    .map(normalizeProduct)
    .filter(Boolean);
  
  // Get related collections from navItems (exclude current collection)
  const relatedCollections = useMemo(() => {
    if (!navItems || !collection) return [];
    
    const collections = navItems
      .filter(item => item.href && item.href.startsWith('/collections/'))
      .filter(item => item.href !== `/collections/${collection.handle}`)
      .slice(0, 8) // Limit to 8 collections
      .map(item => ({
        title: item.title,
        href: item.href,
        image: item.image || null,
      }));
    
    return collections;
  }, [navItems, collection]);
  
  
  // State for sort/filter
  const [isSortFilterOpen, setIsSortFilterOpen] = useState(false);
  const [sortOption, setSortOption] = useState("default");
  const [selectedProductType, setSelectedProductType] = useState(null);
  const sortFilterRef = useRef(null);
  
  // Get unique product types for filter
  const productTypes = useMemo(() => {
    const types = new Set();
    allProducts.forEach((product) => {
      const productType = (product.productType || "").trim();
      if (productType) {
        types.add(productType);
      }
    });
    return Array.from(types).sort();
  }, [allProducts]);
  
  // Filter and sort products
  const processedProducts = useMemo(() => {
    let filtered = allProducts;
    
    // Filter by product type
    if (selectedProductType) {
      const selectedTypeNormalized = selectedProductType.trim().toLowerCase();
      
      filtered = filtered.filter((product) => {
        const productType = (product.productType || "").trim();
        if (!productType) {
          return false;
        }
        const productTypeNormalized = productType.toLowerCase();
        return productTypeNormalized === selectedTypeNormalized;
      });
    }
    
    // Sort products
    const sorted = [...filtered];
    switch (sortOption) {
      case "price-low":
        sorted.sort((a, b) => {
          // Extract numeric price from price string (e.g., "$10.00" -> 10.00)
          const extractPrice = (priceStr) => {
            if (!priceStr) return 0;
            // Handle price ranges like "$10.00 - $20.00" by taking the first price
            const firstPrice = priceStr.split("-")[0].trim();
            return parseFloat(firstPrice.replace(/[^0-9.]/g, "") || 0);
          };
          const priceA = extractPrice(a.price);
          const priceB = extractPrice(b.price);
          return priceA - priceB;
        });
        break;
      case "price-high":
        sorted.sort((a, b) => {
          const extractPrice = (priceStr) => {
            if (!priceStr) return 0;
            const firstPrice = priceStr.split("-")[0].trim();
            return parseFloat(firstPrice.replace(/[^0-9.]/g, "") || 0);
          };
          const priceA = extractPrice(a.price);
          const priceB = extractPrice(b.price);
          return priceB - priceA;
        });
        break;
      case "name-asc":
        sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "name-desc":
        sorted.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
        break;
      case "newest":
        // Keep original order (newest first from API)
        break;
      default:
        // Default order
        break;
    }
    
    return sorted;
  }, [allProducts, selectedProductType, sortOption]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on a filter/sort button
      if (event.target.closest('.sort-filter-option') || event.target.closest('.clear-filters-btn')) {
        return;
      }
      
      if (sortFilterRef.current && !sortFilterRef.current.contains(event.target)) {
        setIsSortFilterOpen(false);
      }
    };
    
    if (isSortFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSortFilterOpen]);
  
  // Row 1: First 4 products
  const firstRowProducts = processedProducts.slice(0, FIRST_ROW_PRODUCT_LIMIT);
  
  // Row 2: Reviews (taken from first 6 products - always from all products)
  const reviewProducts = allProducts.slice(0, 6);
  
  // Row 3 onwards: Remaining products (from 5th product onwards)
  const remainingProducts = processedProducts.slice(FIRST_ROW_PRODUCT_LIMIT);
  
  const handleSortChange = (value) => {
    setSortOption(value);
    setIsSortFilterOpen(false);
  };
  
  const handleFilterChange = (productType, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const trimmedType = (productType || "").trim();
    
    if (selectedProductType && selectedProductType.trim().toLowerCase() === trimmedType.toLowerCase()) {
      setSelectedProductType(null);
    } else {
      setSelectedProductType(trimmedType);
    }
    
    // Delay closing dropdown to ensure state update happens
    setTimeout(() => {
      setIsSortFilterOpen(false);
    }, 100);
  };
  
  const clearFilters = () => {
    setSortOption("default");
    setSelectedProductType(null);
    setIsSortFilterOpen(false);
  };

  return (
    <>
      <Head>
        <title>{String(collection?.title || 'Collection')} | Gikzo</title>
        <meta name="description" content={collection.description || `Browse ${collection.title} collection at Gikzo`} />
        <meta property="og:title" content={collection.title} />
        <meta property="og:description" content={collection.description || collection.title} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://gikzo.com/collections/${collection.handle}`} />
      </Head>
      <Layout navItems={navItems} trendTabs={trendTabs} popularSearches={popularSearches}>
        <header className="collection-page-header">
        <div className="container">
        
          <div className="collection-header-content">
            <div className="collection-header-text">
              {collection.handle && (
                <span className="collection-category-label">{collection.handle}</span>
              )}
              <h1>{collection.title}</h1>
              {collection.description && <p>{collection.description}</p>}
            </div>
            {relatedCollections.length > 0 && (
              <div className="collection-interest-categories">
                {relatedCollections.map((relatedCollection) => (
                  <Link
                    key={relatedCollection.href}
                    href={relatedCollection.href}
                    className="interest-category-card"
                  >
                    {relatedCollection.image ? (
                      <img 
                        src={typeof relatedCollection.image === 'string' 
                          ? relatedCollection.image 
                          : (relatedCollection.image.src || relatedCollection.image.url)} 
                        alt={relatedCollection.title} 
                        className="interest-category-thumb"
                        loading="lazy"
                        width="200"
                        height="200"
                        decoding="async"
                      />
                    ) : (
                      <div className="interest-category-thumb-placeholder" />
                    )}
                    <span className="interest-category-label">{relatedCollection.title}</span>
                  </Link>
                ))}
              </div>
            )}
            <div className="collection-header-actions">
              <div className="collection-sort-filter-wrapper" ref={sortFilterRef}>
                <button
                  type="button"
                  className={`collection-sort-filter-btn-header ${isSortFilterOpen ? "active" : ""}`}
                  onClick={() => setIsSortFilterOpen(!isSortFilterOpen)}
                >
                  sort/filter
                  {(selectedProductType || sortOption !== "default") && (
                    <span className="filter-badge">
                      {[selectedProductType, sortOption !== "default" ? 1 : 0].filter(Boolean).length}
                    </span>
                  )}
                </button>
                {isSortFilterOpen && (
                  <>
                    <div 
                      className="collection-sort-filter-backdrop"
                      onClick={() => setIsSortFilterOpen(false)}
                    />
                    <div className="collection-sort-filter-dropdown">
                    <div className="sort-filter-section">
                      <h3 className="sort-filter-title">Sort by</h3>
                      <div className="sort-filter-options">
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`sort-filter-option ${sortOption === option.value ? "active" : ""}`}
                            onClick={() => handleSortChange(option.value)}
                          >
                            {option.label}
                            {sortOption === option.value && <span className="check-icon">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                    {productTypes.length > 0 && (
                      <div className="sort-filter-section">
                        <h3 className="sort-filter-title">Filter by type</h3>
                        <div className="sort-filter-options">
                          {productTypes.map((type) => (
                            <button
                              key={type}
                              type="button"
                              className={`sort-filter-option ${selectedProductType && selectedProductType.trim().toLowerCase() === type.trim().toLowerCase() ? "active" : ""}`}
                              onClick={(e) => {
                                handleFilterChange(type, e);
                              }}
                            >
                              {type}
                              {selectedProductType && selectedProductType.trim().toLowerCase() === type.trim().toLowerCase() && (
                                <span className="check-icon">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {(sortOption !== "default" || selectedProductType) && (
                      <div className="sort-filter-actions">
                        <button type="button" className="clear-filters-btn" onClick={clearFilters}>
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="section-shell">
        {allProducts.length ? (
          <>
            {/* Row 1: First 4 products */}
            {firstRowProducts.length > 0 && (
              <div className="collection-products-section">
                <div className="collection-grid">
                  {firstRowProducts.map((product, index) => {
                  const defaults = badgePresets[index % badgePresets.length];
                  return (
                    <LazyCollectionProductCard
                      key={product.id || product.title}
                      product={product}
                      index={index}
                      badgeTop={defaults.top}
                      badgePill={defaults.pill}
                      rating={defaults.rating}
                    />
                  );
                })}
                </div>
              </div>
            )}

            {/* Row 2: Slide reviews */}
            <FeaturedReviews products={reviewProducts} />

            {/* Row 3 onwards: Remaining products */}
            {remainingProducts.length > 0 && (
              <div className="collection-products-section">
                <div className="collection-grid">
                  {remainingProducts.map((product, index) => {
                  const badgeIndex = (FIRST_ROW_PRODUCT_LIMIT + index) % badgePresets.length;
                  const defaults = badgePresets[badgeIndex];
                  return (
                    <LazyCollectionProductCard
                      key={product.id || product.title}
                      product={product}
                      index={FIRST_ROW_PRODUCT_LIMIT + index}
                      badgeTop={defaults.top}
                      badgePill={defaults.pill}
                      rating={defaults.rating}
                    />
                  );
                })}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="collection-empty">No products in this collection.</p>
        )}
      </section>
      </Layout>
    </>
  );
}

// Get all collection handles at build time for static generation
export async function getStaticPaths() {
  try {
    // Fetch all collections to get handles
    const collections = await fetchShopifyCollections(250); // Get up to 250 collections
    
    const paths = collections
      .filter((collection) => collection.handle)
      .map((collection) => ({
        params: { handle: collection.handle },
      }));

    return {
      paths,
      // Fallback: 'blocking' means new collections will be generated on-demand
      // and then cached for future requests
      fallback: 'blocking',
    };
  } catch (error) {
    console.error("Failed to fetch collections for static paths:", error);
    return {
      paths: [],
      fallback: 'blocking',
    };
  }
}

// Convert to ISR (Incremental Static Regeneration) for better performance
export async function getStaticProps({ params }) {
  const handle = params?.handle;
  if (!handle) {
    return { notFound: true };
  }

  try {
    const [collection, navCollections, menuItems] = await Promise.all([
      fetchCollectionByHandleLightweight(handle, 20), // Reduced from 24 to 20, using lightweight fields
      fetchShopifyCollections(15), // Reduced from 20 to 15
      fetchShopifyMenuAsNavItems("main-menu").catch((err) => {
        console.error("Failed to fetch menu:", err);
        return [];
      }),
    ]);
    if (!collection) {
      return { notFound: true };
    }
    const navItems = getNavItems(menuItems, navCollections, baseNavLinks);

    return {
      props: {
        collection,
        navItems,
      },
      // Revalidate every 60 seconds - pages will be regenerated in the background
      revalidate: 60,
    };
  } catch (error) {
    console.error("Failed to load collection from Shopify", error);
    return { notFound: true };
  }
}

