import { useState, useEffect } from "react";

const STORAGE_KEY = "recentlyViewed";
const MAX_ITEMS = 10;

/**
 * Custom hook for managing recently viewed products
 * Saves and loads products from localStorage
 */
export const useRecentlyViewed = (currentProduct) => {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Load recently viewed products from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      const viewed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      // Filter out current product and limit
      const filtered = viewed
        .filter((item) => item.handle !== currentProduct?.handle)
        .slice(0, MAX_ITEMS);
      setRecentlyViewed(filtered);
    } catch (error) {
      console.error("Failed to load recently viewed:", error);
      setRecentlyViewed([]);
    }
  }, [currentProduct?.handle]);

  // Save current product to recently viewed
  useEffect(() => {
    if (typeof window === "undefined" || !currentProduct?.handle) return;

    try {
      const viewed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      // Remove current product if exists
      const filtered = viewed.filter((item) => item.handle !== currentProduct.handle);
      
      // Add current product to the beginning
      const updated = [
        {
          id: currentProduct.id,
          handle: currentProduct.handle,
          title: currentProduct.title,
          img: currentProduct.image?.src || currentProduct.images?.[0]?.src,
          image: currentProduct.image ? { src: currentProduct.image.src } : (currentProduct.images?.[0] ? { src: currentProduct.images[0].src } : null),
          price: currentProduct.price || currentProduct.priceRange?.min?.amount || "",
        },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save recently viewed:", error);
    }
  }, [
    currentProduct?.id,
    currentProduct?.handle,
    currentProduct?.title,
    currentProduct?.image,
    currentProduct?.images,
    currentProduct?.price,
    currentProduct?.priceRange,
  ]);

  return recentlyViewed;
};

