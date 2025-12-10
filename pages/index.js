import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSlider } from "../hooks/useSlider";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { fetchShopifyCollections, fetchShopifyMenuAsNavItems } from "../lib/shopify";
import { fetchShopifyProductsLightweight, fetchNewProductsLightweight } from "../lib/shopifyLightweight";
import { normalizeProduct } from "../lib/productFormatter";
import { navLinks as baseNavLinks, fallbackTrendTabs } from "../lib/siteContent";
import { getNavItems } from "../lib/navUtils";

// Fallback quick links if menu is not available
const fallbackQuickLinks = [
  {
    label: "Christmas gifts",
    img: "https://images.uncommongoods.com/images/hp/B/A1_TL_20251128_640px.jpg",
  },
  {
    label: "for him",
    img: "https://images.uncommongoods.com/images/hp/B/F1_BS_20250818_640px.gif",
  },
  {
    label: "for her",
    img: "https://images.uncommongoods.com/images/items/56700/56797_5_360px.webp",
  },
  {
    label: "stocking stuffers",
    img: "https://images.uncommongoods.com/images/items/58200/58212_5_360px.webp",
  },
  {
    label: "best-selling gifts",
    img: "https://images.uncommongoods.com/images/items/60900/60901_4_360px.webp",
  },
  {
    label: "new",
    img: "https://images.uncommongoods.com/images/hp/B/A1_TL_20251128_640px.gif",
  },
];

const chips = [
  "Ornaments & decor",
  "Stocking stuffers",
  "Christmas gifts for her",
  "Christmas gifts for him",
  "Christmas gifts for kids",
  "Advent calendars",
  "Christmas best-sellers",
  "Personalized Christmas gifts",
];

const fallbackNewItems = [
  
];

const fallbackBestItems = [
  
];

const fallbackTrendingItems = [
 
];

const fallbackRecentItems = [
  
];

const shopColumns = [
  {
    title: "shop by recipient",
    items: ["Women", "Men", "Kids", "Teens", "Dad", "Mom", "Any gender", "Friends"],
  },
  {
    title: "shop by category",
    items: [
      "Personalized",
      "Jewelry",
      "Kitchen",
      "Home decor",
      "Apparel",
      "Food & drink",
      "Gift sets",
      "uncommon green®",
    ],
  },
  {
    title: "shop by occasion",
    items: ["Wedding", "Anniversary", "Housewarming", "Birthday", "Baby shower", "Sympathy", "Get well", "Thank you"],
  },
  {
    title: "shop by interest",
    items: ["Reading", "Geek", "Travel", "Wellness", "Gardening", "Food & drink", "Music", "Baseball"],
  },
];

// Fallback trend catalog
const fallbackTrendCatalog = fallbackTrendTabs.reduce((acc, tab) => {
  acc[tab] = fallbackTrendingItems;
  return acc;
}, {});

const MIN_SECTION_ITEMS = 10;
const TREND_ITEMS_PER_TAB = 10;

const normalizeCollection = (collection) => {
  if (!collection) return null;

  return {
    id: collection.id ? String(collection.id) : collection.handle || collection.title,
    title: collection.title || "Shopify collection",
    handle: collection.handle || "",
    href: collection.handle ? `/collections/${collection.handle}` : null,
  };
};

