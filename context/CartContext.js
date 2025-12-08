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
    // Ensure price is a valid number
    const price = Number(variant?.price?.amount || 0);
    if (!Number.isFinite(price) || price < 0) {
      console.warn("Invalid price for cart item:", variant?.price);
    }
    const currency = variant?.price?.currencyCode || "USD";
    
    // Extract bundle attributes
    const attributes = (node.attributes || []).reduce((acc, attr) => {
      acc[attr.key] = attr.value;
      return acc;
    }, {});
    
    // Ensure quantity is valid
    const quantity = Math.max(0, Number(node.quantity) || 0);
    
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
      quantity: quantity,
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
  const [shopifySubtotal, setShopifySubtotal] = useState(0); // Store Shopify's calculated subtotal

  // Helper function to update cart state from Shopify cart object
  const updateCartFromShopify = useCallback((cart) => {
    if (!cart) return;
    setCheckoutUrl(cart.checkoutUrl || null);
    setItems(mapShopifyCartLines(cart));
    // Store Shopify's calculated subtotal for validation
    const shopifyTotal = Number(cart.cost?.totalAmount?.amount || 0);
    if (Number.isFinite(shopifyTotal)) {
      setShopifySubtotal(shopifyTotal);
    } else {
      setShopifySubtotal(0);
    }
  }, []);

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
            updateCartFromShopify(newCart);
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
            updateCartFromShopify(cart);
          } else {
            // Cart not found, create new one
            console.warn("Cart not found, creating new cart");
            const newCart = await createCart();
            if (newCart?.id) {
              const newCartId = newCart.id;
              window.localStorage.setItem(CART_ID_KEY, newCartId);
              setCartId(newCartId);
              updateCartFromShopify(newCart);
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
        updateCartFromShopify(updatedCart);
      } else {
        // If addToCart didn't return cart, fetch it manually
        console.warn("addToCart didn't return cart, fetching manually...");
        const cart = await getCart(currentCartId);
        if (cart) {
          updateCartFromShopify(cart);
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
            updateCartFromShopify(cart);
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
            updateCartFromShopify(updatedCart);
            return;
          } else {
            // If removeCartLine didn't return cart, fetch it manually
            const cart = await getCart(cartId);
            if (cart) {
              updateCartFromShopify(cart);
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
                updateCartFromShopify(cart);
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
      setShopifySubtotal(0);
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
          updateCartFromShopify(updatedCart);
          return;
        } else {
          // If updateCartLine didn't return cart, fetch it manually
          const cart = await getCart(cartId);
          if (cart) {
            updateCartFromShopify(cart);
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
              updateCartFromShopify(cart);
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
            updateCartFromShopify(updatedCart);
            return;
          } else {
            // If removeCartLine didn't return cart, fetch it manually
            const cart = await getCart(cartId);
            if (cart) {
              updateCartFromShopify(cart);
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
                updateCartFromShopify(cart);
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
    setShopifySubtotal(0);
  }, [items, cartId, updateCartFromShopify]);

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
          updateCartFromShopify(updatedCart);
        } else {
          // If cart not found, create new one
          const newCart = await createCart();
          if (newCart?.id) {
            const newCartId = newCart.id;
            if (typeof window !== "undefined") {
              window.localStorage.setItem(CART_ID_KEY, newCartId);
            }
            setCartId(newCartId);
            updateCartFromShopify(newCart);
          } else {
            setItems([]);
            setCheckoutUrl(null);
            setShopifySubtotal(0);
          }
        }
        return;
      } catch (error) {
        console.error("Failed to clear cart", error);
      }
    }
    // If no cart ID or clearing failed, just clear local state
    setItems([]);
    setShopifySubtotal(0);
  }, [cartId, items, updateCartFromShopify]);

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
        updateCartFromShopify(cart);
      } else {
        console.warn("Cart not found during refresh");
        setCheckoutUrl(null);
      }
    } catch (error) {
      console.error("Failed to refresh cart", error);
    }
  }, [cartId, updateCartFromShopify]);

  // Calculate subtotal from items
  // Note: This should match Shopify's calculation, but we use Shopify's totalAmount as source of truth
  const calculatedSubtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const itemTotal = Number(item.unitPrice || 0) * Number(item.quantity || 0);
      return sum + (Number.isFinite(itemTotal) ? itemTotal : 0);
    }, 0);
  }, [items]);
  
  // Use Shopify's subtotal if available, otherwise fallback to calculated
  const subtotal = shopifySubtotal > 0 ? shopifySubtotal : calculatedSubtotal;

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clear, subtotal, isLoading, cartId, checkoutUrl, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

