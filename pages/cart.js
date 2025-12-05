import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { useSlider } from "../hooks/useSlider";
import { useCart } from "../context/CartContext";
import { formatPrice, normalizeProduct } from "../lib/productFormatter";
import { fetchShopifyCollections, fetchShopifyMenuAsNavItems, fetchShopifyProducts } from "../lib/shopify";
import { getNavItems } from "../lib/navUtils";
import { navLinks as baseNavLinks } from "../lib/siteContent";

export default function CartPage({ navItems, allProducts = [] }) {
  const { items, subtotal, updateQuantity, removeItem, checkoutUrl } = useCart();
  const { registerTrack, slide, hasMultipleSlides } = useSlider();
  
  const handleCheckout = (e) => {
    e.preventDefault();
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      // Fallback to /checkout if checkoutUrl not available
      window.location.href = "/checkout";
    }
  };
  const formattedSubtotal = formatPrice(subtotal || 0);

  // Group items by bundle
  const groupedItems = useMemo(() => {
    const bundles = new Map();
    const standalone = [];

    items.forEach((item) => {
      if (item.bundleId) {
        if (!bundles.has(item.bundleId)) {
          bundles.set(item.bundleId, {
            bundleId: item.bundleId,
            bundleName: item.bundleName || `Bundle ${item.bundleId}`,
            items: [],
          });
        }
        bundles.get(item.bundleId).items.push(item);
      } else {
        standalone.push(item);
      }
    });

    return {
      bundles: Array.from(bundles.values()),
      standalone,
    };
  }, [items]);

  // Get related products based on cart items
  const relatedProducts = useMemo(() => {
    if (items.length === 0 || allProducts.length === 0) return [];

    // Normalize all products first
    const normalized = allProducts.map(normalizeProduct).filter(Boolean);

    // Get product types and tags from cart items by matching with allProducts
    const cartProductTypes = new Set();
    const cartTags = new Set();
    const cartProductIds = new Set();
    const cartHandles = new Set();

    items.forEach((item) => {
      // Add IDs and handles to exclusion list
      if (item.id) cartProductIds.add(String(item.id));
      if (item.productId) cartProductIds.add(String(item.productId));
      if (item.handle) cartHandles.add(item.handle);

      // Try to find matching product in allProducts to get productType and tags
      const matchingProduct = normalized.find(
        (p) =>
          (p.id && (String(p.id) === String(item.id) || String(p.id) === String(item.productId))) ||
          (p.handle && p.handle === item.handle)
      );

      if (matchingProduct) {
        if (matchingProduct.productType) {
          cartProductTypes.add(matchingProduct.productType.toLowerCase().trim());
        }
        if (matchingProduct.tags && Array.isArray(matchingProduct.tags)) {
          matchingProduct.tags.forEach((tag) => cartTags.add(String(tag).toLowerCase().trim()));
        }
      }
    });

    // Find related products (same productType or shared tags, excluding cart items)
    const related = normalized
      .filter((product) => {
        // Exclude products already in cart
        if (product.id && cartProductIds.has(String(product.id))) return false;
        if (product.handle && cartHandles.has(product.handle)) return false;

        // Check if product shares productType or tags with cart items
        const productTypeMatch =
          product.productType &&
          cartProductTypes.has(product.productType.toLowerCase().trim());
        const tagMatch =
          product.tags &&
          Array.isArray(product.tags) &&
          product.tags.some((tag) => cartTags.has(String(tag).toLowerCase().trim()));

        return productTypeMatch || tagMatch;
      })
      .slice(0, 8); // Limit to 8 products

    // If not enough related products, add some random products
    if (related.length < 4) {
      const randomProducts = normalized
        .filter((product) => {
          if (product.id && cartProductIds.has(String(product.id))) return false;
          if (product.handle && cartHandles.has(product.handle)) return false;
          return !related.some((r) => r.id === product.id || r.handle === product.handle);
        })
        .slice(0, 8 - related.length);
      return [...related, ...randomProducts].slice(0, 8);
    }

    return related;
  }, [items, allProducts]);

  return (
    <Layout navItems={navItems}>
      <section className="cart-page container">
        <header className="cart-header">
          <h1>Shopping Cart ({items.length})</h1>
        </header>

        {items.length === 0 ? (
          <div className="cart-empty">
            <p>Your cart is empty.</p>
            <Link href="/" className="btn btn-primary">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items">
              {/* Display bundles */}
              {groupedItems.bundles.map((bundle) => (
                <div key={bundle.bundleId} className="cart-bundle-group">
                  <div className="cart-bundle-header">
                    <h3 className="cart-bundle-name">{bundle.bundleName}</h3>
                    <button
                      type="button"
                      className="cart-bundle-remove"
                      onClick={() => {
                        // Remove all items in bundle
                        bundle.items.forEach((item) => removeItem(item.id));
                      }}
                      aria-label={`Remove ${bundle.bundleName}`}
                    >
                      Remove bundle
                    </button>
                  </div>
                  {bundle.items.map((item) => (
                    <article className="cart-row cart-bundle-item" key={item.id}>
                      <button
                        type="button"
                        className="cart-remove absolute"
                        aria-label={`Remove ${item.title}`}
                        onClick={() => removeItem(item.id)}
                      >
                        ✕
                      </button>
                      <img src={item.image} alt={item.title} />
                      <div>
                        <Link href={item.handle ? `/products/${item.handle}` : "#"} className="cart-item-title">
                          {item.title}
                        </Link>
                        {item.variantTitle && <div className="cart-item-variant">{item.variantTitle}</div>}
                        <div className="cart-item-meta">
                          <span>{item.priceFormatted || formatPrice(item.unitPrice)}</span>
                          <div className="cart-quantity-control">
                            <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                              −
                            </button>
                            <span>{item.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ))}

              {/* Display standalone items */}
              {groupedItems.standalone.map((item) => (
                <article className="cart-row" key={item.id}>
                  <button
                    type="button"
                    className="cart-remove absolute"
                    aria-label={`Remove ${item.title}`}
                    onClick={() => removeItem(item.id)}
                  >
                    ✕
                  </button>
                  <img src={item.image} alt={item.title} />
                  <div>
                    <Link href={item.handle ? `/products/${item.handle}` : "#"} className="cart-item-title">
                      {item.title}
                    </Link>
                    {item.variantTitle && <div className="cart-item-variant">{item.variantTitle}</div>}
                    <div className="cart-item-meta">
                      <span>{item.priceFormatted || formatPrice(item.unitPrice)}</span>
                      <div className="cart-quantity-control">
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="cart-summary-wrapper">
              <aside className="cart-summary">
                <h2>Order summary</h2>
                <div className="cart-summary-row">
                  <span>Subtotal</span>
                  <span>{formattedSubtotal}</span>
                </div>
                <div className="cart-summary-row">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="cart-summary-row total">
                  <span>Total</span>
                  <span>{formattedSubtotal}</span>
                </div>
                <div className="payment_methods">
                  <div className="title">
                    <h3>Payment Methods</h3>
                  </div>
                  <div className="method">
                  <svg className="icon icon--full-color" xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 38 24" width="38" height="24" aria-labelledby="pi-amazon"><title id="pi-amazon">Amazon</title><path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z" fill="#000" fillRule="nonzero" opacity=".07"></path><path d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32" fill="#FFF" fillRule="nonzero"></path><path d="M25.26 16.23c-1.697 1.48-4.157 2.27-6.275 2.27-2.97 0-5.644-1.3-7.666-3.463-.16-.17-.018-.402.173-.27 2.183 1.504 4.882 2.408 7.67 2.408 1.88 0 3.95-.46 5.85-1.416.288-.145.53.222.248.47v.001zm.706-.957c-.216-.328-1.434-.155-1.98-.078-.167.024-.193-.148-.043-.27.97-.81 2.562-.576 2.748-.305.187.272-.047 2.16-.96 3.063-.14.138-.272.064-.21-.12.205-.604.664-1.96.446-2.29h-.001z" fill="#F90" fillRule="nonzero"></path><path d="M21.814 15.291c-.574-.498-.676-.73-.993-1.205-.947 1.012-1.618 1.315-2.85 1.315-1.453 0-2.587-.938-2.587-2.818 0-1.467.762-2.467 1.844-2.955.94-.433 2.25-.51 3.25-.628v-.235c0-.43.033-.94-.208-1.31-.212-.333-.616-.47-.97-.47-.66 0-1.25.353-1.392 1.085-.03.163-.144.323-.3.33l-1.677-.187c-.14-.033-.296-.153-.257-.38.386-2.125 2.223-2.766 3.867-2.766.84 0 1.94.234 2.604.9.842.82.762 1.918.762 3.11v2.818c0 .847.335 1.22.65 1.676.113.164.138.36-.003.482-.353.308-.98.88-1.326 1.2a.367.367 0 0 1-.414.038zm-1.659-2.533c.34-.626.323-1.214.323-1.918v-.392c-1.25 0-2.57.28-2.57 1.82 0 .782.386 1.31 1.05 1.31.487 0 .922-.312 1.197-.82z" fill="#221F1F"></path></svg>
                  <svg className="icon icon--full-color" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="pi-american_express" viewBox="0 0 38 24" width="38" height="24"><title id="pi-american_express">American Express</title><path fill="#000" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3Z" opacity=".07"></path><path fill="#006FCF" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32Z"></path><path fill="#FFF" d="M22.012 19.936v-8.421L37 11.528v2.326l-1.732 1.852L37 17.573v2.375h-2.766l-1.47-1.622-1.46 1.628-9.292-.02Z"></path><path fill="#006FCF" d="M23.013 19.012v-6.57h5.572v1.513h-3.768v1.028h3.678v1.488h-3.678v1.01h3.768v1.531h-5.572Z"></path><path fill="#006FCF" d="m28.557 19.012 3.083-3.289-3.083-3.282h2.386l1.884 2.083 1.89-2.082H37v.051l-3.017 3.23L37 18.92v.093h-2.307l-1.917-2.103-1.898 2.104h-2.321Z"></path><path fill="#FFF" d="M22.71 4.04h3.614l1.269 2.881V4.04h4.46l.77 2.159.771-2.159H37v8.421H19l3.71-8.421Z"></path><path fill="#006FCF" d="m23.395 4.955-2.916 6.566h2l.55-1.315h2.98l.55 1.315h2.05l-2.904-6.566h-2.31Zm.25 3.777.875-2.09.873 2.09h-1.748Z"></path><path fill="#006FCF" d="M28.581 11.52V4.953l2.811.01L32.84 9l1.456-4.046H37v6.565l-1.74.016v-4.51l-1.644 4.494h-1.59L30.35 7.01v4.51h-1.768Z"></path></svg>
                  <svg className="icon icon--full-color" version="1.1" xmlns="http://www.w3.org/2000/svg" role="img" x="0" y="0" width="38" height="24" viewBox="0 0 165.521 105.965" xmlSpace="preserve" aria-labelledby="pi-apple_pay"><title id="pi-apple_pay">Apple Pay</title><path fill="#000" d="M150.698 0H14.823c-.566 0-1.133 0-1.698.003-.477.004-.953.009-1.43.022-1.039.028-2.087.09-3.113.274a10.51 10.51 0 0 0-2.958.975 9.932 9.932 0 0 0-4.35 4.35 10.463 10.463 0 0 0-.975 2.96C.113 9.611.052 10.658.024 11.696a70.22 70.22 0 0 0-.022 1.43C0 13.69 0 14.256 0 14.823v76.318c0 .567 0 1.132.002 1.699.003.476.009.953.022 1.43.028 1.036.09 2.084.275 3.11a10.46 10.46 0 0 0 .974 2.96 9.897 9.897 0 0 0 1.83 2.52 9.874 9.874 0 0 0 2.52 1.83c.947.483 1.917.79 2.96.977 1.025.183 2.073.245 3.112.273.477.011.953.017 1.43.02.565.004 1.132.004 1.698.004h135.875c.565 0 1.132 0 1.697-.004.476-.002.952-.009 1.431-.02 1.037-.028 2.085-.09 3.113-.273a10.478 10.478 0 0 0 2.958-.977 9.955 9.955 0 0 0 4.35-4.35c.483-.947.789-1.917.974-2.96.186-1.026.246-2.074.274-3.11.013-.477.02-.954.022-1.43.004-.567.004-1.132.004-1.699V14.824c0-.567 0-1.133-.004-1.699a63.067 63.067 0 0 0-.022-1.429c-.028-1.038-.088-2.085-.274-3.112a10.4 10.4 0 0 0-.974-2.96 9.94 9.94 0 0 0-4.35-4.35A10.52 10.52 0 0 0 156.939.3c-1.028-.185-2.076-.246-3.113-.274a71.417 71.417 0 0 0-1.431-.022C151.83 0 151.263 0 150.698 0z"></path><path fill="#FFF" d="M150.698 3.532l1.672.003c.452.003.905.008 1.36.02.793.022 1.719.065 2.583.22.75.135 1.38.34 1.984.648a6.392 6.392 0 0 1 2.804 2.807c.306.6.51 1.226.645 1.983.154.854.197 1.783.218 2.58.013.45.019.9.02 1.36.005.557.005 1.113.005 1.671v76.318c0 .558 0 1.114-.004 1.682-.002.45-.008.9-.02 1.35-.022.796-.065 1.725-.221 2.589a6.855 6.855 0 0 1-.645 1.975 6.397 6.397 0 0 1-2.808 2.807c-.6.306-1.228.511-1.971.645-.881.157-1.847.2-2.574.22-.457.01-.912.017-1.379.019-.555.004-1.113.004-1.669.004H14.801c-.55 0-1.1 0-1.66-.004a74.993 74.993 0 0 1-1.35-.018c-.744-.02-1.71-.064-2.584-.22a6.938 6.938 0 0 1-1.986-.65 6.337 6.337 0 0 1-1.622-1.18 6.355 6.355 0 0 1-1.178-1.623 6.935 6.935 0 0 1-.646-1.985c-.156-.863-.2-1.788-.22-2.578a66.088 66.088 0 0 1-.02-1.355l-.003-1.327V14.474l.002-1.325a66.7 66.7 0 0 1 .02-1.357c.022-.792.065-1.717.222-2.587a6.924 6.924 0 0 1 .646-1.981c.304-.598.7-1.144 1.18-1.623a6.386 6.386 0 0 1 1.624-1.18 6.96 6.96 0 0 1 1.98-.646c.865-.155 1.792-.198 2.586-.22.452-.012.905-.017 1.354-.02l1.677-.003h135.875"></path><g><g><path fill="#000" d="M43.508 35.77c1.404-1.755 2.356-4.112 2.105-6.52-2.054.102-4.56 1.355-6.012 3.112-1.303 1.504-2.456 3.959-2.156 6.266 2.306.2 4.61-1.152 6.063-2.858"></path><path fill="#000" d="M45.587 39.079c-3.35-.2-6.196 1.9-7.795 1.9-1.6 0-4.049-1.8-6.698-1.751-3.447.05-6.645 2-8.395 5.1-3.598 6.2-.95 15.4 2.55 20.45 1.699 2.5 3.747 5.25 6.445 5.151 2.55-.1 3.549-1.65 6.647-1.65 3.097 0 3.997 1.65 6.696 1.6 2.798-.05 4.548-2.5 6.247-5 1.95-2.85 2.747-5.6 2.797-5.75-.05-.05-5.396-2.101-5.446-8.251-.05-5.15 4.198-7.6 4.398-7.751-2.399-3.548-6.147-3.948-7.447-4.048"></path></g><g><path fill="#000" d="M78.973 32.11c7.278 0 12.347 5.017 12.347 12.321 0 7.33-5.173 12.373-12.529 12.373h-8.058V69.62h-5.822V32.11h14.062zm-8.24 19.807h6.68c5.07 0 7.954-2.729 7.954-7.46 0-4.73-2.885-7.434-7.928-7.434h-6.706v14.894z"></path><path fill="#000" d="M92.764 61.847c0-4.809 3.665-7.564 10.423-7.98l7.252-.442v-2.08c0-3.04-2.001-4.704-5.562-4.704-2.938 0-5.07 1.507-5.51 3.82h-5.252c.157-4.86 4.731-8.395 10.918-8.395 6.654 0 10.995 3.483 10.995 8.89v18.663h-5.38v-4.497h-.13c-1.534 2.937-4.914 4.782-8.579 4.782-5.406 0-9.175-3.222-9.175-8.057zm17.675-2.417v-2.106l-6.472.416c-3.64.234-5.536 1.585-5.536 3.95 0 2.288 1.975 3.77 5.068 3.77 3.95 0 6.94-2.522 6.94-6.03z"></path><path fill="#000" d="M120.975 79.652v-4.496c.364.051 1.247.103 1.715.103 2.573 0 4.029-1.09 4.913-3.899l.52-1.663-9.852-27.293h6.082l6.863 22.146h.13l6.862-22.146h5.927l-10.216 28.67c-2.34 6.577-5.017 8.735-10.683 8.735-.442 0-1.872-.052-2.261-.157z"></path></g></g></svg>
                  <svg className="icon icon--full-color" xmlns="http://www.w3.org/2000/svg" aria-labelledby="pi-bancontact" role="img" viewBox="0 0 38 24" width="38" height="24"><title id="pi-bancontact">Bancontact</title><path fill="#000" opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path><path d="M4.703 3.077h28.594c.139 0 .276.023.405.068.128.045.244.11.343.194a.9.9 0 0 1 .229.29c.053.107.08.223.08.34V20.03a.829.829 0 0 1-.31.631 1.164 1.164 0 0 1-.747.262H4.703a1.23 1.23 0 0 1-.405-.068 1.09 1.09 0 0 1-.343-.194.9.9 0 0 1-.229-.29.773.773 0 0 1-.08-.34V3.97c0-.118.027-.234.08-.342a.899.899 0 0 1 .23-.29c.098-.082.214-.148.342-.193a1.23 1.23 0 0 1 .405-.068Z" fill="#fff"></path><path d="M6.38 18.562v-3.077h1.125c.818 0 1.344.259 1.344.795 0 .304-.167.515-.401.638.338.132.536.387.536.734 0 .62-.536.91-1.37.91H6.38Zm.724-1.798h.537c.328 0 .468-.136.468-.387 0-.268-.255-.356-.599-.356h-.406v.743Zm0 1.262h.448c.438 0 .693-.093.693-.383 0-.286-.219-.404-.63-.404h-.51v.787Zm3.284.589c-.713 0-1.073-.295-1.073-.69 0-.436.422-.69 1.047-.695.156.002.31.014.464.035v-.105c0-.269-.183-.396-.531-.396a2.128 2.128 0 0 0-.688.105l-.13-.474a3.01 3.01 0 0 1 .9-.132c.767 0 1.147.343 1.147.936v1.222c-.214.093-.615.194-1.136.194Zm.438-.497v-.47a2.06 2.06 0 0 0-.37-.036c-.24 0-.427.08-.427.286 0 .185.156.281.432.281a.947.947 0 0 0 .365-.061Zm1.204.444v-2.106a3.699 3.699 0 0 1 1.177-.193c.76 0 1.198.316 1.198.9v1.399h-.719v-1.354c0-.303-.167-.444-.484-.444a1.267 1.267 0 0 0-.459.079v1.719h-.713Zm4.886-2.167-.135.479a1.834 1.834 0 0 0-.588-.11c-.422 0-.652.25-.652.664 0 .453.24.685.688.685.2-.004.397-.043.578-.114l.115.488a2.035 2.035 0 0 1-.75.128c-.865 0-1.365-.453-1.365-1.17 0-.712.495-1.182 1.323-1.182.27-.001.538.043.787.132Zm1.553 2.22c-.802 0-1.302-.47-1.302-1.178 0-.704.5-1.174 1.302-1.174.807 0 1.297.47 1.297 1.173 0 .708-.49 1.179-1.297 1.179Zm0-.502c.37 0 .563-.259.563-.677 0-.413-.193-.672-.563-.672-.364 0-.568.26-.568.672 0 .418.204.677.568.677Zm1.713.449v-2.106a3.699 3.699 0 0 1 1.177-.193c.76 0 1.198.316 1.198.9v1.399h-.719v-1.354c0-.303-.166-.444-.484-.444a1.268 1.268 0 0 0-.459.079v1.719h-.713Zm3.996.053c-.62 0-.938-.286-.938-.866v-.95h-.354v-.484h.355v-.488l.718-.03v.518h.578v.484h-.578v.94c0 .256.125.374.36.374.093 0 .185-.008.276-.026l.036.488c-.149.028-.3.041-.453.04Zm1.814 0c-.713 0-1.073-.295-1.073-.69 0-.436.422-.69 1.047-.695.155.002.31.014.464.035v-.105c0-.269-.183-.396-.532-.396a2.128 2.128 0 0 0-.687.105l-.13-.474a3.01 3.01 0 0 1 .9-.132c.766 0 1.146.343 1.146.936v1.222c-.213.093-.614.194-1.135.194Zm.438-.497v-.47a2.06 2.06 0 0 0-.37-.036c-.24 0-.427.08-.427.286 0 .185.156.281.432.281a.946.946 0 0 0 .365-.061Zm3.157-1.723-.136.479a1.834 1.834 0 0 0-.588-.11c-.422 0-.651.25-.651.664 0 .453.24.685.687.685.2-.004.397-.043.578-.114l.115.488a2.035 2.035 0 0 1-.75.128c-.865 0-1.365-.453-1.365-1.17 0-.712.495-1.182 1.323-1.182.27-.001.538.043.787.132Zm1.58 2.22c-.62 0-.938-.286-.938-.866v-.95h-.354v-.484h.354v-.488l.72-.03v.518h.577v.484h-.578v.94c0 .256.125.374.36.374.092 0 .185-.008.276-.026l.036.488c-.149.028-.3.041-.453.04Z" fill="#1E3764"></path><path d="M11.394 13.946c3.803 0 5.705-2.14 7.606-4.28H6.38v4.28h5.014Z" fill="url(#pi-bancontact-a)"></path><path d="M26.607 5.385c-3.804 0-5.705 2.14-7.607 4.28h12.62v-4.28h-5.013Z" fill="url(#pi-bancontact-b)"></path><defs><linearGradient id="pi-bancontact-a" x1="8.933" y1="12.003" x2="17.734" y2="8.13" gradientUnits="userSpaceOnUse"><stop stopColor="#005AB9"></stop><stop offset="1" stopColor="#1E3764"></stop></linearGradient><linearGradient id="pi-bancontact-b" x1="19.764" y1="10.037" x2="29.171" y2="6.235" gradientUnits="userSpaceOnUse"><stop stopColor="#FBA900"></stop><stop offset="1" stopColor="#FFD800"></stop></linearGradient></defs></svg>
                  <svg className="icon icon--full-color" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" width="38" height="24" aria-labelledby="pi-diners_club"><title id="pi-diners_club">Diners Club</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path><path d="M12 12v3.7c0 .3-.2.3-.5.2-1.9-.8-3-3.3-2.3-5.4.4-1.1 1.2-2 2.3-2.4.4-.2.5-.1.5.2V12zm2 0V8.3c0-.3 0-.3.3-.2 2.1.8 3.2 3.3 2.4 5.4-.4 1.1-1.2 2-2.3 2.4-.4.2-.4.1-.4-.2V12zm7.2-7H13c3.8 0 6.8 3.1 6.8 7s-3 7-6.8 7h8.2c3.8 0 6.8-3.1 6.8-7s-3-7-6.8-7z" fill="#3086C8"></path></svg>
                  <svg className="icon icon--full-color" viewBox="0 0 38 24" width="38" height="24" role="img" aria-labelledby="pi-discover" fill="none" xmlns="http://www.w3.org/2000/svg"><title id="pi-discover">Discover</title><path fill="#000" opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path><path d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32z" fill="#fff"></path><path d="M3.57 7.16H2v5.5h1.57c.83 0 1.43-.2 1.96-.63.63-.52 1-1.3 1-2.11-.01-1.63-1.22-2.76-2.96-2.76zm1.26 4.14c-.34.3-.77.44-1.47.44h-.29V8.1h.29c.69 0 1.11.12 1.47.44.37.33.59.84.59 1.37 0 .53-.22 1.06-.59 1.39zm2.19-4.14h1.07v5.5H7.02v-5.5zm3.69 2.11c-.64-.24-.83-.4-.83-.69 0-.35.34-.61.8-.61.32 0 .59.13.86.45l.56-.73c-.46-.4-1.01-.61-1.62-.61-.97 0-1.72.68-1.72 1.58 0 .76.35 1.15 1.35 1.51.42.15.63.25.74.31.21.14.32.34.32.57 0 .45-.35.78-.83.78-.51 0-.92-.26-1.17-.73l-.69.67c.49.73 1.09 1.05 1.9 1.05 1.11 0 1.9-.74 1.9-1.81.02-.89-.35-1.29-1.57-1.74zm1.92.65c0 1.62 1.27 2.87 2.9 2.87.46 0 .86-.09 1.34-.32v-1.26c-.43.43-.81.6-1.29.6-1.08 0-1.85-.78-1.85-1.9 0-1.06.79-1.89 1.8-1.89.51 0 .9.18 1.34.62V7.38c-.47-.24-.86-.34-1.32-.34-1.61 0-2.92 1.28-2.92 2.88zm12.76.94l-1.47-3.7h-1.17l2.33 5.64h.58l2.37-5.64h-1.16l-1.48 3.7zm3.13 1.8h3.04v-.93h-1.97v-1.48h1.9v-.93h-1.9V8.1h1.97v-.94h-3.04v5.5zm7.29-3.87c0-1.03-.71-1.62-1.95-1.62h-1.59v5.5h1.07v-2.21h.14l1.48 2.21h1.32l-1.73-2.32c.81-.17 1.26-.72 1.26-1.56zm-2.16.91h-.31V8.03h.33c.67 0 1.03.28 1.03.82 0 .55-.36.85-1.05.85z" fill="#231F20"></path><path d="M20.16 12.86a2.931 2.931 0 100-5.862 2.931 2.931 0 000 5.862z" fill="url(#pi-paint0_linear)"></path><path opacity=".65" d="M20.16 12.86a2.931 2.931 0 100-5.862 2.931 2.931 0 000 5.862z" fill="url(#pi-paint1_linear)"></path><path d="M36.57 7.506c0-.1-.07-.15-.18-.15h-.16v.48h.12v-.19l.14.19h.14l-.16-.2c.06-.01.1-.06.1-.13zm-.2.07h-.02v-.13h.02c.06 0 .09.02.09.06 0 .05-.03.07-.09.07z" fill="#231F20"></path><path d="M36.41 7.176c-.23 0-.42.19-.42.42 0 .23.19.42.42.42.23 0 .42-.19.42-.42 0-.23-.19-.42-.42-.42zm0 .77c-.18 0-.34-.15-.34-.35 0-.19.15-.35.34-.35.18 0 .33.16.33.35 0 .19-.15.35-.33.35z" fill="#231F20"></path><path d="M37 12.984S27.09 19.873 8.976 23h26.023a2 2 0 002-1.984l.024-3.02L37 12.985z" fill="#F48120"></path><defs><linearGradient id="pi-paint0_linear" x1="21.657" y1="12.275" x2="19.632" y2="9.104" gradientUnits="userSpaceOnUse"><stop stopColor="#F89F20"></stop><stop offset=".25" stopColor="#F79A20"></stop><stop offset=".533" stopColor="#F68D20"></stop><stop offset=".62" stopColor="#F58720"></stop><stop offset=".723" stopColor="#F48120"></stop><stop offset="1" stopColor="#F37521"></stop></linearGradient><linearGradient id="pi-paint1_linear" x1="21.338" y1="12.232" x2="18.378" y2="6.446" gradientUnits="userSpaceOnUse"><stop stopColor="#F58720"></stop><stop offset=".359" stopColor="#E16F27"></stop><stop offset=".703" stopColor="#D4602C"></stop><stop offset=".982" stopColor="#D05B2E"></stop></linearGradient></defs></svg>
                  <svg className="icon icon--full-color" xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 38 24" width="38" height="24" aria-labelledby="pi-google_pay"><title id="pi-google_pay">Google Pay</title><path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z" fill="#000" opacity=".07"></path><path d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32" fill="#FFF"></path><path d="M18.093 11.976v3.2h-1.018v-7.9h2.691a2.447 2.447 0 0 1 1.747.692 2.28 2.28 0 0 1 .11 3.224l-.11.116c-.47.447-1.098.69-1.747.674l-1.673-.006zm0-3.732v2.788h1.698c.377.012.741-.135 1.005-.404a1.391 1.391 0 0 0-1.005-2.354l-1.698-.03zm6.484 1.348c.65-.03 1.286.188 1.778.613.445.43.682 1.03.65 1.649v3.334h-.969v-.766h-.049a1.93 1.93 0 0 1-1.673.931 2.17 2.17 0 0 1-1.496-.533 1.667 1.667 0 0 1-.613-1.324 1.606 1.606 0 0 1 .613-1.336 2.746 2.746 0 0 1 1.698-.515c.517-.02 1.03.093 1.49.331v-.208a1.134 1.134 0 0 0-.417-.901 1.416 1.416 0 0 0-.98-.368 1.545 1.545 0 0 0-1.319.717l-.895-.564a2.488 2.488 0 0 1 2.182-1.06zM23.29 13.52a.79.79 0 0 0 .337.662c.223.176.5.269.785.263.429-.001.84-.17 1.146-.472.305-.286.478-.685.478-1.103a2.047 2.047 0 0 0-1.324-.374 1.716 1.716 0 0 0-1.03.294.883.883 0 0 0-.392.73zm9.286-3.75l-3.39 7.79h-1.048l1.281-2.728-2.224-5.062h1.103l1.612 3.885 1.569-3.885h1.097z" fill="#5F6368"></path><path d="M13.986 11.284c0-.308-.024-.616-.073-.92h-4.29v1.747h2.451a2.096 2.096 0 0 1-.9 1.373v1.134h1.464a4.433 4.433 0 0 0 1.348-3.334z" fill="#4285F4"></path><path d="M9.629 15.721a4.352 4.352 0 0 0 3.01-1.097l-1.466-1.14a2.752 2.752 0 0 1-4.094-1.44H5.577v1.17a4.53 4.53 0 0 0 4.052 2.507z" fill="#34A853"></path><path d="M7.079 12.05a2.709 2.709 0 0 1 0-1.735v-1.17H5.577a4.505 4.505 0 0 0 0 4.075l1.502-1.17z" fill="#FBBC04"></path><path d="M9.629 8.44a2.452 2.452 0 0 1 1.74.68l1.3-1.293a4.37 4.37 0 0 0-3.065-1.183 4.53 4.53 0 0 0-4.027 2.5l1.502 1.171a2.715 2.715 0 0 1 2.55-1.875z" fill="#EA4335"></path></svg>
                  <svg className="icon icon--full-color" xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 38 24" width="38" height="24" aria-labelledby="pi-ideal"><title id="pi-ideal">iDEAL</title><g clipPath="url(#pi-clip0_19918_2)"><path fill="#000" opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3V21C0 22.7 1.4 24 3 24H35C36.7 24 38 22.7 38 21V3C38 1.3 36.6 0 35 0Z"></path><path fill="#fff" d="M35 1C36.1 1 37 1.9 37 3V21C37 22.1 36.1 23 35 23H3C1.9 23 1 22.1 1 21V3C1 1.9 1.9 1 3 1H35Z"></path><g clipPath="url(#pi-clip1_19918_2)"><path d="M11.5286 5.35759V18.694H19.6782C25.0542 18.694 27.3855 15.8216 27.3855 12.0125C27.3855 8.21854 25.0542 5.35742 19.6782 5.35742L11.5286 5.35759Z" fill="white"></path><path d="M19.7305 5.06445C26.8437 5.06445 27.9055 9.4164 27.9055 12.0098C27.9055 16.5096 25.0025 18.9876 19.7305 18.9876H11.0118V5.06462L19.7305 5.06445ZM11.6983 5.71921V18.3329H19.7305C24.5809 18.3329 27.2195 16.1772 27.2195 12.0098C27.2195 7.72736 24.3592 5.71921 19.7305 5.71921H11.6983Z" fill="black"></path><path d="M12.7759 17.3045H15.3474V12.9372H12.7757M15.6593 10.7375C15.6593 11.5796 14.944 12.2625 14.0613 12.2625C13.179 12.2625 12.4633 11.5796 12.4633 10.7375C12.4633 10.3332 12.6316 9.94537 12.9313 9.65945C13.231 9.37352 13.6374 9.21289 14.0613 9.21289C14.4851 9.21289 14.8915 9.37352 15.1912 9.65945C15.4909 9.94537 15.6593 10.3332 15.6593 10.7375Z" fill="black"></path><path d="M20.7043 11.4505V12.1573H18.8719V9.32029H20.6452V10.0266H19.6127V10.3556H20.5892V11.0616H19.6127V11.4503L20.7043 11.4505ZM21.06 12.158L21.9569 9.31944H23.0109L23.9075 12.158H23.1362L22.9683 11.6089H21.9995L21.8308 12.158H21.06ZM22.216 10.9028H22.7518L22.5067 10.1007H22.4623L22.216 10.9028ZM24.2797 9.31944H25.0205V11.4505H26.1178C25.8168 7.58344 22.6283 6.74805 19.7312 6.74805H16.6418V9.32063H17.0989C17.9328 9.32063 18.4505 9.86014 18.4505 10.7275C18.4505 11.6228 17.9449 12.157 17.0989 12.157H16.6422V17.3052H19.7308C24.4416 17.3052 26.081 15.218 26.1389 12.1572H24.2797V9.31944ZM16.6415 10.0273V11.4505H17.0992C17.4165 11.4505 17.7094 11.3631 17.7094 10.7278C17.7094 10.1067 17.3834 10.0271 17.0992 10.0271L16.6415 10.0273Z" fill="#CC0066"></path></g></g><defs><clipPath id="pi-clip0_19918_2"><rect width="38" height="24" fill="white"></rect></clipPath><clipPath id="pi-clip1_19918_2"><rect width="17" height="14" fill="white" transform="translate(11 5)"></rect></clipPath></defs></svg>
                  <svg className="icon icon--full-color" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" width="38" height="24" aria-labelledby="pi-master"><title id="pi-master">Mastercard</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path><circle fill="#EB001B" cx="15" cy="12" r="7"></circle><circle fill="#F79E1B" cx="23" cy="12" r="7"></circle><path fill="#FF5F00" d="M22 12c0-2.4-1.2-4.5-3-5.7-1.8 1.3-3 3.4-3 5.7s1.2 4.5 3 5.7c1.8-1.2 3-3.3 3-5.7z"></path></svg>
                  <svg className="icon icon--full-color" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" width="38" height="24" role="img" aria-labelledby="pi-paypal"><title id="pi-paypal">PayPal</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path><path fill="#003087" d="M23.9 8.3c.2-1 0-1.7-.6-2.3-.6-.7-1.7-1-3.1-1h-4.1c-.3 0-.5.2-.6.5L14 15.6c0 .2.1.4.3.4H17l.4-3.4 1.8-2.2 4.7-2.1z"></path><path fill="#3086C8" d="M23.9 8.3l-.2.2c-.5 2.8-2.2 3.8-4.6 3.8H18c-.3 0-.5.2-.6.5l-.6 3.9-.2 1c0 .2.1.4.3.4H19c.3 0 .5-.2.5-.4v-.1l.4-2.4v-.1c0-.2.3-.4.5-.4h.3c2.1 0 3.7-.8 4.1-3.2.2-1 .1-1.8-.4-2.4-.1-.5-.3-.7-.5-.8z"></path><path fill="#012169" d="M23.3 8.1c-.1-.1-.2-.1-.3-.1-.1 0-.2 0-.3-.1-.3-.1-.7-.1-1.1-.1h-3c-.1 0-.2 0-.2.1-.2.1-.3.2-.3.4l-.7 4.4v.1c0-.3.3-.5.6-.5h1.3c2.5 0 4.1-1 4.6-3.8v-.2c-.1-.1-.3-.2-.5-.2h-.1z"></path></svg>
                  <svg className="icon icon--full-color" xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 38 24" width="38" height="24" aria-labelledby="pi-shopify_pay"><title id="pi-shopify_pay">Shop Pay</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z" fill="#000"></path><path d="M35.889 0C37.05 0 38 .982 38 2.182v19.636c0 1.2-.95 2.182-2.111 2.182H2.11C.95 24 0 23.018 0 21.818V2.182C0 .982.95 0 2.111 0H35.89z" fill="#5A31F4"></path><path d="M9.35 11.368c-1.017-.223-1.47-.31-1.47-.705 0-.372.306-.558.92-.558.54 0 .934.238 1.225.704a.079.079 0 00.104.03l1.146-.584a.082.082 0 00.032-.114c-.475-.831-1.353-1.286-2.51-1.286-1.52 0-2.464.755-2.464 1.956 0 1.275 1.15 1.597 2.17 1.82 1.02.222 1.474.31 1.474.705 0 .396-.332.582-.993.582-.612 0-1.065-.282-1.34-.83a.08.08 0 00-.107-.035l-1.143.57a.083.083 0 00-.036.111c.454.92 1.384 1.437 2.627 1.437 1.583 0 2.539-.742 2.539-1.98s-1.155-1.598-2.173-1.82v-.003zM15.49 8.855c-.65 0-1.224.232-1.636.646a.04.04 0 01-.069-.03v-2.64a.08.08 0 00-.08-.081H12.27a.08.08 0 00-.08.082v8.194a.08.08 0 00.08.082h1.433a.08.08 0 00.081-.082v-3.594c0-.695.528-1.227 1.239-1.227.71 0 1.226.521 1.226 1.227v3.594a.08.08 0 00.081.082h1.433a.08.08 0 00.081-.082v-3.594c0-1.51-.981-2.577-2.355-2.577zM20.753 8.62c-.778 0-1.507.24-2.03.588a.082.082 0 00-.027.109l.632 1.088a.08.08 0 00.11.03 2.5 2.5 0 011.318-.366c1.25 0 2.17.891 2.17 2.068 0 1.003-.736 1.745-1.669 1.745-.76 0-1.288-.446-1.288-1.077 0-.361.152-.657.548-.866a.08.08 0 00.032-.113l-.596-1.018a.08.08 0 00-.098-.035c-.799.299-1.359 1.018-1.359 1.984 0 1.46 1.152 2.55 2.76 2.55 1.877 0 3.227-1.313 3.227-3.195 0-2.018-1.57-3.492-3.73-3.492zM28.675 8.843c-.724 0-1.373.27-1.845.746-.026.027-.069.007-.069-.029v-.572a.08.08 0 00-.08-.082h-1.397a.08.08 0 00-.08.082v8.182a.08.08 0 00.08.081h1.433a.08.08 0 00.081-.081v-2.683c0-.036.043-.054.069-.03a2.6 2.6 0 001.808.7c1.682 0 2.993-1.373 2.993-3.157s-1.313-3.157-2.993-3.157zm-.271 4.929c-.956 0-1.681-.768-1.681-1.783s.723-1.783 1.681-1.783c.958 0 1.68.755 1.68 1.783 0 1.027-.713 1.783-1.681 1.783h.001z" fill="#fff"></path></svg>
                  <svg className="icon icon--full-color" viewBox="0 0 38 24" width="38" height="24" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="pi-venmo"><title id="pi-venmo">Venmo</title><g fill="none" fillRule="evenodd"><rect fillOpacity=".07" fill="#000" width="38" height="24" rx="3"></rect><path fill="#3D95CE" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path><path d="M24.675 8.36c0 3.064-2.557 7.045-4.633 9.84h-4.74L13.4 6.57l4.151-.402 1.005 8.275c.94-1.566 2.099-4.025 2.099-5.702 0-.918-.154-1.543-.394-2.058l3.78-.783c.437.738.634 1.499.634 2.46z" fill="#FFF" fillRule="nonzero"></path></g></svg>
                  <svg className="icon icon--full-color" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" width="38" height="24" aria-labelledby="pi-visa"><title id="pi-visa">Visa</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path><path d="M28.3 10.1H28c-.4 1-.7 1.5-1 3h1.9c-.3-1.5-.3-2.2-.6-3zm2.9 5.9h-1.7c-.1 0-.1 0-.2-.1l-.2-.9-.1-.2h-2.4c-.1 0-.2 0-.2.2l-.3.9c0 .1-.1.1-.1.1h-2.1l.2-.5L27 8.7c0-.5.3-.7.8-.7h1.5c.1 0 .2 0 .2.2l1.4 6.5c.1.4.2.7.2 1.1.1.1.1.1.1.2zm-13.4-.3l.4-1.8c.1 0 .2.1.2.1.7.3 1.4.5 2.1.4.2 0 .5-.1.7-.2.5-.2.5-.7.1-1.1-.2-.2-.5-.3-.8-.5-.4-.2-.8-.4-1.1-.7-1.2-1-.8-2.4-.1-3.1.6-.4.9-.8 1.7-.8 1.2 0 2.5 0 3.1.2h.1c-.1.6-.2 1.1-.4 1.7-.5-.2-1-.4-1.5-.4-.3 0-.6 0-.9.1-.2 0-.3.1-.4.2-.2.2-.2.5 0 .7l.5.4c.4.2.8.4 1.1.6.5.3 1 .8 1.1 1.4.2.9-.1 1.7-.9 2.3-.5.4-.7.6-1.4.6-1.4 0-2.5.1-3.4-.2-.1.2-.1.2-.2.1zm-3.5.3c.1-.7.1-.7.2-1 .5-2.2 1-4.5 1.4-6.7.1-.2.1-.3.3-.3H18c-.2 1.2-.4 2.1-.7 3.2-.3 1.5-.6 3-1 4.5 0 .2-.1.2-.3.2M5 8.2c0-.1.2-.2.3-.2h3.4c.5 0 .9.3 1 .8l.9 4.4c0 .1 0 .1.1.2 0-.1.1-.1.1-.1l2.1-5.1c-.1-.1 0-.2.1-.2h2.1c0 .1 0 .1-.1.2l-3.1 7.3c-.1.2-.1.3-.2.4-.1.1-.3 0-.5 0H9.7c-.1 0-.2 0-.2-.2L7.9 9.5c-.2-.2-.5-.5-.9-.6-.6-.3-1.7-.5-1.9-.5L5 8.2z" fill="#142688"></path></svg>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={handleCheckout}
                  className="btn btn-primary" 
                  style={{ width: "100%", textAlign: "center" }}
                  disabled={!checkoutUrl}
                >
                  Proceed to checkout
                </button>
              </aside>
              <div className="box-protection">
                <div className="box-flex">
                  <svg width="81" height="96" viewBox="0 0 81 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M78.4267 21.0608C78.4247 20.6381 78.116 20.2763 77.6992 20.2075C72.438 19.3424 65.1753 17.5474 57.2578 13.5877C49.9951 9.95633 44.5569 5.69386 40.8135 2.25518C40.4812 1.94847 39.9701 1.94847 39.6378 2.25518C35.8944 5.69386 30.4562 9.95633 23.1934 13.5877C15.276 17.5474 8.01329 19.3424 2.75205 20.2075C2.33327 20.2763 2.02656 20.6361 2.0246 21.0608C1.97151 32.0905 3.19639 43.7907 6.27528 54.3486C8.81153 63.0426 13.1271 71.2215 18.9133 78.1893C28.7653 90.0527 40.2256 93.9907 40.2256 93.9907C40.2256 93.9907 51.686 90.0507 61.538 78.1893C67.3242 71.2215 71.6398 63.0426 74.176 54.3486C77.2549 43.7907 78.4817 32.0905 78.4267 21.0608Z" fill="#F36621"></path>
                    <path opacity="0.25" d="M40.2256 2.0271V93.9907C40.2256 93.9907 28.7653 90.0507 18.9133 78.1893C13.1271 71.2215 8.81153 63.0426 6.27528 54.3486C3.19639 43.7907 1.97151 32.0905 2.0246 21.0608C2.02656 20.6381 2.33524 20.2763 2.75205 20.2075C8.01329 19.3424 15.276 17.5474 23.1934 13.5877C30.4562 9.95632 35.8944 5.69385 39.6378 2.25517C39.8049 2.10378 40.0153 2.0271 40.2256 2.0271Z" fill="url(#paint0_linear_2107_1531)"></path>
                    <path d="M79.683 21.0549C79.6771 20.0148 78.93 19.1379 77.9037 18.9708C70.9084 17.8207 64.1509 15.6324 57.8201 12.467C51.9435 9.52968 46.5093 5.78232 41.6629 1.33307C40.843 0.580058 39.6083 0.580058 38.7884 1.33307C33.944 5.78429 28.5078 9.52968 22.6312 12.467C16.3004 15.6324 9.54293 17.8207 2.5476 18.9708C1.5213 19.1399 0.774187 20.0168 0.768289 21.0549C0.709306 33.2171 2.19763 44.8504 5.07008 54.7005C7.65352 63.5577 12.1067 71.9588 17.9479 78.9915C23.1482 85.2554 28.7948 89.3134 32.6149 91.6137C35.509 93.3577 37.7995 94.3781 38.9693 94.8538L39.7911 95.1586C40.0703 95.2628 40.377 95.2628 40.6562 95.1586L41.4781 94.8538C42.6479 94.3781 44.9384 93.3577 47.8324 91.6137C51.6525 89.3114 57.2991 85.2534 62.5014 78.9915C68.3426 71.9568 72.7958 63.5577 75.3792 54.7005C78.2537 44.8504 79.742 33.2151 79.683 21.0549ZM72.9708 53.9966C70.4817 62.5275 66.1957 70.6159 60.5707 77.3871C55.6181 83.3522 50.2429 87.2235 46.6076 89.4215C44.0379 90.9748 41.9499 91.9342 40.7958 92.4179C40.4301 92.5712 40.0192 92.5712 39.6535 92.4179C36.726 91.1871 27.7508 86.8676 19.8767 77.3871C14.2537 70.6159 9.96563 62.5275 7.47657 53.9966C4.7673 44.7049 3.3183 33.7656 3.27505 22.2876C3.27308 21.7745 3.63681 21.3321 4.14209 21.2397C10.9624 20.003 17.5528 17.8089 23.7499 14.7103C29.5321 11.8182 34.9035 8.17111 39.7302 3.86145C40.0094 3.61176 40.4341 3.61176 40.7132 3.86145C45.538 8.17308 50.9094 11.8202 56.6936 14.7103C62.9221 17.8246 69.5498 20.0266 76.4075 21.2593C76.8499 21.338 77.1704 21.7253 77.1684 22.1736C77.1389 33.6929 75.6899 44.6734 72.9708 53.9966Z" fill="url(#paint1_linear_2107_1531)"></path>
                    <path d="M80.45 21.0509C80.4421 19.6353 79.4237 18.4419 78.0277 18.2138C71.1091 17.0754 64.4244 14.9128 58.1624 11.7808C52.3507 8.87491 46.9734 5.16884 42.1821 0.766773C41.6434 0.273286 40.9493 0 40.2258 0C39.5023 0 38.8083 0.273286 38.2696 0.766773C33.4782 5.16884 28.101 8.87294 22.2892 11.7808C16.0272 14.9108 9.34255 17.0754 2.42389 18.2138C1.02797 18.4438 0.00954109 19.6373 0.00167675 21.0509C-0.0573058 33.2839 1.44085 44.9939 4.33296 54.9147C6.94589 63.8722 11.4482 72.3677 17.3563 79.481C22.6254 85.8275 28.3467 89.9386 32.218 92.2703C35.1828 94.0555 37.5382 95.0995 38.6805 95.5635L38.6923 95.5675L39.5259 95.8761C39.75 95.9587 39.986 96 40.2239 96C40.4637 96 40.6977 95.9587 40.9218 95.8742L41.7594 95.5635L41.7712 95.5596C42.9135 95.0956 45.2649 94.0536 48.2278 92.2684C52.099 89.9366 57.8203 85.8235 63.0894 79.479C68.9975 72.3657 73.5018 63.8702 76.1128 54.9128C79.0108 44.9958 80.5089 33.2858 80.45 21.0509ZM39.8247 92.0187C37.2197 90.9236 28.1029 86.6119 20.213 77.1099C14.6274 70.3839 10.3688 62.3485 7.89748 53.8747C5.20394 44.638 3.7569 33.7164 3.71365 22.2856C3.71168 21.9808 3.92795 21.7193 4.22483 21.6663C11.0845 20.4217 17.72 18.2118 23.9486 15.0976C29.7603 12.1917 35.1691 8.51905 40.0233 4.18383C40.0784 4.13468 40.1511 4.10715 40.2258 4.10715C40.3005 4.10715 40.3733 4.13468 40.4283 4.18383C45.2806 8.51905 50.6893 12.1917 56.503 15.0976C62.765 18.2276 69.4379 20.4453 76.3349 21.6859C76.5709 21.7272 76.74 21.9317 76.74 22.1715C76.7046 33.6456 75.2575 44.6085 72.5542 53.8747C70.0828 62.3485 65.8242 70.3839 60.2386 77.1099C55.3234 83.0278 49.9914 86.8695 46.3856 89.0499C43.7766 90.6267 41.6591 91.5861 40.6308 92.0187C40.503 92.0718 40.3654 92.0993 40.2278 92.0993C40.0882 92.0993 39.9525 92.0737 39.8247 92.0187Z" fill="url(#paint2_linear_2107_1531)"></path>
                    <path d="M79.683 21.0549C79.6771 20.0168 78.93 19.1399 77.9037 18.9708C70.9084 17.8207 64.1509 15.6324 57.8201 12.467C51.9435 9.52968 46.5093 5.78429 41.6629 1.33307C40.843 0.580058 39.6083 0.580058 38.7884 1.33307C33.944 5.78429 28.5078 9.52968 22.6312 12.467C16.3004 15.6324 9.54293 17.8207 2.5476 18.9708C1.5213 19.1399 0.774187 20.0168 0.768289 21.0549C0.709306 33.2171 2.19763 44.8504 5.07008 54.7005C7.65352 63.5577 12.1067 71.9588 17.9479 78.9915C23.1482 85.2534 28.7948 89.3134 32.6169 91.6137C35.511 93.3577 37.8015 94.3781 38.9713 94.8538L39.7931 95.1586C40.0723 95.2628 40.379 95.2628 40.6582 95.1586L41.48 94.8538C42.6498 94.3781 44.9403 93.3577 47.8344 91.6137C51.6545 89.3114 57.3011 85.2534 62.5034 78.9915C68.3446 71.9568 72.7978 63.5577 75.3812 54.7005C78.2537 44.8504 79.742 33.2151 79.683 21.0549ZM72.9708 53.9966C70.4837 62.5275 66.1957 70.6159 60.5727 77.3871C55.6201 83.3522 50.2448 87.2235 46.6095 89.4215C44.0399 90.9748 41.9499 91.9342 40.7978 92.4179C40.4321 92.5712 40.0212 92.5712 39.6555 92.4179C36.728 91.1871 27.7528 86.8676 19.8786 77.3871C14.2556 70.6159 9.9676 62.5275 7.4805 53.9966C4.77124 44.7049 3.32223 33.7676 3.27898 22.2876C3.27701 21.7745 3.64074 21.3321 4.14602 21.2397C10.9664 20.003 17.5567 17.8089 23.7538 14.7103C29.536 11.8182 34.9074 8.17111 39.7341 3.86145C40.0133 3.61176 40.438 3.61176 40.7172 3.86145C45.5419 8.17111 50.9133 11.8182 56.6975 14.7103C62.9261 17.8246 69.5537 20.0266 76.4114 21.2593C76.8538 21.338 77.1743 21.7253 77.1743 22.1736C77.1389 33.6929 75.6919 44.6734 72.9708 53.9966Z" fill="url(#paint4_linear_2107_1531)"></path>
                    <path d="M71.9527 24.4541C65.9581 23.3767 60.1582 21.4499 54.716 18.7289C49.6632 16.2024 44.9623 13.0115 40.745 9.24447C40.6015 9.11668 40.4167 9.0459 40.226 9.0459C40.0353 9.0459 39.8485 9.11668 39.7069 9.24447C35.4877 13.0135 30.7888 16.2044 25.7359 18.7289C20.3213 21.4342 14.5548 23.3551 8.59167 24.4364C8.08639 24.5288 7.7207 24.9692 7.72266 25.4863C7.76002 35.5467 9.03601 45.1668 11.4091 53.3025C13.5934 60.7932 17.3585 67.8967 22.2973 73.8441C25.268 77.4204 28.7382 80.5563 32.6133 83.1653C35.7748 85.2926 38.3936 86.5135 39.6755 87.0523C39.8505 87.125 40.0372 87.1643 40.226 87.1643C40.4167 87.1643 40.6015 87.127 40.7785 87.0542C41.6927 86.6708 43.5742 85.8176 45.8883 84.4197C49.0832 82.489 53.8038 79.0877 58.1547 73.848C63.0935 67.9006 66.8586 60.7991 69.0429 53.3064C71.4238 45.1412 72.6998 35.4878 72.7293 25.388C72.7313 24.9279 72.4049 24.5347 71.9527 24.4541ZM72.0844 25.3841C72.0549 35.4249 70.7888 45.0154 68.4236 53.1235C66.2629 60.5298 62.5411 67.5526 57.6593 73.4332C53.3653 78.604 48.7077 81.9601 45.556 83.8652C43.2754 85.2435 41.4292 86.081 40.5307 86.4565C40.4344 86.4978 40.3322 86.5175 40.228 86.5175C40.1238 86.5175 40.0235 86.4978 39.9271 86.4565C37.6504 85.4991 29.6897 81.734 22.7966 73.4332C17.9149 67.5546 14.1911 60.5318 12.0323 53.1235C9.67499 45.0429 8.40883 35.4858 8.37147 25.4843C8.37147 25.2818 8.51303 25.1088 8.70964 25.0734C14.7318 23.9803 20.5573 22.0398 26.0269 19.3069C31.1309 16.7549 35.879 13.5325 40.1395 9.72617C40.165 9.70454 40.1965 9.69274 40.228 9.69274C40.2614 9.69274 40.2928 9.70454 40.3164 9.72617C44.5769 13.5325 49.325 16.7549 54.429 19.3069C59.9262 22.0555 65.7851 24.0019 71.8406 25.0911C71.9802 25.1167 72.0844 25.2386 72.0844 25.3841Z" fill="url(#paint5_linear_2107_1531)"></path>
                    <path d="M49.3349 65.7419C49.0852 65.4903 48.7392 65.3369 48.3578 65.3369C47.9724 65.3369 47.6264 65.4903 47.3806 65.736L47.3747 65.7419C47.127 65.9877 46.9756 66.3337 46.9756 66.7191C46.9756 67.1025 47.1309 67.4485 47.3806 67.6962C47.6303 67.9479 47.9763 68.1012 48.3578 68.1012C48.7392 68.1012 49.0852 67.9459 49.3349 67.6962C49.5846 67.4465 49.7399 67.1005 49.7399 66.7191C49.7399 66.3377 49.5846 65.9916 49.3349 65.7419ZM48.3578 62.4035C49.5492 62.4035 50.6286 62.8872 51.4091 63.6677C52.1897 64.4483 52.6733 65.5276 52.6733 66.7171C52.6733 67.9086 52.1897 68.9879 51.4091 69.7704C50.6286 70.551 49.5492 71.0346 48.3578 71.0346C47.1683 71.0346 46.0869 70.551 45.3064 69.7704C44.5259 68.9879 44.0422 67.9086 44.0422 66.7171C44.0422 65.5335 44.5239 64.4542 45.3064 63.6717L45.3103 63.6697L45.3123 63.6677L45.3143 63.6638C46.0987 62.8833 47.1742 62.4035 48.3578 62.4035ZM28.3391 44.5928L33.5236 44.3372L32.7234 39.5517H26.837L28.3391 44.5928ZM34.7642 51.7709L34.0073 47.2391L29.1982 47.479L30.665 52.3962L34.7642 51.7709ZM41.0361 50.8154L41.0439 46.8891L35.4799 47.1664L36.2132 51.5507L41.0361 50.8154ZM47.4809 49.8343L48.0314 46.5412L42.5067 46.8164L42.4988 50.5913L47.4809 49.8343ZM53.8923 46.2521L49.5276 46.4684L49.0046 49.6023L53.0803 48.9811L53.8923 46.2521ZM50.6836 39.5517L50.0211 43.5173L54.779 43.2814L55.8898 39.5537H50.6836V39.5517ZM42.5185 39.5517L42.5106 43.8909L48.5249 43.592L49.1992 39.5517H42.5185ZM34.2078 39.5517L34.9962 44.2625L41.0518 43.9616L41.0596 39.5498H34.2078V39.5517ZM34.1606 65.7419C33.911 65.4903 33.5649 65.3369 33.1835 65.3369C32.7982 65.3369 32.4521 65.4903 32.2064 65.736L32.2005 65.7419C31.9527 65.9877 31.8013 66.3337 31.8013 66.7191C31.8013 67.1025 31.9567 67.4485 32.2064 67.6962C32.4561 67.9479 32.8021 68.1012 33.1835 68.1012C33.5649 68.1012 33.911 67.9459 34.1606 67.6962C34.4103 67.4465 34.5657 67.1005 34.5657 66.7191C34.5657 66.3377 34.4103 65.9916 34.1606 65.7419ZM33.1815 62.4035C34.373 62.4035 35.4524 62.8872 36.2329 63.6677C37.0134 64.4483 37.4971 65.5276 37.4971 66.7171C37.4971 67.9086 37.0134 68.9879 36.2329 69.7704C35.4524 70.551 34.373 71.0346 33.1815 71.0346C31.9901 71.0346 30.9107 70.551 30.1302 69.7704C29.3496 68.9879 28.866 67.9086 28.866 66.7171C28.866 65.5335 29.3477 64.4542 30.1302 63.6717L30.1321 63.6697L30.1341 63.6677L30.138 63.6638C30.9225 62.8833 31.998 62.4035 33.1815 62.4035ZM27.8063 53.0607L23.4671 38.5018L23.4573 38.4664L22.1597 34.1116C21.4696 31.7955 19.2715 31.8486 16.0845 31.9272C15.2961 31.9469 14.4565 31.9666 13.9237 31.9666C13.1137 31.9666 12.457 31.3099 12.457 30.4999C12.457 29.6898 13.1137 29.0332 13.9237 29.0332C14.8793 29.0332 15.4592 29.0174 16.0156 29.0037C20.5278 28.8936 23.6401 28.8189 24.9672 33.274L25.964 36.6164H57.8579C58.6679 36.6164 59.3246 37.275 59.3246 38.0831C59.3246 38.26 59.2931 38.4291 59.2361 38.5864L55.6224 50.7112C55.4553 51.2735 54.9795 51.6589 54.4369 51.7414V51.7434L29.8471 55.4868L29.7723 55.4967C28.8444 55.6677 28.2801 56.1219 28.052 56.6449C27.9576 56.8631 27.9203 57.103 27.938 57.3389C27.9557 57.5729 28.0324 57.799 28.1621 58.0034C28.4747 58.491 29.1314 58.8488 30.1302 58.8488H53.269C54.0791 58.8488 54.7357 59.5055 54.7357 60.3155C54.7357 61.1256 54.0791 61.7822 53.269 61.7822H30.1243C28.0068 61.7822 26.5086 60.8542 25.6927 59.5861C25.2956 58.9707 25.0675 58.2767 25.0105 57.5729C24.9554 56.871 25.0714 56.1533 25.3644 55.479C25.7989 54.4802 26.6089 53.6033 27.8063 53.0607Z" fill="white"></path>
                    <defs>
                      <linearGradient id="paint0_linear_2107_1531" x1="2.02274" y1="48.0089" x2="40.2261" y2="48.0089" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#F58954"></stop>
                        <stop offset="0.555" stopColor="#F3C0A7"></stop>
                        <stop offset="1" stopColor="white"></stop>
                      </linearGradient>
                      <linearGradient id="paint1_linear_2107_1531" x1="70.5411" y1="7.88366" x2="8.58711" y2="74.4368" gradientUnits="userSpaceOnUse">
                        <stop offset="0.005618" stopColor="#909090"></stop>
                        <stop offset="0.0803952" stopColor="#E3E3E3"></stop>
                        <stop offset="0.1136" stopColor="#D2D2D2"></stop>
                        <stop offset="0.1792" stopColor="#A5A5A5"></stop>
                        <stop offset="0.2063" stopColor="#919191"></stop>
                        <stop offset="0.3388" stopColor="#8C8C8C"></stop>
                        <stop offset="0.4778" stopColor="#E3E3E3"></stop>
                        <stop offset="0.5739" stopColor="#B8B8B8"></stop>
                        <stop offset="0.7257" stopColor="#E3E3E3"></stop>
                        <stop offset="0.7641" stopColor="#D2D2D2"></stop>
                        <stop offset="0.84" stopColor="#A5A5A5"></stop>
                        <stop offset="0.8714" stopColor="#919191"></stop>
                        <stop offset="0.9447" stopColor="#8C8C8C"></stop>
                        <stop offset="1" stopColor="#E3E3E3"></stop>
                      </linearGradient>
                      <linearGradient id="paint2_linear_2107_1531" x1="40.3875" y1="-4.35085" x2="39.7555" y2="98.03" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#9F9F9F"></stop>
                        <stop offset="0.115" stopColor="#E7E7E7"></stop>
                        <stop offset="0.23" stopColor="#FDFDFD"></stop>
                        <stop offset="0.375" stopColor="#E3E3E3"></stop>
                        <stop offset="0.515" stopColor="#B8B8B8"></stop>
                        <stop offset="0.67" stopColor="#F4F4F4"></stop>
                        <stop offset="0.82" stopColor="white"></stop>
                        <stop offset="0.94" stopColor="#A4A4A4"></stop>
                      </linearGradient>
                      <linearGradient id="paint4_linear_2107_1531" x1="40.2261" y1="-5.64333" x2="40.2261" y2="97.6937" gradientUnits="userSpaceOnUse">
                        <stop offset="0.0808066" stopColor="white"></stop>
                        <stop offset="0.235" stopColor="#C1C1C1"></stop>
                        <stop offset="0.395" stopColor="#959292"></stop>
                        <stop offset="0.565" stopColor="#B1B1B1"></stop>
                        <stop offset="0.7616" stopColor="white"></stop>
                        <stop offset="1" stopColor="#E3E3E3"></stop>
                      </linearGradient>
                      <linearGradient id="paint5_linear_2107_1531" x1="40.2266" y1="6.53132" x2="40.2266" y2="88.0689" gradientUnits="userSpaceOnUse">
                        <stop offset="0.0363045" stopColor="#616161"></stop>
                        <stop offset="0.0700999" stopColor="#727272"></stop>
                        <stop offset="0.1373" stopColor="#9F9F9F"></stop>
                        <stop offset="0.2307" stopColor="#E7E7E7"></stop>
                        <stop offset="0.258" stopColor="#FDFDFD"></stop>
                        <stop offset="0.4702" stopColor="#E3E3E3"></stop>
                        <stop offset="0.5665" stopColor="#B8B8B8"></stop>
                        <stop offset="0.6777" stopColor="#E3E3E3"></stop>
                        <stop offset="0.7282" stopColor="#F4F4F4"></stop>
                        <stop offset="0.7546" stopColor="white"></stop>
                        <stop offset="0.8913" stopColor="#A4A4A4"></stop>
                        <stop offset="0.9945" stopColor="#5C5C5C"></stop>
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="box-content">
                    <h3>Buyer Protection</h3>
                    <div className="sub-title">
                      <h4>
                        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16.7135 0.000598146C16.3891 0.0105093 16.0816 0.141695 15.8561 0.366307L6.78277 9.09644L2.678 5.14553C2.56201 5.03386 2.4243 4.94527 2.27273 4.88483C2.12117 4.82439 1.95872 4.79328 1.79466 4.79327C1.63061 4.79326 1.46815 4.82436 1.31658 4.88478C1.16501 4.94521 1.02729 5.03378 0.911287 5.14543C0.795281 5.25709 0.703263 5.38965 0.640485 5.53554C0.577708 5.68143 0.545401 5.83779 0.54541 5.9957C0.54542 6.1536 0.577745 6.30996 0.64054 6.45584C0.703335 6.60173 0.79537 6.73427 0.911389 6.84592L5.89946 11.647C6.01533 11.7589 6.15299 11.8477 6.30457 11.9083C6.45614 11.9688 6.61865 12 6.78277 12C6.94689 12 7.1094 11.9688 7.26097 11.9083C7.41255 11.8477 7.55021 11.7589 7.66607 11.647L17.6195 2.06357C17.8006 1.89513 17.9244 1.67786 17.9748 1.44036C18.0251 1.20287 17.9996 0.956264 17.9015 0.733002C17.8035 0.50974 17.6375 0.32028 17.4254 0.189551C17.2134 0.0588218 16.9652 -0.00705145 16.7135 0.000598146Z" fill="#F36621"></path>
                        </svg>
                        <div>
                          <span className="bold-text">Full refund</span>
                          <span> for faulty production. No question asked</span>
                        </div>
                      </h4>
                      <h4>
                        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16.7135 0.000598146C16.3891 0.0105093 16.0816 0.141695 15.8561 0.366307L6.78277 9.09644L2.678 5.14553C2.56201 5.03386 2.4243 4.94527 2.27273 4.88483C2.12117 4.82439 1.95872 4.79328 1.79466 4.79327C1.63061 4.79326 1.46815 4.82436 1.31658 4.88478C1.16501 4.94521 1.02729 5.03378 0.911287 5.14543C0.795281 5.25709 0.703263 5.38965 0.640485 5.53554C0.577708 5.68143 0.545401 5.83779 0.54541 5.9957C0.54542 6.1536 0.577745 6.30996 0.64054 6.45584C0.703335 6.60173 0.79537 6.73427 0.911389 6.84592L5.89946 11.647C6.01533 11.7589 6.15299 11.8477 6.30457 11.9083C6.45614 11.9688 6.61865 12 6.78277 12C6.94689 12 7.1094 11.9688 7.26097 11.9083C7.41255 11.8477 7.55021 11.7589 7.66607 11.647L17.6195 2.06357C17.8006 1.89513 17.9244 1.67786 17.9748 1.44036C18.0251 1.20287 17.9996 0.956264 17.9015 0.733002C17.8035 0.50974 17.6375 0.32028 17.4254 0.189551C17.2134 0.0588218 16.9652 -0.00705145 16.7135 0.000598146Z" fill="#F36621"></path>
                        </svg>
                        <div>
                          <span className="bold-text">Full or Partial Refund</span>
                          <span> if the item is not as described</span>
                        </div>
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <section className="cart-related-products section-shell slider-full">
            <h2 className="section-head">Related to Items in your Shopping Cart</h2>
            <div className="slider-shell">
              <button 
                className="slider-nav prev" 
                disabled={!hasMultipleSlides(relatedProducts, 5)} 
                onClick={() => slide("related", -1)}
                aria-label="Previous products"
              >
                ‹
              </button>
              <div className="slider-track" ref={registerTrack("related")}>
                {relatedProducts.map((product, index) => (
                  <ProductCard key={product.id || product.handle || index} product={product} index={index} variant="simple" />
                ))}
              </div>
              <button 
                className="slider-nav next" 
                disabled={!hasMultipleSlides(relatedProducts, 5)} 
                onClick={() => slide("related", 1)}
                aria-label="Next products"
              >
                ›
              </button>
            </div>
          </section>
        )}
      </section>
    </Layout>
  );
}

export async function getServerSideProps() {
  try {
    const [collections, menuItems, products] = await Promise.all([
      fetchShopifyCollections(20),
      fetchShopifyMenuAsNavItems("main-menu").catch((err) => {
        console.error("Failed to fetch menu:", err);
        return [];
      }),
      fetchShopifyProducts(30).catch((err) => {
        console.error("Failed to fetch products:", err);
        return [];
      }),
    ]);
    const navItems = getNavItems(menuItems, collections, baseNavLinks);
    return {
      props: {
        navItems,
        allProducts: products || [],
      },
    };
  } catch (error) {
    console.error("Failed to load navigation collections for cart page", error);
    return {
      props: {
        navItems: baseNavLinks,
        allProducts: [],
      },
    };
  }
}

