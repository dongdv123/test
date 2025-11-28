import Link from "next/link";
import Layout from "../../components/Layout";
import { fetchCollectionByHandle, fetchShopifyCollections } from "../../lib/shopify";
import { normalizeProduct } from "../../lib/productFormatter";
import { navLinks as baseNavLinks } from "../../lib/siteContent";
import { mapCollectionsToNav } from "../../lib/navUtils";

const badgePresets = [
  {
    pill: "EXPERIENCE",
    top: "Customer favorite",
    rating: { stars: "★★★★★", count: "34" },
  },
  {
    pill: "EXPERIENCE",
    top: "Trending Now. Sold 86 times in the last 24 hours",
    rating: { stars: "★★★★★", count: "23" },
  },
  {
    pill: "EXPERIENCE",
    top: "Trending Now. Sold 40 times in the last 24 hours",
    rating: { stars: "★★★★★", count: "14" },
  },
  {
    pill: "EXPERIENCE",
    top: "Trending Now. Sold 34 times in the last 24 hours",
    rating: { stars: "★★★★★", count: "44" },
  },
];

export default function CollectionPage({ collection, navItems }) {
  const products = (collection?.products || []).map(normalizeProduct).filter(Boolean);

  return (
    <Layout navItems={navItems}>
      <header className="collection-page-header">
        <div className="container">
        <Link href="/" className="back-link">
            ← Back to home
          </Link>
          <h1>{collection.title}</h1>
          {collection.description && <p>{collection.description}</p>}
        </div>
      </header>

      <section className="section-shell">
        {products.length ? (
          <div className="collection-grid">
            {products.map((product, index) => {
              const defaults = badgePresets[index % badgePresets.length];
              return (
                <article className="collection-product-card" key={product.id || product.title}>
                  <div className="collection-card-media">
                    <span className="collection-badge-top">{defaults.top}</span>
                    <button className="wishlist-btn" aria-label="Add to wishlist">
                      ♡
                    </button>
                    <img src={product.img} alt={product.title} loading="lazy" />
                  </div>
                  <div className="collection-card-body">
                    <span className="collection-card-pill">{defaults.pill}</span>
                    <h4>{product.title}</h4>
                    <div className="collection-price-row">
                      {product.price && <span className="price">{product.price}</span>}
                    </div>
                    <div className="collection-rating-row">
                      <span className="star-icons">{defaults.rating.stars}</span>
                      <span className="rating-count">{defaults.rating.count}</span>
                    </div>
                  </div>
                  {product.handle && (
                    <Link
                      href={`/products/${product.handle}`}
                      className="card-overlay"
                      aria-label={`View ${product.title}`}
                    />
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="collection-empty">Chưa có sản phẩm trong danh mục này.</p>
        )}
      </section>
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  const handle = params?.handle;
  if (!handle) {
    return { notFound: true };
  }

  try {
    const [collection, navCollections] = await Promise.all([
      fetchCollectionByHandle(handle, 48),
      fetchShopifyCollections(20),
    ]);
    if (!collection) {
      return { notFound: true };
    }
    const navItems = mapCollectionsToNav(navCollections);

    return {
      props: {
        collection,
        navItems: navItems.length ? navItems : baseNavLinks,
      },
    };
  } catch (error) {
    console.error("Failed to load collection from Shopify", error);
    return { notFound: true };
  }
}

