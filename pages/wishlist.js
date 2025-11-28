import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { navLinks as baseNavLinks } from "../lib/siteContent";
import { fetchShopifyCollections } from "../lib/shopify";
import { mapCollectionsToNav } from "../lib/navUtils";

const mockWishlist = [
  {
    id: "wish-1",
    title: "Magic 101 Show & Class",
    price: "840,000 VND",
    img: "https://images.uncommongoods.com/product/56697/56697_1_640px.jpg",
    handle: "magic-101",
  },
  {
    id: "wish-2",
    title: "DIY Hot Sauce Workshop",
    price: "2,340,000 VND",
    img: "https://images.uncommongoods.com/product/56858/56858_1_640px.jpg",
    handle: "diy-hot-sauce",
  },
];

export default function WishlistPage({ navItems }) {
  return (
    <Layout navItems={navItems}>
      <section className="section-shell">
        <h1 className="section-head">Your wishlist</h1>
        {mockWishlist.length ? (
          <div className="collection-grid">
            {mockWishlist.map((item, idx) => (
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
