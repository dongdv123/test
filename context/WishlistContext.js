import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const WishlistContext = createContext({
  items: [],
  toggleItem: () => {},
  removeItem: () => {},
  isInWishlist: () => false,
  clear: () => {},
});

const STORAGE_KEY = "wishlist-items";
const PLACEHOLDER_IMAGE = "/images/product-placeholder.svg";

const normalizeWishlistItem = (product = {}) => {
  const id = product.id || product.handle || product.title;
  if (!id) return null;

  return {
    id: String(id),
    title: product.title || "Shopify product",
    price: product.price || "",
    img: product.img || product.image?.src || PLACEHOLDER_IMAGE,
    handle: product.handle || "",
    href: product.href || (product.handle ? `/products/${product.handle}` : undefined),
  };
};

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (error) {
      console.warn("Failed to load wishlist from storage", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn("Failed to persist wishlist to storage", error);
    }
  }, [items]);

  const toggleItem = useCallback((product) => {
    setItems((prev) => {
      const normalized = normalizeWishlistItem(product);
      if (!normalized) return prev;
      const exists = prev.some((item) => item.id === normalized.id);
      if (exists) {
        return prev.filter((item) => item.id !== normalized.id);
      }
      return [normalized, ...prev];
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const isInWishlist = useCallback(
    (id) => {
      if (!id) return false;
      return items.some((item) => item.id === id);
    },
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      toggleItem,
      removeItem,
      isInWishlist,
      clear,
    }),
    [items, toggleItem, removeItem, isInWishlist, clear],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => useContext(WishlistContext);


