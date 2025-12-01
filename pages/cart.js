import Link from "next/link";
import Layout from "../components/Layout";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../lib/productFormatter";
import { fetchShopifyCollections } from "../lib/shopify";
import { mapCollectionsToNav } from "../lib/navUtils";
import { navLinks as baseNavLinks } from "../lib/siteContent";

export default function CartPage({ navItems }) {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const formattedSubtotal = formatPrice(subtotal || 0);

  return (
    <Layout navItems={navItems}>
      <section className="cart-page container">
        <header className="cart-header">
          <h1>Your cart</h1>
          <p>{items.length} items</p>
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
              {items.map((item) => (
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
              <Link href="/checkout" className="btn btn-primary" style={{ width: "100%", textAlign: "center" }}>
                Proceed to checkout
              </Link>
            </aside>
          </div>
        )}
      </section>
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
    console.error("Failed to load navigation collections for cart page", error);
    return {
      props: {
        navItems: baseNavLinks,
      },
    };
  }
}

