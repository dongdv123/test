import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { formatPrice } from "../lib/productFormatter";

const STORAGE_KEY = "cart-items";

const CartContext = createContext({
  items: [],
  addItem: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clear: () => {},
  subtotal: 0,
});

const normalizeCartItem = (item = {}) => {
  const id = item.id || item.productId || item.handle || item.title;
  if (!id) return null;

  const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
  const currency = item.currency || "USD";
  return {
    id: String(id),
    title: item.title || "Cart item",
    handle: item.handle || "",
    image: item.image || item.img || "/images/product-placeholder.svg",
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    currency,
    priceFormatted: item.priceFormatted || formatPrice(unitPrice || 0, currency),
    quantity: Math.max(1, Number(item.quantity) || 1),
    variantTitle: item.variantTitle || null,
  };
};

export const CartProvider = ({ children }) => {
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
      console.warn("Failed to load cart items", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn("Failed to persist cart items", error);
    }
  }, [items]);

  const addItem = useCallback((item, quantity = 1) => {
    setItems((prev) => {
      const normalized = normalizeCartItem({ ...item, quantity });
      if (!normalized) return prev;
      const existing = prev.findIndex((cartItem) => cartItem.id === normalized.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = {
          ...next[existing],
          quantity: next[existing].quantity + normalized.quantity,
        };
        return next;
      }
      return [...prev, normalized];
    });
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    const newQuantity = Math.max(0, Number(quantity) || 0);
    if (newQuantity === 0) {
      // If quantity is 0, remove the item
      setItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      // Otherwise, update the quantity (minimum 1)
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: Math.max(1, newQuantity) } : item
        )
      );
    }
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clear, subtotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