export default function Home({ shopifyProducts = [], newProducts = [], shopifyCollections = [], shopifyMenuItems = [], quickTrackMenuItems = [] }) {
  const router = useRouter();
  const { registerTrack, slide, hasMultipleSlides, positions, trackRefs } = useSlider();
  const [recentlyViewedFromStorage, setRecentlyViewedFromStorage] = useState([]);
  const searchQuery = router.query.query || "";
  
  // Load recently viewed products from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      const viewed = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
      setRecentlyViewedFromStorage(viewed);
    } catch (error) {
      console.error("Failed to load recently viewed:", error);
      setRecentlyViewedFromStorage([]);
    }
  }, []);
  
  const normalizedProducts = useMemo(
    () => (shopifyProducts || []).map(normalizeProduct).filter(Boolean),
    [shopifyProducts],
  );
  
  // Get trend tabs from product tags (most popular) or collections or use fallback
  const trendTabs = useMemo(() => {
    // Option 1: Use most popular tags from products (best for "trending searches")
    if (normalizedProducts && normalizedProducts.length > 0) {
      const tagCounts = {};
      normalizedProducts.forEach((product) => {
        if (product.tags && Array.isArray(product.tags)) {
          product.tags.forEach((tag) => {
            const normalizedTag = tag.toLowerCase().replace(/-/g, " ");
            tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
          });
        }
      });
      
      // Get top 5 most popular tags
      const popularTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag);
      
      if (popularTags.length >= 3) {
        return popularTags;
      }
    }
    
    // Option 2: Fallback to collections if not enough tags
    if (shopifyCollections && shopifyCollections.length > 0) {
      const tabs = shopifyCollections
        .slice(0, 5)
        .map((collection) => collection.title?.toLowerCase() || "")
        .filter(Boolean);
      if (tabs.length > 0) return tabs;
    }
    
    // Option 3: Use hardcoded fallback
    return fallbackTrendTabs;
  }, [normalizedProducts, shopifyCollections]);
  
  const [activeTrend, setActiveTrend] = useState(fallbackTrendTabs[0]);
  
  // Update activeTrend when trendTabs changes
  useEffect(() => {
    if (trendTabs.length > 0 && (!activeTrend || !trendTabs.includes(activeTrend))) {
      setActiveTrend(trendTabs[0]);
    }
  }, [trendTabs, activeTrend]);
  
  // Load recently viewed products from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      const viewed = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
      setRecentlyViewedFromStorage(viewed);
    } catch (error) {
      console.error("Failed to load recently viewed:", error);
      setRecentlyViewedFromStorage([]);
    }
  }, []);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return normalizedProducts;
    
    const query = searchQuery.toLowerCase().trim();
    const searchTerms = query.split(/\s+/);
    
    return normalizedProducts.filter((product) => {
      const titleMatch = product.title?.toLowerCase().includes(query);
      const tagsMatch = product.tags?.some((tag) => {
        const normalizedTag = tag.toLowerCase().replace(/-/g, " ");
        return searchTerms.some((term) => normalizedTag.includes(term) || term.includes(normalizedTag));
      });
      const productTypeMatch = product.productType?.toLowerCase().includes(query);
      
      return titleMatch || tagsMatch || productTypeMatch;
    });
  }, [normalizedProducts, searchQuery]);

  // Extract unique tags from filtered products for tabs
  const availableTags = useMemo(() => {
    const tagSet = new Set();
    filteredProducts.forEach((product) => {
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach((tag) => {
          if (tag) tagSet.add(tag.toLowerCase().replace(/-/g, " "));
        });
      }
    });
    return Array.from(tagSet).sort().slice(0, 10); // Limit to 10 most common tags
  }, [filteredProducts]);

  const [activeFilterTab, setActiveFilterTab] = useState("all");
  const normalizedCollections = useMemo(
    () => (shopifyCollections || []).map(normalizeCollection).filter(Boolean),
    [shopifyCollections],
  );
  const navItems = useMemo(() => {
    return getNavItems(shopifyMenuItems, shopifyCollections, baseNavLinks);
  }, [shopifyCollections, shopifyMenuItems]);
  
  // Get popular searches from top collections (first 4)
  const popularSearches = useMemo(() => {
    if (normalizedCollections && normalizedCollections.length > 0) {
      return normalizedCollections
        .slice(0, 4)
        .map((collection) => collection.title?.toLowerCase() || "")
        .filter(Boolean);
    }
    return ["advent calendar", "golf", "puzzle", "cat"]; // fallback
  }, [normalizedCollections]);

  // Map quick-track menu items to quickLinks format
  const quickLinks = useMemo(() => {
    if (!quickTrackMenuItems || quickTrackMenuItems.length === 0) {
      return fallbackQuickLinks;
    }

    // Create a map of collection handle to collection image for quick lookup
    const collectionMap = new Map();
    (shopifyCollections || []).forEach((collection) => {
      if (collection.handle) {
        // Try different image paths
        const imgUrl = 
          collection.image?.url || 
          collection.image?.src ||
          (collection.featuredImage?.url);
        if (imgUrl) {
          collectionMap.set(collection.handle, imgUrl);
        }
      }
    });

    // Create a map of product handle to product image for quick lookup
    const productMap = new Map();
    [...(shopifyProducts || []), ...(newProducts || [])].forEach((product) => {
      if (product.handle) {
        // Try to get image from various possible locations
        const imgUrl = 
          product.featuredImage?.url || 
          product.image?.url || 
          product.image?.src || 
          (product.images && product.images[0]?.url) ||
          (product.images && product.images[0]?.src);
        if (imgUrl) {
          productMap.set(product.handle, imgUrl);
        }
      }
    });

    const mappedLinks = quickTrackMenuItems
      .map((item) => {
        if (!item || !item.title) return null;

        let img = null;
        let href = item.href || item.url || null;

        // If URL is a collection, try to get image from collections
        if (href && href.startsWith("/collections/")) {
          const handle = href.split("/collections/")[1]?.split("/")[0]?.split("?")[0];
          if (handle && collectionMap.has(handle)) {
            img = collectionMap.get(handle);
          }
        }
        // If URL is a product, try to get image from products
        else if (href && href.startsWith("/products/")) {
          const handle = href.split("/products/")[1]?.split("/")[0]?.split("?")[0];
          if (handle && productMap.has(handle)) {
            img = productMap.get(handle);
          }
        }

        // Fallback: use placeholder image if no image found
        if (!img) {
          img = "/images/product-placeholder.svg";
        }

        return {
          label: item.title,
          img: img,
          href: href,
        };
      })
      .filter(Boolean);

    return mappedLinks.length > 0 ? mappedLinks : fallbackQuickLinks;
  }, [quickTrackMenuItems, shopifyCollections, shopifyProducts, newProducts]);

  const ensureItems = (items, fallback, limit) => {
    if (items.length) return items;
    if (fallback && fallback.length) {
      return typeof limit === "number" ? fallback.slice(0, limit) : fallback;
    }
    return [];
  };

  // Use new products from API (sorted by CREATED_AT) or fallback to first products
  const normalizedNewProducts = useMemo(
    () => (newProducts || []).map(normalizeProduct).filter(Boolean),
    [newProducts],
  );
  const derivedNewItems = normalizedNewProducts.slice(0, MIN_SECTION_ITEMS).length > 0 
    ? normalizedNewProducts.slice(0, MIN_SECTION_ITEMS)
    : normalizedProducts.slice(0, MIN_SECTION_ITEMS);
  const derivedBestItems = normalizedProducts.slice(
    MIN_SECTION_ITEMS,
    MIN_SECTION_ITEMS * 2,
  );
  // Calculate total trend items based on actual trend tabs count
  const totalTrendItems = TREND_ITEMS_PER_TAB * trendTabs.length;
  const trendSliceStart = MIN_SECTION_ITEMS * 2;
  const trendSliceEnd = trendSliceStart + totalTrendItems;
  const derivedTrendProducts = normalizedProducts.slice(trendSliceStart, trendSliceEnd);
  const derivedRecentItems = normalizedProducts.slice(trendSliceEnd);

  // Use recently viewed from localStorage if available, otherwise use derived items
  const normalizedRecentlyViewed = useMemo(() => {
    if (recentlyViewedFromStorage.length > 0) {
      return recentlyViewedFromStorage.map((item) => ({
        id: item.id,
        title: item.title || "Shopify product",
        price: item.price || "",
        img: item.img || item.image?.src || "/images/product-placeholder.svg",
        handle: item.handle || "",
        tags: [],
        productType: "",
        variants: [],
        variantId: null,
      }));
    }
    return [];
  }, [recentlyViewedFromStorage]);

  const newItems = ensureItems(derivedNewItems, fallbackNewItems, MIN_SECTION_ITEMS);
  const bestItems = ensureItems(derivedBestItems, fallbackBestItems, MIN_SECTION_ITEMS);
  const recentItems = normalizedRecentlyViewed.length > 0 
    ? normalizedRecentlyViewed.slice(0, MIN_SECTION_ITEMS)
    : ensureItems(derivedRecentItems, fallbackRecentItems, MIN_SECTION_ITEMS);
  const trendCatalog = useMemo(() => {
    const catalog = {};
    trendTabs.forEach((tab, index) => {
      const start = index * TREND_ITEMS_PER_TAB;
      const slice = derivedTrendProducts.slice(start, start + TREND_ITEMS_PER_TAB);
      const fallbackItems = fallbackTrendCatalog[tab] || fallbackTrendingItems;
      catalog[tab] = ensureItems(slice, fallbackItems, TREND_ITEMS_PER_TAB);
    });
    return catalog;
  }, [derivedTrendProducts, trendTabs]);

  const getCardKey = (item, idx) => {
    if (!item || typeof item !== "object") return `product-${idx}`;
    const identifier = item.id || item.handle || item.href || item.title;
    return `product-${identifier || idx}`;
  };

  const renderProductCard = (item, idx = 0, variant = "simple") => (
    <ProductCard key={getCardKey(item, idx)} product={item} index={idx} variant={variant} />
  );

  // Filter products by active tab
  const productsToDisplay = useMemo(() => {
    if (activeFilterTab === "all") return filteredProducts;
    return filteredProducts.filter((product) => {
      const normalizedTag = activeFilterTab.toLowerCase().replace(/\s+/g, "-");
      return product.tags?.some((tag) => tag.toLowerCase() === normalizedTag);
    });
  }, [filteredProducts, activeFilterTab]);

  // Show search results if there's a search query
  if (searchQuery) {
    return (
      <>
        <Head>
          <title>Search: {searchQuery} | Gikzo</title>
          <meta name="description" content={`Search results for ${searchQuery} at Gikzo`} />
        </Head>
        <Layout navItems={navItems} trendTabs={trendTabs} popularSearches={popularSearches}>
          <section className="section-shell">
            <div>
              <h1 className="section-head">Search Results: {searchQuery}</h1>
              
              {availableTags.length > 0 && (
                <div className="search-filter-tabs">
                  <button
                    type="button"
                    className={`search-filter-tab ${activeFilterTab === "all" ? "active" : ""}`}
                    onClick={() => setActiveFilterTab("all")}
                  >
                    All ({filteredProducts.length})
                  </button>
                  {availableTags.map((tag) => {
                    const count = filteredProducts.filter((p) =>
                      p.tags?.some((t) => t.toLowerCase().replace(/-/g, " ") === tag)
                    ).length;
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`search-filter-tab ${activeFilterTab === tag ? "active" : ""}`}
                        onClick={() => setActiveFilterTab(tag)}
                      >
                        {tag} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {productsToDisplay.length > 0 ? (
                <div className="collection-grid">
                  {productsToDisplay.map((product, index) => (
                    <ProductCard key={product.id || product.handle || index} product={product} index={index} variant="flat" />
                  ))}
                </div>
              ) : (
                <p className="collection-empty">No products found for "{searchQuery}"</p>
              )}
            </div>
          </section>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Gikzo - Uncommon Gifts & Unique Products</title>
        <meta name="description" content="Discover unique and uncommon gifts at Gikzo. Hand-selected products for every occasion, from Christmas gifts to personalized items." />
        <meta name="keywords" content="gifts, unique gifts, gikzo, Christmas gifts, personalized gifts" />
        <meta property="og:title" content="Gikzo - Uncommon Gifts & Unique Products" />
        <meta property="og:description" content="Discover unique and uncommon gifts at Gikzo. Hand-selected products for every occasion." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://gikzo.com" />
      </Head>
      <Layout navItems={navItems} trendTabs={trendTabs} popularSearches={popularSearches}>
        <section className="quick-row">
        <div className="container">
          <div className="quick-carousel">
            <div className="quick-track" ref={registerTrack("quick")}>
              {quickLinks.map((item) => (
                <Link key={item.label} href={item.href || "#"} className="quick-card">
                  <img src={item.img} alt={item.label} loading="lazy" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="hero-feature">
        <div className="hero-media">
          <img
            src="https://macorner.co/cdn/shop/files/Christmas_Ornaments_Banner_2000x.jpg?v=1764214363"
            alt="glass forest"
            loading="lazy"
          />
        </div>
        <div className="hero-copy">
          <p className="hero-kicker">MERRY AND EXTRAORDINARY</p>
          <h1>unexpected, handmade, and one-of-a-kind gifts</h1>
          <p>Holiday gift guide 2025 · curated by independent makers worldwide. Send magic straight to their doorstep.</p>
          <button className="btn btn-primary">shop uncommon gifts →</button>
        </div>
      </section>

      <section className="section-shell">
        <h2 className="section-head">Stock up on holiday essentials</h2>
        <div className="chip-grid">
          {chips.map((chip) => (
            <button key={chip}>{chip}</button>
          ))}
        </div>
      </section>
      <section className="section-shell slider-full">
        <div className="trending-header">
          <h2 className="section-head">
            <span className="material-icons">trending_up</span> Today's <span className="trending-break">Trending Searches</span>
          </h2>
          <div className="trend-tabs">
            {trendTabs.map((tab) => (
              <button
                key={tab}
                className={`trend-tab ${tab === activeTrend ? "active" : ""}`}
                onClick={() => {
                  setActiveTrend(tab);
                  positions.current.trend = 0;
                  trackRefs.current.trend?.scrollTo({ left: 0, behavior: "smooth" });
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="slider-shell trend-slider">
          <button className="slider-nav prev" onClick={() => slide("trend", -1)}>
            ‹
          </button>
          <div className="slider-track" ref={registerTrack("trend")}>
            {(trendCatalog[activeTrend] || []).map((item, idx) =>
              renderProductCard(item, idx, "simple"),
            )}
          </div>
          <button className="slider-nav next" onClick={() => slide("trend", 1)}>
            ›
          </button>
        </div>
      </section>
      <section className="handmade-spotlight">
        <div>
          <img
            src="https://macorner.co/cdn/shop/files/Gifts_For_Book_Lovers_Banner_2000x.webp?v=1759569559"
            alt="Handmade wolf family sculpture"
            loading="lazy"
          />
        </div>
        <div className="spotlight-copy">
          <small>handmade focus</small>
          <h3>Wolf family wooden sculpture</h3>
          <p>
            Laser-engraved maple wood sculpture depicting a wolf family, featuring hand-painted heart accents and personalized name engravings for each member, allowing customers to experience the warmth of unique handmade craftsmanship.
          </p>
          <button className="btn btn-primary">explore handmade items →</button>
        </div>
      </section>

      <section className="section-shell slider-full">
        <h2 className="section-head">New for you</h2>
        <div className="slider-shell">
          <button className="slider-nav prev" disabled={!hasMultipleSlides(newItems, 4)} onClick={() => slide("new", -1)}>
            ‹
          </button>
          <div className="slider-track" ref={registerTrack("new")}>
            {newItems.map((item, idx) => renderProductCard(item, idx, "simple"))}
          </div>
          <button className="slider-nav next" disabled={!hasMultipleSlides(newItems, 4)} onClick={() => slide("new", 1)}>
            ›
          </button>
        </div>
      </section>
      <section className="story-section">
        <div className="story-copy">
          <h2>Show them you know them</h2>
          <p>
            Their hobbies, interests, that story they tell each Christmas. From mugs that serve up content about their
            favorite topics to guided experiences that turn stories into a memoir.
          </p>
          <button className="btn btn-primary">shop the gift guide →</button>
        </div>
        <div className="story-cards">
          <article className="story-card">
            <img src="https://macorner.co/cdn/shop/files/You_Me_And_Our_Fur_Babies_-_Personalized_Pet_Blanket_Review.png?v=1735614204&width=400" alt="guided memoir" />
            <button>guided memoir</button>
          </article>
          <article className="story-card">
            <img src="https://macorner.co/cdn/shop/files/Photo_review_homepage.jpg?v=1761303235&width=400" alt="daily discovery gifts" />
            <button>daily discovery gifts</button>
          </article>
        </div>
      </section>
      <section className="section-shell slider-full">
        <h2 className="section-head">Best-selling gifts</h2>
        <div className="slider-shell">
          <button className="slider-nav prev" disabled={!hasMultipleSlides(bestItems, 4)} onClick={() => slide("best", -1)}>
            ‹
          </button>
          <div className="slider-track" ref={registerTrack("best")}>
            {bestItems.map((item, idx) => renderProductCard(item, idx, "simple"))}
          </div>
          <button className="slider-nav next" disabled={!hasMultipleSlides(bestItems, 4)} onClick={() => slide("best", 1)}>
            ›
          </button>
        </div>
      </section>

      

      

      <section className="maker-feature">
        <div className="maker-grid">
          <img src="https://macorner.co/cdn/shop/files/Photo_review_homepage_1.jpg?v=1761303234&width=400" alt="vinyl art 1" />
          <img src="https://macorner.co/cdn/shop/files/Photo_review_homepage_4.jpg?v=1761303234&width=400" alt="vinyl art 2" />
          <img src="https://macorner.co/cdn/shop/files/Photo_review_homepage_2.jpg?v=1761303234&width=400" alt="vinyl art 3" />
          <img src="https://macorner.co/cdn/shop/files/Review_photo_2_78120947-5c93-4ada-a136-720631c02c20.jpg?v=1761303421&width=400" alt="vinyl art 4" />
        </div>
        <div className="maker-copy">
          <small>UNCOMMON MAKER</small>
          <h3>Jeff Davis spreads joy through vinyl</h3>
          <p>
            "I know how exciting it is to give the perfect gift," says Jeff, who crafts his pieces from reclaimed vinyl
            records in Philadelphia. "Take time to connect and spend time with the people you care about."
          </p>
          <button className="btn btn-primary" style={{ width: "max-content" }}>
            see Jeff's work →
          </button>
        </div>
      </section>

      <section className="section-shell">
        <div className="container">
          <div className="holiday-cta">
            <div>
              <p style={{ letterSpacing: "0.3em", color: "#c46621", textTransform: "uppercase" }}>unexpected and affordable</p>
              <h3>Holiday gifts under $50</h3>
              <p>
                We hand-picked this collection of clever surprises under $50 to help you wow everyone on your list while
                sticking to your budget.
              </p>
              <button className="btn btn-primary">shop now</button>
            </div>
          </div>
        </div>
      </section>

      <section className="better-give">
        <div>
          <small>BETTER TO GIVE</small>
          <h3>Partnering with Breastcancer.org</h3>
          <p>
            Breastcancer.org helps people make sense of complex information about breast health and breast cancer. Choose
            them at checkout and we'll donate $1 ($2 if you're a Perks member) at no cost to you.
          </p>
          <button className="btn btn-primary">shop their gift guide</button>
        </div>
        <img
          src="https://macorner.co/cdn/shop/files/Home_Living_Homepage_Banner_2000x.jpg?v=1755945450"
          alt="breastcancer.org"
          loading="lazy"
        />
      </section>

      <section className="recent-section slider-full">
        <div className="recent-header">
          <h2>Recently viewed</h2>
        </div>
        <div className="slider-shell">
          <button className="slider-nav prev" disabled={!hasMultipleSlides(recentItems, 4)} onClick={() => slide("recent", -1)}>
            ‹
          </button>
          <div className="slider-track" ref={registerTrack("recent")}>
            {recentItems.map((item, idx) => renderProductCard(item, idx, "simple"))}
          </div>
          <button className="slider-nav next" disabled={!hasMultipleSlides(recentItems, 4)} onClick={() => slide("recent", 1)}>
            ›
          </button>
        </div>
        <div className="recent-footer">
          <a href="#">see browsing history →</a>
        </div>
      </section>

      <section className="what-section">
        <h2 className="section-head">what makes us uncommon</h2>
        <div className="what-grid">
          <article>
            <span>🙂</span>
            <div>
              <h4>Independent makers</h4>
              <p>creating innovative designs</p>
            </div>
          </article>
          <article>
            <span>💚</span>
            <div>
              <h4>Better to give</h4>
              <p>over $3 million donated</p>
            </div>
          </article>
          <article>
            <span>Ⓑ</span>
            <div>
              <h4>Founding B Corp</h4>
              <p>since 2007</p>
            </div>
          </article>
          <article>
            <span>🐻</span>
            <div>
              <h4>No leather, feathers, or fur</h4>
              <p>since 1999</p>
            </div>
          </article>
          <article>
            <span>🚚</span>
            <div>
              <h4>Free shipping</h4>
              <p>for Uncommon Perks members</p>
            </div>
          </article>
          <article>
            <span>♻️</span>
            <div>
              <h4>Forever returns</h4>
              <p>if you don't love it</p>
            </div>
          </article>
        </div>
      </section>

      <section className="section-shell">
        <div>
          <div className="shop-grid">
            {shopColumns.map((column) => (
              <div className="shop-card" key={column.title}>
                <div style={{ textTransform: "uppercase", color: "#c46621", letterSpacing: "0.2em" }}>{column.title}</div>
                {column.items.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      </Layout>
    </>
  );
}

// Convert to ISR (Incremental Static Regeneration) for better performance
// Pages are pre-rendered at build time and revalidated every 60 seconds
export async function getStaticProps() {
  try {
    const [products, newProducts, collections, menuItems, quickTrackMenuItems] = await Promise.all([
      fetchShopifyProductsLightweight(40), // Reduced from 120 to 40, using lightweight fields
      fetchNewProductsLightweight(12), // Reduced from 20 to 12, using lightweight fields
      fetchShopifyCollections(30), // Reduced from 50 to 30
      fetchShopifyMenuAsNavItems("main-menu").catch((err) => {
        console.error("Failed to fetch menu:", err);
        return [];
      }),
      fetchShopifyMenuAsNavItems("quick-track").catch((err) => {
        console.error("Failed to fetch quick-track menu:", err);
        return [];
      }),
    ]);
    return {
      props: {
        shopifyProducts: products,
        newProducts: newProducts,
        shopifyCollections: collections,
        shopifyMenuItems: menuItems,
        quickTrackMenuItems: quickTrackMenuItems,
      },
      // Revalidate every 60 seconds - pages will be regenerated in the background
      // This allows the page to be served from CDN while staying fresh
      revalidate: 60,
    };
  } catch (error) {
    console.error("Failed to sync Shopify data from Shopify API", error);
    return {
      props: {
        shopifyProducts: [],
        newProducts: [],
        shopifyCollections: [],
        shopifyMenuItems: [],
        quickTrackMenuItems: [],
      },
      // Even on error, revalidate after 60 seconds to retry
      revalidate: 60,
    };
  }
}

