import Head from "next/head";
import Link from "next/link";
import { useState, useMemo, useRef, useEffect } from "react";
import Layout from "../../components/Layout";
import WishlistButton from "../../components/WishlistButton";
import FeaturedReviews from "../../components/FeaturedReviews";
import { fetchCollectionByHandle, fetchShopifyCollections, fetchShopifyMenuAsNavItems } from "../../lib/shopify";
import { normalizeProduct } from "../../lib/productFormatter";
import { navLinks as baseNavLinks } from "../../lib/siteContent";
import { getNavItems } from "../../lib/navUtils";

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

export default function CollectionPage({ collection, navItems }) {
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
  
  // Debug: Check if productType is available
  useEffect(() => {
    if (allProducts.length > 0) {
      console.log('[DEBUG] Sample products after normalization:', allProducts.slice(0, 5).map(p => ({
        title: p.title,
        productType: p.productType,
        productTypeType: typeof p.productType,
        hasProductType: !!p.productType,
        productTypeLength: (p.productType || "").length
      })));
      console.log('[DEBUG] All product types found:', [...new Set(allProducts.map(p => p.productType).filter(Boolean))]);
    }
  }, [allProducts]);
  
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
    const result = Array.from(types).sort();
    // Debug: Log product types
    console.log('Available product types:', result);
    console.log('Sample products with types:', allProducts.slice(0, 3).map(p => ({
      title: p.title,
      productType: p.productType
    })));
    return result;
  }, [allProducts]);
  
  // Filter and sort products
  const processedProducts = useMemo(() => {
    let filtered = allProducts;
    
    // Filter by product type
    if (selectedProductType) {
      const selectedTypeNormalized = selectedProductType.trim().toLowerCase();
      console.log('[FILTER] Filtering by product type:', selectedTypeNormalized);
      console.log('[FILTER] Products before filter:', filtered.length);
      console.log('[FILTER] All product types in collection:', productTypes);
      
      filtered = filtered.filter((product) => {
        const productType = (product.productType || "").trim();
        if (!productType) {
          return false;
        }
        const productTypeNormalized = productType.toLowerCase();
        const matches = productTypeNormalized === selectedTypeNormalized;
        
        console.log('[FILTER] Checking:', {
          productTitle: product.title,
          productType: productType,
          productTypeNormalized: productTypeNormalized,
          selectedTypeNormalized: selectedTypeNormalized,
          matches: matches
        });
        
        return matches;
      });
      
      console.log('[FILTER] Products after filter:', filtered.length);
      console.log('[FILTER] Filtered products:', filtered.map(p => p.title));
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
  
  // Dòng 1: 4 sản phẩm đầu tiên
  const firstRowProducts = processedProducts.slice(0, FIRST_ROW_PRODUCT_LIMIT);
  
  // Dòng 2: Reviews (lấy từ 6 sản phẩm đầu tiên - always from all products)
  const reviewProducts = allProducts.slice(0, 6);
  
  // Dòng 3 trở đi: Các sản phẩm còn lại (từ sản phẩm thứ 5 trở đi)
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
    console.log('[FILTER] handleFilterChange called:', { 
      productType, 
      trimmedType, 
      currentSelected: selectedProductType,
      productTypes: productTypes
    });
    
    if (selectedProductType && selectedProductType.trim().toLowerCase() === trimmedType.toLowerCase()) {
      console.log('[FILTER] Deselecting filter');
      setSelectedProductType(null);
    } else {
      console.log('[FILTER] Setting filter to:', trimmedType);
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
        <title>{collection.title} | Gikzo</title>
        <meta name="description" content={collection.description || `Browse ${collection.title} collection at Gikzo`} />
        <meta property="og:title" content={collection.title} />
        <meta property="og:description" content={collection.description || collection.title} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://gikzo.com/collections/${collection.handle}`} />
      </Head>
      <Layout navItems={navItems}>
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
                                console.log('[FILTER] Button clicked:', type);
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
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="section-shell">
        {allProducts.length ? (
          <>
            {/* Dòng 1: 4 sản phẩm đầu tiên */}
            {firstRowProducts.length > 0 && (
              <div className="collection-products-section">
                <div className="collection-grid">
                  {firstRowProducts.map((product, index) => {
                  const defaults = badgePresets[index % badgePresets.length];
                  return (
                    <article className="collection-product-card collection-card-flat" key={product.id || product.title}>
                      <div className="collection-card-media">
                        <span className="collection-badge-top">{defaults.top}</span>
                        <WishlistButton product={product} />
                        <img src={product.img} alt={product.title} loading="lazy" />
                      </div>
                      <div className="collection-card-body">
                        <span className="collection-card-pill">{defaults.pill}</span>
                        <h4>{product.title}</h4>
                        <div className="collection-price-row">
                          {product.price && <span className="price">{product.price}</span>}
                        </div>
                        <div className="collection-rating-row">
                          <span className="star-icons">{defaults.rating.stars}</span>
                          <span className="rating-count">{defaults.rating.count}</span>
                        </div>
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
                })}
                </div>
              </div>
            )}

            {/* Dòng 2: Slide reviews */}
            <FeaturedReviews products={reviewProducts} />

            {/* Dòng 3 trở đi: Các sản phẩm còn lại */}
            {remainingProducts.length > 0 && (
              <div className="collection-products-section">
                <div className="collection-grid">
                  {remainingProducts.map((product, index) => {
                  const badgeIndex = (FIRST_ROW_PRODUCT_LIMIT + index) % badgePresets.length;
                  const defaults = badgePresets[badgeIndex];
                  return (
                    <article className="collection-product-card collection-card-flat" key={product.id || product.title}>
                      <div className="collection-card-media">
                        <span className="collection-badge-top">{defaults.top}</span>
                        <WishlistButton product={product} />
                        <img src={product.img} alt={product.title} loading="lazy" />
                      </div>
                      <div className="collection-card-body">
                        <span className="collection-card-pill">{defaults.pill}</span>
                        <h4>{product.title}</h4>
                        <div className="collection-price-row">
                          {product.price && <span className="price">{product.price}</span>}
                        </div>
                        <div className="collection-rating-row">
                          <span className="star-icons">{defaults.rating.stars}</span>
                          <span className="rating-count">{defaults.rating.count}</span>
                        </div>
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
                })}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="collection-empty">Chưa có sản phẩm trong danh mục này.</p>
        )}
      </section>
      </Layout>
    </>
  );
}

export async function getServerSideProps({ params }) {
  const handle = params?.handle;
  if (!handle) {
    return { notFound: true };
  }

  try {
    const [collection, navCollections, menuItems] = await Promise.all([
      fetchCollectionByHandle(handle, 48),
      fetchShopifyCollections(20),
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
    };
  } catch (error) {
    console.error("Failed to load collection from Shopify", error);
    return { notFound: true };
  }
}

