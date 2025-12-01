import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { useWishlist } from "../context/WishlistContext";
import { navLinks as baseNavLinks } from "../lib/siteContent";
import { fetchShopifyCollections } from "../lib/shopify";
import { mapCollectionsToNav } from "../lib/navUtils";

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
