import Link from "next/link";
import { fetchCollectionByHandle } from "../../lib/shopify";
import { normalizeProduct } from "../../lib/productFormatter";

export default function CollectionPage({ collection }) {
  const products = (collection?.products || []).map(normalizeProduct).filter(Boolean);

  return (
    <>
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
            {products.map((product) => (
              <article className="slider-card" key={product.id || product.title}>
                <img src={product.img} alt={product.title} loading="lazy" />
                <div className="slider-card-body">
                  <h4>{product.title}</h4>
                  {product.price && <div className="price">{product.price}</div>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="collection-empty">Chưa có sản phẩm trong danh mục này.</p>
        )}
      </section>
    </>
  );
}

export async function getServerSideProps({ params }) {
  const handle = params?.handle;
  if (!handle) {
    return { notFound: true };
  }

  try {
    const collection = await fetchCollectionByHandle(handle, 48);
    if (!collection) {
      return { notFound: true };
    }
    return {
      props: {
        collection,
      },
    };
  } catch (error) {
    console.error("Failed to load collection from Shopify", error);
    return { notFound: true };
  }
}

