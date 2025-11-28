import Link from "next/link";
import Layout from "../../components/Layout";
import ProductCard from "../../components/ProductCard";
import { fetchProductByHandle, fetchShopifyCollections } from "../../lib/shopify";
import { formatPrice } from "../../lib/productFormatter";
import { navLinks as baseNavLinks } from "../../lib/siteContent";
import { mapCollectionsToNav } from "../../lib/navUtils";
import { useMemo, useState } from "react";

const formatPriceRange = (product) => {
  const min = Number(product.priceRange?.min?.amount);
  const max = Number(product.priceRange?.max?.amount);
  const currency =
    product.priceRange?.min?.currencyCode || product.priceRange?.max?.currencyCode || "USD";

  if (Number.isFinite(min) && Number.isFinite(max) && max !== min) {
    return `${formatPrice(min, currency)} - ${formatPrice(max, currency)}`;
  }

  if (Number.isFinite(min)) {
    return formatPrice(min, currency);
  }

  return "";
};

const getGalleryImages = (product) => {
  const sources = [
    product.image?.src,
    ...(product.images || []).map((img) => img.src),
  ].filter(Boolean);

  // Remove duplicates
  return Array.from(new Set(sources));
};

export default function ProductDetailPage({ product, navItems }) {
  const images = getGalleryImages(product);
  const priceText = formatPriceRange(product);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeImage, setActiveImage] = useState(images[0]);
  const [selectedOptions, setSelectedOptions] = useState(() => {
    const defaults = {};
    product.options?.forEach((option) => {
      if (option.values?.length) defaults[option.name] = option.values[0];
    });
    return defaults;
  });
  const [quantity, setQuantity] = useState(1);

  const activeVariant = useMemo(() => {
    if (!product.variants) return null;
    return (
      product.variants.find((variant) =>
        (variant.selectedOptions || []).every(
          (opt) => selectedOptions[opt.name] === opt.value,
        ),
      ) || product.variants[0]
    );
  }, [product.variants, selectedOptions]);

  const displayPrice = activeVariant?.price
    ? formatPrice(Number(activeVariant.price), activeVariant.currency_code || "USD")
    : priceText;

  return (
    <Layout navItems={navItems}>
      <nav className="collection-breadcrumb container">
        <span>
          <Link href="/">home</Link>
          <span className="breadcrumb-divider"> / </span>
        </span>
        {product.productType && (
          <span>
            {product.productType.toLowerCase()}
            <span className="breadcrumb-divider"> / </span>
          </span>
        )}
        <span>{product.title}</span>
      </nav>

      <section className="product-hero">
        <div className="product-gallery">
          {activeImage && (
            <div className="product-main-image">
              <img src={activeImage} alt={product.title} loading="lazy" />
            </div>
          )}
          {images.length > 1 && (
            <div className="product-thumbnails">
              {images.map((src) => (
                <button
                  key={src}
                  type="button"
                  className={activeImage === src ? "active" : ""}
                  onClick={() => setActiveImage(src)}
                >
                  <img src={src} alt={`${product.title} thumbnail`} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          <span className="collection-card-pill">
            {product.productType || "experience"}
          </span>
          <h1>{product.title}</h1>
          {displayPrice && <div className="product-price-large">{displayPrice}</div>}
          {product.vendor && (
            <div className="product-meta">by {product.vendor}</div>
          )}
          <p className="product-description">
            {product.description || "Crafted by independent makers with limited batches available."}
          </p>

          {product.options?.length ? (
            <div className="product-options">
              {product.options
                .filter((option) => option.values && option.values.length)
                .map((option) => (
                  <div key={option.name}>
                    <div className="option-label">{option.name}</div>
                    <div className="option-values">
                      {option.values.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={selectedOptions[option.name] === value ? "active" : ""}
                          onClick={() =>
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [option.name]: value,
                            }))
                          }
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : null}

          <div className="quantity-row">
            <div className="option-label">Quantity</div>
            <div className="quantity-controls">
              <button type="button" onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}>
                −
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
              <button type="button" onClick={() => setQuantity((prev) => prev + 1)}>
                +
              </button>
            </div>
          </div>

          <div className="product-cta">
            <button className="btn btn-primary" onClick={() => setShowDrawer(true)}>
              add to cart
            </button>
            <button className="btn-secondary">save to wish list</button>
          </div>

          <div className="product-support">
            <div>✅ Free shipping for Perks members</div>
            <div>🔁 Free returns for 30 days</div>
            <div>📦 Ships in 3-5 business days</div>
          </div>
        </div>
      </section>

      <section className="product-details container">
        <div>
          <h2>Why we love it</h2>
          <p>
            Hand-selected by our curators, this product brings together workmanship,
            storytelling, and thoughtful design. Perfect for gifting or treating yourself.
          </p>
        </div>

        <div>
          <h2>Product details</h2>
          {product.descriptionHtml ? (
            <div
              className="product-description-html"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          ) : (
            <ul>
              <li>Made in small batches by an independent maker</li>
              <li>Materials sourced responsibly</li>
              <li>Ships worldwide from our Brooklyn warehouse</li>
            </ul>
          )}
        </div>
      </section>

      {product.relatedProducts?.length ? (
        <section className="section-shell">
          <div className="container">
            <h2 className="section-head">More items to consider</h2>
            <div className="collection-grid">
              {product.relatedProducts.map((related, idx) => (
                <ProductCard key={related.id} product={related} index={idx} variant="full" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className={`cart-drawer ${showDrawer ? "open" : ""}`}>
        <div className="cart-drawer-header">
          <strong>Added to your cart</strong>
          <button type="button" onClick={() => setShowDrawer(false)}>
            ✕
          </button>
        </div>
        <div className="cart-drawer-body">
          <div className="cart-item">
            <img src={product.img || images[0]} alt={product.title} />
            <div>
              <div className="cart-item-title">{product.title}</div>
              {displayPrice && (
                <div className="cart-item-price">
                  {displayPrice} · Qty {quantity}
                </div>
              )}
              {activeVariant?.title && <div className="cart-item-variant">{activeVariant.title}</div>}
            </div>
          </div>
          <Link href="/checkout" className="btn btn-primary drawer-checkout">
            proceed to checkout
          </Link>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  const handle = params?.handle;
  if (!handle) {
    return { notFound: true };
  }

  try {
    const [product, navCollections] = await Promise.all([
      fetchProductByHandle(handle),
      fetchShopifyCollections(20),
    ]);
    if (!product) {
      return { notFound: true };
    }
    const navItems = mapCollectionsToNav(navCollections);

    return {
      props: {
        product,
        navItems: navItems.length ? navItems : baseNavLinks,
      },
    };
  } catch (error) {
    console.error("Failed to fetch product detail", error);
    return { notFound: true };
  }
}

