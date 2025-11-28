import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import { mockCartItems, mockShippingRates } from "../lib/cart";
import { navLinks as baseNavLinks } from "../lib/siteContent";
import { fetchShopifyCollections } from "../lib/shopify";
import { mapCollectionsToNav } from "../lib/navUtils";

const calculateSubtotal = (items) =>
  items.reduce((sum, item) => sum + parseCurrency(item.price) * item.quantity, 0);

const parseCurrency = (value) => {
  if (!value) return 0;
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

export default function CheckoutPage({ navItems }) {
  const [items, setItems] = useState(mockCartItems);
  const [shippingId, setShippingId] = useState(mockShippingRates[0].id);

  const subtotal = useMemo(() => calculateSubtotal(items), [items]);
  const shippingCost = useMemo(
    () => parseCurrency(mockShippingRates.find((rate) => rate.id === shippingId)?.price),
    [shippingId],
  );
  const total = subtotal + shippingCost;

  const updateQuantity = (id, quantity) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item)),
    );
  };

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
            Pay now · {formatCurrency(total)}
          </button>
        </div>

        <aside className="checkout-summary">
          <h2>Order summary</h2>
          <div className="summary-items">
            {items.map((item) => (
              <div className="summary-item" key={item.id}>
                <div className="summary-thumb">
                  <img src={item.image} alt={item.title} />
                  <span>{item.quantity}</span>
                </div>
                <div className="summary-meta">
                  <div>{item.title}</div>
                  <div className="summary-vendor">{item.vendor}</div>
                </div>
                <div className="summary-price">{item.price}</div>
              </div>
            ))}
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{formatCurrency(shippingCost)}</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <div>
              <div className="summary-total-amount">{formatCurrency(total)}</div>
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

