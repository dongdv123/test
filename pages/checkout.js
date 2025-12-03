import { useEffect } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import { useCart } from "../context/CartContext";
import { navLinks as baseNavLinks } from "../lib/siteContent";
import { fetchShopifyCollections, fetchShopifyMenuAsNavItems } from "../lib/shopify";
import { getNavItems } from "../lib/navUtils";

export default function CheckoutPage({ navItems }) {
  const { items, checkoutUrl, isLoading: cartLoading } = useCart();

  // Auto-redirect to Shopify checkout if checkoutUrl is available
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (checkoutUrl && items.length > 0) {
      // Redirect immediately to Shopify checkout
      window.location.href = checkoutUrl;
    }
  }, [checkoutUrl, items.length]);

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

  if (cartLoading || !checkoutUrl) {
    return (
      <Layout navItems={navItems}>
        <div className="checkout-page">
          <div className="checkout-form">
            <h1>Checkout</h1>
            <p style={{ textAlign: "center", padding: "40px 20px" }}>
              {cartLoading ? "Loading..." : "Preparing checkout..."}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // This should not render as redirect happens in useEffect
  return (
    <Layout navItems={navItems}>
      <div className="checkout-page">
        <div className="checkout-form">
          <h1>Checkout</h1>
          <p style={{ textAlign: "center", padding: "40px 20px" }}>
            Redirecting to checkout...
          </p>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  try {
    const [collections, menuItems] = await Promise.all([
      fetchShopifyCollections(20),
      fetchShopifyMenuAsNavItems("main-menu").catch((err) => {
        console.error("Failed to fetch menu:", err);
        return [];
      }),
    ]);
    const navItems = getNavItems(menuItems, collections, baseNavLinks);
    return {
      props: {
        navItems,
      },
    };
  } catch (error) {
    console.error("Failed to load navigation collections for checkout page", error);
    return {
      props: {
        navItems: baseNavLinks,
      },
    };
  }
}
