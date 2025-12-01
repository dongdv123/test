import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import ProductCard from "../../components/ProductCard";
import WishlistButton from "../../components/WishlistButton";
import { fetchProductByHandle, fetchShopifyCollections } from "../../lib/shopify";
import { formatPrice } from "../../lib/productFormatter";
import { navLinks as baseNavLinks } from "../../lib/siteContent";
import { mapCollectionsToNav } from "../../lib/navUtils";
import { useCallback, useMemo, useState } from "react";
import { useCart } from "../../context/CartContext";

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

  const currency =
    activeVariant?.currency_code ||
    product.priceRange?.min?.currencyCode ||
    product.priceRange?.max?.currencyCode ||
    "USD";
  const displayPrice = activeVariant?.price ? formatPrice(Number(activeVariant.price), currency) : priceText;
  const { addItem, items: cartItems } = useCart();

  const handleAddToCart = useCallback(() => {
    const unitPrice = Number(activeVariant?.price ?? product.priceRange?.min?.amount ?? 0);
    addItem(
      {
        id: activeVariant?.id || product.id,
        title: product.title,
        handle: product.handle,
        image: activeImage,
        unitPrice,
        currency,
        priceFormatted: formatPrice(unitPrice || 0, currency),
        variantTitle: activeVariant?.title || null,
      },
      quantity,
    );
    setShowDrawer(true);
  }, [activeVariant, product, activeImage, currency, quantity, addItem]);

  const lastCartItem = cartItems[cartItems.length - 1];

  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    description: product.description || product.title,
    image: images,
    offers: {
      "@type": "Offer",
      price: activeVariant?.price || product.priceRange?.min?.amount || "0",
      priceCurrency: currency,
      availability: activeVariant?.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <Head>
        <title>{product.title} | Gikzo</title>
        <meta name="description" content={product.description || `${product.title} - Available at Gikzo`} />
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={product.description || product.title} />
        <meta property="og:type" content="product" />
        {images[0] && <meta property="og:image" content={images[0]} />}
        <meta property="product:price:amount" content={activeVariant?.price || product.priceRange?.min?.amount || "0"} />
        <meta property="product:price:currency" content={currency} />
        <link rel="canonical" href={`https://gikzo.com/products/${product.handle}`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      </Head>
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
              <WishlistButton product={product} className="product-wishlist-button" />
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
          <h1>{product.title}</h1>
          {displayPrice && <div className="product-price-large">{displayPrice}</div>}
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
            <button className="btn btn-primary" onClick={handleAddToCart}>
              add to cart
            </button>
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
        <section>
          <div className="container">
            <h2 className="section-head">More items to consider</h2>
            <div className="collection-grid">
              {product.relatedProducts.map((related, idx) => (
                <ProductCard key={related.id} product={related} index={idx} variant="flat" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div
        className={`cart-drawer ${showDrawer ? "open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDrawer(false);
          }
        }}
      >
        <div className="cart-drawer-body-wrapper">
          <div className="cart-drawer-header">
            <strong>Added to your cart</strong>
            <button type="button" onClick={() => setShowDrawer(false)}>
              ✕
            </button>
          </div>
          <div className="cart-drawer-body">
            {lastCartItem ? (
              <>
                <div className="cart-item">
                  <img src={lastCartItem.image} alt={lastCartItem.title} />
                  <div>
                    <div className="cart-item-title">{lastCartItem.title}</div>
                    <div className="cart-item-price">
                      {formatPrice(lastCartItem.unitPrice)} · Qty {lastCartItem.quantity}
                    </div>
                    {lastCartItem.variantTitle && <div className="cart-item-variant">{lastCartItem.variantTitle}</div>}
                  </div>
                </div>
                <Link href="/cart" className="btn btn-primary drawer-checkout">
                  view cart
                </Link>
              </>
            ) : (
              <p>Your cart is empty.</p>
            )}
          </div>
        </div>
      </div>
      </Layout>
    </>
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

