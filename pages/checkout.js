import { useMemo, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import { useCart } from "../context/CartContext";
import { mockShippingRates } from "../lib/cart";
import { formatPrice } from "../lib/productFormatter";
import { navLinks as baseNavLinks } from "../lib/siteContent";
import { fetchShopifyCollections } from "../lib/shopify";
import { mapCollectionsToNav } from "../lib/navUtils";

const parseCurrency = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  // Parse string like "120,000 VND" or "$120.00" or "120"
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

export default function CheckoutPage({ navItems }) {
  const { items, subtotal: cartSubtotal, updateQuantity, removeItem } = useCart();
  const [shippingId, setShippingId] = useState(mockShippingRates[0].id);

  // Get currency from first item, default to USD
  const currency = useMemo(() => {
    return items.length > 0 && items[0].currency ? items[0].currency : "USD";
  }, [items]);

  const subtotal = useMemo(() => cartSubtotal || 0, [cartSubtotal]);
  
  // Parse shipping cost - if it's in VND, convert to USD (assuming 1 USD = 24000 VND)
  // Or if shipping rates are already in USD, use directly
  const shippingCostRaw = useMemo(
    () => parseCurrency(mockShippingRates.find((rate) => rate.id === shippingId)?.price),
    [shippingId],
  );
  
  // Convert VND to USD if needed (1 USD ≈ 24000 VND)
  // If shippingCostRaw is large (> 1000), assume it's VND and convert
  const shippingCost = useMemo(() => {
    if (shippingCostRaw > 1000) {
      // Likely VND, convert to USD
      return shippingCostRaw / 24000;
    }
    // Already in USD
    return shippingCostRaw;
  }, [shippingCostRaw]);
  
  const total = subtotal + shippingCost;

  if (items.length === 0) {
    return (
      <Layout navItems={navItems}>
        <div className="checkout-page">
          <div className="checkout-form">
            <h1>Checkout</h1>
            <div className="cart-empty" style={{ textAlign: "center", padding: "40px 20px" }}>
              <p>Your cart is empty.</p>
              <Link href="/cart" className="btn btn-primary" style={{ marginTop: "20px", display: "inline-block" }}>
                Return to cart
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout navItems={navItems}>
      <div className="checkout-page">
        <div className="checkout-form">
          <h1>Checkout</h1>

          <section className="checkout-section">
            <h2>Contact information</h2>
            <input placeholder="Email" />
            <label>
              <input type="checkbox" /> Email me with news and offers
            </label>
          </section>

          <section className="checkout-section">
            <h2>Shipping address</h2>
            <div className="checkout-grid">
              <input placeholder="First name" />
              <input placeholder="Last name" />
            </div>
            <input placeholder="Address" />
            <input placeholder="Apartment, suite, etc. (optional)" />
            <div className="checkout-grid">
              <input placeholder="City" />
              <input placeholder="Postal code" />
            </div>
            <input placeholder="Phone" />
          </section>

          <section className="checkout-section">
            <h2>Shipping method</h2>
            {mockShippingRates.map((rate) => (
              <label key={rate.id} className="shipping-option">
                <input
                  type="radio"
                  name="shipping-rate"
                  checked={shippingId === rate.id}
                  onChange={() => setShippingId(rate.id)}
                />
                <span>{rate.label}</span>
                <span>{rate.price}</span>
              </label>
            ))}
          </section>

          <section className="checkout-section">
            <h2>Payment</h2>
            <p>All transactions are secure and encrypted.</p>
            <input placeholder="Card number" />
            <div className="checkout-grid">
              <input placeholder="Expiration (MM / YY)" />
              <input placeholder="Security code" />
            </div>
          </section>

          <button className="btn btn-primary" style={{ width: "100%" }}>
            Pay now · {formatPrice(total, currency)}
          </button>
        </div>

        <aside className="checkout-summary">
          <h2>Order summary</h2>
          <div className="summary-items">
            {items.map((item) => (
              <div className="summary-item" key={item.id} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    background: "transparent",
                    border: "none",
                    fontSize: "20px",
                    cursor: "pointer",
                    color: "#666",
                    padding: "4px 8px",
                    lineHeight: 1,
                  }}
                  aria-label={`Remove ${item.title}`}
                >
                  ✕
                </button>
                <div className="summary-thumb">
                  <img src={item.image} alt={item.title} width="80" height="80" />
                  <span>{item.quantity}</span>
                </div>
                <div className="summary-meta">
                  <div>{item.title}</div>
                  {item.variantTitle && <div className="summary-vendor">{item.variantTitle}</div>}
                </div>
                <div className="summary-price">{item.priceFormatted || formatPrice(item.unitPrice, currency)}</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    style={{
                      background: "#f5f5f5",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      width: "28px",
                      height: "28px",
                      cursor: "pointer",
                      fontSize: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    style={{
                      background: "#f5f5f5",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      width: "28px",
                      height: "28px",
                      cursor: "pointer",
                      fontSize: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal, currency)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{formatPrice(shippingCost, currency)}</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <div>
              <div className="summary-total-amount">{formatPrice(total, currency)}</div>
              <div className="summary-total-subtext">including taxes</div>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  try {
    const collections = await fetchShopifyCollections(20);
    const navItems = mapCollectionsToNav(collections);
    return {
      props: {
        navItems: navItems.length ? navItems : baseNavLinks,
      },
    };
  } catch (error) {
    console.error("Failed to load nav collections", error);
    return {
      props: {
        navItems: baseNavLinks,
      },
    };
  }
}

