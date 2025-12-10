import { normalizeProduct } from "./productFormatter";
import { fallbackTrendTabs } from "./siteContent";

const fallbackPopularSearches = ["advent calendar", "golf", "puzzle", "cat"];

/**
 * Calculate trend tabs from products (most popular tags)
 * @param {Array} products - Array of Shopify products
 * @param {Array} collections - Array of Shopify collections
 * @returns {Array} Array of trend tab names
 */
export function calculateTrendTabs(products = [], collections = []) {
  // Normalize products
  const normalizedProducts = (products || []).map(normalizeProduct).filter(Boolean);
  
  // Option 1: Use most popular tags from products
  if (normalizedProducts.length > 0) {
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
  if (collections && collections.length > 0) {
    const tabs = collections
      .slice(0, 5)
      .map((collection) => collection.title?.toLowerCase() || "")
      .filter(Boolean);
    if (tabs.length > 0) return tabs;
  }
  
  // Option 3: Use hardcoded fallback
  return fallbackTrendTabs;
}

/**
 * Calculate popular searches from top collections
 * @param {Array} collections - Array of Shopify collections
 * @returns {Array} Array of popular search terms
 */
export function calculatePopularSearches(collections = []) {
  if (collections && collections.length > 0) {
    const searches = collections
      .slice(0, 4)
      .map((collection) => collection.title?.toLowerCase() || "")
      .filter(Boolean);
    if (searches.length > 0) return searches;
  }
  return fallbackPopularSearches;
}

