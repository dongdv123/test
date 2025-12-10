import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo } from "react";
import Layout from "../components/Layout";
import WishlistButton from "../components/WishlistButton";
import { fetchShopifyProducts, fetchShopifyMenuAsNavItems, fetchShopifyCollections } from "../lib/shopify";
import { normalizeProduct } from "../lib/productFormatter";
import { navLinks as baseNavLinks } from "../lib/siteContent";
import { getNavItems } from "../lib/navUtils";
import { calculateTrendTabs, calculatePopularSearches } from "../lib/trendingUtils";

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

export default function SearchPage({ searchResults = [], searchQuery = "", navItems, allProducts = [], searchType = "title", trendTabs, popularSearches }) {
  const router = useRouter();
  const query = router.query.q || searchQuery;
  const type = router.query.type || searchType; // "title" for search bar, "tags" for gift-finder

  // Filter products client-side based on search query
  const filteredProducts = useMemo(() => {
    if (!query || !query.trim() || !allProducts || allProducts.length === 0) {
      return [];
    }

    try {
      const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
      if (searchTerms.length === 0) return [];

      return allProducts.filter((product) => {
        try {
          const normalizedProduct = normalizeProduct(product);
          if (!normalizedProduct) return false;
          
          if (type === "tags") {
            // Gift finder: search by tags
            const productTags = (normalizedProduct.tags || []).map(tag => tag.toLowerCase());
            const productType = (normalizedProduct.productType || "").toLowerCase();
            
            // Check if any search term matches tags or product type
            return searchTerms.some(term => 
              productTags.some(tag => tag.includes(term) || term.includes(tag)) ||
              productType.includes(term)
            );
          } else {
            // Search bar: search by title, tags, and productType
            const productTitle = (normalizedProduct.title || "").toLowerCase();
            const productTags = (normalizedProduct.tags || []).map(tag => tag.toLowerCase()).join(" ");
            const productType = (normalizedProduct.productType || "").toLowerCase();
            
            // Get additional fields from original product if available (with safe access)
            const productDescription = ((product?.description || product?.descriptionHtml || "") + "").toLowerCase().replace(/<[^>]*>/g, ""); // Remove HTML tags
            const productVendor = ((product?.vendor || "") + "").toLowerCase();
            
            // Combine all searchable fields
            const searchableText = `${productTitle} ${productTags} ${productType} ${productDescription} ${productVendor}`.toLowerCase();
            
            // Check if all search terms match in any of the searchable fields
            // This allows partial matches and is more flexible than exact title match
            return searchTerms.every(term => searchableText.includes(term));
          }
        } catch (error) {
          console.warn("Error filtering product:", error);
          return false;
        }
      });
    } catch (error) {
      console.error("Error in search filter:", error);
      return [];
    }
  }, [query, type, allProducts]);

  const displayResults = useMemo(() => {
    return searchResults.length > 0 ? searchResults : filteredProducts;
  }, [searchResults, filteredProducts]);

  return (
    <>
      <Head>
        <title>{query ? `Search: ${query} - Gikzo` : "Search - Gikzo"}</title>
        <meta name="description" content={query ? `Search results for ${query}` : "Search for products"} />
        <link rel="canonical" href={`https://gikzo.com/search${query ? `?q=${encodeURIComponent(query)}` : ""}`} />
      </Head>
      <Layout navItems={navItems} trendTabs={trendTabs} popularSearches={popularSearches}>
        <section className="search-results-section">
          <div className="container">
            <header className="search-results-header">
              <h1>
                {query ? (
                  <>
                    Search results for <span className="search-query">"{query}"</span>
                  </>
                ) : (
                  "Search"
                )}
              </h1>
              {query && displayResults.length === 0 && (
                <p className="search-no-results">No products found. Try a different search term.</p>
              )}
              {query && displayResults.length > 0 && (
                <p className="search-results-count">{displayResults.length} product{displayResults.length !== 1 ? "s" : ""} found</p>
              )}
            </header>

            {!query ? (
              <div className="search-empty-state">
                <p>Enter a search term to find products.</p>
              </div>
            ) : displayResults.length === 0 ? (
              <div className="search-empty-state">
                <p>No products found matching "{query}".</p>
                <p>Try searching for something else or browse our collections.</p>
              </div>
            ) : (
              <div className="collection-grid">
                {displayResults.map((product, index) => {
                  const normalizedProduct = normalizeProduct(product);
                  if (!normalizedProduct) return null;

                  const defaults = badgePresets[index % badgePresets.length];

                  return (
                    <article className="collection-product-card collection-card-flat" key={normalizedProduct.id || index}>
                      <div className="collection-card-media">
                        <span className="collection-badge-top">{defaults.top}</span>
                        <WishlistButton product={normalizedProduct} />
                        <div className="product-card-image-wrapper">
                          <img src={normalizedProduct.img} alt={normalizedProduct.title} loading="lazy" />
                        </div>
                      </div>
                      <div className="collection-card-body">
                        <span className="collection-card-pill">{defaults.pill}</span>
                        <h4>{normalizedProduct.title}</h4>
                        <div className="collection-price-row">
                          {normalizedProduct.price && <span className="price">{normalizedProduct.price}</span>}
                        </div>
                        <div className="collection-rating-row">
                          <span className="star-icons">{defaults.rating.stars}</span>
                          <span className="rating-count">{defaults.rating.count}</span>
                        </div>
                      </div>
                      {normalizedProduct.handle && (
                        <Link
                          href={`/products/${normalizedProduct.handle}`}
                          className="card-overlay"
                          aria-label={`View ${normalizedProduct.title}`}
                        />
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </Layout>
    </>
  );
}

export async function getServerSideProps({ query }) {
  const searchQuery = query.q || "";
  const searchType = query.type || "title"; // Default to "title" for search bar
  
  // Fetch all products for client-side filtering
  let allProducts = [];
  try {
    allProducts = await fetchShopifyProducts(250);
  } catch (error) {
    console.error("Failed to fetch products:", error);
  }

  // Fetch menu items
  let menuItems = [];
  try {
    menuItems = await fetchShopifyMenuAsNavItems("main-menu").catch((err) => {
      console.error("Failed to fetch menu:", err);
      return [];
    });
  } catch (error) {
    console.error("Failed to fetch menu:", error);
  }

  // Fetch collections for trending data
  let collections = [];
  try {
    collections = await fetchShopifyCollections(20).catch(() => []);
  } catch (error) {
    console.error("Failed to fetch collections:", error);
  }
  
  const navItems = getNavItems(menuItems, collections, baseNavLinks);
  
  // Calculate trending data for header
  const trendTabs = calculateTrendTabs(allProducts, collections);
  const popularSearches = calculatePopularSearches(collections);

  return {
    props: {
      searchResults: [], // Will be filtered client-side
      searchQuery: searchQuery.trim(),
      searchType, // Pass search type to component
      navItems,
      allProducts, // Pass all products for client-side filtering
      trendTabs,
      popularSearches,
    },
  };
}

