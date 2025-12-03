import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { useWishlist } from "../context/WishlistContext";
import { navLinks as baseNavLinks } from "../lib/siteContent";
import { fetchShopifyCollections, fetchShopifyMenuAsNavItems } from "../lib/shopify";
import { getNavItems } from "../lib/navUtils";

export default function WishlistPage({ navItems }) {
  const { items } = useWishlist();

  return (
    <Layout navItems={navItems}>
      <section className="section-shell">
        <h1 className="section-head">Your wishlist</h1>
        {items.length ? (
          <div className="collection-grid">
            {items.map((item, idx) => (
              <ProductCard key={item.id} product={item} index={idx} variant="full" />
            ))}
          </div>
        ) : (
          <p className="collection-empty">You haven’t saved anything yet.</p>
        )}
      </section>
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
    console.error("Failed to load nav collections", error);
    return {
      props: {
        navItems: baseNavLinks,
      },
    };
  }
}
