import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { formatPrice } from "../lib/productFormatter";
import { createCart, addToCart, updateCartLine, removeCartLine, getCart } from "../lib/shopify";

const CART_ID_KEY = "shopify-cart-id";

const CartContext = createContext({
  items: [],
  addItem: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clear: () => {},
  subtotal: 0,
  isLoading: false,
  cartId: null,
  checkoutUrl: null,
  refreshCart: () => {},
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
    variantId: item.variantId || null,
    lineId: item.lineId || null, // Shopify cart line ID
  };
};

// Convert Shopify cart lines to our cart items format
const mapShopifyCartLines = (cart) => {
  if (!cart?.lines?.edges) return [];
  
  return cart.lines.edges.map(({ node }) => {
    const variant = node.merchandise;
    const product = variant?.product;
    const price = Number(variant?.price?.amount || 0);
    const currency = variant?.price?.currencyCode || "USD";
    
    // Extract bundle attributes
    const attributes = (node.attributes || []).reduce((acc, attr) => {
      acc[attr.key] = attr.value;
      return acc;
    }, {});
    
    return {
      id: variant?.id || node.id,
      lineId: node.id,
      variantId: variant?.id,
      title: product?.title || "Cart item",
      handle: product?.handle || "",
      image: product?.featuredImage?.url || "/images/product-placeholder.svg",
      unitPrice: price,
      currency,
      priceFormatted: formatPrice(price, currency),
      quantity: node.quantity,
      variantTitle: variant?.title || null,
      bundleId: attributes._bundle_id || null,
      bundleName: attributes._bundle_name || null,
      bundleItem: attributes._bundle_item || null,
    };
  });
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [cartId, setCartId] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart ID and sync with Shopify
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadCart = async () => {
      try {
        let savedCartId = window.localStorage.getItem(CART_ID_KEY);
        
        // If no cart ID, create a new cart
        if (!savedCartId) {
          const newCart = await createCart();
          if (newCart?.id) {
            savedCartId = newCart.id;
            window.localStorage.setItem(CART_ID_KEY, savedCartId);
            setCartId(savedCartId);
            setCheckoutUrl(newCart.checkoutUrl || null);
            setItems(mapShopifyCartLines(newCart));
          } else {
            console.warn("Failed to create cart");
            setItems([]);
            setCheckoutUrl(null);
          }
        } else {
          // Fetch existing cart from Shopify
          setCartId(savedCartId);
          const cart = await getCart(savedCartId);
          if (cart) {
            setCheckoutUrl(cart.checkoutUrl || null);
            setItems(mapShopifyCartLines(cart));
          } else {
            // Cart not found, create new one
            console.warn("Cart not found, creating new cart");
            const newCart = await createCart();
            if (newCart?.id) {
              const newCartId = newCart.id;
              window.localStorage.setItem(CART_ID_KEY, newCartId);
              setCartId(newCartId);
              setCheckoutUrl(newCart.checkoutUrl || null);
              setItems(mapShopifyCartLines(newCart));
            } else {
              setItems([]);
              setCheckoutUrl(null);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load cart from Shopify", error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, []);

  const addItem = useCallback(async (item, quantity = 1) => {
    const normalized = normalizeCartItem({ ...item, quantity });
    if (!normalized) {
      console.warn("Cannot normalize cart item", item);
      return;
    }

    // Need variant ID to add to Shopify cart
    const variantId = normalized.variantId || normalized.id;
    if (!variantId) {
      console.error("Cannot add to cart: missing variant ID", { item, normalized });
      return;
    }

    console.log("Adding to cart:", { variantId, quantity, cartId });

    try {
      let currentCartId = cartId;
      
      // Create cart if doesn't exist
      if (!currentCartId) {
        console.log("Creating new cart...");
        const newCart = await createCart();
        if (newCart?.id) {
          currentCartId = newCart.id;
          setCartId(currentCartId);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(CART_ID_KEY, currentCartId);
          }
          console.log("Cart created:", currentCartId);
        } else {
          console.error("Failed to create cart", newCart);
          throw new Error("Failed to create cart");
        }
      }

      // Add to Shopify cart
      console.log("Adding item to cart:", { cartId: currentCartId, variantId, quantity });
      const updatedCart = await addToCart(currentCartId, variantId, quantity);
      if (updatedCart) {
        console.log("Cart updated successfully:", updatedCart);
        setCheckoutUrl(updatedCart.checkoutUrl || null);
        // Map cart lines to ensure bundle attributes are preserved
        setItems(mapShopifyCartLines(updatedCart));
      } else {
        // If addToCart didn't return cart, fetch it manually
        console.warn("addToCart didn't return cart, fetching manually...");
        const cart = await getCart(currentCartId);
        if (cart) {
          setCheckoutUrl(cart.checkoutUrl || null);
          setItems(mapShopifyCartLines(cart));
        } else {
          console.error("Failed to add to cart - no cart returned");
          throw new Error("Failed to add to cart");
        }
      }
    } catch (error) {
      console.error("Failed to add to Shopify cart", error);
      // Re-fetch cart to get latest state
      if (cartId) {
        try {
          const cart = await getCart(cartId);
          if (cart) {
            setItems(mapShopifyCartLines(cart));
          }
        } catch (e) {
          console.error("Failed to refresh cart", e);
        }
      }
    }
  }, [cartId]);

  const updateQuantity = useCallback(async (id, quantity) => {
    const newQuantity = Math.max(0, Number(quantity) || 0);
    
    if (newQuantity === 0) {
      // Remove item - use removeItem function
      const item = items.find((i) => i.id === id);
      if (item?.lineId && cartId) {
        try {
          const updatedCart = await removeCartLine(cartId, item.lineId);
          if (updatedCart) {
            setCheckoutUrl(updatedCart.checkoutUrl || null);
            // Map cart lines to ensure bundle attributes are preserved
            setItems(mapShopifyCartLines(updatedCart));
            return;
          } else {
            // If removeCartLine didn't return cart, fetch it manually
            const cart = await getCart(cartId);
            if (cart) {
              setCheckoutUrl(cart.checkoutUrl || null);
              setItems(mapShopifyCartLines(cart));
              return;
            }
          }
        } catch (error) {
          console.error("Failed to remove cart line", error);
          // Re-fetch cart to get latest state
          if (cartId) {
            try {
              const cart = await getCart(cartId);
              if (cart) {
                setCheckoutUrl(cart.checkoutUrl || null);
                setItems(mapShopifyCartLines(cart));
                return;
              }
            } catch (e) {
              console.error("Failed to refresh cart", e);
            }
          }
        }
      }
      // Fallback: remove from local state
      setItems((prev) => prev.filter((item) => item.id !== id));
      return;
    }

    const item = items.find((i) => i.id === id);
    if (!item) return;

    const finalQuantity = Math.max(1, newQuantity);

    // If we have lineId, update via Shopify API
    if (item.lineId && cartId) {
      try {
        const updatedCart = await updateCartLine(cartId, item.lineId, finalQuantity);
        if (updatedCart) {
          setCheckoutUrl(updatedCart.checkoutUrl || null);
          // Map cart lines to ensure bundle attributes are preserved
          setItems(mapShopifyCartLines(updatedCart));
          return;
        } else {
          // If updateCartLine didn't return cart, fetch it manually
          const cart = await getCart(cartId);
          if (cart) {
            setCheckoutUrl(cart.checkoutUrl || null);
            setItems(mapShopifyCartLines(cart));
            return;
          }
        }
      } catch (error) {
        console.error("Failed to update cart line", error);
        // Re-fetch cart to get latest state
        if (cartId) {
          try {
            const cart = await getCart(cartId);
            if (cart) {
              setCheckoutUrl(cart.checkoutUrl || null);
              setItems(mapShopifyCartLines(cart));
              return;
            }
          } catch (e) {
            console.error("Failed to refresh cart", e);
          }
        }
      }
    }
  }, [items, cartId]);

  const removeItem = useCallback(async (id) => {
    const item = items.find((i) => i.id === id);
    
    // If we have lineId, remove via Shopify API
    if (item?.lineId && cartId) {
        try {
          const updatedCart = await removeCartLine(cartId, item.lineId);
          if (updatedCart) {
            setCheckoutUrl(updatedCart.checkoutUrl || null);
            // Map cart lines to ensure bundle attributes are preserved
            setItems(mapShopifyCartLines(updatedCart));
            return;
          } else {
            // If removeCartLine didn't return cart, fetch it manually
            const cart = await getCart(cartId);
            if (cart) {
              setCheckoutUrl(cart.checkoutUrl || null);
              setItems(mapShopifyCartLines(cart));
              return;
            }
          }
        } catch (error) {
          console.error("Failed to remove cart line", error);
          // Re-fetch cart to get latest state
          if (cartId) {
            try {
              const cart = await getCart(cartId);
              if (cart) {
                setCheckoutUrl(cart.checkoutUrl || null);
                setItems(mapShopifyCartLines(cart));
                return;
              }
            } catch (e) {
              console.error("Failed to refresh cart", e);
            }
          }
        }
    }
    
    // Fallback: remove from local state
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, [items, cartId]);

  const clear = useCallback(async () => {
    // Remove all items one by one if we have cart ID
    if (cartId && items.length > 0) {
      try {
        const lineIds = items.filter((item) => item.lineId).map((item) => item.lineId);
        // Remove all lines sequentially
        for (const lineId of lineIds) {
          await removeCartLine(cartId, lineId);
        }
        // Fetch updated cart (should be empty now)
        const updatedCart = await getCart(cartId);
        if (updatedCart) {
          setCheckoutUrl(updatedCart.checkoutUrl || null);
          setItems(mapShopifyCartLines(updatedCart));
        } else {
          // If cart not found, create new one
          const newCart = await createCart();
          if (newCart?.id) {
            const newCartId = newCart.id;
            if (typeof window !== "undefined") {
              window.localStorage.setItem(CART_ID_KEY, newCartId);
            }
            setCartId(newCartId);
            setCheckoutUrl(newCart.checkoutUrl || null);
            setItems([]);
          } else {
            setItems([]);
            setCheckoutUrl(null);
          }
        }
        return;
      } catch (error) {
        console.error("Failed to clear cart", error);
      }
    }
    // If no cart ID or clearing failed, just clear local state
    setItems([]);
  }, [cartId, items]);

  const refreshCart = useCallback(async () => {
    // Get cart ID from localStorage in case it changed
    let currentCartId = cartId;
    if (typeof window !== "undefined") {
      const savedCartId = window.localStorage.getItem(CART_ID_KEY);
      if (savedCartId && savedCartId !== currentCartId) {
        currentCartId = savedCartId;
        setCartId(savedCartId);
      }
    }
    
    if (!currentCartId) return;
    
    try {
      const cart = await getCart(currentCartId);
      if (cart) {
        setCheckoutUrl(cart.checkoutUrl || null);
        setItems(mapShopifyCartLines(cart));
      } else {
        console.warn("Cart not found during refresh");
        setCheckoutUrl(null);
      }
    } catch (error) {
      console.error("Failed to refresh cart", error);
    }
  }, [cartId]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clear, subtotal, isLoading, cartId, checkoutUrl, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

